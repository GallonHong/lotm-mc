import * as server from '@minecraft/server';
import { armorBoostAmplifier, getArmorHealthBonus } from '../data/armorHealth.js';
import { isCombatDowned } from './utils/pvpRules.js';
import { readGeneCombatAttributes } from './utils/geneCombatBuff.js';

const { EquipmentSlot, system } = server;
const EFFECT = 'health_boost';
const LEASE_TICKS = 120;
const REFRESH_AT = 60;
const OWNER_KEY = 'tg:armor_health_lease';
const HUD_KEY = 'tg:armor_health_hud';
// Extraction restores insured equipment at spawn +20 ticks, and Daily may
// teleport again at +30. Wait for those handlers and one stable armor sample.
const RESPAWN_GRACE = 40;
const RESPAWN_STABLE = 10;
const RESPAWN_DEADLINE = 200;

function downed(player) {
 if (isCombatDowned(player)) return true;
 // Older Life releases keep their downed map private, without shared tags.
 // Their unique three level-256 immobilization effects are a conservative veto.
 return ['weakness', 'slowness', 'mining_fatigue'].every(id => player.getEffect(id)?.amplifier >= 255);
}
function pvpMatch(player) { return player.getTags?.().find(tag => tag.startsWith('pvp:match:')) || ''; }

function readHealth(player) {
 const component = player.getComponent('minecraft:health');
 return component && Number.isFinite(component.currentValue) && Number.isFinite(component.effectiveMax)
  ? { component, current: component.currentValue, max: component.effectiveMax } : undefined;
}
function property(player, key, value) { try { player.setDynamicProperty(key, value); } catch {} }
function getProperty(player, key) { try { return player.getDynamicProperty(key); } catch { return undefined; } }
function preserveHealth(player, current) {
 const health = readHealth(player);
 // Never revive a dead player, or reset a living player to full health on equip/refresh.
 if (current > 0 && health?.current > 0) {
  const wanted = Math.min(current, health.max);
  if (Math.abs(health.current - wanted) > 0.0001) health.component.setCurrentValue(wanted);
 }
}

/**
 * Native red-health capacity only. No player.json override and no absorption writes.
 * Bedrock exposes one health_boost slot, not effect-source IDs. A live foreign effect
 * is never replaced/removed. Same-level, same-duration foreign replacements cannot
 * be distinguished by the API; see ARMOR_HEALTH_NOTES.md for the compatibility limit.
 */
export class ArmorHealth {
 static states = new Map();

 static state(player) {
  let state = this.states.get(player.id);
  if (!state) {
   const owner = getProperty(player, OWNER_KEY);
   state = {
    amplifier: Number.isInteger(owner) && owner >= 0 && owner <= 19 ? owner : -1,
    expectedExpiry: undefined,
    hidden: getProperty(player, HUD_KEY) === true,
    externalBoost: false,
    wasPvpDead: player.hasTag('pvp:dead'),
    respawn: undefined
   };
   this.states.set(player.id, state);
   // A previous session may have ended while the compact HUD was enabled.
   this.restoreHUD(player);
  }
  return state;
 }

 static beginRespawn(player, state, mode, health) {
  state.respawn = { mode, readyAt: system.currentTick + RESPAWN_GRACE,
   deadline: system.currentTick + RESPAWN_DEADLINE, lastHealth: health?.current,
   match: pvpMatch(player), signature: undefined, stableSince: system.currentTick };
 }

 static onSpawn(player, initialSpawn) {
  this.clearPlayer(player);
  const state = this.state(player);
  // Login/rejoin is initialSpawn=true. Never persist a healing entitlement.
  if (initialSpawn === false) this.beginRespawn(player, state, 'native', readHealth(player));
 }

 static onHurt(player, damage) {
  if (damage > 0) {
   const state = this.states.get(player?.id);
   if (state) state.respawn = undefined;
  }
 }

 static prepareRespawn(player, state, health) {
  const pvpDead = player.hasTag('pvp:dead');
  // SAPI's formal bleedout/surrender respawn does not emit another native spawn.
  // Only its active-match dead edge arms a new one-shot; teammate rescue does not.
  if (pvpDead && !state.wasPvpDead && player.hasTag('pvp:participant') && player.hasTag('pvp:active') && pvpMatch(player)) {
   this.beginRespawn(player, state, 'pvp', health);
  }
  state.wasPvpDead = pvpDead;
  const pending = state.respawn;
  if (!pending) return;
  if (system.currentTick > pending.deadline || downed(player) || health?.current <= 0 ||
      ((pending.mode === 'pvp' || pending.match) && (!player.hasTag('pvp:participant') || !player.hasTag('pvp:active'))) ||
      (pending.match && pending.match !== pvpMatch(player)) ||
      (health && pending.lastHealth !== undefined && health.current < Math.min(pending.lastHealth, health.max) - 0.0001)) {
   state.respawn = undefined;
   return;
  }
  if (health) pending.lastHealth = health.current;
  pending.blocked = !health || pvpDead || player.hasTag('apoc:true_death') ||
   player.hasTag('pvp:admission') || player.hasTag('extract:admission') ||
   String(player.getGameMode?.()).toLowerCase() === 'spectator';
  if (pending.blocked) { pending.signature = undefined; pending.stableSince = system.currentTick; }
 }

 static settleRespawn(player, state) {
  const pending = state.respawn;
  if (!pending || pending.blocked) return;
  const health = readHealth(player);
  const equippable = player.getComponent('minecraft:equippable');
  if (!health || health.current <= 0 || !equippable) {
   pending.signature = undefined;
   pending.stableSince = system.currentTick;
   return;
  }
  const equipment = ['Head', 'Chest', 'Legs', 'Feet'].map(slot => {
   const item = equippable.getEquipment(EquipmentSlot[slot]);
   const wear = item?.getComponent('minecraft:durability');
   return [item?.typeId || '', !!wear && wear.damage >= wear.maxDurability];
  });
  // Daily's in-dungeon tag can survive a real checkpoint respawn. It is context,
  // not a permanent blocker. Exact gear, max and dimension must settle together.
  const context = player.getTags?.().filter(tag => tag === 'daily_in_dungeon' || tag === 'apoc_extraction_active' || tag.startsWith('pvp:match:')).sort() || [];
  const signature = JSON.stringify([equipment, health.max, player.dimension?.id, context]);
  if (signature !== pending.signature) { pending.signature = signature; pending.stableSince = system.currentTick; }
  pending.lastHealth = health.current;
  if (system.currentTick < pending.readyAt || system.currentTick - pending.stableSince < RESPAWN_STABLE) return;
  // Consume before writing: failure/duplicate ticks cannot turn this into a heal loop.
  state.respawn = undefined;
  if (health.current < health.max) health.component.setCurrentValue(health.max);
 }

 static ownsEffect(effect, state) {
  if (!effect) return false;
  if (!Number.isFinite(effect.duration) || effect.duration < 0 || effect.duration > LEASE_TICKS) return false;
  if (state.amplifier >= 0 && effect.amplifier === state.amplifier) {
   return state.expectedExpiry === undefined || effect.duration <= state.expectedExpiry - system.currentTick + 2;
  }
  return true;
 }

 static tick(player) {
  if (!player?.isValid?.()) return;
  try {
   const state = this.state(player);
   this.restoreHUD(player); // Upgrade cleanup only: always use the native heart HUD.
   const before = readHealth(player);
   this.prepareRespawn(player, state, before);
   if (!before || before.current <= 0 || downed(player) ||
       ['pvp:dead', 'apoc:true_death'].some(tag => player.hasTag(tag))) {
    this.restoreHUD(player);
    return; // Life/rescue code owns HP during death/downed transitions.
   }

   const effect = player.getEffect(EFFECT);
   const owned = this.ownsEffect(effect, state);
   if (effect && !owned) {
    // Do not weaken, refresh, remove, or borrow another addon's/potion's boost.
    state.amplifier = -1;
    state.expectedExpiry = undefined;
    state.externalBoost = true;
    property(player, OWNER_KEY, undefined);
    this.settleRespawn(player, state); // Honor the actual foreign max without changing its effect.
    return;
   }
   state.externalBoost = false;
   if (owned && state.expectedExpiry === undefined) state.expectedExpiry = system.currentTick + effect.duration;
   const baseMax = Math.max(1, before.max - (owned ? (effect.amplifier + 1) * 4 : 0));
   const equippable = player.getComponent('minecraft:equippable');
   if (!equippable) {
    if (state.respawn) { state.respawn.signature = undefined; state.respawn.stableSince = system.currentTick; }
    return;
   }
   const geneBuff = readGeneCombatAttributes(player);
   const geneBonus = geneBuff.maxHp;
   const target = armorBoostAmplifier(getArmorHealthBonus(equippable, EquipmentSlot) + geneBonus, baseMax);
   if (target < 0) {
    if (owned) { player.removeEffect(EFFECT); preserveHealth(player, before.current); }
    state.amplifier = -1;
    state.expectedExpiry = undefined;
    property(player, OWNER_KEY, undefined);
    this.restoreHUD(player);
    this.settleRespawn(player, state);
    return;
   }
   if (owned && effect.amplifier === target && effect.duration > REFRESH_AT) {
    this.settleRespawn(player, state);
    return;
   }

   // Lower levels cannot replace higher ones in Bedrock. Remove only OUR lease,
   // then restore the pre-change current HP clamped to the new actual maximum.
   if (owned && target < effect.amplifier) player.removeEffect(EFFECT);
   player.addEffect(EFFECT, LEASE_TICKS, { amplifier: target, showParticles: false });
   const applied = player.getEffect(EFFECT);
   if (applied?.amplifier === target && applied.duration <= LEASE_TICKS) {
    state.amplifier = target;
    state.expectedExpiry = system.currentTick + applied.duration;
    property(player, OWNER_KEY, target);
   }
    if (applied?.amplifier === target && (applied.amplifier > (effect?.amplifier ?? -1) || !effect)) {
     const health = readHealth(player);
     if (health && health.current > 0) {
      const bonusHeal = (applied.amplifier - (effect?.amplifier ?? -1)) * 4;
      health.component.setCurrentValue(Math.min(health.max, health.current + bonusHeal));
     }
    } else {
     preserveHealth(player, before.current);
    }
    if (applied?.amplifier === target) this.settleRespawn(player, state);
  } catch (error) {
   // An unavailable API or failed effect must never leave the player's only HP UI hidden.
   this.restoreHUD(player);
   const state = this.states.get(player.id);
   if (state?.respawn) { state.respawn.signature = undefined; state.respawn.stableSince = system.currentTick; }
   if (state && !state.warned) {
    state.warned = true;
    console.warn('[Test Guns] Armor health update failed; native health HUD retained:', error);
   }
  }
 }

 // Migration-only cleanup for 3.16.7: restore a heart HUD that this pack hid.
 // Never hide hearts again, and never write current/max HP into the actionbar.
 static restoreHUD(player) {
  const state = this.states.get(player.id);
  if (!state?.hidden && getProperty(player, HUD_KEY) !== true) return;
  try {
   const element = server.HudElement?.Health;
   const reset = server.HudVisibility?.Reset;
   if (element === undefined || reset === undefined || typeof player.onScreenDisplay?.setHudVisibility !== 'function') return;
   player.onScreenDisplay.setHudVisibility(reset, [element]);
   if (state) state.hidden = false;
   property(player, HUD_KEY, undefined);
  } catch {} // Leave ownership marker for a retry on next tick/spawn.
 }

 static clearPlayer(playerOrId) {
  const id = typeof playerOrId === 'string' ? playerOrId : playerOrId.id;
  if (typeof playerOrId !== 'string') this.restoreHUD(playerOrId);
  // Persisted lease survives a script reload/rejoin. It naturally expires in 6s
  // if this pack stops running, rather than leaving a permanent max-health buff.
  this.states.delete(id);
 }
}
