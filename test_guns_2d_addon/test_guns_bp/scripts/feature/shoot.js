import { getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { fireBullet } from './utils/shootUtils.js';
import { GrenadeEngine } from './grenadeEngine.js';
import { showAmmoHUD, showOutOfAmmoHUD } from './ui.js';
import { ReloadManager } from './reload.js';
import { SkillManager } from './skillManager.js';
import { FireMode } from '../data/types.js';

export class ShootManager {
  static playerCooldowns = new Map(); // playerId -> remainingCooldownTicks
  static playerShooting = new Map();  // playerId -> boolean (isTriggerDown)

  static setTriggerState(player, isDown) {
    this.playerShooting.set(player.id, isDown);
  }

  static isTriggerDown(player) {
    return !this.playerShooting.get(player.id);
  }

  static clearPlayer(player) {
    this.playerShooting.delete(player.id);
    this.playerCooldowns.delete(player.id);
  }

  static tick(player, gun) {
    const currentCd = this.playerCooldowns.get(player.id) || 0;
    if (currentCd > 0) {
      this.playerCooldowns.set(player.id, currentCd - 1);
    }

    if (SkillManager.isOverdriveActive(player)) {
      return;
    }

    if (ReloadManager.isReloading(player)) {
      ReloadManager.tick(player, gun);
      return;
    }

    if (!this.isTriggerDown(player)) {
      return;
    }

    if (currentCd <= 0 && gun) {
      this.executeShot(player, gun);
    }
  }

  static executeShot(player, gun) {
    const currentAmmo = getCurrentAmmo(player, gun);

    if (currentAmmo <= 0) {
      showOutOfAmmoHUD(player, gun);
      try {
        player.dimension.playSound('random.click', player.location, { volume: 0.5, pitch: 1.2 });
      } catch {}
      this.playerCooldowns.set(player.id, 10);
      ReloadManager.startReload(player, gun);
      return;
    }

    // 1. Decrement Ammo
    const newAmmo = currentAmmo - 1;
    setCurrentAmmo(player, gun, newAmmo);

    // 2. Launch Projectiles (Grenade or Bullets)
    if (gun.isGrenadeLauncher) {
      GrenadeEngine.launchGrenade(player, gun);
    } else {
      fireBullet(player, gun);
    }

    // 3. Play Gunshot Audio
    if (gun.shootSound) {
      try {
        player.dimension.playSound(gun.shootSound, player.location, {
          volume: 1.2,
          pitch: 0.95 + Math.random() * 0.1
        });
      } catch {}
    }

    // 4. Update HUD
    showAmmoHUD(player, gun, newAmmo);

    // 5. Apply Cooldown
    this.playerCooldowns.set(player.id, gun.fireRate || 4);

    if (gun.mode === FireMode.SEMI) {
      this.setTriggerState(player, false);
    }
  }
}
