export const LOOT_CRATE_POOLS = Object.freeze({
  scavenger: {
    resetMinutes: 30, rolls: [2, 4], coins: [1, 1000],
    entries: [
      { weight: 1700, id: "minecraft:rotten_flesh", min: 1, max: 8 },
      { weight: 1300, id: "minecraft:bone", min: 1, max: 8 },
      { weight: 1000, id: "minecraft:string", min: 1, max: 6 },
      { weight: 1000, id: "minecraft:stick", min: 1, max: 12 },
      { weight: 900, id: "minecraft:paper", min: 1, max: 8 },
      { weight: 700, id: "minecraft:glass_bottle", min: 1, max: 4 },
      { weight: 600, id: "minecraft:leather", min: 1, max: 4 },
      { weight: 700, id: "minecraft:iron_nugget", min: 2, max: 12 },
      { weight: 600, id: "minecraft:coal", min: 1, max: 8 },
      { weight: 500, id: "minecraft:gunpowder", min: 1, max: 5 },
      { weight: 300, id: "minecraft:copper_ingot", min: 1, max: 4 },
      { weight: 250, id: "minecraft:iron_ingot", min: 1, max: 3 },
      { weight: 150, id: "minecraft:redstone", min: 1, max: 5 },
      { weight: 100, id: "minecraft:bread", min: 1, max: 2 },
      { weight: 35, id: "test_gun:part_barrel", min: 1, max: 1 },
      { weight: 35, id: "test_gun:part_receiver", min: 1, max: 1 },
      { weight: 35, id: "test_gun:part_stock", min: 1, max: 1 },
      { weight: 40, id: "test_gun:ammo_rifle", min: 8, max: 20 },
      { weight: 20, id: "minecraft:golden_apple", min: 1, max: 1 },
      { weight: 10, id: "daily:mythic_supply_key", min: 1, max: 1, name: "§d神话补给密钥" },
      { weight: 5, id: "test_gun:blueprint_m82", min: 1, max: 1, name: "§5M82 Epic 蓝图" },
      { weight: 5, id: "test_gun:blueprint_rpg", min: 1, max: 1, name: "§5RPG-7 Epic 蓝图" },
      { weight: 5, id: "test_gun:blueprint_riot_shield", min: 1, max: 1, name: "§5战术反甲防暴盾 Epic 蓝图" },
      { weight: 5, id: "test_gun:blueprint_katana", min: 1, max: 1, name: "§5武士刀 Epic 蓝图" },
      { weight: 5, id: "test_gun:blueprint_kukri_machete", min: 1, max: 1, name: "§5弯刀 Epic 蓝图" }
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
      { weight: 20, id: "test_gun:blueprint_pkm", min: 1, max: 1, name: "§5【限定 Epic】PKM 蓝图" },
      { weight: 20, id: "test_gun:blueprint_usas12", min: 1, max: 1, name: "§5【限定 Epic】USAS-12 蓝图" },
      { weight: 20, id: "test_gun:blueprint_m1014_ward", min: 1, max: 1, name: "§5【限定 Epic】M1014 泰坦壁垒蓝图" },
      { weight: 20, id: "test_gun:blueprint_flash_shield", min: 1, max: 1, name: "§5【限定 Epic】G52 闪光盾蓝图" },
      { weight: 20, id: "test_gun:blueprint_titan_chest", min: 1, max: 1, name: "§5【限定 Epic】泰坦外骨骼蓝图" }
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
