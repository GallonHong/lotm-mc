/**
 * Drone combat buff contract: Apocalypse Life (producer) <-> Test Guns / SAPI (consumers).
 *
 * This file must stay BYTE-IDENTICAL in all three copies:
 *   apocalypse_life_bp/scripts/drones/droneCombatBuff.js
 *   test_guns_bp/scripts/feature/utils/droneCombatBuff.js
 *   sapi_server_bp/scripts/vendor/baizhan_damage/feature/utils/droneCombatBuff.js
 *
 * Entity tags are visible across behavior-pack namespaces, dynamic properties are
 * scoped to their producing pack, so the buff travels as player tags:
 *
 *   ab_dr:dmg:<percent>:<token>     outgoing damage bonus in percent (1..100)
 *   ab_dr:crit:<percent>:<token>    critical hit RATE bonus in percentage points (1..100)
 *
 * Consumers take the HIGHEST valid percent per kind (buffs never stack), clamp to
 * 100 and divide by 100. The producer removes its own token when the buff expires;
 * consumers only validate the number, so a stale tag can never resurrect a buff
 * after the producer cleans up on world load.
 *
 * Design values live in Life DroneConstants.js: `skills[].combatBuff`.
 */
export const DRONE_BUFF_TAG_ROOT = "ab_dr:";
export const DRONE_DAMAGE_TAG_PREFIX = "ab_dr:dmg:";
export const DRONE_CRIT_TAG_PREFIX = "ab_dr:crit:";
export const DRONE_BUFF_MAX_PERCENT = 100;

function clampPercent(percent) {
 const value = Math.floor(Number(percent) || 0);
 if (!Number.isFinite(value) || value <= 0) return 0;
 return Math.min(DRONE_BUFF_MAX_PERCENT, value);
}

/**
 * Build the tag the producer adds to the owner player.
 * @param {"damage"|"crit"} kind
 * @param {number} percent integer percentage (damage %) or percentage points (crit)
 * @param {string|number} token unique token so the producer removes exactly this buff
 */
export function buildDroneBuffTag(kind, percent, token) {
 const prefix = kind === "crit" ? DRONE_CRIT_TAG_PREFIX : DRONE_DAMAGE_TAG_PREFIX;
 return `${prefix}${clampPercent(percent)}:${token}`;
}

/**
 * Parse a tag list into the effective buff. Pure function (no engine API), used by
 * both consumers and the unit test.
 * @param {string[]|undefined} tags
 */
export function parseDroneCombatBuffTags(tags) {
 let damagePct = 0;
 let critPct = 0;
 for (const tag of tags ?? []) {
  if (typeof tag !== "string") continue;
  let target = 0;
  let rest = "";
  if (tag.startsWith(DRONE_DAMAGE_TAG_PREFIX)) {
   target = 1;
   rest = tag.slice(DRONE_DAMAGE_TAG_PREFIX.length);
  } else if (tag.startsWith(DRONE_CRIT_TAG_PREFIX)) {
   target = 2;
   rest = tag.slice(DRONE_CRIT_TAG_PREFIX.length);
  } else {
   continue;
  }
  const percent = clampPercent(Number.parseInt(rest, 10));
  if (percent <= 0) continue;
  if (target === 1) damagePct = Math.max(damagePct, percent);
  else critPct = Math.max(critPct, percent);
 }
 return { damagePct, critPct, damage: damagePct / 100, critRate: critPct / 100 };
}

/** Read the effective buff from a player entity (safe on any entity). */
export function readDroneCombatBuff(entity) {
 try {
  return parseDroneCombatBuffTags(entity?.getTags?.());
 } catch {
  return { damagePct: 0, critPct: 0, damage: 0, critRate: 0 };
 }
}

/** Producer-side cleanup: remove every drone combat buff tag from the entity. */
export function clearDroneCombatBuffs(entity) {
 try {
  for (const tag of entity.getTags()) {
   if (tag.startsWith(DRONE_DAMAGE_TAG_PREFIX) || tag.startsWith(DRONE_CRIT_TAG_PREFIX)) entity.removeTag(tag);
  }
 } catch {}
}
