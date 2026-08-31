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
 * 枪械总控制器 (GunController)
 * 职责：
 * 1. 统一处理玩家开火、换弹、瞄准 (ADS) 输入事件
 * 2. 严格遵循：按住右键开火，松开立即停火
 * 3. 统一调度 20 TPS 主循环 (FireScheduler, ReloadManager, HUD 状态显示)
 */
export class GunController {
  // 追踪玩家上一 tick 手持的槽位与武器
  static #playerSlotTracker = new Map();

  /**
   * 玩家开始使用物品 (按住右键)
   */
  static handleItemStartUse(event) {
    const player = event.source;
    const item = event.itemStack;
    if (!player || !player.isValid() || !item) return;

    // 工作台
    if (item.typeId === "survival:gun_workbench") {
      system.run(() => WeaponCraftingManager.openWorkbenchUI(player));
      return;
    }

    if (!GunRegistry.isGun(item.typeId)) return;
    const gunDef = GunRegistry.getGun(item.typeId);
    if (!gunDef) return;

    // 潜行右键 -> 换弹
    if (player.isSneaking) {
      if (!ReloadManager.isReloading(player.id)) {
        ReloadManager.startReload(player, item, gunDef, system.currentTick, player.selectedSlotIndex);
      }
      return;
    }

    // 按下扳机
    FireScheduler.pressTrigger(player.id);

    // 半自动与泵动模式：按下瞬间立即结算第 1 发
    if (gunDef.fireMode === "semi" || gunDef.fireMode === "pump") {
      const inv = player.getComponent("minecraft:inventory");
      if (inv && inv.container) {
        const slot = player.selectedSlotIndex;
        const mainItem = inv.container.getItem(slot);
        if (mainItem && mainItem.typeId === gunDef.id && !ReloadManager.isReloading(player.id)) {
          const shots = FireScheduler.updateAndGetShots(player.id, gunDef, system.currentTick);
          for (let i = 0; i < shots; i++) {
            this.#fireOneShot(player, inv.container, slot, mainItem, gunDef);
          }
        }
      }
    }
  }

  /**
   * 玩家使用物品
   */
  static handleItemUse(event) {
    this.handleItemStartUse(event);
  }

  /**
   * 玩家松开右键 / 释放物品
   */
  static handleItemReleaseUse(event) {
    const player = event.source;
    if (!player || !player.isValid()) return;
    FireScheduler.releaseTrigger(player.id);
  }

  /**
   * 玩家停止使用物品
   */
  static handleItemStopUse(event) {
    const player = event.source;
    if (!player || !player.isValid()) return;
    FireScheduler.releaseTrigger(player.id);
  }

  /**
   * 全局主循环 (每 tick 调度，20 TPS)
   */
  static onTick() {
    const currentTick = system.currentTick;
    const allPlayers = world.getAllPlayers();
    const playerMap = new Map();
    for (const p of allPlayers) {
      playerMap.set(p.id, p);
    }

    // 1. 更新换弹状态机
    ReloadManager.update(currentTick, (id) => playerMap.get(id));

    // 2. 遍历所有在线玩家
    for (const player of allPlayers) {
      if (!player || !player.isValid()) continue;

      const inv = player.getComponent("minecraft:inventory");
      if (!inv || !inv.container) continue;

      const currentSlot = player.selectedSlotIndex;
      const mainItem = inv.container.getItem(currentSlot);

      // 切槽位检测
      const lastSlot = this.#playerSlotTracker.get(player.id);
      if (lastSlot !== currentSlot) {
        this.#playerSlotTracker.set(player.id, currentSlot);
        FireScheduler.releaseTrigger(player.id);
        if (mainItem && GunRegistry.isGun(mainItem.typeId)) {
          GunAnimationBridge.playDrawSound(player);
        }
      }

      if (!mainItem || !GunRegistry.isGun(mainItem.typeId)) {
        FireScheduler.releaseTrigger(player.id);
        continue;
      }

      const gunDef = GunRegistry.getGun(mainItem.typeId);
      if (!gunDef) continue;

      // 3. 处理全自动射击调度 (仅在全自动且按住扳机时进行)
      const isReloading = ReloadManager.isReloading(player.id);
      if (!isReloading && gunDef.fireMode === "auto" && FireScheduler.isPressed(player.id)) {
        const shotsToFire = FireScheduler.updateAndGetShots(player.id, gunDef, currentTick);
        for (let i = 0; i < shotsToFire; i++) {
          this.#fireOneShot(player, inv.container, currentSlot, mainItem, gunDef);
        }
      }

      // 4. 更新 Actionbar 实时 HUD
      this.#updatePlayerHud(player, mainItem, gunDef, currentTick);
    }
  }

  /**
   * 执行单次击发流程 (SHOT -> HIT -> DAMAGE)
   */
  static #fireOneShot(player, container, slotIndex, itemStack, gunDef) {
    // 1. 耐久度检查
    if (GunDurabilityManager.isBroken(itemStack, gunDef)) {
      GunAnimationBridge.playDryFire(player);
      player.onScreenDisplay?.setActionBar?.("§4✖ 武器已损坏，无法击发！请重新制造");
      FireScheduler.releaseTrigger(player.id);
      return;
    }

    // 2. 弹匣存弹检查
    const currentMag = AmmoManager.getMagazineAmmo(itemStack, gunDef);
    if (currentMag <= 0) {
      GunAnimationBridge.playDryFire(player);
      FireScheduler.releaseTrigger(player.id);
      // 尝试自动换弹
      ReloadManager.startReload(player, itemStack, gunDef, system.currentTick, slotIndex);
      return;
    }

    // 3. 消耗 1 发弹药与耐久
    AmmoManager.consumeMagazineAmmo(itemStack, gunDef, 1);
    GunDurabilityManager.deductDurability(itemStack, gunDef, gunDef.durabilityPerShot);

    // 立即写回背包容器
    container.setItem(slotIndex, itemStack);

    // 4. 判定是否处于瞄准 (潜行)
    const isAds = player.isSneaking;

    // 5. 霰弹多弹丸 or 单发弹丸
    const pelletCount = gunDef.pellets ?? 1;

    for (let p = 0; p < pelletCount; p++) {
      // (1) 服务端射线检测
      const hitResult = HitResolver.castShot(player, gunDef, isAds);

      // (2) 播放第一发弹丸的射击声效与特效
      if (p === 0) {
        GunAnimationBridge.playShootEffects(player, gunDef, hitResult.muzzleLocation, hitResult.hitLocation);
      }

      // (3) 命中伤害结算 (穿透无敌帧)
      if (hitResult.hit && hitResult.target) {
        FirearmDamageResolver.applyDamage(player, hitResult.target, gunDef, hitResult);
      } else if (hitResult.hitType === "block") {
        GunAnimationBridge.spawnImpactEffects(player.dimension, hitResult.hitLocation, false);
      }
    }
  }

  /**
   * 渲染 Actionbar HUD
   */
  static #updatePlayerHud(player, itemStack, gunDef, currentTick) {
    const reloadState = ReloadManager.getReloadState(player.id);
    const magAmmo = AmmoManager.getMagazineAmmo(itemStack, gunDef);
    const reserveAmmo = AmmoManager.countInventoryAmmo(player, gunDef.ammoType);
    const dura = GunDurabilityManager.getDurability(itemStack, gunDef);
    const duraPct = Math.round((dura / gunDef.durabilityMax) * 100);

    let hudText = "";

    if (reloadState) {
      const remainingTicks = Math.max(0, reloadState.finishTick - currentTick);
      const remainingSec = (remainingTicks / 20).toFixed(1);
      hudText = `§l§e${gunDef.name}§r §7| §6🔄 正在换弹 (${remainingSec}s) §7| 备弹: §f${reserveAmmo}`;
    } else {
      const ammoColor = magAmmo <= 0 ? "§c" : (magAmmo <= Math.ceil(gunDef.magazineSize * 0.3) ? "§e" : "§b");
      const duraColor = dura <= 0 ? "§4✖ 已损坏" : (duraPct <= 20 ? `§c⚠ 耐久 ${duraPct}%` : `§a${duraPct}%`);
      hudText = `§l§f${gunDef.name}§r §7| ${ammoColor}${magAmmo} §7/ §f${reserveAmmo} §7| 耐久: ${duraColor}`;
    }

    try {
      player.onScreenDisplay?.setActionBar?.(hudText);
    } catch {}
  }
}
