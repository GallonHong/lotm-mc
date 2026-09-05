import { world, system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { DamageResolver } from "./lotm_damage_resolver.js";
import { StatusEffectManager } from "./lotm_status_manager.js";

/**
 * 猎人途径 · 序列 7 纵火家 (Pyromaniac)
 * PRD 5.1 节实现：赤焰手套、火焰长枪、焰潮领域、炼金燃烧瓶
 */
export class PathwayHunter {
    static cooldowns = new Map();

    static beginCooldown(player, abilityId, ticks) {
        const key = `${player.id}:${abilityId}`;
        const now = system.currentTick;
        const expires = this.cooldowns.get(key) || 0;
        if (expires > now) {
            Utils.actionbar(player, `§c能力冷却中：${Math.ceil((expires - now) / 20)} 秒`);
            return false;
        }
        this.cooldowns.set(key, now + ticks);
        return true;
    }

    /**
     * 主技能：【火焰长枪 (Flame Spear)】 (普通右键)
     */
    static fireFlameSpear(player, lotmManager) {
        if (!this.beginCooldown(player, "flame_spear", 50)) return;
        if (!lotmManager.modifySpirituality(player, -35)) {
            this.cooldowns.delete(`${player.id}:flame_spear`);
            return;
        }

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();
        const maxDist = 28;

        Utils.playSound(player, "fire.ignite", 1.8, 1.0);
        Utils.playSound(player, "firework.launch", 1.6, 0.8);
        lotmManager.addDigestion(player, 2);

        const { entity, hitDist, hitLoc } = TargetingService.getRayTarget(player, maxDist);

        if (entity) {
            DamageResolver.applyDamage(player, entity, {
                pveDamage: 30,
                pvpDamage: 14,
                isFireDamage: true,
                cause: "entityAttack",
            });
            StatusEffectManager.applyStatus(entity, "burning", 80, 1, player); // 4 秒燃烧
            Utils.playSound(player, "random.explode", 1.5, 1.0);
        }

        // 绘制赤金炽烈火焰长枪流光 (0.15s 瞬逝微火花)
        const maxDraw = Math.max(1.0, hitDist);
        for (let d = 0.5; d < maxDraw; d += 0.8) {
            try {
                dim.spawnParticle("minecraft:flame_particle", {
                    x: headLoc.x + viewDir.x * d,
                    y: headLoc.y + viewDir.y * d,
                    z: headLoc.z + viewDir.z * d,
                });
            } catch {}
        }

        if (hitLoc) {
            try {
                dim.spawnParticle("minecraft:large_explosion", hitLoc);
                dim.spawnParticle("minecraft:flame_particle", hitLoc);
            } catch {}
        }

        Utils.actionbar(player, "§c🔱 [火焰长枪] 烈焰长矛贯穿破空！");
    }

    /** 新版22途径设计：潜行右键开启8秒火焰铠甲。 */
    static triggerFlameArmor(player, lotmManager) {
        if (!this.beginCooldown(player, "flame_armor", 320)) return;
        if (!lotmManager.modifySpirituality(player, -65)) {
            this.cooldowns.delete(`${player.id}:flame_armor`);
            return;
        }
        Utils.setProp(player, "lotm:hunter_fire_armor_until", system.currentTick + 160);
        player.addEffect("fire_resistance", 160, { amplifier: 0, showParticles: false });
        player.addEffect("resistance", 160, { amplifier: 0, showParticles: false });
        lotmManager.addDigestion(player, 3);
        Utils.playSound(player, "fire.ignite", 0.8, 1.2);
        Utils.actionbar(player, "§c🔥 [火焰铠甲] 8秒减伤，近身攻击者受到火焰反击");
    }

    /**
     * 副技能：【焰潮领域 (Flame Tide)】 (潜行右键)
     */
    static triggerFlameTide(player, lotmManager) {
        if (!lotmManager.modifySpirituality(player, -75)) return;

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        // 计算准星前方 8 格地面为中心
        const centerLoc = {
            x: headLoc.x + viewDir.x * 8,
            y: player.location.y,
            z: headLoc.z + viewDir.z * 8,
        };

        Utils.playSound(player, "mob.ghast.fireball", 1.2, 1.0);
        Utils.playSound(player, "fire.ignite", 1.5, 1.0);
        lotmManager.addDigestion(player, 3);

        let elapsedTicks = 0;
        const maxTicks = 100; // 5 秒持续

        const intervalId = system.runInterval(() => {
            elapsedTicks += 10;
            if (elapsedTicks > maxTicks || !Utils.isValid(player)) {
                system.clearRun(intervalId);
                return;
            }

            // 绘制火海边缘环状火焰粒子
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                try {
                    dim.spawnParticle("minecraft:flame_particle", {
                        x: centerLoc.x + Math.cos(angle) * 4.5,
                        y: centerLoc.y + 0.3,
                        z: centerLoc.z + Math.sin(angle) * 4.5,
                    });
                } catch {}
            }

            // 结算范围 4.5 格内敌人 (最多 8 目标)
            const targets = TargetingService.getAreaTargets(player, centerLoc, 4.5, 8);
            for (const target of targets) {
                DamageResolver.applyDamage(player, target, {
                    pveDamage: elapsedTicks === 10 ? 16 : 3,
                    pvpDamage: elapsedTicks === 10 ? 8 : 1,
                    isFireDamage: true,
                    cause: "fire",
                });
                StatusEffectManager.applyStatus(target, "burning", 60, 1, player);
            }
        }, 10);

        Utils.actionbar(player, "§c🌋 [焰潮领域] 4.5格烈焰火场爆发！");
    }

    /**
     * 消耗品：【炼金燃烧瓶 (Alchemical Molotov)】
     */
    static throwMolotov(player, lotmManager) {
        if (Utils.countItem(player, "lotm:alchemical_molotov") <= 0) {
            Utils.tell(player, "§c背包中没有【炼金燃烧瓶】！");
            Utils.sound.fail(player);
            return;
        }

        if (!lotmManager.modifySpirituality(player, -25)) return;
        Utils.removeItem(player, "lotm:alchemical_molotov", 1);

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();
        const maxDist = 20;

        Utils.playSound(player, "random.bow", 1.5, 1.0);
        lotmManager.addDigestion(player, 2);

        const { hitLoc } = TargetingService.getRayTarget(player, maxDist);
        const center = hitLoc || {
            x: headLoc.x + viewDir.x * 12,
            y: player.location.y,
            z: headLoc.z + viewDir.z * 12,
        };

        Utils.playSound(player, "random.glass", 1.2, 1.0);
        Utils.playSound(player, "fire.ignite", 1.5, 1.0);

        try {
            dim.spawnParticle("minecraft:large_explosion", center);
            dim.spawnParticle("minecraft:flame_particle", center);
        } catch {}

        // 3 格火区伤害
        const targets = TargetingService.getAreaTargets(player, center, 3.0, 8);
        for (const t of targets) {
            DamageResolver.applyDamage(player, t, {
                pveDamage: 12,
                pvpDamage: 6,
                isFireDamage: true,
            });
            StatusEffectManager.applyStatus(t, "burning", 80, 1, player);
        }

        Utils.actionbar(player, "§c🔥 [炼金燃烧瓶] 爆裂火油引燃大片区域！");
    }
}
