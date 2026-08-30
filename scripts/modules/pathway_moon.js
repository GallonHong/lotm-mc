import { world, system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { DamageResolver } from "./lotm_damage_resolver.js";
import { StatusEffectManager } from "./lotm_status_manager.js";

/**
 * 药师途径 · 序列 7 吸血鬼 (Vampire)
 * PRD 5.5 节实现：血族指环、腐蚀之爪、黑暗之翼、密封血液瓶、血渴管理
 */
export class PathwayMoon {
    /**
     * 血渴资源读写 (PRD 5.5: 0-100 长期资源)
     */
    static getBloodThirst(player) {
        return Utils.getProp(player, "lotm:bloodThirst", 0);
    }

    static modifyBloodThirst(player, amount) {
        const cur = this.getBloodThirst(player);
        const next = Math.min(100, Math.max(0, cur + amount));
        Utils.setProp(player, "lotm:bloodThirst", next);
        return next;
    }

    /**
     * 吸血鬼血渴心跳处理 (每秒/每2秒检测)
     */
    static handleThirstTick(player) {
        const thirst = this.getBloodThirst(player);
        if (thirst >= 100) {
            // 血渴达到 100：每 2 秒损失 1 HP (最低 1 HP)
            try {
                const hp = player.getComponent("health");
                if (hp && hp.currentValue > 1) {
                    hp.setCurrentValue(hp.currentValue - 1);
                    Utils.actionbar(player, "§4🩸 [极端血渴] 喉咙干渴如焚！生命值正在流失！请尽快饮血！");
                }
            } catch {}
        }
    }

    /**
     * 主技能：【腐蚀之爪 (Corrosive Claws)】 (普通右键)
     */
    static corrosiveClaws(player, lotmManager) {
        const { entity } = TargetingService.getRayTarget(player, 8);
        if (!entity) {
            Utils.actionbar(player, "§c[腐蚀之爪] 8格外无有效目标！");
            return;
        }

        const thirst = this.getBloodThirst(player);
        const extraCost = thirst >= 80 ? 40 : 35; // 血渴 >= 80 消耗增加
        if (!lotmManager.modifySpirituality(player, -extraCost)) return;

        const dim = player.dimension;
        Utils.playSound(player, "mob.wither.shoot", 1.8, 1.0);
        lotmManager.addDigestion(player, 2);

        // 瞬间突进至目标身前
        const eLoc = entity.location;
        const dashLoc = {
            x: eLoc.x + (player.location.x - eLoc.x) * 0.3,
            y: eLoc.y,
            z: eLoc.z + (player.location.z - eLoc.z) * 0.3,
        };
        try { player.teleport(dashLoc, { dimension: dim }); } catch {}

        // 造成 24/12 伤害并破甲 15%
        const dealt = DamageResolver.applyDamage(player, entity, {
            pveDamage: 24,
            pvpDamage: 12,
            armorPierceRatio: 0.15,
        });
        StatusEffectManager.applyStatus(entity, "armor_break", 100, 0.15, player);

        // 吸血 25% (上限 6 HP) 并降低 15 点血渴
        const heal = Math.min(6, Math.max(1, Math.round(dealt * 0.25)));
        try {
            const hp = player.getComponent("health");
            if (hp) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + heal));
        } catch {}

        this.modifyBloodThirst(player, -15);

        Utils.playSound(player, "random.break", 1.8, 1.0);
        Utils.actionbar(player, `§4🩸 [腐蚀之爪] 暗红爪光撕裂，汲取了 ${heal} HP (血渴-15)！`);
    }

    /**
     * 副技能：【黑暗之翼 (Dark Wings)】 (潜行右键)
     */
    static triggerDarkWings(player, lotmManager) {
        if (!lotmManager.modifySpirituality(player, -70)) return;

        const dim = player.dimension;
        Utils.playSound(player, "mob.bat.takeoff", 1.2, 1.0);
        Utils.playSound(player, "mob.enderdragon.flap", 1.5, 0.8);
        lotmManager.addDigestion(player, 3);

        // 6 秒 (120 tick) 高速与缓降
        try {
            player.addEffect("speed", 120, { amplifier: 3, showParticles: false });
            player.addEffect("slow_falling", 120, { amplifier: 0, showParticles: false });
            player.addEffect("jump_boost", 120, { amplifier: 2, showParticles: false });
        } catch {}

        // 产生暗黑血蝙蝠振翅微粒
        try {
            dim.spawnParticle("minecraft:crit", player.location);
        } catch {}

        Utils.actionbar(player, "§4🦇 [黑暗之翼] 血蝠幻翼展开，获得 6 秒极速与轻盈冲刺！");
    }

    /**
     * 消耗品：【密封血液瓶 (Sealed Blood Bottle)】
     */
    static drinkBloodBottle(player, lotmManager) {
        if (Utils.countItem(player, "lotm:sealed_blood_bottle") <= 0) {
            Utils.tell(player, "§c背包中没有【密封血液瓶】！");
            Utils.sound.fail(player);
            return;
        }

        Utils.removeItem(player, "lotm:sealed_blood_bottle", 1);
        Utils.playSound(player, "random.drink", 1.2, 1.0);
        lotmManager.addDigestion(player, 1);

        // 恢复 8 HP、80 SP 并降低 25 点血渴
        lotmManager.modifySpirituality(player, 80);
        this.modifyBloodThirst(player, -25);

        try {
            const hp = player.getComponent("health");
            if (hp) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + 8));
        } catch {}

        Utils.tell(player, "§4🩸 [饮用血瓶] 鲜活血液浸润咽喉，恢复 8 HP 与 80 灵性 (血渴-25)！");
    }
}
