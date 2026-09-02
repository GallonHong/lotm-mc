export const REWARD_REGISTRY = Object.freeze({
  daily_collect: { coins: 600, items: [{ id: "minecraft:redstone", amount: 2, name: "机械研究数据（MVP）" }] },
  daily_kill: { coins: 700, items: [{ id: "minecraft:iron_ingot", amount: 2, name: "枪械维修材料（MVP）" }] },
  daily_event: { coins: 800, items: [{ id: "minecraft:amethyst_shard", amount: 2, name: "Epic 研究数据（MVP）" }] },
  daily_craft: { coins: 650, items: [{ id: "minecraft:paper", amount: 4, name: "蓝图研究纸（MVP）" }] },
  daily_repair: { coins: 650, items: [{ id: "minecraft:iron_ingot", amount: 3, name: "维修材料（MVP）" }] },
  daily_sell: { coins: 800, items: [{ id: "minecraft:emerald", amount: 2, name: "贸易凭证（MVP）" }] },
  daily_elite: { coins: 900, items: [{ id: "minecraft:amethyst_shard", amount: 2, name: "精英研究数据（MVP）" }] },
  activity_20: { coins: 0, items: [{ id: "minecraft:iron_ingot", amount: 3, name: "基础材料包（MVP）" }, { id: "minecraft:string", amount: 4 }] },
  activity_50: { coins: 300, items: [{ id: "minecraft:iron_ingot", amount: 4, name: "维修材料（MVP）" }] },
  activity_80: { coins: 400, items: [{ id: "minecraft:amethyst_shard", amount: 3, name: "Epic 研究数据（MVP）" }] },
  activity_100: { coins: 600, items: [{ id: "minecraft:name_tag", amount: 1, name: "Epic Research Ticket（MVP）" }] },
  event_infected_attack: { coins: 700, items: [{ id: "minecraft:rotten_flesh", amount: 4 }, { id: "minecraft:iron_nugget", amount: 6 }] },
  event_infected_attack_outlaw: { coins: 1200, items: [{ id: "minecraft:iron_ingot", amount: 4 }, { id: "minecraft:redstone", amount: 4 }] },
  event_survivor_rescue: { coins: 800, items: [{ id: "minecraft:honey_bottle", amount: 2 }, { id: "minecraft:bread", amount: 3 }] },
  event_survivor_rescue_outlaw: { coins: 1300, items: [{ id: "minecraft:golden_apple", amount: 1 }, { id: "minecraft:honey_bottle", amount: 3 }] },
  event_raider_ambush: { coins: 1000, items: [{ id: "minecraft:arrow", amount: 16, name: "弹药（MVP）" }, { id: "minecraft:iron_ingot", amount: 3 }] },
  event_raider_ambush_outlaw: { coins: 1700, items: [{ id: "minecraft:arrow", amount: 32, name: "弹药（MVP）" }, { id: "minecraft:iron_block", amount: 1 }] },
  event_crashed_convoy: { coins: 1200, items: [{ id: "minecraft:amethyst_shard", amount: 2 }, { id: "minecraft:redstone", amount: 5 }] },
  event_crashed_convoy_outlaw: { coins: 2200, items: [{ id: "minecraft:amethyst_shard", amount: 5 }, { id: "minecraft:diamond", amount: 1 }] },
  event_roadblock_clearance: { coins: 850, items: [{ id: "minecraft:iron_ingot", amount: 3 }, { id: "minecraft:coal", amount: 8 }] },
  event_roadblock_clearance_outlaw: { coins: 1450, items: [{ id: "minecraft:iron_block", amount: 1 }, { id: "minecraft:arrow", amount: 24 }] },
  event_toxic_outbreak: { coins: 900, items: [{ id: "minecraft:honey_bottle", amount: 2 }, { id: "minecraft:redstone", amount: 3 }] },
  event_toxic_outbreak_outlaw: { coins: 1550, items: [{ id: "minecraft:golden_apple", amount: 1 }, { id: "minecraft:amethyst_shard", amount: 3 }] },
  event_mutant_nest_outlaw: { coins: 2000, items: [{ id: "minecraft:diamond", amount: 1 }, { id: "minecraft:amethyst_shard", amount: 4 }] },
  event_mercenary_blockade_outlaw: { coins: 2100, items: [{ id: "minecraft:arrow", amount: 32 }, { id: "minecraft:gold_ingot", amount: 4 }] },
  dungeon_abandoned_clinic: {
    coins: 1800,
    items: [
      { id: "minecraft:golden_apple", amount: 1, name: "医院急救物资（MVP）" },
      { id: "minecraft:amethyst_shard", amount: 4, name: "副本研究数据（MVP）" },
      { id: "minecraft:iron_ingot", amount: 6, name: "武器维护材料（MVP）" }
    ]
  },
  dungeon_newcomer_valley: {
    coins: 2000,
    items: [
      { id: "test_gun:blueprint_deagle", amount: 1, name: "§9沙漠之鹰 .50 制造图纸 [优良]§r" }
    ]
  },
  dungeon_outpost_defense: {
    coins: 1800,
    items: [
      { id: "minecraft:iron_ingot", amount: 8, name: "防线维修材料（MVP）" },
      { id: "minecraft:arrow", amount: 32, name: "通用弹药物资（MVP）" }
    ]
  },
  dungeon_storm_rescue: {
    coins: 2600,
    items: [
      { id: "minecraft:golden_apple", amount: 2, name: "黑雨医院医疗箱（MVP）" },
      { id: "minecraft:amethyst_shard", amount: 6, name: "高级感染研究数据（MVP）" }
    ]
  },
  dungeon_convoy_escort: {
    coins: 2200,
    items: [
      { id: "minecraft:iron_block", amount: 1, name: "车队机械零件箱（MVP）" },
      { id: "minecraft:redstone", amount: 12, name: "车辆电气组件（MVP）" }
    ]
  }
});
