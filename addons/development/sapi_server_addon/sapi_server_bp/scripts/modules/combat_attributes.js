import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { EconomyManager } from "./economy.js";
import { Utils } from "../utils.js";

/**
 * 幸存者战斗潜能属性定义表
 * 界面规范：严格去除灰色字体及任何Emoji图标
 */
export const COMBAT_ATTRIBUTES = {
	crit_rate: {
		id: "crit_rate",
		name: "暴击率强化",
		maxLevel: 10,
		prices: [2000, 4000, 7000, 12000, 18000, 26000, 36000, 48000, 64000, 85000],
		icon: "textures/ui/strength_effect",
		desc: "提升全武器命中时的暴击几率，触发160%暴击伤害",
		getStatText: (lvl) => "+" + (lvl * 2.0).toFixed(1) + "%",
		getNextStatText: (lvl) => "+" + ((lvl + 1) * 2.0).toFixed(1) + "%",
		getBonus: (lvl) => Number((lvl * 0.02).toFixed(3))
	},
	light_dmg: {
		id: "light_dmg",
		name: "轻型枪械精通",
		maxLevel: 10,
		prices: [2000, 4000, 7000, 12000, 18000, 26000, 36000, 48000, 64000, 85000],
		icon: "textures/ui/speed_effect",
		desc: "提升手枪、冲锋枪与霰弹枪的杀伤威力",
		getStatText: (lvl) => "+" + (lvl * 2.5).toFixed(1) + "%",
		getNextStatText: (lvl) => "+" + ((lvl + 1) * 2.5).toFixed(1) + "%",
		getBonus: (lvl) => Number((lvl * 0.025).toFixed(3))
	},
	heavy_dmg: {
		id: "heavy_dmg",
		name: "重型枪械精通",
		maxLevel: 10,
		prices: [2000, 4000, 7000, 12000, 18000, 26000, 36000, 48000, 64000, 85000],
		icon: "textures/ui/fire_resistance_effect",
		desc: "提升突击步枪、狙击枪、机枪与重型武器杀伤力",
		getStatText: (lvl) => "+" + (lvl * 2.0).toFixed(1) + "%",
		getNextStatText: (lvl) => "+" + ((lvl + 1) * 2.0).toFixed(1) + "%",
		getBonus: (lvl) => Number((lvl * 0.02).toFixed(3))
	},
	melee_dmg: {
		id: "melee_dmg",
		name: "近战战术精通",
		maxLevel: 10,
		prices: [2000, 4000, 7000, 12000, 18000, 26000, 36000, 48000, 64000, 85000],
		icon: "textures/ui/haste_effect",
		desc: "提升战术军刀、砍刀、球棒等近战冷兵器杀伤威力",
		getStatText: (lvl) => "+" + (lvl * 4.0).toFixed(1) + "%",
		getNextStatText: (lvl) => "+" + ((lvl + 1) * 4.0).toFixed(1) + "%",
		getBonus: (lvl) => Number((lvl * 0.04).toFixed(3))
	},
	max_hp: {
		id: "max_hp",
		name: "体质强化·生命",
		maxLevel: 5,
		prices: [5000, 15000, 30000, 55000, 90000],
		icon: "textures/ui/regeneration_effect",
		desc: "提升生命上限，每级增加4点真实HP并与防具无缝叠加",
		getStatText: (lvl) => "+" + (lvl * 4) + " HP",
		getNextStatText: (lvl) => "+" + ((lvl + 1) * 4) + " HP",
		getBonus: (lvl) => lvl * 4
	},
	natural_regen: {
		id: "natural_regen",
		name: "脱战快速再生",
		maxLevel: 5,
		prices: [4000, 12000, 25000, 45000, 75000],
		icon: "textures/ui/health_boost_effect",
		desc: "脱离战斗5秒后自动缓慢恢复生命值",
		getStatText: (lvl) => {
			if (lvl <= 0) return "无效果";
			if (lvl === 1) return "每4秒恢复1点";
			if (lvl === 2) return "每3秒恢复1点";
			if (lvl === 3) return "每2秒恢复1点";
			if (lvl === 4) return "每2秒恢复2点";
			return "每1秒恢复2点";
		},
		getNextStatText: (lvl) => {
			const next = lvl + 1;
			if (next === 1) return "每4秒恢复1点";
			if (next === 2) return "每3秒恢复1点";
			if (next === 3) return "每2秒恢复1点";
			if (next === 4) return "每2秒恢复2点";
			return "每1秒恢复2点";
		},
		getBonus: (lvl) => lvl
	},
	damage_reduction: {
		id: "damage_reduction",
		name: "战术防卫·免伤",
		maxLevel: 10,
		prices: [2000, 4000, 7000, 12000, 18000, 26000, 36000, 48000, 64000, 85000],
		icon: "textures/ui/resistance_effect",
		desc: "按百分比减免受到的伤害，与防具减伤乘算叠加",
		getStatText: (lvl) => "+" + (lvl * 1.5).toFixed(1) + "%",
		getNextStatText: (lvl) => "+" + ((lvl + 1) * 1.5).toFixed(1) + "%",
		getBonus: (lvl) => Number((lvl * 0.015).toFixed(3))
	}
};

export class CombatAttributesManager {
	static PROPERTY_KEY = "gene_combat_stats";

	static init() {
		this.registerEvents();
		system.runInterval(() => this.tickRegen(), 20);
		for (const player of world.getAllPlayers()) {
			this.syncPlayerTags(player);
		}
		console.warn("[CombatAttributes] Initialized combat potential attributes manager.");
	}

	/**
	 * 读取玩家战斗属性配置
	 */
	static getStats(player) {
		if (!Utils.isValid(player)) return this.getDefaultStats();
		try {
			const raw = player.getDynamicProperty(this.PROPERTY_KEY);
			if (typeof raw === "string" && raw.startsWith("{")) {
				const parsed = JSON.parse(raw);
				return {
					crit_rate: Number(parsed.crit_rate) || 0,
					light_dmg: Number(parsed.light_dmg) || 0,
					heavy_dmg: Number(parsed.heavy_dmg) || 0,
					melee_dmg: Number(parsed.melee_dmg) || 0,
					max_hp: Number(parsed.max_hp) || 0,
					natural_regen: Number(parsed.natural_regen) || 0,
					damage_reduction: Number(parsed.damage_reduction) || 0
				};
			}
		} catch {}
		return this.getDefaultStats();
	}

	static getDefaultStats() {
		return {
			crit_rate: 0,
			light_dmg: 0,
			heavy_dmg: 0,
			melee_dmg: 0,
			max_hp: 0,
			natural_regen: 0,
			damage_reduction: 0
		};
	}

	/**
	 * 同步跨包实体Tag，供枪械包、防具包等独立脚本包即时读取
	 */
	static syncPlayerTags(player, stats = null) {
		if (!Utils.isValid(player)) return;
		if (!stats) stats = this.getStats(player);
		try {
			const currentTags = player.getTags() || [];
			for (const tag of currentTags) {
				if (typeof tag === "string" && tag.startsWith("gene:")) {
					try { player.removeTag(tag); } catch {}
				}
			}

			const critVal = COMBAT_ATTRIBUTES.crit_rate.getBonus(stats.crit_rate);
			if (critVal > 0) player.addTag(`gene:crit:${critVal}`);

			const lightVal = COMBAT_ATTRIBUTES.light_dmg.getBonus(stats.light_dmg);
			if (lightVal > 0) player.addTag(`gene:light:${lightVal}`);

			const heavyVal = COMBAT_ATTRIBUTES.heavy_dmg.getBonus(stats.heavy_dmg);
			if (heavyVal > 0) player.addTag(`gene:heavy:${heavyVal}`);

			const meleeVal = COMBAT_ATTRIBUTES.melee_dmg.getBonus(stats.melee_dmg);
			if (meleeVal > 0) player.addTag(`gene:melee:${meleeVal}`);

			const hpVal = COMBAT_ATTRIBUTES.max_hp.getBonus(stats.max_hp);
			if (hpVal > 0) player.addTag(`gene:hp:${hpVal}`);

			const drVal = COMBAT_ATTRIBUTES.damage_reduction.getBonus(stats.damage_reduction);
			if (drVal > 0) player.addTag(`gene:dr:${drVal}`);

			if (stats.natural_regen > 0) player.addTag(`gene:regen:${stats.natural_regen}`);
		} catch (e) {
			console.warn(`[CombatAttributes] syncPlayerTags error: ${e}`);
		}
	}

	/**
	 * 保存玩家战斗属性，并同步写入各属性的独立跨包属性与实体Tag
	 */
	static saveStats(player, stats) {
		if (!Utils.isValid(player)) return;
		try {
			player.setDynamicProperty(this.PROPERTY_KEY, JSON.stringify(stats));

			// 同步独立动态属性供本包内部读取
			player.setDynamicProperty("gene_attr_crit_rate", COMBAT_ATTRIBUTES.crit_rate.getBonus(stats.crit_rate));
			player.setDynamicProperty("gene_attr_light_dmg", COMBAT_ATTRIBUTES.light_dmg.getBonus(stats.light_dmg));
			player.setDynamicProperty("gene_attr_heavy_dmg", COMBAT_ATTRIBUTES.heavy_dmg.getBonus(stats.heavy_dmg));
			player.setDynamicProperty("gene_attr_melee_dmg", COMBAT_ATTRIBUTES.melee_dmg.getBonus(stats.melee_dmg));
			player.setDynamicProperty("gene_attr_max_hp_bonus", COMBAT_ATTRIBUTES.max_hp.getBonus(stats.max_hp));
			player.setDynamicProperty("gene_attr_natural_regen", stats.natural_regen);
			player.setDynamicProperty("gene_attr_damage_reduction", COMBAT_ATTRIBUTES.damage_reduction.getBonus(stats.damage_reduction));

			// 跨包同步实体Tag，供枪械包与防具包读取
			this.syncPlayerTags(player, stats);
		} catch (e) {
			console.warn(`[CombatAttributes] Failed to save stats for ${player.name}: ${e}`);
		}
	}

	/**
	 * 打开战斗潜能升级面板
	 */
	static openMenu(player, onBack = null) {
		if (!Utils.isValid(player)) return;
		const stats = this.getStats(player);
		this.syncPlayerTags(player, stats);
		const balance = EconomyManager.getBalance(player);

		const form = new ActionFormData()
			.title("§l§6幸存者战斗潜能强化§r")
			.body(
				`§e当前钱包: §6${Utils.formatCurrency(balance)}\n` +
				`§6──────────────────────────────\n` +
				`§e【个人战斗属性面板】\n` +
				`§f[暴击几率] §a${COMBAT_ATTRIBUTES.crit_rate.getStatText(stats.crit_rate)}  §f[生命上限] §a${COMBAT_ATTRIBUTES.max_hp.getStatText(stats.max_hp)}\n` +
				`§f[轻武器伤害] §a${COMBAT_ATTRIBUTES.light_dmg.getStatText(stats.light_dmg)}  §f[综合免伤] §a${COMBAT_ATTRIBUTES.damage_reduction.getStatText(stats.damage_reduction)}\n` +
				`§f[重武器伤害] §a${COMBAT_ATTRIBUTES.heavy_dmg.getStatText(stats.heavy_dmg)}  §f[脱战回血] §a${COMBAT_ATTRIBUTES.natural_regen.getStatText(stats.natural_regen)}\n` +
				`§f[近战武器伤害] §a${COMBAT_ATTRIBUTES.melee_dmg.getStatText(stats.melee_dmg)}\n` +
				`§6──────────────────────────────\n` +
				`§e点击下方项目消耗金币进行强化:`
			);

		const attrKeys = [
			"crit_rate",
			"light_dmg",
			"heavy_dmg",
			"melee_dmg",
			"max_hp",
			"natural_regen",
			"damage_reduction"
		];

		for (const key of attrKeys) {
			const def = COMBAT_ATTRIBUTES[key];
			const currLvl = stats[key] || 0;
			if (currLvl < def.maxLevel) {
				const cost = def.prices[currLvl];
				const nextText = def.getNextStatText(currLvl);
				form.button(
					`§l§e${def.name} [Lv.${currLvl} -> Lv.${currLvl + 1}]\n§r§a费用: ${cost} 金币 §f│ 下级: ${nextText}`,
					def.icon
				);
			} else {
				form.button(
					`§l§b${def.name} [已达满级 Lv.${currLvl} MAX]\n§r§f当前效果: ${def.getStatText(currLvl)}`,
					def.icon
				);
			}
		}

		form.button("§l§c返回上一页\n§r§f返回便携终端菜单", "textures/ui/undo");

		Utils.showForm(player, form, (res) => {
			if (res.canceled) return;
			const sel = res.selection;
			if (sel === attrKeys.length) {
				if (typeof onBack === "function") onBack();
				return;
			}
			const selectedKey = attrKeys[sel];
			if (selectedKey) {
				this.handleUpgrade(player, selectedKey, onBack);
			}
		});
	}

	/**
	 * 执行属性升级操作
	 */
	static handleUpgrade(player, attrKey, onBack = null) {
		if (!Utils.isValid(player)) return;
		const def = COMBAT_ATTRIBUTES[attrKey];
		if (!def) return;

		const stats = this.getStats(player);
		const currLvl = stats[attrKey] || 0;

		if (currLvl >= def.maxLevel) {
			Utils.tell(player, `§b[系统] ${def.name} 已达最高强化等级 Lv.${currLvl} MAX，无需继续升级！`);
			this.openMenu(player, onBack);
			return;
		}

		const cost = def.prices[currLvl];
		const balance = EconomyManager.getBalance(player);

		if (!EconomyManager.hasBalance(player, cost)) {
			Utils.tell(player, `§c[系统] 金币不足！升级 ${def.name} 需要 ${cost} 金币，当前仅有 ${balance} 金币。`);
			try { player.dimension.playSound("note.bass", player.location, { volume: 0.8, pitch: 0.8 }); } catch {}
			this.openMenu(player, onBack);
			return;
		}

		if (EconomyManager.removeBalance(player, cost)) {
			stats[attrKey] = currLvl + 1;
			this.saveStats(player, stats);

			if (attrKey === "max_hp") {
				system.runTimeout(() => {
					try {
						if (player.isValid()) {
							const health = player.getComponent("minecraft:health");
							if (health && health.currentValue > 0) {
								health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + 4));
							}
						}
					} catch {}
				}, 15);
			}

			try {
				player.dimension.playSound("random.levelup", player.location, { volume: 0.9, pitch: 1.2 });
			} catch {}

			Utils.tell(player, `§a[强化成功] ${def.name} 提升至 Lv.${stats[attrKey]}！当前效果: ${def.getStatText(stats[attrKey])}`);
			this.openMenu(player, onBack);
		} else {
			Utils.tell(player, "§c[系统] 交易处理失败，请稍后重试。");
			this.openMenu(player, onBack);
		}
	}

	/**
	 * 自然生命恢复轮询（每秒执行一次）
	 */
	static tickRegen() {
		const currentTick = system.currentTick;
		for (const player of world.getAllPlayers()) {
			try {
				if (!Utils.isValid(player)) continue;
				const stats = this.getStats(player);
				const regenLvl = stats.natural_regen;
				if (regenLvl <= 0) continue;

				const health = player.getComponent("minecraft:health");
				if (!health || health.currentValue <= 0 || health.currentValue >= health.effectiveMax) continue;

				// 检查脱战状态 (5 秒 = 100 ticks 内未受到或造成伤害)
				const lastCombat = Number(player.getDynamicProperty("gene_last_combat_tick") || 0);
				if (currentTick - lastCombat < 100) continue;

				// 判定回血周期
				let intervalTicks = 80;
				let healAmount = 1;
				if (regenLvl === 2) { intervalTicks = 60; healAmount = 1; }
				else if (regenLvl === 3) { intervalTicks = 40; healAmount = 1; }
				else if (regenLvl === 4) { intervalTicks = 40; healAmount = 2; }
				else if (regenLvl >= 5) { intervalTicks = 20; healAmount = 2; }

				if (currentTick % intervalTicks === 0) {
					health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + healAmount));
				}
			} catch {}
		}
	}

	/**
	 * 注册战斗伤害与免伤监听
	 */
	static registerEvents() {
		world.afterEvents?.playerSpawn?.subscribe((event) => {
			const player = event.player;
			if (player && player.isValid()) {
				this.syncPlayerTags(player);
			}
		});

		const hurt = world.afterEvents?.entityHurt;
		if (!hurt?.subscribe) return;

		hurt.subscribe((event) => {
			try {
				const { damage, damageSource, hurtEntity } = event;
				const attacker = damageSource?.damagingEntity;

				// 1. 受击者为玩家，记录战斗状态并处理非枪械伤害免伤补偿
				if (hurtEntity?.typeId === "minecraft:player") {
					hurtEntity.setDynamicProperty("gene_last_combat_tick", system.currentTick);

					// 枪械命中由 DamageHandler 在扣血前已直接扣减，此处仅针对近战、生物撕咬等非枪械直接伤害
					const isGunDamage = damageSource.cause === "projectile" || damageSource.cause === "override" ||
						(damageSource.damagingProjectile && damageSource.damagingProjectile.typeId.includes("bullet"));

					if (!isGunDamage && damage > 0) {
						const stats = this.getStats(hurtEntity);
						const reduction = COMBAT_ATTRIBUTES.damage_reduction.getBonus(stats.damage_reduction);
						if (reduction > 0) {
							const health = hurtEntity.getComponent("minecraft:health");
							if (health && health.currentValue > 0) {
								const absorbed = Math.min(damage * reduction, health.effectiveMax - health.currentValue);
								if (absorbed > 0.1) {
									system.run(() => {
										try {
											if (hurtEntity.isValid()) {
												const h = hurtEntity.getComponent("minecraft:health");
												if (h && h.currentValue > 0) {
													h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + absorbed));
												}
											}
										} catch {}
									});
								}
							}
						}
					}
				}

				// 2. 攻击者为玩家，记录战斗状态并处理原版近战武器伤害加成与暴击
				if (attacker?.typeId === "minecraft:player") {
					attacker.setDynamicProperty("gene_last_combat_tick", system.currentTick);

					if (damageSource.cause === "entityAttack" && hurtEntity && hurtEntity.isValid()) {
						const stats = this.getStats(attacker);
						const meleeBonusPct = COMBAT_ATTRIBUTES.melee_dmg.getBonus(stats.melee_dmg);
						const critRate = COMBAT_ATTRIBUTES.crit_rate.getBonus(stats.crit_rate);

						let extraDamage = 0;
						let isCrit = false;

						if (meleeBonusPct > 0) {
							extraDamage += damage * meleeBonusPct;
						}

						if (critRate > 0 && Math.random() < critRate) {
							isCrit = true;
							extraDamage += (damage + extraDamage) * 0.6;
						}

						if (extraDamage > 0.1) {
							const finalExtra = extraDamage;
							system.run(() => {
								try {
									if (hurtEntity.isValid()) {
										hurtEntity.applyDamage(finalExtra, {
											cause: "override",
											damagingEntity: attacker
										});
										if (isCrit) {
											hurtEntity.dimension.spawnParticle("minecraft:critical_hit_emitter", hurtEntity.location);
											attacker.dimension.playSound("random.orb", attacker.location, { volume: 0.6, pitch: 1.5 });
										}
									}
								} catch {}
							});
						}
					}
				}
			} catch {}
		});
	}
}
