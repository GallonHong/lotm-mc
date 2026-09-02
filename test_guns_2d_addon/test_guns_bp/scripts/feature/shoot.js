import { RecoilManager } from './recoilManager.js';
import { getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { fireBullet } from './utils/shootUtils.js';
import { GrenadeEngine } from './grenadeEngine.js';
import { ArcEngine } from './arcEngine.js';
import { showAmmoHUD, showOutOfAmmoHUD, updateActionBar } from './ui.js';
import { ReloadManager } from './reload.js';
import { SkillManager } from './skillManager.js';
import { FireMode } from '../data/types.js';
import { EquipmentSlot, EntityDamageCause } from '@minecraft/server';

export class ShootManager {
  static playerCooldowns = new Map();
  static playerShooting = new Map();
  static arcChargeTicks = new Map(); // playerId -> number (0 ~ 20 ticks)

  static setTriggerState(player, isDown) {
    this.playerShooting.set(player.id, isDown);
    if (!isDown) {
      const charge = this.arcChargeTicks.get(player.id) || 0;
      if (charge > 0 && charge < 20) {
        this.arcChargeTicks.delete(player.id);
        updateActionBar(player, '§7[⚡ 蓄能中断 / Charge Cancelled]§r');
      }
    }
  }

  static isTriggerDown(player) {
    return Boolean(this.playerShooting.get(player.id));
  }

  static clearPlayer(player) {
    this.playerShooting.delete(player.id);
    this.playerCooldowns.delete(player.id);
    this.arcChargeTicks.delete(player.id);
  }

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
      if (gun.isArcWeapon) {
        this.processArcCharge(player, gun);
      } else {
        this.executeShot(player, gun);
      }
    }
  }

  /**
   * 特斯拉高能电弧发射器：1.0 秒 (20 刻) 右键蓄力逻辑
   */
  static processArcCharge(player, gun) {
    const currentAmmo = getCurrentAmmo(player, gun);
    if (currentAmmo <= 0) {
      this.arcChargeTicks.delete(player.id);
      showOutOfAmmoHUD(player, gun);
      try {
        player.dimension.playSound('random.click', player.location, { volume: 0.5, pitch: 1.2 });
      } catch {}
      this.playerCooldowns.set(player.id, 10);
      ReloadManager.startReload(player, gun);
      return;
    }

    const currentTicks = (this.arcChargeTicks.get(player.id) || 0) + 1;
    this.arcChargeTicks.set(player.id, currentTicks);

    const CHARGE_MAX = 20; // 1.0 秒 = 20 ticks
    const progress = Math.min(1.0, currentTicks / CHARGE_MAX);
    const percent = Math.floor(progress * 100);

    const filled = Math.min(10, Math.floor(progress * 10));
    const empty = 10 - filled;
    const bar = '§b' + '■'.repeat(filled) + '§8' + '□'.repeat(empty) + '§r';

    updateActionBar(player, `§e[特斯拉高压蓄能]§r ${bar} §b${percent}% ⚡§r §7(按住右键蓄满击发)§r`);

    try {
      const pLoc = player.location;
      const head = player.getHeadLocation();
      const view = player.getViewDirection();
      const muzzle = {
        x: head.x + view.x * 0.45,
        y: head.y + view.y * 0.45 - 0.08,
        z: head.z + view.z * 0.45
      };

      player.dimension.spawnParticle('test_gun:arc_spark', muzzle);
      if (currentTicks % 4 === 0) {
        player.dimension.spawnParticle('minecraft:endrod', muzzle);
        const pitch = 0.8 + (currentTicks / CHARGE_MAX) * 1.2;
        player.dimension.playSound('random.orb', pLoc, { volume: 0.7, pitch: pitch });
      }
    } catch {}

    // 蓄满 1.0 秒 (20 ticks) -> 释放高能电弧闪电
    if (currentTicks >= CHARGE_MAX) {
      this.arcChargeTicks.delete(player.id);

      const newAmmo = currentAmmo - 1;
      setCurrentAmmo(player, gun, newAmmo);

      this.deductDurability(player, gun);
      ArcEngine.fireArc(player, gun);
      RecoilManager.applyRecoil(player, gun);

      try {
        player.dimension.playSound('ambient.weather.thunder', player.location, { volume: 2.0, pitch: 1.1 });
        player.dimension.playSound('mob.ghast.fireball', player.location, { volume: 1.5, pitch: 1.4 });
      } catch {}

      showAmmoHUD(player, gun, newAmmo);
      this.playerCooldowns.set(player.id, gun.fireRate || 10);
      this.setTriggerState(player, false);
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

    // 0. 炸膛检测 (Misfire Malfunction)
    if (gun.misfireChance && Math.random() < gun.misfireChance) {
      this.deductDurability(player, gun);
      const pLoc = player.location;
      try {
        player.dimension.spawnParticle('minecraft:explosion_manual', {
          x: pLoc.x,
          y: pLoc.y + 1.2,
          z: pLoc.z
        });
        player.dimension.spawnParticle('minecraft:basic_flame_particle', {
          x: pLoc.x,
          y: pLoc.y + 1.2,
          z: pLoc.z
        });
        player.dimension.playSound('random.explode', pLoc, { volume: 1.5, pitch: 1.8 });
        player.applyDamage(6, { cause: EntityDamageCause.override });
        player.onScreenDisplay?.setActionBar?.('§c💥 危险! 【' + gun.name + '】发生炸膛反噬!§r');
      } catch {}
      this.playerCooldowns.set(player.id, 25);
      ReloadManager.startReload(player, gun);
      return;
    }

    this.deductDurability(player, gun);

    if (gun.isGrenadeLauncher) {
      GrenadeEngine.launchGrenade(player, gun);
    } else {
      fireBullet(player, gun);
    }

    RecoilManager.applyRecoil(player, gun);

    if (gun.shootSound) {
      try {
        player.dimension.playSound(gun.shootSound, player.location, {
          volume: 1.3,
          pitch: 0.95 + Math.random() * 0.1
        });
      } catch {}
    }

    showAmmoHUD(player, gun, newAmmo);
    this.playerCooldowns.set(player.id, gun.fireRate || 4);

    if (gun.mode === FireMode.SEMI) {
      this.setTriggerState(player, false);
    }
  }
}
