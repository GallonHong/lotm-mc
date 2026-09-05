import { world, system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { StatusEffectManager } from "./lotm_status_manager.js";
import { Integration } from "./integration.js";

/**
 * 《诡秘之主》统一伤害与控制结算器 (DamageResolver)
 * 遵循 PRD 3.3 节与 4.2 节：
 * 所有非凡技能伤害统一走此入口，分离 PvE / PvP 计算，自动结算破甲、格挡与属性增伤
 */
export class DamageResolver {
    /**
     * 执行伤害与非凡属性结算
     * @param {import("@minecraft/server").Player|import("@minecraft/server").Entity} attacker 攻击者
     * @param {import("@minecraft/server").Entity} target 目标受击者
     * @param {object} options 
     * @param {number} options.pveDamage PvE 基础伤害
     * @param {number} [options.pvpDamage] PvP 基础伤害 (缺省则按 pveDamage * 0.5 保护)
     * @param {boolean} [options.ignoreArmor=false] 是否部分/全部无视护甲
     * @param {number} [options.armorPierceRatio=0] 破甲穿透比例 (0.0 ~ 1.0)
     * @param {boolean} [options.isUndeadBonus=false] 是否对亡灵生物具备神圣克制加成
     * @param {boolean} [options.isFireDamage=false] 是否属于火焰伤害
     * @param {string} [options.cause="entityAttack"] 伤害原因
     * @returns {number} 最终结算造成的实际伤害值
     */
    static applyDamage(attacker, target, options = {}) {
        if (!Utils.isValid(target) || target.id === (attacker ? attacker.id : null)) return 0;

        const isPvP = target.typeId === "minecraft:player";
        let baseDmg = isPvP ? (options.pvpDamage ?? (options.pveDamage ? options.pveDamage * 0.5 : 10)) : (options.pveDamage ?? 15);

        // 1. 领地权限检测 (若在他人保护领地内且未开启相应权限，阻止伤害)
        if (attacker && attacker.typeId === "minecraft:player" && Integration.isServerAvailable()) {
            const { chunkX, chunkZ } = Utils.getChunkCoords(target.location);
            let plot = null;
            try {
                const rawPlot = world.getDynamicProperty(Utils.getPlotKey(target.dimension.id, chunkX, chunkZ));
                if (typeof rawPlot === "string") plot = JSON.parse(rawPlot);
            } catch {}
            const isTrusted = plot && (
                plot.ownerId === attacker.id ||
                plot.ownerName === attacker.name ||
                plot.members?.includes(attacker.name)
            );
            if (plot && !isTrusted) {
                if (isPvP && plot.flags?.allowPvp !== true) return 0;
                if (!isPvP && plot.flags?.allowAttackEntity !== true) return 0;
            }
        }

        // 2. 状态与被动增伤结算
        // (1) 战士途径姿态加成
        if (attacker && attacker.typeId === "minecraft:player") {
            const stance = Utils.getProp(attacker, "lotm:stance", "balanced");
            if (stance === "attack") baseDmg *= 1.08;
            else if (stance === "ranged" && !options.isRanged) baseDmg *= 0.92;

            // 刺客/女巫隐形破隐一击 (PvE +15%, PvP +8%)
            const hasInvis = attacker.getEffect && attacker.getEffect("invisibility");
            if (hasInvis) {
                baseDmg *= isPvP ? 1.08 : 1.15;
            }
        }

        // 受击者守御姿态减伤
        if (target && target.typeId === "minecraft:player") {
            const targetStance = Utils.getProp(target, "lotm:stance", "balanced");
            if (targetStance === "defense") baseDmg *= 0.92;
            else if (targetStance === "attack") baseDmg *= 1.05;

            // 暴怒之民：以更高承伤换取短时攻击与移动增益。
            const rageUntil = Utils.getProp(target, "lotm:tyrant_rage_until", 0);
            if (rageUntil > system.currentTick) baseDmg *= 1.1;

        }

        // (2) 猎人被动：对燃烧目标增伤 +10%
        if (options.isFireDamage || StatusEffectManager.hasStatus(target, "burning") || (target.getComponent && target.getComponent("onfire"))) {
            baseDmg *= 1.1;
        }

        // (2) 太阳神官被动：对亡灵生物增伤 +25%
        const isUndead = target.matches && (
            target.matches({ families: ["undead"] }) ||
            target.matches({ families: ["zombie"] }) ||
            target.matches({ families: ["skeleton"] })
        );
        if (isUndead && options.isUndeadBonus) {
            baseDmg *= options.undeadMultiplier || 1.25;
        }

        // (3) 破甲状态 (armor_break): 承伤提高 15%~20%
        if (StatusEffectManager.hasStatus(target, "armor_break")) {
            baseDmg *= 1.2;
        }

        // (4) 武器大师大师格挡 (guard): 首次受击减伤 80% 并反击
        if (StatusEffectManager.hasStatus(target, "guard")) {
            baseDmg *= 0.2;
            StatusEffectManager.removeStatus(target, "guard");
            Utils.playSound(target, "item.shield.block", 1.2, 1.0);
            
            // 对攻击者反击 14 PvE / 7 PvP
            if (attacker && Utils.isValid(attacker)) {
                const dist = Math.hypot(attacker.location.x - target.location.x, attacker.location.z - target.location.z);
                if (dist <= 4.0) {
                    try {
                        attacker.applyDamage(isPvP ? 7 : 14, { damagingEntity: target, cause: "entityAttack" });
                        Utils.playSound(attacker, "random.break", 1.5, 1.0);
                    } catch {}
                }
            }
        }

        // (5) 受击唤醒睡眠状态 (sleep)
        if (StatusEffectManager.hasStatus(target, "sleep")) {
            StatusEffectManager.removeStatus(target, "sleep");
        }

        // 3. 执行最终伤害注入
        const finalDamage = Math.max(1, Math.round(baseDmg));
        try {
            if (attacker && Utils.isValid(attacker)) {
                target.applyDamage(finalDamage, { damagingEntity: attacker, cause: options.cause || "entityAttack" });
            } else {
                target.applyDamage(finalDamage);
            }
        } catch {
            try { target.applyDamage(finalDamage); } catch {}
        }

        return finalDamage;
    }
}
