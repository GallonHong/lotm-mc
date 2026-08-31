import { GunRegistry } from "./GunRegistry.js";
import { FireScheduler } from "./FireScheduler.js";
import { AmmoManager } from "./AmmoManager.js";
import { ReloadManager } from "./ReloadManager.js";
import { HitResolver } from "./HitResolver.js";
import { FirearmDamageResolver } from "./FirearmDamageResolver.js";
import { GunDurabilityManager } from "./GunDurabilityManager.js";
import { GunAnimationBridge } from "./GunAnimationBridge.js";
import { WeaponCraftingManager } from "./WeaponCraftingManager.js";
import { system, world } from "@minecraft/server";

/**
 * 枪械总控制器。
 * Molang 玩家状态机负责把真实的使用键按下/松开状态传入脚本。
 * 自动枪只在 trigger_down 与 trigger_up 之间连射；半自动枪必须松开后才能再次击发。
 */
export class GunController {
  static #playerSlotTracker = new Map();
  static #playerGunTracker = new Map();
  static #playerAnimationTracker = new Map();
  static #activeTriggers = new Map();
  static #triggerLatches = new Set();

  static handleTriggerStart(event) {
    const player = event?.source;
    const eventItem = event?.itemStack;
    if (!player || !player.isValid()) return false;
    if (this.#triggerLatches.has(player.id)) return false;

    const inv = player.getComponent("minecraft:inventory");
    if (!inv?.container) return false;
    const slot = player.selectedSlotIndex;
    const heldItem = inv.container.getItem(slot);
    const gunDef = eventItem
      ? GunRegistry.getGun(eventItem.typeId)
      : (heldItem ? GunRegistry.getGun(heldItem.typeId) : null);
    if (!gunDef) return false;
    if (!heldItem || heldItem.typeId !== gunDef.id) return false;

    // 一次按下只建立一个锁。半自动必须等 trigger_up 清锁后才能再次击发。
    this.#triggerLatches.add(player.id);
    if (gunDef.fireMode !== "auto") return this.#firePulse(player, gunDef);

    const item = heldItem;

    FireScheduler.reset(player.id);
    if (FireScheduler.requestHeldShots(player.id, gunDef, system.currentTick) < 1
        || !this.#fireOneShot(player, inv.container, slot, item, gunDef)) return false;
    this.#playerSlotTracker.set(player.id, slot);
    this.#playerGunTracker.set(player.id, gunDef.id);
    this.#activeTriggers.set(player.id, {
      gunId: gunDef.id,
      slot,
      startTick: system.currentTick,
      maxTicks: Math.min(60, Math.ceil(gunDef.magazineSize * 1200 / gunDef.rpm) + 2)
    });
    return true;
  }

  static handleTriggerStop(event) {
    const player = event?.source;
    if (!player) return false;
    const existed = this.#activeTriggers.delete(player.id);
    const latched = this.#triggerLatches.delete(player.id);
    FireScheduler.reset(player.id);
    return existed || latched;
  }
  static #firePulse(player, gunDef) {
    if (!player || !player.isValid() || !gunDef || ReloadManager.isReloading(player.id)) return false;

    const inv = player.getComponent("minecraft:inventory");
    if (!inv?.container) return false;
    const slot = player.selectedSlotIndex;
    const item = inv.container.getItem(slot);
    if (!item || item.typeId !== gunDef.id) return false;

    if (FireScheduler.requestPulseShot(player.id, gunDef, system.currentTick) < 1) return false;
    return this.#fireOneShot(player, inv.container, slot, item, gunDef);
  }

  /** 普通 itemUse 只保留工作台入口，枪械由 Molang 状态机驱动。 */
  static handleItemUse(event) {
    const player = event.source;
    const item = event.itemStack;
    if (!player || !player.isValid() || !item) return;
    if (item.typeId === "survival:gun_workbench") {
      system.run(() => WeaponCraftingManager.openWorkbenchUI(player));
      return;
    }
  }

  static requestReload(player) {
    if (!player || !player.isValid()) return false;
    const inv = player.getComponent("minecraft:inventory");
    if (!inv?.container) return false;
    const slot = player.selectedSlotIndex;
    const item = inv.container.getItem(slot);
    const gunDef = item ? GunRegistry.getGun(item.typeId) : null;
    if (!item || !gunDef) return false;
    const started = ReloadManager.startReload(player, item, gunDef, system.currentTick, slot);
    if (started) this.handleTriggerStop({ source: player });
    return started;
  }

  /** 每 tick 只处理换弹、切枪表现与 HUD，不再推进持续开火状态。 */
  static onTick() {
    const currentTick = system.currentTick;
    const allPlayers = world.getAllPlayers();
    const playerMap = new Map(allPlayers.map((player) => [player.id, player]));
    ReloadManager.update(currentTick, (id) => playerMap.get(id));

    for (const player of allPlayers) {
      if (!player || !player.isValid()) continue;
      const inv = player.getComponent("minecraft:inventory");
      if (!inv?.container) continue;

      const currentSlot = player.selectedSlotIndex;
      const mainItem = inv.container.getItem(currentSlot);
      const currentGunId = mainItem && GunRegistry.isGun(mainItem.typeId) ? mainItem.typeId : null;
      const lastSlot = this.#playerSlotTracker.get(player.id);
      const lastGunId = this.#playerGunTracker.get(player.id) ?? null;

      if (lastSlot !== currentSlot || lastGunId !== currentGunId) {
        this.#playerSlotTracker.set(player.id, currentSlot);
        this.#playerGunTracker.set(player.id, currentGunId);
        this.#playerAnimationTracker.delete(player.id);
        FireScheduler.reset(player.id);
        this.#activeTriggers.delete(player.id);
        this.#triggerLatches.delete(player.id);
        if (currentGunId) GunAnimationBridge.playEquip(player, GunRegistry.getGun(currentGunId));
      }

      if (!mainItem || !currentGunId) continue;
      const gunDef = GunRegistry.getGun(currentGunId);
      if (!gunDef) continue;

      const trigger = this.#activeTriggers.get(player.id);
      if (trigger) this.#updateHeldTrigger(player, inv.container, trigger, gunDef, currentTick);

      const animationState = player.isSwimming
        ? "swim"
        : (player.isSprinting ? "sprint" : (player.isSneaking ? "ads" : "idle"));
      if (this.#playerAnimationTracker.get(player.id) !== animationState) {
        this.#playerAnimationTracker.set(player.id, animationState);
        GunAnimationBridge.playState(player, gunDef, animationState);
      }
      this.#updatePlayerHud(player, mainItem, gunDef, currentTick);
    }
  }

  static resetPlayer(playerId) {
    FireScheduler.reset(playerId);
    this.#playerSlotTracker.delete(playerId);
    this.#playerGunTracker.delete(playerId);
    this.#playerAnimationTracker.delete(playerId);
    this.#activeTriggers.delete(playerId);
    this.#triggerLatches.delete(playerId);
  }

  static #updateHeldTrigger(player, container, trigger, gunDef, currentTick) {
    if (trigger.gunId !== gunDef.id || trigger.slot !== player.selectedSlotIndex || ReloadManager.isReloading(player.id)) {
      this.handleTriggerStop({ source: player });
      return;
    }
    if (currentTick - trigger.startTick >= trigger.maxTicks) {
      this.handleTriggerStop({ source: player });
      try { player.onScreenDisplay?.setActionBar?.("§e单次长按已打完一弹匣，请松开后再次按下"); } catch {}
      return;
    }

    const shots = FireScheduler.requestHeldShots(player.id, gunDef, currentTick);
    for (let shot = 0; shot < shots; shot++) {
      const item = container.getItem(trigger.slot);
      if (!item || item.typeId !== gunDef.id || !this.#fireOneShot(player, container, trigger.slot, item, gunDef)) {
        this.handleTriggerStop({ source: player });
        return;
      }
    }
  }

  static #fireOneShot(player, container, slotIndex, itemStack, gunDef) {
    if (GunDurabilityManager.isBroken(itemStack, gunDef)) {
      GunAnimationBridge.playDryFire(player);
      player.onScreenDisplay?.setActionBar?.("§4✖ 武器已损坏，无法击发！");
      return false;
    }

    if (AmmoManager.getMagazineAmmo(itemStack, gunDef) <= 0) {
      GunAnimationBridge.playDryFire(player);
      this.handleTriggerStop({ source: player });
      ReloadManager.startReload(player, itemStack, gunDef, system.currentTick, slotIndex);
      return false;
    }

    AmmoManager.consumeMagazineAmmo(itemStack, gunDef, 1);
    GunDurabilityManager.deductDurability(itemStack, gunDef, gunDef.durabilityPerShot);
    container.setItem(slotIndex, itemStack);

    const pelletCount = gunDef.pellets ?? 1;
    for (let pellet = 0; pellet < pelletCount; pellet++) {
      const hitResult = HitResolver.castShot(player, gunDef, player.isSneaking);
      if (pellet === 0) {
        GunAnimationBridge.playShootEffects(player, gunDef, hitResult.muzzleLocation, hitResult.hitLocation);
      }
      if (hitResult.hit && hitResult.target) {
        GunAnimationBridge.playHitEffects(player, hitResult);
        FirearmDamageResolver.applyDamage(player, hitResult.target, gunDef, hitResult);
      } else if (hitResult.hitType === "block") {
        GunAnimationBridge.spawnImpactEffects(player.dimension, hitResult.hitLocation, false);
      }
    }
    return true;
  }

  static #updatePlayerHud(player, itemStack, gunDef, currentTick) {
    const reloadState = ReloadManager.getReloadState(player.id);
    const magAmmo = AmmoManager.getMagazineAmmo(itemStack, gunDef);
    const reserveAmmo = AmmoManager.countInventoryAmmo(player, gunDef.ammoType);
    const durability = GunDurabilityManager.getDurability(itemStack, gunDef);
    const durabilityPercent = Math.round((durability / gunDef.durabilityMax) * 100);

    let text;
    if (reloadState) {
      const seconds = (Math.max(0, reloadState.finishTick - currentTick) / 20).toFixed(1);
      text = `§l§e${gunDef.name}§r §7| §6🔄 换弹 ${seconds}s §7| 备弹: §f${reserveAmmo}`;
    } else {
      const ammoColor = magAmmo <= 0 ? "§c" : (magAmmo <= Math.ceil(gunDef.magazineSize * 0.3) ? "§e" : "§b");
      const durabilityText = durability <= 0 ? "§4✖ 已损坏" : (durabilityPercent <= 20 ? `§c⚠ ${durabilityPercent}%` : `§a${durabilityPercent}%`);
      text = `§l§f${gunDef.name}§r §7| ${ammoColor}${magAmmo} §7/ §f${reserveAmmo} §7| 耐久: ${durabilityText}`;
    }
    try { player.onScreenDisplay?.setActionBar?.(text); } catch {}
  }
}
