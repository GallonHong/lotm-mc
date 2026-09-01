import { countAmmoInInventory, consumeAmmoFromInventory } from './utils/inventoryUtils.js';
import { getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { showReloadingHUD, showAmmoHUD, updateActionBar } from './ui.js';

export class ReloadManager {
  static reloadingPlayers = new Map(); // playerId -> { gunId, currentTick, totalTicks }

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
    if (currentAmmo >= gun.maxAmmo) {
      updateActionBar(player, '§a[弹夹已满 / Magazine Full]§r ' + gun.name);
      return false;
    }

    const availableAmmo = countAmmoInInventory(player, gun.ammoTypeId);
    if (availableAmmo <= 0) {
      updateActionBar(player, '§c[背包无对应弹药 / No Ammo in Inventory]§r ' + gun.name);
      try {
        player.dimension.playSound('random.click', player.location, { volume: 0.6, pitch: 1.0 });
      } catch {}
      return false;
    }

    this.reloadingPlayers.set(player.id, {
      gunId: gun.id,
      currentTick: 0,
      totalTicks: gun.reloadTime || 50
    });

    try {
      player.dimension.playSound('random.door_open', player.location, { volume: 0.8, pitch: 1.0 });
    } catch {}

    return true;
  }

  static tick(player, currentGun) {
    const reloadInfo = this.reloadingPlayers.get(player.id);
    if (!reloadInfo) return;

    // Check if player changed weapon
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
    updateActionBar(player, '§a[换弹完成 / Reloaded]§r ' + gun.name + ' (§e' + newAmmo + '/' + gun.maxAmmo + '§r)');
  }
}
