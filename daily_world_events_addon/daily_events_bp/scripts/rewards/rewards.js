export const REWARD_REGISTRY = Object.freeze({
  daily_collect: { coins: 800, items: [] },
  daily_kill: { coins: 900, items: [] },
  daily_event: { coins: 1100, items: [] },
  daily_comprehensive: { coins: 1200, items: [] },
  activity_100: { coins: 2000, items: [] },
  event_infected_attack: { coins: 700, items: [{ id: "minecraft:rotten_flesh", amount: 4 }, { id: "minecraft:iron_nugget", amount: 6 }] },
  event_infected_attack_outlaw: { coins: 900, items: [{ id: "minecraft:iron_ingot", amount: 4 }, { id: "minecraft:redstone", amount: 4 }] },
  event_survivor_rescue: { coins: 800, items: [{ id: "minecraft:honey_bottle", amount: 2 }, { id: "minecraft:bread", amount: 3 }] },
  event_survivor_rescue_outlaw: { coins: 1000, items: [{ id: "minecraft:golden_apple", amount: 1 }, { id: "minecraft:honey_bottle", amount: 3 }] },
  event_raider_ambush: { coins: 1000, items: [{ id: "minecraft:arrow", amount: 16, name: "弹药（MVP）" }, { id: "minecraft:iron_ingot", amount: 3 }] },
  event_raider_ambush_outlaw: { coins: 1000, items: [{ id: "test_gun:ammo_rifle", amount: 32, name: "步枪弹药" }, { id: "minecraft:iron_block", amount: 1 }] },
  event_crashed_convoy: { coins: 900, items: [{ id: "minecraft:amethyst_shard", amount: 2 }, { id: "minecraft:redstone", amount: 5 }] },
  event_crashed_convoy_outlaw: { coins: 1000, items: [{ id: "minecraft:amethyst_shard", amount: 5 }, { id: "minecraft:diamond", amount: 1 }] },
  event_roadblock_clearance: { coins: 850, items: [{ id: "minecraft:iron_ingot", amount: 3 }, { id: "minecraft:coal", amount: 8 }] },
  event_roadblock_clearance_outlaw: { coins: 1000, items: [{ id: "minecraft:iron_block", amount: 1 }, { id: "test_gun:ammo_rifle", amount: 24 }] },
  event_toxic_outbreak: { coins: 900, items: [{ id: "minecraft:honey_bottle", amount: 2 }, { id: "minecraft:redstone", amount: 3 }] },
  event_toxic_outbreak_outlaw: { coins: 1000, items: [{ id: "minecraft:golden_apple", amount: 1 }, { id: "minecraft:amethyst_shard", amount: 3 }] },
  event_mutant_nest_outlaw: { coins: 1000, items: [{ id: "minecraft:diamond", amount: 1 }, { id: "test_gun:part_barrel", amount: 1 }] },
  event_mercenary_blockade_outlaw: { coins: 1000, items: [{ id: "test_gun:ammo_rifle", amount: 32 }, { id: "minecraft:gold_ingot", amount: 4 }] },
  event_fog_man_hunt: { coins: 1000, items: [{ id: "test_gun:part_kevlar_sheet", amount: 1 }, { id: "minecraft:amethyst_shard", amount: 5 }] },
  event_goatman_hunt: { coins: 1000, items: [{ id: "test_gun:part_heavy_barrel", amount: 1 }, { id: "minecraft:gold_ingot", amount: 5 }] },
  event_siren_head_hunt: { coins: 1000, items: [{ id: "test_gun:part_ion_thruster", amount: 1 }, { id: "minecraft:diamond", amount: 1 }] },
  event_rebel_invasion: { coins: 1000, items: [{ id: "minecraft:iron_block", amount: 1, name: "主城防卫物资" }, { id: "test_gun:ammo_rifle", amount: 32, name: "回收弹药" }] },
  dungeon_abandoned_clinic: {
    coins: 1200,
    items: [
      { id: "minecraft:golden_apple", amount: 1, name: "医院急救物资（MVP）" },
      { id: "test_gun:part_stock", amount: 1, name: "枪托" },
      { id: "test_gun:ammo_45acp", amount: 30, name: "冲锋枪弹药" }
    ]
  },
  dungeon_newcomer_valley: {
    coins: 2000,
    items: [
      { id: "test_gun:blueprint_deagle", amount: 1, name: "§9沙漠之鹰 .50 制造图纸 [优良]§r" }
    ]
  },
  dungeon_outpost_defense: {
    coins: 1200,
    items: [
      { id: "test_gun:part_receiver", amount: 1, name: "机匣" },
      { id: "test_gun:ammo_rifle", amount: 30, name: "步枪弹药" }
    ]
  },
  dungeon_storm_rescue: {
    coins: 2000,
    items: [
      { id: "minecraft:golden_apple", amount: 2, name: "黑雨医院医疗箱（MVP）" },
      { id: "test_gun:part_kevlar_sheet", amount: 2, name: "军规凯夫拉" },
      { id: "test_gun:ammo_shotgun", amount: 24, name: "霰弹药包" }
    ]
  },
  dungeon_convoy_escort: {
    coins: 1200,
    items: [
      { id: "survival_vehicle:scrap_metal", amount: 4, name: "载具金属零件" },
      { id: "survival_vehicle:vehicle_battery", amount: 1, name: "载具电池" }
    ]
  },
  dungeon_fogbound_hospital: {
    coins: 2500,
    items: [
      { id: "test_gun:part_ceramic_plate", amount: 2, name: "复合陶瓷插板" },
      { id: "test_gun:ammo_50cal", amount: 20, name: ".50 弹药" }
    ]
  },
  dungeon_redhorn_industrial: {
    coins: 2500,
    items: [
      { id: "test_gun:part_heavy_barrel", amount: 2, name: "重型加固合金枪管" },
      { id: "minecraft:iron_block", amount: 2, name: "工业区精炼铁块" }
    ]
  },
  dungeon_siren_blackout: {
    coins: 2500,
    items: [
      { id: "test_gun:part_ion_thruster", amount: 1, name: "离子推进器" },
      { id: "test_gun:ammo_battery", amount: 32, name: "能量电池" }
    ]
  },
  dungeon_drowned_pumpstation: {
    coins: 2500,
    items: [
      { id: "minecraft:heart_of_the_sea", amount: 1, name: "海洋之心" },
      { id: "test_gun:part_plasma_core", amount: 1, name: "特殊等离子核心" }
    ]
  },
  dungeon_mutation_gauntlet: {
    coins: 2500,
    items: [
      { id: "test_gun:part_exo_core", amount: 1, name: "外骨骼伺服核心" },
      { id: "minecraft:diamond", amount: 3, name: "实验场高价值材料" },
      { id: "test_gun:ammo_rocket", amount: 2, name: "高爆火箭" }
    ]
  }
});

export const DUNGEON_TIER_REWARDS = Object.freeze({
  normal: { firstCoins: 2000, repeatCoins: 1200, epicBlueprintChance: 0 },
  hard: { firstCoins: 3500, repeatCoins: 2000, epicBlueprintChance: 0.005 },
  nightmare: { firstCoins: 5000, repeatCoins: 2500, epicBlueprintChance: 0.015 }
});

export const DUNGEON_EPIC_BLUEPRINTS = Object.freeze([
  { id: "test_gun:blueprint_m82", amount: 1, name: "§5M82 Epic 蓝图" },
  { id: "test_gun:blueprint_rpg", amount: 1, name: "§5RPG-7 Epic 蓝图" },
  { id: "test_gun:blueprint_riot_shield", amount: 1, name: "§5战术反甲防暴盾 Epic 蓝图" },
  { id: "test_gun:blueprint_katana", amount: 1, name: "§5武士刀 Epic 蓝图" },
  { id: "test_gun:blueprint_kukri_machete", amount: 1, name: "§5弯刀 Epic 蓝图" }
]);
