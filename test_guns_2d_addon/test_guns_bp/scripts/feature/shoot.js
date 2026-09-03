import { RocketEngine } from './rocketEngine.js';
import { RecoilManager } from './recoilManager.js';
import { getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { fireBullet } from './utils/shootUtils.js';
import { GrenadeEngine } from './grenadeEngine.js';
import { ArcEngine } from './arcEngine.js';
import { showAmmoHUD, showOutOfAmmoHUD, updateActionBar } from './ui.js';
import { ReloadManager } from './reload.js';
import { SkillManager } from './skillManager.js';
import { FireMode } from '../data/types.js';
import { EquipmentSlot, EntityDamageCause, system } from '@minecraft/server';

export class ShootManager {
  static playerCooldowns = new Map();
  static playerShooting = new Map();
  static playerLastUseTick = new Map(); // playerId -> system.currentTick
  static arcChargeTicks = new Map(); // playerId -> number (0 ~ 20 ticks)

  static setTriggerState(player, isDown) {
    if (!player) return;
    this.playerShooting.set(player.id, isDown);
    if (isDown) {
      this.playerLastUseTick.set(player.id, system.currentTick);
    } else {
      this.playerLastUseTick.delete(player.id);
      const charge = this.arcChargeTicks.get(player.id) || 0;
      if (charge > 0 && charge < 8) {
        this.arcChargeTicks.delete(player.id);
        updateActionBar(player, '§7[⚡ 蓄能中断 / Charge Cancelled]§r');
      }
    }
  }

  static refreshTriggerHeartbeat(player) {
    if (!player) return;
    this.playerShooting.set(player.id, true);
    this.playerLastUseTick.set(player.id, system.currentTick);
  }

  static isTriggerDown(player, gun) {
    if (!player || !this.playerShooting.get(player.id)) return false;

    // 心跳看门狗超时检测 (Watchdog Timeout)
    // 超过 8 个 ticks (0.4秒) 未收到基岩版长按更新事件，判定为松开或事件丢失，强制熔断停火
    const lastTick = this.playerLastUseTick.get(player.id) || 0;
    const currentTick = system.currentTick;
    const timeoutThreshold = (gun?.fireRate ? Math.max(gun.fireRate + 4, 8) : 8);

    if (currentTick - lastTick > timeoutThreshold) {
      this.setTriggerState(player, false);
      return false;
    }
    return true;
  }

  static clearPlayer(player) {
    if (!player) return;
    const pId = typeof player === 'string' ? player : player.id;
    this.playerShooting.delete(pId);
    this.playerCooldowns.delete(pId);
    this.playerLastUseTick.delete(pId);
    this.arcChargeTicks.delete(pId);
  }

  static playerShotCounts = new Map();

  static deductDurability(player, gun) {
    if (!player || !player.isValid() || !gun) return;
    try {
      const equippable = player.getComponent('minecraft:equippable');
      if (!equippable) return;

      const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
      if (!mainhand || mainhand.typeId !== gun.id) return;

      const durComp = mainhand.getComponent('minecraft:durability');
      if (!durComp) return;

      const count = (this.playerShotCounts.get(player.id) || 0) + 1;
      this.playerShotCounts.set(player.id, count);

      const currentDamage = durComp.damage || 0;
      const maxDur = durComp.maxDurability || 500;

      // 仅在累计射击 6 发子弹，或即将损坏时才触发 setEquipment，避免频繁重置右键长按动画
      if (count >= 6 || (currentDamage + count >= maxDur)) {
        this.playerShotCounts.set(player.id, 0);
        const nextDamage = currentDamage + count;

        if (nextDamage >= maxDur) {
          equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
          player.dimension.playSound('random.break', player.location, { volume: 1.2, pitch: 0.85 });
          player.onScreenDisplay?.setActionBar?.(`§c⚠ 你的【${gun.name}】已磨损报废!§r`);
        } else {
          durComp.damage = nextDamage;
          equippable.setEquipment(EquipmentSlot.Mainhand, mainhand);
        }
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

    if (!this.isTriggerDown(player, gun)) {
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

    // 关键修复：长按蓄力期间持续刷新看门狗心跳，杜绝超时误杀导致的“一直蓄力中断”！
    this.refreshTriggerHeartbeat(player);

    const currentTicks = (this.arcChargeTicks.get(player.id) || 0) + 1;
    this.arcChargeTicks.set(player.id, currentTicks);

    const CHARGE_MAX = 8; // 蓄力时长从 20 刻 (1.0秒) 缩减至 8 刻 (0.4秒) 迅捷蓄能
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
      if (currentTicks % 2 === 0) {
        player.dimension.spawnParticle('minecraft:endrod', muzzle);
        const pitch = 0.9 + (currentTicks / CHARGE_MAX) * 1.1;
        player.dimension.playSound('random.orb', pLoc, { volume: 0.7, pitch: pitch });
      }
    } catch {}

    // 蓄满 0.4 秒 (8 ticks) -> 释放高能电弧闪电
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

    if (gun.isRocketLauncher) {
      RocketEngine.launchRocket(player, gun);
    } else if (gun.isGrenadeLauncher) {
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

    // 持续长按连发时，每次击发成功均自动延续看门狗心跳（避免长按被误熔断）
    this.refreshTriggerHeartbeat(player);

    showAmmoHUD(player, gun, newAmmo);
    this.playerCooldowns.set(player.id, gun.fireRate || 4);

    if (gun.mode === FireMode.SEMI) {
      this.setTriggerState(player, false);
    }
  }
}
