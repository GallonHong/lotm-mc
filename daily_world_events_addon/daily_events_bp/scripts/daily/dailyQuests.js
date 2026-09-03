export const DAILY_QUEST_REGISTRY = Object.freeze({
  collect_logs_32: { type: "inventory", title: "收集木材 ×32", targetId: "logs", required: 32, activity: 25, rewardId: "daily_collect" },
  collect_logs_48: { type: "inventory", title: "收集木材 ×48", targetId: "logs", required: 48, activity: 25, rewardId: "daily_collect" },
  collect_rotten: { type: "inventory", title: "收集腐肉 ×24", targetId: "rotten", required: 24, activity: 25, rewardId: "daily_collect" },
  collect_slime: { type: "inventory", title: "收集粘液球 ×8", targetId: "slime", required: 8, activity: 25, rewardId: "daily_collect" },
  collect_leather: { type: "inventory", title: "收集皮革 ×12", targetId: "leather", required: 12, activity: 25, rewardId: "daily_collect" },
  collect_bones: { type: "inventory", title: "收集骨头 ×24", targetId: "bones", required: 24, activity: 25, rewardId: "daily_collect" },
  kill_hostile: { type: "kill", title: "击杀敌对怪物 ×15", targetId: "hostile", required: 15, activity: 25, rewardId: "daily_kill" },
  kill_t2: { type: "kill", title: "击杀 T2 以上怪物 ×8", targetId: "t2plus", required: 8, activity: 25, rewardId: "daily_kill" },
  kill_elite_2: { type: "kill", title: "击杀精英 ×2", targetId: "elite", required: 2, activity: 25, rewardId: "daily_kill" },
  world_event: { type: "world_event", title: "完成任意动态事件 ×1", targetId: "any", required: 1, activity: 25, rewardId: "daily_event" },
  complete_dungeon: { type: "dungeon", title: "完成 1 次副本", targetId: "any", required: 1, activity: 25, rewardId: "daily_comprehensive" },
  craft_ammo_100: { type: "craft_group", title: "制造 100 发子弹", targetId: "ammo", required: 100, activity: 25, rewardId: "daily_comprehensive" },
  craft_weapon: { type: "craft_group", title: "制作 1 件武器", targetId: "weapon", required: 1, activity: 25, rewardId: "daily_comprehensive" },
  obtain_parts: { type: "inventory", title: "获得 3 件枪械半成品", targetId: "gun_parts", required: 3, activity: 25, rewardId: "daily_comprehensive" },
  open_crates: { type: "loot_crate", title: "打开 5 个野外物资箱", targetId: "any", required: 5, activity: 25, rewardId: "daily_comprehensive" },
  kill_boss: { type: "boss_kill", title: "击杀 1 个 Boss", targetId: "boss", required: 1, activity: 25, rewardId: "daily_comprehensive" }
});

export const QUEST_POOLS = Object.freeze({
  collect: ["collect_logs_32", "collect_logs_48", "collect_rotten", "collect_slime", "collect_leather", "collect_bones"],
  kill: ["kill_hostile", "kill_t2", "kill_elite_2"],
  comprehensive: ["complete_dungeon", "craft_ammo_100", "craft_weapon", "obtain_parts", "open_crates", "kill_boss"]
});
