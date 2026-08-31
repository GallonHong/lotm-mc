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
 * 每个 itemUse 脉冲只结算一发；不保存扳机状态，不启动自动射击循环。
 */
export class GunController {
  static #playerSlotTracker = new Map();
  static #playerGunTracker = new Map();
  static #playerAnimationTracker = new Map();
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

  /** 参考开源 Bedrock 枪械实现：一次物品使用事件只请求一发。 */
  static handleItemUse(event) {
    const player = event.source;
    const item = event.itemStack;
    if (!player || !player.isValid() || !item) return;
    if (item.typeId === "survival:gun_workbench") {
      system.run(() => WeaponCraftingManager.openWorkbenchUI(player));
      return;
    }
    const gunDef = GunRegistry.getGun(item.typeId);
    if (gunDef) this.#firePulse(player, gunDef);
  }

  static requestReload(player) {
    if (!player || !player.isValid()) return false;
    const inv = player.getComponent("minecraft:inventory");
    if (!inv?.container) return false;
    const slot = player.selectedSlotIndex;
    const item = inv.container.getItem(slot);
    const gunDef = item ? GunRegistry.getGun(item.typeId) : null;
    if (!item || !gunDef) return false;
    return ReloadManager.startReload(player, item, gunDef, system.currentTick, slot);
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
      return false;
    }

    if (AmmoManager.getMagazineAmmo(itemStack, gunDef) <= 0) {
      GunAnimationBridge.playDryFire(player);
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
