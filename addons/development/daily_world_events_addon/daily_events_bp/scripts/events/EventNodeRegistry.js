import { world } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { EVENT_TEMPLATES } from "./templates/eventTemplates.js";

function parse(raw) {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function isAir(block) {
  const id = String(block?.typeId || "");
  return block?.isAir === true || id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air";
}

function isLiquid(block) {
  const id = String(block?.typeId || "");
  return id.includes("water") || id.includes("lava");
}

export class EventNodeRegistry {
  static getNodes() {
    return parse(world.getDynamicProperty(CONFIG.eventNodesKey)).filter(node => node?.id && node?.location && node?.dimension);
  }

  static saveNodes(nodes) {
    try {
      world.setDynamicProperty(CONFIG.eventNodesKey, JSON.stringify(nodes.slice(0, 80)));
      return true;
    } catch (error) {
      console.warn(`[DailyEvents][Nodes] 保存失败: ${error}`);
      return false;
    }
  }

  static add(player, name, allowedEvents = Object.keys(EVENT_TEMPLATES), radius = 35, cooldownMinutes = CONFIG.defaultNodeCooldownMinutes) {
    return this.addAt(player, name, player.dimension.id, player.location, allowedEvents, radius, cooldownMinutes);
  }

  static normalizeLocation(dimensionId, location) {
    const dimension = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"].includes(String(dimensionId)) ? String(dimensionId) : null;
    const x = Number(location?.x), y = Number(location?.y), z = Number(location?.z);
    if (!dimension || ![x, y, z].every(Number.isFinite)) return null;
    if (Math.abs(x) > 29999980 || Math.abs(z) > 29999980 || y < -64 || y > 319) return null;
    return { dimension, location: { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), z: Number(z.toFixed(1)) } };
  }

  static resolveGround(dimensionId, location) {
    const normalized = this.normalizeLocation(dimensionId, location);
    if (!normalized) return null;
    let dimension;
    try { dimension = world.getDimension(normalized.dimension); } catch { return null; }
    const baseY = Math.floor(normalized.location.y);
    const offsets = [0];
    for (let offset = 1; offset <= 24; offset++) offsets.push(offset, -offset);
    for (const offset of offsets) {
      const y = baseY + offset;
      if (y < -63 || y > 318) continue;
      try {
        const sample = { x: Math.floor(normalized.location.x), y, z: Math.floor(normalized.location.z) };
        const floor = dimension.getBlock({ ...sample, y: y - 1 });
        const feet = dimension.getBlock(sample);
        const head = dimension.getBlock({ ...sample, y: y + 1 });
        if (floor && !isAir(floor) && !isLiquid(floor) && isAir(feet) && isAir(head)) {
          return { x: normalized.location.x, y, z: normalized.location.z };
        }
      } catch {}
    }
    return null;
  }

  static addAt(player, name, dimensionId, location, allowedEvents = Object.keys(EVENT_TEMPLATES), radius = 35, cooldownMinutes = CONFIG.defaultNodeCooldownMinutes) {
    const normalized = this.normalizeLocation(dimensionId, location);
    if (!normalized) return false;
    const nodes = this.getNodes();
    const node = {
      id: `event_node_${Date.now().toString(36)}`,
      name: String(name || "事件节点").replace(/[\n\r§]/g, "").slice(0, 28),
      dimension: normalized.dimension,
      location: normalized.location,
      triggerRadius: Math.max(10, Math.min(80, Number(radius) || 35)),
      allowedEvents: allowedEvents.filter(id => EVENT_TEMPLATES[id]),
      cooldownMinutes: Math.max(1, Math.min(180, Number(cooldownMinutes) || CONFIG.defaultNodeCooldownMinutes)),
      cooldownUntil: 0,
      createdBy: player.name,
      createdAt: Date.now()
    };
    nodes.push(node);
    return this.saveNodes(nodes) ? node : false;
  }

  static remove(id) {
    const nodes = this.getNodes();
    const next = nodes.filter(node => node.id !== id);
    return next.length !== nodes.length && this.saveNodes(next);
  }

  static setCooldown(id) {
    const nodes = this.getNodes();
    const node = nodes.find(entry => entry.id === id);
    if (!node) return false;
    node.cooldownUntil = Date.now() + Number(node.cooldownMinutes || CONFIG.defaultNodeCooldownMinutes) * 60000;
    return this.saveNodes(nodes);
  }

  static nearby(player, maxDistance = 100) {
    return this.getNodes().filter(node => node.dimension === player.dimension.id &&
      Math.hypot(node.location.x - player.location.x, node.location.y - player.location.y, node.location.z - player.location.z) <= maxDistance);
  }
}
