import { world, system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { DamageResolver } from "./lotm_damage_resolver.js";

/**
 * 占卜家途径 · 序列 7 魔术师 (Magician)
 * PRD 5.0 基准实现
 */
export class PathwaySeer {
    static spiritVisionActive = new Map();

    /**
     * 主技能：【空气弹 (Air Bullet)】 (普通右键)
     */
    static fireAirBullet(player, lotmManager) {
        if (!lotmManager.modifySpirituality(player, -30)) return;

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        Utils.playSound(player, "random.explode", 1.8, 1.0);
        Utils.playSound(player, "firework.launch", 1.5, 0.9);
        lotmManager.addDigestion(player, 2);

        // 抬手/枪口处空气高压激波爆鸣
        const muzzleLoc = {
            x: headLoc.x + viewDir.x * 1.0,
            y: headLoc.y + viewDir.y * 1.0 - 0.1,
            z: headLoc.z + viewDir.z * 1.0,
        };
        try {
            dim.spawnParticle("minecraft:sonic_explosion", muzzleLoc);
        } catch {}

        const { entity, hitLoc } = TargetingService.getRayTarget(player, 35);

        if (entity) {
            DamageResolver.applyDamage(player, entity, {
                pveDamage: 35,
                pvpDamage: 18,
                cause: "entityAttack",
            });

            try {
                if (typeof entity.applyKnockback === "function") {
                    try { entity.applyKnockback({ x: viewDir.x, y: 0.3, z: viewDir.z }, 3.0); }
                    catch { entity.applyKnockback(viewDir.x, viewDir.z, 3.0, 0.5); }
                }
            } catch {}
        }

        // 终点落点高压空气爆破 (无形弹道，落点处产生空气团爆炸)
        const impactLoc = hitLoc || {
            x: headLoc.x + viewDir.x * 25,
            y: headLoc.y + viewDir.y * 25,
            z: headLoc.z + viewDir.z * 25,
        };
        try {
            dim.spawnParticle("minecraft:large_explosion", impactLoc);
        } catch {}

        Utils.actionbar(player, "§b💨 [空气弹] 响指轻弹，无形空气炮轰出！");
    }

    /**
     * 副技能：【火焰跳跃 (Flame Jump)】 (潜行右键)
     */
    static performFlameJump(player, lotmManager) {
        if (!lotmManager.modifySpirituality(player, -45)) return;

        const dim = player.dimension;
        const startLoc = { ...player.location };
        const finalLoc = TargetingService.getSafeLandingLocation(player, 20);

        // 起点火光
        try {
            dim.spawnParticle("minecraft:flame_particle", startLoc);
            dim.spawnParticle("minecraft:large_explosion", startLoc);
        } catch {}
        Utils.playSound(player, "fire.ignite", 1.2, 1.0);
        Utils.playSound(player, "mob.endermen.portal", 1.5, 1.0);

        // 传送
        try {
            player.teleport(finalLoc, { dimension: dim });
        } catch {
            try { player.teleport(finalLoc); } catch {}
        }

        // 终点火光与生成真实火焰
        try {
            dim.spawnParticle("minecraft:flame_particle", finalLoc);
            dim.spawnParticle("minecraft:large_explosion", finalLoc);
        } catch {}
        Utils.playSound(player, "fire.ignite", 1.5, 1.0);
        Utils.playSound(player, "mob.endermen.portal", 1.8, 1.0);

        try {
            const block = dim.getBlock({
                x: Math.floor(finalLoc.x),
                y: Math.floor(finalLoc.y),
                z: Math.floor(finalLoc.z),
            });
            if (block && block.isAir) {
                try { block.setType("minecraft:fire"); } catch {
                    try { dim.runCommand(`setblock ${Math.floor(finalLoc.x)} ${Math.floor(finalLoc.y)} ${Math.floor(finalLoc.z)} fire keep`); } catch {}
                }
            }
        } catch {}

        // 点燃周围敌人
        const nearby = TargetingService.getAreaTargets(player, finalLoc, 2.5, 8);
        for (const ent of nearby) {
            try {
                if (typeof ent.setOnFire === "function") ent.setOnFire(5, true);
            } catch {}
        }

        lotmManager.addDigestion(player, 3);
        Utils.actionbar(player, "§6🔥 [火焰跳跃] 火光冲天，引燃落点烈焰！");
    }

    /**
     * 消耗品：【魔术纸牌飞掷 (Tarot Card Throw)】
     */
    static throwTarotCard(player, lotmManager) {
        if (Utils.countItem(player, "lotm:tarot_card") <= 0) {
            Utils.tell(player, "§c背包中没有【魔术纸牌】媒介，无法掷出！");
            Utils.sound.fail(player);
            return;
        }

        if (!lotmManager.modifySpirituality(player, -15)) return;
        Utils.removeItem(player, "lotm:tarot_card", 1);

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        Utils.playSound(player, "random.bow", 2.0, 1.0);
        Utils.playSound(player, "random.pop", 1.8, 1.0);
        lotmManager.addDigestion(player, 1);

        const { entity, hitDist, hitLoc } = TargetingService.getRayTarget(player, 32);

        if (entity) {
            DamageResolver.applyDamage(player, entity, {
                pveDamage: 22,
                pvpDamage: 12,
                cause: "entityAttack",
            });
            Utils.playSound(player, "random.anvil_land", 2.0, 0.7);
            Utils.playSound(player, "random.break", 1.8, 1.0);
        }

        // 0.15 秒瞬逝微粒流
        const maxDraw = Math.max(1.0, hitDist);
        for (let d = 0.5; d < maxDraw; d += 0.5) {
            try {
                dim.spawnParticle("minecraft:crit", {
                    x: headLoc.x + viewDir.x * d,
                    y: headLoc.y + viewDir.y * d,
                    z: headLoc.z + viewDir.z * d,
                });
            } catch {}
        }

        if (hitLoc) {
            try { dim.spawnParticle("minecraft:crit", hitLoc); } catch {}
        }

        Utils.actionbar(player, "§e🃏 [魔术纸牌] 破空飞掷！");
    }

    /**
     * 自动触发：【纸人替身 (Paper Figurine)】
     */
    static triggerPaperSubstitute(player, lotmManager) {
        if (Utils.countItem(player, "lotm:paper_figurine") <= 0) return false;
        if (!lotmManager.modifySpirituality(player, -40)) return false;

        Utils.removeItem(player, "lotm:paper_figurine", 1);
        const dim = player.dimension;
        const oldLoc = { ...player.location };

        try {
            dim.spawnParticle("minecraft:flame_particle", oldLoc);
            dim.spawnParticle("minecraft:smoke_particle", oldLoc);
            dim.spawnParticle("minecraft:large_explosion", oldLoc);
        } catch {}
        Utils.playSound(player, "random.totem", 1.2, 1.0);

        // 随机小位移 4 格脱离险境
        const offsetAngle = Math.random() * Math.PI * 2;
        const safeLoc = {
            x: oldLoc.x + Math.cos(offsetAngle) * 4,
            y: oldLoc.y + 0.2,
            z: oldLoc.z + Math.sin(offsetAngle) * 4,
        };
        try { player.teleport(safeLoc, { dimension: dim }); } catch {}

        lotmManager.addDigestion(player, 3);
        Utils.tell(player, "§c§l[替身生效] §e符咒纸人自燃替死！你已金蝉脱壳！");
        return true;
    }
}
