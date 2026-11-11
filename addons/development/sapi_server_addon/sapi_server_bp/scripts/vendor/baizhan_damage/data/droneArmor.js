// Shared drone chassis-armor and blast-protection contract.
// Source of truth for design values: Apocalypse Life scripts/drones/DroneConstants.js.
// This file is mirrored byte-for-byte between Test Guns scripts/data/droneArmor.js
// and SAPI scripts/vendor/baizhan_damage/data/droneArmor.js. Keep both copies
// identical; addons/development/apocalypse_life_addon/tests/test_drone_armor.mjs
// enforces the mirror, tier parity and full player-drone coverage.
export const DRONE_TIER_BY_ENTITY = Object.freeze({
	'makercamp_dr:summoner_drone': 'COMMON', // 「蜂鸟-I」侦察无人机
	'makercamp_dr:inventory_drone': 'COMMON', // 「骆驼」重载货运机
	'makercamp_dr:ore_finder_drone': 'RARE', // 「生命线」战地急救机
	'makercamp_dr:mob_transporter_drone': 'RARE', // 「惩戒者」突击无人机
	'makercamp_dr:spy_drone': 'RARE', // 「幽灵」聚能激光机
	'makercamp_dr:tnt_launcher_drone': 'RARE', // 「神风」巡飞自爆机
	'makercamp_dr:healing_drone': 'EPIC', // 「守护天使」特战医疗机
	'makercamp_dr:mining_drone': 'EPIC', // 「毁灭者」重装突击机
	'makercamp_dr:poison_drone': 'EPIC', // 「死神」腐蚀自爆机
	'makercamp_dr:race_drone': 'EPIC', // 「疾风」战术增幅机
	'makercamp_dr:laser_drone': 'LEGENDARY', // 「极光天灾」典藏战术母机
	'makercamp_dr:water_drone': 'LEGENDARY' // 「深渊主宰」典藏战术矩阵
});

// Intrinsic chassis armor points, consumed by DamageHandler.estimateArmorPoints
// and therefore reduced by weapon armor penetration like any worn armor.
export const DRONE_ARMOR_BY_TIER = Object.freeze({
	COMMON: 10,
	RARE: 10,
	EPIC: 18,
	LEGENDARY: 25
});

// Intrinsic blast protection (0.0 ~ 1.0), consumed by ArmorEngine.getBlastReduction
// and by the Baizhan / rail splash sites. Scripted explosions only; native
// creeper/TNT/meteor explosions are intentionally not covered.
export const DRONE_BLAST_REDUCTION_BY_TIER = Object.freeze({
	COMMON: 0.45,
	RARE: 0.55,
	EPIC: 0.65,
	LEGENDARY: 0.75
});

export const DRONE_ARMOR_POINTS = Object.freeze(
	Object.fromEntries(Object.entries(DRONE_TIER_BY_ENTITY).map(([typeId, tier]) => [typeId, DRONE_ARMOR_BY_TIER[tier]]))
);

export function intrinsicArmorPoints(typeId) {
	const tier = DRONE_TIER_BY_ENTITY[typeId];
	return tier ? DRONE_ARMOR_BY_TIER[tier] : 0;
}

export function intrinsicBlastReduction(typeId) {
	const tier = DRONE_TIER_BY_ENTITY[typeId];
	return tier ? DRONE_BLAST_REDUCTION_BY_TIER[tier] : 0;
}
