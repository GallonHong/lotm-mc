/** Shared cross-pack tags. No imports: safe for DroneClass/Garage circular imports. */
export const PVP_LIFE_STATE = "pvp:life_state_v1";
export const MEDICAL_TYPES = ["ab_ve:bandage", "ab_ve:first_aid"];
export function participant(entity) {
 try { return !!entity?.hasTag("pvp:participant"); } catch { return false; }
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
export function canOperateDrone(player, drone) {
 if (!participant(player)) return true;
 const state = lifeState(player);
 return !!state && state.matchId === matchId(player) && !state.disabled && state.status === "active" &&
  state.entityId === (drone?.entityId || drone?.entity?.id) && player.hasTag("pvp:active") &&
  !player.hasTag("pvp:dead") && !player.hasTag("pvp:protected");
}
export function canDamage(owner, target) {
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
