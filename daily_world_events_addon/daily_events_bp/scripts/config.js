export const CONFIG = Object.freeze({
  version: "0.15.1",
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
  spawnerScanChunkRadius: 1,
  spawnerSurfaceAbove: 6,
  spawnerSurfaceBelow: 6,
  spawnerPlayerAbove: 6,
  spawnerPlayerBelow: 12,
  spawnerScanBlocksPerTick: 1024,
  spawnerScanQueueLimit: 512,
  spawnerScanRememberChunks: 4096,
  crateBackfillEnabledKey: "daily:crate_backfill_enabled:v1",
  crateBackfillProcessedKey: "daily:crate_backfill_processed:v1",
  crateBackfillChunkRadius: 1,
  crateBackfillBlocksPerTick: 512,
  crateBackfillQueueLimit: 256,
  crateBackfillProcessedLimit: 2000,
  eventNodesKey: "daily:event_nodes:v1",
  newsArchiveKey: "daily:news_archive:v1",
  playerNewsSeenKey: "daily:news_seen_day:v1",
  newsArchiveLimit: 60,
  newsArrivalGraceTicks: 2400,
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
  { value: 100, rewardId: "activity_100" }
]);

export const COLLECT_GROUPS = Object.freeze({
  logs: ["minecraft:oak_log", "minecraft:spruce_log", "minecraft:birch_log", "minecraft:jungle_log", "minecraft:acacia_log", "minecraft:dark_oak_log", "minecraft:mangrove_log", "minecraft:cherry_log"],
  rotten: ["minecraft:rotten_flesh"], slime: ["minecraft:slime_ball"], leather: ["minecraft:leather"], bones: ["minecraft:bone"],
  gun_parts: ["test_gun:part_barrel", "test_gun:part_receiver", "test_gun:part_stock", "test_gun:part_drum_mag", "test_gun:part_heavy_barrel", "test_gun:part_ceramic_plate", "test_gun:part_kevlar_sheet", "test_gun:part_plasma_core", "test_gun:part_exo_core", "test_gun:part_ion_thruster", "test_gun:part_deflection_generator", "test_gun:part_military_fcu", "test_gun:part_tungsten_bolt"]
});

export const MOB_TARGETS = Object.freeze({
  hostile: ["apoc:infected_basic", "apoc:infected_runner", "apoc:infected_spitter", "apoc:infected_shrieker", "apoc:infected_charger", "apoc:infected_hunter", "apoc:infected_mutant", "apoc:infected_heavy", "minecraft:zombie", "minecraft:husk", "minecraft:skeleton", "minecraft:spider", "minecraft:creeper"],
  t2plus: ["apoc:infected_runner", "apoc:infected_spitter", "apoc:infected_shrieker", "apoc:infected_charger", "apoc:infected_hunter", "apoc:infected_mutant", "apoc:infected_heavy", "apoc:infected_tyrant", "apoc:infected_broodmother"],
  elite: ["apoc:infected_mutant", "apoc:infected_heavy", "apoc:infected_spitter", "apoc:infected_shrieker", "apoc:infected_charger", "apoc:infected_hunter", "apoc:infected_tyrant", "apoc:infected_broodmother"]
});

export const CRAFT_GROUPS = Object.freeze({
  ammo: ["test_gun:ammo_45acp", "test_gun:ammo_rifle", "test_gun:ammo_shotgun", "test_gun:ammo_belt_100", "test_gun:ammo_50cal", "test_gun:ammo_battery", "test_gun:ammo_40mm", "test_gun:ammo_rocket"],
  weapon: ["test_gun:ak47", "test_gun:ak74u", "test_gun:glock", "test_gun:deagle", "test_gun:scarh", "test_gun:arx", "test_gun:svd", "test_gun:m82", "test_gun:shotgun", "test_gun:m1897", "test_gun:m1014", "test_gun:m1014_ward", "test_gun:usas12", "test_gun:vector", "test_gun:p90", "test_gun:bizon", "test_gun:pkm", "test_gun:rpg", "test_gun:m79", "test_gun:mgl", "test_gun:arc_emitter"]
});
