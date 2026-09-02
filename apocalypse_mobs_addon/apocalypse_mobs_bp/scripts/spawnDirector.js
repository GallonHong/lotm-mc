import { world } from "@minecraft/server";
import { CONFIG, MOB_PROFILES, ZONE_POOLS } from "./config.js";
import { ZoneRegistry } from "./zones.js";

const VANILLA_HOSTILES = new Set([
  "minecraft:zombie", "minecraft:zombie_villager", "minecraft:husk", "minecraft:drowned",
  "minecraft:skeleton", "minecraft:stray", "minecraft:creeper", "minecraft:spider",
  "minecraft:cave_spider", "minecraft:witch", "minecraft:phantom", "minecraft:pillager",
  "minecraft:vindicator", "minecraft:ravager", "minecraft:evocation_illager"
]);

function isAir(block) {
  if (!block) return false;
  const id = String(block.typeId || "");
  return block.isAir === true || id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air";
}

function isLiquid(block) {
  const id = String(block?.typeId || "");
  return id.includes("water") || id.includes("lava");
}

function chooseWeighted(pool) {
  const entries = Object.entries(pool).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[0]?.[0] || "basic";
}

function distanceSquared(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

export class SpawnDirector {
  /** 可选跨包总线：由 Daily & Events Addon 请求，仍由本 SpawnDirector 落地实体。 */
  static processExternalRequests() {
    let requests = [];
    try {
      const raw = world.getDynamicProperty(CONFIG.externalSpawnRequestsKey);
      requests = typeof raw === "string" ? JSON.parse(raw) : [];
      if (!Array.isArray(requests) || requests.length === 0) return;
      world.setDynamicProperty(CONFIG.externalSpawnRequestsKey, "[]");
    } catch (error) {
      console.warn(`[Apocalypse][SpawnBus] 读取请求失败: ${error}`);
      return;
    }
    for (const request of requests.slice(0, 50)) {
      try {
        const dimension = world.getDimension(request.dimension || "overworld");
        const center = request.center;
        const count = Math.max(1, Math.min(20, Math.floor(Number(request.count) || 1)));
        const tags = Array.isArray(request.tags) ? request.tags.map(String).slice(0, 6) : [];
        for (let index = 0; index < count; index++) {
          const location = this.findGround(dimension, center, Number(request.minDistance) || 6, Number(request.maxDistance) || 14);
          if (location) this.spawnAt(dimension, location, String(request.mobKey || "basic"), tags);
        }
      } catch (error) {
        console.warn(`[Apocalypse][SpawnBus] 请求 ${request?.id || "unknown"} 失败: ${error}`);
      }
    }
  }

  static findGround(dimension, center, minDistance = CONFIG.spawnMinDistance, maxDistance = CONFIG.spawnMaxDistance) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = minDistance + Math.random() * (maxDistance - minDistance);
      const x = Math.floor(center.x + Math.cos(angle) * radius);
      const z = Math.floor(center.z + Math.sin(angle) * radius);
      const baseY = Math.floor(center.y);
      for (let offset = 14; offset >= -28; offset--) {
        const y = baseY + offset;
        try {
          const floor = dimension.getBlock({ x, y: y - 1, z });
          const feet = dimension.getBlock({ x, y, z });
          const head = dimension.getBlock({ x, y: y + 1, z });
          if (floor && !isAir(floor) && !isLiquid(floor) && isAir(feet) && isAir(head)) {
            return { x: x + 0.5, y, z: z + 0.5 };
          }
        } catch {}
      }
    }
    return null;
  }

  static spawnAt(dimension, location, mobKey, tags = []) {
    const profile = MOB_PROFILES[mobKey];
    if (!profile || ZoneRegistry.isSafe(dimension.id, location)) return null;
    try {
      const entity = dimension.spawnEntity(profile.typeId, location);
      entity.addTag("apoc_hostile");
      entity.addTag("apoc_director");
      entity.addTag(`apoc_tier_${profile.tier}`);
      for (const tag of tags) entity.addTag(tag);
      return entity;
    } catch (error) {
      console.warn(`[Apocalypse][Spawn] ${profile.typeId} 生成失败: ${error}`);
      return null;
    }
  }

  static spawnNearPlayer(player, mobKey = null, tags = [], minDistance, maxDistance) {
    const zone = ZoneRegistry.resolve(player.dimension.id, player.location);
    if (zone.type === "safe") return null;
    const pool = ZONE_POOLS[zone.type] || ZONE_POOLS.law;
    const key = mobKey || chooseWeighted(pool.pool);
    const location = this.findGround(player.dimension, player.location, minDistance, maxDistance);
    return location ? this.spawnAt(player.dimension, location, key, tags) : null;
  }

  static tick() {
    for (const player of world.getAllPlayers()) {
      if (player.dimension.id !== CONFIG.overworld) continue;
      let gameMode = "survival";
      try { gameMode = String(player.getGameMode()).toLowerCase(); } catch {}
      if (gameMode === "spectator") continue;
      const zone = ZoneRegistry.resolve(player.dimension.id, player.location);
      if (zone.type === "safe") continue;
      const setting = ZONE_POOLS[zone.type] || ZONE_POOLS.law;
      const nearby = player.dimension.getEntities({ location: player.location, maxDistance: 48, tags: ["apoc_hostile"] });
      if (nearby.length >= setting.maxPerPlayer) continue;
      const count = nearby.length < Math.floor(setting.maxPerPlayer / 2) ? 2 : 1;
      for (let i = 0; i < count; i++) this.spawnNearPlayer(player);
    }
  }

  static guardSafeZones() {
    let overworld;
    try { overworld = world.getDimension("overworld"); } catch { return; }
    const entities = overworld.getEntities({ tags: ["apoc_hostile"] });
    for (const entity of entities) {
      try {
        if (ZoneRegistry.isSafe(entity.dimension.id, entity.location)) entity.remove();
      } catch {}
    }
    if (CONFIG.suppressVanillaHostiles) {
      for (const typeId of VANILLA_HOSTILES) {
        for (const entity of overworld.getEntities({ type: typeId })) {
          try {
            if (ZoneRegistry.isSafe(entity.dimension.id, entity.location)) entity.remove();
          } catch {}
        }
      }
    }
  }

  static cleanupFarEntities() {
    const players = world.getAllPlayers();
    let overworld;
    try { overworld = world.getDimension("overworld"); } catch { return; }
    const maxSq = CONFIG.despawnDistance * CONFIG.despawnDistance;
    for (const entity of overworld.getEntities({ tags: ["apoc_director"] })) {
      try {
        if (typeof entity.isValid === "function" && !entity.isValid()) continue;
        const entityDimension = entity.dimension.id;
        const entityLocation = entity.location;
        if (!players.some(player => player.dimension.id === entityDimension && distanceSquared(player.location, entityLocation) <= maxSq)) entity.remove();
      } catch {}
    }
  }

  static registerVanillaSuppression() {
    const signal = world.afterEvents?.entitySpawn;
    if (!CONFIG.suppressVanillaHostiles || !signal || typeof signal.subscribe !== "function") return;
    signal.subscribe(event => {
      try {
        const entity = event.entity;
        if (!entity || (typeof entity.isValid === "function" && !entity.isValid())) return;
        const typeId = entity.typeId;
        const dimensionId = entity.dimension.id;
        if (dimensionId !== CONFIG.overworld || !VANILLA_HOSTILES.has(typeId)) return;
        entity.remove();
      } catch {}
    });
  }
}
