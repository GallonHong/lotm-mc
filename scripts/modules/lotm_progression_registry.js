/**
 * 已实现途径的低序列（9 -> 8 -> 7）晋升、名称与魔药注册表。
 * 数值以现有序列 7 PRD 为上限，低序列按各途径定位逐级成长。
 */
export const PATHWAY_PROGRESSION = {
    seer: {
        name: "占卜家途径",
        sequences: {
            9: { name: "占卜家", potionId: "lotm:potion_seer" },
            8: { name: "小丑", potionId: "lotm:potion_clown" },
            7: { name: "魔术师", potionId: "lotm:potion_magician" },
        },
    },
    hunter: {
        name: "红祭司途径",
        sequences: {
            9: { name: "猎人", potionId: "lotm:potion_hunter" },
            8: { name: "挑衅者", potionId: "lotm:potion_provoker" },
            7: { name: "纵火家", potionId: "lotm:potion_pyromaniac" },
        },
    },
    warrior: {
        name: "黄昏巨人途径",
        sequences: {
            9: { name: "战士", potionId: "lotm:potion_warrior" },
            8: { name: "格斗家", potionId: "lotm:potion_pugilist" },
            7: { name: "武器大师", potionId: "lotm:potion_weapon_master" },
        },
    },
    darkness: {
        name: "不眠者途径",
        sequences: {
            9: { name: "不眠者", potionId: "lotm:potion_sleepless" },
            8: { name: "午夜诗人", potionId: "lotm:potion_midnight_poet" },
            7: { name: "梦魇", potionId: "lotm:potion_nightmare" },
        },
    },
    sun: {
        name: "歌颂者途径",
        sequences: {
            9: { name: "歌颂者", potionId: "lotm:potion_bard" },
            8: { name: "祈光人", potionId: "lotm:potion_light_supplicant" },
            7: { name: "太阳神官", potionId: "lotm:potion_solar_priest" },
        },
    },
    moon: {
        name: "药师途径",
        sequences: {
            9: { name: "药师", potionId: "lotm:potion_apothecary" },
            8: { name: "驯兽师", potionId: "lotm:potion_beast_tamer" },
            7: { name: "吸血鬼", potionId: "lotm:potion_vampire" },
        },
    },
    assassin: {
        name: "刺客途径",
        sequences: {
            9: { name: "刺客", potionId: "lotm:potion_assassin" },
            8: { name: "教唆者", potionId: "lotm:potion_instigator" },
            7: { name: "女巫", potionId: "lotm:potion_witch" },
        },
    },
    tyrant: {
        name: "暴君途径",
        sequences: {
            9: { name: "水手", potionId: "lotm:potion_sailor" },
            8: { name: "暴怒之民", potionId: "lotm:potion_folk_of_rage" },
            7: { name: "航海家", potionId: "lotm:potion_seafarer" },
        },
    },
};

export const POTION_INDEX = {};
for (const [pathwayId, pathway] of Object.entries(PATHWAY_PROGRESSION)) {
    for (const [sequenceText, sequenceData] of Object.entries(pathway.sequences)) {
        POTION_INDEX[sequenceData.potionId] = {
            pathwayId,
            sequence: Number(sequenceText),
            sequenceName: sequenceData.name,
        };
    }
}

export function getSequenceData(pathwayId, sequence) {
    return PATHWAY_PROGRESSION[pathwayId]?.sequences?.[sequence] || null;
}

export function getPotionData(itemId) {
    return POTION_INDEX[itemId] || null;
}

export function getAllPotionIds() {
    return Object.keys(POTION_INDEX);
}
