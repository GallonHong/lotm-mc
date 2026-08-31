import { world, system, Player } from "@minecraft/server";
import { GUN_CONFIGS, AmmoSystem } from "./AmmoSystem.js";
import { ReloadManager } from "./ReloadManager.js";
import { RaycastEngine } from "./RaycastEngine.js";

export class GunEngine {
  static #lastShotTicks = new Map();
  static #lastMuzzleFeedback = new Map();

  /**
   * 处理武器右键点按触发
   */
  static handleGunUse(player, item) {
    if (!player || !player.isValid() || !item) return false;

    const config = AmmoSystem.getGunConfig(item.typeId);
    if (!config) return false;

    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return false;
    const slot = player.selectedSlotIndex;

    // 1. 如果正在换弹中，禁止射击
    if (ReloadManager.isReloading(player.id)) return false;

    // 2. 潜行 (Shift) + 右键 -> 主动换弹
    if (player.isSneaking) {
      const magAmmo = AmmoSystem.getMagazineAmmo(item);
      if (magAmmo < config.magSize) {
        ReloadManager.startReload(player, item, slot);
        return true;
      }
    }

    // 3. 弹药打空检测 -> 自动启动换弹
    const currentAmmo = AmmoSystem.getMagazineAmmo(item);
    if (currentAmmo <= 0) {
      const started = ReloadManager.startReload(player, item, slot);
      if (!started) {
        try {
          player.playSound("apex.gun.dry", { location: player.location, volume: 1.0, pitch: 1.1 });
        } catch {}
        player.onScreenDisplay?.setActionBar?.(`§c⚠️ 弹匣已空! 背包无 ${config.caliberName} 备弹`);
      }
      return false;
    }

    // 4. 防连点防抖
    const currentTick = system.currentTick;
    const lastTick = this.#lastShotTicks.get(player.id) || 0;
    if (currentTick - lastTick < 3) return false;
    this.#lastShotTicks.set(player.id, currentTick);

    // 5. 根据模式发射：AK-47 为三连发，M82 为单发重狙 (20% 概率烈焰高爆弹)
    if (config.burstCount === 3) {
      // AK-47 三连发
      this.#executeSingleShot(player, slot, config, 1);
      system.runTimeout(() => this.#executeSingleShot(player, slot, config, 2), 2);
      system.runTimeout(() => this.#executeSingleShot(player, slot, config, 3), 4);
    } else {
      // M82A1 单发点射 (20% 概率触发高爆烈焰弹)
      const isHeRound = config.isExplosive && (Math.random() < (config.heChance ?? 0.20));
      this.#executeSingleShot(player, slot, config, 1, isHeRound);
    }

    return true;
  }

  /**
   * 执行单发实弹
   */
  static #executeSingleShot(player, targetSlot, config, shotIndexInBurst = 1, isHeRound = false) {
    if (!player || !player.isValid()) return false;
    if (ReloadManager.isReloading(player.id)) return false;

    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return false;

    if (player.selectedSlotIndex !== targetSlot) return false;

    const item = inv.container.getItem(targetSlot);
    if (!item || item.typeId !== config.id) return false;

    let currentAmmo = AmmoSystem.getMagazineAmmo(item);
    if (currentAmmo <= 0) {
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
      if (config.id === "apex:m82") {
        if (isHeRound) {
          // 恶魂火球高爆枪声
          player.playSound("mob.ghast.fireball", { location: player.location, volume: 1.0, pitch: 1.0 });
          player.playSound("random.explode", { location: player.location, volume: 1.0, pitch: 1.2 });
        } else {
          player.playSound("apex.m82.shoot", { location: player.location, volume: 1.0, pitch: 0.9 });
          player.playSound("apex.m82.distant", { location: player.location, volume: 0.9, pitch: 0.9 });
        }
      } else {
        player.playSound("apex.ak47.shoot", { location: player.location, volume: 1.0, pitch: 1.0 + (shotIndexInBurst - 1) * 0.05 });
        player.playSound("apex.ak47.distant", { location: player.location, volume: 0.8, pitch: 1.0 });
      }
    } catch {}

    // 3. 视口后坐力震颤
    const isSneaking = player.isSneaking;
    let shakeIntensity = "0.04";
    if (config.id === "apex:m82") {
      shakeIntensity = isHeRound ? (isSneaking ? "0.05" : "0.08") : (isSneaking ? "0.035" : "0.06");
    } else {
      shakeIntensity = isSneaking ? "0.02" : "0.04";
    }

    try {
      player.runCommandAsync(`camerashake add @s ${shakeIntensity} 0.06 rotational`);
    } catch {}

    // 4. 执行高精度射线与伤害计算
    const spreadMult = 1.0 + (shotIndexInBurst - 1) * 0.25;
    const rayResult = RaycastEngine.castBullet(player, config, spreadMult, isHeRound);

    // 5. 实时 HUD 反馈
    const reserve = AmmoSystem.countReserveAmmo(player, config.ammoId);
    const barFill = Math.round((currentAmmo / config.magSize) * 10);
    const bar = "§a" + "|".repeat(barFill) + "§7" + "|".repeat(10 - barFill);

    let heTag = isHeRound ? "§6[💥烈焰高爆] " : "";

    if (rayResult && rayResult.hitResult) {
      const hit = rayResult.hitResult;
      const headText = hit.headshot ? "§c💥 头部暴击!" : "";
      const killText = hit.isFatal ? "§4☠ 击杀" : `§c-${hit.damage} HP`;
      const dist = hit.distance.toFixed(0);

      player.onScreenDisplay?.setActionBar?.(
        `§e[${config.name}] ${heTag}[${bar}§e] ${currentAmmo}/${reserve} §7| §a🎯 命中 §f${hit.targetName} §b(${dist}m) ${headText} ${killText}`
      );

      try {
        player.playSound("apex.gun.hit_flesh", { volume: 0.9, pitch: 1.0 });
      } catch {}
    } else if (isHeRound) {
      player.onScreenDisplay?.setActionBar?.(
        `§e[${config.name}] §6💥 触发高爆烈焰弹! (恶魂威力轰炸) §7[${bar}§e] §f${currentAmmo}§7/§a${reserve}`
      );
    } else {
      const modeText = config.burstCount === 3 ? "三连发" : "单发";
      player.onScreenDisplay?.setActionBar?.(
        `§e[${config.name}] [${bar}§e] §f${currentAmmo}§7/§a${reserve} §7(${modeText})`
      );
    }

    if (currentAmmo <= 0) {
      system.runTimeout(() => {
        ReloadManager.startReload(player, item, targetSlot);
      }, 2);
    }

    return true;
  }

  /**
   * 20 TPS 常态更新
   */
  static onTick() {
    const currentTick = system.currentTick;
    const allPlayers = world.getAllPlayers();
    const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

    try {
      ReloadManager.update(currentTick, (id) => playerMap.get(id));
    } catch {}

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
          if (!item) continue;

          const config = AmmoSystem.getGunConfig(item.typeId);
          if (!config) continue;

          const currentAmmo = AmmoSystem.getMagazineAmmo(item);
          const reserve = AmmoSystem.countReserveAmmo(player, config.ammoId);
          const barFill = Math.round((currentAmmo / config.magSize) * 10);
          const bar = "§a" + "|".repeat(barFill) + "§7" + "|".repeat(10 - barFill);

          const extraNote = config.isExplosive ? "20%烈焰高爆" : "三连发点射";
          player.onScreenDisplay?.setActionBar?.(
            `§e[${config.name}] [${bar}§e] §f${currentAmmo}§7/§a${reserve} §7(${extraNote})`
          );
        } catch {}
      }
    }
  }

  static resetPlayer(playerId) {
    this.#lastShotTicks.delete(playerId);
    this.#lastMuzzleFeedback.delete(playerId);
    ReloadManager.cancelReload(playerId);
  }
}
