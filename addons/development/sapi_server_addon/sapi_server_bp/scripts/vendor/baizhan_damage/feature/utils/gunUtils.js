import { ammoKey, isPvpParticipant, isPvpDowned, hasTag } from './pvpRules.js';
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
  if (isPvpDowned(player)) return 0;
  // Baizhan starts empty outside PvP; pickup/reconnect must not mint ammo.
  const initial = isPvpParticipant(player) ? gun.maxAmmo : (gun.initialAmmo ?? gun.maxAmmo);
  player.setDynamicProperty(key, initial);
  return initial;
 } catch {
  if (isPvpDowned(player)) return 0;
  return gun.isBaizhan ? 0 : gun.maxAmmo;
 }
}

export function setCurrentAmmo(player, gun, amount) {
 if (isPvpDowned(player)) return getCurrentAmmo(player, gun);
 if (isPvpParticipant(player) && (!hasTag(player, 'pvp:guns_ready') || hasTag(player, 'pvp:guns_finished'))) return 0;
 try {
  const key = ammoKey(player, getGunDynamicKey(gun.id));
  const clamped = Math.max(0, Math.min(gun.maxAmmo, Math.floor(amount)));
  player.setDynamicProperty(key, clamped);
  return clamped;
 } catch {
  return gun.isBaizhan ? undefined : amount;
 }
}
