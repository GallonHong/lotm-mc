export const CONFIG = Object.freeze({
  namespace: "apoc",
  overworld: "minecraft:overworld",
  extractionDimension: "apoc_extract:city",
  spawnInterval: 80,
  guardInterval: 20,
  aiInterval: 2,
  specialAIInterval: 4,
  builderCheckInterval: 20,
  builderCooldownTicks: 100,
  builderMaxBlocksPerMob: 6,
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
  externalSpawnRequestsKey: "apoc:spawn_requests:v1",
  dailyEventsHeartbeatKey: "interop:daily_events_heartbeat",
  defaultLootRespawnMinutes: 20
});

export const MOB_PROFILES = Object.freeze({
  basic: { typeId: "apoc:infected_basic", weight: 46, tier: 1, armorEligible: true, health: { law: 20, outlaw: 28, extraction: 40 } },
  runner: { typeId: "apoc:infected_runner", weight: 24, tier: 1, armorEligible: true, health: { law: 30, outlaw: 42, extraction: 54 } },
  spitter: { typeId: "apoc:infected_spitter", weight: 12, tier: 2, armorEligible: true, health: { law: 50, outlaw: 66, extraction: 86 } },
  shrieker: { typeId: "apoc:infected_shrieker", weight: 2, tier: 2, armorEligible: true, health: { law: 45, outlaw: 61, extraction: 85 } },
  charger: { typeId: "apoc:infected_charger", weight: 3, tier: 2, armorEligible: true, health: { law: 70, outlaw: 98, extraction: 138 } },
  hunter: { typeId: "apoc:infected_hunter", weight: 3, tier: 2, armorEligible: true, health: { law: 60, outlaw: 80, extraction: 116 } },
  mutant: { typeId: "apoc:infected_mutant", weight: 5, tier: 3, armorEligible: true, health: { law: 100, outlaw: 132, extraction: 172 } },
  heavy: { typeId: "apoc:infected_heavy", weight: 2, tier: 4, armorEligible: true, health: { law: 200, outlaw: 260, extraction: 340 } },
  tyrant: { typeId: "apoc:infected_tyrant", weight: 0, tier: 4, armorEligible: true, health: { law: 220, outlaw: 320, extraction: 480 } },
  broodmother: { typeId: "apoc:infected_broodmother", weight: 0, tier: 5, armorEligible: true, health: { law: 500, outlaw: 652, extraction: 852 } },
  raider: { typeId: "apoc:raider_rifleman", weight: 0, tier: 2, armorEligible: false, health: { law: 50, outlaw: 70, extraction: 80 } },
  guard: { typeId: "apoc:shelter_guard", weight: 0, tier: 3, armorEligible: false, health: { law: 150, outlaw: 150, extraction: 150 } }
});

export const ZONE_POOLS = Object.freeze({
  law: {
    maxPerPlayer: 10,
    pool: { basic: 48, runner: 24, spitter: 12, shrieker: 0, charger: 3, hunter: 3, mutant: 5, heavy: 2, tyrant: 0, broodmother: 0, raider: 0, guard: 0 }
  },
  outlaw: {
    maxPerPlayer: 14,
    pool: { basic: 24, runner: 20, spitter: 12, shrieker: 3, charger: 9, hunter: 9, mutant: 10, heavy: 7, tyrant: 2, broodmother: 0, raider: 8, guard: 0 }
  }
});

export const ZONE_DIFFICULTY = Object.freeze({
  law: { skillDamageMultiplier: 1.0, armorChance: 0.08, armorLabel: "零散防具" },
  outlaw: { skillDamageMultiplier: 1.3, armorChance: 0.28, armorLabel: "战术防具" },
  extraction: { skillDamageMultiplier: 1.65, armorChance: 0.48, armorLabel: "高阶防具" }
});

export const ARMOR_POOLS = Object.freeze({
  law: {
    head: ["minecraft:leather_helmet", "minecraft:chainmail_helmet", "minecraft:golden_helmet"],
    chest: ["minecraft:leather_chestplate", "minecraft:chainmail_chestplate", "test_gun:armor_vest_light"],
    legs: ["minecraft:leather_leggings", "minecraft:chainmail_leggings"],
    feet: ["minecraft:leather_boots", "minecraft:chainmail_boots"]
  },
  outlaw: {
    head: ["minecraft:chainmail_helmet", "minecraft:iron_helmet", "test_gun:armor_helmet_tactical"],
    chest: ["minecraft:iron_chestplate", "test_gun:armor_vest_light", "test_gun:armor_vest_heavy"],
    legs: ["minecraft:chainmail_leggings", "minecraft:iron_leggings"],
    feet: ["minecraft:chainmail_boots", "minecraft:iron_boots"]
  },
  extraction: {
    head: ["minecraft:diamond_helmet", "minecraft:netherite_helmet", "test_gun:armor_helmet_tactical"],
    chest: ["minecraft:diamond_chestplate", "minecraft:netherite_chestplate", "test_gun:armor_vest_heavy", "test_gun:armor_titan_chest"],
    legs: ["minecraft:diamond_leggings", "minecraft:netherite_leggings"],
    feet: ["minecraft:diamond_boots", "minecraft:netherite_boots"]
  }
});

export const NPC_WEAPONS = Object.freeze({
  "test_gun:ak47": {
    gunId: "test_gun:ak47",
    projectileId: "test_gun:bullet_rifle",
    shootSound: "test_gun.ak47_shoot",
    damage: 15.0,
    speed: 3.5,
    burst: 4,
    burstInterval: 3,
    cooldown: 25,
    aimTicks: 15,
    magazine: 30,
    reloadTicks: 45,
    minRange: 0,
    maxRange: 35,
    accuracy: 0.75
  },
  "test_gun:shotgun": {
    gunId: "test_gun:shotgun",
    projectileId: "test_gun:bullet_shotgun",
    shootSound: "test_gun.m870_shoot",
    damage: 7.5,
    speed: 2.8,
    burst: 1,
    burstInterval: 1,
    cooldown: 20,
    aimTicks: 12,
    magazine: 8,
    reloadTicks: 50,
    minRange: 0,
    maxRange: 18,
    accuracy: 0.65
  },
  "test_gun:bizon": {
    gunId: "test_gun:bizon",
    projectileId: "test_gun:bullet_smg",
    shootSound: "test_gun.bizon_shoot",
    damage: 4.5,
    speed: 3.2,
    burst: 6,
    burstInterval: 2,
    cooldown: 20,
    aimTicks: 10,
    magazine: 45,
    reloadTicks: 40,
    minRange: 0,
    maxRange: 25,
    accuracy: 0.70
  },
  "test_gun:glock": {
    gunId: "test_gun:glock",
    projectileId: "test_gun:bullet_smg",
    shootSound: "test_gun.glock_shoot",
    damage: 4.5,
    speed: 3.0,
    burst: 3,
    burstInterval: 3,
    cooldown: 18,
    aimTicks: 8,
    magazine: 20,
    reloadTicks: 30,
    minRange: 0,
    maxRange: 22,
    accuracy: 0.70
  }
});

