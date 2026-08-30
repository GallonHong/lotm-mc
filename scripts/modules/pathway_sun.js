import { world, system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { DamageResolver } from "./lotm_damage_resolver.js";
import { StatusEffectManager } from "./lotm_status_manager.js";

/**
 * 歌颂者途径 · 序列 7 太阳神官 (Sun Priest)
 * PRD 5.4 节实现：太阳圣徽、神圣之光、太阳光环、圣水瓶制作与投掷
 */
export class PathwaySun {
    /**
     * 主技能：【神圣之光 (Holy Light)】 (普通右键)
     */
    static castHolyLight(player, lotmManager) {
        const { entity } = TargetingService.getRayTarget(player, 24);

        if (!lotmManager.modifySpirituality(player, -35)) return;

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        Utils.playSound(player, "beacon.activate", 1.8, 1.0);
        lotmManager.addDigestion(player, 2);

        // 绘制纯金耀阳穿透光柱 (0.15s 瞬逝粒子)
        for (let d = 0.5; d < 24; d += 0.8) {
            try {
                dim.spawnParticle("minecraft:crit", {
                    x: headLoc.x + viewDir.x * d,
                    y: headLoc.y + viewDir.y * d,
                    z: headLoc.z + viewDir.z * d,
                });
            } catch {}
        }

        if (entity) {
            const isAlly = entity.typeId === "minecraft:player" && entity.id !== player.id;
            if (isAlly) {
                // 治疗友军 6 HP (3 颗心) 并清除负面状态
                try {
                    const hpComp = entity.getComponent("health");
                    if (hpComp) {
                        hpComp.setCurrentValue(Math.min(hpComp.effectiveMax, hpComp.currentValue + 6));
                    }
                } catch {}
                StatusEffectManager.removeStatus(entity, "drowsy");
                StatusEffectManager.removeStatus(entity, "fear");
                StatusEffectManager.removeStatus(entity, "burning");
                Utils.playSound(entity, "random.levelup", 1.5, 1.0);
                Utils.tell(entity, "§e☀️ [太阳净化] 纯净圣光笼罩，恢复 6 HP 并净化负面精神状态！");
            } else {
                // 伤害敌方 / 亡灵重创
                DamageResolver.applyDamage(player, entity, {
                    pveDamage: 34,
                    pvpDamage: 16,
                    isUndeadBonus: true,
                    cause: "magic",
                });
                Utils.playSound(player, "random.explode", 1.5, 1.0);
            }
        }

        Utils.actionbar(player, "§e☀️ [神圣之光] 炽烈圣光降临！");
    }

    /**
     * 副技能：【太阳光环 (Sun Halo)】 (潜行右键)
     */
    static triggerSunHalo(player, lotmManager) {
        if (!lotmManager.modifySpirituality(player, -70)) return;

        const dim = player.dimension;
        Utils.playSound(player, "beacon.power", 1.2, 1.0);
        lotmManager.addDigestion(player, 3);

        let elapsed = 0;
        const maxTicks = 160; // 8 秒持续

        const intervalId = system.runInterval(() => {
            elapsed += 20;
            if (elapsed > maxTicks || !Utils.isValid(player)) {
                system.clearRun(intervalId);
                return;
            }

            const pLoc = player.location;
            // 范围友军治疗 2 HP，亡灵每秒 4 伤害
            const entities = TargetingService.getAreaTargets(player, pLoc, 6.0, 8);
            for (const ent of entities) {
                if (ent.typeId === "minecraft:player") {
                    try {
                        const hpComp = ent.getComponent("health");
                        if (hpComp) {
                            hpComp.setCurrentValue(Math.min(hpComp.effectiveMax, hpComp.currentValue + 2));
                        }
                    } catch {}
                } else {
                    DamageResolver.applyDamage(player, ent, {
                        pveDamage: 4,
                        pvpDamage: 2,
                        isUndeadBonus: true,
                    });
                }
            }

            // 绘制金色圣光环
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                try {
                    dim.spawnParticle("minecraft:crit", {
                        x: pLoc.x + Math.cos(a) * 6,
                        y: pLoc.y + 0.2,
                        z: pLoc.z + Math.sin(a) * 6,
                    });
                } catch {}
            }
        }, 20);

        Utils.actionbar(player, "§e🌟 [太阳光环] 驱邪光环展开，守护身侧！");
    }

    /**
     * 消耗品：【圣水瓶 (Holy Water Bottle)】
     */
    static throwHolyWater(player, lotmManager) {
        if (Utils.countItem(player, "lotm:holy_water_bottle") <= 0) {
            Utils.tell(player, "§c背包中没有【圣水瓶】！");
            Utils.sound.fail(player);
            return;
        }

        if (!lotmManager.modifySpirituality(player, -20)) return;
        Utils.removeItem(player, "lotm:holy_water_bottle", 1);

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        Utils.playSound(player, "random.glass", 1.2, 1.0);
        lotmManager.addDigestion(player, 1);

        const { hitLoc } = TargetingService.getRayTarget(player, 18);
        const center = hitLoc || {
            x: headLoc.x + viewDir.x * 10,
            y: player.location.y,
            z: headLoc.z + viewDir.z * 10,
        };

        const targets = TargetingService.getAreaTargets(player, center, 3.0, 8);
        for (const t of targets) {
            if (t.typeId === "minecraft:player") {
                StatusEffectManager.removeStatus(t, "burning");
            } else {
                DamageResolver.applyDamage(player, t, {
                    pveDamage: 20,
                    pvpDamage: 10,
                    isUndeadBonus: true,
                });
            }
        }

        Utils.actionbar(player, "§e💧 [圣水瓶] 圣洁雨露洒落，驱散污秽与火灾！");
    }
}
