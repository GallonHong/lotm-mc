import { world, system, Player } from "@minecraft/server";
import { AK47_CONFIG, AmmoSystem } from "./AmmoSystem.js";
import { ReloadManager } from "./ReloadManager.js";
import { RaycastEngine } from "./RaycastEngine.js";

export class GunEngine {
  static #lastBurstTicks = new Map();
  static #lastMuzzleFeedback = new Map();

  /**
   * 处理单次右键点击 -> 触发精准 3 连发点射 (3-Round Burst)
   */
  static handleBurstClick(player) {
    if (!player || !player.isValid()) return false;

    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return false;

    const slot = player.selectedSlotIndex;
    const item = inv.container.getItem(slot);
    if (!item || item.typeId !== AK47_CONFIG.id) return false;

    // 1. 如果正在换弹中，禁止射击
    if (ReloadManager.isReloading(player.id)) return false;

    // 2. 潜行 (Shift) + 右键 -> 战术主动换弹
    if (player.isSneaking) {
      const magAmmo = AmmoSystem.getMagazineAmmo(item);
      if (magAmmo < AK47_CONFIG.magSize) {
        ReloadManager.startReload(player, item, slot);
        return true;
      }
    }

    // 3. 弹药打空检测 -> 自动启动换弹流程
    const currentAmmo = AmmoSystem.getMagazineAmmo(item);
    if (currentAmmo <= 0) {
      const started = ReloadManager.startReload(player, item, slot);
      if (!started) {
        try {
          player.playSound("apex.gun.dry", { location: player.location, volume: 1.0, pitch: 1.1 });
        } catch {}
        player.onScreenDisplay?.setActionBar?.("§c⚠️ 弹匣已空! 背包无 7.62mm 备弹");
      }
      return false;
    }

    // 4. 防连点防抖 (同一 tick 只能触发一次爆发)
    const currentTick = system.currentTick;
    const lastTick = this.#lastBurstTicks.get(player.id) || 0;
    if (currentTick - lastTick < 4) return false;
    this.#lastBurstTicks.set(player.id, currentTick);

    // 5. 依次发射 3 发子弹 (第 1 发即时，第 2 发 +2 tick，第 3 发 +4 tick)
    // 第 1 发 (立即击发)
    this.#executeSingleShotInBurst(player, slot, 1);

    // 第 2 发 (+2 ticks = 0.1s)
    system.runTimeout(() => {
      this.#executeSingleShotInBurst(player, slot, 2);
    }, 2);

    // 第 3 发 (+4 ticks = 0.2s)
    system.runTimeout(() => {
      this.#executeSingleShotInBurst(player, slot, 3);
    }, 4);

    return true;
  }

  /**
   * 执行爆发序列中的单发子弹
   */
  static #executeSingleShotInBurst(player, targetSlot, shotIndexInBurst) {
    if (!player || !player.isValid()) return false;
    if (ReloadManager.isReloading(player.id)) return false;

    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return false;

    // 检查玩家手持槽位是否发生切换
    if (player.selectedSlotIndex !== targetSlot) return false;

    const item = inv.container.getItem(targetSlot);
    if (!item || item.typeId !== AK47_CONFIG.id) return false;

    let currentAmmo = AmmoSystem.getMagazineAmmo(item);
    if (currentAmmo <= 0) {
      // 弹药耗尽自动触发换弹
      ReloadManager.startReload(player, item, targetSlot);
      return false;
    }

    // 1. 扣除 1 发子弹并写回物品
    currentAmmo -= 1;
    AmmoSystem.setMagazineAmmo(item, currentAmmo);
    inv.container.setItem(targetSlot, item);

    this.#lastMuzzleFeedback.set(player.id, system.currentTick);

    // 2. 播放枪声与远距离回声
    try {
      player.playSound("apex.ak47.shoot", { location: player.location, volume: 1.0, pitch: 1.0 + (shotIndexInBurst - 1) * 0.05 });
      player.playSound("apex.ak47.distant", { location: player.location, volume: 0.8, pitch: 1.0 });
    } catch {}

    // 3. 视口后坐力微震 (蹲下减半)
    const isSneaking = player.isSneaking;
    const shakeIntensity = isSneaking ? "0.02" : "0.04";
    try {
      player.runCommandAsync(`camerashake add @s ${shakeIntensity} 0.05 rotational`);
    } catch {}

    // 4. 执行高精度射线与伤害计算
    const spreadMultiplier = 1.0 + (shotIndexInBurst - 1) * 0.25;
    const rayResult = RaycastEngine.castBullet(player, spreadMultiplier);

    // 5. 实时 HUD 反馈
    const reserve = AmmoSystem.countReserveAmmo(player);
    const barFill = Math.round((currentAmmo / AK47_CONFIG.magSize) * 10);
    const bar = "§a" + "|".repeat(barFill) + "§7" + "|".repeat(10 - barFill);

    if (rayResult && rayResult.hitResult) {
      const hit = rayResult.hitResult;
      const headText = hit.headshot ? "§c💥 头部暴击!" : "";
      const killText = hit.isFatal ? "§4☠ 击杀" : `§c-${hit.damage} HP`;
      const dist = hit.distance.toFixed(0);

      player.onScreenDisplay?.setActionBar?.(
        `§e[AK-47] [${bar}§e] ${currentAmmo}/${reserve} §7| §a🎯 命中 §f${hit.targetName} §b(${dist}m) ${headText} ${killText}`
      );

      try {
        player.playSound("apex.gun.hit_flesh", { volume: 0.9, pitch: 1.0 });
      } catch {}
    } else {
      player.onScreenDisplay?.setActionBar?.(
        `§e[AK-47] [${bar}§e] §f${currentAmmo}§7/§a${reserve} §7(三连发)`
      );
    }

    // 如果该发打完后弹药变为 0，自动开始换弹
    if (currentAmmo <= 0) {
      system.runTimeout(() => {
        ReloadManager.startReload(player, item, targetSlot);
      }, 2);
    }

    return true;
  }

  /**
   * 20 TPS 常态轮询更新 (处理换弹与常态 HUD)
   */
  static onTick() {
    const currentTick = system.currentTick;
    const allPlayers = world.getAllPlayers();
    const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

    // 1. 更新换弹状态机
    try {
      ReloadManager.update(currentTick, (id) => playerMap.get(id));
    } catch (err) {
      console.warn(`[ApexFirearms] ReloadManager update error: ${err}`);
    }

    // 2. 常态 HUD 刷新 (每 4 ticks)
    if (currentTick % 4 === 0) {
      for (const player of allPlayers) {
        try {
          if (!player || !player.isValid()) continue;
          if (ReloadManager.isReloading(player.id)) continue;

          const lastFeedback = this.#lastMuzzleFeedback.get(player.id) || 0;
          if (currentTick - lastFeedback < 8) continue;

          const inv = player.getComponent("minecraft:inventory");
          if (!inv || !inv.container) continue;

          const item = inv.container.getItem(player.selectedSlotIndex);
          if (!item || item.typeId !== AK47_CONFIG.id) continue;

          const currentAmmo = AmmoSystem.getMagazineAmmo(item);
          const reserve = AmmoSystem.countReserveAmmo(player);
          const barFill = Math.round((currentAmmo / AK47_CONFIG.magSize) * 10);
          const bar = "§a" + "|".repeat(barFill) + "§7" + "|".repeat(10 - barFill);

          player.onScreenDisplay?.setActionBar?.(
            `§e[AK-47] [${bar}§e] §f${currentAmmo}§7/§a${reserve} §7(三连发点射)`
          );
        } catch {}
      }
    }
  }

  static resetPlayer(playerId) {
    this.#lastBurstTicks.delete(playerId);
    this.#lastMuzzleFeedback.delete(playerId);
    ReloadManager.cancelReload(playerId);
  }
}
