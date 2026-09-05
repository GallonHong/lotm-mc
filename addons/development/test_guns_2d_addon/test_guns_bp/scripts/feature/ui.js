import { countAmmoInInventory, isCreativePlayer } from './utils/inventoryUtils.js';
import { EquipmentSlot } from '@minecraft/server';
import { DamageHandler } from './damageHandler.js';

export function updateActionBar(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {}
}

export function getWeaponDurability(player, gun) {
  if (!player || !player.isValid() || !gun) return null;
  try {
    const equippable = player.getComponent('minecraft:equippable');
    if (!equippable) return null;

    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
    if (!mainhand || mainhand.typeId !== gun.id) return null;

    const durComp = mainhand.getComponent('minecraft:durability');
    if (!durComp) return null;

    const maxDur = durComp.maxDurability || 500;
    const damage = durComp.damage || 0;
    const current = Math.max(0, maxDur - damage);
    return { current, max: maxDur, ratio: current / maxDur };
  } catch {
    return null;
  }
}

function formatDurabilityString(player, gun) {
  const dur = getWeaponDurability(player, gun);
  if (!dur) return '';

  let durColor = '§a';
  if (dur.ratio <= 0.25) durColor = '§c';
  else if (dur.ratio <= 0.55) durColor = '§e';

  return ` §8|§r §d🛡️耐久:§r ${durColor}${dur.current}§r/§7${dur.max}§r`;
}

export function showAmmoHUD(player, gun, currentAmmo) {
  const isCreative = isCreativePlayer(player);
  const reserveStr = isCreative ? '§b∞§r' : ('§f' + countAmmoInInventory(player, gun.ammoTypeId) + '§r');
  const ammoRatio = currentAmmo / gun.maxAmmo;
  
  let ammoColor = '§a';
  if (ammoRatio <= 0.25) ammoColor = '§c';
  else if (ammoRatio <= 0.5) ammoColor = '§e';

  let passiveStr = '';
  if (gun && (gun.id === 'test_gun:m1014_ward' || gun.isArmorScaled)) {
    const armor = DamageHandler.estimateArmorPoints(player);
    const bonusPct = Math.round(Math.min(1.0, armor * 0.03) * 100);
    passiveStr = ` §8|§r §6🛡️重装:§r §e${armor}甲 §a+${bonusPct}%§r`;
  }

  const durStr = formatDurabilityString(player, gun);
  const text = `§6[${gun.name}]§r §e弹药:§r ${ammoColor}${currentAmmo}§r/§7${gun.maxAmmo}§r §8(备弹: ${reserveStr})§r${passiveStr}${durStr}`;
  updateActionBar(player, text);
}

export function showReloadingHUD(player, gun, progressRatio) {
  const totalBars = 10;
  const filled = Math.min(totalBars, Math.floor(progressRatio * totalBars));
  const empty = totalBars - filled;
  const barStr = '§e' + '■'.repeat(filled) + '§8' + '□'.repeat(empty) + '§r';
  const durStr = formatDurabilityString(player, gun);
  updateActionBar(player, `§c[换弹中]§r ${barStr} §7${gun.name}§r${durStr}`);
}

export function showOutOfAmmoHUD(player, gun) {
  const isCreative = isCreativePlayer(player);
  const reserveStr = isCreative ? '§b∞§r' : countAmmoInInventory(player, gun.ammoTypeId);
  const durStr = formatDurabilityString(player, gun);
  updateActionBar(player, `§c[弹夹打空 0/${gun.maxAmmo}]§r 潜行+右键换弹 §8(备弹: ${reserveStr})§r${durStr}`);
}
