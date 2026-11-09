import { PVP_BACKUP_KEY, PVP_AMMO_PREFIX, pvpMatch, isPvpParticipant } from './pvpRules.js';

function readRecord(player) {
 const raw = player.getDynamicProperty(PVP_BACKUP_KEY);
 if (raw === undefined) return null;
 const record = JSON.parse(raw);
 if (record?.version !== 1 || typeof record.matchId !== 'string' || !Array.isArray(record.original) ||
     !['prepared', 'restoring', 'restored'].includes(record.phase)) throw new Error('Invalid gun recovery record');
 return record;
}
function writeRecord(player, record) { player.setDynamicProperty(PVP_BACKUP_KEY, JSON.stringify(record)); }
function clearMatchAmmo(player) {
 for (const key of player.getDynamicPropertyIds()) {
  if (key.startsWith(PVP_AMMO_PREFIX)) player.setDynamicProperty(key, undefined);
 }
}
export function preparePvpAmmo(player, matchId) {
 if (!isPvpParticipant(player) || !matchId || pvpMatch(player) !== matchId) throw new Error('PvP match identity mismatch');
 const previous = readRecord(player);
 if (previous && previous.phase !== 'restored') {
  if (previous.matchId === matchId && previous.phase === 'prepared') return previous;
  throw new Error('Previous gun restoration is incomplete');
 }
 if (previous?.phase === 'restored' && previous.matchId === matchId) throw new Error('Completed match cannot be prepared again');
 const original = player.getDynamicPropertyIds().filter(key => key.startsWith('tg_ammo_'))
  .map(key => [key, player.getDynamicProperty(key)]);
 if (original.some(([, value]) => typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Original ammo state is invalid');
 const record = { version: 1, matchId, phase: 'prepared', original };
 if (JSON.stringify(record).length > 30000) throw new Error('Ammo recovery record exceeds safe size');
 // Write-ahead recovery record. Normal ammo properties remain untouched during play.
 writeRecord(player, record);
 clearMatchAmmo(player);
 return record;
}
export function finishPvpAmmo(player, matchId) {
 const record = readRecord(player);
 if (!record) return false;
 if (record.matchId !== matchId) throw new Error('Stale gun finish request');
 if (record.phase === 'restored') return true;
 record.phase = 'restoring';
 writeRecord(player, record);
 const original = new Map(record.original);
 for (const key of player.getDynamicPropertyIds()) {
  if (key.startsWith('tg_ammo_') && !original.has(key)) player.setDynamicProperty(key, undefined);
 }
 for (const [key, value] of original) {
  if (!key.startsWith('tg_ammo_') || typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid original ammo entry');
  player.setDynamicProperty(key, value);
 }
 clearMatchAmmo(player);
 record.phase = 'restored';
 writeRecord(player, record);
 return true;
}
export function getPvpAmmoRecord(player) { return readRecord(player); }
