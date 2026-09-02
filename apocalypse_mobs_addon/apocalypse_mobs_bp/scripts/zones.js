import { world } from "@minecraft/server";
import { CONFIG } from "./config.js";

function parseArray(raw) {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function dimensionMatches(a, b) {
  return String(a || "").replace("minecraft:", "") === String(b || "").replace("minecraft:", "");
}

function contains(region, dimensionId, location) {
  return dimensionMatches(region.dimension, dimensionId) &&
    location.x >= region.min.x && location.x <= region.max.x &&
    location.y >= region.min.y && location.y <= region.max.y &&
    location.z >= region.min.z && location.z <= region.max.z;
}

export class ZoneRegistry {
  static selections = new Map();

  static getLocalZones() {
    return parseArray(world.getDynamicProperty(CONFIG.zonesKey)).filter(zone => zone?.id && zone?.min && zone?.max);
  }

  static saveLocalZones(zones) {
    try {
      world.setDynamicProperty(CONFIG.zonesKey, JSON.stringify(zones.slice(0, 100)));
      return true;
    } catch (error) {
      console.warn(`[Apocalypse][Zones] 保存区域失败: ${error}`);
      return false;
    }
  }

  static getSapiRegions() {
    return parseArray(world.getDynamicProperty(CONFIG.sapiRegionsKey)).filter(region => region?.id && region?.min && region?.max);
  }

  static getSpawnCenter() {
    const warps = parseArray(world.getDynamicProperty(CONFIG.sapiWarpsKey));
    const spawn = warps.find(warp => warp?.id === "spawn" || warp?.isSpawn);
    if (spawn) return { dimension: spawn.dimension, x: spawn.x, y: spawn.y, z: spawn.z, source: "sapi" };
    try {
      const location = world.getDefaultSpawnLocation();
      return { dimension: CONFIG.overworld, ...location, source: "world" };
    } catch {
      return { dimension: CONFIG.overworld, x: 0, y: 64, z: 0, source: "fallback" };
    }
  }

  static resolve(dimensionId, location) {
    const local = this.getLocalZones()
      .filter(zone => contains(zone, dimensionId, location))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
    if (local) return { type: local.type || "law", name: local.name, source: "apoc", data: local };

    const sapi = this.getSapiRegions()
      .filter(region => contains(region, dimensionId, location))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
    if (sapi && sapi.flags?.allowHostileSpawn !== true) {
      return { type: "safe", name: sapi.name || "SAPI 保护区", source: "sapi", data: sapi };
    }

    const spawn = this.getSpawnCenter();
    if (dimensionMatches(spawn.dimension, dimensionId)) {
      const dx = location.x - Number(spawn.x || 0);
      const dz = location.z - Number(spawn.z || 0);
      if ((dx * dx + dz * dz) <= CONFIG.fallbackSafeRadius * CONFIG.fallbackSafeRadius) {
        return { type: "safe", name: "主城出生点", source: spawn.source, data: spawn };
      }
    }
    return { type: "law", name: "法制区", source: "default", data: null };
  }

  static isSafe(dimensionId, location) {
    return this.resolve(dimensionId, location).type === "safe";
  }

  static setPoint(player, key) {
    const selection = this.selections.get(player.id) || {};
    selection[key] = {
      dimension: player.dimension.id,
      x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z)
    };
    this.selections.set(player.id, selection);
    return selection[key];
  }

  static create(player, name, type, priority = 200) {
    const selection = this.selections.get(player.id);
    if (!selection?.a || !selection?.b || !dimensionMatches(selection.a.dimension, selection.b.dimension)) return false;
    const min = {}, max = {};
    for (const axis of ["x", "y", "z"]) {
      min[axis] = Math.min(selection.a[axis], selection.b[axis]);
      max[axis] = Math.max(selection.a[axis], selection.b[axis]);
    }
    const zone = {
      id: `apoc_zone_${Date.now().toString(36)}`,
      name: String(name || "新区域").replace(/[\n\r§]/g, "").slice(0, 24),
      type: ["safe", "law", "outlaw"].includes(type) ? type : "law",
      dimension: selection.a.dimension,
      min, max,
      priority: Math.max(0, Math.min(1000, Number(priority) || 200)),
      createdBy: player.name,
      createdAt: Date.now()
    };
    const zones = this.getLocalZones();
    zones.push(zone);
    const saved = this.saveLocalZones(zones);
    if (saved) this.selections.delete(player.id);
    return saved ? zone : false;
  }

  static remove(id) {
    const zones = this.getLocalZones();
    const next = zones.filter(zone => zone.id !== id);
    return next.length !== zones.length && this.saveLocalZones(next);
  }
}

