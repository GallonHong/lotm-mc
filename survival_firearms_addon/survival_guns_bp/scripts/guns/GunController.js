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
 * 开火意图不再保存在 JavaScript 循环中：行为包动画控制器每次仅在
 * q.is_using_item 仍为真时发送一发 survival:fire。
 */
export class GunController {
  static #playerSlotTracker = new Map();
  static #playerGunTracker = new Map();
  static #playerAnimationTracker = new Map();

  /** 服务端重新校验 Molang 发出的单发请求，客户端不能指定伤害或目标。 */
  static handleMolangFire(player, requestedGunName = "") {
    if (!player || !player.isValid()) return false;
    const gunId = `survival:${String(requestedGunName).trim().toLowerCase()}`;
    const gunDef = GunRegistry.getGun(gunId);
    if (!gunDef) return false;

    const inv = player.getComponent("minecraft:inventory");
    if (!inv?.container) return false;
    const slot = player.selectedSlotIndex;
    const item = inv.container.getItem(slot);
    if (!item || item.typeId !== gunId) return false;

    const shots = FireScheduler.requestMolangShots(player.id, gunDef, system.currentTick);
    // 即使正在换弹，也先记录本 tick 的使用心跳；这样异常的持续使用
    // 状态不会在换弹结束后被误判为一次全新的按压。
    if (ReloadManager.isReloading(player.id)) return false;
    if (shots < 1) return false;
    for (let shot = 0; shot < shots; shot++) {
      const currentItem = inv.container.getItem(slot);
      if (!currentItem || currentItem.typeId !== gunId) break;
      this.#fireOneShot(player, inv.container, slot, currentItem, gunDef);
    }
    return true;
  }

  /** 普通物品使用事件仅保留便携测试菜单，不再作为枪械扳机。 */
  static handleItemUse(event) {
    const player = event.source;
    const item = event.itemStack;
    if (!player || !player.isValid() || !item) return;
    if (item.typeId === "survival:gun_workbench") {
      system.run(() => WeaponCraftingManager.openWorkbenchUI(player));
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
    if (started) FireScheduler.blockUntilRelease(player.id);
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
        if (currentGunId) GunAnimationBridge.playEquip(player, GunRegistry.getGun(currentGunId));
      }

      if (!mainItem || !currentGunId) continue;
      const gunDef = GunRegistry.getGun(currentGunId);
      if (!gunDef) continue;

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
  }

  static #fireOneShot(player, container, slotIndex, itemStack, gunDef) {
    if (GunDurabilityManager.isBroken(itemStack, gunDef)) {
      GunAnimationBridge.playDryFire(player);
      player.onScreenDisplay?.setActionBar?.("§4✖ 武器已损坏，无法击发！");
      return;
    }

    if (AmmoManager.getMagazineAmmo(itemStack, gunDef) <= 0) {
      GunAnimationBridge.playDryFire(player);
      FireScheduler.blockUntilRelease(player.id);
      ReloadManager.startReload(player, itemStack, gunDef, system.currentTick, slotIndex);
      return;
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
