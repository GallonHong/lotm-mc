import { world, ItemStack } from "@minecraft/server";
import { CONFIG, MOB_PROFILES } from "./config.js";

const PROFILE_BY_TYPE = new Map(Object.values(MOB_PROFILES).map(profile => [profile.typeId, profile]));
const BASIC_PARTS = ["test_gun:part_barrel", "test_gun:part_receiver", "test_gun:part_stock"];
const ADVANCED_PARTS = ["test_gun:part_heavy_barrel", "test_gun:part_ceramic_plate", "test_gun:part_kevlar_sheet"];
const EPIC_BLUEPRINTS = [
  "test_gun:blueprint_m82",
  "test_gun:blueprint_rpg",
  "test_gun:blueprint_riot_shield",
  "test_gun:blueprint_katana",
  "test_gun:blueprint_kukri_machete"
];

function parseNodes() {
  try {
    const raw = world.getDynamicProperty(CONFIG.lootNodesKey);
    const nodes = typeof raw === "string" ? JSON.parse(raw) : [];
    return Array.isArray(nodes) ? nodes : [];
  } catch { return []; }
}

function sameDimension(a, b) {
  return String(a || "").replace("minecraft:", "") === String(b || "").replace("minecraft:", "");
}

function give(player, typeId, amount) {
  try {
    const item = new ItemStack(typeId, Math.max(1, Math.floor(amount)));
    const inventory = player.getComponent("minecraft:inventory")?.container;
    const leftover = inventory?.addItem(item);
    if (leftover) player.dimension.spawnItem(leftover, player.location);
    return true;
  } catch { return false; }
}

function random(values) { return values[Math.floor(Math.random() * values.length)]; }

function spawn(dead, typeId, amount = 1) {
  try {
    dead.dimension.spawnItem(new ItemStack(typeId, Math.max(1, Math.min(64, Math.floor(amount)))), dead.location);
    return true;
  } catch { return false; }
}

export class LootManager {
  static handleMobDeath(dead) {
    const profile = PROFILE_BY_TYPE.get(dead?.typeId);
    if (!profile || dead.hasTag?.("apoc_no_rewards")) return false;
    const tier = Math.max(1, Number(profile.tier || 1));

    if (dead.typeId === "apoc:raider_rifleman") {
      spawn(dead, "minecraft:gunpowder", 2 + Math.floor(Math.random() * 4));
      if (Math.random() < 0.2 && !spawn(dead, "test_gun:ammo_rifle", 8 + Math.floor(Math.random() * 9))) spawn(dead, "minecraft:iron_ingot", 2);
    } else if (tier === 1) {
      if (Math.random() < 0.70) spawn(dead, random(["minecraft:rotten_flesh", "minecraft:bone", "minecraft:string"]), 1 + Math.floor(Math.random() * 3));
      if (Math.random() < 0.20) spawn(dead, random(["minecraft:gunpowder", "minecraft:oak_log"]), 1);
      if (Math.random() < 0.065) spawn(dead, random(BASIC_PARTS), 1);
    } else if (tier === 2) {
      spawn(dead, random(["minecraft:rotten_flesh", "minecraft:gunpowder"]), 1 + Math.floor(Math.random() * 3));
      if (Math.random() < 0.45) spawn(dead, random(["minecraft:iron_nugget", "minecraft:copper_ingot"]), 1 + Math.floor(Math.random() * 2));
      if (Math.random() < 0.125) spawn(dead, random(BASIC_PARTS), 1);
    } else if (tier === 3) {
      spawn(dead, random(["minecraft:iron_ingot", "minecraft:redstone", "minecraft:gunpowder", "minecraft:emerald"]), 1 + Math.floor(Math.random() * 3));
      if (Math.random() < 0.225) spawn(dead, random(BASIC_PARTS), 1);
      if (Math.random() < 0.0004) spawn(dead, random(EPIC_BLUEPRINTS), 1);
    } else {
      spawn(dead, random(["minecraft:iron_ingot", "minecraft:gold_ingot", "minecraft:redstone", "minecraft:diamond"]), tier >= 5 ? 3 + Math.floor(Math.random() * 4) : 2 + Math.floor(Math.random() * 3));
      spawn(dead, random(ADVANCED_PARTS), tier >= 5 ? 2 : 1);
      if (Math.random() < (tier >= 5 ? 0.01 : 0.0015)) spawn(dead, random(EPIC_BLUEPRINTS), 1);
    }
    return true;
  }

  static getNodes() { return parseNodes(); }

  static saveNodes(nodes) {
    try {
      world.setDynamicProperty(CONFIG.lootNodesKey, JSON.stringify(nodes.slice(0, 300)));
      return true;
    } catch (error) {
      console.warn(`[Apocalypse][Loot] 保存节点失败: ${error}`);
      return false;
    }
  }

  static findNode(dimensionId, location) {
    return this.getNodes().find(node => sameDimension(node.dimension, dimensionId) &&
      node.x === Math.floor(location.x) && node.y === Math.floor(location.y) && node.z === Math.floor(location.z));
  }

  static addNode(player, type = "tools", respawnMinutes = CONFIG.defaultLootRespawnMinutes) {
    const view = player.getViewDirection();
    let x = Math.floor(player.location.x + view.x * 2.5);
    let y = Math.floor(player.location.y);
    let z = Math.floor(player.location.z + view.z * 2.5);
    try {
      let block = player.dimension.getBlock({ x, y, z });
      if (block && !block.isAir) y += 1;
      block = player.dimension.getBlock({ x, y, z });
      if (!block) return false;
      block.setType("apoc:loot_crate");
    } catch (error) {
      console.warn(`[Apocalypse][Loot] 放置补给箱失败: ${error}`);
      return false;
    }
    const nodes = this.getNodes().filter(node => !(sameDimension(node.dimension, player.dimension.id) && node.x === x && node.y === y && node.z === z));
    const node = {
      id: `loot_${Date.now().toString(36)}`,
      type: ["tools", "medical", "military"].includes(type) ? type : "tools",
      dimension: player.dimension.id,
      x, y, z,
      respawnMinutes: Math.max(1, Math.min(120, Number(respawnMinutes) || CONFIG.defaultLootRespawnMinutes)),
      lastLooted: 0,
      createdBy: player.name
    };
    nodes.push(node);
    return this.saveNodes(nodes) ? node : false;
  }

  static removeNode(node) {
    const nodes = this.getNodes();
    const next = nodes.filter(entry => entry.id !== node.id);
    if (next.length === nodes.length || !this.saveNodes(next)) return false;
    try { world.getDimension(node.dimension).getBlock({ x: node.x, y: node.y, z: node.z })?.setType("minecraft:air"); } catch {}
    return true;
  }

  static interact(player, block) {
    if (block.typeId !== "apoc:loot_crate") return false;
    const node = this.findNode(player.dimension.id, block.location);
    if (!node) {
      player.sendMessage("§c[补给箱] 此箱未登记，请联系管理员重新建立 LootNode。");
      return true;
    }
    const readyAt = Number(node.lastLooted || 0) + node.respawnMinutes * 60000;
    const remaining = readyAt - Date.now();
    if (remaining > 0) {
      player.sendMessage(`§7[补给箱] 物资正在刷新，剩余约 §e${Math.ceil(remaining / 60000)}§7 分钟。`);
      return true;
    }
    this.rollLoot(player, node.type);
    const nodes = this.getNodes();
    const current = nodes.find(entry => entry.id === node.id);
    if (current) current.lastLooted = Date.now();
    this.saveNodes(nodes);
    player.sendMessage(`§a[补给箱] 搜刮完成。此节点约 ${node.respawnMinutes} 分钟后刷新。`);
    return true;
  }

  static rollLoot(player, type) {
    if (type === "medical") {
      give(player, "minecraft:bread", 2 + Math.floor(Math.random() * 3));
      give(player, "minecraft:honey_bottle", 1);
      if (Math.random() < 0.35) give(player, "minecraft:golden_apple", 1);
      return;
    }
    if (type === "military") {
      give(player, "minecraft:iron_ingot", 2 + Math.floor(Math.random() * 4));
      give(player, "minecraft:gunpowder", 3 + Math.floor(Math.random() * 5));
      if (!give(player, "test_gun:ammo_rifle", 12 + Math.floor(Math.random() * 13))) give(player, "minecraft:arrow", 8);
      return;
    }
    give(player, "minecraft:iron_nugget", 4 + Math.floor(Math.random() * 8));
    give(player, "minecraft:string", 2 + Math.floor(Math.random() * 4));
    if (Math.random() < 0.5) give(player, "minecraft:redstone", 2);
  }

  static rewardCurrency(player, amount) {
    try {
      const objective = world.scoreboard.getObjective("money");
      if (objective && player.scoreboardIdentity) {
        objective.addScore(player.scoreboardIdentity, amount);
        player.sendMessage(`§6[事件奖励] +${amount} 金币（已写入 SAPI 经济）`);
        return true;
      }
    } catch {}
    give(player, "minecraft:emerald", Math.max(1, Math.floor(amount / 25)));
    player.sendMessage("§a[事件奖励] 未检测到 SAPI 经济，已改发绿宝石物资。");
    return false;
  }
}
