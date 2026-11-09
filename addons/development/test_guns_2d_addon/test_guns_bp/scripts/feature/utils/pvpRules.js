/** Cross-pack PvP contract. No dependency on SAPI-owned dynamic properties. */
export const PVP_BACKUP_KEY = 'tg_pvp_transaction_v1';
export const PVP_AMMO_PREFIX = 'tg_pvp_ammo_';
export function hasTag(entity, tag) {
 try { return !!entity?.hasTag(tag); } catch { return false; }
}
export function isPvpParticipant(entity) { return hasTag(entity, 'pvp:participant'); }
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
 if (!isPvpParticipant(player)) return true;
 return hasTag(player, 'pvp:active') && hasTag(player, 'pvp:guns_ready') &&
  !hasTag(player, 'pvp:dead') && !hasTag(player, 'pvp:guns_finished') && !!pvpMatch(player);
}
export function pvpCanAttack(player) {
 return pvpCanOperate(player) && (!isPvpParticipant(player) || !hasTag(player, 'pvp:protected'));
}
export function hasInfinitePvpReserve(player) { return isPvpParticipant(player) && pvpCanOperate(player); }
/** null: ordinary gameplay; boolean: PvP determines whether the attack is blocked. */
export function pvpBlocksDamage(attacker, target) {
 const ap = isPvpParticipant(attacker), tp = isPvpParticipant(target);
 if (!ap && !tp) return null;
 if (!ap || !tp || !attacker || !target) return true;
 const match = pvpMatch(attacker), team = pvpTeam(attacker);
 return !match || match !== pvpMatch(target) || !team || !pvpTeam(target) ||
  team === pvpTeam(target) || !hasTag(attacker, 'pvp:active') || !hasTag(target, 'pvp:active') ||
  hasTag(attacker, 'pvp:dead') || hasTag(target, 'pvp:dead') ||
  hasTag(attacker, 'pvp:protected') || hasTag(target, 'pvp:protected');
}
export function ammoKey(player, normalKey) {
 return isPvpParticipant(player) ? PVP_AMMO_PREFIX + normalKey.slice('tg_ammo_'.length) : normalKey;
}
