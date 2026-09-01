import { world, system, Player } from "@minecraft/server";
import { GUN_CONFIGS, AmmoSystem } from "./AmmoSystem.js";
import { ReloadManager } from "./ReloadManager.js";
import { RaycastEngine } from "./RaycastEngine.js";
import { GrenadeEngine } from "./GrenadeEngine.js";
import { ArcEngine } from "./ArcEngine.js";
import { ShotgunEngine } from "./ShotgunEngine.js";
import { ArmorEngine } from "./ArmorEngine.js";
import { JetpackEngine } from "./JetpackEngine.js";

export class GunEngine {
  static #lastShotTicks = new Map();
  static #lastMuzzleFeedback = new Map();
  static #skillCooldowns = new Map();
  static #overdriveStates = new Map();

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

    // 2. 如果正在【暴走狂潮】超载连射中，由后台 onTick 绝对接管
    if (this.#overdriveStates.has(player.id)) return false;

    const currentTick = system.currentTick;

    // 3. 潜行分支 (Vector 为释放 5 秒无限子弹暴走狂潮，其余枪械为潜行主动换弹)
    if (player.isSneaking) {
      if (config.hasSkill) {
        const nextTick = this.#skillCooldowns.get(player.id) || 0;
        if (currentTick < nextTick) {
          const remainingSec = Math.max(0, (nextTick - currentTick) / 20).toFixed(1);
          player.onScreenDisplay?.setActionBar?.(
            `§c⚠ 【暴走狂潮】技能冷却中 (剩余 ${remainingSec}s)!`
          );
          try {
            player.playSound("apex.gun.dry", { location: player.location, volume: 1.0, pitch: 1.2 });
          } catch {}
          return false;
        }

        // 激活 5 秒无限子弹狂暴
        this.activateOverdrive(player, slot, config, currentTick);
        return true;
      } else {
        const magAmmo = AmmoSystem.getMagazineAmmo(item);
        if (magAmmo < config.magSize) {
          ReloadManager.startReload(player, item, slot);
          return true;
        }
      }
    }

    // 4. 弹药打空检测 -> 自动启动换弹
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

    // 5. 防连点防抖
    const lastTick = this.#lastShotTicks.get(player.id) || 0;
    if (currentTick - lastTick < 3) return false;
    this.#lastShotTicks.set(player.id, currentTick);

    // 6. 各武器点射派发
    if (config.burstCount === 3) {
      // AK-47 三连发 (单发 6 HP，三发 18 HP)
      this.#executeSingleShot(player, slot, config, 1);
      system.runTimeout(() => this.#executeSingleShot(player, slot, config, 2), 2);
      system.runTimeout(() => this.#executeSingleShot(player, slot, config, 3), 4);
    } else if (config.burstCount === 2) {
      // Vector .45 立姿双发 (单发 5 HP，双发 10 HP)
      this.#executeSingleShot(player, slot, config, 1);
      system.runTimeout(() => this.#executeSingleShot(player, slot, config, 2), 2);
    } else if (config.id === "apex:mgl") {
      // M32 自动榴弹炮 (发射物理实体抛物线榴弹)
      this.#executeSingleShot(player, slot, config, 1, true);
    } else if (config.id === "apex:arc_emitter") {
      // 特斯拉电弧发射器 (连锁闪电跃迁)
      this.#executeSingleShot(player, slot, config, 1, false);
    } else if (config.id === "apex:shotgun") {
      // 圣盾防暴霰弹枪 (8 枚弹丸，护盾共鸣 2~22 HP)
      this.#executeSingleShot(player, slot, config, 1, false);
    } else {
      // M82A1 单发重狙 (20% 概率恶魂高爆弹)
      const isHeRound = config.isExplosive && (Math.random() < (config.heChance ?? 0.20));
      this.#executeSingleShot(player, slot, config, 1, isHeRound);
    }

    return true;
  }

  /**
   * 启动 Vector【暴走狂潮 / Overdrive】技能 (持续 5.0 秒，不消耗子弹)
   */
  static activateOverdrive(player, slot, config, currentTick) {
    const durationTicks = 100; // 5.0 秒 = 100 ticks
    this.#skillCooldowns.set(player.id, currentTick + (config.skillCooldownSec ?? 30) * 20);

    try {
      player.playSound("mob.enderdragon.growl", { location: player.location, volume: 0.9, pitch: 1.5 });
      player.playSound("random.anvil_land", { location: player.location, volume: 0.8, pitch: 1.8 });
      player.dimension.spawnParticle("minecraft:mob_flame_emitter", player.location);
    } catch {}

    this.#overdriveStates.set(player.id, {
      slot,
      gunId: config.id,
      startTick: currentTick,
      finishTick: currentTick + durationTicks
    });

    player.onScreenDisplay?.setActionBar?.("§4🔥【暴走狂潮 OVERDRIVE】5秒无限子弹极速扫射已开启!");
  }

  /**
   * 20 TPS 常态更新
   */
  static onTick() {
    const currentTick = system.currentTick;
    const allPlayers = world.getAllPlayers();
    const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

    // 1. 步进 40mm 榴弹抛物线
    try {
      GrenadeEngine.onTick();
    } catch (e) {
      console.warn(`[ApexFirearms] GrenadeEngine tick error: ${e}`);
    }

    // 2. 步进动力战甲被动光环
    try {
      ArmorEngine.onTick();
    } catch (e) {
      console.warn(`[ApexFirearms] ArmorEngine tick error: ${e}`);
    }

    // 3. 步进离子喷气背包双击跳跃与飞升推进
    try {
      JetpackEngine.onTick();
    } catch (e) {
      console.warn(`[ApexFirearms] JetpackEngine tick error: ${e}`);
    }

    // 4. 更新换弹状态机
    try {
      ReloadManager.update(currentTick, (id) => playerMap.get(id));
    } catch {}

    // 4. 处理处于【暴走狂潮】的玩家 (5秒无限子弹持续扫射)
    for (const player of allPlayers) {
      if (!player || !player.isValid()) continue;
      const od = this.#overdriveStates.get(player.id);
      if (!od) continue;

      const inv = player.getComponent("minecraft:inventory");
      if (!inv || !inv.container) {
        this.#overdriveStates.delete(player.id);
        continue;
      }

      const item = inv.container.getItem(od.slot);
      if (!item || item.typeId !== od.gunId) {
        this.#overdriveStates.delete(player.id);
        continue;
      }

      const config = AmmoSystem.getGunConfig(od.gunId);
      if (!config) {
        this.#overdriveStates.delete(player.id);
        continue;
      }

      // 5秒时间到判定
      if (currentTick >= od.finishTick) {
        this.#overdriveStates.delete(player.id);
        try {
          player.playSound("random.fizz", { location: player.location, volume: 1.0, pitch: 0.8 });
          player.dimension.spawnParticle("minecraft:smoke_particle", player.location);
        } catch {}
        player.onScreenDisplay?.setActionBar?.("§7[暴走狂潮结束 - 枪管冷却完毕]");
        continue;
      }

      const remainingSec = Math.max(0, (od.finishTick - currentTick) / 20).toFixed(1);
      this.#executeSingleShot(player, od.slot, config, 1, false, true, remainingSec);
    }

    // 5. 常态 HUD 刷新
    if (currentTick % 4 === 0) {
      for (const player of allPlayers) {
        try {
          if (!player || !player.isValid()) continue;
          if (ReloadManager.isReloading(player.id)) continue;
          if (this.#overdriveStates.has(player.id)) continue;

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

          // 耐久度百分比读取
          let durText = "";
          try {
            const durComp = item.getComponent("minecraft:durability");
            if (durComp) {
              const remain = durComp.maxDurability - durComp.damage;
              durText = ` §7| §f耐久:${remain}/${durComp.maxDurability}`;
            }
          } catch {}

          let skillStatus = "";
          if (config.hasSkill) {
            const nextTick = this.#skillCooldowns.get(player.id) || 0;
            if (currentTick < nextTick) {
              const sec = Math.max(0, (nextTick - currentTick) / 20).toFixed(0);
              skillStatus = ` §7| §cCD: ${sec}s`;
            } else {
              skillStatus = ` §7| §aShift[5s无限子弹]就绪!`;
            }
          } else if (config.id === "apex:shotgun") {
            const shield = ShotgunEngine.getPlayerShieldRating(player);
            const scale = Math.min(1.0, Math.max(0.0, shield / 20.0));
            const dmg = Math.round(2 + 20 * scale);
            skillStatus = ` §7| §6🛡️圣盾:${shield} (单丸${dmg}HP)`;
          }

          player.onScreenDisplay?.setActionBar?.(
            `§e[${config.name}] [${bar}§e] §f${currentAmmo}§7/§a${reserve}${durText}${skillStatus}`
          );
        } catch {}
      }
    }
  }

  /**
   * 执行单发实弹 / 榴弹 / 特斯拉电弧 / 圣盾霰弹 (含耐久度扣减与损坏判定)
   */
  static #executeSingleShot(player, targetSlot, config, shotIndexInBurst = 1, isHeRound = false, isOverdrive = false, overdriveSec = "5.0") {
    if (!player || !player.isValid()) return false;
    if (ReloadManager.isReloading(player.id)) return false;

    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return false;

    if (player.selectedSlotIndex !== targetSlot) return false;

    const item = inv.container.getItem(targetSlot);
    if (!item || item.typeId !== config.id) return false;

    let currentAmmo = AmmoSystem.getMagazineAmmo(item);

    // 1. 扣弹与扣耐久逻辑：
    if (!isOverdrive) {
      if (currentAmmo <= 0) {
        ReloadManager.startReload(player, item, targetSlot);
        return false;
      }
      currentAmmo -= 1;
      AmmoSystem.setMagazineAmmo(item, currentAmmo);

      // 扣除枪械耐久度 (Durability)
      try {
        const durComp = item.getComponent("minecraft:durability");
        if (durComp) {
          const nextDamage = durComp.damage + 1;
          if (nextDamage >= durComp.maxDurability) {
            // 武器耐久耗尽损坏
            inv.container.setItem(targetSlot, undefined);
            try {
              player.playSound("random.break", { location: player.location, volume: 1.0, pitch: 0.9 });
              player.onScreenDisplay?.setActionBar?.(`§c💥 您的【${config.name}】因耐久耗尽已损坏！`);
            } catch {}
            return false;
          } else {
            durComp.damage = nextDamage;
          }
        }
      } catch {}

      inv.container.setItem(targetSlot, item);
    }

    this.#lastMuzzleFeedback.set(player.id, system.currentTick);

    // 2. 播放枪声与远距离回声
    try {
      if (config.id === "apex:shotgun") {
        player.playSound("apex.shotgun.shoot", { location: player.location, volume: 1.0, pitch: 1.0 });
        player.playSound("apex.shotgun.distant", { location: player.location, volume: 0.9, pitch: 1.0 });
      } else if (config.id === "apex:arc_emitter") {
        player.playSound("apex.arc.shoot", { location: player.location, volume: 1.0, pitch: 1.0 });
      } else if (config.id === "apex:mgl") {
        player.playSound("apex.mgl.shoot", { location: player.location, volume: 1.0, pitch: 0.85 });
      } else if (config.id === "apex:m82") {
        if (isHeRound) {
          player.playSound("mob.ghast.fireball", { location: player.location, volume: 1.0, pitch: 1.0 });
          player.playSound("random.explode", { location: player.location, volume: 1.0, pitch: 1.2 });
        } else {
          player.playSound("apex.m82.shoot", { location: player.location, volume: 1.0, pitch: 0.9 });
          player.playSound("apex.m82.distant", { location: player.location, volume: 0.9, pitch: 0.9 });
        }
      } else if (config.id === "apex:vector") {
        const pitch = isOverdrive ? 1.25 : (1.05 + (shotIndexInBurst - 1) * 0.05);
        player.playSound("apex.vector.shoot", { location: player.location, volume: 0.95, pitch });
        player.playSound("apex.vector.distant", { location: player.location, volume: 0.8, pitch });
      } else {
        player.playSound("apex.ak47.shoot", { location: player.location, volume: 1.0, pitch: 1.0 + (shotIndexInBurst - 1) * 0.05 });
        player.playSound("apex.ak47.distant", { location: player.location, volume: 0.8, pitch: 1.0 });
      }
    } catch {}

    // 3. 视口后坐力抖动
    const isSneaking = player.isSneaking;
    let shakeIntensity = "0.04";
    if (isOverdrive) {
      shakeIntensity = "0.055";
    } else if (config.id === "apex:shotgun") {
      shakeIntensity = isSneaking ? "0.045" : "0.065";
    } else if (config.id === "apex:arc_emitter") {
      shakeIntensity = "0.025";
    } else if (config.id === "apex:mgl") {
      shakeIntensity = isSneaking ? "0.04" : "0.07";
    } else if (config.id === "apex:m82") {
      shakeIntensity = isHeRound ? (isSneaking ? "0.05" : "0.08") : (isSneaking ? "0.035" : "0.06");
    } else {
      shakeIntensity = isSneaking ? "0.02" : "0.035";
    }

    try {
      player.runCommandAsync(`camerashake add @s ${shakeIntensity} 0.05 rotational`);
    } catch {}

    // 4. 弹道派发
    const reserve = AmmoSystem.countReserveAmmo(player, config.ammoId);
    const barFill = Math.round((currentAmmo / config.magSize) * 10);
    const bar = "§a" + "|".repeat(barFill) + "§7" + "|".repeat(10 - barFill);

    if (config.id === "apex:shotgun") {
      const sgRes = ShotgunEngine.fireShotgun(player, config);
      if (sgRes && sgRes.totalPelletsHit > 0) {
        player.onScreenDisplay?.setActionBar?.(
          `§e[圣盾霰弹枪] 🛡️ [${bar}§e] ${currentAmmo}/${reserve} §7| §6命中 §f${sgRes.totalPelletsHit}/${sgRes.pelletCount} §6枚弹丸 (单丸${sgRes.pelletDamage}HP) §c-${sgRes.totalDamageDone} HP!`
        );
      } else {
        player.onScreenDisplay?.setActionBar?.(
          `§e[圣盾霰弹枪] 🛡️ [${bar}§e] §f${currentAmmo}§7/§a${reserve} §7| §6护盾共鸣 (单丸${sgRes?.pelletDamage ?? 2}HP)`
        );
      }
    } else if (config.id === "apex:arc_emitter") {
      const arcResult = ArcEngine.fireArc(player, config);
      const hits = arcResult?.totalHits ?? 0;
      if (hits > 0) {
        player.onScreenDisplay?.setActionBar?.(
          `§b[特斯拉电弧] ⚡ [${bar}§b] ${currentAmmo}/${reserve} §7| §e闪电链命中 §f${hits} §e个目标 (7m递减跃迁)!`
        );
      } else {
        player.onScreenDisplay?.setActionBar?.(
          `§b[特斯拉电弧] ⚡ [${bar}§b] §f${currentAmmo}§7/§a${reserve} §7(等离子充能)`
        );
      }
    } else if (config.id === "apex:mgl") {
      GrenadeEngine.launchGrenade(player, config);
      player.onScreenDisplay?.setActionBar?.(
        `§6[M32 榴弹炮] 🚀 [${bar}§6] §f${currentAmmo}§7/§a${reserve} §e(40mm抛物线榴弹)`
      );
    } else {
      const spreadMult = isOverdrive ? 1.4 : (1.0 + (shotIndexInBurst - 1) * 0.25);
      const rayResult = RaycastEngine.castBullet(player, config, spreadMult, isHeRound);

      if (isOverdrive) {
        player.onScreenDisplay?.setActionBar?.(
          `§4🔥【暴走狂潮 OVERDRIVE】(剩余 ${overdriveSec}s) §e⚡ 无限子弹极速扫射!`
        );
      } else if (rayResult && rayResult.hitResult) {
        const hit = rayResult.hitResult;
        const headText = hit.headshot ? "§c💥 头部暴击!" : "";
        const killText = hit.isFatal ? "§4☠ 击杀" : `§c-${hit.damage} HP`;
        const dist = hit.distance.toFixed(0);

        player.onScreenDisplay?.setActionBar?.(
          `§e[${config.name}] [${bar}§e] ${currentAmmo}/${reserve} §7| §a🎯 命中 §f${hit.targetName} §b(${dist}m) ${headText} ${killText}`
        );

        try {
          player.playSound("apex.gun.hit_flesh", { volume: 0.9, pitch: 1.0 });
        } catch {}
      } else if (isHeRound) {
        player.onScreenDisplay?.setActionBar?.(
          `§e[${config.name}] §6💥 触发高爆烈焰弹! (恶魂威力轰炸) §7[${bar}§e] §f${currentAmmo}§7/§a${reserve}`
        );
      }
    }

    if (currentAmmo <= 0 && !isOverdrive) {
      system.runTimeout(() => {
        ReloadManager.startReload(player, item, targetSlot);
      }, 2);
    }

    return true;
  }

  static resetPlayer(playerId) {
    this.#lastShotTicks.delete(playerId);
    this.#lastMuzzleFeedback.delete(playerId);
    this.#overdriveStates.delete(playerId);
    ReloadManager.cancelReload(playerId);
  }
}
