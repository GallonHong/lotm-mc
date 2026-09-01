import { countAmmoInInventory, isCreativePlayer } from './utils/inventoryUtils.js';

export function updateActionBar(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {}
}

export function showAmmoHUD(player, gun, currentAmmo) {
  const isCreative = isCreativePlayer(player);
  const reserveStr = isCreative ? '§b∞ (创造模式)§r' : ('§f' + countAmmoInInventory(player, gun.ammoTypeId) + '§r');
  const ammoRatio = currentAmmo / gun.maxAmmo;
  let color = '§a';
  if (ammoRatio <= 0.25) color = '§c';
  else if (ammoRatio <= 0.5) color = '§e';

  const text = `§6[${gun.name}]§r ${color}${currentAmmo}§r/§7${gun.maxAmmo}§r §8(背包备弹: ${reserveStr})§r`;
  updateActionBar(player, text);
}

export function showReloadingHUD(player, gun, progressRatio) {
  const totalBars = 10;
  const filled = Math.min(totalBars, Math.floor(progressRatio * totalBars));
  const empty = totalBars - filled;
  const barStr = '§e' + '■'.repeat(filled) + '§8' + '□'.repeat(empty) + '§r';
  updateActionBar(player, `§c[换弹中]§r ${barStr} §7${gun.name}§r`);
}

export function showOutOfAmmoHUD(player, gun) {
  const isCreative = isCreativePlayer(player);
  const reserveStr = isCreative ? '§b∞§r' : countAmmoInInventory(player, gun.ammoTypeId);
  updateActionBar(player, `§c[弹夹打空 0/${gun.maxAmmo}]§r 潜行+右键换弹 §8(背包备弹: ${reserveStr})§r`);
}
