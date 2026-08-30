import { world, system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { StatusEffectManager } from "./lotm_status_manager.js";

/**
 * 不眠者途径 · 序列 7 梦魇 (Nightmare)
 * PRD 5.3 节实现：午夜怀表、强制入梦、梦魇领域、梦境粉尘、夜之眷属
 */
export class PathwayDarkness {
    /**
     * 主技能：【强制入梦 (Force Sleep)】 (普通右键)
     */
    static forceSleep(player, lotmManager) {
        if (!lotmManager.modifySpirituality(player, -45)) return;

        const dim = player.dimension;
        Utils.playSound(player, "beacon.power", 1.8, 0.9);
        Utils.playSound(player, "mob.endermen.portal", 1.2, 1.0);
        lotmManager.addDigestion(player, 2);

        const { entity, hitLoc } = TargetingService.getRayTarget(player, 18);

        if (entity) {
            const isPvP = entity.typeId === "minecraft:player";
            if (isPvP) {
                StatusEffectManager.applyStatus(entity, "drowsy", 30, 1, player); // 1.5 秒困倦
                Utils.tell(entity, "§9👁️ [梦魇侵袭] 怀表滴答作响，你陷入了强烈的困倦与迟滞！");
            } else {
                StatusEffectManager.applyStatus(entity, "sleep", 120, 1, player); // 6 秒深度睡眠 (受伤即醒)
            }
            Utils.playSound(entity, "random.orb", 1.2, 1.0);
            try {
                dim.spawnParticle("minecraft:crit", entity.location);
            } catch {}
        }

        Utils.actionbar(player, "§9👁️ [强制入梦] 怀表指针微转，目标意志陷入沉眠！");
    }

    /**
     * 副技能：【梦魇领域 (Nightmare Domain)】 (潜行右键)
     */
    static triggerNightmareDomain(player, lotmManager) {
        if (!lotmManager.modifySpirituality(player, -80)) return;

        const dim = player.dimension;
        const pLoc = player.location;

        Utils.playSound(player, "mob.endermen.portal", 1.0, 1.0);
        Utils.playSound(player, "beacon.deactivate", 1.5, 0.8);
        lotmManager.addDigestion(player, 3);

        let elapsedTicks = 0;
        const maxTicks = 120; // 6 秒

        const intervalId = system.runInterval(() => {
            elapsedTicks += 10;
            if (elapsedTicks > maxTicks || !Utils.isValid(player)) {
                system.clearRun(intervalId);
                return;
            }

            // 绘制 6 格幽夜旋涡微粒
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
                try {
                    dim.spawnParticle("minecraft:crit", {
                        x: player.location.x + Math.cos(a) * 6,
                        y: player.location.y + 0.2,
                        z: player.location.z + Math.sin(a) * 6,
                    });
                } catch {}
            }

            // 领域内敌人睡眠/困倦
            const targets = TargetingService.getAreaTargets(player, player.location, 6.0, 8);
            for (const t of targets) {
                const isPvP = t.typeId === "minecraft:player";
                if (isPvP) {
                    StatusEffectManager.applyStatus(t, "drowsy", 20, 1, player);
                } else {
                    StatusEffectManager.applyStatus(t, "sleep", 80, 1, player);
                }
            }
        }, 10);

        Utils.actionbar(player, "§9🌌 [梦魇领域] 方圆6格化作夜之幻梦！");
    }

    /**
     * 消耗品：【梦境粉尘 (Dream Dust)】
     */
    static throwDreamDust(player, lotmManager) {
        if (Utils.countItem(player, "lotm:dream_dust") <= 0) {
            Utils.tell(player, "§c背包中没有【梦境粉尘】！");
            Utils.sound.fail(player);
            return;
        }

        if (!lotmManager.modifySpirituality(player, -20)) return;
        Utils.removeItem(player, "lotm:dream_dust", 1);

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        Utils.playSound(player, "random.pop", 1.5, 1.0);
        lotmManager.addDigestion(player, 1);

        const { hitLoc } = TargetingService.getRayTarget(player, 16);
        const center = hitLoc || {
            x: headLoc.x + viewDir.x * 10,
            y: player.location.y,
            z: headLoc.z + viewDir.z * 10,
        };

        const targets = TargetingService.getAreaTargets(player, center, 3.0, 8);
        for (const t of targets) {
            StatusEffectManager.applyStatus(t, "drowsy", 80, 1, player); // 4 秒迟缓与虚弱
        }

        Utils.actionbar(player, "§9✨ [梦境粉尘] 荧光雾霭散落，敌群意志涣散！");
    }
}
