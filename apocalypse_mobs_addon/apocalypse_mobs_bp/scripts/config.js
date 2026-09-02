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
  shrieker: { typeId: "apoc:infected_shrieker", weight: 5, tier: 2, armorEligible: true, health: { law: 45, outlaw: 61, extraction: 85 } },
  charger: { typeId: "apoc:infected_charger", weight: 3, tier: 2, armorEligible: true, health: { law: 70, outlaw: 98, extraction: 138 } },
  hunter: { typeId: "apoc:infected_hunter", weight: 3, tier: 2, armorEligible: true, health: { law: 60, outlaw: 80, extraction: 116 } },
  mutant: { typeId: "apoc:infected_mutant", weight: 5, tier: 3, armorEligible: true, health: { law: 100, outlaw: 132, extraction: 172 } },
  heavy: { typeId: "apoc:infected_heavy", weight: 2, tier: 4, armorEligible: true, health: { law: 200, outlaw: 260, extraction: 340 } },
  tyrant: { typeId: "apoc:infected_tyrant", weight: 0, tier: 4, armorEligible: true, health: { law: 220, outlaw: 320, extraction: 480 } },
  broodmother: { typeId: "apoc:infected_broodmother", weight: 0, tier: 5, armorEligible: true, health: { law: 500, outlaw: 652, extraction: 852 } },
  raider: { typeId: "apoc:raider_rifleman", weight: 0, tier: 2, armorEligible: false, health: { law: 50, outlaw: 62, extraction: 78 } }
});

export const ZONE_POOLS = Object.freeze({
  law: {
    maxPerPlayer: 10,
    pool: { basic: 46, runner: 24, spitter: 12, shrieker: 5, charger: 3, hunter: 3, mutant: 5, heavy: 2, tyrant: 0, broodmother: 0, raider: 0 }
  },
  outlaw: {
    maxPerPlayer: 14,
    pool: { basic: 20, runner: 18, spitter: 12, shrieker: 9, charger: 9, hunter: 9, mutant: 10, heavy: 7, tyrant: 2, broodmother: 0, raider: 4 }
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
