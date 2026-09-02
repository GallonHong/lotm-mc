export const DAILY_QUEST_REGISTRY = Object.freeze({
  collect_logs: { type: "collect", title: "基础物资储备", targetId: "logs", required: 20, activity: 20, rewardId: "daily_collect" },
  collect_iron: { type: "collect", title: "机械材料", targetId: "iron", required: 12, activity: 20, rewardId: "daily_collect" },
  collect_herbs: { type: "collect", title: "医疗储备", targetId: "herbs", required: 8, activity: 20, rewardId: "daily_collect" },
  kill_basic: { type: "kill", title: "清理感染者", targetId: "basic", required: 15, activity: 20, rewardId: "daily_kill" },
  kill_runner: { type: "kill", title: "高速威胁", targetId: "runner", required: 8, activity: 20, rewardId: "daily_kill" },
  kill_mutant: { type: "kill", title: "变异清除", targetId: "mutant", required: 3, activity: 20, rewardId: "daily_kill" },
  kill_heavy: { type: "kill", title: "重型清理", targetId: "heavy", required: 2, activity: 20, rewardId: "daily_kill" },
  world_event: { type: "world_event", title: "区域支援", targetId: "any", required: 1, activity: 30, rewardId: "daily_event" },
  craft_blueprint: { type: "craft", title: "制造普通枪械蓝图", targetId: "minecraft:map", required: 1, activity: 30, rewardId: "daily_craft" },
  craft_ammo: { type: "craft", title: "制造弹药", targetId: "minecraft:arrow", required: 16, activity: 30, rewardId: "daily_craft" },
  repair_weapon: { type: "repair", title: "维护武器", targetId: "any", required: 1, activity: 30, rewardId: "daily_repair" },
  sell_resources: { type: "sell", title: "资源交易", targetId: "money", required: 2000, activity: 30, rewardId: "daily_sell" },
  kill_elite: { type: "kill", title: "精英威胁", targetId: "elite", required: 1, activity: 30, rewardId: "daily_elite" }
});

export const QUEST_POOLS = Object.freeze({
  collect: ["collect_logs", "collect_iron", "collect_herbs"],
  killNew: ["kill_basic", "kill_runner"],
  killMid: ["kill_basic", "kill_runner", "kill_mutant"],
  killHigh: ["kill_basic", "kill_runner", "kill_mutant", "kill_heavy"],
  random: ["craft_blueprint", "craft_ammo", "repair_weapon", "sell_resources", "kill_elite"]
});
