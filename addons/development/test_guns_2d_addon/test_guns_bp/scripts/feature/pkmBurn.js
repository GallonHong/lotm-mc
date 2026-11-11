import { combatAuthority } from './utils/combatAuthority.js';
import { system, ScriptEventSource, EntityDamageCause } from '@minecraft/server';
import { PKM_BURN } from '../data/pkm.js';
import { isProtectedTeammate } from './utils/teamRules.js';
import { isPvpParticipant, pvpCanAttack } from './utils/pvpRules.js';
import { approvedAt } from './utils/railRules.js';

function alive(entity) {
 try {
  const valid = typeof entity?.isValid === 'function' ? entity.isValid() : entity?.isValid === true;
  return valid && entity.getComponent('minecraft:health')?.currentValue > 0;
 } catch { return false; }
}
function context(entity) {
 // Never carry damage across a match, team, downed state or dimension change.
 try {
  return JSON.stringify([entity.dimension.id, entity.getTags().filter(tag =>
   tag === 'pvp:participant' || tag === 'pvp:downed' || tag.startsWith('pvp:match:') ||
   tag.startsWith('pvp:team:') || tag.startsWith('sapi_team_')).sort()]);
 } catch { return null; }
}
function eligible(shooter, target) {
 try {
  return alive(shooter) && alive(target) && shooter.typeId === 'minecraft:player' &&
   shooter.id !== target.id && shooter.dimension.id === target.dimension.id &&
   pvpCanAttack(shooter) && !isProtectedTeammate(shooter, target) &&
   !['apoc:true_death','pvp:admission','pvp:dead'].some(tag=>shooter.hasTag(tag)||target.hasTag(tag)) &&
   !['creative', 'spectator'].includes(String(target.getGameMode?.()).toLowerCase()) &&
   target.typeId !== 'minecraft:armor_stand' && !target.typeId.includes('hud') &&
   target.isInWater !== true && !target.getEffect?.('fire_resistance');
 } catch { return false; }
}

/** One state per shooter/target. No per-bullet timers, anonymous fire or HP writes. */
export class PkmBurn {
 static active = new Map();
 static primed = new Map();
 static pending = new Map();
 static serial = 0;
 static initialized = false;

 static initialize() {
  if (this.initialized) return;
  this.initialized = true;
  system.afterEvents?.scriptEventReceive?.subscribe(event => this.receiveGuard(event));
 }

 static apply(shooter, target) {
  const authority=combatAuthority();if(authority==='blocked'||!eligible(shooter, target)) return false;
  const now = system.currentTick;
  const key = JSON.stringify([shooter.id, target.id]);
  const old = this.active.get(key);
  const burning = old && now <= old.expires && this.valid(old);
  if (old && !burning) this.remove(old);
  if (burning) {
   if (old.lastDirectHit === now) return false;
   old.lastDirectHit = now;
  }
  const shooterContext = context(shooter), targetContext = context(target);
  if (shooterContext === null || targetContext === null) return false;
  let heat = this.primed.get(key);
  if (heat && (heat.authority !== authority || heat.shooterContext !== shooterContext || heat.targetContext !== targetContext ||
      now - heat.lastHit > PKM_BURN.maxHitGapTicks)) { this.primed.delete(key); heat = null; }
  if (!heat) {
   if (this.primed.size >= PKM_BURN.maxPrimedTargets) return false;
   heat = { shooter, target, shooterContext, targetContext, authority, lastHit: -1, hits: [] };
   this.primed.set(key, heat);
  }
  // Accepted hits only; duplicate callbacks in one tick cannot manufacture heat.
  if (heat.lastHit === now) return false;
  heat.hits = heat.hits.filter(tick => now - tick <= PKM_BURN.hitWindowTicks);
  heat.hits.push(now); heat.lastHit = now;
  if (heat.hits.length < PKM_BURN.hitsToIgnite) return false;
  this.primed.delete(key);
  if (burning) {
   old.expires = now + PKM_BURN.durationTicks;
   return true; // Refresh also requires 5 hits; keep cadence and the burst latch.
  }
  if (this.active.size >= PKM_BURN.maxActiveBurns) return false;
  let sources = 0;
  for (const entry of this.active.values()) if (entry.target.id === target.id) sources++;
  if (sources >= PKM_BURN.maxSourcesPerTarget) return false;
  this.active.set(key, {
   key, shooter, target, shooterContext, targetContext, authority,
   expires: now + PKM_BURN.durationTicks, nextTick: now + PKM_BURN.intervalTicks,
   heatTicks: 0, burst: false, pending: null, lastDirectHit: now
  });
  return true;
 }

 static valid(entry) {
  try {
   return entry.authority===combatAuthority()&&entry.authority!=='blocked'&&this.active.get(entry.key) === entry && eligible(entry.shooter, entry.target) &&
    context(entry.shooter) === entry.shooterContext && context(entry.target) === entry.targetContext;
  } catch { return false; }
 }

 static remove(entry) {
  if (this.active.get(entry.key) === entry) this.active.delete(entry.key);
  if (entry.pending) this.pending.delete(entry.pending);
  entry.pending = null;
 }

 static clearEntity(id) {
  for (const [key, heat] of this.primed) if (heat.shooter.id === id || heat.target.id === id) this.primed.delete(key);
  for (const entry of this.active.values()) {
   if (entry.shooter.id === id || entry.target.id === id) this.remove(entry);
  }
 }

 static tick() {
  const now = system.currentTick;
  for (const [key, heat] of this.primed) {
   if (now - heat.lastHit > PKM_BURN.maxHitGapTicks || heat.authority !== combatAuthority() ||
       !eligible(heat.shooter, heat.target) || context(heat.shooter) !== heat.shooterContext || context(heat.target) !== heat.targetContext) this.primed.delete(key);
  }
  for (const entry of this.active.values()) {
   if (!this.valid(entry)) { this.remove(entry); continue; }
   if (entry.pending) {
    const request = this.pending.get(entry.pending);
    if (!request || now > request.created + PKM_BURN.guardTimeoutTicks) this.remove(entry);
    continue;
   }
   if (now > entry.expires) { this.remove(entry); continue; }
   if (now < entry.nextTick) continue;
   // Never catch up a lag spike with many damage calls in one server tick.
   entry.nextTick = now + PKM_BURN.intervalTicks;
   if (entry.authority==='server' && entry.target.typeId === 'minecraft:player' && !isPvpParticipant(entry.shooter)) {
    this.requestGuard(entry);
   } else {
    this.commit(entry);
   }
  }
 }

 static requestGuard(entry) {
  const nonce = `pkm_${system.currentTick}_${++this.serial}`;
  entry.pending = nonce;
  this.pending.set(nonce, { entry, created: system.currentTick });
  try {
   entry.shooter.runCommand(`scriptevent tg:rail_guard ${JSON.stringify({
    nonce, shooterId: entry.shooter.id, targetId: entry.target.id
   })}`);
  } catch { this.remove(entry); }
 }

 static receiveGuard(event) {
  // Reuse the SAPI one-shot guard contract already used by rail and melee.
  if (event.id !== 'tg:rail_guard_result' || event.sourceType !== ScriptEventSource.Server ||
      event.sourceEntity || event.sourceBlock) return;
  let data;
  try { data = JSON.parse(event.message); } catch { return; }
  const request = this.pending.get(data?.nonce);
  if (!request) return;
  this.pending.delete(data.nonce);
  const entry = request.entry;
  if (entry.pending !== data.nonce) return;
  entry.pending = null;
  try {
   if (!this.valid(entry) || data.allowed !== true ||
       system.currentTick > request.created + PKM_BURN.guardTimeoutTicks ||
       !approvedAt(data, entry.target.dimension.id, entry.target.location)) {
    this.remove(entry);
    return;
   }
   this.commit(entry);
  } catch { this.remove(entry); }
 }

 static commit(entry) {
  if (!this.valid(entry)) { this.remove(entry); return; }
  const heat = entry.heatTicks + PKM_BURN.intervalTicks;
  const burst = !entry.burst && heat >= PKM_BURN.burstAfterTicks;
  const damage = PKM_BURN.damagePerTick + (burst ? PKM_BURN.burstDamage : 0);
  try {
   // A single call on the burst tick prevents native invulnerability frames from
   // discarding a second same-tick hit. Keep the shooter so all guards can veto.
   const accepted = entry.target.applyDamage(damage, {
    cause: EntityDamageCause.override, damagingEntity: entry.shooter
   });
   if (accepted !== true) { this.remove(entry); return; }
  } catch {
   // Never retry an uncertain damage call or fall back to setCurrentValue.
   this.remove(entry);
   return;
  }
  entry.heatTicks = heat;
  entry.burst ||= burst;
  // Keep the request-time cadence: normal guard latency must not accumulate
  // on every pulse. A response already at/past the next deadline starts a fresh
  // interval instead of allowing another damage request in this same tick.
  if (system.currentTick >= entry.nextTick) {
   entry.nextTick = system.currentTick + PKM_BURN.intervalTicks;
  }
  this.feedback(entry, burst);
  if (!this.valid(entry) || system.currentTick >= entry.expires) this.remove(entry);
 }

 static feedback(entry, burst) {
  try {
   if (!alive(entry.target)) return;
   const dim = entry.target.dimension, loc = entry.target.location;
   const body = { x: loc.x, y: loc.y + 0.9, z: loc.z };
   dim.spawnParticle('test_gun:pkm_burn', body);
   dim.spawnParticle('minecraft:basic_flame_particle', body);
   if (burst) {
    dim.spawnParticle('minecraft:critical_hit_emitter', body);
    dim.playSound('random.explode', loc, { volume: 0.65, pitch: 1.5 });
    entry.shooter.onScreenDisplay?.setActionBar?.(`§6【硫磺爆燃】§e+${PKM_BURN.burstDamage} HP§6！§r`);
   }
  } catch { /* Cosmetic failures must not undo or repeat accepted damage. */ }
 }
}
