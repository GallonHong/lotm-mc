import { world, system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { DamageResolver } from "./lotm_damage_resolver.js";
import { StatusEffectManager } from "./lotm_status_manager.js";

/**
 * 刺客途径 · 序列 7 女巫 (Witch)
 * PRD 5.6 节实现：黑曜镜杖、黑焰禁疗、镜面替身、诅咒娃娃
 */
export class PathwayAssassin {
    /**
     * 主技能：【黑焰 (Black Flame)】 (普通右键)
     */
    static castBlackFlame(player, lotmManager) {
        if (!lotmManager.modifySpirituality(player, -35)) return;

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();
        const maxDist = 24;

        Utils.playSound(player, "fire.ignite", 1.8, 0.7);
        Utils.playSound(player, "mob.wither.shoot", 1.2, 1.0);
        lotmManager.addDigestion(player, 2);

        const { entity, hitDist, hitLoc } = TargetingService.getRayTarget(player, maxDist);

        if (entity) {
            DamageResolver.applyDamage(player, entity, {
                pveDamage: 22,
                pvpDamage: 11,
                isFireDamage: true,
                cause: "magic",
            });
            // 施加 5 秒禁疗 (heal_block)
            StatusEffectManager.applyStatus(entity, "heal_block", 100, 0.4, player);
            StatusEffectManager.applyStatus(entity, "burning", 100, 1, player);
            Utils.playSound(entity, "random.break", 1.8, 1.0);
        }

        // 绘制幽邃黑焰弹道 (0.15s 瞬逝烟尘微粒)
        const maxDraw = Math.max(1.0, hitDist);
        for (let d = 0.5; d < maxDraw; d += 0.7) {
            try {
                dim.spawnParticle("minecraft:smoke_particle", {
                    x: headLoc.x + viewDir.x * d,
                    y: headLoc.y + viewDir.y * d,
                    z: headLoc.z + viewDir.z * d,
                });
            } catch {}
        }

        if (hitLoc) {
            try { dim.spawnParticle("minecraft:large_explosion", hitLoc); } catch {}
        }

        Utils.actionbar(player, "§d🖤 [黑焰] 阴冷幽邃黑焰轰击，禁锢目标生机！");
    }

    /**
     * 副技能：【镜面替身 (Mirror Substitute)】 (潜行右键)
     */
    static performMirrorSubstitute(player, lotmManager) {
        if (!lotmManager.modifySpirituality(player, -65)) return;

        const dim = player.dimension;
        const oldLoc = { ...player.location };
        const safeLoc = TargetingService.getSafeLandingLocation(player, 7);

        Utils.playSound(player, "random.glass", 1.5, 1.0);
        Utils.playSound(player, "mob.endermen.portal", 1.8, 1.0);
        lotmManager.addDigestion(player, 3);

        // 原地留下破碎镜面烟雾
        try {
            dim.spawnParticle("minecraft:smoke_particle", oldLoc);
            dim.spawnParticle("minecraft:crit", oldLoc);
        } catch {}

        // 本体瞬移至 7 格安全点并赋予 3 秒 (60 tick) 隐形
        try {
            player.teleport(safeLoc, { dimension: dim });
            player.addEffect("invisibility", 60, { amplifier: 0, showParticles: false });
            player.addEffect("speed", 60, { amplifier: 1, showParticles: false });
        } catch {}

        Utils.actionbar(player, "§d🪞 [镜面替身] 镜光碎裂，进入 3 秒完全隐形！");
    }

    /**
     * 消耗品：【诅咒娃娃 (Curse Doll)】
     */
    static useCurseDoll(player, lotmManager) {
        if (Utils.countItem(player, "lotm:curse_doll") <= 0) {
            Utils.tell(player, "§c背包中没有【诅咒娃娃】！");
            Utils.sound.fail(player);
            return;
        }

        const { entity } = TargetingService.getRayTarget(player, 16);
        if (!entity) {
            Utils.tell(player, "§c准星未锁定 16 格内目标，无法施加娃娃诅咒！");
            return;
        }

        if (!lotmManager.modifySpirituality(player, -50)) return;
        Utils.removeItem(player, "lotm:curse_doll", 1);

        Utils.playSound(player, "mob.witch.throw", 1.5, 1.0);
        Utils.playSound(player, "mob.witch.ambient", 1.2, 0.9);
        lotmManager.addDigestion(player, 2);

        // 施加 8 秒 (160 tick) 虚弱、迟缓与破甲
        StatusEffectManager.applyStatus(entity, "armor_break", 160, 0.2, player);
        StatusEffectManager.applyStatus(entity, "drowsy", 160, 1, player);

        Utils.tell(player, "§d🪡 [诅咒娃娃] 针扎血偶，目标受到沉重诅咒与虚弱！");
    }
}
