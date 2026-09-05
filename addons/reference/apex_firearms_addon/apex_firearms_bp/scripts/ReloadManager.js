import { system } from "@minecraft/server";
import { AmmoSystem } from "./AmmoSystem.js";

export class ReloadManager {
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
  static startReload(player, item, selectedSlot) {
    if (!player || !player.isValid()) return false;
    const playerId = player.id;
    if (this.#reloadStates.has(playerId)) return false;

    const config = AmmoSystem.getGunConfig(item?.typeId);
    if (!config) return false;

    const currentMag = AmmoSystem.getMagazineAmmo(item);
    if (currentMag >= config.magSize) {
      player.onScreenDisplay?.setActionBar?.(`§e[${config.name}] 弹匣已满，无需换弹`);
      return false;
    }

    const reserve = AmmoSystem.countReserveAmmo(player, config.ammoId);
    if (reserve <= 0) {
      try {
        player.playSound("apex.gun.dry", { location: player.location, volume: 1.0, pitch: 1.0 });
      } catch {}
      player.onScreenDisplay?.setActionBar?.(`§c✖ 背包无 ${config.caliberName} 备弹！输入 !gunkit 补给`);
      return false;
    }

    const reloadTicks = Math.round((config.reloadSeconds ?? 2.0) * 20);
    const currentTick = system.currentTick;

    const state = {
      playerId,
      gunId: config.id,
      selectedSlot,
      startTick: currentTick,
      finishTick: currentTick + reloadTicks,
      totalTicks: reloadTicks,
      dimensionId: player.dimension?.id
    };

    this.#reloadStates.set(playerId, state);

    try {
      player.playSound("apex.gun.draw", { location: player.location, volume: 1.0, pitch: 0.9 });
    } catch {}

    return true;
  }

  /**
   * 中断换弹
   */
  static cancelReload(playerId) {
    return this.#reloadStates.delete(playerId);
  }

  /**
   * 20 TPS 换弹状态机更新与结算
   */
  static update(currentTick, getPlayerById) {
    for (const [playerId, state] of this.#reloadStates.entries()) {
      const player = getPlayerById(playerId);
      if (!player || !player.isValid()) {
        this.#reloadStates.delete(playerId);
        continue;
      }

      const inv = player.getComponent("minecraft:inventory");
      if (!inv || !inv.container) {
        this.#reloadStates.delete(playerId);
        continue;
      }

      if (player.selectedSlotIndex !== state.selectedSlot) {
        this.#reloadStates.delete(playerId);
        player.onScreenDisplay?.setActionBar?.("§7[换弹已取消]");
        continue;
      }

      const item = inv.container.getItem(state.selectedSlot);
      if (!item || item.typeId !== state.gunId) {
        this.#reloadStates.delete(playerId);
        continue;
      }

      const config = AmmoSystem.getGunConfig(state.gunId);
      if (!config) {
        this.#reloadStates.delete(playerId);
        continue;
      }

      if (currentTick < state.finishTick) {
        const remainingSec = Math.max(0, (state.finishTick - currentTick) / 20).toFixed(1);
        const reserve = AmmoSystem.countReserveAmmo(player, config.ammoId);
        player.onScreenDisplay?.setActionBar?.(
          `§l§6[${config.name}]§r §7| §6🔄 换弹中 ${remainingSec}s... §7| 备弹: §f${reserve}`
        );
        continue;
      }

      // 换弹完成结算
      this.#reloadStates.delete(playerId);

      const currentMag = AmmoSystem.getMagazineAmmo(item);
      const needed = config.magSize - currentMag;
      if (needed <= 0) continue;

      const totalReserve = AmmoSystem.countReserveAmmo(player, config.ammoId);
      const reloadAmount = Math.min(needed, totalReserve);
      if (reloadAmount <= 0) continue;

      let remainingToDeduct = reloadAmount;
      for (let i = 0; i < inv.container.size; i++) {
        if (remainingToDeduct <= 0) break;
        const invItem = inv.container.getItem(i);
        if (invItem && invItem.typeId === config.ammoId) {
          if (invItem.amount <= remainingToDeduct) {
            remainingToDeduct -= invItem.amount;
            inv.container.setItem(i, undefined);
          } else {
            invItem.amount -= remainingToDeduct;
            inv.container.setItem(i, invItem);
            remainingToDeduct = 0;
          }
        }
      }

      const newAmmo = currentMag + reloadAmount;
      AmmoSystem.setMagazineAmmo(item, newAmmo);
      inv.container.setItem(state.selectedSlot, item);

      try {
        player.playSound("apex.gun.draw", { location: player.location, volume: 1.0, pitch: 1.2 });
      } catch {}

      const bar = "§a" + "|".repeat(10);
      const remainingReserve = totalReserve - reloadAmount;
      player.onScreenDisplay?.setActionBar?.(
        `§a✔ 换弹完成！§e[${config.name}] [${bar}§e] ${newAmmo}/${remainingReserve}`
      );
    }
  }
}
