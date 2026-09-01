import { getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { fireBullet } from './utils/shootUtils.js';
import { GrenadeEngine } from './grenadeEngine.js';
import { ArcEngine } from './arcEngine.js';
import { showAmmoHUD, showOutOfAmmoHUD } from './ui.js';
import { ReloadManager } from './reload.js';
import { SkillManager } from './skillManager.js';
import { FireMode } from '../data/types.js';
import { EquipmentSlot } from '@minecraft/server';

export class ShootManager {
  static playerCooldowns = new Map();
  static playerShooting = new Map();

  static setTriggerState(player, isDown) {
    this.playerShooting.set(player.id, isDown);
  }

  static isTriggerDown(player) {
    return Boolean(this.playerShooting.get(player.id));
  }

  static clearPlayer(player) {
    this.playerShooting.delete(player.id);
    this.playerCooldowns.delete(player.id);
  }

  /**
   * 射击即时消耗耐久度并实时更新物品栏耐久条
   */
  static deductDurability(player, gun) {
    if (!player || !player.isValid() || !gun) return;
    try {
      const equippable = player.getComponent('minecraft:equippable');
      if (!equippable) return;

      const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
      if (!mainhand || mainhand.typeId !== gun.id) return;

      const durComp = mainhand.getComponent('minecraft:durability');
      if (!durComp) return;

      const currentDamage = durComp.damage || 0;
      const maxDur = durComp.maxDurability || 500;
      const nextDamage = currentDamage + 1;

      if (nextDamage >= maxDur) {
        equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
        player.dimension.playSound('random.break', player.location, { volume: 1.2, pitch: 0.85 });
        player.onScreenDisplay?.setActionBar?.(`§c⚠ 你的【${gun.name}】已磨损报废!§r`);
      } else {
        durComp.damage = nextDamage;
        equippable.setEquipment(EquipmentSlot.Mainhand, mainhand);
      }
    } catch (err) {
      console.warn('deductDurability error:', err);
    }
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

    const newAmmo = currentAmmo - 1;
    setCurrentAmmo(player, gun, newAmmo);

    // 1. 扣除武器耐久度
    this.deductDurability(player, gun);

    // 2. 发射武器弹道
    if (gun.isGrenadeLauncher) {
      GrenadeEngine.launchGrenade(player, gun);
    } else if (gun.isArcWeapon) {
      ArcEngine.fireArc(player, gun);
    } else {
      fireBullet(player, gun);
    }

    // 3. 播放开火枪声
    if (gun.shootSound) {
      try {
        player.dimension.playSound(gun.shootSound, player.location, {
          volume: 1.3,
          pitch: 0.95 + Math.random() * 0.1
        });
      } catch {}
    }

    // 4. 显示弹药 HUD 并进入射击冷却
    showAmmoHUD(player, gun, newAmmo);
    this.playerCooldowns.set(player.id, gun.fireRate || 4);

    if (gun.mode === FireMode.SEMI) {
      this.setTriggerState(player, false);
    }
  }
}
