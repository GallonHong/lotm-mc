import { EntityDamageCause, EquipmentSlot, system } from '@minecraft/server';
import { EPIC_GUNS } from '../data/epicGuns.js';
import { getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { isProtectedTeammate } from './utils/teamRules.js';
import { isPvpParticipant, isPvpDowned, pvpCanAttack, pvpMatch } from './utils/pvpRules.js';

const EPIC_IDS = new Set([EPIC_GUNS.scar, EPIC_GUNS.relay, EPIC_GUNS.finale]);
function valid(entity) { try { return !!entity?.isValid(); } catch { return false; } }
function health(entity) {
 try {
  const hp = entity?.getComponent('minecraft:health');
  return hp && Number.isFinite(hp.currentValue) && Number.isFinite(hp.effectiveMax) && hp.effectiveMax > 0
   ? { current: hp.currentValue, max: hp.effectiveMax } : null;
 } catch { return null; }
}
function heldId(player) {
 try { return player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand)?.typeId; }
 catch { return undefined; }
}
function context(player) {
 try { return `${player.dimension.id}|${isPvpParticipant(player)}|${pvpMatch(player)}`; }
 catch { return ''; }
}
function canAct(player) {
 const hp = health(player);
 return valid(player) && player.typeId === 'minecraft:player' && hp?.current > 0 && pvpCanAttack(player);
}

/** No global last-damager attribution: only a paid, synchronous hitscan transaction. */
export class EpicGunPassives {
 static focus = new Map();
 static activeHits = new Map();
 static issuedShots = new WeakSet();
 static clearPlayer(id) { this.focus.delete(typeof id === 'string' ? id : id?.id); }
 static clearEntity(id) {
  this.clearPlayer(id);
  for (const [shooterId, entry] of this.focus) if (entry.targetId === id) this.focus.delete(shooterId);
 }
 static tickPlayer(player, gun) {
  const state = this.focus.get(player.id);
  if (state && (!canAct(player) || gun?.id !== EPIC_GUNS.scar || state.context !== context(player) ||
   system.currentTick - state.tick > EPIC_GUNS.scarWindowTicks)) this.clearPlayer(player.id);
 }
 static beginShot(player, gun) {
  if (gun?.id !== EPIC_GUNS.scar) this.clearPlayer(player.id);
  if (!EPIC_IDS.has(gun?.id) || !canAct(player) || heldId(player) !== gun.id) return null;
  const token = { shooterId: player.id, gunId: gun.id, context: context(player), tick: system.currentTick,
   accepted: false, consumed: false, closed: false };
  this.issuedShots.add(token);
  return token;
 }
 static endShot(token) {
  if (!token || !this.issuedShots.has(token)) return;
  if (token.gunId === EPIC_GUNS.scar && !token.accepted) this.clearPlayer(token.shooterId);
  token.closed = true;
  this.issuedShots.delete(token);
 }
 static prepareHit(token, shooter, target, gun) {
  if (!token || !this.issuedShots.has(token) || token.closed || token.consumed ||
   token.shooterId !== shooter?.id || token.gunId !== gun?.id || token.tick !== system.currentTick ||
   token.context !== context(shooter) || !canAct(shooter) || heldId(shooter) !== gun.id ||
   !valid(target) || isProtectedTeammate(shooter, target) || isPvpDowned(target)) return null;
  token.consumed = true;
  if (['minecraft:armor_stand', 'minecraft:item', 'minecraft:xp_orb'].includes(target.typeId)) return null;
  try { if (['creative', 'spectator'].includes(String(target.getGameMode?.()).toLowerCase())) return null; } catch {}
  const hp = health(target);
  if (!hp || hp.current <= 0) return null;
  const hit = { token, shooter, target, gun, beforeHealth: hp.current, targetId: target.id,
   targetContext: context(target), penetration: null, multiplier: 1, count: 0, deathWitness: false };
  if (gun.id === EPIC_GUNS.scar) {
   const previous = this.focus.get(shooter.id);
   const continuing = previous && previous.targetId === target.id && previous.context === token.context &&
    previous.targetContext === hit.targetContext && system.currentTick - previous.tick <= EPIC_GUNS.scarWindowTicks;
   hit.count = continuing ? Math.min(EPIC_GUNS.scarMaxBonusHits + 1, previous.count + 1) : 1;
   hit.penetration = EPIC_GUNS.scarBasePenetration + (hit.count - 1) * EPIC_GUNS.scarPenetrationPerHit;
  }
  if (gun.id === EPIC_GUNS.finale && hp.current / hp.max <= EPIC_GUNS.finaleHealthThreshold) {
   hit.multiplier = EPIC_GUNS.finaleMultiplier;
  }
  return hit;
 }
 /** Keep the death witness open only for the actual damage call, never for later DOT/assists. */
 static applyHit(hit, apply) {
  if (!hit) return apply();
  this.activeHits.set(hit.targetId, hit);
  try {
   const applied = apply();
   if (applied === true) this.commitHit(hit);
   return applied;
  } finally { this.activeHits.delete(hit.targetId); }
 }
 static observeDeath(event) {
  const hit = this.activeHits.get(event.deadEntity?.id);
  if (hit && event.damageSource?.damagingEntity?.id === hit.shooter.id &&
   event.damageSource?.cause === EntityDamageCause.override) hit.deathWitness = true;
 }
 static commitHit(hit) {
  const { token, shooter, target, gun } = hit;
  token.accepted = true;
  if (!canAct(shooter) || heldId(shooter) !== gun.id || token.context !== context(shooter) ||
   isPvpDowned(target)) return;
  if (gun.id === EPIC_GUNS.scar) {
   if (!valid(target) || !(health(target)?.current > 0)) return this.clearPlayer(shooter.id);
   if (this.focus.has(shooter.id) || this.focus.size < EPIC_GUNS.maxTrackedShooters) {
    this.focus.set(shooter.id, { targetId: target.id, targetContext: context(target), count: hit.count,
     context: token.context, tick: system.currentTick });
   }
  }
  // Refuse ambiguous removal, delayed kill credit, PvP downing and every non-direct death.
  // A positive-to-zero health transition or an in-call engine death event proves this hit killed.
  if (gun.id !== EPIC_GUNS.relay || !(hit.beforeHealth > 0)) return;
  const after = health(target);
  if (!(after && after.current <= 0) && !hit.deathWitness) return;
  if (hit.rewarded) return;
  hit.rewarded = true;
  const rolled = EPIC_GUNS.relayMinRounds + Math.floor(Math.random() * (EPIC_GUNS.relayMaxRounds - EPIC_GUNS.relayMinRounds + 1));
  const beforeAmmo = getCurrentAmmo(shooter, gun);
  const nextAmmo = setCurrentAmmo(shooter, gun, beforeAmmo + rolled);
  const added = Math.max(0, Math.min(gun.maxAmmo, nextAmmo) - beforeAmmo);
  if (added > 0) {
   try { shooter.onScreenDisplay?.setActionBar?.(`§5【接力者】直击击杀补充 §d+${added}§5 发 (${nextAmmo}/${gun.maxAmmo})§r`); } catch {}
  }
 }
}
