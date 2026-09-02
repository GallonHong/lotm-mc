export const CONFIG = Object.freeze({
  version: "0.6.1",
  timezoneOffsetHours: 8,
  heartbeatKey: "interop:daily_events_heartbeat",
  heartbeatMaxAgeMs: 30000,
  playerStateKey: "daily:quest_state:v1",
  playerHistoryKey: "daily:quest_history:v1",
  claimedRewardsKey: "daily:claimed_rewards:v1",
  pendingRewardsKey: "daily:pending_rewards:v1",
  rewardLogKey: "daily:reward_log:v1",
  lootCrateStatePrefix: "daily:loot_crate:v1:",
  lootCrateResetScanTicks: 100,
  lootCratePlayerSafeRadius: 8,
  eventNodesKey: "daily:event_nodes:v1",
  apocalypseHeartbeatKey: "apoc:heartbeat",
  apocalypseSpawnQueueKey: "apoc:spawn_requests:v1",
  sapiRegionsKey: "sapi:server:regions:v1",
  sapiWarpsKey: "sapi:server:warps:v1",
  apocalypseZonesKey: "apoc:zones:v1",
  sapiSalesKey: "interop:daily_sales:v1",
  eventScanTicks: 100,
  eventTickTicks: 20,
  eventJoinRadius: 60,
  eventTimeoutTicks: 3600,
  eventMaxEntities: 24,
  defaultNodeCooldownMinutes: 20,
  fallbackSafeRadius: 64,
  participantMinScore: 3,
  taskCount: 4
});

export const ACTIVITY_MILESTONES = Object.freeze([
  { value: 20, rewardId: "activity_20" },
  { value: 50, rewardId: "activity_50" },
  { value: 80, rewardId: "activity_80" },
  { value: 100, rewardId: "activity_100" }
]);

export const COLLECT_GROUPS = Object.freeze({
  logs: ["minecraft:oak_log", "minecraft:spruce_log", "minecraft:birch_log", "minecraft:jungle_log", "minecraft:acacia_log", "minecraft:dark_oak_log", "minecraft:mangrove_log", "minecraft:cherry_log"],
  iron: ["minecraft:iron_ore", "minecraft:deepslate_iron_ore", "minecraft:raw_iron_block"],
  herbs: ["minecraft:wheat", "minecraft:dandelion", "minecraft:poppy", "minecraft:azure_bluet", "minecraft:cornflower"]
});

export const MOB_TARGETS = Object.freeze({
  basic: ["apoc:infected_basic", "minecraft:zombie"],
  runner: ["apoc:infected_runner", "minecraft:husk"],
  mutant: ["apoc:infected_mutant"],
  heavy: ["apoc:infected_heavy"],
  elite: ["apoc:infected_mutant", "apoc:infected_heavy", "apoc:infected_spitter"]
});
