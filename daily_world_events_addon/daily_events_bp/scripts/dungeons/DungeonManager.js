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

function distanceSquared(a, b) {
  const dx = Number(a.x) - Number(b.x);
  const dy = Number(a.y) - Number(b.y);
  const dz = Number(a.z) - Number(b.z);
  return dx * dx + dy * dy + dz * dz;
}

function insideArena(location, origin, bounds, margin = 0) {
  return location.x >= origin.x + bounds.min.x - margin && location.x <= origin.x + bounds.max.x + margin &&
    location.y >= origin.y + bounds.min.y - margin && location.y <= origin.y + bounds.max.y + margin &&
    location.z >= origin.z + bounds.min.z - margin && location.z <= origin.z + bounds.max.z + margin;
}

function arenaQuery(instance, template) {
  const min = template.arenaBounds.min;
  const max = template.arenaBounds.max;
  const center = absolutePoint(instance.slot.origin, {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2
  });
  const radius = Math.sqrt((max.x - min.x) ** 2 + (max.y - min.y) ** 2 + (max.z - min.z) ** 2) / 2 + 4;
  return { center, radius };
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
      respawnOffset: template.entryOffset,
      stageHadEnemies: false,
      spawnRetries: 0,
      emergencySpawned: false,
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
    this.loadStructureSet(instance, () => {
      if (!this.active.has(instance.instanceId)) return;
      instance.state = "active";
      instance.startTick = system.currentTick;
      instance.lastPlayerTick = system.currentTick;
      for (const id of [...instance.participantIds]) {
        const player = onlinePlayer(id);
        if (player) this.teleportInto(player, instance);
      }
      this.beginStage(instance, 0);
      system.runTimeout(() => this.removeTickingArea(instance.slot), 80);
    }, error => {
      console.warn(`[DailyEvents][Dungeon] structure load failed: ${error}`);
      this.finish(instance, false, "副本结构加载失败");
    });
  }

  static loadStructureSet(instance, onDone, onError) {
    const template = dungeonTemplate(instance.templateId);
    let dimension;
    try {
      dimension = world.getDimension(instance.slot.dimension);
      const platform = template.platform;
      if (platform) {
        const x1 = instance.slot.origin.x + platform.min.x;
        const z1 = instance.slot.origin.z + platform.min.z;
        const x2 = instance.slot.origin.x + platform.max.x;
        const z2 = instance.slot.origin.z + platform.max.z;
        dimension.runCommand(`fill ${x1} ${instance.slot.origin.y - 1} ${z1} ${x2} ${instance.slot.origin.y - 1} ${z2} ${platform.block}`);
      }
    } catch (error) {
      onError?.(error);
      return;
    }

    const structures = Array.isArray(template.structures) ? template.structures : [];
    const loadNext = index => {
      if (index >= structures.length) {
        onDone?.();
        return;
      }
      const component = structures[index];
      const point = absolutePoint(instance.slot.origin, component.offset);
      try {
        dimension.runCommand(`structure load ${component.structureId} ${point.x} ${point.y} ${point.z}`);
      } catch (error) {
        onError?.(new Error(`${component.id}: ${error}`));
        return;
      }
      system.runTimeout(() => loadNext(index + 1), Number(template.structureLoadDelayTicks || 8));
    };
    loadNext(0);
  }

  static teleportInto(player, instance) {
    const template = dungeonTemplate(instance.templateId);
    const dimension = world.getDimension(instance.slot.dimension);
    const location = absolutePoint(instance.slot.origin, instance.respawnOffset || template.entryOffset);
    try {
      player.teleport(location, { dimension });
      player.sendMessage(`§6[副本] 已进入 ${template.name}。§8按阶段清理建筑并前往标记点打卡。`);
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
    instance.stageHadEnemies = false;
    instance.spawnRetries = 0;
    instance.emergencySpawned = false;
    const requested = stage.type === "checkpoint" ? 0 : this.spawnStageGroups(instance, stage, false);
    instance.expectedEnemies = requested;
    instance.waitUntil = system.currentTick + (stage.type === "checkpoint" ? 20 : Number(template.spawnConfirmTicks || 80));
    const checkpoint = stage.type === "checkpoint" ? this.checkpoint(instance, stage.checkpoint) : null;
    const checkpointTarget = checkpoint ? absolutePoint(instance.slot.origin, checkpoint.offset) : null;
    for (const id of instance.participantIds) {
      const player = onlinePlayer(id);
      if (!player) continue;
      const coordinate = checkpointTarget ? ` §8(${Math.floor(checkpointTarget.x)}, ${Math.floor(checkpointTarget.y)}, ${Math.floor(checkpointTarget.z)})` : "";
      const detail = stage.type === "checkpoint" ? `§e${stage.hint || "前往任务标记点。"}${coordinate}` : `§c预计敌人 ${requested} 名。`;
      player.sendMessage(`§6[副本 ${stageIndex + 1}/${template.stages.length}] §f${stage.name}：${detail}`);
      try { player.onScreenDisplay.setTitle(`§4${stage.name}`, { subtitle: `§e阶段 ${stageIndex + 1}/${template.stages.length}`, fadeInDuration: 5, stayDuration: 35, fadeOutDuration: 10 }); } catch {}
    }
  }

  static spawnStageGroups(instance, stage, force) {
    const dimension = world.getDimension(instance.slot.dimension);
    let requested = 0;
    for (const group of stage.groups || []) {
      const method = force ? "forceDungeonMobs" : "spawnDungeonMobs";
      requested += IntegrationBridge[method](
        dimension,
        this.spawnPoint(instance, group.spawnPoint),
        group.mobKey,
        group.count,
        [instance.tag, DUNGEON_ENTITY_TAG]
      );
    }
    return requested;
  }

  static checkpoint(instance, checkpointId) {
    const template = dungeonTemplate(instance.templateId);
    return template.checkpoints.find(value => value.id === checkpointId) || null;
  }

  static checkpointReached(instance, stage) {
    const checkpoint = this.checkpoint(instance, stage.checkpoint);
    if (!checkpoint) return false;
    const target = absolutePoint(instance.slot.origin, checkpoint.offset);
    const radiusSq = Number(checkpoint.radius || 4) ** 2;
    const player = instance.participantIds.map(onlinePlayer).find(value => value &&
      sameDimension(value.dimension.id, instance.slot.dimension) && distanceSquared(value.location, target) <= radiusSq);
    if (!player) return false;
    instance.respawnOffset = checkpoint.offset;
    for (const id of instance.participantIds) {
      instance.participantScores[id] = Number(instance.participantScores[id] || 0) + 1;
      const member = onlinePlayer(id);
      member?.sendMessage(`§a✓ 已到达：${checkpoint.name}`);
      try { member?.onScreenDisplay.setActionBar(`§a副本检查点：${checkpoint.name}`); } catch {}
    }
    return true;
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
    const nearbyPlayers = instance.participantIds.map(onlinePlayer).filter(player => player &&
      sameDimension(player.dimension.id, instance.slot.dimension) && insideArena(player.location, instance.slot.origin, template.arenaBounds, 6));
    if (nearbyPlayers.length) instance.lastPlayerTick = system.currentTick;
    else if (system.currentTick - instance.lastPlayerTick > template.abandonTicks) return this.finish(instance, false, "队伍已离开副本");

    // 防止普通 SpawnDirector 单位进入实例；副本怪必须持有实例 tag。
    const query = arenaQuery(instance, template);
    for (const entity of dimension.getEntities({ location: query.center, maxDistance: query.radius, tags: ["apoc_director"] })) {
      try { if (!entity.hasTag(instance.tag)) entity.remove(); } catch {}
    }

    const stage = template.stages[instance.stageIndex];
    if (!stage) return this.finish(instance, true);
    if (stage.type === "checkpoint") {
      if (system.currentTick >= instance.waitUntil && this.checkpointReached(instance, stage)) this.beginStage(instance, instance.stageIndex + 1);
      return;
    }

    const enemies = this.entities(instance);
    if (enemies.length) {
      instance.stageHadEnemies = true;
      return;
    }
    if (system.currentTick < instance.waitUntil) return;
    if (instance.stageHadEnemies) return this.beginStage(instance, instance.stageIndex + 1);

    if (instance.spawnRetries < Number(template.maxSpawnRetries || 2)) {
      instance.spawnRetries++;
      this.spawnStageGroups(instance, stage, false);
      instance.waitUntil = system.currentTick + Number(template.spawnConfirmTicks || 80);
      for (const id of instance.participantIds) onlinePlayer(id)?.sendMessage(`§e[副本] 敌人尚未出现，正在重新部署（${instance.spawnRetries}/${template.maxSpawnRetries}）。`);
      return;
    }
    if (!instance.emergencySpawned) {
      instance.emergencySpawned = true;
      const forced = this.spawnStageGroups(instance, stage, true);
      instance.waitUntil = system.currentTick + Number(template.spawnConfirmTicks || 80);
      for (const id of instance.participantIds) onlinePlayer(id)?.sendMessage(`§6[副本] 已启用确认性补刷，部署 ${forced} 名敌人。`);
      return;
    }
    this.finish(instance, false, "敌人生成失败，请检查 Apocalypse Mobs 是否启用");
  }

  static recordCombat(entity, player, damage = 1, killed = false) {
    if (!entity || !player) return false;
    for (const instance of this.active.values()) {
      try {
        if (!entity.hasTag(instance.tag) || !instance.participantIds.includes(player.id)) continue;
        instance.stageHadEnemies = true;
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
      dimension.runCommand(`tickingarea add ${slot.origin.x - 8} ${slot.origin.y} ${slot.origin.z - 8} ${slot.origin.x + 64} ${slot.origin.y} ${slot.origin.z + 112} ${name} true`);
    } catch {}
  }

  static removeTickingArea(slot) {
    try { world.getDimension(slot.dimension).runCommand(`tickingarea remove daily_${slot.id}`); } catch {}
  }

  static resetSlot(instance) {
    this.resettingSlots.add(instance.slot.id);
    this.addTickingArea(instance.slot);
    system.runTimeout(() => {
      this.loadStructureSet(instance, () => {
        system.runTimeout(() => {
          this.removeTickingArea(instance.slot);
          this.resettingSlots.delete(instance.slot.id);
        }, 40);
      }, error => {
        console.warn(`[DailyEvents][Dungeon] slot reset failed: ${error}`);
        this.removeTickingArea(instance.slot);
        this.resettingSlots.delete(instance.slot.id);
      });
    }, 20);
  }
}
