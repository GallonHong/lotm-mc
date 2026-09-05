import { world, system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { DamageResolver } from "./lotm_damage_resolver.js";
import { StatusEffectManager } from "./lotm_status_manager.js";

/**
 * 战士途径 · 序列 7 武器大师 (Weapon Master)
 * PRD 5.2 节实现：四大战术武器专精、大师格挡、磨刃油、三姿态
 */
export class PathwayWarrior {
    static cooldowns = new Map();

    static beginCooldown(player, abilityId, ticks) {
        const key = `${player.id}:${abilityId}`;
        const expires = this.cooldowns.get(key) || 0;
        if (expires > system.currentTick) {
            Utils.actionbar(player, `§c能力冷却中：${Math.ceil((expires - system.currentTick) / 20)} 秒`);
            return false;
        }
        this.cooldowns.set(key, system.currentTick + ticks);
        return true;
    }
    /**
     * 武器大师姿态管理 (PRD 5.2: 进攻/守御/远射/均衡)
     */
    static getStance(player) {
        return Utils.getProp(player, "lotm:stance", "balanced");
    }

    static setStance(player, stance) {
        Utils.setProp(player, "lotm:stance", stance);
        const stanceNames = {
            attack: "§c【进攻姿态】 §7(伤害+8%, 受伤+5%)",
            defense: "§9【守御姿态】 §7(近战承伤-8%, 移速-5%)",
            ranged: "§a【远射姿态】 §7(散布归零, 近战伤害-8%)",
            balanced: "§f【均衡姿态】 §7(标准战斗状态)",
        };
        Utils.playSound(player, "random.anvil_use", 1.5, 1.0);
        Utils.tell(player, `§6[武器大师] 已切换至 ${stanceNames[stance] || stanceNames.balanced}！`);
    }

    /**
     * 武器大师战技分发入口
     */
    static executeWeaponSkill(player, heldItemId, isSneaking, lotmManager) {
        // 潜行右键：统一触发【大师格挡】
        if (isSneaking) {
            this.performMasterGuard(player, lotmManager);
            return;
        }

        // 普通右键：依据武器形态分发四大战技
        if (heldItemId === "lotm:tactical_sword" || heldItemId.includes("sword")) {
            this.swordThrust(player, lotmManager);
        } else if (heldItemId === "lotm:tactical_axe" || heldItemId.includes("axe")) {
            this.axeCleave(player, lotmManager);
        } else if (heldItemId === "lotm:tactical_spear") {
            this.spearPierce(player, lotmManager);
        } else if (heldItemId === "lotm:tactical_bow" || heldItemId.includes("bow")) {
            this.bowFocus(player, lotmManager);
        }
    }

    /**
     * 1. 长剑·穿刺突进 (Sword Thrust)
     */
    static swordThrust(player, lotmManager) {
        if (!this.beginCooldown(player, "sword_thrust", 60)) return;
        if (!lotmManager.modifySpirituality(player, -25)) { this.cooldowns.delete(`${player.id}:sword_thrust`); return; }

        const dim = player.dimension;
        const viewDir = player.getViewDirection();
        const startLoc = { ...player.location };

        Utils.playSound(player, "item.trident.riptide_1", 1.8, 1.0);
        lotmManager.addDigestion(player, 2);

        // 冲刺 4 格
        const targetLoc = {
            x: startLoc.x + viewDir.x * 4,
            y: startLoc.y,
            z: startLoc.z + viewDir.z * 4,
        };
        try { player.teleport(targetLoc, { dimension: dim }); } catch {}

        const { entity } = TargetingService.getRayTarget(player, 3.5);
        if (entity) {
            DamageResolver.applyDamage(player, entity, {
                pveDamage: 26,
                pvpDamage: 13,
                ignoreArmor: true,
                armorPierceRatio: 0.25,
            });
            StatusEffectManager.applyStatus(entity, "armor_break", 100, 0.2, player); // 5秒破甲20%
            Utils.playSound(player, "random.break", 1.6, 1.0);
        }

        Utils.actionbar(player, "§6🗡️ [长剑·穿刺] 突进破甲刺杀！");
    }

    /**
     * 2. 战斧·横扫处决 (Axe Cleave)
     */
    static axeCleave(player, lotmManager) {
        if (!this.beginCooldown(player, "axe_cleave", 60)) return;
        if (!lotmManager.modifySpirituality(player, -30)) { this.cooldowns.delete(`${player.id}:axe_cleave`); return; }

        const dim = player.dimension;
        Utils.playSound(player, "item.trident.throw", 1.2, 1.0);
        Utils.playSound(player, "random.explode", 1.6, 0.8);
        lotmManager.addDigestion(player, 2);

        // 120° 扇形 3.5 格横扫 (最多 5 目标)
        const targets = TargetingService.getConeTargets(player, 3.5, 120, 5);
        for (const target of targets) {
            let dmg = 30;
            const healthComp = target.getComponent && target.getComponent("health");
            if (healthComp && healthComp.currentValue / healthComp.effectiveMax < 0.3) {
                dmg *= 1.25; // 斩杀低血量
            }
            DamageResolver.applyDamage(player, target, {
                pveDamage: dmg,
                pvpDamage: 15,
            });
        }

        Utils.actionbar(player, "§6🪓 [战斧·横扫] 120°强力处决风暴！");
    }

    /**
     * 3. 长枪·贯线刺击 (Spear Pierce)
     */
    static spearPierce(player, lotmManager) {
        if (!this.beginCooldown(player, "spear_pierce", 60)) return;
        if (!lotmManager.modifySpirituality(player, -25)) { this.cooldowns.delete(`${player.id}:spear_pierce`); return; }

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        Utils.playSound(player, "random.bow", 1.8, 1.0);
        lotmManager.addDigestion(player, 2);

        const { entity } = TargetingService.getRayTarget(player, 6);
        if (entity) {
            DamageResolver.applyDamage(player, entity, {
                pveDamage: 28,
                pvpDamage: 14,
            });
            Utils.playSound(player, "random.break", 1.5, 1.0);
        }

        for (let d = 0.5; d < 6; d += 0.8) {
            try {
                dim.spawnParticle("minecraft:crit", {
                    x: headLoc.x + viewDir.x * d,
                    y: headLoc.y + viewDir.y * d,
                    z: headLoc.z + viewDir.z * d,
                });
            } catch {}
        }

        Utils.actionbar(player, "§6🔱 [长枪·贯线] 6格直线贯穿刺击！");
    }

    /**
     * 4. 战弓·专注射击 (Bow Focus)
     */
    static bowFocus(player, lotmManager) {
        if (!this.beginCooldown(player, "bow_focus", 140)) return;
        if (!lotmManager.modifySpirituality(player, -30)) { this.cooldowns.delete(`${player.id}:bow_focus`); return; }

        Utils.playSound(player, "random.orb", 1.5, 1.0);
        lotmManager.addDigestion(player, 2);

        try {
            player.addEffect("strength", 100, { amplifier: 1, showParticles: false });
        } catch {}

        Utils.actionbar(player, "§6🏹 [战弓·专注] 凝神聚气，下一次射击伤害+50%！");
    }

    /**
     * 副技能：【大师格挡 (Master Guard)】 (潜行右键)
     */
    static performMasterGuard(player, lotmManager) {
        if (!this.beginCooldown(player, "master_guard", 140)) return;
        if (!lotmManager.modifySpirituality(player, -35)) { this.cooldowns.delete(`${player.id}:master_guard`); return; }

        Utils.playSound(player, "item.shield.block", 1.5, 1.0);
        lotmManager.addDigestion(player, 3);

        // 赋予 1 秒 (20 tick) 80% 减伤与反击格挡窗
        StatusEffectManager.applyStatus(player, "guard", 20, 0.8, player);

        Utils.actionbar(player, "§e🛡️ [大师格挡] 1秒格挡架势！受击减伤80%并反击！");
    }

    /**
     * 消耗品：【磨刃油 (Blade Oil)】
     */
    static applyBladeOil(player, lotmManager) {
        if (Utils.countItem(player, "lotm:blade_oil") <= 0) {
            Utils.tell(player, "§c背包中没有【磨刃油】！");
            Utils.sound.fail(player);
            return;
        }

        Utils.removeItem(player, "lotm:blade_oil", 1);
        Utils.playSound(player, "random.anvil_use", 1.2, 1.0);
        lotmManager.addDigestion(player, 1);

        try {
            player.addEffect("strength", 1200, { amplifier: 0, showParticles: false }); // 60 秒增伤
        } catch {}

        Utils.tell(player, "§a🗡️ [磨刃油] 兵刃打磨完毕！60秒内武器伤害+8%，耐久损耗-20%！");
    }
}
