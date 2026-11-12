import { pvpBlocksDamage } from './pvpRules.js';
const TEAM_TAG_PREFIX = "sapi_team_";
const WEEKLY_ROOM_PREFIX = "weekly:room:";

/** Weekly instances accept only live players in their one assigned room.
 * Keep this tag contract in Guns so direct, splash and delayed damage are
 * guarded even without SAPI; ordinary entities retain their existing rules. */
function weeklyBlocksDamage(attacker, target) {
 try {
  if (!target?.hasTag?.("weekly:boss")) return false;
  if (attacker?.typeId !== "minecraft:player" || !attacker.hasTag("weekly:participant")) return true;
  const live = typeof attacker.isValid === "function" ? attacker.isValid() : attacker.isValid === true;
  if (!live || !(attacker.getComponent("minecraft:health")?.currentValue > 0) ||
      attacker.dimension.id !== target.dimension.id) return true;
  const rooms = entity => entity.getTags().filter(tag => tag.startsWith(WEEKLY_ROOM_PREFIX));
  const sourceRooms = rooms(attacker), targetRooms = rooms(target);
  return sourceRooms.length !== 1 || targetRooms.length !== 1 ||
   targetRooms[0].length === WEEKLY_ROOM_PREFIX.length || sourceRooms[0] !== targetRooms[0];
 } catch { return true; }
}

function teamTag(entity) {
 if (!entity || entity.typeId !== "minecraft:player") return "";
 try { return entity.getTags().find(tag => tag.startsWith(TEAM_TAG_PREFIX)) || ""; }
 catch { return ""; }
}

/** SAPI 队伍标签是跨 Addon 的轻量契约；SAPI 未安装时自然退化为原行为。 */
export function isProtectedTeammate(attacker, target) {
 if (weeklyBlocksDamage(attacker, target)) return true;
 const pvpBlocked = pvpBlocksDamage(attacker, target);
 if (pvpBlocked !== null) return pvpBlocked;
 if (!attacker || !target || attacker.id === target.id || target.typeId !== "minecraft:player") return false;
 const attackerTeam = teamTag(attacker);
 return !!attackerTeam && attackerTeam === teamTag(target);
}
