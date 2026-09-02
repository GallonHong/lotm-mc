import { world, system } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { IntegrationBridge } from "../integration/IntegrationBridge.js";
import { RewardManager } from "../rewards/RewardManager.js";
import { DailyQuestManager } from "../daily/DailyQuestManager.js";
import { DUNGEON_SLOTS, absolutePoint, dungeonTemplate } from "./dungeonTemplates.js";

const PLAYER_STATE_KEY = "daily:dungeon_player:v1";
const DUNGEON_ENTITY_TAG = "daily_dungeon_entity";

function valid(entity) {
  try { return !!entity && entity.isValid(); } catch { return false; }
}

function sameDimension(a, b) {
  return String(a || "").replace("minecraft:", "") === String(b || "").replace("minecraft:", "");
}

function readPlayerState(player) {
  try {
    const raw = player.getDynamicProperty(PLAYER_STATE_KEY);
    return typeof raw === "string" ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writePlayerState(player, value) {
  try { player.setDynamicProperty(PLAYER_STATE_KEY, value ? JSON.stringify(value) : undefined); } catch {}
}

function onlinePlayer(id) {
  return world.getAllPlayers().find(player => player.id === id) || null;
}

function safeLocation(player) {
  return {
    dimension: player.dimension.id,
    x: Number(player.location.x),
    y: Number(player.location.y),
    z: Number(player.location.z)
  };
}

export class DungeonManager {
  static active = new Map();
  static resettingSlots = new Set();

  static initializeCleanup() {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
      try {
        const dimension = world.getDimension(dimensionId);
        for (const entity of dimension.getEntities({ tags: [DUNGEON_ENTITY_TAG] })) entity.remove();
      } catch {}
    }
    for (const slot of DUNGEON_SLOTS) this.removeTickingArea(slot);
  }

  static playerInstance(player) {
    const state = readPlayerState(player);
    return state?.instanceId ? this.active.get(state.instanceId) || null : null;
  }

  static list() {
    return [...this.active.values()].map(instance => ({
      instanceId: instance.instanceId,
      templateId: instance.templateId,
      state: instance.state,
      stageIndex: instance.stageIndex,
      participants: [...instance.participantIds],
      ownerName: instance.ownerName,
      startTick: instance.startTick
    }));
  }

  static availableSlot() {
    const occupied = new Set([...this.active.values()].map(instance => instance.slot.id));
    return DUNGEON_SLOTS.find(slot => !occupied.has(slot.id) && !this.resettingSlots.has(slot.id)) || null;
  }

  static start(player, templateId = "abandoned_clinic") {
    if (!valid(player) || readPlayerState(player)) return false;
    const template = dungeonTemplate(templateId);
    const slot = this.availableSlot();
    if (!template || !slot || !sameDimension(template.dimension, slot.dimension)) return false;

    const shortId = `${Date.now().toString(36)}${Math.floor(Math.random() * 9999).toString(36)}`.slice(-12);
    const instance = {
      instanceId: `dungeon_${shortId}`,
      templateId,
      tag: `daily_dng_${shortId}`,
      state: "preparing",
      slot,
      ownerId: player.id,
      ownerName: player.name,
      participantIds: [player.id],
      participantScores: { [player.id]: 0 },
      deaths: { [player.id]: 0 },
      stageIndex: -1,
      startTick: system.currentTick,
      lastPlayerTick: system.currentTick,
      waitUntil: system.currentTick + 80
    };
    this.active.set(instance.instanceId, instance);
    this.bindPlayer(player, instance);
    player.sendMessage(`§e[副本] 正在准备 ${template.name}，请稍候……`);

    this.addTickingArea(slot);
    system.runTimeout(() => this.loadAndEnter(instance), 20);
    return instance;
  }

  static bindPlayer(player, instance) {
    const previous = readPlayerState(player);
    writePlayerState(player, {
      instanceId: instance.instanceId,
      returnLocation: previous?.returnLocation || safeLocation(player),
      pendingRespawn: false
    });
    try { player.addTag("daily_in_dungeon"); } catch {}
  }

  static loadAndEnter(instance) {
    if (!this.active.has(instance.instanceId)) return;
    const template = dungeonTemplate(instance.templateId);
    try {
      const dimension = world.getDimension(instance.slot.dimension);
      const { x, y, z } = instance.slot.origin;
      dimension.runCommand(`structure load ${template.structureId} ${x} ${y} ${z}`);
      instance.state = "active";
      instance.startTick = system.currentTick;
      instance.lastPlayerTick = system.currentTick;
      for (const id of [...instance.participantIds]) {
        const player = onlinePlayer(id);
        if (player) this.teleportInto(player, instance);
      }
      this.beginStage(instance, 0);
      system.runTimeout(() => this.removeTickingArea(instance.slot), 40);
    } catch (error) {
      console.warn(`[DailyEvents][Dungeon] structure load failed: ${error}`);
      this.finish(instance, false, "副本结构加载失败");
    }
  }

  static teleportInto(player, instance) {
    const template = dungeonTemplate(instance.templateId);
    const dimension = world.getDimension(instance.slot.dimension);
    const location = absolutePoint(instance.slot.origin, template.entryOffset);
    try {
      player.teleport(location, { dimension });
      player.sendMessage(`§6[副本] 已进入 ${template.name}。§8完成三个区域后自动结算个人奖励。`);
    } catch (error) {
      console.warn(`[DailyEvents][Dungeon] teleport failed for ${player.name}: ${error}`);
    }
  }

  static join(player, instanceId) {
    if (!valid(player) || readPlayerState(player)) return false;
    const instance = this.active.get(instanceId);
    const template = instance ? dungeonTemplate(instance.templateId) : null;
    if (!instance || !template || instance.state !== "active") return false;
    if (system.currentTick - instance.startTick > template.joinWindowTicks) return false;
    if (instance.participantIds.length >= template.maxPlayers) return false;
    instance.participantIds.push(player.id);
    instance.participantScores[player.id] = 0;
    instance.deaths[player.id] = 0;
    this.bindPlayer(player, instance);
    this.teleportInto(player, instance);
    for (const id of instance.participantIds) onlinePlayer(id)?.sendMessage(`§a[副本] ${player.name} 加入了队伍。`);
    return true;
  }

  static spawnPoint(instance, pointId) {
    const template = dungeonTemplate(instance.templateId);
    const point = template.spawnPoints.find(value => value.id === pointId) || template.spawnPoints[0];
    return absolutePoint(instance.slot.origin, point.offset);
  }

  static beginStage(instance, stageIndex) {
    const template = dungeonTemplate(instance.templateId);
    const stage = template?.stages?.[stageIndex];
    if (!stage) return this.finish(instance, true);
    instance.stageIndex = stageIndex;
    instance.waitUntil = system.currentTick + 100;
    const dimension = world.getDimension(instance.slot.dimension);
    let requested = 0;
    for (const group of stage.groups) {
      requested += IntegrationBridge.spawnEventMobs(
        dimension,
        this.spawnPoint(instance, group.spawnPoint),
        group.mobKey,
        group.count,
        [instance.tag, DUNGEON_ENTITY_TAG],
        0.5,
        2.2
      );
    }
    for (const id of instance.participantIds) {
      const player = onlinePlayer(id);
      if (!player) continue;
      player.sendMessage(`§c[副本 ${stageIndex + 1}/${template.stages.length}] ${stage.name}，预计敌人 ${requested} 名。`);
      try { player.onScreenDisplay.setTitle(`§4${stage.name}`, { subtitle: `§e阶段 ${stageIndex + 1}/${template.stages.length}`, fadeInDuration: 5, stayDuration: 35, fadeOutDuration: 10 }); } catch {}
    }
  }

  static entities(instance) {
    try { return world.getDimension(instance.slot.dimension).getEntities({ tags: [instance.tag] }); }
    catch { return []; }
  }

  static tick() {
    for (const instance of [...this.active.values()]) this.tickInstance(instance);
  }

  static tickInstance(instance) {
    const template = dungeonTemplate(instance.templateId);
    if (!template) return this.finish(instance, false, "模板不存在");
    if (instance.state !== "active") return;
    if (system.currentTick - instance.startTick > template.timeoutTicks) return this.finish(instance, false, "副本超时");

    const dimension = world.getDimension(instance.slot.dimension);
    const entry = absolutePoint(instance.slot.origin, template.entryOffset);
    const nearbyPlayers = dimension.getPlayers({ location: entry, maxDistance: 40 })
      .filter(player => instance.participantIds.includes(player.id));
    if (nearbyPlayers.length) instance.lastPlayerTick = system.currentTick;
    else if (system.currentTick - instance.lastPlayerTick > template.abandonTicks) return this.finish(instance, false, "队伍已离开副本");

    // 防止普通 SpawnDirector 单位进入实例；副本怪必须持有实例 tag。
    for (const entity of dimension.getEntities({ location: entry, maxDistance: 38, tags: ["apoc_director"] })) {
      try { if (!entity.hasTag(instance.tag)) entity.remove(); } catch {}
    }

    if (system.currentTick < instance.waitUntil || this.entities(instance).length) return;
    this.beginStage(instance, instance.stageIndex + 1);
  }

  static recordCombat(entity, player, damage = 1, killed = false) {
    if (!entity || !player) return false;
    for (const instance of this.active.values()) {
      try {
        if (!entity.hasTag(instance.tag) || !instance.participantIds.includes(player.id)) continue;
        const gain = Math.max(0.5, Math.min(3, Number(damage) || 1)) + (killed ? 3 : 0);
        instance.participantScores[player.id] = Number(instance.participantScores[player.id] || 0) + gain;
        return true;
      } catch {}
    }
    return false;
  }

  static onPlayerDeath(player) {
    const state = readPlayerState(player);
    const instance = state?.instanceId ? this.active.get(state.instanceId) : null;
    if (!instance) return false;
    instance.deaths[player.id] = Number(instance.deaths[player.id] || 0) + 1;
    state.pendingRespawn = true;
    writePlayerState(player, state);
    return true;
  }

  static handlePlayerSpawn(player) {
    const state = readPlayerState(player);
    if (!state?.instanceId) return false;
    const instance = this.active.get(state.instanceId);
    const template = instance ? dungeonTemplate(instance.templateId) : null;
    if (!instance || !template) {
      this.returnPlayer(player, state, "服务器重启或副本已结束，已返回原位置。");
      return true;
    }
    if (state.pendingRespawn) {
      state.pendingRespawn = false;
      writePlayerState(player, state);
      if (Number(instance.deaths[player.id] || 0) > template.maxDeathsPerPlayer) {
        this.removeParticipant(player, instance, "复活次数已用尽。");
      } else {
        system.runTimeout(() => this.teleportInto(player, instance), 10);
      }
    }
    return true;
  }

  static exit(player) {
    const state = readPlayerState(player);
    const instance = state?.instanceId ? this.active.get(state.instanceId) : null;
    if (!state) return false;
    if (instance) this.removeParticipant(player, instance, "已主动退出副本，不结算通关奖励。");
    else this.returnPlayer(player, state, "已离开失效副本。");
    return true;
  }

  static removeParticipant(player, instance, message) {
    instance.participantIds = instance.participantIds.filter(id => id !== player.id);
    this.returnPlayer(player, readPlayerState(player), message);
    if (!instance.participantIds.length) this.finish(instance, false, "队伍已全部退出");
  }

  static returnPlayer(player, state, message = "") {
    const target = state?.returnLocation;
    try {
      if (target) {
        const dimension = world.getDimension(target.dimension || "overworld");
        player.teleport({ x: target.x, y: target.y, z: target.z }, { dimension });
      } else {
        const spawn = world.getDefaultSpawnLocation();
        player.teleport(spawn, { dimension: world.getDimension("overworld") });
      }
    } catch {}
    writePlayerState(player, null);
    try { player.removeTag("daily_in_dungeon"); } catch {}
    if (message) player.sendMessage(`§e[副本] ${message}`);
  }

  static finish(instance, success, reason = "") {
    if (!this.active.has(instance.instanceId)) return;
    const template = dungeonTemplate(instance.templateId);
    instance.state = success ? "success" : "failed";
    for (const entity of this.entities(instance)) {
      try { entity.remove(); } catch {}
    }

    for (const id of [...instance.participantIds]) {
      const player = onlinePlayer(id);
      if (!player) continue;
      const score = Number(instance.participantScores[id] || 0);
      if (success && score >= Number(template.minimumContribution || 0)) {
        RewardManager.grant(player, template.rewardId, `dungeon:${instance.instanceId}:${id}`, `dungeon:${template.id}`);
        DailyQuestManager.onWorldEventSuccess(player, template.id);
        player.sendMessage(`§a☑ 副本通关：${template.name}（贡献 ${score.toFixed(1)}）`);
      } else if (success) {
        player.sendMessage(`§e副本已通关，但贡献 ${score.toFixed(1)} 未达到 ${template.minimumContribution}，不发放完整奖励。`);
      }
      this.returnPlayer(player, readPlayerState(player), success ? "副本结算完成，已返回出发位置。" : `副本失败：${reason || "挑战失败"}`);
    }

    this.active.delete(instance.instanceId);
    this.resetSlot(instance);
  }

  static addTickingArea(slot) {
    try {
      const dimension = world.getDimension(slot.dimension);
      const name = `daily_${slot.id}`;
      try { dimension.runCommand(`tickingarea remove ${name}`); } catch {}
      dimension.runCommand(`tickingarea add circle ${slot.origin.x} ${slot.origin.y} ${slot.origin.z} 1 ${name} true`);
    } catch {}
  }

  static removeTickingArea(slot) {
    try { world.getDimension(slot.dimension).runCommand(`tickingarea remove daily_${slot.id}`); } catch {}
  }

  static resetSlot(instance) {
    const template = dungeonTemplate(instance.templateId);
    this.resettingSlots.add(instance.slot.id);
    this.addTickingArea(instance.slot);
    system.runTimeout(() => {
      try {
        const dimension = world.getDimension(instance.slot.dimension);
        const { x, y, z } = instance.slot.origin;
        dimension.runCommand(`structure load ${template.structureId} ${x} ${y} ${z}`);
      } catch (error) {
        console.warn(`[DailyEvents][Dungeon] slot reset failed: ${error}`);
      }
      system.runTimeout(() => {
        this.removeTickingArea(instance.slot);
        this.resettingSlots.delete(instance.slot.id);
      }, 40);
    }, 20);
  }
}
