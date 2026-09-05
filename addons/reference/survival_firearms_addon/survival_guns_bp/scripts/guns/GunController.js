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
 * 原生 itemStart/Stop/Release 负责输入生命周期，Molang 玩家状态机负责
 * 在真实按住期间发送逐次 trigger_pulse。脚本不维护后台自动开火循环，
 * 因此即使 Bedrock 漏报松键事件，也不会在没有新脉冲时继续射击。
 */
export class GunController {
  static #playerSlotTracker = new Map();
  static #playerGunTracker = new Map();
  static #playerAnimationTracker = new Map();
  static #triggerSessions = new Map();

  static handleTriggerBegin(event) {
    const player = event?.source;
    if (!player || !player.isValid()) return false;
    // 新一次按压总会清理可能因旧版或漏报松键留下的会话。
    this.#triggerSessions.delete(player.id);
    FireScheduler.reset(player.id);
    return true;
  }

  static handleTriggerPulse(event) {
    const player = event?.source;
    if (!player || !player.isValid()) return false;

    const inv = player.getComponent("minecraft:inventory");
    if (!inv?.container) return false;
    const slot = player.selectedSlotIndex;
    const item = inv.container.getItem(slot);
    const gunDef = item ? GunRegistry.getGun(item.typeId) : null;
    if (!item || !gunDef || ReloadManager.isReloading(player.id)) return false;

    let session = this.#triggerSessions.get(player.id);
    if (!session) {
      session = {
        gunId: gunDef.id,
        slot,
        startTick: system.currentTick,
        shotsFired: 0,
        blocked: false,
        maxTicks: Math.min(60, Math.ceil(gunDef.magazineSize * 1200 / Math.max(1, gunDef.rpm)) + 2)
      };
      this.#triggerSessions.set(player.id, session);
    }

    if (session.blocked || session.gunId !== gunDef.id || session.slot !== slot) return false;
    if (system.currentTick - session.startTick >= session.maxTicks) {
      session.blocked = true;
      FireScheduler.reset(player.id);
      return false;
    }

    // 半自动/泵动一次按压只接受首个脉冲；自动枪按 RPM 消化每个实时脉冲。
    if (gunDef.fireMode !== "auto" && session.shotsFired > 0) return false;
    const requested = gunDef.fireMode === "auto"
      ? FireScheduler.requestHeldShots(player.id, gunDef, system.currentTick)
      : FireScheduler.requestPulseShot(player.id, gunDef, system.currentTick);
    if (requested < 1) return false;

    for (let shot = 0; shot < requested; shot++) {
      const currentItem = inv.container.getItem(slot);
      if (!currentItem || currentItem.typeId !== gunDef.id
          || !this.#fireOneShot(player, inv.container, slot, currentItem, gunDef)) {
        session.blocked = true;
        FireScheduler.reset(player.id);
        return false;
      }
      session.shotsFired += 1;
    }
    return true;
  }

  static handleTriggerStop(event) {
    const player = event?.source;
    if (!player) return false;
    const existed = this.#triggerSessions.delete(player.id);
    FireScheduler.reset(player.id);
    return existed;
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
        this.#triggerSessions.delete(player.id);
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
    this.#triggerSessions.delete(playerId);
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
