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

class AddonController {
  constructor() {
    this.lastHeldItem = new Map();
    this.auraTick = 0;
    this.registerEvents();
    this.startGameLoop();
    console.warn('=== [Test Guns 2D Addon] Loaded Successfully with M82, Arc Emitter, Deagle, & Jetpack ===');
  }

  registerEvents() {
    subscribeAfter(world.afterEvents, 'itemStartUse', (event) => {
      const player = event.source;
      const item = event.itemStack;
      if (!player || !item) return;

      const gun = getGunById(item.typeId);
      if (gun) {
        if (player.isSneaking) {
          if (gun.hasSkill) {
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

    subscribeAfter(world.afterEvents, 'projectileHitEntity', (event) => {
      try {
        const projectile = event.projectile;
        const shooter = event.source;
        const hitInfo = typeof event.getEntityHit === 'function' ? event.getEntityHit() : undefined;
        const hitEntity = hitInfo ? hitInfo.entity : event.entity;
        const impactLocation = event.location;

        if (!hitEntity) return;
        if (typeof hitEntity.isValid === 'function' && !hitEntity.isValid()) return;
        if (shooter && hitEntity.id === shooter.id) return;

        let gun = undefined;
        if (projectile) {
          try {
            if (typeof projectile.isValid !== 'function' || projectile.isValid()) {
              const tags = projectile.getTags ? projectile.getTags() : [];
              for (const t of tags || []) {
                if (typeof t === 'string' && t.startsWith('tg_weapon:')) {
                  const parts = t.split(':');
                  gun = getGunById(parts[1] + ':' + parts[2]);
                  break;
                }
              }
            }
          } catch {}

          if (!gun) {
            try {
              gun = getGunByProjectile(projectile.typeId);
            } catch {}
          }
        }

        if (!gun && shooter) {
          try {
            const held = getHeldGun(shooter);
            if (held) gun = held.gun;
          } catch {}
        }
      } catch (err) {
        console.warn('Error in projectileHitEntity:', err);
      }
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
