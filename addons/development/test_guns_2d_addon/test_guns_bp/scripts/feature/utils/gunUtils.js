import { ammoKey, isPvpParticipant, hasTag } from './pvpRules.js';
import { getGunById } from '../../data/guns.js';
import { getHeldItem } from './inventoryUtils.js';

export function getHeldGun(player) {
 const item = getHeldItem(player);
 if (!item) return null;
 const gun = getGunById(item.typeId);
 return gun ? { gun, item } : null;
}

export function getGunDynamicKey(gunId) {
 return 'tg_ammo_' + gunId.replace(':', '_');
}

export function getCurrentAmmo(player, gun) {
 if (isPvpParticipant(player) && (!hasTag(player, 'pvp:guns_ready') || hasTag(player, 'pvp:guns_finished'))) return 0;
 try {
  const key = ammoKey(player, getGunDynamicKey(gun.id));
  const ammo = player.getDynamicProperty(key);
  if (typeof ammo === 'number') {
   return Math.max(0, Math.min(gun.maxAmmo, ammo));
  }
  // Default initialize to maxAmmo on first pickup
  player.setDynamicProperty(key, gun.maxAmmo);
  return gun.maxAmmo;
 } catch {
  return gun.maxAmmo;
 }
}

export function setCurrentAmmo(player, gun, amount) {
 if (isPvpParticipant(player) && (!hasTag(player, 'pvp:guns_ready') || hasTag(player, 'pvp:guns_finished'))) return 0;
 try {
  const key = ammoKey(player, getGunDynamicKey(gun.id));
  const clamped = Math.max(0, Math.min(gun.maxAmmo, Math.floor(amount)));
  player.setDynamicProperty(key, clamped);
  return clamped;
 } catch {
  return amount;
 }
}
