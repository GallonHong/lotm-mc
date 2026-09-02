export const LOOT_CRATE_POOLS = Object.freeze({
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
    resetMinutes: 60, rolls: 4, coins: [700, 1500],
    entries: [
      { weight: 28, id: "minecraft:iron_block", min: 1, max: 2 },
      { weight: 24, id: "minecraft:gold_ingot", min: 2, max: 5 },
      { weight: 20, id: "minecraft:diamond", min: 1, max: 2 },
      { weight: 18, id: "minecraft:amethyst_shard", min: 3, max: 7 },
      { weight: 10, id: "minecraft:enchanted_golden_apple", min: 1, max: 1 }
    ]
  },
  legendary: {
    resetMinutes: 120, rolls: 5, coins: [1500, 3500],
    entries: [
      { weight: 26, id: "minecraft:diamond", min: 2, max: 5 },
      { weight: 25, id: "minecraft:emerald_block", min: 1, max: 2 },
      { weight: 20, id: "minecraft:golden_apple", min: 2, max: 5 },
      { weight: 15, id: "minecraft:netherite_scrap", min: 1, max: 2 },
      { weight: 10, id: "minecraft:nether_star", min: 1, max: 1 },
      { weight: 4, id: "minecraft:echo_shard", min: 1, max: 1, name: "§d神话补给卡（MVP）" }
    ]
  },
  mythic: {
    resetMinutes: 240,
    rolls: 1,
    coins: [0, 0],
    requiredKey: { id: "minecraft:echo_shard", name: "神话补给卡（MVP）" },
    entries: [
      { weight: 70, id: "test_gun:blueprint_mgl", min: 1, max: 1, name: "§d【神话图纸】MGL" },
      { weight: 30, id: "test_gun:blueprint_riot_shield", min: 1, max: 1, name: "§d【神话图纸】重装防爆盾" }
    ]
  }
});

export const LOOT_CRATE_BLOCKS = Object.freeze({
  "daily:loot_crate_common": "common",
  "daily:loot_crate_rare": "rare",
  "daily:loot_crate_epic": "epic",
  "daily:loot_crate_legendary": "legendary",
  "daily:loot_crate_mythic": "mythic"
});
