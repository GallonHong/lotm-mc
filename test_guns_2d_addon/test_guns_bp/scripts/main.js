import { MeleeEngine } from './feature/meleeEngine.js';
import { ArtilleryEngine } from './feature/artilleryEngine.js';
import { ShieldEngine } from './feature/shieldEngine.js';
import { RocketEngine } from './feature/rocketEngine.js';
import { world, system } from '@minecraft/server';
import { getHeldGun, getCurrentAmmo } from './feature/utils/gunUtils.js';
import { showAmmoHUD } from './feature/ui.js';
import { ShootManager } from './feature/shoot.js';
import { ReloadManager } from './feature/reload.js';
import { SkillManager } from './feature/skillManager.js';
import { GrenadeEngine } from './feature/grenadeEngine.js';
import { JetpackEngine } from './feature/jetpackEngine.js';
import { DamageHandler } from './feature/damageHandler.js';
import { getGunById, getGunByProjectile } from './data/guns.js';

console.warn('=== [Test Guns 2D Addon] Initializing (Full Apex Arsenal & Jetpack) ===');

function subscribeAfter(eventsObj, eventName, handler) {
  try {
    const signal = eventsObj ? eventsObj[eventName] : undefined;
    if (signal && typeof signal.subscribe === 'function') {
      signal.subscribe(handler);
      return true;
    }
  } catch (err) {
    console.warn('Cannot subscribe to ' + eventName + ':', err);
  }
  return false;
}

function subscribeBefore(eventsObj, eventName, handler) {
  try {
    const signal = eventsObj ? eventsObj[eventName] : undefined;
    if (signal && typeof signal.subscribe === 'function') {
      signal.subscribe(handler);
      return true;
    }
  } catch (err) {
    console.warn('Cannot subscribe to beforeEvent ' + eventName + ':', err);
  }
  return false;
}

class AddonController {
  constructor() {
    this.lastHeldItem = new Map();
    this.auraTick = 0;
    this.registerEvents();
    this.startGameLoop();
    console.warn('=== [Test Guns 2D Addon] Loaded Successfully with M82, Arc Emitter, Deagle, & Jetpack ===');
  }

  registerEvents() {
    // 1. 拦截 Shift + 左键 (破坏方块)，阻断破损并弹出 SAPI 战术空袭菜单
    subscribeBefore(world.beforeEvents, 'playerBreakBlock', (event) => {
      try {
        const player = event.player;
        if (player && player.isSneaking) {
          const item = event.itemStack;
          if (item && item.typeId === 'test_gun:ak47_commander') {
            event.cancel = true;
            system.run(() => {
              ArtilleryEngine.openMenu(player);
            });
          }
        }
      } catch {}
    });

    // 2. 拦截 Shift + 右键点击方块
    subscribeBefore(world.beforeEvents, 'playerInteractWithBlock', (event) => {
      try {
        const player = event.player;
        if (player && player.isSneaking) {
          const item = event.itemStack;
          if (item && item.typeId === 'test_gun:ak47_commander') {
            event.cancel = true;
            system.run(() => {
              ArtilleryEngine.openMenu(player);
            });
          }
        }
      } catch {}
    });

    // 3. 立即点击触发 (itemUse) - 单点、半自动与潜行技能触发
    subscribeAfter(world.afterEvents, 'itemUse', (event) => {
      try {
        const player = event.source;
        const item = event.itemStack;
        if (!player || !item) return;

              if (item.typeId === 'test_gun:kukri_machete' || item.typeId === 'test_gun:katana') {
        MeleeEngine.handleSkillUse(player, item);
        return;
      }
      if (item.typeId === 'test_gun:flash_shield') {
          ShieldEngine.triggerFlash(player, item);
          return;
        }

        const gun = getGunById(item.typeId);
        if (gun) {
          if (player.isSneaking) {
            if (gun.id === 'test_gun:ak47_commander') {
              ArtilleryEngine.openMenu(player);
            } else if (gun.hasSkill) {
              SkillManager.tryActivateSkill(player, gun);
            } else {
              ReloadManager.startReload(player, gun);
            }
            ShootManager.setTriggerState(player, false);
          } else {
            ShootManager.setTriggerState(player, true);
            ShootManager.tick(player, gun);
          }
        }
      } catch (err) {
        console.warn('Error in itemUse:', err);
      }
    });

    // 4. 长按按住触发 (itemStartUse) - 全自动武器按住连射
    subscribeAfter(world.afterEvents, 'itemStartUse', (event) => {
      try {
        const player = event.source;
        const item = event.itemStack;
        if (!player || !item) return;

        const gun = getGunById(item.typeId);
        if (gun) {
          if (player.isSneaking) {
            if (gun.id === 'test_gun:ak47_commander') {
              ArtilleryEngine.openMenu(player);
            } else if (gun.hasSkill) {
              SkillManager.tryActivateSkill(player, gun);
            } else {
              ReloadManager.startReload(player, gun);
            }
            ShootManager.setTriggerState(player, false);
          } else {
            ShootManager.setTriggerState(player, true);
            ShootManager.tick(player, gun);
          }
        }
      } catch (err) {
        console.warn('Error in itemStartUse:', err);
      }
    });

    const stopTrigger = (event) => {
      const player = event.source;
      if (player) {
        ShootManager.setTriggerState(player, false);
      }
    };

    subscribeAfter(world.afterEvents, 'itemStopUse', stopTrigger);
    subscribeAfter(world.afterEvents, 'itemReleaseUse', stopTrigger);
    subscribeAfter(world.afterEvents, 'itemStopUseOn', stopTrigger);

    subscribeAfter(world.afterEvents, 'entityHurt', (event) => {
      try {
        const hurtEntity = event.hurtEntity;
        if (hurtEntity && hurtEntity.typeId === 'minecraft:player') {
          ShieldEngine.handleDamageReduction(hurtEntity, event.damageSource, event.damage);
        }
      } catch (err) {
        console.warn('Error in entityHurt:', err);
      }
    });

    // 5. 命中实体时触发近战攻击 (背刺/破盾/破甲/真·横扫之刃) 与 AK 指挥官菜单
    subscribeAfter(world.afterEvents, 'entityHitEntity', (event) => {
      try {
        const player = event.damagingEntity;
        const hitEntity = event.hitEntity;
        if (player && player.typeId === 'minecraft:player') {
          // 近战武器特性
          MeleeEngine.handleEntityHit(player, hitEntity);

          if (player.isSneaking) {
            const equ = player.getComponent('minecraft:equippable');
            const mainhand = equ?.getEquipment('Mainhand');
            if (mainhand && mainhand.typeId === 'test_gun:ak47_commander') {
              system.run(() => {
                ArtilleryEngine.openMenu(player);
              });
            }
          }
        }
      } catch {}
    });

    subscribeAfter(world.afterEvents, 'playerLeave', (event) => {
      ShootManager.playerShooting.delete(event.playerId);
      ShootManager.playerCooldowns.delete(event.playerId);
      ReloadManager.reloadingPlayers.delete(event.playerId);
      SkillManager.clearPlayer(event.playerId);
      JetpackEngine.playerJumpStates.delete(event.playerId);
      this.lastHeldItem.delete(event.playerId);
    });
  }

  startGameLoop() {
    system.runInterval(() => {
      this.auraTick++;
      GrenadeEngine.onTick();
      RocketEngine.onTick();
      ShieldEngine.tick();
      ArtilleryEngine.tick();
      JetpackEngine.onTick();

      const players = world.getAllPlayers();
      for (const player of players) {
        const held = getHeldGun(player);
        const lastItemId = this.lastHeldItem.get(player.id);
        const currentItemId = held ? held.item.typeId : null;

        if (lastItemId !== currentItemId) {
          this.lastHeldItem.set(player.id, currentItemId);
          ShootManager.setTriggerState(player, false);
          ReloadManager.cancelReload(player);

          if (held) {
            const ammo = getCurrentAmmo(player, held.gun);
            if (!SkillManager.isOverdriveActive(player)) {
              showAmmoHUD(player, held.gun, ammo);
            }
          }
        }

        if (held) {
          ShootManager.tick(player, held.gun);
        }

        SkillManager.tick(player, held ? held.gun : null);
      }
    }, 1);
  }
}

new AddonController();
