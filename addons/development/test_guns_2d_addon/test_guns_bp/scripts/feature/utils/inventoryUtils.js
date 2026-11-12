import { hasInfinitePvpReserve } from './pvpRules.js';
import { EquipmentSlot, system } from '@minecraft/server';

export function isCreativePlayer(player) {
 if (!player || !player.isValid()) return false;
 try {
  if (typeof player.getGameMode === 'function') {
   return player.getGameMode() === 'creative';
  }
 } catch {}
 try {
  return player.matches({ gameMode: 'creative' });
 } catch {
  return false;
 }
}

export function getHeldItem(player) {
 try {
  const equippable = player.getComponent('minecraft:equippable');
  if (!equippable) return undefined;
  return equippable.getEquipment(EquipmentSlot.Mainhand);
 } catch {
  return undefined;
 }
}

export function countAmmoInInventory(player, ammoTypeId) {
 if (hasInfinitePvpReserve(player) || isCreativePlayer(player)) {
  return 9999;
 }
 try {
  const inv = player.getComponent('minecraft:inventory');
  if (!inv || !inv.container) return 0;
  const container = inv.container;
  let total = 0;
  for (let i = 0; i < container.size; i++) {
   const item = container.getItem(i);
   if (item && item.typeId === ammoTypeId) {
    total += item.amount;
   }
  }
  return total;
 } catch {
  return 0;
 }
}

// Display-only cache. Authoritative ammo checks and consumption above/below
// always read the live container; a stale HUD can never authorize a shot.
const hudAmmoCache = new WeakMap();
export function countAmmoForHUD(player, ammoTypeId) {
 if (!player) return 0;
 if (hasInfinitePvpReserve(player) || isCreativePlayer(player)) return 9999;
 const now = system.currentTick;
 const cached = hudAmmoCache.get(player);
 if (cached && cached.ammoTypeId === ammoTypeId && now >= cached.tick && now - cached.tick < 4) {
  return cached.count;
 }
 const count = countAmmoInInventory(player, ammoTypeId);
 hudAmmoCache.set(player, { ammoTypeId, tick: now, count });
 return count;
}

export function consumeAmmoFromInventory(player, ammoTypeId, amountNeeded) {
 // Invalidate even on a partial/error path: container writes may have occurred.
 if (player) hudAmmoCache.delete(player);
 if (hasInfinitePvpReserve(player) || isCreativePlayer(player)) {
  return amountNeeded;
 }
 try {
  const inv = player.getComponent('minecraft:inventory');
  if (!inv || !inv.container) return 0;
  const container = inv.container;
  let remaining = amountNeeded;

  for (let i = 0; i < container.size; i++) {
   const item = container.getItem(i);
   if (item && item.typeId === ammoTypeId) {
    if (item.amount <= remaining) {
     remaining -= item.amount;
     container.setItem(i, undefined);
    } else {
     item.amount -= remaining;
     container.setItem(i, item);
     remaining = 0;
    }
    if (remaining <= 0) break;
   }
  }
  return amountNeeded - remaining;
 } catch {
  return 0;
 }
}
