import { EquipmentSlot } from '@minecraft/server';
import { countAmmoInInventory, consumeAmmoFromInventory, isCreativePlayer } from './utils/inventoryUtils.js';
import { getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { showReloadingHUD, showAmmoHUD, updateActionBar } from './ui.js';

export class ReloadManager {
  static reloadingPlayers = new Map();

  static isReloading(player) {
    return this.reloadingPlayers.has(player.id);
  }

  static cancelReload(player) {
    if (this.reloadingPlayers.has(player.id)) {
      this.reloadingPlayers.delete(player.id);
    }
  }

  static startReload(player, gun) {
    if (this.isReloading(player)) return false;

    const currentAmmo = getCurrentAmmo(player, gun);
    const availableAmmo = countAmmoInInventory(player, gun.ammoTypeId);
    const isCreative = isCreativePlayer(player);

    if (currentAmmo >= gun.maxAmmo) {
      updateActionBar(player, `§a[弹夹已满 ${currentAmmo}/${gun.maxAmmo}]§r §6[${gun.name}]§r §8(备弹: ${isCreative ? '§b∞§r' : availableAmmo})§r`);
      return false;
    }

    if (availableAmmo <= 0) {
      updateActionBar(player, `§e[枪膛余弹 ${currentAmmo}/${gun.maxAmmo}]§r §c背包无备用弹药!§r (仍可击发 ${currentAmmo} 发)`);
      try {
        player.dimension.playSound('random.click', player.location, { volume: 0.6, pitch: 1.0 });
      } catch {}
      return false;
    }

    let totalTicks = gun.reloadTime || 45;
    const equ = player.getComponent?.('minecraft:equippable');
    const chest = equ?.getEquipment(EquipmentSlot.Chest);
    if (chest && chest.typeId.includes('armor_wasp_rig')) {
      totalTicks = Math.max(10, Math.round(totalTicks * 0.8)); // 携弹胸挂装填时间 -20%
    }

    this.reloadingPlayers.set(player.id, {
      gunId: gun.id,
      currentTick: 0,
      totalTicks: totalTicks
    });

    try {
      player.dimension.playSound('random.door_open', player.location, { volume: 0.8, pitch: 1.0 });
    } catch {}

    return true;
  }

  static tick(player, currentGun) {
    const reloadInfo = this.reloadingPlayers.get(player.id);
    if (!reloadInfo) return;

    if (!currentGun || currentGun.id !== reloadInfo.gunId) {
      this.cancelReload(player);
      return;
    }

    reloadInfo.currentTick++;
    const progress = reloadInfo.currentTick / reloadInfo.totalTicks;
    showReloadingHUD(player, currentGun, progress);

    if (reloadInfo.currentTick >= reloadInfo.totalTicks) {
      this.completeReload(player, currentGun);
    }
  }

  static completeReload(player, gun) {
    this.reloadingPlayers.delete(player.id);

    const currentAmmo = getCurrentAmmo(player, gun);
    const needAmmo = gun.maxAmmo - currentAmmo;
    const consumed = consumeAmmoFromInventory(player, gun.ammoTypeId, needAmmo);

    const newAmmo = currentAmmo + consumed;
    setCurrentAmmo(player, gun, newAmmo);

    showAmmoHUD(player, gun, newAmmo);
    updateActionBar(player, `§a[换弹完成]§r §6[${gun.name}]§r (§e${newAmmo}/${gun.maxAmmo}§r)`);
  }
}
