export const CONFIG = Object.freeze({
  namespace: "apoc",
  overworld: "minecraft:overworld",
  spawnInterval: 80,
  guardInterval: 20,
  aiInterval: 2,
  eventCheckInterval: 1200,
  eventChance: 0.18,
  eventCooldownTicks: 12000,
  spawnMinDistance: 20,
  spawnMaxDistance: 36,
  despawnDistance: 72,
  fallbackSafeRadius: 64,
  suppressVanillaHostiles: true,
  sapiRegionsKey: "sapi:server:regions:v1",
  sapiWarpsKey: "sapi:server:warps:v1",
  zonesKey: "apoc:zones:v1",
  lootNodesKey: "apoc:loot_nodes:v1",
  heartbeatKey: "apoc:heartbeat",
  defaultLootRespawnMinutes: 20
});

export const MOB_PROFILES = Object.freeze({
  basic: { typeId: "apoc:infected_basic", weight: 55, tier: 1 },
  runner: { typeId: "apoc:infected_runner", weight: 25, tier: 1 },
  spitter: { typeId: "apoc:infected_spitter", weight: 15, tier: 2 },
  mutant: { typeId: "apoc:infected_mutant", weight: 5, tier: 3 },
  heavy: { typeId: "apoc:infected_heavy", weight: 0, tier: 4 },
  raider: { typeId: "apoc:raider_rifleman", weight: 0, tier: 2 }
});

export const ZONE_POOLS = Object.freeze({
  law: {
    maxPerPlayer: 10,
    pool: { basic: 55, runner: 25, spitter: 14, mutant: 5, heavy: 1, raider: 0 }
  },
  outlaw: {
    maxPerPlayer: 14,
    pool: { basic: 25, runner: 25, spitter: 18, mutant: 18, heavy: 9, raider: 5 }
  }
});

export const NPC_WEAPONS = Object.freeze({
  raider_rifle: {
    damage: 3.5,
    burst: 4,
    burstInterval: 3,
    cooldown: 30,
    aimTicks: 20,
    magazine: 16,
    reloadTicks: 50,
    minRange: 7,
    maxRange: 35,
    accuracy: 0.55
  }
});
