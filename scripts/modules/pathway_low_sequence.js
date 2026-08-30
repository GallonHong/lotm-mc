import { system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { DamageResolver } from "./lotm_damage_resolver.js";
import { StatusEffectManager } from "./lotm_status_manager.js";

/**
 * 序列 9/8 的共用施法层。普通右键与潜行右键均按当前序列解析；晋升后继承被动，主动槽切换为新序列能力。
 * 序列 7 仍由各途径独立模块处理，避免削弱已有完整技能组。
 */
export class PathwayLowSequence {
    static cooldowns = new Map();

    static use(player, pathway, sequence, isSneaking, lotmManager) {
        if (sequence !== 8 && sequence !== 9) return false;
        const batchAPathways = ["hunter", "warrior", "sun", "tyrant"];
        if (isSneaking && sequence === 9 && !batchAPathways.includes(pathway)) {
            Utils.tell(player, "§7潜行能力将在完全消化魔药并晋升序列 8 后解锁。");
            Utils.sound.warn(player);
            return true;
        }

        const abilityId = `${pathway}:${sequence}:${isSneaking ? "secondary" : "primary"}`;
        const cooldownSeconds = this.getCooldownSeconds(pathway, sequence, isSneaking);
        if (!this.beginCooldown(player, abilityId, cooldownSeconds)) return true;

        let succeeded;
        if (sequence === 9) {
            succeeded = isSneaking
                ? this.useSequence9Secondary(player, pathway, lotmManager)
                : this.useSequence9(player, pathway, lotmManager);
        } else {
            succeeded = isSneaking
                ? this.useSequence8(player, pathway, lotmManager)
                : this.useSequence8Primary(player, pathway, lotmManager);
        }
        if (!succeeded) this.cooldowns.delete(`${player.id}:${abilityId}`);
        return true;
    }

    static getCooldownSeconds(pathway, sequence, isSneaking) {
        if (pathway === "tyrant") return sequence === 9 ? (isSneaking ? 8 : 3) : (isSneaking ? 14 : 3);
        if (pathway === "hunter") return sequence === 9 ? (isSneaking ? 10 : 5) : (isSneaking ? 14 : 5);
        if (pathway === "warrior") return sequence === 9 ? (isSneaking ? 9 : 3) : (isSneaking ? 12 : 3);
        if (pathway === "sun") return sequence === 9 ? (isSneaking ? 15 : 6) : (isSneaking ? 12 : 3);
        return isSneaking ? 10 : 4;
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
        const costs = { seer: 12, hunter: 15, warrior: 15, darkness: 12, sun: 20, moon: 14, assassin: 16, tyrant: 20 };
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
                target = TargetingService.getRayTarget(player, 18).entity;
                if (target) {
                    StatusEffectManager.applyStatus(target, "marked", 500, 1, player);
                }
                player.addEffect("speed", 80, { amplifier: 0, showParticles: false });
                Utils.actionbar(player, target ? "§2🏹 [猎物标记] 已锁定准星目标25秒" : "§7[猎物标记] 准星方向没有可标记目标");
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
                for (const ally of [player, ...TargetingService.getAreaTargets(player, player.location, 6, 8).filter(entity => entity.typeId === "minecraft:player")]) {
                    try { ally.addEffect("strength", 160, { amplifier: 0, showParticles: false }); } catch {}
                }
                Utils.actionbar(player, "§e♫ [力量赞歌] 6格友军获得8秒力量增益");
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
            case "tyrant":
                target = TargetingService.getRayTarget(player, 5).entity;
                if (target) {
                    DamageResolver.applyDamage(player, target, {
                        pveDamage: this.isWet(player) ? 24 : 20,
                        pvpDamage: this.isWet(player) ? 11 : 10,
                        cause: "entityAttack",
                    });
                }
                Utils.actionbar(player, `§3⚔ [破浪斩] ${this.isWet(player) ? "水中威力增强" : "弯刀斩击"}`);
                break;
            default:
                return false;
        }
        lotmManager.addDigestion(player, 1);
        Utils.playSound(player, "random.orb", 1.3, 0.8);
        return true;
    }

    static useSequence9Secondary(player, pathway, lotmManager) {
        const costs = { hunter: 25, warrior: 25, sun: 45, tyrant: 25 };
        if (!costs[pathway]) return false;
        if (!lotmManager.modifySpirituality(player, -costs[pathway])) return false;

        switch (pathway) {
            case "hunter": {
                const signs = TargetingService.getAreaTargets(player, player.location, 20, 8).length;
                player.addEffect("night_vision", 160, { amplifier: 0, showParticles: false });
                Utils.actionbar(player, `§2👁 [环境勘察] 20格内发现 ${signs} 个活动迹象`);
                break;
            }
            case "warrior":
                player.addEffect("resistance", 80, { amplifier: 0, showParticles: false });
                player.addEffect("slowness", 80, { amplifier: 0, showParticles: false });
                Utils.actionbar(player, "§6🛡 [稳固架势] 4秒减伤并强化击退抗性");
                break;
            case "sun":
                for (const ally of [player, ...TargetingService.getAreaTargets(player, player.location, 10, 8).filter(entity => entity.typeId === "minecraft:player")]) {
                    try { ally.addEffect("strength", 120, { amplifier: 0, showParticles: false }); } catch {}
                }
                Utils.actionbar(player, "§e♫ [高声合唱] 10格友军获得群体赞歌");
                break;
            case "tyrant": {
                const distance = this.isWet(player) ? 8 : 3;
                const landing = TargetingService.getSafeLandingLocation(player, distance);
                try { player.teleport(landing, { dimension: player.dimension }); } catch {}
                Utils.actionbar(player, `§b🌊 [潜水突进] ${this.isWet(player) ? "水中突进8格" : "陆地短冲3格"}`);
                break;
            }
        }
        lotmManager.addDigestion(player, 1);
        Utils.playSound(player, "random.orb", 1.15, 0.8);
        return true;
    }

    static useSequence8Primary(player, pathway, lotmManager) {
        const costs = { hunter: 25, warrior: 20, sun: 25, tyrant: 30 };
        if (!costs[pathway]) return this.useSequence9(player, pathway, lotmManager);
        if (!lotmManager.modifySpirituality(player, -costs[pathway])) return false;
        let target;
        switch (pathway) {
            case "hunter":
                target = TargetingService.getRayTarget(player, 12).entity;
                if (target) {
                    StatusEffectManager.applyStatus(target, "provoked", target.typeId === "minecraft:player" ? 60 : 120, 1, player);
                    if (target.typeId !== "minecraft:player") {
                        DamageResolver.applyDamage(player, target, { pveDamage: 1, pvpDamage: 0, cause: "entityAttack" });
                    }
                }
                Utils.actionbar(player, target ? "§c🗯 [挑衅] 目标已被激怒并暴露破绽" : "§7[挑衅] 准星方向没有目标");
                break;
            case "warrior":
                target = TargetingService.getRayTarget(player, 4).entity;
                if (target) DamageResolver.applyDamage(player, target, { pveDamage: 22, pvpDamage: 10, cause: "entityAttack" });
                Utils.actionbar(player, "§6🥊 [突进拳] 近身爆发重击");
                break;
            case "sun":
                target = TargetingService.getRayTarget(player, 18).entity;
                if (target) DamageResolver.applyDamage(player, target, { pveDamage: 16, pvpDamage: 8, isUndeadBonus: true, cause: "magic" });
                Utils.actionbar(player, "§e☀ [阳光] 圣光打击准星目标，对亡灵强化");
                break;
            case "tyrant":
                target = TargetingService.getRayTarget(player, 5).entity;
                if (target) {
                    DamageResolver.applyDamage(player, target, { pveDamage: 26, pvpDamage: 13, cause: "entityAttack" });
                    try {
                        const health = player.getComponent("health");
                        if (health && health.currentValue < health.effectiveMax * 0.5) {
                            const direction = player.getViewDirection();
                            try {
                                target.applyKnockback({ x: direction.x, y: 0.2, z: direction.z }, 2.2);
                            } catch {
                                try { target.applyKnockback(direction.x, direction.z, 2.2, 0.3); } catch {}
                            }
                        }
                    } catch {}
                }
                Utils.actionbar(player, "§9⚡ [怒击] 低生命时击退显著增强");
                break;
        }
        lotmManager.addDigestion(player, 2);
        Utils.playSound(player, "random.levelup", 1.1, 0.8);
        return true;
    }

    static useSequence8(player, pathway, lotmManager) {
        const costs = { seer: 28, hunter: 50, warrior: 40, darkness: 32, sun: 45, moon: 30, assassin: 34, tyrant: 45 };
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
                    StatusEffectManager.applyStatus(entity, "provoked", entity.typeId === "minecraft:player" ? 60 : 120, 1, player);
                    if (entity.typeId !== "minecraft:player") {
                        DamageResolver.applyDamage(player, entity, { pveDamage: 1, pvpDamage: 0, cause: "entityAttack" });
                    }
                    try { entity.addEffect("weakness", 100, { amplifier: 0, showParticles: true }); } catch {}
                }
                Utils.actionbar(player, "§c🗯 [挑衅] 扰乱前方目标并削弱其攻击");
                break;
            case "warrior":
                player.addEffect("resistance", 120, { amplifier: 1, showParticles: false });
                Utils.actionbar(player, "§6🛡 [钢铁身躯] 6秒强化物理防御与抗控制");
                break;
            case "darkness":
                targets = TargetingService.getConeTargets(player, 10, 80, 6);
                for (const entity of targets) StatusEffectManager.applyStatus(entity, "drowsy", entity.typeId === "minecraft:player" ? 25 : 80, 0.35, player);
                Utils.actionbar(player, "§9♪ [午夜诗篇] 令前方生灵陷入困倦");
                break;
            case "sun":
                for (const ally of [player, ...TargetingService.getAreaTargets(player, player.location, 6, 8).filter(entity => entity.typeId === "minecraft:player")]) {
                    try { ally.addEffect("fire_resistance", 160, { amplifier: 0, showParticles: false }); } catch {}
                    try { ally.addEffect("resistance", 160, { amplifier: 0, showParticles: false }); } catch {}
                }
                Utils.actionbar(player, "§e🛡 [祝福] 6格友军获得8秒邪异与元素抗性");
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
            case "tyrant":
                player.addEffect("strength", 120, { amplifier: 0, showParticles: false });
                player.addEffect("speed", 120, { amplifier: 0, showParticles: false });
                Utils.setProp(player, "lotm:tyrant_rage_until", system.currentTick + 120);
                Utils.actionbar(player, "§9⚡ [暴怒] 6秒攻击与移速提高，但受到伤害增加");
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

    static isWet(player) {
        try {
            if (player.isInWater) return true;
            const location = player.location;
            return !!player.dimension.getBlock({
                x: Math.floor(location.x),
                y: Math.floor(location.y),
                z: Math.floor(location.z),
            })?.typeId?.includes("water");
        } catch {
            return false;
        }
    }
}
