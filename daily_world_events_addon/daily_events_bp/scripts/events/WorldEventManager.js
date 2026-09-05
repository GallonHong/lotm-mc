import { world, system } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { EVENT_TEMPLATES, chooseTemplate } from "./templates/eventTemplates.js";
import { EventNodeRegistry } from "./EventNodeRegistry.js";
import { IntegrationBridge } from "../integration/IntegrationBridge.js";
import { RewardManager } from "../rewards/RewardManager.js";
import { DailyQuestManager } from "../daily/DailyQuestManager.js";
import { DailyNewsManager } from "./DailyNewsManager.js";
import { HopePostManager } from "./HopePostManager.js";

function valid(entity) {
  try { return !!entity && entity.isValid(); } catch { return false; }
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }

function wavesFor(template, zoneType) {
  return zoneType === "outlaw" && template.outlawWaves ? template.outlawWaves : template.waves;
}

function defenseTicksFor(template, zoneType) {
  return zoneType === "outlaw" && template.outlawDefenseTicks ? template.outlawDefenseTicks : template.defenseTicks;
}

function waveTicksFor(template, zoneType) {
  return zoneType === "outlaw" && template.outlawWaveAtTicks ? template.outlawWaveAtTicks : template.waveAtTicks;
}

export class WorldEventManager {
  static active = new Map();

  static initializeCleanup() {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
      try {
        for (const entity of world.getDimension(dimensionId).getEntities({ tags: ["daily_event_entity"] })) entity.remove();
      } catch {}
    }
  }

  static cleanupIfStale(entity) {
    try {
      if (!entity?.hasTag("daily_event_entity")) return false;
      const belongsToActive = [...this.active.values()].some(instance => entity.hasTag(instance.tag));
      if (!belongsToActive) { entity.remove(); return true; }
    } catch {}
    return false;
  }

  static start(node, templateId = null, triggeringPlayer = null, options = {}) {
    if (!node || this.active.has(node.id) || Number(node.cooldownUntil || 0) > Date.now()) return false;
    if ([...this.active.values()].some(value => value.dimension === node.dimension && distance(value.center, node.location) < 80)) return false;
    const zone = IntegrationBridge.resolveZone(node.dimension, node.location);
    const id = templateId && EVENT_TEMPLATES[templateId] ? templateId : chooseTemplate(node.allowedEvents, zone.type);
    const template = EVENT_TEMPLATES[id];
    if (!template || (zone.type === "safe" && template.allowSafeZone !== true) || (template.zones && !template.zones.includes(zone.type))) return false;
    let dimension;
    try { dimension = world.getDimension(node.dimension); } catch { return false; }
    const shortId = `${Date.now().toString(36)}${Math.floor(Math.random() * 999).toString(36)}`.slice(-12);
    const instance = {
      instanceId: `event_${shortId}`,
      templateId: id,
      nodeId: node.id,
      state: options.waitForPlayers === true ? "announced" : "triggered",
      tag: `daily_ev_${shortId}`,
      dimension: node.dimension,
      center: { ...node.location },
      zoneType: zone.type,
      zoneName: zone.name,
      startTick: system.currentTick,
      lastPlayerTick: system.currentTick,
      waveIndex: 0,
      spawnedWaves: 0,
      waitUntil: system.currentTick + 40,
      participantScores: {},
      disqualifiedPlayerIds: [],
      specialEntityId: null,
      triggerPlayerId: triggeringPlayer?.id || null,
      newsPresetId: options.newsPresetId || null,
      locationName: String(options.locationName || node.name || zone.name || "事件区域"),
      newsPublished: false,
      arrivalDeadlineTick: system.currentTick + Number(CONFIG.newsArrivalGraceTicks || 2400)
    };
    this.active.set(node.id, instance);
    if (instance.state === "announced") {
      DailyNewsManager.publishEventStart(instance, template);
      instance.newsPublished = true;
      return instance;
    }
    return this.activate(instance, template);
  }

  static activate(instance, template) {
    let dimension;
    try { dimension = world.getDimension(instance.dimension); }
    catch { return false; }
    instance.state = "triggered";
    instance.startTick = system.currentTick;
    instance.lastPlayerTick = system.currentTick;
    if (template.mode === "rescue") this.spawnSpecial(instance, "daily:survivor", "§a受困幸存者");
    if (template.mode === "defense") this.spawnSpecial(instance, template.objectiveEntityId || "daily:convoy_marker", template.objectiveName || "§6坠毁运输车");
    if (template.mode === "boss") {
      const boss = this.spawnSpecial(instance, template.bossEntityId, template.bossName || `§4${template.name}`);
      if (!boss) {
        if (instance.newsPublished) this.finish(instance, false, "目标实体生成失败");
        else this.active.delete(instance.nodeId);
        return false;
      }
    }
    if (template.mode !== "defense" && template.mode !== "boss") this.spawnWave(instance, wavesFor(template, instance.zoneType)[0]);
    instance.state = "active";
    if (!instance.newsPublished) {
      DailyNewsManager.publishEventStart(instance, template);
      instance.newsPublished = true;
    }
    for (const player of dimension.getPlayers({ location: instance.center, maxDistance: 80 })) {
      const zoneLabel = instance.zoneType === "outlaw" ? "§4非法制区·高危" : instance.zoneType === "safe" ? "§a安全区·入侵事件" : "§e法制区·常规";
      player.sendMessage(`§4⚠ [动态事件] ${template.name} 已开始！§7（${zoneLabel}§7）`);
      try { player.onScreenDisplay.setTitle(`§4${template.name}`, { subtitle: `${zoneLabel} §7| §e参与战斗可获得个人奖励`, fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 }); } catch {}
    }
    return instance;
  }

  static spawnSpecial(instance, typeId, nameTag) {
    try {
      const entity = world.getDimension(instance.dimension).spawnEntity(typeId, instance.center);
      entity.nameTag = nameTag;
      entity.addTag(instance.tag);
      entity.addTag("daily_event_entity");
      entity.addTag("daily_event_special");
      if (instance.zoneType === "safe") entity.addTag("daily_allow_safe_zone");
      instance.specialEntityId = entity.id;
      return entity;
    } catch (error) { console.warn(`[DailyEvents] 特殊实体生成失败: ${error}`); return null; }
  }

  static spawnWave(instance, wave) {
    const dimension = world.getDimension(instance.dimension);
    let requested = 0;
    for (const group of wave || []) {
      if (requested >= CONFIG.eventMaxEntities) break;
      const count = Math.min(Number(group.count || 1), CONFIG.eventMaxEntities - requested);
      requested += instance.zoneType === "safe"
        ? IntegrationBridge.spawnSafeZoneEventMobs(dimension, instance.center, group.mobKey, count, [instance.tag], 7, 16)
        : IntegrationBridge.spawnEventMobs(dimension, instance.center, group.mobKey, count, [instance.tag], 7, 16);
    }
    instance.spawnedWaves++;
    instance.waitUntil = system.currentTick + 40;
    for (const player of dimension.getPlayers({ location: instance.center, maxDistance: 60 })) {
      player.sendMessage(`§c[事件] 第 ${instance.spawnedWaves} 波来袭，预计敌人 ${requested} 名。`);
    }
  }

  static getEntities(instance, special = false) {
    try {
      return world.getDimension(instance.dimension).getEntities({ tags: [instance.tag] }).filter(entity => special ? entity.hasTag("daily_event_special") : !entity.hasTag("daily_event_special"));
    } catch { return []; }
  }

  static getSpecial(instance) {
    return this.getEntities(instance, true).find(entity => entity.id === instance.specialEntityId) || null;
  }

  static tick() {
    for (const instance of [...this.active.values()]) this.tickInstance(instance);
  }

  static tickInstance(instance) {
    const template = EVENT_TEMPLATES[instance.templateId];
    if (!template) return this.finish(instance, false, "模板不存在");
    let dimension;
    try { dimension = world.getDimension(instance.dimension); } catch { return this.finish(instance, false, "维度不可用"); }
    const nearby = dimension.getPlayers({ location: instance.center, maxDistance: CONFIG.eventJoinRadius });
    if (instance.state === "announced") {
      if (nearby.length) this.activate(instance, template);
      else if (system.currentTick >= Number(instance.arrivalDeadlineTick || 0)) this.finish(instance, false, "限时内无人抵达");
      return;
    }
    if (system.currentTick - instance.startTick > CONFIG.eventTimeoutTicks) return this.finish(instance, false, "事件超时");
    if (nearby.length) instance.lastPlayerTick = system.currentTick;
    else if (system.currentTick - instance.lastPlayerTick > 600) return this.finish(instance, false, "参与者已离开区域");

    if (template.mode === "defense") {
      const waves = wavesFor(template, instance.zoneType);
      const waveTicks = waveTicksFor(template, instance.zoneType);
      const defenseTicks = defenseTicksFor(template, instance.zoneType);
      for (const player of nearby) {
        if (instance.disqualifiedPlayerIds.includes(player.id)) continue;
        instance.participantScores[player.id] = Number(instance.participantScores[player.id] || 0) + 0.25;
      }
      for (let index = instance.spawnedWaves; index < waves.length; index++) {
        if (system.currentTick - instance.startTick >= waveTicks[index]) this.spawnWave(instance, waves[index]);
        else break;
      }
      const elapsed = system.currentTick - instance.startTick;
      if (elapsed >= defenseTicks && this.getEntities(instance).length === 0) return this.finish(instance, true);
      if (system.currentTick % 100 === 0) {
        const seconds = Math.max(0, Math.ceil((defenseTicks - elapsed) / 20));
        for (const player of nearby) player.sendMessage(`§6[运输车防守] 剩余 ${seconds} 秒。`);
      }
      return;
    }

    if (template.mode === "rescue") {
      const survivor = this.getSpecial(instance);
      if (!valid(survivor)) return this.finish(instance, false, "幸存者死亡");
      for (const mob of this.getEntities(instance)) {
        if (distance(mob.location, survivor.location) <= 3.2) {
          try { survivor.applyDamage(1); } catch {}
        }
      }
    }

    if (template.mode === "boss") {
      if (!valid(this.getSpecial(instance))) return this.finish(instance, true);
      return;
    }

    if (system.currentTick < instance.waitUntil) return;
    const living = this.getEntities(instance);
    if (living.length) return;
    const waves = wavesFor(template, instance.zoneType);
    if (instance.spawnedWaves < waves.length) {
      this.spawnWave(instance, waves[instance.spawnedWaves]);
      return;
    }
    this.finish(instance, true);
  }

  static recordCombat(entity, player, damage = 1, killed = false) {
    if (!entity || !player) return false;
    for (const instance of this.active.values()) {
      try {
        if (!entity.hasTag(instance.tag) || distance(player.location, instance.center) > CONFIG.eventJoinRadius) continue;
        if (instance.disqualifiedPlayerIds.includes(player.id)) return false;
        instance.participantScores[player.id] = Number(instance.participantScores[player.id] || 0) + Math.max(0.5, Math.min(3, Number(damage) || 1)) + (killed ? 3 : 0);
        return true;
      } catch {}
    }
    return false;
  }

  static onPlayerDeath(player) {
    if (!player) return false;
    let disqualified = false;
    for (const instance of this.active.values()) {
      try {
        if (player.dimension.id !== instance.dimension) continue;
        if (distance(player.location, instance.center) > CONFIG.eventJoinRadius) continue;
        const participated = Number(instance.participantScores[player.id] || 0) > 0 || instance.triggerPlayerId === player.id;
        if (!participated || instance.disqualifiedPlayerIds.includes(player.id)) continue;
        instance.disqualifiedPlayerIds.push(player.id);
        disqualified = true;
      } catch {}
    }
    if (disqualified) {
      try { player.sendMessage("§c[动态事件] 你已阵亡，本次事件的奖励与日常进度资格已失效。"); } catch {}
    }
    return disqualified;
  }

  static finish(instance, success, reason = "") {
    const template = EVENT_TEMPLATES[instance.templateId];
    const dimension = world.getDimension(instance.dimension);
    instance.state = success ? "success" : "failed";
    for (const entity of this.getEntities(instance).concat(this.getEntities(instance, true))) {
      try { entity.remove(); } catch {}
    }
    if (success) {
      for (const player of world.getAllPlayers()) {
        const score = Number(instance.participantScores[player.id] || 0);
        if (score < CONFIG.participantMinScore) continue;
        if (instance.disqualifiedPlayerIds.includes(player.id)) {
          player.sendMessage(`§c动态事件已完成，但你在「${template.name}」中阵亡，未获得奖励与日常进度。`);
          continue;
        }
        const rewardId = instance.zoneType === "outlaw" && template.outlawRewardId ? template.outlawRewardId : template.rewardId;
        RewardManager.grant(player, rewardId, `event:${instance.instanceId}:${player.id}`, `world_event:${instance.templateId}:${instance.zoneType}`);
        DailyQuestManager.onWorldEventSuccess(player, instance.templateId);
        HopePostManager.record(player, "events", 1);
        player.sendMessage(`§a☑ 动态事件完成：${template.name}（参与分 ${score.toFixed(1)}）`);
      }
      try { dimension.spawnParticle("minecraft:totem_particle", instance.center); } catch {}
    }
    for (const player of dimension.getPlayers({ location: instance.center, maxDistance: 80 })) {
      if (!success) player.sendMessage(`§c✘ 动态事件失败：${template?.name || instance.templateId}${reason ? `（${reason}）` : ""}`);
    }
    DailyNewsManager.publishEventResult(instance, template, success, reason);
    EventNodeRegistry.setCooldown(instance.nodeId);
    this.active.delete(instance.nodeId);
  }

  static scanNodes() {
    const nodes = EventNodeRegistry.getNodes();
    for (const node of nodes) {
      if (this.active.has(node.id) || Number(node.cooldownUntil || 0) > Date.now()) continue;
      let dimension;
      try { dimension = world.getDimension(node.dimension); } catch { continue; }
      const players = dimension.getPlayers({ location: node.location, maxDistance: Number(node.triggerRadius || 35) });
      if (players.length) this.start(node, null, players[0]);
    }
  }

  static stopNear(player) {
    const instance = [...this.active.values()].filter(value => value.dimension === player.dimension.id)
      .sort((a, b) => distance(a.center, player.location) - distance(b.center, player.location))[0];
    if (!instance || distance(instance.center, player.location) > 100) return false;
    this.finish(instance, false, "管理员终止");
    return true;
  }

  static list() {
    return [...this.active.values()].map(instance => ({
      ...instance,
      participantScores: { ...instance.participantScores },
      disqualifiedPlayerIds: [...instance.disqualifiedPlayerIds]
    }));
  }
}
