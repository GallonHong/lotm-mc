/** Shared cross-pack tags. No imports: safe for DroneClass/Garage circular imports. */
export const PVP_LIFE_STATE = "pvp:life_state_v1";
export const MEDICAL_TYPES = ["ab_ve:bandage", "ab_ve:first_aid"];
export function participant(entity) {
 try { return !!entity?.hasTag("pvp:participant"); } catch { return false; }
}
export function weeklyParticipant(entity) {
 try { return !!entity?.hasTag("weekly:participant"); } catch { return false; }
}
export function weeklyLocked(entity) {
 try { return weeklyParticipant(entity) || !!entity?.hasTag("weekly:admission"); } catch { return false; }
}
export function weeklyRoom(entity) {
 try {
  const tags = entity.getTags().filter(tag => tag.startsWith("weekly:room:"));
  return tags.length === 1 && ["weekly:room:sirok", "weekly:room:mogathul"].includes(tags[0]) ? tags[0] : null;
 } catch { return null; }
}
function live(entity) {
 try {
  if (!entity || (typeof entity.isValid === "function" ? !entity.isValid() : entity.isValid === false)) return false;
  return (entity.getComponent?.("minecraft:health")?.currentValue ?? 1) > 0;
 } catch { return false; }
}
function weeklyBoss(entity) {
 try { return !!entity?.hasTag("weekly:boss") || entity?.getProperty?.("apoc_boss:weekly_instance") === true; } catch { return false; }
}
// Native fire ticks lose owner attribution. Keep weekly damage in the exact
// owner-attributed hit path, never ignite the boss, another room or teammates.
export function canIgniteTarget(owner, target) {
 return !weeklyLocked(owner) && !weeklyLocked(target) && !weeklyBoss(target) && !participant(owner) && canDamage(owner, target);
}
export function matchId(entity) {
 try { return entity.getTags().find(tag => tag.startsWith("pvp:match:"))?.slice(10) || null; } catch { return null; }
}
export function team(entity) {
 try { return entity.hasTag("pvp:team:red") ? "red" : entity.hasTag("pvp:team:blue") ? "blue" : null; } catch { return null; }
}
export function lifeState(player) {
 try { const raw = player.getDynamicProperty(PVP_LIFE_STATE); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function saveLifeState(player, state) {
 // Propagate failures: the caller must not acknowledge a transaction that wasn't saved.
 player.setDynamicProperty(PVP_LIFE_STATE, state ? JSON.stringify(state) : undefined);
}
export function locked(player, notify = false) {
 if (!participant(player)) return false;
 if (notify) try { player.sendMessage("§e[PVP] 比赛期间不能召唤、整备或更换无人机/载具。"); } catch {}
 return true;
}
/** Player input/medicine is separate from autonomous drone operation. */
export function canPlayerAct(player) {
 if (weeklyLocked(player)) {
  try { return live(player) && !player.hasTag("apoc:downed") && !player.hasTag("apoc:downed_pending") && !player.hasTag("apoc:true_death"); } catch { return false; }
 }
 if (!participant(player)) return true;
 return player.hasTag("pvp:active") && !player.hasTag("pvp:downed") && !player.hasTag("pvp:dead");
}
export function canControlDrone(player, drone) {
 return canPlayerAct(player) && canOperateDrone(player, drone);
}
export function canOperateDrone(player, drone) {
 if (weeklyLocked(player)) {
  try {
   return live(player) && live(drone?.entity) && drone?.player?.id === player.id && drone.entity.hasTag(`ab_dr:owner_${player.id}`) &&
    player.dimension.id === drone.entity.dimension.id && !participant(player) && !player.hasTag("pvp:admission");
  } catch { return false; }
 }
 if (!participant(player)) return true;
 const state = lifeState(player);
 return !!state && state.matchId === matchId(player) && !state.disabled && state.status === "active" &&
  state.entityId === (drone?.entityId || drone?.entity?.id) && player.hasTag("pvp:active") &&
  !player.hasTag("pvp:dead") && !player.hasTag("pvp:protected");
}
export function canDamage(owner, target) {
 if (weeklyLocked(owner) || weeklyLocked(target) || weeklyBoss(target)) {
  try {
   const room = weeklyRoom(owner);
   return live(owner) && live(target) && owner.typeId === "minecraft:player" && weeklyParticipant(owner) &&
    weeklyBoss(target) && !!room && room === weeklyRoom(target) && owner.dimension.id === target.dimension.id &&
    !participant(owner) && !owner.hasTag("pvp:admission") && !participant(target) && !target.hasTag("pvp:admission");
  } catch { return false; }
 }
 const sourcePvp = participant(owner), targetPvp = participant(target);
 if (!sourcePvp && !targetPvp) return true;
 if (!sourcePvp || !targetPvp || !matchId(owner) || matchId(owner) !== matchId(target)) return false;
 if (!team(owner) || !team(target) || team(owner) === team(target)) return false;
 return owner.hasTag("pvp:active") && target.hasTag("pvp:active") &&
  !owner.hasTag("pvp:dead") && !target.hasTag("pvp:dead") &&
  !owner.hasTag("pvp:protected") && !target.hasTag("pvp:protected");
}
export function matchItem(item, id) {
 try { return !!id && !!item?.getLore().includes(`PVP_MATCH:${id}`); } catch { return false; }
}
export function hasLineOfSight(entity, target) {
 try {
  const from = { x: entity.location.x, y: entity.location.y + 0.15, z: entity.location.z };
  const to = { x: target.location.x, y: target.location.y + (target.typeId === "minecraft:player" ? 1 : 0.25), z: target.location.z };
  const dx = to.x-from.x, dy = to.y-from.y, dz = to.z-from.z, distance = Math.hypot(dx,dy,dz);
  if (distance < 0.01) return true;
  const hit = entity.dimension.getBlockFromRay(from, { x:dx/distance,y:dy/distance,z:dz/distance }, {
   maxDistance: distance, includeLiquidBlocks: false, includePassableBlocks: false
  });
  if (!hit) return true;
  const p = hit.block.location, f = hit.faceLocation;
  return Math.hypot(p.x+f.x-from.x,p.y+f.y-from.y,p.z+f.z-from.z) >= distance-0.05;
 } catch { return false; } // Do not shoot through unloaded/unknown blocks.
}
