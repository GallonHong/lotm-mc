import { world, system, Player } from "@minecraft/server";
import { AK47_CONFIG, AmmoSystem } from "./AmmoSystem.js";
import { ReloadManager } from "./ReloadManager.js";
import { RaycastEngine } from "./RaycastEngine.js";

export class GunEngine {
  static #activeTriggers = new Map();
  static #triggerLatches = new Set();
  static #burstCount = new Map();
  static #lastMuzzleFeedback = new Map();

  /**
   * 按下使用键 (右键长按开始 / 点按)
   */
  static handleTriggerStart(player) {
    if (!player || !player.isValid()) return false;
    if (this.#triggerLatches.has(player.id)) return false;

    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return false;

    const slot = player.selectedSlotIndex;
    const item = inv.container.getItem(slot);
    if (!item || item.typeId !== AK47_CONFIG.id) return false;

    this.#triggerLatches.add(player.id);

    // 如果正在换弹中，禁止射击
    if (ReloadManager.isReloading(player.id)) return false;

    // 潜行 (Shift) + 右键 -> 战术主动换弹
    if (player.isSneaking) {
      const magAmmo = AmmoSystem.getMagazineAmmo(item);
      if (magAmmo < AK47_CONFIG.magSize) {
        ReloadManager.startReload(player, item, slot);
        return true;
      }
    }

    // 弹药打空检测 -> 自动启动换弹流程
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

    const currentTick = system.currentTick;

    // 1. 触发第 1 发射击 (0 延迟响应)
    let fired = false;
    try {
      fired = this.#fireSingleShot(player, inv.container, slot, item);
    } catch (e) {
      console.warn(`[ApexFirearms] Initial shot error: ${e}`);
    }

    if (!fired) {
      this.handleTriggerStop(player);
      return false;
    }

    // 2. 注册长按连发有界触发器 (最多持续 60 ticks = 3.0 秒 = 30发，到期自动停止)
    this.#activeTriggers.set(player.id, {
      slot,
      startTick: currentTick,
      lastShotTick: currentTick,
      maxTicks: 60
    });

    return true;
  }

  /**
   * 松开使用键 (右键松开 / 释放)
   */
  static handleTriggerStop(player) {
    if (!player) return false;
    const existed = this.#activeTriggers.delete(player.id);
    const latched = this.#triggerLatches.delete(player.id);
    this.#burstCount.delete(player.id);
    return existed || latched;
  }

  /**
   * 20 TPS 主引擎驱动 (处理换弹、连射节流与状态检查)
   */
  static onTick() {
    const currentTick = system.currentTick;
    const allPlayers = world.getAllPlayers();
    const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

    // 1. 更新全局换弹状态机
    try {
      ReloadManager.update(currentTick, (id) => playerMap.get(id));
    } catch (err) {
      console.warn(`[ApexFirearms] ReloadManager update error: ${err}`);
    }

    // 2. 处理所有正在长按开火的玩家
    for (const player of allPlayers) {
      if (!player || !player.isValid()) continue;
      const trigger = this.#activeTriggers.get(player.id);
      if (!trigger) continue;

      try {
        const inv = player.getComponent("minecraft:inventory");
        if (!inv || !inv.container) {
          this.handleTriggerStop(player);
          continue;
        }

        // 切换槽位 -> 立即停火
        if (player.selectedSlotIndex !== trigger.slot) {
          this.handleTriggerStop(player);
          continue;
        }

        const item = inv.container.getItem(trigger.slot);
        if (!item || item.typeId !== AK47_CONFIG.id || ReloadManager.isReloading(player.id)) {
          this.handleTriggerStop(player);
          continue;
        }

        // 硬超时保护 (超过 1 个弹匣时长自动停火)
        if (currentTick - trigger.startTick >= trigger.maxTicks) {
          this.handleTriggerStop(player);
          continue;
        }

        // 600 RPM 连发射频控制 (每 2 ticks 发射 1 发)
        if (currentTick - trigger.lastShotTick >= 2) {
          trigger.lastShotTick = currentTick;
          const fired = this.#fireSingleShot(player, inv.container, trigger.slot, item);
          if (!fired) {
            this.handleTriggerStop(player);
            // 如果是弹药打空，自动开始换弹
            const mag = AmmoSystem.getMagazineAmmo(item);
            if (mag <= 0) {
              ReloadManager.startReload(player, item, trigger.slot);
            }
          }
        }
      } catch (err) {
        console.warn(`[ApexFirearms] Safe trigger abort on tick error: ${err}`);
        this.handleTriggerStop(player);
      }
    }

    // 3. 更新常态 HUD (非开火、非换弹时每 4 ticks 刷新一次)
    if (currentTick % 4 === 0) {
      for (const player of allPlayers) {
        try {
          if (!player || !player.isValid()) continue;
          if (this.#activeTriggers.has(player.id)) continue;
          if (ReloadManager.isReloading(player.id)) continue;

          const lastFeedback = this.#lastMuzzleFeedback.get(player.id) || 0;
          if (currentTick - lastFeedback < 10) continue;

          const inv = player.getComponent("minecraft:inventory");
          if (!inv || !inv.container) continue;

          const item = inv.container.getItem(player.selectedSlotIndex);
          if (!item || item.typeId !== AK47_CONFIG.id) continue;

          const currentAmmo = AmmoSystem.getMagazineAmmo(item);
          const reserve = AmmoSystem.countReserveAmmo(player);
          const barFill = Math.round((currentAmmo / AK47_CONFIG.magSize) * 10);
          const bar = "§a" + "|".repeat(barFill) + "§7" + "|".repeat(10 - barFill);

          player.onScreenDisplay?.setActionBar?.(
            `§e[AK-47] [${bar}§e] §f${currentAmmo}§7/§a${reserve} §7(7.62mm)`
          );
        } catch {}
      }
    }
  }

  /**
   * 执行单发实弹射击
   */
  static #fireSingleShot(player, container, slot, item) {
    let currentAmmo = AmmoSystem.getMagazineAmmo(item);
    if (currentAmmo <= 0) {
      return false;
    }

    // 1. 扣除 1 发子弹并更新物品
    currentAmmo -= 1;
    AmmoSystem.setMagazineAmmo(item, currentAmmo);
    container.setItem(slot, item);

    this.#lastMuzzleFeedback.set(player.id, system.currentTick);

    let burst = this.#burstCount.get(player.id) || 0;
    burst++;
    this.#burstCount.set(player.id, burst);

    // 2. 播放枪声与远距离回声
    try {
      player.playSound("apex.ak47.shoot", { location: player.location, volume: 1.0, pitch: 1.0 });
      player.playSound("apex.ak47.distant", { location: player.location, volume: 0.8, pitch: 1.0 });
    } catch {}

    // 3. 视口后坐力抖动 (蹲下减半)
    const isSneaking = player.isSneaking;
    const shakeIntensity = isSneaking ? "0.02" : "0.045";
    try {
      player.runCommandAsync(`camerashake add @s ${shakeIntensity} 0.05 rotational`);
    } catch {}

    // 4. 执行射线投射与伤害结算 (带未加载区块防御)
    try {
      const spreadMultiplier = 1.0 + Math.min(burst * 0.05, 1.0);
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
          `§e[AK-47] [${bar}§e] §f${currentAmmo}§7/§a${reserve} §7(7.62mm)`
        );
      }
    } catch (e) {
      console.warn(`[ApexFirearms] Shot resolution catch: ${e}`);
    }

    return true;
  }

  static resetPlayer(playerId) {
    this.#activeTriggers.delete(playerId);
    this.#triggerLatches.delete(playerId);
    this.#burstCount.delete(playerId);
    this.#lastMuzzleFeedback.delete(playerId);
    ReloadManager.cancelReload(playerId);
  }
}
