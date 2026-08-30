import { Utils } from "../utils.js";
import { PathwayProfileRegistry } from "./lotm_profile_registry.js";
import { ArtifactManager } from "./lotm_artifact_manager.js";
import { PathwaySeer } from "./pathway_seer.js";
import { PathwayHunter } from "./pathway_hunter.js";
import { PathwayWarrior } from "./pathway_warrior.js";
import { PathwayDarkness } from "./pathway_darkness.js";
import { PathwaySun } from "./pathway_sun.js";
import { PathwayMoon } from "./pathway_moon.js";
import { PathwayAssassin } from "./pathway_assassin.js";

/**
 * 《诡秘之主》统一能力路由器 (AbilityRouter)
 * 遵循 PRD 2.2 节优先级规则与严格途径鉴权：
 * P1 (非凡武器/封印物) ➔ P2 (途径专属媒介) ➔ P3 (独立消耗品) ➔ P4 (菜单) ➔ P5 (原版行为)
 */
export class AbilityRouter {
    /**
     * 统一分发右键使用事件
     * @param {import("@minecraft/server").Player} player 
     * @param {import("@minecraft/server").ItemStack} item 
     * @param {object} lotmManager 
     * @returns {boolean} 是否被非凡能力消费拦截
     */
    static routeItemUse(player, item, lotmManager) {
        if (!item || !item.typeId) return false;
        const itemId = item.typeId;
        const isSneaking = player.isSneaking;
        const pathway = lotmManager.getPathway(player);

        // ==========================================
        // P1: 手持物是非凡武器 / 封印物 (任何途径均可使用，承受反噬)
        // ==========================================
        if (ArtifactManager.isArtifact(itemId)) {
            ArtifactManager.handleArtifactUse(player, itemId, isSneaking, lotmManager);
            return true;
        }

        // ==========================================
        // P2: 手持物是非凡专属媒介 (严格途径匹配校验)
        // ==========================================
        const isSeerFocus = (itemId === "lotm:spirit_cane");
        const isHunterFocus = (itemId === "lotm:pyro_gauntlet");
        const isWarriorFocus = (itemId === "lotm:tactical_sword" || itemId === "lotm:tactical_axe" || itemId === "lotm:tactical_spear" || itemId === "lotm:tactical_bow");
        const isDarknessFocus = (itemId === "lotm:nightmare_watch");
        const isSunFocus = (itemId === "lotm:sun_emblem");
        const isMoonFocus = (itemId === "lotm:vampire_ring");
        const isAssassinFocus = (itemId === "lotm:witch_mirror_wand");

        if (isSeerFocus || isHunterFocus || isWarriorFocus || isDarknessFocus || isSunFocus || isMoonFocus || isAssassinFocus) {
            // 1. 占卜家 (魔术师)
            if (pathway === "seer" && isSeerFocus) {
                if (isSneaking) PathwaySeer.performFlameJump(player, lotmManager);
                else PathwaySeer.fireAirBullet(player, lotmManager);
                return true;
            }
            // 2. 猎人 (纵火家)
            else if (pathway === "hunter" && isHunterFocus) {
                if (isSneaking) PathwayHunter.triggerFlameTide(player, lotmManager);
                else PathwayHunter.fireFlameSpear(player, lotmManager);
                return true;
            }
            // 3. 战士 (武器大师)
            else if (pathway === "warrior" && isWarriorFocus) {
                PathwayWarrior.executeWeaponSkill(player, itemId, isSneaking, lotmManager);
                return true;
            }
            // 4. 不眠者 (梦魇)
            else if (pathway === "darkness" && isDarknessFocus) {
                if (isSneaking) PathwayDarkness.triggerNightmareDomain(player, lotmManager);
                else PathwayDarkness.forceSleep(player, lotmManager);
                return true;
            }
            // 5. 歌颂者 (太阳神官)
            else if (pathway === "sun" && isSunFocus) {
                if (isSneaking) PathwaySun.triggerSunHalo(player, lotmManager);
                else PathwaySun.castHolyLight(player, lotmManager);
                return true;
            }
            // 6. 药师 (吸血鬼)
            else if (pathway === "moon" && isMoonFocus) {
                if (isSneaking) PathwayMoon.triggerDarkWings(player, lotmManager);
                else PathwayMoon.corrosiveClaws(player, lotmManager);
                return true;
            }
            // 7. 刺客 (女巫)
            else if (pathway === "assassin" && isAssassinFocus) {
                if (isSneaking) PathwayAssassin.performMirrorSubstitute(player, lotmManager);
                else PathwayAssassin.castBlackFlame(player, lotmManager);
                return true;
            }
            // 途径不匹配：触发非凡排斥
            else {
                const currentProfile = PathwayProfileRegistry.getProfile(pathway);
                Utils.tell(player, `§c§l[非凡排斥] §7你当前为 §e${currentProfile.title || currentProfile.name}§7，无法催动异途径专属媒介！`);
                Utils.sound.warn(player);
                return true;
            }
        }

        // ==========================================
        // P3: 手持物是独立非凡消耗品 (严格途径鉴权)
        // ==========================================
        switch (itemId) {
            case "lotm:tarot_card":
                if (pathway !== "seer") {
                    Utils.tell(player, "§c§l[非凡排斥] §7仅【占卜家/魔术师】精通魔术纸牌飞掷秘术！");
                    Utils.sound.warn(player);
                    return true;
                }
                PathwaySeer.throwTarotCard(player, lotmManager);
                return true;

            case "lotm:paper_figurine":
                if (pathway !== "seer") {
                    Utils.tell(player, "§c§l[非凡排斥] §7仅【占卜家/魔术师】可驱动纸人替身！");
                    Utils.sound.warn(player);
                    return true;
                }
                PathwaySeer.triggerPaperSubstitute(player, lotmManager);
                return true;

            case "lotm:alchemical_molotov":
                PathwayHunter.throwMolotov(player, lotmManager);
                return true;

            case "lotm:blade_oil":
                if (pathway !== "warrior") {
                    Utils.tell(player, "§c§l[非凡排斥] §7仅【战士/武器大师】精通磨刃油附魔秘术！");
                    Utils.sound.warn(player);
                    return true;
                }
                PathwayWarrior.applyBladeOil(player, lotmManager);
                return true;

            case "lotm:dream_dust":
                if (pathway !== "darkness") {
                    Utils.tell(player, "§c§l[非凡排斥] §7仅【不眠者/梦魇】可引导安魂梦境粉尘！");
                    Utils.sound.warn(player);
                    return true;
                }
                PathwayDarkness.throwDreamDust(player, lotmManager);
                return true;

            case "lotm:holy_water_bottle":
                if (pathway !== "sun") {
                    Utils.tell(player, "§c§l[非凡排斥] §7仅【歌颂者/太阳神官】可激活纯白圣水！");
                    Utils.sound.warn(player);
                    return true;
                }
                PathwaySun.throwHolyWater(player, lotmManager);
                return true;

            case "lotm:sealed_blood_bottle":
                if (pathway !== "moon") {
                    Utils.tell(player, "§c§l[非凡排斥] §7仅【药师/吸血鬼】可吸收密封血液精华！");
                    Utils.sound.warn(player);
                    return true;
                }
                PathwayMoon.drinkBloodBottle(player, lotmManager);
                return true;

            case "lotm:curse_doll":
                if (pathway !== "assassin") {
                    Utils.tell(player, "§c§l[非凡排斥] §7仅【刺客/女巫】可施展诅咒草人秘术！");
                    Utils.sound.warn(player);
                    return true;
                }
                PathwayAssassin.useCurseDoll(player, lotmManager);
                return true;
        }

        return false;
    }
}
