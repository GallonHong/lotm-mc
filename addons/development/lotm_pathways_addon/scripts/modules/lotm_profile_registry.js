/**
 * 《诡秘之主》多途径序列 7 体质与属性档案注册表 (PathwayProfileRegistry)
 * 遵循 PRD 3.1 节规范：途径决定肉身、灵性、回灵、减伤与环境修正
 */

export const PATHWAY_PROFILES = {
    none: {
        id: "none",
        name: "普通人",
        sequence: 0,
        sequenceName: "普通人",
        title: "§7未涉足非凡的普通人",
        maxHealth: 20,
        maxSpirituality: 0,
        regenOutOfCombat: 0,
        regenInCombat: 0,
        focusItemIds: [],
        passives: [],
        profileVersion: 1,
    },
    seer: {
        id: "seer",
        name: "占卜家途径",
        sequence: 7,
        sequenceName: "魔术师",
        title: "§5【占卜家途径】序列7: 魔术师",
        maxHealth: 28, // 14 颗红心
        maxSpirituality: 500,
        regenOutOfCombat: 15,
        regenInCombat: 5,
        focusItemIds: ["lotm:spirit_cane"],
        consumableItemIds: ["lotm:tarot_card", "lotm:paper_figurine"],
        passives: [
            "speed_1",
            "jump_boost_1",
            "water_breathing",
            "fire_resistance",
            "paper_substitute",
            "clown_dodge"
        ],
        profileVersion: 1,
    },
    hunter: {
        id: "hunter",
        name: "红祭司途径",
        sequence: 7,
        sequenceName: "纵火家",
        title: "§c【红祭司途径】序列7: 纵火家",
        maxHealth: 32, // 16 颗红心
        maxSpirituality: 460,
        regenOutOfCombat: 12,
        regenInCombat: 4,
        focusItemIds: ["lotm:pyro_gauntlet"],
        consumableItemIds: ["lotm:alchemical_molotov"],
        passives: [
            "fire_immunity",
            "burning_target_boost", // 对燃烧目标伤害 +10%
            "fire_source_regen"     // 靠近火源回灵 +2/s
        ],
        profileVersion: 1,
    },
    warrior: {
        id: "warrior",
        name: "黄昏巨人途径",
        sequence: 7,
        sequenceName: "武器大师",
        title: "§6【黄昏巨人途径】序列7: 武器大师",
        maxHealth: 44, // 22 颗红心 (正面坦克)
        maxSpirituality: 320,
        regenOutOfCombat: 7,
        regenInCombat: 3,
        focusItemIds: [
            "lotm:tactical_sword",
            "lotm:tactical_axe",
            "lotm:tactical_spear",
            "lotm:tactical_bow"
        ],
        consumableItemIds: ["lotm:blade_oil"],
        passives: [
            "knockback_resistance_35", // 35% 击退抗性
            "weapon_damage_15",         // 普通武器伤害 +15%
            "durability_save_30"        // 耐久消耗 -30%
        ],
        profileVersion: 1,
    },
    darkness: {
        id: "darkness",
        name: "不眠者途径",
        sequence: 7,
        sequenceName: "梦魇",
        title: "§9【不眠者途径】序列7: 梦魇",
        maxHealth: 30, // 15 颗红心
        maxSpirituality: 540,
        regenOutOfCombat: 14,
        regenInCombat: 5,
        focusItemIds: ["lotm:nightmare_watch"],
        consumableItemIds: ["lotm:dream_dust"],
        passives: [
            "night_vision",
            "night_spirit_boost",     // 夜间回灵 +25%
            "mental_control_res_35",  // 精神控制抗性 35%
            "spirit_perception"       // 模糊感知隐身/灵体轮廓
        ],
        profileVersion: 1,
    },
    sun: {
        id: "sun",
        name: "歌颂者途径",
        sequence: 7,
        sequenceName: "太阳神官",
        title: "§e【歌颂者途径】序列7: 太阳神官",
        maxHealth: 36, // 18 颗红心
        maxSpirituality: 500,
        regenOutOfCombat: 13,
        regenInCombat: 4,
        focusItemIds: ["lotm:sun_emblem"],
        consumableItemIds: ["lotm:holy_water_bottle"],
        passives: [
            "corruption_reduce_30", // 污染获得 -30%
            "fear_immunity",        // 免疫恐惧
            "undead_damage_25",     // 对亡灵/污秽伤害 +25%
            "daylight_regen_20"     // 白昼脱战回灵 +20%
        ],
        profileVersion: 1,
    },
    moon: {
        id: "moon",
        name: "药师途径",
        sequence: 7,
        sequenceName: "吸血鬼",
        title: "§4【药师途径】序列7: 吸血鬼",
        maxHealth: 36, // 18 颗红心
        maxSpirituality: 460,
        // 白昼与黑夜回灵差异
        regenOutOfCombatDay: 6,
        regenInCombatDay: 2,
        regenOutOfCombatNight: 16,
        regenInCombatNight: 6,
        focusItemIds: ["lotm:vampire_ring"],
        consumableItemIds: ["lotm:sealed_blood_bottle"],
        passives: [
            "night_healing",   // 夜间脱战每 3 秒恢复 1 HP
            "blood_thirst_sys" // 血渴机制
        ],
        profileVersion: 1,
    },
    assassin: {
        id: "assassin",
        name: "刺客途径",
        sequence: 7,
        sequenceName: "女巫",
        title: "§d【刺客途径】序列7: 女巫",
        maxHealth: 28, // 14 颗红心
        maxSpirituality: 560,
        regenOutOfCombat: 15,
        regenInCombat: 5,
        focusItemIds: ["lotm:witch_mirror_wand"],
        consumableItemIds: ["lotm:curse_doll"],
        passives: [
            "speed_boost_8",          // 移速 +8%
            "poison_curse_res_25",    // 毒素与诅咒抗性 25%
            "invis_first_strike_15"   // 隐形后首次攻击 +15% (PvP +8%)
        ],
        profileVersion: 1,
    },
    tyrant: {
        id: "tyrant",
        name: "暴君途径",
        sequence: 7,
        sequenceName: "航海家",
        title: "§b【暴君途径】序列7: 航海家",
        maxHealth: 36,
        maxSpirituality: 500,
        regenOutOfCombat: 13,
        regenInCombat: 5,
        focusItemIds: ["lotm:storm_cutlass"],
        consumableItemIds: [],
        passives: ["water_breathing", "water_spirit_boost", "swim_speed", "storm_affinity"],
        profileVersion: 1,
    }
};

// 低序列档案只覆盖会随晋升变化的字段；序列 7 继续以 PRD v1.0 数值为准。
const LOW_SEQUENCE_OVERRIDES = {
    seer: {
        9: { sequenceName: "占卜家", maxHealth: 20, maxSpirituality: 120, regenOutOfCombat: 5, regenInCombat: 1, passives: ["spirit_vision"] },
        8: { sequenceName: "小丑", maxHealth: 24, maxSpirituality: 260, regenOutOfCombat: 9, regenInCombat: 3, passives: ["speed_1", "jump_boost_1", "clown_dodge"] },
    },
    hunter: {
        9: { sequenceName: "猎人", maxHealth: 24, maxSpirituality: 110, regenOutOfCombat: 3, regenInCombat: 1, passives: ["tracking"] },
        8: { sequenceName: "挑衅者", maxHealth: 28, maxSpirituality: 200, regenOutOfCombat: 6, regenInCombat: 2, passives: ["tracking", "provocation_resistance"] },
    },
    warrior: {
        9: { sequenceName: "战士", maxHealth: 30, maxSpirituality: 80, regenOutOfCombat: 2, regenInCombat: 1, passives: ["weapon_damage_5"] },
        8: { sequenceName: "格斗家", maxHealth: 36, maxSpirituality: 150, regenOutOfCombat: 4, regenInCombat: 2, passives: ["weapon_damage_10", "knockback_resistance_15"] },
    },
    darkness: {
        9: { sequenceName: "不眠者", maxHealth: 22, maxSpirituality: 150, regenOutOfCombat: 6, regenInCombat: 2, passives: ["night_vision"] },
        8: { sequenceName: "午夜诗人", maxHealth: 26, maxSpirituality: 310, regenOutOfCombat: 10, regenInCombat: 3, passives: ["night_vision", "night_spirit_boost"] },
    },
    sun: {
        9: { sequenceName: "歌颂者", maxHealth: 24, maxSpirituality: 160, regenOutOfCombat: 4, regenInCombat: 2, passives: ["courage"] },
        8: { sequenceName: "祈光人", maxHealth: 30, maxSpirituality: 310, regenOutOfCombat: 8, regenInCombat: 3, passives: ["courage", "undead_damage_10"] },
    },
    moon: {
        9: { sequenceName: "药师", maxHealth: 22, maxSpirituality: 130, regenOutOfCombat: 5, regenInCombat: 1, passives: ["medicine_affinity"] },
        8: { sequenceName: "驯兽师", maxHealth: 28, maxSpirituality: 280, regenOutOfCombat: 9, regenInCombat: 3, passives: ["medicine_affinity", "beast_affinity"] },
    },
    assassin: {
        9: { sequenceName: "刺客", maxHealth: 22, maxSpirituality: 150, regenOutOfCombat: 6, regenInCombat: 2, passives: ["speed_boost_4", "backstab"] },
        8: { sequenceName: "教唆者", maxHealth: 24, maxSpirituality: 320, regenOutOfCombat: 10, regenInCombat: 3, passives: ["speed_boost_6", "backstab", "instigation"] },
    },
    tyrant: {
        9: { sequenceName: "水手", maxHealth: 28, maxSpirituality: 140, regenOutOfCombat: 4, regenInCombat: 2, passives: ["water_breathing", "swim_speed"] },
        8: { sequenceName: "暴怒之民", maxHealth: 32, maxSpirituality: 260, regenOutOfCombat: 7, regenInCombat: 3, passives: ["water_breathing", "swim_speed", "rage"] },
    },
};

/**
 * 途径配置管理器
 */
export class PathwayProfileRegistry {
    /**
     * 获取指定途径配置
     * @param {string} pathwayId 
     * @returns {object}
     */
    static getProfile(pathwayId, sequence = 7) {
        const base = PATHWAY_PROFILES[pathwayId] || PATHWAY_PROFILES.none;
        if (pathwayId === "none") return base;
        const normalizedSequence = [7, 8, 9].includes(Number(sequence)) ? Number(sequence) : 7;
        const override = LOW_SEQUENCE_OVERRIDES[pathwayId]?.[normalizedSequence];
        if (!override) return base;
        return {
            ...base,
            ...override,
            sequence: normalizedSequence,
            title: `§${normalizedSequence === 9 ? "9" : normalizedSequence === 8 ? "c" : "6"}【${base.name}】序列${normalizedSequence}: ${override.sequenceName}`,
            // 序列 7 媒介和消耗品不能被低序列提前驱动。
            focusItemIds: [],
            consumableItemIds: [],
            profileVersion: 10 + normalizedSequence,
        };
    }

    /**
     * 判断物品是否为指定途径的媒介
     * @param {string} pathwayId 
     * @param {string} itemId 
     * @returns {boolean}
     */
    static isFocusItem(pathwayId, itemId, sequence = 7) {
        const profile = this.getProfile(pathwayId, sequence);
        return profile.focusItemIds && profile.focusItemIds.includes(itemId);
    }

    /**
     * 判断物品是否为指定途径的消耗品
     * @param {string} pathwayId 
     * @param {string} itemId 
     * @returns {boolean}
     */
    static isConsumableItem(pathwayId, itemId, sequence = 7) {
        const profile = this.getProfile(pathwayId, sequence);
        return profile.consumableItemIds && profile.consumableItemIds.includes(itemId);
    }
}
