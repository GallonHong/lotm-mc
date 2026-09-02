import { world } from "@minecraft/server";
import { CONFIG } from "../config.js";

function parseArray(raw) {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function sameDimension(a, b) {
  return String(a || "").replace("minecraft:", "") === String(b || "").replace("minecraft:", "");
}

function contains(region, dimensionId, location) {
  return sameDimension(region.dimension, dimensionId) && location.x >= region.min.x && location.x <= region.max.x &&
    location.y >= region.min.y && location.y <= region.max.y && location.z >= region.min.z && location.z <= region.max.z;
}

// Mirrors the built-in zones exported by Apocalypse Mobs. Administrator-created
// zones are still loaded from the shared dynamic property and take precedence.
const APOCALYPSE_PRESET_ZONES = Object.freeze([
  { name: "安全区 1", type: "safe", dimension: "minecraft:overworld", min: { x: 2349, y: -64, z: 1863 }, max: { x: 2635, y: 320, z: 2069 }, priority: 500 },
  { name: "安全区 2", type: "safe", dimension: "minecraft:overworld", min: { x: 2352, y: -64, z: 1165 }, max: { x: 2585, y: 320, z: 1303 }, priority: 500 },
  { name: "安全区 3", type: "safe", dimension: "minecraft:overworld", min: { x: 1942, y: -64, z: 1273 }, max: { x: 2087, y: 320, z: 1465 }, priority: 500 },
  { name: "法制区 1", type: "law", dimension: "minecraft:overworld", min: { x: 3450, y: -64, z: 2033 }, max: { x: 3869, y: 320, z: 2478 }, priority: 300 },
  { name: "法制区 2", type: "law", dimension: "minecraft:overworld", min: { x: 1687, y: -64, z: 2509 }, max: { x: 2250, y: 320, z: 3127 }, priority: 300 }
]);

function isAir(block) {
  const id = String(block?.typeId || "");
  return block?.isAir === true || id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air";
}

function findFallbackGround(dimension, center, angle, radius) {
  const x = Math.floor(center.x + Math.cos(angle) * radius);
  const z = Math.floor(center.z + Math.sin(angle) * radius);
  const baseY = Math.floor(center.y);
  for (let offset = 12; offset >= -24; offset--) {
    const y = baseY + offset;
    try {
      const floor = dimension.getBlock({ x, y: y - 1, z });
      const feet = dimension.getBlock({ x, y, z });
      const head = dimension.getBlock({ x, y: y + 1, z });
      const floorId = String(floor?.typeId || "");
      if (floor && !isAir(floor) && !floorId.includes("water") && !floorId.includes("lava") && isAir(feet) && isAir(head)) {
        return { x: x + 0.5, y, z: z + 0.5 };
      }
    } catch {}
  }
  return null;
}

export class IntegrationBridge {
  static cleanupStaleDailySpawnRequests() {
    try {
      const raw = world.getDynamicProperty(CONFIG.apocalypseSpawnQueueKey);
      const queue = parseArray(raw);
      const kept = queue.filter(request => !(request.tags || []).includes("daily_event_entity"));
      if (kept.length !== queue.length) world.setDynamicProperty(CONFIG.apocalypseSpawnQueueKey, JSON.stringify(kept));
    } catch {}
  }

  static isApocalypseAvailable() {
    try {
      const beat = Number(world.getDynamicProperty(CONFIG.apocalypseHeartbeatKey) || 0);
      return beat > 0 && Date.now() - beat < CONFIG.heartbeatMaxAgeMs;
    } catch { return false; }
  }

  static resolveZone(dimensionId, location) {
    const local = [...APOCALYPSE_PRESET_ZONES, ...parseArray(world.getDynamicProperty(CONFIG.apocalypseZonesKey))];
    const localZone = local.filter(zone => zone?.min && zone?.max && contains(zone, dimensionId, location))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
    if (localZone) {
      const type = ["safe", "law", "outlaw"].includes(localZone.type) ? localZone.type : "law";
      return { type, name: localZone.name || (type === "outlaw" ? "非法制区" : type === "safe" ? "安全区" : "法制区"), source: "apocalypse" };
    }
    const sapi = parseArray(world.getDynamicProperty(CONFIG.sapiRegionsKey));
    const sapiRegion = sapi.filter(region => region?.min && region?.max && contains(region, dimensionId, location))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
    if (sapiRegion) {
      if (sapiRegion.flags?.allowHostileSpawn !== true) return { type: "safe", name: sapiRegion.name || "SAPI 保护区", source: "sapi" };
      const configured = sapiRegion.flags?.zoneType || sapiRegion.zoneType || sapiRegion.type;
      const outlaw = configured === "outlaw" || sapiRegion.flags?.outlaw === true || sapiRegion.flags?.lawless === true;
      return { type: outlaw ? "outlaw" : "law", name: sapiRegion.name || (outlaw ? "非法制区" : "法制区"), source: "sapi" };
    }
    let spawn = parseArray(world.getDynamicProperty(CONFIG.sapiWarpsKey)).find(warp => warp?.id === "spawn" || warp?.isSpawn);
    if (!spawn) {
      try { spawn = { dimension: "minecraft:overworld", ...world.getDefaultSpawnLocation() }; } catch {}
    }
    if (!spawn || !sameDimension(spawn.dimension, dimensionId)) return { type: "outlaw", name: "非法制荒原", source: "default" };
    const dx = Number(location.x) - Number(spawn.x || 0);
    const dz = Number(location.z) - Number(spawn.z || 0);
    if (dx * dx + dz * dz <= CONFIG.fallbackSafeRadius * CONFIG.fallbackSafeRadius) return { type: "safe", name: "主城出生点", source: "spawn" };
    return { type: "outlaw", name: "非法制荒原", source: "default" };
  }

  static isSafeZone(dimensionId, location) {
    return this.resolveZone(dimensionId, location).type === "safe";
  }

  static enqueueSpawn(dimensionId, center, mobKey, count, tags, minDistance = 7, maxDistance = 15) {
    try {
      const raw = world.getDynamicProperty(CONFIG.apocalypseSpawnQueueKey);
      const queue = parseArray(raw);
      queue.push({
        id: `daily_spawn_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`,
        dimension: dimensionId,
        center,
        mobKey,
        count,
        tags,
        minDistance,
        maxDistance
      });
      world.setDynamicProperty(CONFIG.apocalypseSpawnQueueKey, JSON.stringify(queue.slice(-50)));
      return true;
    } catch { return false; }
  }

  static spawnFallback(dimension, center, mobKey, count, tags, minDistance = 7, maxDistance = 15) {
    const fallback = { basic: "minecraft:zombie", runner: "minecraft:husk", mutant: "minecraft:zombie", heavy: "minecraft:zombie", spitter: "minecraft:skeleton", raider: "minecraft:pillager" };
    let spawned = 0;
    for (let index = 0; index < count; index++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = minDistance + Math.random() * Math.max(1, maxDistance - minDistance);
      const location = findFallbackGround(dimension, center, angle, radius);
      if (!location) continue;
      try {
        const entity = dimension.spawnEntity(fallback[mobKey] || fallback.basic, location);
        for (const tag of tags) entity.addTag(tag);
        entity.addTag("daily_event_entity");
        if (mobKey === "runner") entity.addEffect("speed", 999999, { amplifier: 1, showParticles: false });
        if (mobKey === "heavy") entity.addEffect("resistance", 999999, { amplifier: 1, showParticles: false });
        spawned++;
      } catch {}
    }
    return spawned;
  }

  static spawnEventMobs(dimension, center, mobKey, count, tags, minDistance, maxDistance) {
    if (this.isApocalypseAvailable() && this.enqueueSpawn(dimension.id, center, mobKey, count, [...tags, "daily_event_entity"], minDistance, maxDistance)) return count;
    return this.spawnFallback(dimension, center, mobKey, count, tags, minDistance, maxDistance);
  }

  static getSalesTotal(playerName) {
    try {
      const raw = world.getDynamicProperty(CONFIG.sapiSalesKey);
      const totals = typeof raw === "string" ? JSON.parse(raw) : {};
      return Math.max(0, Math.floor(Number(totals[playerName]) || 0));
    } catch { return 0; }
  }
}
