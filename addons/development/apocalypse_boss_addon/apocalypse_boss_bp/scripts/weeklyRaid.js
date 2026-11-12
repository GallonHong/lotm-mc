/** Cross-pack weekly encounter contract. Tags, not dynamic properties, cross BP namespaces. */
export const WEEKLY_BOSS_TAG = "weekly:boss";
export const WEEKLY_PLAYER_TAG = "weekly:participant";
export const WEEKLY_ROOM_PREFIX = "weekly:room:";
export const WEEKLY_ARMOR_PREFIX = "weekly:armor:";
export const WEEKLY_ROOMS = new Set(["sirok", "mogathul"]);
export const WEEKLY_ARMOR_VALUES = new Set([0, 10, 20, 40]);

export function isLiveEntity(entity) {
 try {
  if (!entity || (typeof entity.isValid === "function" ? !entity.isValid() : entity.isValid !== true)) return false;
  const health = entity.getComponent?.("minecraft:health");
  return !health || health.currentValue > 0;
 } catch { return false; }
}

export function isWeeklyBoss(entity) {
 try { return !!entity && (entity.hasTag(WEEKLY_BOSS_TAG) || entity.getProperty?.("apoc_boss:weekly_instance") === true); }
 catch { return false; }
}

export function weeklyRoom(entity) {
 try {
  const rooms = entity.getTags().filter(tag => tag.startsWith(WEEKLY_ROOM_PREFIX));
  if (rooms.length !== 1) return null;
  const room = rooms[0].slice(WEEKLY_ROOM_PREFIX.length);
  return WEEKLY_ROOMS.has(room) ? room : null;
 } catch { return null; }
}

/** Re-evaluate on every delayed hit: leaving, dying, or changing dimension cancels a lock. */
export function canWeeklyBossTarget(boss, player) {
 if (!isLiveEntity(boss) || !isLiveEntity(player)) return false;
 try {
  if (!isWeeklyBoss(boss)) return !player.hasTag(WEEKLY_PLAYER_TAG);
  const room = weeklyRoom(boss);
  return player.typeId === "minecraft:player" && room !== null && weeklyRoom(player) === room &&
   player.hasTag(WEEKLY_PLAYER_TAG) && player.dimension.id === boss.dimension.id &&
   !player.hasTag("pvp:participant") && !player.hasTag("pvp:admission");
 } catch { return false; }
}

/** Missing/conflicting configuration fails to zero; never inherit the ordinary forced 10. */
export function weeklyBossArmor(entity) {
 try {
  const tags = entity.getTags().filter(tag => tag.startsWith(WEEKLY_ARMOR_PREFIX));
  if (tags.length !== 1) return 0;
  const suffix = tags[0].slice(WEEKLY_ARMOR_PREFIX.length);
  if (!/^(0|10|20|40)$/.test(suffix)) return 0;
  const value = Number(suffix);
  return WEEKLY_ARMOR_VALUES.has(value) ? value : 0;
 } catch { return 0; }
}

export function enforceWeeklyArmor(entity) {
 if (!isWeeklyBoss(entity)) return null;
 const armor = weeklyBossArmor(entity);
 const wanted = `apoc:armor:${armor}`;
 try {
  for (const tag of entity.getTags()) {
   if ((tag.startsWith("apoc:armor:") && tag !== wanted) ||
       (tag.startsWith("apoc:armor_source:") && tag !== "apoc:armor_source:weekly")) entity.removeTag(tag);
  }
  entity.addTag(wanted);
  entity.addTag("apoc:armor_source:weekly");
  return entity.hasTag(wanted) ? armor : null;
 } catch { return null; }
}
