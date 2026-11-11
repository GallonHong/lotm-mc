import { isProtectedTeammate } from './utils/teamRules.js';
import { isCombatDowned } from './utils/pvpRules.js';
import { world, system, EquipmentSlot, EntityDamageCause } from '@minecraft/server';

export const ARMOR_KNOCKBACK_VALUES = {
	// === 原版护甲 (Vanilla Armors) ===
	netherite_chestplate: 0.30,
	netherite_leggings: 0.20,
	netherite_helmet: 0.15,
	netherite_boots: 0.15,
	diamond_chestplate: 0.15,
	diamond_leggings: 0.10,
	diamond_helmet: 0.05,
	diamond_boots: 0.05,
	iron_chestplate: 0.10,
	iron_leggings: 0.05,

	// === 金色绝品 / 传说高品质重装 (Tier 1 - Legendary / Gold Heavy Armors) ===
	// 高品质重甲无击退效果：单件即享受 100% 击退免疫 (0击退效果)
	armor_mlt_hg2: 1.0,           // 军用科技 HG2 全身重甲 (100% 免疫击退)
	armor_mlt_hg2_desert: 1.0,    // 军用科技 HG2 荒漠全身重甲 (100% 免疫击退)
	armor_killa_6b13: 1.0,        // 6B13 Killa 重装突击防弹衣 (100% 免疫击退)
	armor_mob_chest: 1.0,         // 堡垒重型防暴胸甲 (100% 免疫击退)
	armor_titan_chest: 1.0,       // 泰坦动力外骨骼重甲 (100% 免疫击退)
	armor_epic_titan_vest: 1.0,   // 史诗泰坦动力外骨骼装甲 (100% 免疫击退)

	// 金色绝品重装头盔与下装配件 (叠加易达 100% 免疫)
	armor_mch_fc: 0.35,           // MICH 2000 重装防弹头盔 (+35%)
	armor_mch_fc_desert: 0.35,    // MICH 2000 荒漠重装防弹头盔 (+35%)
	armor_mch_fc_up: 0.35,        // MICH 2000 掀起版 (+35%)
	armor_mob_mask: 0.35,         // 堡垒重装防暴面罩 (+35%)
	armor_mob_pants: 0.40,        // 堡垒重装防暴战术裤 (+40%)
	armor_ocf_gpnvg18: 0.30,      // GPNVG-18 四目夜视盔 (+30%)
	armor_ocf_gpnvg18_desert: 0.30,
	armor_ocf_gpnvg18_up: 0.30,

	// === 紫色史诗品质 (Tier 2 - Epic / Purple) ===
	armor_emr_6b13: 0.70,         // 6B13 EMR 迷彩军规防弹衣 (70%)
	armor_ala_spc: 0.65,          // 艾斯链甲SPC战术背心 (65%)
	armor_assault_vest: 0.65,     // 重型突击插板防弹衣 (65%)
	armor_vest_heavy: 0.65,       // 战术突击重装防弹衣 (65%)
	armor_immortal_vest: 0.60,    // 特警特训防弹背心 (60%)
	armor_ca_pvs31: 0.25,         // PVS-31 双目夜视头盔 (+25%)
	armor_ca_pvs31_desert: 0.25,
	armor_ca_pvs_31_up: 0.25,
	armor_tactical_helmet: 0.25,  // 战术防暴头盔 (+25%)
	armor_helmet_tactical: 0.25,  // 战术防弹头盔 (+25%)
	armor_tech: 0.25,             // 科技战术头盔 (+25%)
	armor_immortal_pants: 0.25,   // 特战极速战术裤 (+25%)
	armor_immortal_mask: 0.20,    // 特警特训面罩 (+20%)

	// === 蓝色精良品质 (Tier 3 - Rare / Blue) ===
	armor_police_vest: 0.45,      // 警用特勤防弹背心 (45%)
	armor_jpc_2: 0.35,            // JPC 2.0 轻量特战背心 (35%)
	armor_jpc_2_desert: 0.35,     // JPC 2.0 荒漠特战背心 (35%)
	armor_wasp_rig: 0.35,         // 黄蜂轻量特战战术背心 (35%)
	armor_black_ghillie: 0.25,    // 暗夜黑色吉利服 (25%)
	armor_epic_ghillie_suit: 0.25,// 史诗潜行吉利服 (25%)
	armor_gorka_bottom: 0.20,     // 廓尔喀战斗裤 (+20%)
	armor_wasp_pants: 0.20,       // 黄蜂轻量作战裤 (+20%)
	armor_wasp_boots: 0.15,       // 工兵减震军靴 (+15%)
	armor_wasp_mask: 0.15,        // 黄蜂轻量面罩 (+15%)
	armor_night_vision: 0.15,     // 战术夜视仪 (+15%)
	armor_m50: 0.15,              // M50 军用防毒面具 (+15%)
	armor_oc_amp: 0.10,           // 降噪耳机战术帽 (+10%)

	// === 绿色优秀 / 普通民用 (Tier 4 - Uncommon / Common / Light) ===
	armor_vest_light: 0.20,       // 轻型战术防弹背心 (20%)
	armor_bdu_woodland_top: 0.10, // 林地作战常服 (10%)
	armor_hazmat_top: 0.10,       // 生化防化服上衣 (10%)
	armor_bdu_woodland_bottom: 0.10, // 林地作战长裤 (10%)
	armor_oak_ghillie: 0.10,      // 橡木迷彩吉利服 (10%)
	armor_goggles_black: 0.10,    // 战术防弹黑风镜 (+10%)
	armor_goggles_red: 0.10,      // 战术防弹红风镜 (+10%)
	armor_night_goggles: 0.10,    // 便携夜视风镜 (+10%)
	armor_gasmask: 0.10,          // 军规防毒面罩 (+10%)
	armor_analyzer: 0.05,         // 战术分析仪 (+5%)
	armor_fraternity: 0.05        // 兄弟会战术面具 (+5%)
};

export const BLAST_REDUCTION_VALUES = {
	// === 胸甲 / 防弹背心 (Chestplates & Vests) ===
	armor_mob_chest: 0.50,         // 堡垒重型防暴护甲 (50% 爆炸全伤减免 - 排爆特化顶级重甲)
	armor_immortal_vest: 0.50,     // 特警特训防弹背心 (50% 爆炸全伤减免 - 专业防爆EOD破片拦截层)
	armor_mlt_hg2: 0.40,           // 军用科技 HG2 全身重甲 (40% 爆炸全伤减免 - 纳米陶瓷复合装甲)
	armor_mlt_hg2_desert: 0.40,    // 军用科技 HG2 荒漠全身重甲 (40% 爆炸全伤减免)
	armor_titan_chest: 0.40,       // 泰坦动力外骨骼装甲 (40% 爆炸全伤减免 - 钛合金工业重装)
	armor_epic_titan_vest: 0.40,   // 史诗泰坦动力外骨骼装甲 (40% 爆炸全伤减免)
	armor_killa_6b13: 0.30,        // 6B13 Killa 重装防弹衣 (30% 爆炸全伤减免)
	armor_assault_vest: 0.25,      // 重装突击防弹衣 (25% 爆炸全伤减免)
	armor_vest_heavy: 0.25,        // 战术突击重装防弹衣 (25% 爆炸全伤减免)
	armor_emr_6b13: 0.20,          // 6B13 EMR 迷彩防弹衣 (20% 爆炸全伤减免)
	armor_police_vest: 0.15,       // 警用特勤防弹背心 (15% 爆炸全伤减免)
	armor_hazmat_top: 0.15,        // 生化防化服上衣 (15% 爆炸全伤减免)
	armor_jpc_2: 0.10,             // JPC 2.0 轻量特战背心 (10% 爆炸全伤减免)
	armor_jpc_2_desert: 0.10,
	armor_ala_spc: 0.10,           // 骷髅SPC背心 (10% 爆炸全伤减免)

	// === 头盔与面罩 (Helmets & Masks) ===
	armor_mob_mask: 0.20,          // 堡垒重装防暴面罩 (+20% 爆炸减免)
	armor_mch_fc: 0.15,            // MICH 2000 重装防弹头盔 (+15% 爆炸减免)
	armor_mch_fc_desert: 0.15,
	armor_mch_fc_up: 0.15,
	armor_tactical_helmet: 0.15,   // 战术防暴头盔 (+15% 爆炸减免)
	armor_helmet_tactical: 0.15,   // 战术防弹头盔 (+15% 爆炸减免)
	armor_immortal_mask: 0.10,     // 特警特训面罩 (+10% 爆炸减免)
	armor_tech: 0.10,              // 科技战术头盔 (+10% 爆炸减免)
	armor_gasmask: 0.10,           // 军用防毒面具 (+10% 爆炸减免)

	// === 裤子与下装 (Leggings) ===
	armor_mob_pants: 0.15,         // 堡垒重装防暴战术裤 (+15% 爆炸减免)
	armor_immortal_pants: 0.10,    // 特战极速战术裤 (+10% 爆炸减免)

	// === 战术靴 (Boots) ===
	armor_wasp_boots: 0.10         // 野战工兵军靴 (+10% 爆炸减免 - 排雷减震设计)
};

export class ArmorEngine {
	/**
	 * 获取实体当前装甲的总抗击退比例 (0.0 ~ 1.0, 1.0 为 100% 击退免疫 / 无击退效果)
	 * @param {Entity} entity 
	 * @returns {number} 0.0 到 1.0 之间的抗击退系数
	 */
	static getKnockbackResistance(entity) {
		if (!entity || !entity.isValid()) return 0;
		try {
			const equ = entity.getComponent('minecraft:equippable');
			if (!equ) return 0;

			let total = 0;
			const slots = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];
			for (const slot of slots) {
				const item = equ.getEquipment(slot);
				if (!item) continue;
				const typeId = (item.typeId || '').toLowerCase();
				const shortId = typeId.includes(':') ? typeId.split(':')[1] : typeId;

				let val = ARMOR_KNOCKBACK_VALUES[shortId];
				if (val === undefined) {
					for (const [k, v] of Object.entries(ARMOR_KNOCKBACK_VALUES)) {
						if (shortId.includes(k)) {
							val = v;
							break;
						}
					}
				}
				if (typeof val === 'number') {
					total += val;
				}
			}
			return Math.min(1.0, Math.max(0, total));
		} catch {
			return 0;
		}
	}

	/**
	 * 获取实体当前装备的总爆炸伤害减免比例 (0.0 ~ 0.75, 上限 75%)
	 * @param {Entity} entity
	 * @returns {number} 0.0 到 0.75 之间的减免比例
	 */
	static getBlastReduction(entity) {
		if (!entity || !entity.isValid()) return 0;
		try {
			const equ = entity.getComponent('minecraft:equippable');
			if (!equ) return 0;

			let total = 0;
			const slots = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];
			for (const slot of slots) {
				const item = equ.getEquipment(slot);
				if (!item) continue;
				const typeId = (item.typeId || '').toLowerCase();
				const shortId = typeId.includes(':') ? typeId.split(':')[1] : typeId;

				let val = BLAST_REDUCTION_VALUES[shortId];
				if (val === undefined) {
					for (const [k, v] of Object.entries(BLAST_REDUCTION_VALUES)) {
						if (shortId.includes(k)) {
							val = v;
							break;
						}
					}
				}
				if (typeof val === 'number') {
					total += val;
				}
			}
			return Math.min(0.75, Math.max(0, total));
		} catch {
			return 0;
		}
	}

	static playerStates = new Map(); // playerId -> { nightVision: boolean, lastShieldTick: number }

 /**
  * 清理离开玩家的缓存
  */
 static clearPlayer(playerId) {
  this.playerStates.delete(playerId);
 }

 /**
  * 玩家周期性被动循环 (每刻或每数刻调用)
  * @param {Player} player 
  */
 static tick(player) {
  if (!player || !player.isValid()) return;
  if (isCombatDowned(player)) return;

  try {
   const equ = player.getComponent('minecraft:equippable');
   if (!equ) return;

   const pId = player.id;
   let state = this.playerStates.get(pId);
   if (!state) {
    state = { nightVision: false, lastShieldTick: 0 };
    this.playerStates.set(pId, state);
   }

   const head = equ.getEquipment(EquipmentSlot.Head);
   const chest = equ.getEquipment(EquipmentSlot.Chest);
   const legs = equ.getEquipment(EquipmentSlot.Legs);
   const feet = equ.getEquipment(EquipmentSlot.Feet);

   // 1. 【夜视系统 (GPNVG-18 / PVS-31 / 战术夜视仪)】
   const headId = head?.typeId || '';
   const hasNightVisionHelmet = (
    headId.includes('armor_night_vision') ||
    (headId.includes('armor_ocf_gpnvg18') && !headId.includes('_up')) ||
    (headId.includes('armor_ca_pvs31') && !headId.includes('_up')) ||
    (headId.includes('armor_ca_pvs_31') && !headId.includes('_up'))
   );

   if (hasNightVisionHelmet) {
    player.addEffect('night_vision', 240, { amplifier: 0, showParticles: false });
    state.nightVision = true;
   } else if (state.nightVision) {
    player.removeEffect('night_vision');
    state.nightVision = false;
   }

   // 2. 【M50 军用三防防毒面具 & 黄蜂面罩】恶劣环境净化（解毒、抗凋零、水下呼吸）
   const feetId = feet?.typeId || '';
   const hasM50 = feetId.includes('armor_m50') || headId.includes('armor_gasmask');
   const isWaspMask = headId.includes('armor_wasp_mask');

   if (hasM50 || isWaspMask) {
    try {
     player.removeEffect('poison');
     player.removeEffect('fatal_poison');
     if (hasM50) {
      player.removeEffect('wither');
      player.addEffect('water_breathing', 100, { amplifier: 0, showParticles: false });
     }
    } catch {}
   }

   // 3. 【机动性战术装备】移速与机动
   // 3.1 JPC 2.0 轻量特战背心：常驻轻巧机动 (+10% 移速)
   const chestId = chest?.typeId || '';
   if (chestId.includes('armor_jpc_2')) {
    player.addEffect('speed', 40, { amplifier: 0, showParticles: false });
   }

   // 3.2 军用科技 HG2 全身重甲：动能过载护盾系统 (+8 HP 金心护盾，受创中断，脱战8秒充能) 与负重减速
   const isWearingHg2 = chestId.includes('armor_mlt_hg2');
   if (isWearingHg2) {
    // 常驻负重轻度减速
    player.addEffect('slowness', 40, { amplifier: 0, showParticles: false });

    const currentTick = system.currentTick;
    const timeSinceDamage = currentTick - (state.lastDamageTick || 0);
    const RECHARGE_DELAY_TICKS = 160; // 8秒脱战充能冷却 (160 ticks)

    if (!state.wearingHg2) {
     // 首次穿戴装甲：初始化激活 8 HP 能量护盾 (长持续时间，绝不在战斗中每刻刷新)
     state.wearingHg2 = true;
     state.hg2ShieldReady = true;
     state.lastDamageTick = 0;
     state.lastShieldRechargeTick = currentTick;
     player.addEffect('absorption', 20 * 3600, { amplifier: 1, showParticles: false });
     try {
      player.dimension.playSound('beacon.power', player.location, { volume: 0.8, pitch: 1.4 });
      player.dimension.spawnParticle('minecraft:totem_particle', {
       x: player.location.x,
       y: player.location.y + 1.0,
       z: player.location.z
      });
      player.onScreenDisplay?.setActionBar?.('§6【军用科技】HG2 动能外装甲护盾启动 (+8 HP)§r');
     } catch {}
    } else {
     // 穿戴状态中：监控金心护盾消耗
     const absEffect = player.getEffect('absorption');
     if (!absEffect) {
      // 护盾金心已被攻击者彻底击破打空！
      if (state.hg2ShieldReady) {
       state.hg2ShieldReady = false;
       try {
        player.dimension.playSound('random.glass', player.location, { volume: 0.8, pitch: 0.8 });
        player.dimension.spawnParticle('minecraft:crit', player.location);
        player.onScreenDisplay?.setActionBar?.('§c【军用科技】HG2 动能护盾过载破裂！寻找掩体脱战以重新充能...§r');
       } catch {}
      }

      // 仅当玩家脱离战斗超过 8 秒且期间未再受创，护盾才重新充能恢复！
      if (timeSinceDamage >= RECHARGE_DELAY_TICKS) {
       state.hg2ShieldReady = true;
       state.lastShieldRechargeTick = currentTick;
       player.addEffect('absorption', 20 * 3600, { amplifier: 1, showParticles: false });
       try {
        player.dimension.playSound('beacon.power', player.location, { volume: 0.8, pitch: 1.5 });
        player.dimension.playSound('random.orb', player.location, { volume: 0.7, pitch: 1.8 });
        player.dimension.spawnParticle('minecraft:totem_particle', {
         x: player.location.x,
         y: player.location.y + 1.0,
         z: player.location.z
        });
        player.onScreenDisplay?.setActionBar?.('§6【军用科技】HG2 动能外装甲护盾充能完毕 (+8 HP)§r');
       } catch {}
      }
     } else {
      // 护盾金心尚存，若近期受创消耗过，脱战 8 秒后自动校准修补至满额 8 HP
      if (state.lastDamageTick > 0 && timeSinceDamage >= RECHARGE_DELAY_TICKS && (currentTick - (state.lastShieldRechargeTick || 0) > RECHARGE_DELAY_TICKS)) {
       state.hg2ShieldReady = true;
       state.lastShieldRechargeTick = currentTick;
       state.lastDamageTick = 0;
       player.removeEffect('absorption');
       player.addEffect('absorption', 20 * 3600, { amplifier: 1, showParticles: false });
       try {
        player.dimension.playSound('beacon.power', player.location, { volume: 0.6, pitch: 1.6 });
        player.onScreenDisplay?.setActionBar?.('§6【军用科技】HG2 动能护盾自检修复至满额 (+8 HP)§r');
       } catch {}
      }
     }
    }
   } else {
    // 脱下 HG2 重甲
    if (state.wearingHg2) {
     state.wearingHg2 = false;
     state.hg2ShieldReady = false;
     try {
      player.removeEffect('absorption');
     } catch {}
    }
   }

   // 3.3 特战作战裤：疾跑滑步冲刺
   const legsId = legs?.typeId || '';
   if (legsId.includes('armor_immortal_pants') && player.isSprinting) {
    player.addEffect('speed', 25, { amplifier: 0, showParticles: false });
   }

   // 4. 【堡垒重装防弹衣】常态低血量濒死护盾监控 (放宽阈值至 <= 8 HP)
   if (chestId.includes('armor_mob_chest')) {
    const health = player.getComponent('minecraft:health');
    if (health && health.currentValue <= 8) {
     this.triggerEmergencyShield(player, state);
    }
   }
  } catch (err) {
   console.warn('ArmorEngine tick error:', err);
  }
 }

 /**
  * 触发堡垒重装防弹衣【濒死核心护盾】(大幅补偿增强: 6 颗金心 + Resistance II)
  * @param {Player} player 
  * @param {Object} [state] 
  */
 static triggerEmergencyShield(player, state) {
  if (!player || !player.isValid()) return;
  if (isCombatDowned(player)) return;

  if (!state) {
   state = this.playerStates.get(player.id);
   if (!state) {
    state = { nightVision: false, lastShieldTick: 0 };
    this.playerStates.set(player.id, state);
   }
  }

  const currentTick = system.currentTick;
  // 冷却时间 50 秒 (1000 ticks)
  if (currentTick - state.lastShieldTick < 1000) {
   return;
  }
  state.lastShieldTick = currentTick;

  try {
   // 赋予 6 颗金心吸收护盾 (Absorption V 12秒) 与强力抗性提升 (Resistance II 6秒)
   player.addEffect('absorption', 240, { amplifier: 5, showParticles: false });
   player.addEffect('resistance', 120, { amplifier: 1, showParticles: false });

   const pLoc = player.location;
   const dim = player.dimension;

   // 震撼音效与粒子
   dim.playSound('beacon.activate', pLoc, { volume: 1.5, pitch: 1.2 });
   dim.playSound('random.totem', pLoc, { volume: 0.8, pitch: 1.5 });
   dim.spawnParticle('minecraft:totem_particle', { x: pLoc.x, y: pLoc.y + 1.0, z: pLoc.z });
   dim.spawnParticle('minecraft:sonic_explosion', { x: pLoc.x, y: pLoc.y + 0.5, z: pLoc.z });

   player.onScreenDisplay?.setActionBar?.('§6【堡垒重装·超频护盾】濒死超能装甲超频过载！激活6颗金心护盾并获得抗性强化！§r');
  } catch (e) {
   console.warn('ArmorEngine triggerEmergencyShield error:', e);
  }
 }

 /**
  * 实体受击事件处理 (处理跌落减震、爆炸破片拦截、近战反伤、受创触发濒死护盾)
  * @param {Player} player 
  * @param {Object} damageSource 
  * @param {number} damage 
  */
 static handleHurt(player, damageSource, damage) {
		if (!player || !player.isValid() || damage <= 0) return;
  // The active life/rescue system owns downed HP; armor must not heal or re-shield it.
  if (isCombatDowned(player)) return;

		try {
			// 更新玩家受创时间戳 (打断护盾充能并启动脱战计时)
			const hurtState = this.playerStates.get(player.id);
			if (hurtState) {
				hurtState.lastDamageTick = system.currentTick;
			}

			const cause = damageSource?.cause;
			const attacker = damageSource?.damagingEntity;
			const attackerType = (attacker?.typeId || '').toLowerCase();
			const isMonster = attacker && attacker.isValid() && attacker.typeId !== 'minecraft:player';
			const isBoss = isMonster && (attackerType.includes('boss') || attackerType.includes('mutant') || attackerType.includes('titan') || attackerType.includes('warden') || attackerType.includes('wither') || attackerType.includes('ravager') || attackerType.includes('siren') || attackerType.includes('golem'));

			// 0. 【核心抗击退机制】根据品质削减击退，高品质重甲 100% 击退免疫 (无击退效果)
			const kbResistance = this.getKnockbackResistance(player);
			if (kbResistance >= 1.0) {
				if (isBoss) {
					// 面对世界Boss/突变巨兽，重甲保留70%抗性，允许30%冲击位移
					try {
						const dx = player.location.x - attacker.location.x;
						const dz = player.location.z - attacker.location.z;
						const dist = Math.hypot(dx, dz) || 1.0;
						player.clearVelocity();
						system.run(() => {
							if (player.isValid()) {
								player.applyKnockback(dx / dist * 0.35, dz / dist * 0.35, 0.35, 0.18);
							}
						});
					} catch {}
				} else {
					// 对普通枪械与普通生物完全免疫击退 (零击退)
					player.clearVelocity();
					system.run(() => {
						if (player.isValid()) {
							player.clearVelocity();
						}
					});
				}
				try {
					player.dimension.playSound('armor.equip_iron', player.location, { volume: 0.5, pitch: 0.75 });
					player.dimension.spawnParticle('minecraft:critical_hit_emitter', {
						x: player.location.x,
						y: player.location.y + 0.9,
						z: player.location.z
					});
				} catch {}
			} else if (kbResistance > 0) {
				// 部分击退抗性：按比例缩减击退动量
				try {
					const vel = player.getVelocity();
					const factor = Math.max(0, 1.0 - kbResistance);
					player.clearVelocity();
					if (factor > 0.05 && (Math.abs(vel.x) > 0.05 || Math.abs(vel.z) > 0.05)) {
						system.run(() => {
							if (player.isValid()) {
								player.applyKnockback(
									vel.x * factor,
									vel.z * factor,
									Math.sqrt(vel.x * vel.x + vel.z * vel.z) * factor,
									vel.y * factor
								);
							}
						});
					}
				} catch {}
			}

			const equ = player.getComponent('minecraft:equippable');
			if (!equ) return;

			const chest = equ.getEquipment(EquipmentSlot.Chest);
			const feet = equ.getEquipment(EquipmentSlot.Feet);
			const chestId = chest?.typeId || '';

			// 1. 【野战工兵军靴】缓降防滑（吸收 60% 跌落摔伤）
			if (cause === 'fall' && feet && feet.typeId.includes('armor_wasp_boots')) {
				const health = player.getComponent('minecraft:health');
				if (health) {
					const absorbed = Math.max(0.5, Math.round(damage * 0.60 * 10) / 10);
					const newHp = Math.min(health.effectiveMax, health.currentValue + absorbed);
					health.setCurrentValue(newHp);
					player.dimension.spawnParticle('minecraft:cloud', player.location);
					player.dimension.playSound('step.cloth', player.location, { volume: 1.0, pitch: 0.8 });
					player.onScreenDisplay?.setActionBar?.(`§b【工兵军靴】减震气垫吸收 ${absorbed.toFixed(1)} 点跌落伤害！§r`);
				}
			}

			// 2. 【防爆装甲爆炸减免机制】(爆炸带有 50% 真实伤害，防爆装甲提供专门的爆炸全伤害减免)
			if (cause === 'entityExplosion' || cause === 'blockExplosion') {
				const blastRed = this.getBlastReduction(player);
				if (blastRed > 0) {
					const health = player.getComponent('minecraft:health');
					if (health) {
						const absorbed = Math.max(0.5, Math.round(damage * blastRed * 10) / 10);
						const newHp = Math.min(health.effectiveMax, health.currentValue + absorbed);
						health.setCurrentValue(newHp);
						player.dimension.spawnParticle('minecraft:crit', player.location);
						player.onScreenDisplay?.setActionBar?.(`§6【防爆减免】防爆装甲吸收 ${(blastRed * 100).toFixed(0)}% 爆炸冲击！(减免 +${absorbed.toFixed(1)} HP)§r`);
					}
				}
			}

			// 3. 【重装防具巨兽近战重击吸收与防秒杀机制】
			// 解决高科技重甲/外骨骼被 Warden/世界Boss 怪物一拳秒杀的严重体验问题
			const isHeavyArmor = chestId.includes('armor_mlt_hg2') || chestId.includes('armor_titan') || chestId.includes('armor_mob_chest') || chestId.includes('armor_killa') || chestId.includes('armor_assault') || chestId.includes('armor_vest_heavy');
			const isMeleeMonster = isMonster && (cause === 'entityAttack' || cause === 'entitySwipe' || cause === 'sonicBoom');

			if (isMeleeMonster && isHeavyArmor && damage >= 4.0) {
				const health = player.getComponent('minecraft:health');
				if (health) {
					// 吸收巨兽 45% (普通巨怪 30%) 的近战毁灭冲击力
					const absorbRatio = isBoss ? 0.45 : 0.30;
					const absorbed = Math.max(1.0, Math.round(damage * absorbRatio * 10) / 10);
					const newHp = Math.min(health.effectiveMax, health.currentValue + absorbed);
					health.setCurrentValue(newHp);

					player.dimension.playSound('armor.equip_diamond', player.location, { volume: 0.8, pitch: 0.8 });
					player.dimension.spawnParticle('minecraft:crit', player.location);

					if (isBoss) {
						player.onScreenDisplay?.setActionBar?.(`§6【重装外骨骼】吸收巨兽 ${(absorbRatio * 100).toFixed(0)}% 毁灭冲击！(抗性吸收 +${absorbed.toFixed(1)} HP)§r`);
					}
				}
			}

			// 3.1 【重装甲紧急防秒杀缓冲机制 (Anti-One-Shot Protection)】
			// 满血或健康状态遭遇足以致命的巨额重创时，紧急阻尼器过载保留 4 HP (2颗心)，杜绝暴毙
			if (isHeavyArmor && isMonster) {
				const health = player.getComponent('minecraft:health');
				if (health && health.currentValue <= 2.0) {
					const currentTick = system.currentTick;
					const lastGateTick = hurtState?.lastLethalGateTick || 0;
					if (currentTick - lastGateTick > 500) { // 25秒内置过载保护冷却
						if (hurtState) hurtState.lastLethalGateTick = currentTick;
						health.setCurrentValue(4.0); // 强行保留 4 HP (2 颗心)
						player.addEffect('resistance', 30, { amplifier: 4, showParticles: false }); // 1.5秒霸体抗性缓冲
						player.dimension.playSound('random.totem', player.location, { volume: 0.9, pitch: 1.6 });
						player.dimension.playSound('beacon.deactivate', player.location, { volume: 1.0, pitch: 1.2 });
						player.dimension.spawnParticle('minecraft:totem_particle', player.location);
						player.onScreenDisplay?.setActionBar?.('§c【紧急过载缓冲】重装甲紧急阻尼器过载激活！抵御致命秒杀！§r');
					}
				}
			}

			// 4. 【艾斯链甲骷髅战术背心】反弹 30% 近战穿透刺伤
			if ((cause === 'entityAttack' || cause === 'entitySwipe') && chestId.includes('armor_ala_spc') && attacker && attacker.isValid() && !isProtectedTeammate(player, attacker)) {
				try {
					const reflectDmg = Math.max(1.0, Math.round(damage * 0.30 * 10) / 10);
					attacker.applyDamage(reflectDmg, { cause: EntityDamageCause.thorns, damagingEntity: player });
					player.dimension.spawnParticle('minecraft:critical_hit_emitter', attacker.location);
					player.dimension.playSound('random.anvil_land', player.location, { volume: 0.7, pitch: 2.2 });
				} catch {}
			}

			// 5. 【堡垒重装防弹衣】受重击时如果生命降至危险线，触发濒死护盾
			if (chestId.includes('armor_mob_chest')) {
				const health = player.getComponent('minecraft:health');
				if (health && health.currentValue <= 8) {
					this.triggerEmergencyShield(player);
				}
			}

			// 6. 【敌对生物威胁平衡】
			if (isMonster && (cause === 'entityAttack' || cause === 'entitySwipe' || cause === 'sonicBoom')) {
				if (isBoss) {
					// 世界Boss/突变巨兽攻击：施加震颤硬直与沉重钝击挫伤特效 (不再反向额外扣血加速暴毙)
					const bluntTrauma = Math.round(damage * 0.40 * 10) / 10;
					try {
						player.addEffect('slowness', 40, { amplifier: 1, showParticles: false });
						player.dimension.playSound('random.anvil_land', player.location, { volume: 0.9, pitch: 0.7 });
						player.dimension.spawnParticle('minecraft:critical_hit_emitter', player.location);
						player.onScreenDisplay?.setActionBar?.(`§c【巨兽重击】遭受巨兽冲击！受到重度硬直与 §e${bluntTrauma}§c钝击震荡！§r`);
					} catch {}
				} else {
					// 普通丧尸/群怪近战：保底至少受到 1.0 HP 爪击挫伤，避免尸群完全刮痧
					if (damage < 1.0) {
						const deficit = Math.max(0, 1.0 - damage);
						try {
							const health = player.getComponent('minecraft:health');
							if (health && health.currentValue > deficit) {
								health.setCurrentValue(Math.max(1, health.currentValue - deficit));
							}
						} catch {}
					}
				}
			}
		} catch (err) {
			console.warn('ArmorEngine handleHurt error:', err);
		}
	}
}
