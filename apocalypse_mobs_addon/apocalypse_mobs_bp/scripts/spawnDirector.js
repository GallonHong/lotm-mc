import { world, system, ItemStack, EquipmentSlot } from "@minecraft/server";
import { CONFIG, MOB_PROFILES, ZONE_POOLS, ZONE_DIFFICULTY, ARMOR_POOLS } from "./config.js";
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

const PROFILE_BY_TYPE = new Map(Object.entries(MOB_PROFILES).map(([key, value]) => [value.typeId, { key, ...value }]));

const VANILLA_ARMOR_FALLBACKS = Object.freeze({
  law: {
    head: "minecraft:leather_helmet",
    chest: "minecraft:leather_chestplate",
    legs: "minecraft:leather_leggings",
    feet: "minecraft:leather_boots"
  },
  outlaw: {
    head: "minecraft:iron_helmet",
    chest: "minecraft:iron_chestplate",
    legs: "minecraft:iron_leggings",
    feet: "minecraft:iron_boots"
  },
  extraction: {
    head: "minecraft:diamond_helmet",
    chest: "minecraft:diamond_chestplate",
    legs: "minecraft:diamond_leggings",
    feet: "minecraft:diamond_boots"
  }
});

function valid(entity) {
  try { return !!entity && (typeof entity.isValid !== "function" || entity.isValid()); } catch { return false; }
}

function choose(list) { return list[Math.floor(Math.random() * list.length)]; }

export class SpawnDirector {
  static configureEntity(entity, forcedZoneType = null) {
    if (!valid(entity) || entity.hasTag("apoc_spawn_configured")) return;
    const profile = PROFILE_BY_TYPE.get(entity.typeId);
    if (!profile) return;
    let zoneType = forcedZoneType;
    try {
      if (!zoneType) zoneType = entity.dimension.id === CONFIG.extractionDimension
        ? "extraction"
        : ZoneRegistry.resolve(entity.dimension.id, entity.location).type;
    } catch { zoneType = "law"; }
    if (!ZONE_DIFFICULTY[zoneType]) zoneType = "law";
    entity.addTag("apoc_spawn_configured");
    entity.addTag(`apoc_zone_${zoneType}`);
    if (entity.typeId.startsWith("apoc:infected_")) {
      try { entity.setProperty("apoc:appearance", Math.floor(Math.random() * 8)); } catch {}
    }

    const targetHealth = Number(profile.health?.[zoneType] || profile.health?.law || 20);
    const baseHealth = Number(profile.health?.law || targetHealth);
    if (targetHealth > baseHealth) {
      const amplifier = Math.max(0, Math.round((targetHealth - baseHealth) / 4) - 1);
      try { entity.addEffect("health_boost", 20000000, { amplifier, showParticles: false }); } catch {}
      system.run(() => {
        if (!valid(entity)) return;
        try {
          const health = entity.getComponent("minecraft:health");
          if (health) health.setCurrentValue(health.effectiveMax);
        } catch {}
      });
    }
    this.equipRandomArmor(entity, profile, zoneType);
  }

  static equipRandomArmor(entity, profile, zoneType) {
    if (!profile.armorEligible) return;
    const setting = ZONE_DIFFICULTY[zoneType];
    const pool = ARMOR_POOLS[zoneType] || {};
    const tierBonus = Math.min(0.16, Number(profile.tier || 1) * 0.025);
    const slots = Object.entries(pool).filter(([, items]) => Array.isArray(items) && items.length);
    if (!slots.length || Math.random() >= setting.armorChance + tierBonus) return;
    let equipment;
    try { equipment = entity.getComponent("minecraft:equippable"); } catch { return; }
    if (!equipment) return;
    const pieces = 1 + (Math.random() < 0.28 ? 1 : 0) + (zoneType === "extraction" && Math.random() < 0.18 ? 1 : 0);
    const available = [...slots];
    let equippedPieces = 0;
    for (let i = 0; i < pieces; i++) {
      const pickIndex = Math.floor(Math.random() * available.length);
      const entry = available.splice(pickIndex, 1)[0];
      if (!entry) break;
      const [slotName, items] = entry;
      const slot = EquipmentSlot[slotName[0].toUpperCase() + slotName.slice(1)] || slotName;
      const preferred = choose(items);
      const fallback = VANILLA_ARMOR_FALLBACKS[zoneType]?.[slotName];
      const candidates = [...new Set([preferred, ...items, fallback].filter(Boolean))];
      for (const itemId of candidates) {
        try {
          equipment.setEquipment(slot, new ItemStack(itemId, 1));
          equippedPieces++;
          break;
        } catch {}
      }
    }
    if (equippedPieces > 0) entity.addTag("apoc_armored");
    else console.warn(`[Apocalypse][Armor] ${entity.typeId} 未找到可用护甲，已跳过装备。`);
  }

  static registerSpawnConfiguration() {
    const signal = world.afterEvents?.entitySpawn;
    if (!signal || typeof signal.subscribe !== "function") return;
    signal.subscribe(event => system.run(() => {
      try { this.configureEntity(event.entity); } catch {}
    }));
  }
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
          const location = request.placement === "exact"
            ? {
                x: Number(center.x) + ((index % 3) - 1) * 0.35,
                y: Number(center.y),
                z: Number(center.z) + (Math.floor(index / 3) % 3) * 0.35
              }
            : this.findGround(dimension, center, Number(request.minDistance) || 6, Number(request.maxDistance) || 14);
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

  static spawnAt(dimension, location, mobKey, tags = [], forcedZoneType = null) {
    const profile = MOB_PROFILES[mobKey];
    if (!profile || ZoneRegistry.isSafe(dimension.id, location)) return null;
    try {
      const entity = dimension.spawnEntity(profile.typeId, location);
      entity.addTag("apoc_hostile");
      entity.addTag("apoc_director");
      entity.addTag(`apoc_tier_${profile.tier}`);
      for (const tag of tags) entity.addTag(tag);
      this.configureEntity(entity, forcedZoneType);
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
