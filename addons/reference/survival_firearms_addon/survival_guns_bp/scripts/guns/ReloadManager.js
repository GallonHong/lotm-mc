import { AmmoManager } from "./AmmoManager.js";
import { GunAnimationBridge } from "./GunAnimationBridge.js";
import { GunRegistry } from "./GunRegistry.js";

/**
 * 换弹管理器 (ReloadManager)
 * 职责：
 * 1. 维护玩家换弹状态机
 * 2. 严格在换弹完成时间点进行背包扣弹与弹匣填充 (防止提前结算)
 * 3. 换枪、死亡、掉落武器时自动中断换弹
 */
export class ReloadManager {
  // Map<playerId, ReloadState>
  static #reloadStates = new Map();

  static isReloading(playerId) {
    return this.#reloadStates.has(playerId);
  }

  static getReloadState(playerId) {
    return this.#reloadStates.get(playerId) || null;
  }

  /**
   * 启动换弹流程
   */
  static startReload(player, itemStack, gunDef, currentTick, selectedSlot) {
    const playerId = player.id;
    if (this.#reloadStates.has(playerId)) {
      return false;
    }

    const currentMag = AmmoManager.getMagazineAmmo(itemStack, gunDef);
    if (currentMag >= gunDef.magazineSize) {
      return false; // 弹匣已满
    }

    const reserveAmmo = AmmoManager.countInventoryAmmo(player, gunDef.ammoType);
    if (reserveAmmo <= 0) {
      GunAnimationBridge.playDryFire(player);
      player.onScreenDisplay?.setActionBar?.(`§c[无备用弹药] 需 ${gunDef.ammoType.replace("survival:", "")}`);
      return false;
    }

    const reloadTicks = Math.round(gunDef.reloadSeconds * 20);
    let instanceId = null;
    try {
      instanceId = itemStack.getDynamicProperty("gun:instance_id");
      if (typeof instanceId !== "string" || !instanceId) {
        instanceId = `${playerId}:${currentTick}:${Math.floor(Math.random() * 1000000000)}`;
        itemStack.setDynamicProperty("gun:instance_id", instanceId);
        const inv = player.getComponent("minecraft:inventory");
        inv?.container?.setItem(selectedSlot, itemStack);
      }
    } catch {}
    const state = {
      playerId,
      gunId: gunDef.id,
      selectedSlot,
      startTick: currentTick,
      finishTick: currentTick + reloadTicks,
      totalTicks: reloadTicks,
      instanceId,
      dimensionId: player.dimension?.id
    };

    this.#reloadStates.set(playerId, state);

    // 客户端动画控制器不能读取服务器 tag；换弹动作由脚本直接播放。
    GunAnimationBridge.playReload(player, gunDef);
    try {
      player.playSound("gun.draw", { location: player.location, volume: 1.0, pitch: 0.9 });
    } catch {}

    return true;
  }

  /**
   * 中断换弹
   */
  static cancelReload(playerId, player = null) {
    if (this.#reloadStates.has(playerId)) {
      this.#reloadStates.delete(playerId);
      return true;
    }
    return false;
  }

  /**
   * 每 tick 调度检查换弹状态与结算
   */
  static update(currentTick, getPlayerById) {
    for (const [playerId, state] of this.#reloadStates.entries()) {
      const player = getPlayerById(playerId);

      // 1. 玩家离线、死亡或维度/副本切换时中断
      if (!player || !player.isValid()) {
        this.#reloadStates.delete(playerId);
        continue;
      }
      let currentHealth = 1;
      try { currentHealth = player.getComponent("minecraft:health")?.currentValue ?? 1; } catch {}
      if (currentHealth <= 0 || player.dimension?.id !== state.dimensionId) {
        this.#reloadStates.delete(playerId);
        continue;
      }

      // 2. 检查玩家主手是否发生切换
      const inv = player.getComponent("minecraft:inventory");
      if (!inv || !inv.container) {
        this.#reloadStates.delete(playerId);
        continue;
      }

      if (player.selectedSlotIndex !== state.selectedSlot) {
        // 切槽位中断换弹
        this.#reloadStates.delete(playerId);
        player.onScreenDisplay?.setActionBar?.("§7[换弹已取消]");
        continue;
      }

      const mainItem = inv.container.getItem(state.selectedSlot);
      if (!mainItem || mainItem.typeId !== state.gunId) {
        // 武器改变中断换弹
        this.#reloadStates.delete(playerId);
        continue;
      }
      if (state.instanceId) {
        let currentInstanceId = null;
        try { currentInstanceId = mainItem.getDynamicProperty("gun:instance_id"); } catch {}
        if (currentInstanceId !== state.instanceId) {
          this.#reloadStates.delete(playerId);
          continue;
        }
      }

      // 3. 达到完成点结算
      if (currentTick >= state.finishTick) {
        this.#reloadStates.delete(playerId);

        const gunDef = GunRegistry.getGun(state.gunId);
        if (!gunDef) continue;

        const currentMag = AmmoManager.getMagazineAmmo(mainItem, gunDef);
        const needed = gunDef.magazineSize - currentMag;

        if (needed > 0) {
          const deducted = AmmoManager.deductInventoryAmmo(player, gunDef.ammoType, needed);
          if (deducted > 0) {
            AmmoManager.setMagazineAmmo(mainItem, gunDef, currentMag + deducted);
            inv.container.setItem(state.selectedSlot, mainItem);

            // 播放换弹就绪/上膛音效
            try {
              player.playSound("gun.draw", { location: player.location, volume: 1.0, pitch: 1.2 });
            } catch {}
          }
        }
      }
    }
  }
}
