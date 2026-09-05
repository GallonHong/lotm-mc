import { ItemStack } from '@minecraft/server';
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
import { ArmorEngine } from './feature/armorEngine.js';
import { DamageHandler } from './feature/damageHandler.js';
import { getGunById } from './data/guns.js';

console.warn('=== [Test Guns 2D Addon] Initializing (Left-Click Reload + Shift-Right-Click ADS/Skill) ===');

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
    console.warn('=== [Test Guns 2D Addon] Loaded Successfully with ADS & Left-Click Reload ===');
  }

  registerEvents() {
        // 1. 【左键击打方块 (entityHitBlock) -> 立即触发手动换弹】
    subscribeAfter(world.afterEvents, 'entityHitBlock', (event) => {
      try {
        const player = event.damagingEntity;
        if (!player || player.typeId !== 'minecraft:player') return;

        const equ = player.getComponent('minecraft:equippable');
        const mainhand = equ?.getEquipment('Mainhand');
        if (mainhand) {
          const gun = getGunById(mainhand.typeId);
          if (gun) {
            ReloadManager.startReload(player, gun);
          }
        }
      } catch {}
    });

    // 1.2 【左键破坏方块拦截 -> 手动换弹】
    subscribeBefore(world.beforeEvents, 'playerBreakBlock', (event) => {
      try {
        const player = event.player;
        const item = event.itemStack;
        if (!player || !item) return;

        const gun = getGunById(item.typeId);
        if (gun) {
          event.cancel = true; // 阻止持枪破坏方块
          system.run(() => {
            ReloadManager.startReload(player, gun);
          });
        }
      } catch {}
    });

    // 2. 拦截 Shift + 右键点击方块 (防止放置或原版冲突)
    subscribeBefore(world.beforeEvents, 'playerInteractWithBlock', (event) => {
      try {
        const player = event.player;
        const item = event.itemStack;
        if (!player || !item) return;

        if (player.isSneaking && item.typeId === 'test_gun:ak47_commander') {
          event.cancel = true;
          system.run(() => {
            ArtilleryEngine.openMenu(player);
          });
        }
      } catch {}
    });

    // 3. 【右键单点 / 立即触发 (itemUse)】
    subscribeAfter(world.afterEvents, 'itemUse', (event) => {
      try {
        const player = event.source;
        const item = event.itemStack;
        if (!player || !item) return;

        // 近战武器技能
        if (item.typeId === 'test_gun:kukri_machete' || item.typeId === 'test_gun:katana') {
          MeleeEngine.handleSkillUse(player, item);
          return;
        }
        // 闪光防暴盾技能
        if (item.typeId === 'test_gun:flash_shield') {
          ShieldEngine.triggerFlash(player, item);
          return;
        }

        const gun = getGunById(item.typeId);
        if (gun) {
          if (player.isSneaking) {
            // Shift + 右键分支判定
            if (gun.id === 'test_gun:ak47_commander') {
              ArtilleryEngine.openMenu(player);
              ShootManager.setTriggerState(player, false);
            } else if (gun.hasSkill) {
              // 拥有专属主动技能的枪械 -> 释放战术技能
              SkillManager.tryActivateSkill(player, gun);
              ShootManager.setTriggerState(player, false);
            } else {
              // 无专属技能的常规枪械 -> 战术开镜射击 (ADS Aiming Precision Shot)
              ShootManager.setTriggerState(player, true);
              ShootManager.tick(player, gun);
            }
          } else {
            // 常规右键 -> 腰射击发
            ShootManager.setTriggerState(player, true);
            ShootManager.tick(player, gun);
          }
        }
      } catch (err) {
        console.warn('Error in itemUse:', err);
      }
    });

    // 4. 【右键长按连发 (itemStartUse)】
    subscribeAfter(world.afterEvents, 'itemStartUse', (event) => {
      try {
        const player = event.source;
        const item = event.itemStack;
        if (!player || !item) return;

        if (item.typeId === 'test_gun:kukri_machete' || item.typeId === 'test_gun:katana') {
          MeleeEngine.handleSkillUse(player, item);
          return;
        }

        const gun = getGunById(item.typeId);
        if (gun) {
          if (player.isSneaking) {
            if (gun.id === 'test_gun:ak47_commander') {
              ArtilleryEngine.openMenu(player);
              ShootManager.setTriggerState(player, false);
            } else if (gun.hasSkill) {
              SkillManager.tryActivateSkill(player, gun);
              ShootManager.setTriggerState(player, false);
            } else {
              // 开镜连发射击
              ShootManager.setTriggerState(player, true);
              ShootManager.tick(player, gun);
            }
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
      const player = event.source || event.player;
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
          ArmorEngine.handleHurt(hurtEntity, event.damageSource, event.damage);
        }
      } catch (err) {
        console.warn('Error in entityHurt:', err);
      }
    });

    // 5. 【左键攻击实体 -> 近战挥砍或手动换弹】
    subscribeAfter(world.afterEvents, 'entityHitEntity', (event) => {
      try {
        const player = event.damagingEntity;
        const hitEntity = event.hitEntity;
        if (player && player.typeId === 'minecraft:player') {
          const equ = player.getComponent('minecraft:equippable');
          const mainhand = equ?.getEquipment('Mainhand');

          if (mainhand) {
            const gun = getGunById(mainhand.typeId);
            if (gun) {
              // 持枪左键命中 -> 手动换弹
              ReloadManager.startReload(player, gun);
            } else {
              // 近战武器
              MeleeEngine.handleEntityHit(player, hitEntity);
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
      ArmorEngine.clearPlayer(event.playerId);
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
        if (this.auraTick % 10 === 0) {
          ArmorEngine.tick(player);
        }

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

// 聊天快捷指令系统 (!usas / !pkm / !rpk / !m1014)
let lastTgChatTick = new Map();
function handleTgCommand(player, rawText) {
  if (!player || !player.isValid()) return;
  const text = (rawText || '').trim().toLowerCase();

  const key = `${player.id}_${text}`;
  const now = system.currentTick;
  if (lastTgChatTick.has(key) && (now - lastTgChatTick.get(key) < 2)) return;
  lastTgChatTick.set(key, now);

  const inv = player.getComponent('minecraft:inventory');

  if (text === '!usas' || text === '!aa12') {
    try {
      inv?.container?.addItem(new ItemStack('test_gun:usas12', 1));
      inv?.container?.addItem(new ItemStack('test_gun:ammo_shotgun', 64));
      player.sendMessage('§d✔ 已获得 1 把【USAS-12 嗜血狂潮】与 64 发霰弹！§r');
    } catch (e) {
      player.sendMessage('§c获取失败: ' + e);
    }
  } else if (text === '!pkm' || text === '!mg') {
    try {
      inv?.container?.addItem(new ItemStack('test_gun:pkm', 1));
      inv?.container?.addItem(new ItemStack('test_gun:ammo_belt_100', 4));
      player.sendMessage('§5✔ 已获得 1 把【PKM 烈焰重机枪】与 400 发弹链箱！§r');
    } catch (e) {
      player.sendMessage('§c获取失败: ' + e);
    }
  } else if (text === '!rpk') {
    try {
      inv?.container?.addItem(new ItemStack('test_gun:rpk', 1));
      inv?.container?.addItem(new ItemStack('test_gun:ammo_rifle', 64));
      player.sendMessage('§9✔ 已获得 1 把【RPK 班用轻机枪】与 64 发步枪弹！§r');
    } catch (e) {
      player.sendMessage('§c获取失败: ' + e);
    }
  } else if (text === '!m1014' || text === '!ward') {
    try {
      inv?.container?.addItem(new ItemStack('test_gun:m1014_ward', 1));
      inv?.container?.addItem(new ItemStack('test_gun:ammo_shotgun', 64));
      player.sendMessage('§5✔ 已获得 1 把【M1014 泰坦壁垒】(护甲增伤喷) 与 64 发霰弹！§r');
    } catch (e) {
      player.sendMessage('§c获取失败: ' + e);
    }
  }
}

const beforeTgChat = world.beforeEvents ? world.beforeEvents.chatSend : undefined;
if (beforeTgChat && typeof beforeTgChat.subscribe === 'function') {
  beforeTgChat.subscribe((event) => {
    try {
      const msg = (event.message || '').trim().toLowerCase();
      if (['!usas', '!aa12', '!pkm', '!mg', '!rpk', '!m1014', '!ward'].some(k => msg.startsWith(k))) {
        event.cancel = true;
        const player = event.sender;
        system.run(() => handleTgCommand(player, msg));
      }
    } catch {}
  });
}

// 原版 /scriptevent 指令系统 (/scriptevent gun:pkm, /scriptevent gun:rpk, /scriptevent gun:m1014, /scriptevent gun:usas)
if (system.afterEvents?.scriptEventReceive) {
  system.afterEvents.scriptEventReceive.subscribe((event) => {
    try {
      const id = String(event.id || '').toLowerCase();
      const player = event.sourceEntity;
      if (!player || player.typeId !== 'minecraft:player') return;

      if (id === 'gun:pkm' || id === 'gun:mg') {
        system.run(() => handleTgCommand(player, '!pkm'));
      } else if (id === 'gun:rpk') {
        system.run(() => handleTgCommand(player, '!rpk'));
      } else if (id === 'gun:m1014' || id === 'gun:ward') {
        system.run(() => handleTgCommand(player, '!m1014'));
      } else if (id === 'gun:usas' || id === 'gun:aa12') {
        system.run(() => handleTgCommand(player, '!usas'));
      }
    } catch {}
  });
}
