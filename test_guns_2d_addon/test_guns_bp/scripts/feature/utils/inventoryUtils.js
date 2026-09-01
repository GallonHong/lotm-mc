import { EquipmentSlot } from '@minecraft/server';

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

export function consumeAmmoFromInventory(player, ammoTypeId, amountNeeded) {
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
