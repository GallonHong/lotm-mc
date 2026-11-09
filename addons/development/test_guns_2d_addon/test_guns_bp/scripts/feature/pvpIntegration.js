import { world, system } from '@minecraft/server';
import { preparePvpAmmo, finishPvpAmmo, getPvpAmmoRecord } from './utils/pvpAmmoTransaction.js';
import { isPvpParticipant, pvpMatch, pvpCanAttack } from './utils/pvpRules.js';
import { ShootManager } from './shoot.js';
import { ReloadManager } from './reload.js';
import { SkillManager } from './skillManager.js';
import { RocketEngine } from './rocketEngine.js';
import { GrenadeEngine } from './grenadeEngine.js';
import { ArtilleryEngine } from './artilleryEngine.js';
import { MeleeEngine } from './meleeEngine.js';

/** Cancel delayed damage before restoring inventory or allowing another match. */
export function stopPvpGunTasks(player) {
 ShootManager.clearPlayer(player);
 ShootManager.playerShotCounts.delete(player.id);
 ReloadManager.cancelReload(player);
 SkillManager.clearPlayer(player.id);
 const id = player.id;
 RocketEngine.activeRockets = RocketEngine.activeRockets.filter(x => x.shooterId !== id);
 GrenadeEngine.activeGrenades = GrenadeEngine.activeGrenades.filter(x => x.shooterId !== id);
 ArtilleryEngine.activeBarrages = ArtilleryEngine.activeBarrages.filter(x => x.shooterId !== id);
 ArtilleryEngine.fallingShells = ArtilleryEngine.fallingShells.filter(x => x.shooterId !== id);
 ArtilleryEngine.isMenuOpen.delete(id);
 for (const [targetId, info] of MeleeEngine.bleedingTargets) {
  if (targetId === id || info.attackerId === id) MeleeEngine.bleedingTargets.delete(targetId);
 }
}
export function tickPvpGunGuard(player) {
 if (isPvpParticipant(player) && !pvpCanAttack(player)) stopPvpGunTasks(player);
}

function onPvpEvent(event) {
 if (event.id !== 'pvp:prepare' && event.id !== 'pvp:finish' && event.id !== 'pvp:death') return;
 let player;
 try {
  const payload = JSON.parse(event.message);
  if (typeof payload.playerId !== 'string' || typeof payload.matchId !== 'string') return;
  player = world.getAllPlayers().find(p => p.id === payload.playerId);
  if (!player || (event.sourceEntity && event.sourceEntity.id !== player.id)) return;
  if (!isPvpParticipant(player) || pvpMatch(player) !== payload.matchId) return;
  stopPvpGunTasks(player);
  if (event.id === 'pvp:death') return;
  if (event.id === 'pvp:prepare') {
   player.removeTag('pvp:guns_finished');
   player.removeTag('pvp:guns_rejected');
   preparePvpAmmo(player, payload.matchId);
   player.addTag('pvp:guns_ready');
  } else {
   // A preparation which never reached Guns is safe to acknowledge, but never
   // silently discard a conflicting existing transaction.
   finishPvpAmmo(player, payload.matchId);
   player.removeTag('pvp:guns_ready');
   player.removeTag('pvp:guns_rejected');
   player.addTag('pvp:guns_finished');
  }
 } catch (error) {
  try { player?.removeTag('pvp:guns_ready'); player?.addTag('pvp:guns_rejected'); } catch {}
  console.warn(`[PVP Guns] ${event.id} rejected: ${error}`);
 }
}
export function initializePvpGuns() {
 system.afterEvents?.scriptEventReceive?.subscribe(onPvpEvent);
 // Do not restore an active player's ammo just because of a respawn. SAPI owns
 // restart/leave decisions and reissues finish with the persisted match identity.
 world.afterEvents?.playerSpawn?.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  system.run(() => {
   try {
    const record = getPvpAmmoRecord(player);
    if (record && record.phase !== 'restored') {
     stopPvpGunTasks(player);
     if (!isPvpParticipant(player)) {
      finishPvpAmmo(player, record.matchId);
      player.removeTag('pvp:guns_ready');
      player.addTag('pvp:guns_finished');
     }
    }
   } catch (error) { console.warn(`[PVP Guns] Recovery blocked: ${error}`); }
  });
 });
}
