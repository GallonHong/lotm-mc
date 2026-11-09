import { world, system, ItemStack } from "@minecraft/server";
import { DroneClass } from "../drones/DroneClass.js";
import { DroneGarageManager } from "../drones/DroneGarageManager.js";
import { ManualControlSession } from "../drones/ManualControlSession.js";
import { DownedRescueManager } from "../rescue/DownedRescueManager.js";
import { participant, matchId, team, lifeState, saveLifeState, matchItem, MEDICAL_TYPES } from "./PvpLifePolicy.js";

/** Life owns only its own state. Never roll back the real drone hangar. */
export class PvpLifeManager {
 static init() {
  world.beforeEvents?.itemUse?.subscribe(event => {
   const player = event.source, item = event.itemStack;
   if (!MEDICAL_TYPES.includes(item?.typeId)) return;
   const marked = item.getLore().some(line => line.startsWith("PVP_MATCH:"));
   if (marked && (!participant(player) || !player.hasTag("pvp:active") || player.hasTag("pvp:dead") || !matchItem(item, matchId(player)))) event.cancel = true;
  });
  system.afterEvents?.scriptEventReceive?.subscribe(event => {
   if (!["pvp:prepare", "pvp:start", "pvp:death", "pvp:finish", "pvp:med_supply"].includes(event.id)) return;
   try {
    const request = JSON.parse(event.message);
    const player = world.getAllPlayers().find(p => p.id === request.playerId);
    if (!player || !participant(player) || matchId(player) !== request.matchId) return;
    if (event.sourceEntity?.typeId === "minecraft:player" && event.sourceEntity.id !== player.id) return;
    if (event.id === "pvp:prepare") this.prepare(player, request.matchId);
    else if (event.id === "pvp:start") this.start(player, request.matchId);
    else if (event.id === "pvp:death") this.disableDrone(player, "death");
    else if (event.id === "pvp:finish") this.finish(player, request.matchId);
    else this.supply(player);
   } catch (error) { console.warn(`[PvpLife] ${event.id}: ${error}`); }
  });
  world.afterEvents?.entityDie?.subscribe(({ deadEntity }) => {
   try {
    if (deadEntity.typeId === "minecraft:player" && participant(deadEntity)) this.disableDrone(deadEntity, "death");
   } catch (error) { console.warn(`[PvpLife] Death recall pending: ${error}`); }
  });
  world.afterEvents?.itemCompleteUse?.subscribe(({ source, itemStack }) => {
   if (!participant(source) || !source.hasTag("pvp:active") || !MEDICAL_TYPES.includes(itemStack?.typeId)) return;
   const state = lifeState(source);
   if (!state || state.status !== "active" || state.matchId !== matchId(source) || !matchItem(itemStack, state.matchId)) return;
   // Credit only a completed consumption. Dropping or sharing never creates more.
   state.pendingMedicine ||= {};
   state.pendingMedicine[itemStack.typeId] = Math.min(4, (state.pendingMedicine[itemStack.typeId] || 0) + 1);
   saveLifeState(source, state);
   system.run(() => this.supply(source));
  });
  system.runInterval(() => {
   for (const player of world.getAllPlayers()) {
    try {
     DroneGarageManager.recoverPvpCrash(player);
     const state = lifeState(player);
     if (!state) continue;
     if (!participant(player) || state.matchId !== matchId(player)) {
      // Interrupted restore must not leave a combat drone or controller behind.
      this.disableDrone(player, "interrupted");
      continue;
     }
     const drone = DroneClass.getActiveDrone(player.id);
     if (state.status === "active" && drone && !state.disabled) {
      if ((drone.entityId || drone.entity?.id) !== state.entityId) this.disableDrone(player, "identity_changed");
      else {
       this.syncEntityTags(player, drone.entity);
       this.persistDrone(player, drone);
      }
     }
     if (player.hasTag("pvp:dead")) this.disableDrone(player, "death");
     this.supply(player);
    } catch (error) { console.warn(`[PvpLife] Tick pending: ${error}`); }
   }
  }, 20);
 }

 static prepare(player, id) {
  DroneGarageManager.recoverPvpCrash(player);
  const previous = lifeState(player);
  player.removeTag("pvp:life_ready");
  player.removeTag("pvp:life_finished");
  player.removeTag("pvp:life_rejected");
  if (previous) {
   if (previous.matchId === id) { player.addTag("pvp:life_ready"); return; }
   player.addTag("pvp:life_rejected"); return;
  }
  const drone = DroneClass.getActiveDrone(player.id);
  if (DownedRescueManager.isPlayerDowned(player) || (drone && (drone.droneId === "camel" || drone.entity?.typeId === "makercamp_dr:inventory_drone"))) {
   player.addTag("pvp:life_rejected");
   player.sendMessage("§c[PVP] 倒地状态或负重无人机不能进入比赛，请先恢复/收回。");
   return;
  }
  DroneClass.exitManualControl(player);
  if (!ManualControlSession.recover(player)) { player.addTag("pvp:life_rejected"); return; }
  if (drone && (!drone.entity?.isValid() || drone.crashHandled || drone.entity.getComponent("minecraft:health")?.currentValue <= 0)) {
   player.addTag("pvp:life_rejected"); return;
  }
  const state = { version: 1, matchId: id, status: "prepared", disabled: !drone,
   entityId: drone?.entityId || null, droneId: drone?.droneId || null,
   pendingMedicine: {}, initialMedicine: false };
  saveLifeState(player, state);
  if (drone) { drone.pvpMatchId = id; this.persistDrone(player, drone); }
  player.addTag("pvp:life_ready");
 }

 static start(player, id) {
  const state = lifeState(player);
  if (!state || state.matchId !== id || !player.hasTag("pvp:active")) return;
  const drone = DroneClass.getActiveDrone(player.id);
  if (!state.disabled && state.status === "prepared") {
   if (drone?.entity?.isValid() && (drone.entityId || drone.entity.id) === state.entityId) {
    drone.entity.teleport({ x: player.location.x, y: player.location.y + 2, z: player.location.z }, { dimension: player.dimension });
    this.syncEntityTags(player, drone.entity);
   } else {
    // Reload never silently resurrects a permitted drone or replaces it with a new one.
    state.disabled = true;
   }
  }
  state.status = "active";
  if (!state.initialMedicine) {
   state.initialMedicine = true;
   state.pendingMedicine = Object.fromEntries(MEDICAL_TYPES.map(id => [id, 2]));
  }
  saveLifeState(player, state);
  this.supply(player);
 }

 static persistDrone(player, drone) {
  // Live durability/fuel remain the real hangar, including real crash penalties.
  if (!drone || drone.crashHandled) return;
  const hangar = DroneGarageManager.getHangarData(player);
  const stored = hangar.drones[drone.droneId];
  if (!stored || stored.scrapped) return;
  stored.durability = Math.max(0, drone.durability);
  stored.fuel = Math.max(0, drone.fuel);
  player.setDynamicProperty("ab_dr:hangar_v1", JSON.stringify(hangar));
 }

 static syncEntityTags(player, entity) {
  if (!entity?.isValid()) return;
  for (const tag of entity.getTags().filter(t => t.startsWith("pvp:"))) entity.removeTag(tag);
  entity.addTag("pvp:participant"); entity.addTag("pvp:drone");
  entity.addTag(`pvp:match:${matchId(player)}`);
  if (team(player)) entity.addTag(`pvp:team:${team(player)}`);
  for (const tag of ["pvp:active", "pvp:protected", "pvp:dead"]) if (player.hasTag(tag)) entity.addTag(tag);
 }

 static disableDrone(player, reason) {
  const state = lifeState(player);
  if (!state) return;
  state.disabled = true; state.disabledReason ||= reason;
  // Persist lock BEFORE recalling; replaying this operation cannot re-deploy.
  saveLifeState(player, state);
  const active = DroneClass.getActiveDrone(player.id);
  DroneClass.exitManualControl(player);
  if (!ManualControlSession.recover(player)) throw new Error("manual recovery pending");
  if (active && !active.crashHandled) {
   const hp = active.entity?.isValid() ? active.entity.getComponent("minecraft:health")?.currentValue : undefined;
   if (!active.entity?.isValid() || (hp !== undefined && hp <= 0)) DroneClass.crashDrone(player.id, active);
   else { this.persistDrone(player, active); DroneGarageManager.recallDrone(player, false); }
  }
  // On reload the runtime map is gone but the real entity may still be loaded.
  const orphan = state.entityId ? world.getEntity(state.entityId) : undefined;
  if (orphan?.isValid()) orphan.remove();
 }

 static finish(player, id) {
  DroneGarageManager.recoverPvpCrash(player);
  const state = lifeState(player);
  if (state && state.matchId !== id) return;
  if (state) this.disableDrone(player, "finished");
  else if (!ManualControlSession.recover(player)) return;
  // Core clears marked items BEFORE restoring originals; no delayed supply survives.
  saveLifeState(player, null);
  player.removeTag("pvp:life_ready"); player.removeTag("pvp:life_rejected");
  player.addTag("pvp:life_finished");
 }

 static supply(player) {
  try {
   const state = lifeState(player);
   if (!state || state.status !== "active" || !participant(player) || !player.hasTag("pvp:active") || player.hasTag("pvp:dead") || state.matchId !== matchId(player)) return;
   const container = player.getComponent("minecraft:inventory")?.container;
   if (!container) return;
   for (const type of MEDICAL_TYPES) {
    const credit = Math.min(4, state.pendingMedicine?.[type] || 0);
    if (!credit) continue;
    let count = 0, empty = -1, existing = -1;
    for (let i=0; i<container.size; i++) {
     const item = container.getItem(i);
     if (!item && empty < 0) empty = i;
     if (item?.typeId === type && matchItem(item, state.matchId)) { count += item.amount; if (existing < 0) existing = i; }
    }
    const amount = Math.min(credit, 4-count);
    if (amount <= 0 || (existing < 0 && empty < 0)) continue;
    const slot = existing >= 0 ? existing : empty;
    const item = existing >= 0 ? container.getItem(slot) : new ItemStack(type, 0+amount);
    if (existing >= 0) item.amount += amount;
    else item.setLore([`PVP_MATCH:${state.matchId}`, "§7比赛补给 · 用后补充 · 不可带出"]);
    // Debit before granting: crash may lose a tiny supply credit but never duplicate it.
    state.pendingMedicine[type] -= amount;
    saveLifeState(player, state);
    container.setItem(slot, item);
   }
  } catch (error) { console.warn(`[PvpLife] Medical resupply pending: ${error}`); }
 }
}
