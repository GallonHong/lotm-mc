import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { ZoneRegistry } from "./zones.js";
import { SpawnDirector } from "./spawnDirector.js";
import { LootManager } from "./loot.js";

export class WorldEventDirector {
  static active = null;
  static lastEventTick = -CONFIG.eventCooldownTicks;

  static trigger(player, forced = false) {
    if (this.active || !player || ZoneRegistry.isSafe(player.dimension.id, player.location)) return false;
    if (!forced && system.currentTick - this.lastEventTick < CONFIG.eventCooldownTicks) return false;
    const eventId = `ambush_${Date.now().toString(36)}`;
    const tag = `apoc_event_${eventId}`;
    const ids = [];
    const wave = ["basic", "basic", "runner", "runner", "spitter", Math.random() < 0.4 ? "mutant" : "basic"];
    for (let index = 0; index < wave.length; index++) {
      const entity = SpawnDirector.spawnNearPlayer(player, wave[index], [tag], 10, 18);
      if (entity) ids.push(entity.id);
    }
    if (ids.length === 0) return false;
    this.active = {
      id: eventId,
      tag,
      entityIds: ids,
      dimension: player.dimension.id,
      center: { ...player.location },
      startedAt: system.currentTick,
      participants: new Set([player.id])
    };
    this.lastEventTick = system.currentTick;
    for (const nearby of player.dimension.getPlayers({ location: player.location, maxDistance: 80 })) {
      nearby.sendMessage("§4☣ [动态事件] 废弃补给点惊动了感染者！清理伏击可获得奖励。");
      try { nearby.onScreenDisplay.setTitle("§4感染者伏击", { subtitle: "§e清理区域内的敌人", fadeInDuration: 5, stayDuration: 45, fadeOutDuration: 10 }); } catch {}
    }
    return true;
  }

  static tick() {
    if (!this.active) return;
    let dimension;
    try { dimension = world.getDimension(this.active.dimension); } catch { this.active = null; return; }
    const living = [];
    for (const entity of dimension.getEntities({ tags: [this.active.tag] })) {
      try { if (entity.isValid()) living.push(entity.id); } catch {}
    }
    for (const player of dimension.getPlayers({ location: this.active.center, maxDistance: 64 })) this.active.participants.add(player.id);
    if (living.length > 0 && system.currentTick - this.active.startedAt < 3600) {
      this.active.entityIds = living;
      return;
    }
    const completed = living.length === 0;
    for (const player of world.getAllPlayers()) {
      if (!this.active.participants.has(player.id)) continue;
      if (completed) {
        LootManager.rewardCurrency(player, 100);
        player.sendMessage("§a☑ [动态事件] 感染者伏击已清理。");
      } else player.sendMessage("§7[动态事件] 伏击超时，感染者已经散去。");
    }
    this.active = null;
  }

  static maybeTrigger() {
    try {
      const heartbeat = Number(world.getDynamicProperty(CONFIG.dailyEventsHeartbeatKey) || 0);
      if (heartbeat > 0 && Date.now() - heartbeat < 30000) return;
    } catch {}
    if (this.active || Math.random() > CONFIG.eventChance) return;
    const candidates = world.getAllPlayers().filter(player => player.dimension.id === CONFIG.overworld && !ZoneRegistry.isSafe(player.dimension.id, player.location));
    if (candidates.length) this.trigger(candidates[Math.floor(Math.random() * candidates.length)]);
  }
}
