import { system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { DamageResolver } from "./lotm_damage_resolver.js";

/** 暴君途径 · 序列7 航海家：水之长矛与潮汐冲击。 */
export class PathwayTyrant {
    static cooldowns = new Map();

    static isWet(player) {
        try {
            if (player.isInWater) return true;
            const location = player.location;
            const block = player.dimension.getBlock({
                x: Math.floor(location.x),
                y: Math.floor(location.y),
                z: Math.floor(location.z),
            });
            return !!block?.typeId?.includes("water");
        } catch {
            return false;
        }
    }

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

    static waterSpear(player, lotmManager) {
        if (!this.beginCooldown(player, "water_spear", 50)) return;
        const wet = this.isWet(player);
        const cost = wet ? 32 : 48;
        if (!lotmManager.modifySpirituality(player, -cost)) {
            this.cooldowns.delete(`${player.id}:water_spear`);
            return;
        }

        const { entity, hitDist } = TargetingService.getRayTarget(player, 28);
        if (entity) {
            DamageResolver.applyDamage(player, entity, {
                pveDamage: 28,
                pvpDamage: 14,
                cause: "magic",
                isRanged: true,
            });
        }

        const head = player.getHeadLocation();
        const direction = player.getViewDirection();
        const drawDistance = Math.max(1, hitDist || 28);
        for (let distance = 0.5; distance < drawDistance; distance += 0.8) {
            try {
                player.dimension.spawnParticle("minecraft:water_splash_particle", {
                    x: head.x + direction.x * distance,
                    y: head.y + direction.y * distance,
                    z: head.z + direction.z * distance,
                });
            } catch {}
        }

        lotmManager.addDigestion(player, 2);
        Utils.playSound(player, "random.splash", 1.3, 1.0);
        Utils.actionbar(player, `§b🌊 [水之长矛] ${wet ? "水域共鸣，灵性消耗降低" : "干燥环境，灵性消耗提高"}`);
    }

    static tidalImpact(player, lotmManager) {
        if (!this.beginCooldown(player, "tidal_impact", 160)) return;
        if (!lotmManager.modifySpirituality(player, -60)) {
            this.cooldowns.delete(`${player.id}:tidal_impact`);
            return;
        }

        const direction = player.getViewDirection();
        const targets = TargetingService.getConeTargets(player, 7, 100, 8);
        for (const target of targets) {
            DamageResolver.applyDamage(player, target, {
                pveDamage: 14,
                pvpDamage: 7,
                cause: "magic",
            });
            try {
                target.applyKnockback({ x: direction.x, y: 0.25, z: direction.z }, 2.4);
            } catch {
                try { target.applyKnockback(direction.x, direction.z, 2.4, 0.35); } catch {}
            }
        }

        const center = player.location;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            try {
                player.dimension.spawnParticle("minecraft:water_splash_particle", {
                    x: center.x + Math.cos(angle) * 2.5,
                    y: center.y + 0.8,
                    z: center.z + Math.sin(angle) * 2.5,
                });
            } catch {}
        }

        lotmManager.addDigestion(player, 3);
        Utils.playSound(player, "random.splash", 0.8, 1.4);
        Utils.actionbar(player, "§3🌊 [潮汐冲击] 巨浪横扫前方敌人！");
    }
}
