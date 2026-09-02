import { world } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { EVENT_TEMPLATES } from "./templates/eventTemplates.js";

function parse(raw) {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch { return []; }
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
    const nodes = this.getNodes();
    const node = {
      id: `event_node_${Date.now().toString(36)}`,
      name: String(name || "事件节点").replace(/[\n\r§]/g, "").slice(0, 28),
      dimension: player.dimension.id,
      location: { x: Number(player.location.x.toFixed(1)), y: Number(player.location.y.toFixed(1)), z: Number(player.location.z.toFixed(1)) },
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
