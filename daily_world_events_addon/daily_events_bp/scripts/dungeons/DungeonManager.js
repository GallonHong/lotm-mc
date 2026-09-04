import { world, system, ItemStack, BlockPermutation } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { IntegrationBridge } from "../integration/IntegrationBridge.js";
import { RewardManager } from "../rewards/RewardManager.js";
import { DailyQuestManager } from "../daily/DailyQuestManager.js";
import { DUNGEON_SLOTS, absolutePoint, dungeonTemplate } from "./dungeonTemplates.js";

const PLAYER_STATE_KEY = "daily:dungeon_player:v1";
const PLAYER_ECONOMY_KEY = "daily:dungeon_economy:v1";
const DUNGEON_ENTITY_TAG = "daily_dungeon_entity";
const DUNGEON_ENEMY_TAG = "daily_dungeon_enemy";

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

function dungeonEconomyState(player) {
  let value = null;
  try { value = JSON.parse(player.getDynamicProperty(PLAYER_ECONOMY_KEY) || "null"); } catch {}
  const dayKey = DailyQuestManager.getDayKey();
  if (!value || typeof value !== "object") value = { dayKey, dailyRuns: 0, lifetimeFirstClears: {} };
  if (value.dayKey !== dayKey) value = { ...value, dayKey, dailyRuns: 0, lifetimeFirstClears: value.lifetimeFirstClears || {} };
  return value;
}

function saveDungeonEconomyState(player, value) {
  try { player.setDynamicProperty(PLAYER_ECONOMY_KEY, JSON.stringify(value)); } catch {}
}

function dungeonRewardMultiplier(completedToday) {
  if (completedToday < 2) return 1;
  if (completedToday < 4) return 0.75;
  return 0.5;
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

function stageTicks(stage) {
  return Math.max(20, Math.floor(Number(stage?.durationTicks) || 20));
}

function insideArena(location, origin, bounds, margin = 0) {
  return location.x >= origin.x + bounds.min.x - margin && location.x <= origin.x + bounds.max.x + margin &&
    location.y >= origin.y + bounds.min.y - margin && location.y <= origin.y + bounds.max.y + margin &&
    location.z >= origin.z + bounds.min.z - margin && location.z <= origin.z + bounds.max.z + margin;
}

/**
 * Place a behavior-pack structure without passing a path-like identifier through
 * the command parser. Nested pack ids such as
 * daily_dungeon:abandoned_town/clinic_a are valid StructureManager ids, but the
 * `/structure load` command parser used by some Bedrock builds rejects the `/`
 * when the id is not quoted.
 */
function placePackStructure(dimension, structureId, location) {
  const id = String(structureId || "");
  if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/i.test(id)) {
    throw new Error(`invalid structure id: ${id}`);
  }

  let apiError = null;
  try {
    if (world.structureManager && typeof world.structureManager.place === "function") {
      world.structureManager.place(id, dimension, location, {
        includeBlocks: true,
        includeEntities: true
      });
      return;
    }
  } catch (error) {
    apiError = error;
  }

  // Compatibility fallback for older Script API builds. Keep the identifier
  // quoted so nested structure names are parsed as one command argument.
  try {
    dimension.runCommand(`structure load "${id}" ${location.x} ${location.y} ${location.z}`);
  } catch (commandError) {
    throw new Error(`API=${apiError || "unavailable"}; command=${commandError}`);
  }
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

  static hasCompleted(player, templateId) {
    const template = dungeonTemplate(templateId);
    if (!template?.completionKey) return false;
    try { return player.getDynamicProperty(template.completionKey) === true; } catch { return false; }
  }

  static availableSlot() {
    const occupied = new Set([...this.active.values()].map(instance => instance.slot.id));
    return DUNGEON_SLOTS.find(slot => !occupied.has(slot.id) && !this.resettingSlots.has(slot.id)) || null;
  }

  static start(player, templateId = "abandoned_clinic") {
    return this.startGroup(player, [player], templateId);
  }

  /** 创建一个已完成 SAPI Ready 确认的多人副本实例。 */
  static startGroup(leader, players, templateId = "abandoned_clinic") {
    if (!valid(leader)) return false;
    const template = dungeonTemplate(templateId);
    const slot = this.availableSlot();
    if (!template || !slot || !sameDimension(template.dimension, slot.dimension)) return false;
    const participants = [...new Map((players || []).filter(valid).map(player => [player.id, player])).values()];
    if (!participants.some(player => player.id === leader.id)) participants.unshift(leader);
    if (!participants.length || participants.length > Number(template.maxPlayers || 4)) return false;
    if (participants.some(player => readPlayerState(player))) return false;
    const shortId = `${Date.now().toString(36)}${Math.floor(Math.random() * 9999).toString(36)}`.slice(-12);
    const participantIds = participants.map(player => player.id);
    const instance = {
      instanceId: `dungeon_${shortId}`,
      templateId,
      tag: `daily_dng_${shortId}`,
      state: "preparing",
      slot,
      ownerId: leader.id,
      ownerName: leader.name,
      participantIds,
      participantScores: Object.fromEntries(participantIds.map(id => [id, 0])),
      deaths: Object.fromEntries(participantIds.map(id => [id, 0])),
      stageIndex: -1,
      respawnOffset: template.entryOffset,
      stageHadEnemies: false,
      startTick: system.currentTick,
      lastPlayerTick: system.currentTick,
      waitUntil: system.currentTick + 80
    };
    this.active.set(instance.instanceId, instance);
    for (const participant of participants) {
      this.bindPlayer(participant, instance);
      participant.sendMessage(`§e[副本] 队长 ${leader.name} 正在准备 ${template.name}，请稍候……`);
    }

    this.addTickingArea(slot);
    system.runTimeout(() => this.loadAndEnter(instance), 20);
    return instance;
  }

  static bindPlayer(player, instance) {
    const previous = readPlayerState(player);
    writePlayerState(player, {
      instanceId: instance.instanceId,
      templateId: instance.templateId,
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
        placePackStructure(dimension, component.structureId, point);
      } catch (error) {
        onError?.(new Error(`${component.id}: ${error}`));
        return;
      }
      system.runTimeout(() => loadNext(index + 1), Number(template.structureLoadDelayTicks || 8));
    };
    this.prepareArena(instance, dimension, () => loadNext(0), onError);
  }

  /**
   * 多模板共用实例槽位时必须先清空上一个地图。每 tick 只执行一个
   * 32³ fill，避免一次加载几十条大范围命令造成卡顿。
   */
  static prepareArena(instance, dimension, onDone, onError) {
    const template = dungeonTemplate(instance.templateId);
    const jobs = [];
    const min = -2;
    const maxX = Math.max(130, Number(template.arenaBounds?.max?.x) || 0);
    const maxZ = Math.max(130, Number(template.arenaBounds?.max?.z) || 0);
    for (let x = min; x <= maxX; x += 32) {
      for (let z = min; z <= maxZ; z += 32) {
        for (let y = 0; y <= 63; y += 32) {
          const x2 = Math.min(maxX, x + 31);
          const z2 = Math.min(maxZ, z + 31);
          const y2 = Math.min(63, y + 31);
          jobs.push(`fill ${instance.slot.origin.x + x} ${instance.slot.origin.y + y} ${instance.slot.origin.z + z} ${instance.slot.origin.x + x2} ${instance.slot.origin.y + y2} ${instance.slot.origin.z + z2} air`);
        }
      }
    }
    const platform = template.platform;
    if (platform) {
      jobs.push(`fill ${instance.slot.origin.x + platform.min.x} ${instance.slot.origin.y - 1} ${instance.slot.origin.z + platform.min.z} ${instance.slot.origin.x + platform.max.x} ${instance.slot.origin.y - 1} ${instance.slot.origin.z + platform.max.z} ${platform.block}`);
    }
    const run = index => {
      if (index >= jobs.length) return onDone?.();
      try { dimension.runCommand(jobs[index]); }
      catch (error) { onError?.(error); return; }
      system.runTimeout(() => run(index + 1), 1);
    };
    run(0);
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
    instance.stageData = { startedTick: system.currentTick, routeIndex: 0, spawnedWaves: [] };
    let requested = 0;
    if (stage.type === "eliminate" || stage.type === "boss") {
      requested = this.spawnStageGroups(instance, stage, false);
      instance.stageHadEnemies = requested > 0;
    } else if (stage.type === "defend") {
      for (let index = 0; index < (stage.waves || []).length; index++) {
        const wave = stage.waves[index];
        if (Number(wave.atTicks || 0) > 0) continue;
        requested += this.spawnStageGroups(instance, wave, false);
        instance.stageData.spawnedWaves.push(index);
      }
      instance.stageHadEnemies = requested > 0;
    } else if (stage.type === "briefing") {
      this.giveStageLoadout(instance, stage);
      this.sendStageMessages(instance, stage.messages);
    } else if (stage.type === "interact") {
      this.placeStageCrate(instance, stage);
    } else if (stage.type === "route") {
      this.startRouteSupport(instance, stage);
    } else if (stage.type === "disaster") {
      this.sendStageMessages(instance, stage.messages);
      instance.stageData.nextDisasterPulse = system.currentTick + 40;
    }
    if (stage.type === "boss" && instance.stageData.missingBosses?.length) {
      const missing = [...new Set(instance.stageData.missingBosses)].join("、");
      this.sendStageMessages(instance, [`§c[Boss 副本] Apocalypse Boss 生成失败：${missing}。请确认 Apocalypse Mobs BP/RP 已启用且版本匹配。`]);
      return this.finish(instance, false, `Apocalypse Boss 生成失败：${missing}`);
    }
    instance.expectedEnemies = requested;
    instance.waitUntil = system.currentTick + ((stage.type === "eliminate" || stage.type === "boss") ? Number(template.spawnConfirmTicks || 80) : 20);
    const checkpoint = stage.type === "checkpoint" || stage.type === "interact" ? this.checkpoint(instance, stage.checkpoint) : null;
    const checkpointTarget = checkpoint ? absolutePoint(instance.slot.origin, checkpoint.offset) : null;
    for (const id of instance.participantIds) {
      const player = onlinePlayer(id);
      if (!player) continue;
      const coordinate = checkpointTarget ? ` §8(${Math.floor(checkpointTarget.x)}, ${Math.floor(checkpointTarget.y)}, ${Math.floor(checkpointTarget.z)})` : "";
      const detail = ["checkpoint", "interact", "route"].includes(stage.type)
        ? `§e${stage.hint || "前往任务标记点。"}${coordinate}`
        : stage.type === "briefing" ? "§7请阅读剧情与教学提示。"
          : stage.type === "disaster" ? `§d坚持 ${Math.ceil(stageTicks(stage) / 20)} 秒。`
            : stage.type === "defend" ? `§c防守 ${Math.ceil(stageTicks(stage) / 20)} 秒。`
              : `§c预计敌人 ${requested} 名。`;
      player.sendMessage(`§6[副本 ${stageIndex + 1}/${template.stages.length}] §f${stage.name}：${detail}`);
      try { player.onScreenDisplay.setTitle(`§4${stage.name}`, { subtitle: `§e阶段 ${stageIndex + 1}/${template.stages.length}`, fadeInDuration: 5, stayDuration: 35, fadeOutDuration: 10 }); } catch {}
    }
  }

  static sendStageMessages(instance, messages = []) {
    for (const id of instance.participantIds) {
      const player = onlinePlayer(id);
      if (!player) continue;
      for (const message of messages || []) player.sendMessage(message);
    }
  }

  static giveStageLoadout(instance, stage) {
    for (const id of instance.participantIds) {
      const player = onlinePlayer(id);
      if (!player) continue;
      for (const entry of stage.loadout || []) {
        try {
          const stack = new ItemStack(entry.id, Math.max(1, Math.min(64, Number(entry.amount) || 1)));
          if (entry.name) stack.nameTag = entry.name;
          const leftover = player.getComponent("minecraft:inventory")?.container?.addItem(stack);
          if (leftover) player.sendMessage(`§e背包已满，未能放入 ${entry.id}。请清理背包后重开教学。`);
        } catch {
          player.sendMessage(`§c教学装备 ${entry.id} 不可用；请确认已安装 Test Gun Addon。`);
        }
      }
    }
  }

  static placeStageCrate(instance, stage) {
    const checkpoint = this.checkpoint(instance, stage.checkpoint);
    if (!checkpoint) return;
    const location = absolutePoint(instance.slot.origin, checkpoint.offset);
    try {
      const block = world.getDimension(instance.slot.dimension).getBlock(location);
      block?.setPermutation(BlockPermutation.resolve(`daily:loot_crate_${stage.crateTier || "common"}`, { "daily:opened": false }));
      instance.stageData.crateLocation = location;
    } catch (error) {
      console.warn(`[DailyEvents][Dungeon] crate placement failed: ${error}`);
    }
  }

  static startRouteSupport(instance, stage) {
    const dimension = world.getDimension(instance.slot.dimension);
    let entity = null;
    if (stage.reuseEscort && instance.escortEntityId) entity = this.entityById(instance, instance.escortEntityId);
    if (stage.reuseVehicle && instance.vehicleEntityId) entity = this.entityById(instance, instance.vehicleEntityId);
    if (!entity) {
      const spawnId = stage.escortSpawnPoint || stage.vehicleSpawnPoint;
      const location = this.spawnPoint(instance, spawnId);
      const requestedId = stage.escortEntity || stage.vehicleId;
      try { entity = dimension.spawnEntity(requestedId, location); } catch {}
      if (!entity) {
        try { entity = dimension.spawnEntity("daily:convoy_marker", location); } catch {}
      }
      if (entity) {
        try {
          entity.addTag(instance.tag);
          entity.addTag(DUNGEON_ENTITY_TAG);
          entity.nameTag = stage.escortEntity ? "§a周医生" : "§e任务载具";
          entity.nameTagVisible = true;
        } catch {}
      }
    }
    if (stage.escortEntity && entity) instance.escortEntityId = entity.id;
    if (stage.vehicleId && entity) instance.vehicleEntityId = entity.id;
    instance.stageData.supportId = entity?.id || "";
    if (!entity && (stage.escortEntity || stage.vehicleId)) this.sendStageMessages(instance, ["§e联动实体不可用，当前路线允许队伍步行完成。"]);
  }

  static entityById(instance, id) {
    if (!id) return null;
    try { return world.getDimension(instance.slot.dimension).getEntities({ tags: [instance.tag] }).find(entity => entity.id === id && valid(entity)) || null; }
    catch { return null; }
  }

  static spawnStageGroups(instance, stage, force) {
    const dimension = world.getDimension(instance.slot.dimension);
    let requested = 0;
    for (const group of stage.groups || []) {
      const boss = typeof group.bossKey === "string" && group.bossKey.length > 0;
      const method = boss
        ? (force ? "forceDungeonBosses" : "spawnDungeonBosses")
        : (force ? "forceDungeonMobs" : "spawnDungeonMobs");
      const expected = Math.max(0, Math.floor(Number(group.count) || 0));
      const spawned = IntegrationBridge[method](
        dimension,
        this.spawnPoint(instance, group.spawnPoint),
        boss ? group.bossKey : group.mobKey,
        expected,
        [instance.tag, DUNGEON_ENTITY_TAG, DUNGEON_ENEMY_TAG]
      );
      requested += spawned;
      if (boss && spawned < expected) {
        instance.stageData.missingBosses ||= [];
        instance.stageData.missingBosses.push(group.bossKey);
      }
    }
    return requested;
  }

  static objectiveCheckpoint(instance, stage) {
    if (stage.type === "checkpoint" || stage.type === "interact") return this.checkpoint(instance, stage.checkpoint);
    if (stage.type !== "route") return null;
    const route = Array.isArray(stage.route) ? stage.route : [];
    return this.checkpoint(instance, route[Number(instance.stageData?.routeIndex || 0)]);
  }

  static emitObjectiveGuide(instance, stage) {
    if (system.currentTick % 10 !== 0) return;
    const checkpoint = this.objectiveCheckpoint(instance, stage);
    if (!checkpoint) return;
    const dimension = world.getDimension(instance.slot.dimension);
    const target = absolutePoint(instance.slot.origin, checkpoint.offset);

    // 自定义全亮粒子保证在灵动视效下仍清晰；原版粒子作为未加载 RP 时的兼容回退。
    // 目标光柱从地面延伸到 8 格高，建筑遮挡时仍能看到上半段。
    for (let y = 0.5; y <= 8.5; y += 1) {
      const location = { x: target.x, y: target.y + y, z: target.z };
      try { dimension.spawnParticle("daily_events:objective_beacon", location); } catch {}
      try { dimension.spawnParticle("minecraft:totem_particle", location); } catch {}
    }
    for (const id of instance.participantIds) {
      const player = onlinePlayer(id);
      if (!player || !sameDimension(player.dimension.id, instance.slot.dimension)) continue;
      const dx = target.x - player.location.x;
      const dz = target.z - player.location.z;
      const horizontal = Math.hypot(dx, dz);
      if (horizontal < 5) continue;
      const markers = Math.min(18, Math.floor(horizontal / 3));
      for (let index = 1; index <= markers; index++) {
        const ratio = Math.min(0.92, (index * 3) / horizontal);
        const location = {
          x: player.location.x + dx * ratio,
          y: player.location.y + 1.15,
          z: player.location.z + dz * ratio
        };
        try { dimension.spawnParticle("daily_events:objective_trail", location); } catch {}
        try {
          dimension.spawnParticle("minecraft:basic_flame_particle", location);
        } catch {}
      }
    }
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

  static enemies(instance) {
    try { return world.getDimension(instance.slot.dimension).getEntities({ tags: [instance.tag, DUNGEON_ENEMY_TAG] }); }
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
    if (["checkpoint", "interact", "route"].includes(stage.type)) this.emitObjectiveGuide(instance, stage);
    if (stage.type === "checkpoint") {
      if (system.currentTick >= instance.waitUntil && this.checkpointReached(instance, stage)) this.beginStage(instance, instance.stageIndex + 1);
      return;
    }
    if (stage.type === "briefing") {
      if (system.currentTick - instance.stageData.startedTick >= stageTicks(stage)) this.beginStage(instance, instance.stageIndex + 1);
      return;
    }
    if (stage.type === "interact") return;
    if (stage.type === "route") {
      if (this.tickRoute(instance, stage)) this.beginStage(instance, instance.stageIndex + 1);
      return;
    }
    if (stage.type === "disaster") {
      this.tickDisaster(instance, stage);
      if (system.currentTick - instance.stageData.startedTick >= stageTicks(stage)) this.beginStage(instance, instance.stageIndex + 1);
      return;
    }
    if (stage.type === "defend") {
      this.tickDefense(instance, stage);
      const elapsed = system.currentTick - instance.stageData.startedTick;
      if (elapsed >= stageTicks(stage) && this.enemies(instance).length === 0) this.beginStage(instance, instance.stageIndex + 1);
      return;
    }

    const enemies = this.enemies(instance);
    if (enemies.length) { instance.stageHadEnemies = true; return; }
    if (system.currentTick < instance.waitUntil) return;
    if (instance.stageHadEnemies) return this.beginStage(instance, instance.stageIndex + 1);
    this.finish(instance, false, "确认性生成没有产生任何敌人，请检查 Apocalypse Mobs 或副本刷怪坐标");
  }

  static tickDefense(instance, stage) {
    const elapsed = system.currentTick - instance.stageData.startedTick;
    for (let index = 0; index < (stage.waves || []).length; index++) {
      if (instance.stageData.spawnedWaves.includes(index)) continue;
      const wave = stage.waves[index];
      if (elapsed < Number(wave.atTicks || 0)) continue;
      const count = this.spawnStageGroups(instance, wave, false);
      instance.stageData.spawnedWaves.push(index);
      instance.stageHadEnemies ||= count > 0;
      this.sendStageMessages(instance, [`§c[副本] 新一波敌人抵达（${count}）`]);
    }
    if (stage.defensePoint && elapsed % 40 === 0) {
      const anchor = this.spawnPoint(instance, stage.defensePoint);
      const leashRadiusSq = Number(stage.defenseLeashRadius || 30) ** 2;
      let offset = 0;
      for (const enemy of this.enemies(instance)) {
        if (distanceSquared(enemy.location, anchor) <= leashRadiusSq) continue;
        const angle = (offset++ % 8) * Math.PI / 4;
        try {
          enemy.teleport({
            x: anchor.x + Math.cos(angle) * 8,
            y: anchor.y,
            z: anchor.z + Math.sin(angle) * 8
          });
        } catch {}
      }
    }
    if (elapsed % 100 === 0) {
      const remain = Math.max(0, Math.ceil((stageTicks(stage) - elapsed) / 20));
      for (const id of instance.participantIds) {
        try { onlinePlayer(id)?.onScreenDisplay.setActionBar(`§c防守剩余 ${remain}s §8| §f敌人 ${this.enemies(instance).length}`); } catch {}
      }
    }
  }

  static tickRoute(instance, stage) {
    const route = Array.isArray(stage.route) ? stage.route : [];
    const index = Number(instance.stageData.routeIndex || 0);
    if (index >= route.length) return true;
    const checkpoint = this.checkpoint(instance, route[index]);
    if (!checkpoint) return true;
    const target = absolutePoint(instance.slot.origin, checkpoint.offset);
    this.tickRouteWaves(instance, stage, index);
    const radiusSq = Number(checkpoint.radius || 5) ** 2;
    const nearby = instance.participantIds.map(onlinePlayer).find(player => player && sameDimension(player.dimension.id, instance.slot.dimension) && distanceSquared(player.location, target) <= radiusSq);
    const support = this.entityById(instance, instance.stageData.supportId) ||
      (stage.escortEntity ? this.entityById(instance, instance.escortEntityId) : this.entityById(instance, instance.vehicleEntityId));

    if (stage.escortEntity && support && system.currentTick % 20 === 0) {
      const escorting = instance.participantIds.map(onlinePlayer).some(player => player && sameDimension(player.dimension.id, instance.slot.dimension) && distanceSquared(player.location, support.location) <= 18 * 18);
      if (escorting) {
        const dx = target.x - support.location.x;
        const dz = target.z - support.location.z;
        const length = Math.max(0.01, Math.hypot(dx, dz));
        try { support.teleport({ x: support.location.x + dx / length * Math.min(1.5, length), y: target.y, z: support.location.z + dz / length * Math.min(1.5, length) }); } catch {}
      }
    }
    if (system.currentTick % 40 === 0) {
      for (const id of instance.participantIds) {
        const player = onlinePlayer(id);
        if (!player) continue;
        const distance = Math.floor(Math.sqrt(distanceSquared(player.location, target)));
        try { player.onScreenDisplay.setActionBar(`§6路线 ${index + 1}/${route.length} §8| §f${checkpoint.name} §e${distance}m §8| §7${Math.floor(target.x)}, ${Math.floor(target.y)}, ${Math.floor(target.z)}`); } catch {}
      }
    }
    const supportReady = !stage.escortEntity || !support || distanceSquared(support.location, target) <= radiusSq;
    if (!nearby || !supportReady) return false;
    instance.stageData.routeIndex = index + 1;
    instance.respawnOffset = checkpoint.offset;
    for (const id of instance.participantIds) {
      instance.participantScores[id] = Number(instance.participantScores[id] || 0) + 1;
      onlinePlayer(id)?.sendMessage(`§a✓ 路线节点 ${index + 1}/${route.length}：${checkpoint.name}`);
    }
    return index + 1 >= route.length;
  }

  static tickRouteWaves(instance, stage, routeIndex) {
    for (let waveIndex = 0; waveIndex < (stage.routeWaves || []).length; waveIndex++) {
      const wave = stage.routeWaves[waveIndex];
      if (Number(wave.routeIndex || 0) !== routeIndex) continue;
      const key = `route:${routeIndex}:${waveIndex}`;
      if (instance.stageData.spawnedWaves.includes(key)) continue;
      const count = this.spawnStageGroups(instance, wave, false);
      instance.stageData.spawnedWaves.push(key);
      instance.stageHadEnemies ||= count > 0;
      this.sendStageMessages(instance, [`§4[尸潮] §c噪声引来了 ${count} 名感染者，保持移动，不必停下清场！`]);
    }
  }

  static tickDisaster(instance, stage) {
    if (system.currentTick < Number(instance.stageData.nextDisasterPulse || 0)) return;
    instance.stageData.nextDisasterPulse = system.currentTick + Math.max(40, 100 - Number(stage.difficulty || 0) * 12);
    const players = instance.participantIds.map(onlinePlayer).filter(Boolean);
    if (!players.length) return;
    const player = players[Math.floor(Math.random() * players.length)];
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.max(7, 15 - Number(stage.difficulty || 0) * 2);
    const location = { x: player.location.x + Math.cos(angle) * radius, y: player.location.y, z: player.location.z + Math.sin(angle) * radius };
    try { player.dimension.spawnEntity("minecraft:lightning_bolt", location); } catch {}
    try { player.runCommand("playsound ambient.weather.thunder @s ~ ~ ~ 0.8 0.9"); } catch {}
    const elapsed = system.currentTick - instance.stageData.startedTick;
    const remain = Math.max(0, Math.ceil((stageTicks(stage) - elapsed) / 20));
    for (const id of instance.participantIds) {
      try { onlinePlayer(id)?.onScreenDisplay.setActionBar(`§d${stage.name} §8| §f避险 ${remain}s`); } catch {}
    }
  }

  static onBlockInteract(event) {
    const player = event?.player;
    const block = event?.block;
    const instance = player ? this.playerInstance(player) : null;
    const template = instance ? dungeonTemplate(instance.templateId) : null;
    const stage = template?.stages?.[instance.stageIndex];
    if (!instance || !stage || stage.type !== "interact" || !block) return false;
    const target = instance.stageData?.crateLocation;
    if (!target || !sameDimension(block.dimension.id, instance.slot.dimension) || distanceSquared(block.location, target) > 4) return false;
    if (!String(block.typeId).startsWith("daily:loot_crate_")) return false;
    for (const id of instance.participantIds) instance.participantScores[id] = Number(instance.participantScores[id] || 0) + 1;
    this.sendStageMessages(instance, ["§a✓ 已完成物资箱教学。普通箱可直接开启，神话箱需要补给卡。"]);
    system.runTimeout(() => {
      if (this.active.has(instance.instanceId) && instance.stageIndex === template.stages.indexOf(stage)) this.beginStage(instance, instance.stageIndex + 1);
    }, 2);
    return true;
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
    if (state?.templateId === "newcomer_valley") this.cleanupTutorialLoans(player);
    writePlayerState(player, null);
    try { player.removeTag("daily_in_dungeon"); } catch {}
    if (message) player.sendMessage(`§e[副本] ${message}`);
  }

  static cleanupTutorialLoans(player) {
    try {
      const container = player.getComponent("minecraft:inventory")?.container;
      if (!container) return;
      for (let slot = 0; slot < container.size; slot++) {
        const item = container.getItem(slot);
        const name = String(item?.nameTag || "").replace(/§./g, "");
        if (name === "教学用 AK74U [普通]" || name === "教学步枪弹") container.setItem(slot, undefined);
      }
    } catch {}
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
        const completed = template.oneTimeReward && this.hasCompleted(player, template.id);
        const uniqueId = template.oneTimeReward ? `dungeon-once:${template.id}:v1` : `dungeon:${instance.instanceId}:${id}`;
        const economyState = dungeonEconomyState(player);
        const firstClear = !economyState.lifetimeFirstClears?.[template.id];
        const multiplier = dungeonRewardMultiplier(Number(economyState.dailyRuns || 0));
        const granted = completed ? false : template.oneTimeReward
          ? RewardManager.grant(player, template.rewardId, uniqueId, `dungeon:${template.id}`)
          : RewardManager.grantDungeon(player, template.rewardId, uniqueId, template.rewardTier || "normal", firstClear, multiplier);
        if (granted && !template.oneTimeReward) {
          economyState.dailyRuns = Number(economyState.dailyRuns || 0) + 1;
          economyState.lifetimeFirstClears ||= {};
          economyState.lifetimeFirstClears[template.id] = true;
          saveDungeonEconomyState(player, economyState);
        }
        if (template.oneTimeReward && granted) {
          try { player.setDynamicProperty(template.completionKey, true); } catch {}
        } else if (template.oneTimeReward && completed) {
          player.sendMessage("§e新手教程可以重玩，但 2000 元与优良图纸每名玩家只能领取一次。此次不重复发奖。");
        }
        DailyQuestManager.onDungeonSuccess(player, template.id);
        try { player.runCommand(`scriptevent story:dungeon_complete ${template.id}`); } catch {}
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
      dimension.runCommand(`tickingarea add ${slot.origin.x - 8} ${slot.origin.y} ${slot.origin.z - 8} ${slot.origin.x + 136} ${slot.origin.y} ${slot.origin.z + 136} ${name} true`);
    } catch {}
  }

  static removeTickingArea(slot) {
    try { world.getDimension(slot.dimension).runCommand(`tickingarea remove daily_${slot.id}`); } catch {}
  }

  static resetSlot(instance) {
    this.resettingSlots.add(instance.slot.id);
    this.addTickingArea(instance.slot);
    system.runTimeout(() => {
      let dimension;
      try { dimension = world.getDimension(instance.slot.dimension); }
      catch (error) {
        console.warn(`[DailyEvents][Dungeon] slot cleanup failed: ${error}`);
        this.resettingSlots.delete(instance.slot.id);
        return;
      }
      this.prepareArena(instance, dimension, () => {
        system.runTimeout(() => {
          this.removeTickingArea(instance.slot);
          this.resettingSlots.delete(instance.slot.id);
        }, 40);
      }, error => {
        console.warn(`[DailyEvents][Dungeon] slot cleanup failed: ${error}`);
        this.removeTickingArea(instance.slot);
        this.resettingSlots.delete(instance.slot.id);
      });
    }, 20);
  }
}
