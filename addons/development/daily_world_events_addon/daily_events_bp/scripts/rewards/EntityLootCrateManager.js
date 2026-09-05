import { ItemStack, world } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { DailyQuestManager } from "../daily/DailyQuestManager.js";
import { HopePostManager } from "../events/HopePostManager.js";
import { IntegrationBridge } from "../integration/IntegrationBridge.js";
import { RewardManager } from "./RewardManager.js";
import { DUNGEON_EPIC_BLUEPRINTS } from "./rewards.js";
import { ENTITY_LOOT_CRATE_POOLS } from "./lootCratePools.js";

const ENTITY_TIER_BY_ID = Object.freeze({
  "daily:random_crate_common": "common",
  "daily:random_crate_advanced": "advanced"
});

const ENTITY_ID_BY_TIER = Object.freeze({
  common: "daily:random_crate_common",
  advanced: "daily:random_crate_advanced"
});

const FORBIDDEN_SURFACE_MARKERS = ["water", "lava", "leaves", "snow_layer", "fire", "cactus"];

function randomInt(min, max) {
  const low = Math.floor(Number(min) || 0);
  const high = Math.max(low, Math.floor(Number(max) || low));
  return low + Math.floor(Math.random() * (high - low + 1));
}

function chooseWeighted(entries) {
  const valid = (entries || []).filter(entry => Number(entry.weight) > 0);
  const total = valid.reduce((sum, entry) => sum + Number(entry.weight), 0);
  if (!total) return null;
  let roll = Math.random() * total;
  for (const entry of valid) {
    roll -= Number(entry.weight);
    if (roll <= 0) return entry;
  }
  return valid.at(-1) || null;
}

function rollCoins(ranges) {
  const range = chooseWeighted(ranges);
  return range ? randomInt(range.min, range.max) : 0;
}

function hashChunk(chunkX, chunkZ, salt = 0) {
  let value = Math.imul(chunkX | 0, 0x45d9f3b) ^ Math.imul(chunkZ | 0, 0x119de1f3) ^ Math.imul(salt | 0, 0x27d4eb2d);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
}

function chunkKey(location) {
  return `${Math.floor(Number(location.x) / 16)}:${Math.floor(Number(location.z) / 16)}`;
}

function sameOverworld(dimensionId) {
  return String(dimensionId || "").replace("minecraft:", "") === "overworld";
}

function isAir(block) {
  const id = String(block?.typeId || "");
  return block?.isAir === true || id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air";
}

function distanceSquared(a, b) {
  const dx = Number(a.x) - Number(b.x);
  const dy = Number(a.y) - Number(b.y);
  const dz = Number(a.z) - Number(b.z);
  return dx * dx + dy * dy + dz * dz;
}

export class EntityLootCrateManager {
  static cooldowns = new Map();
  static claiming = new Set();

  static initialize() {
    try {
      const saved = JSON.parse(String(world.getDynamicProperty(CONFIG.entityCrateCooldownsKey) || "[]"));
      if (Array.isArray(saved)) this.cooldowns = new Map(saved.filter(entry => Array.isArray(entry) && Number(entry[1]) > Date.now()));
    } catch { this.cooldowns = new Map(); }
  }

  static saveCooldowns() {
    const now = Date.now();
    const active = [...this.cooldowns].filter(([, readyAt]) => Number(readyAt) > now).slice(-CONFIG.entityCrateCooldownLimit);
    this.cooldowns = new Map(active);
    try { world.setDynamicProperty(CONFIG.entityCrateCooldownsKey, JSON.stringify(active)); } catch {}
  }

  static tier(entity) {
    return ENTITY_TIER_BY_ID[entity?.typeId] || null;
  }

  static isCrate(entity) {
    return !!this.tier(entity);
  }

  static closeEnough(player, entity) {
    try {
      return player.dimension.id === entity.dimension.id && distanceSquared(player.location, entity.location) <= CONFIG.entityCrateInteractionDistance ** 2 + 0.000001;
    } catch { return false; }
  }

  static bundle(tier) {
    const pool = ENTITY_LOOT_CRATE_POOLS[tier];
    if (!pool) return null;
    const countRule = chooseWeighted(pool.rollCounts);
    const itemLimit = Math.max(1, Math.floor(Number(pool.maxItems) || 1));
    const rolledCount = Math.min(itemLimit, Math.max(1, Math.floor(Number(countRule?.count) || 1)));
    const epic = Number(pool.bonusEpicBlueprintChance || 0) > 0 && Math.random() < Number(pool.bonusEpicBlueprintChance);
    const regularSlots = Math.max(0, rolledCount - (epic ? 1 : 0));
    const items = [];
    for (let index = 0; index < regularSlots; index++) {
      const entry = chooseWeighted(pool.entries);
      if (!entry) continue;
      const amount = randomInt(entry.min, entry.max);
      const existing = items.find(item => item.id === entry.id && String(item.name || "") === String(entry.name || ""));
      if (existing) existing.amount = Math.min(64, existing.amount + amount);
      else items.push({ id: entry.id, amount, ...(entry.name ? { name: entry.name } : {}) });
    }
    if (epic && DUNGEON_EPIC_BLUEPRINTS.length) {
      items.push({ ...DUNGEON_EPIC_BLUEPRINTS[Math.floor(Math.random() * DUNGEON_EPIC_BLUEPRINTS.length)] });
    }
    return { id: `entity_loot_crate_${tier}`, coins: rollCoins(pool.coins), items: items.slice(0, itemLimit), epic };
  }

  static spawnDrop(dimension, location, entry) {
    try {
      const stack = RewardManager.makeStack(entry);
      dimension.spawnItem(stack, { x: location.x, y: location.y + 0.45, z: location.z });
      return true;
    } catch {
      try {
        dimension.spawnItem(new ItemStack("minecraft:iron_nugget", 1), { x: location.x, y: location.y + 0.45, z: location.z });
      } catch {}
      return false;
    }
  }

  static interact(player, entity) {
    const tier = this.tier(entity);
    if (!tier || !player) return false;
    if (!this.closeEnough(player, entity)) {
      try { player.sendMessage("§c必须站在随机物资箱 1 格以内才能开启。"); } catch {}
      return true;
    }
    if (this.claiming.has(entity.id)) return true;
    try {
      if (entity.hasTag("daily_entity_crate_claimed")) return true;
      entity.addTag("daily_entity_crate_claimed");
    } catch { return true; }
    this.claiming.add(entity.id);
    const location = { ...entity.location };
    const pool = ENTITY_LOOT_CRATE_POOLS[tier];
    const bundle = this.bundle(tier);
    const uniqueId = `entity_crate:${entity.id}`;
    if (!bundle || !RewardManager.reserve(player, uniqueId)) {
      try { entity.remove(); } catch {}
      this.claiming.delete(entity.id);
      return true;
    }
    const coinResult = RewardManager.addCoins(player, bundle.coins);
    let spawned = 0;
    for (const entry of bundle.items) if (this.spawnDrop(entity.dimension, location, entry)) spawned++;
    RewardManager.log(player, uniqueId, bundle.id, `entity_loot_crate:${tier}`, coinResult);
    DailyQuestManager.onLootCrateOpened(player, tier === "advanced" ? "rare" : "common");
    HopePostManager.record(player, "crates", 1);
    const key = chunkKey(location);
    this.cooldowns.set(key, Date.now() + Number(pool.cooldownMinutes || 30) * 60000);
    this.saveCooldowns();
    try { entity.dimension.playSound(tier === "advanced" ? "random.levelup" : "random.pop", location); } catch {}
    try { entity.dimension.spawnParticle("minecraft:totem_particle", { x: location.x, y: location.y + 0.6, z: location.z }); } catch {}
    try { entity.remove(); } catch {}
    this.claiming.delete(entity.id);
    player.sendMessage(`§6[${pool.label}] 获得 ${bundle.coins} 金币，掉落 ${spawned} 类物资${bundle.epic ? " §d（发现 Epic 蓝图！）" : ""}。`);
    return true;
  }

  static findSurface(dimension, chunkX, chunkZ) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const value = hashChunk(chunkX, chunkZ, 0x51f15e + attempt);
      const x = chunkX * 16 + 2 + (value % 12);
      const z = chunkZ * 16 + 2 + ((value >>> 8) % 12);
      try {
        const top = dimension.getTopmostBlock({ x, z });
        if (!top) continue;
        const supportId = String(top.typeId || "");
        if (FORBIDDEN_SURFACE_MARKERS.some(marker => supportId.includes(marker))) continue;
        const feet = dimension.getBlock({ x, y: top.location.y + 1, z });
        const head = dimension.getBlock({ x, y: top.location.y + 2, z });
        if (!isAir(feet) || !isAir(head)) continue;
        return { x: x + 0.5, y: top.location.y + 1, z: z + 0.5 };
      } catch {}
    }
    return null;
  }

  static selectedTier(chunkX, chunkZ, zoneType) {
    if (zoneType === "safe") return null;
    if (zoneType === "outlaw" && hashChunk(chunkX, chunkZ, 0xada11ced) % 20 === 0) return "advanced";
    if (hashChunk(chunkX, chunkZ, 0xc011ec7) % 6 === 0) return "common";
    return null;
  }

  static scanAndSpawn() {
    const players = world.getAllPlayers().filter(player => sameOverworld(player.dimension?.id));
    if (!players.length) return 0;
    let dimension;
    try { dimension = world.getDimension("minecraft:overworld"); } catch { return 0; }
    let loadedCrates = [];
    try { loadedCrates = dimension.getEntities({ tags: ["daily_random_crate"] }); } catch {}
    if (loadedCrates.length >= CONFIG.entityCrateMaxLoaded) return 0;
    const occupied = new Set(loadedCrates.map(entity => chunkKey(entity.location)));
    const candidates = new Map();
    for (const player of players) {
      const centerX = Math.floor(Number(player.location.x) / 16);
      const centerZ = Math.floor(Number(player.location.z) / 16);
      for (let dx = -CONFIG.entityCrateScanRadiusChunks; dx <= CONFIG.entityCrateScanRadiusChunks; dx++) {
        for (let dz = -CONFIG.entityCrateScanRadiusChunks; dz <= CONFIG.entityCrateScanRadiusChunks; dz++) {
          const key = `${centerX + dx}:${centerZ + dz}`;
          if (!candidates.has(key)) candidates.set(key, { chunkX: centerX + dx, chunkZ: centerZ + dz });
        }
      }
    }
    let spawned = 0;
    for (const candidate of candidates.values()) {
      if (spawned >= CONFIG.entityCrateSpawnsPerScan || loadedCrates.length + spawned >= CONFIG.entityCrateMaxLoaded) break;
      const key = `${candidate.chunkX}:${candidate.chunkZ}`;
      if (occupied.has(key) || Number(this.cooldowns.get(key) || 0) > Date.now()) continue;
      const location = this.findSurface(dimension, candidate.chunkX, candidate.chunkZ);
      if (!location) continue;
      if (players.some(player => distanceSquared(player.location, location) < CONFIG.entityCrateMinSpawnDistance ** 2)) continue;
      const zone = IntegrationBridge.resolveZone(dimension.id, location);
      const tier = this.selectedTier(candidate.chunkX, candidate.chunkZ, zone.type);
      if (!tier) continue;
      try {
        const entity = dimension.spawnEntity(ENTITY_ID_BY_TIER[tier], location);
        entity.addTag("daily_random_crate");
        entity.addTag(`daily_random_crate_${tier}`);
        entity.nameTag = ENTITY_LOOT_CRATE_POOLS[tier].label;
        occupied.add(key);
        spawned++;
      } catch (error) { console.warn(`[DailyEvents][EntityCrate] ${tier} spawn failed: ${error}`); }
    }
    if (this.cooldowns.size > CONFIG.entityCrateCooldownLimit) this.saveCooldowns();
    return spawned;
  }
}
