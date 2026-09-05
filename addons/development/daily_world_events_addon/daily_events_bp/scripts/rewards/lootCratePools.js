export const LOOT_CRATE_POOLS = Object.freeze({
  scavenger: {
    resetMinutes: 30,
    rolls: [2, 4],
    bonusEpicBlueprintChance: 0.01,
    coins: [
      { weight: 1000, min: 1, max: 50 },
      { weight: 1500, min: 51, max: 100 },
      { weight: 2500, min: 101, max: 150 },
      { weight: 2500, min: 151, max: 250 },
      { weight: 1500, min: 251, max: 400 },
      { weight: 700, min: 401, max: 650 },
      { weight: 200, min: 651, max: 850 },
      { weight: 100, min: 851, max: 1000 }
    ],
    entries: [
      { weight: 925, id: "minecraft:rotten_flesh", min: 1, max: 8 },
      { weight: 650, id: "minecraft:bone", min: 1, max: 8 },
      { weight: 500, id: "minecraft:string", min: 1, max: 6 },
      { weight: 500, id: "minecraft:stick", min: 1, max: 12 },
      { weight: 450, id: "minecraft:paper", min: 1, max: 8 },
      { weight: 350, id: "minecraft:glass_bottle", min: 1, max: 4 },
      { weight: 350, id: "minecraft:leather", min: 1, max: 4 },
      { weight: 400, id: "minecraft:iron_nugget", min: 2, max: 12 },
      { weight: 350, id: "minecraft:coal", min: 1, max: 8 },
      { weight: 300, id: "minecraft:gunpowder", min: 1, max: 5 },
      { weight: 250, id: "minecraft:copper_ingot", min: 1, max: 4 },
      { weight: 250, id: "minecraft:iron_ingot", min: 1, max: 3 },
      { weight: 200, id: "minecraft:redstone", min: 1, max: 5 },
      { weight: 100, id: "minecraft:bread", min: 1, max: 2 },

      { weight: 160, id: "ab_ve:canned_beans", min: 1, max: 2 },
      { weight: 130, id: "ab_ve:canned_beef_stew", min: 1, max: 2 },
      { weight: 120, id: "ab_ve:canned_tuna", min: 1, max: 2 },
      { weight: 130, id: "ab_ve:ramen_cup", min: 1, max: 2 },
      { weight: 150, id: "ab_ve:granola_bar", min: 1, max: 3 },
      { weight: 120, id: "ab_ve:meat_jerky", min: 1, max: 3 },
      { weight: 180, id: "ab_ve:bottle_water", min: 1, max: 2 },
      { weight: 100, id: "ab_ve:energy_drink", min: 1, max: 2 },
      { weight: 60, id: "ab_ve:mre", min: 1, max: 1 },
      { weight: 50, id: "ab_ve:chocolate_bar", min: 1, max: 2 },

      { weight: 250, id: "ab_ve:bandage", min: 1, max: 3 },
      { weight: 150, id: "ab_ve:painkiller", min: 1, max: 2 },
      { weight: 100, id: "ab_ve:splint", min: 1, max: 2 },
      { weight: 75, id: "ab_ve:antidote", min: 1, max: 1 },
      { weight: 75, id: "ab_ve:first_aid", min: 1, max: 1 },
      { weight: 50, id: "ab_ve:adrenaline", min: 1, max: 1 },

      { weight: 180, id: "test_gun:ammo_45acp", min: 8, max: 24 },
      { weight: 220, id: "test_gun:ammo_rifle", min: 8, max: 24 },
      { weight: 160, id: "test_gun:ammo_shotgun", min: 4, max: 12 },
      { weight: 130, id: "test_gun:ammo_belt_100", min: 10, max: 30 },
      { weight: 100, id: "test_gun:ammo_50cal", min: 2, max: 8 },
      { weight: 100, id: "test_gun:ammo_battery", min: 4, max: 12 },
      { weight: 60, id: "test_gun:ammo_40mm", min: 1, max: 3 },
      { weight: 50, id: "test_gun:ammo_rocket", min: 1, max: 1 },

      { weight: 150, id: "test_gun:part_barrel", min: 1, max: 2 },
      { weight: 150, id: "test_gun:part_receiver", min: 1, max: 2 },
      { weight: 150, id: "test_gun:part_stock", min: 1, max: 2 },
      { weight: 100, id: "test_gun:part_fabric_rag", min: 1, max: 3 },
      { weight: 100, id: "test_gun:part_sewing_kit", min: 1, max: 2 },
      { weight: 100, id: "test_gun:part_drum_mag", min: 1, max: 1 },
      { weight: 80, id: "test_gun:part_heavy_barrel", min: 1, max: 1 },
      { weight: 80, id: "test_gun:part_ceramic_plate", min: 1, max: 1 },
      { weight: 80, id: "test_gun:part_kevlar_sheet", min: 1, max: 1 },
      { weight: 60, id: "test_gun:part_shield_frame", min: 1, max: 1 },
      { weight: 60, id: "test_gun:part_tungsten_bolt", min: 1, max: 1 },
      { weight: 40, id: "test_gun:part_exo_core", min: 1, max: 1 },
      { weight: 35, id: "test_gun:part_ion_thruster", min: 1, max: 1 },
      { weight: 35, id: "test_gun:part_deflection_generator", min: 1, max: 1 },
      { weight: 30, id: "test_gun:part_military_fcu", min: 1, max: 1 },
      { weight: 15, id: "test_gun:part_plasma_core", min: 1, max: 1 },

      { weight: 90, id: "survival_vehicle:scrap_metal", min: 1, max: 3 },
      { weight: 50, id: "survival_vehicle:vehicle_tire", min: 1, max: 1 },
      { weight: 40, id: "survival_vehicle:vehicle_battery", min: 1, max: 1 },
      { weight: 30, id: "survival_vehicle:vehicle_engine", min: 1, max: 1 },
      { weight: 20, id: "survival_vehicle:vehicle_chassis", min: 1, max: 1 },
      { weight: 10, id: "survival_vehicle:boat_propeller", min: 1, max: 1 },
      { weight: 10, id: "survival_vehicle:jerrycan_full", min: 1, max: 1 },

      { weight: 10, id: "daily:mythic_supply_key", min: 1, max: 1, name: "§d神话补给密钥" }
    ]
  },
  common: {
    resetMinutes: 15, rolls: 2, coins: [100, 300],
    entries: [
      { weight: 30, id: "minecraft:bread", min: 1, max: 3 },
      { weight: 25, id: "minecraft:coal", min: 2, max: 6 },
      { weight: 20, id: "minecraft:iron_nugget", min: 3, max: 9 },
      { weight: 15, id: "minecraft:arrow", min: 4, max: 12 },
      { weight: 10, id: "minecraft:string", min: 1, max: 4 }
    ]
  },
  rare: {
    resetMinutes: 30, rolls: 3, coins: [300, 700],
    entries: [
      { weight: 28, id: "minecraft:iron_ingot", min: 1, max: 4 },
      { weight: 22, id: "minecraft:redstone", min: 3, max: 10 },
      { weight: 20, id: "minecraft:gold_ingot", min: 1, max: 3 },
      { weight: 18, id: "minecraft:cooked_beef", min: 2, max: 5 },
      { weight: 12, id: "minecraft:amethyst_shard", min: 1, max: 3 }
    ]
  },
  epic: {
    resetMinutes: 60, rolls: 4, coins: [700, 1500], bonusKeyChance: 0.02,
    entries: [
      { weight: 28, id: "minecraft:iron_block", min: 1, max: 2 },
      { weight: 24, id: "minecraft:gold_ingot", min: 2, max: 5 },
      { weight: 20, id: "minecraft:diamond", min: 1, max: 2 },
      { weight: 18, id: "minecraft:amethyst_shard", min: 3, max: 7 },
      { weight: 10, id: "minecraft:enchanted_golden_apple", min: 1, max: 1 }
    ]
  },
  legendary: {
    resetMinutes: 120, rolls: 5, coins: [1500, 3500], bonusKeyChance: 0.08,
    entries: [
      { weight: 26, id: "minecraft:diamond", min: 2, max: 5 },
      { weight: 25, id: "minecraft:emerald_block", min: 1, max: 2 },
      { weight: 20, id: "minecraft:golden_apple", min: 2, max: 5 },
      { weight: 15, id: "minecraft:netherite_scrap", min: 1, max: 2 },
      { weight: 10, id: "minecraft:nether_star", min: 1, max: 1 },
      { weight: 4, id: "test_gun:part_plasma_core", min: 1, max: 1, name: "§5特殊等离子核心" }
    ]
  },
  mythic: {
    resetMinutes: 240,
    rolls: 1,
    coins: [0, 0],
    bonusKeyChance: 0.15,
    requiredKey: { id: "daily:mythic_supply_key", name: "神话补给密钥" },
    entries: [
      { weight: 28, id: "test_gun:blueprint_pkm", min: 1, max: 1, name: "§5【限定 Epic】PKM 蓝图" },
      { weight: 28, id: "test_gun:blueprint_usas12", min: 1, max: 1, name: "§5【限定 Epic】USAS-12 蓝图" },
      { weight: 28, id: "test_gun:blueprint_m1014_ward", min: 1, max: 1, name: "§5【限定 Epic】M1014 泰坦壁垒蓝图" },
      { weight: 28, id: "test_gun:blueprint_flash_shield", min: 1, max: 1, name: "§5【限定 Epic】G52 闪光盾蓝图" },
      { weight: 28, id: "test_gun:blueprint_titan_chest", min: 1, max: 1, name: "§5【限定 Epic】泰坦外骨骼蓝图" },
      { weight: 15, id: "test_gun:blueprint_arc", min: 1, max: 1, name: "§6【传说】特斯拉高能电弧风暴核心图纸" },
      { weight: 15, id: "test_gun:blueprint_armor_mob_mask", min: 1, max: 1, name: "§6【传说·限定】堡垒重装全覆式头盔设计图" },
      { weight: 15, id: "test_gun:blueprint_armor_mob_chest", min: 1, max: 1, name: "§6【传说·限定】堡垒重型防暴护甲设计图" },
      { weight: 15, id: "test_gun:blueprint_armor_mob_pants", min: 1, max: 1, name: "§6【传说·限定】堡垒重型防暴腿甲设计图" }
    ]
  }
});

export const ENTITY_LOOT_CRATE_POOLS = Object.freeze({
  common: {
    label: "普通随机箱",
    maxItems: 2,
    rollCounts: [{ weight: 25, count: 1 }, { weight: 75, count: 2 }],
    cooldownMinutes: 30,
    coins: [
      { weight: 1000, min: 1, max: 20 },
      { weight: 1500, min: 21, max: 40 },
      { weight: 2500, min: 41, max: 60 },
      { weight: 2500, min: 61, max: 100 },
      { weight: 1500, min: 101, max: 180 },
      { weight: 700, min: 181, max: 300 },
      { weight: 300, min: 301, max: 500 }
    ],
    entries: [
      { weight: 1200, id: "minecraft:rotten_flesh", min: 1, max: 6 },
      { weight: 900, id: "minecraft:bone", min: 1, max: 6 },
      { weight: 700, id: "minecraft:string", min: 1, max: 4 },
      { weight: 700, id: "minecraft:stick", min: 1, max: 8 },
      { weight: 600, id: "minecraft:paper", min: 1, max: 5 },
      { weight: 500, id: "minecraft:glass_bottle", min: 1, max: 3 },
      { weight: 400, id: "minecraft:leather", min: 1, max: 3 },
      { weight: 500, id: "minecraft:coal", min: 1, max: 5 },
      { weight: 500, id: "minecraft:iron_nugget", min: 2, max: 8 },
      { weight: 300, id: "minecraft:gunpowder", min: 1, max: 3 },
      { weight: 300, id: "minecraft:copper_ingot", min: 1, max: 2 },
      { weight: 200, id: "minecraft:bread", min: 1, max: 2 },
      { weight: 200, id: "minecraft:redstone", min: 1, max: 3 },
      { weight: 500, id: "test_gun:ammo_rifle", min: 6, max: 18 },
      { weight: 400, id: "test_gun:ammo_45acp", min: 6, max: 18 },
      { weight: 300, id: "test_gun:ammo_shotgun", min: 3, max: 8 },
      { weight: 200, id: "test_gun:ammo_belt_100", min: 8, max: 20 },
      { weight: 100, id: "test_gun:ammo_battery", min: 2, max: 6 },
      { weight: 300, id: "test_gun:part_barrel", min: 1, max: 1 },
      { weight: 300, id: "test_gun:part_receiver", min: 1, max: 1 },
      { weight: 300, id: "test_gun:part_stock", min: 1, max: 1 },
      { weight: 200, id: "test_gun:part_fabric_rag", min: 1, max: 2 },
      { weight: 100, id: "test_gun:part_sewing_kit", min: 1, max: 1 },
      { weight: 100, id: "test_gun:part_drum_mag", min: 1, max: 1 },
      { weight: 40, id: "test_gun:blueprint_arx", min: 1, max: 1, name: "§9ARX 蓝图" },
      { weight: 40, id: "test_gun:blueprint_scarh", min: 1, max: 1, name: "§9SCAR-H 蓝图" },
      { weight: 40, id: "test_gun:blueprint_svd", min: 1, max: 1, name: "§9SVD 蓝图" },
      { weight: 40, id: "test_gun:blueprint_deagle", min: 1, max: 1, name: "§9沙漠之鹰蓝图" },
      { weight: 40, id: "test_gun:blueprint_rpk", min: 1, max: 1, name: "§9RPK 蓝图" }
    ]
  },
  advanced: {
    label: "高级随机箱",
    maxItems: 3,
    rollCounts: [{ weight: 15, count: 1 }, { weight: 55, count: 2 }, { weight: 30, count: 3 }],
    cooldownMinutes: 60,
    bonusEpicBlueprintChance: 0.01,
    coins: [
      { weight: 800, min: 1, max: 40 },
      { weight: 1200, min: 41, max: 80 },
      { weight: 3000, min: 81, max: 120 },
      { weight: 2500, min: 121, max: 180 },
      { weight: 1500, min: 181, max: 300 },
      { weight: 700, min: 301, max: 500 },
      { weight: 300, min: 501, max: 800 }
    ],
    entries: [
      { weight: 900, id: "minecraft:iron_ingot", min: 1, max: 4 },
      { weight: 500, id: "minecraft:copper_ingot", min: 2, max: 6 },
      { weight: 450, id: "minecraft:redstone", min: 2, max: 8 },
      { weight: 350, id: "minecraft:gold_ingot", min: 1, max: 3 },
      { weight: 350, id: "minecraft:amethyst_shard", min: 1, max: 4 },
      { weight: 300, id: "minecraft:gunpowder", min: 2, max: 6 },
      { weight: 250, id: "minecraft:emerald", min: 1, max: 3 },
      { weight: 200, id: "minecraft:diamond", min: 1, max: 1 },
      { weight: 450, id: "ab_ve:bandage", min: 1, max: 3 },
      { weight: 350, id: "ab_ve:first_aid", min: 1, max: 1 },
      { weight: 300, id: "ab_ve:painkiller", min: 1, max: 2 },
      { weight: 250, id: "ab_ve:adrenaline", min: 1, max: 1 },
      { weight: 350, id: "ab_ve:canned_beef_stew", min: 1, max: 2 },
      { weight: 300, id: "ab_ve:energy_drink", min: 1, max: 2 },
      { weight: 500, id: "test_gun:ammo_rifle", min: 16, max: 32 },
      { weight: 400, id: "test_gun:ammo_45acp", min: 16, max: 32 },
      { weight: 350, id: "test_gun:ammo_shotgun", min: 6, max: 16 },
      { weight: 300, id: "test_gun:ammo_belt_100", min: 20, max: 50 },
      { weight: 250, id: "test_gun:ammo_50cal", min: 3, max: 8 },
      { weight: 200, id: "test_gun:ammo_battery", min: 6, max: 14 },
      { weight: 100, id: "test_gun:ammo_40mm", min: 1, max: 2 },
      { weight: 400, id: "test_gun:part_barrel", min: 1, max: 2 },
      { weight: 400, id: "test_gun:part_receiver", min: 1, max: 2 },
      { weight: 350, id: "test_gun:part_stock", min: 1, max: 2 },
      { weight: 300, id: "test_gun:part_drum_mag", min: 1, max: 1 },
      { weight: 250, id: "test_gun:part_heavy_barrel", min: 1, max: 1 },
      { weight: 250, id: "test_gun:part_ceramic_plate", min: 1, max: 1 },
      { weight: 250, id: "test_gun:part_kevlar_sheet", min: 1, max: 1 },
      { weight: 200, id: "test_gun:part_shield_frame", min: 1, max: 1 },
      { weight: 40, id: "test_gun:blueprint_arx", min: 1, max: 1, name: "§9ARX 蓝图" },
      { weight: 40, id: "test_gun:blueprint_scarh", min: 1, max: 1, name: "§9SCAR-H 蓝图" },
      { weight: 40, id: "test_gun:blueprint_svd", min: 1, max: 1, name: "§9SVD 蓝图" },
      { weight: 40, id: "test_gun:blueprint_deagle", min: 1, max: 1, name: "§9沙漠之鹰蓝图" },
      { weight: 40, id: "test_gun:blueprint_rpk", min: 1, max: 1, name: "§9RPK 蓝图" }
    ]
  }
});

export const LOOT_CRATE_BLOCKS = Object.freeze({
  "daily:loot_crate_scavenger": "scavenger",
  "daily:loot_crate_common": "common",
  "daily:loot_crate_rare": "rare",
  "daily:loot_crate_epic": "epic",
  "daily:loot_crate_legendary": "legendary",
  "daily:loot_crate_mythic": "mythic"
});
