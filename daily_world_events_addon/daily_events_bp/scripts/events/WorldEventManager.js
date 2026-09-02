import { world, system } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { EVENT_TEMPLATES, chooseTemplate } from "./templates/eventTemplates.js";
import { EventNodeRegistry } from "./EventNodeRegistry.js";
import { IntegrationBridge } from "../integration/IntegrationBridge.js";
import { RewardManager } from "../rewards/RewardManager.js";
import { DailyQuestManager } from "../daily/DailyQuestManager.js";

function valid(entity) {
  try { return !!entity && entity.isValid(); } catch { return false; }
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }

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

  static start(node, templateId = null, triggeringPlayer = null) {
    if (!node || this.active.has(node.id) || Number(node.cooldownUntil || 0) > Date.now()) return false;
    if (IntegrationBridge.isSafeZone(node.dimension, node.location)) return false;
    const id = templateId && EVENT_TEMPLATES[templateId] ? templateId : chooseTemplate(node.allowedEvents);
    const template = EVENT_TEMPLATES[id];
    if (!template) return false;
    let dimension;
    try { dimension = world.getDimension(node.dimension); } catch { return false; }
    const shortId = `${Date.now().toString(36)}${Math.floor(Math.random() * 999).toString(36)}`.slice(-12);
    const instance = {
      instanceId: `event_${shortId}`,
      templateId: id,
      nodeId: node.id,
      state: "triggered",
      tag: `daily_ev_${shortId}`,
      dimension: node.dimension,
      center: { ...node.location },
      startTick: system.currentTick,
      lastPlayerTick: system.currentTick,
      waveIndex: 0,
      spawnedWaves: 0,
      waitUntil: system.currentTick + 40,
      participantScores: {},
      specialEntityId: null,
      triggerPlayerId: triggeringPlayer?.id || null
    };
    this.active.set(node.id, instance);
    if (template.mode === "rescue") this.spawnSpecial(instance, "daily:survivor", "§a受困幸存者");
    if (template.mode === "defense") this.spawnSpecial(instance, "daily:convoy_marker", "§6坠毁运输车");
    if (template.mode !== "defense") this.spawnWave(instance, template.waves[0]);
    instance.state = "active";
    for (const player of dimension.getPlayers({ location: node.location, maxDistance: 80 })) {
      player.sendMessage(`§4⚠ [动态事件] ${template.name} 已开始！`);
      try { player.onScreenDisplay.setTitle(`§4${template.name}`, { subtitle: "§e参与战斗可获得个人奖励", fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 }); } catch {}
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
      instance.specialEntityId = entity.id;
    } catch (error) { console.warn(`[DailyEvents] 特殊实体生成失败: ${error}`); }
  }

  static spawnWave(instance, wave) {
    const dimension = world.getDimension(instance.dimension);
    let requested = 0;
    for (const group of wave || []) {
      if (requested >= CONFIG.eventMaxEntities) break;
      const count = Math.min(Number(group.count || 1), CONFIG.eventMaxEntities - requested);
      requested += IntegrationBridge.spawnEventMobs(dimension, instance.center, group.mobKey, count, [instance.tag], 7, 16);
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
    if (system.currentTick - instance.startTick > CONFIG.eventTimeoutTicks) return this.finish(instance, false, "事件超时");
    let dimension;
    try { dimension = world.getDimension(instance.dimension); } catch { return this.finish(instance, false, "维度不可用"); }
    const nearby = dimension.getPlayers({ location: instance.center, maxDistance: CONFIG.eventJoinRadius });
    if (nearby.length) instance.lastPlayerTick = system.currentTick;
    else if (system.currentTick - instance.lastPlayerTick > 600) return this.finish(instance, false, "参与者已离开区域");

    if (template.mode === "defense") {
      for (const player of nearby) instance.participantScores[player.id] = Number(instance.participantScores[player.id] || 0) + 0.25;
      for (let index = instance.spawnedWaves; index < template.waves.length; index++) {
        if (system.currentTick - instance.startTick >= template.waveAtTicks[index]) this.spawnWave(instance, template.waves[index]);
        else break;
      }
      const elapsed = system.currentTick - instance.startTick;
      if (elapsed >= template.defenseTicks && this.getEntities(instance).length === 0) return this.finish(instance, true);
      if (system.currentTick % 100 === 0) {
        const seconds = Math.max(0, Math.ceil((template.defenseTicks - elapsed) / 20));
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

    if (system.currentTick < instance.waitUntil) return;
    const living = this.getEntities(instance);
    if (living.length) return;
    if (instance.spawnedWaves < template.waves.length) {
      this.spawnWave(instance, template.waves[instance.spawnedWaves]);
      return;
    }
    this.finish(instance, true);
  }

  static recordCombat(entity, player, damage = 1, killed = false) {
    if (!entity || !player) return false;
    for (const instance of this.active.values()) {
      try {
        if (!entity.hasTag(instance.tag) || distance(player.location, instance.center) > CONFIG.eventJoinRadius) continue;
        instance.participantScores[player.id] = Number(instance.participantScores[player.id] || 0) + Math.max(0.5, Math.min(3, Number(damage) || 1)) + (killed ? 3 : 0);
        return true;
      } catch {}
    }
    return false;
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
        RewardManager.grant(player, template.rewardId, `event:${instance.instanceId}:${player.id}`, `world_event:${instance.templateId}`);
        DailyQuestManager.onWorldEventSuccess(player, instance.templateId);
        player.sendMessage(`§a☑ 动态事件完成：${template.name}（参与分 ${score.toFixed(1)}）`);
      }
      try { dimension.spawnParticle("minecraft:totem_particle", instance.center); } catch {}
    }
    for (const player of dimension.getPlayers({ location: instance.center, maxDistance: 80 })) {
      if (!success) player.sendMessage(`§c✘ 动态事件失败：${template?.name || instance.templateId}${reason ? `（${reason}）` : ""}`);
    }
    EventNodeRegistry.setCooldown(instance.nodeId);
    this.active.delete(instance.nodeId);
  }

  static scanNodes() {
    const nodes = EventNodeRegistry.getNodes();
    for (const node of nodes) {
      if (this.active.has(node.id) || Number(node.cooldownUntil || 0) > Date.now()) continue;
      if (IntegrationBridge.isSafeZone(node.dimension, node.location)) continue;
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
    return [...this.active.values()].map(instance => ({ ...instance, participantScores: { ...instance.participantScores } }));
  }
}
