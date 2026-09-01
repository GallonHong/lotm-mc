export function updateActionBar(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {}
}

export function showAmmoHUD(player, gun, currentAmmo) {
  const ammoRatio = currentAmmo / gun.maxAmmo;
  let color = '§a';
  if (ammoRatio <= 0.25) color = '§c';
  else if (ammoRatio <= 0.5) color = '§e';

  const text = '§6[' + gun.name + ']§r ' + color + currentAmmo + '§r / §7' + gun.maxAmmo + '§r';
  updateActionBar(player, text);
}

export function showReloadingHUD(player, gun, progressRatio) {
  const totalBars = 10;
  const filled = Math.min(totalBars, Math.floor(progressRatio * totalBars));
  const empty = totalBars - filled;
  const barStr = '§e' + '■'.repeat(filled) + '§8' + '□'.repeat(empty) + '§r';
  updateActionBar(player, '§c[换弹中 / Reloading]§r ' + barStr + ' §7' + gun.name + '§r');
}

export function showOutOfAmmoHUD(player, gun) {
  updateActionBar(player, '§c[弹药耗尽 / No Ammo]§r 潜行+右键或按住扳机自动换弹 §7(' + gun.name + ')§r');
}
