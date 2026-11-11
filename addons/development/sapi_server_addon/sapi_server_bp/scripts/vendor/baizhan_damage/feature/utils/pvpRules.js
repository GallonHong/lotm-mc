/** Cross-pack PvP contract. No dependency on SAPI-owned dynamic properties. */
export const PVP_BACKUP_KEY = 'tg_pvp_transaction_v1';
export const PVP_AMMO_PREFIX = 'tg_pvp_ammo_';
export function hasTag(entity, tag) {
 try { return !!entity?.hasTag(tag); } catch { return false; }
}
export function isPvpParticipant(entity) { return hasTag(entity, 'pvp:participant'); }
export function isPvpDowned(entity) { return isPvpParticipant(entity) && hasTag(entity, 'pvp:downed'); }
/** Shared downed states suppress recovery and defensive passives, not damage eligibility. */
export function isCombatDowned(entity) {
 return isPvpDowned(entity) || ['apoc:downed', 'apoc_downed', 'apoc:downed_pending'].some(tag => hasTag(entity, tag));
}
export function pvpMatch(entity) {
 try { return entity?.getTags().find(tag => tag.startsWith('pvp:match:'))?.slice(10) || ''; }
 catch { return ''; }
}
export function pvpTeam(entity) {
 if (hasTag(entity, 'pvp:team:red')) return 'red';
 if (hasTag(entity, 'pvp:team:blue')) return 'blue';
 return '';
}
export function pvpCanOperate(player) {
 if (isCombatDowned(player)) return false;
 if (!isPvpParticipant(player)) return true;
 return hasTag(player, 'pvp:active') && hasTag(player, 'pvp:guns_ready') &&
  !hasTag(player, 'pvp:dead') && !isPvpDowned(player) && !hasTag(player, 'pvp:guns_finished') && !!pvpMatch(player);
}
export function pvpCanAttack(player) {
 if (hasTag(player, 'tg:rail_stunned')) return false;
 return pvpCanOperate(player) && (!isPvpParticipant(player) || !hasTag(player, 'pvp:protected'));
}
export function hasInfinitePvpReserve(player) { return isPvpParticipant(player) && pvpCanOperate(player); }
/** null: ordinary gameplay; boolean: PvP determines whether the attack is blocked. */
export function pvpBlocksDamage(attacker, target) {
 // Pending respawn/downing is a transition, not a finishable downed target.
 if (hasTag(target, 'apoc:downed_pending')) return true;
 const ap = isPvpParticipant(attacker), tp = isPvpParticipant(target);
 if (!ap && !tp) return null;
 if (!ap || !tp || !attacker || !target) return true;
 const match = pvpMatch(attacker), team = pvpTeam(attacker);
 return !match || match !== pvpMatch(target) || !team || !pvpTeam(target) ||
  team === pvpTeam(target) || !hasTag(attacker, 'pvp:active') || !hasTag(target, 'pvp:active') ||
  // Downed players cannot attack, but remain valid enemy targets for finishing.
  hasTag(attacker, 'pvp:dead') || isPvpDowned(attacker) || hasTag(target, 'pvp:dead') ||
  hasTag(attacker, 'pvp:protected') || hasTag(target, 'pvp:protected');
}
export function ammoKey(player, normalKey) {
 return isPvpParticipant(player) ? PVP_AMMO_PREFIX + normalKey.slice('tg_ammo_'.length) : normalKey;
}
