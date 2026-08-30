import { system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { DamageResolver } from "./lotm_damage_resolver.js";
import { StatusEffectManager } from "./lotm_status_manager.js";

/**
 * 序列 9/8 的共用施法层。普通空手右键为序列 9 基础能力，潜行右键为序列 8 解锁能力。
 * 序列 7 仍由各途径独立模块处理，避免削弱已有完整技能组。
 */
export class PathwayLowSequence {
    static cooldowns = new Map();

    static use(player, pathway, sequence, isSneaking, lotmManager) {
        if (sequence !== 8 && sequence !== 9) return false;
        if (isSneaking && sequence === 9) {
            Utils.tell(player, "§7潜行能力将在完全消化魔药并晋升序列 8 后解锁。");
            Utils.sound.warn(player);
            return true;
        }

        const abilityId = `${pathway}:${isSneaking ? "secondary" : "primary"}`;
        const cooldownSeconds = isSneaking ? 10 : 4;
        if (!this.beginCooldown(player, abilityId, cooldownSeconds)) return true;

        const succeeded = isSneaking
            ? this.useSequence8(player, pathway, lotmManager)
            : this.useSequence9(player, pathway, lotmManager);
        if (!succeeded) this.cooldowns.delete(`${player.id}:${abilityId}`);
        return true;
    }

    static beginCooldown(player, abilityId, seconds) {
        const key = `${player.id}:${abilityId}`;
        const now = system.currentTick;
        const expires = this.cooldowns.get(key) || 0;
        if (expires > now) {
            Utils.actionbar(player, `§c能力冷却中：${Math.ceil((expires - now) / 20)} 秒`);
            return false;
        }
        this.cooldowns.set(key, now + seconds * 20);
        return true;
    }

    static useSequence9(player, pathway, lotmManager) {
        const costs = { seer: 12, hunter: 16, warrior: 12, darkness: 12, sun: 15, moon: 14, assassin: 16 };
        if (!lotmManager.modifySpirituality(player, -(costs[pathway] || 12))) return false;

        const ray = () => TargetingService.getRayTarget(player, 10).entity;
        let target;
        switch (pathway) {
            case "seer":
                player.addEffect("night_vision", 200, { amplifier: 0, showParticles: false });
                player.addEffect("resistance", 60, { amplifier: 0, showParticles: false });
                Utils.actionbar(player, "§9👁 [灵性直觉] 10 秒灵视，短暂抵御危险");
                break;
            case "hunter":
                target = ray();
                if (target) {
                    DamageResolver.applyDamage(player, target, { pveDamage: 12, pvpDamage: 6, cause: "entityAttack" });
                    try { target.addEffect("weakness", 80, { amplifier: 0, showParticles: true }); } catch {}
                }
                player.addEffect("speed", 80, { amplifier: 0, showParticles: false });
                Utils.actionbar(player, "§2🏹 [猎杀标记] 追踪并削弱准星目标");
                break;
            case "warrior":
                target = TargetingService.getRayTarget(player, 4).entity;
                if (target) DamageResolver.applyDamage(player, target, { pveDamage: 16, pvpDamage: 8, cause: "entityAttack" });
                player.addEffect("strength", 60, { amplifier: 0, showParticles: false });
                Utils.actionbar(player, "§6⚔ [沉重打击] 强化近身一击");
                break;
            case "darkness":
                player.addEffect("night_vision", 400, { amplifier: 0, showParticles: false });
                player.addEffect("speed", 100, { amplifier: 0, showParticles: false });
                Utils.actionbar(player, "§9🌙 [不眠守夜] 黑暗中保持清醒与敏锐");
                break;
            case "sun":
                this.heal(player, 4);
                player.addEffect("strength", 100, { amplifier: 0, showParticles: false });
                Utils.actionbar(player, "§e♫ [勇气赞歌] 恢复 4 HP 并鼓舞战意");
                break;
            case "moon":
                this.heal(player, 4);
                try { player.removeEffect("poison"); } catch {}
                try { player.removeEffect("nausea"); } catch {}
                Utils.actionbar(player, "§a⚗ [药师调理] 恢复 4 HP 并祛除中毒");
                break;
            case "assassin":
                target = TargetingService.getRayTarget(player, 5).entity;
                if (target) DamageResolver.applyDamage(player, target, { pveDamage: 18, pvpDamage: 9, cause: "entityAttack" });
                player.addEffect("speed", 80, { amplifier: 1, showParticles: false });
                Utils.actionbar(player, "§8🗡 [暗影刺杀] 快速突袭近距离目标");
                break;
            default:
                return false;
        }
        lotmManager.addDigestion(player, 1);
        Utils.playSound(player, "random.orb", 1.3, 0.8);
        return true;
    }

    static useSequence8(player, pathway, lotmManager) {
        const costs = { seer: 28, hunter: 32, warrior: 28, darkness: 32, sun: 30, moon: 30, assassin: 34 };
        if (!lotmManager.modifySpirituality(player, -(costs[pathway] || 30))) return false;

        let targets;
        let target;
        switch (pathway) {
            case "seer":
                player.addEffect("speed", 160, { amplifier: 1, showParticles: false });
                player.addEffect("jump_boost", 160, { amplifier: 1, showParticles: false });
                player.addEffect("resistance", 40, { amplifier: 1, showParticles: false });
                Utils.actionbar(player, "§c🎭 [小丑翻滚] 8 秒机动，2 秒强化闪避");
                break;
            case "hunter":
                targets = TargetingService.getConeTargets(player, 8, 90, 6);
                for (const entity of targets) {
                    DamageResolver.applyDamage(player, entity, { pveDamage: 8, pvpDamage: 4, cause: "magic" });
                    try { entity.addEffect("weakness", 100, { amplifier: 0, showParticles: true }); } catch {}
                }
                Utils.actionbar(player, "§c🗯 [挑衅] 扰乱前方目标并削弱其攻击");
                break;
            case "warrior":
                targets = TargetingService.getConeTargets(player, 4, 110, 5);
                for (const entity of targets) DamageResolver.applyDamage(player, entity, { pveDamage: 18, pvpDamage: 9, cause: "entityAttack" });
                StatusEffectManager.applyStatus(player, "guard", 20, 0.45, player);
                Utils.actionbar(player, "§6🥊 [格斗连击] 横扫近敌并进入格挡架势");
                break;
            case "darkness":
                targets = TargetingService.getConeTargets(player, 10, 80, 6);
                for (const entity of targets) StatusEffectManager.applyStatus(entity, "drowsy", entity.typeId === "minecraft:player" ? 25 : 80, 0.35, player);
                Utils.actionbar(player, "§9♪ [午夜诗篇] 令前方生灵陷入困倦");
                break;
            case "sun":
                target = TargetingService.getRayTarget(player, 18).entity;
                if (target) DamageResolver.applyDamage(player, target, { pveDamage: 22, pvpDamage: 10, isUndeadBonus: true, cause: "magic" });
                this.heal(player, 2);
                Utils.actionbar(player, "§e☀ [祈光] 圣光打击目标并治疗自身");
                break;
            case "moon":
                targets = TargetingService.getConeTargets(player, 10, 80, 6);
                for (const entity of targets) {
                    try { entity.addEffect("slowness", 120, { amplifier: 1, showParticles: true }); } catch {}
                    try { entity.addEffect("weakness", 120, { amplifier: 0, showParticles: true }); } catch {}
                }
                Utils.actionbar(player, "§a🐾 [驯兽威慑] 压制前方生灵的行动与攻击");
                break;
            case "assassin":
                target = TargetingService.getRayTarget(player, 12).entity;
                if (target) {
                    StatusEffectManager.applyStatus(target, "fear", target.typeId === "minecraft:player" ? 24 : 80, 0.4, player);
                    try { target.addEffect("weakness", 100, { amplifier: 1, showParticles: true }); } catch {}
                }
                player.addEffect("invisibility", 60, { amplifier: 0, showParticles: false });
                Utils.actionbar(player, "§d🕯 [教唆低语] 恐吓目标并隐匿身形");
                break;
            default:
                return false;
        }
        lotmManager.addDigestion(player, 2);
        Utils.playSound(player, "random.levelup", 1.1, 0.8);
        return true;
    }

    static heal(entity, amount) {
        try {
            const health = entity.getComponent("health");
            if (health) health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + amount));
        } catch {}
    }
}
