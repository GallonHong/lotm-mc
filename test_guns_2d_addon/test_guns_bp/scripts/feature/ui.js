import { countAmmoInInventory, isCreativePlayer } from './utils/inventoryUtils.js';
import { EquipmentSlot } from '@minecraft/server';

const EXTRACTION_DIMENSION = 'apoc_extract:city';
const EXTRACTION_NAVIGATION_HUD = 'interop:apoc_extraction_navigation:v1';

function extractionNavigation(player) {
  try {
    if (player.dimension?.id !== EXTRACTION_DIMENSION) return '';
    return String(player.getDynamicProperty(EXTRACTION_NAVIGATION_HUD) || '').trim();
  } catch {
    return '';
  }
}

export function updateActionBar(player, text) {
  try {
    const navigation = extractionNavigation(player);
    player.onScreenDisplay.setActionBar(navigation ? `${text} §8||§r ${navigation}` : text);
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

  const durStr = formatDurabilityString(player, gun);
  const text = `§6[${gun.name}]§r §e弹药:§r ${ammoColor}${currentAmmo}§r/§7${gun.maxAmmo}§r §8(备弹: ${reserveStr})§r${durStr}`;
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
