import { world, system } from "@minecraft/server";

export class JetpackEngine {
  static #playerJumpStates = new Map(); // playerId -> { wasJumping, lastJumpTick, nextReadyTick }

  /**
   * 20 TPS 双击跳跃状态检测与离子喷气推进
   */
  static onTick() {
    const currentTick = system.currentTick;
    const allPlayers = world.getAllPlayers();

    for (const player of allPlayers) {
      if (!player || !player.isValid()) continue;

      const equippable = player.getComponent("minecraft:equippable");
      if (!equippable) continue;

      const chest = equippable.getEquipment("Chest");
      if (chest?.typeId !== "apex:jetpack") {
        this.#playerJumpStates.delete(player.id);
        continue;
      }

      let state = this.#playerJumpStates.get(player.id);
      if (!state) {
        state = { wasJumping: false, lastJumpTick: 0, nextReadyTick: 0 };
        this.#playerJumpStates.set(player.id, state);
      }

      const isJumpingNow = player.isJumping;
      const justPressedJump = isJumpingNow && !state.wasJumping;

      // 判定双击跳跃 (在空中或两次跳跃按键间隔在 10 ticks 内)
      if (justPressedJump) {
        const timeSinceLastJump = currentTick - state.lastJumpTick;
        const isAirborne = player.isFalling || timeSinceLastJump <= 12;

        if (isAirborne) {
          if (currentTick >= state.nextReadyTick) {
            this.#activateJetThrust(player, equippable, chest, currentTick, state);
          } else {
            const remainSec = Math.max(0, (state.nextReadyTick - currentTick) / 20).toFixed(1);
            player.onScreenDisplay?.setActionBar?.(
              `§c⚠ 喷气推进器充能中 (剩余 ${remainSec}s)`
            );
            try {
              player.playSound("apex.gun.dry", { location: player.location, volume: 0.8, pitch: 1.4 });
            } catch {}
          }
        }
        state.lastJumpTick = currentTick;
      }

      state.wasJumping = isJumpingNow;
    }
  }

  /**
   * 激活离子喷气推进飞升 (飞升固定 6~8 格，严禁无限悬浮)
   */
  static #activateJetThrust(player, equippable, chestItem, currentTick, state) {
    try {
      // 1. 设置 1.5 秒冷却时间 (30 ticks，严格杜绝无限连续悬浮)
      state.nextReadyTick = currentTick + 30;

      // 2. 施加向上与朝向动能冲量 (精准飞升 6 ~ 8 格高度)
      const viewDir = player.getViewDirection();
      const hSpeed = 0.42;
      const vSpeed = 0.90;

      player.applyImpulse({
        x: viewDir.x * hSpeed,
        y: vSpeed,
        z: viewDir.z * hSpeed
      });

      // 3. 喷发炽热等离子尾焰粒子 (脚底与背部双重火光)
      const dim = player.dimension;
      const loc = player.location;
      const footLoc = { x: loc.x, y: loc.y + 0.1, z: loc.z };
      const backLoc = { x: loc.x - viewDir.x * 0.3, y: loc.y + 0.9, z: loc.z - viewDir.z * 0.3 };

      try {
        dim.spawnParticle("minecraft:basic_flame_particle", footLoc);
        dim.spawnParticle("minecraft:campfire_smoke_particle", footLoc);
        dim.spawnParticle("minecraft:lava_particle", footLoc);
        dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", footLoc);
        dim.spawnParticle("minecraft:endrod", backLoc);
      } catch {}

      // 4. 播放强劲喷气推进与破空音效
      try {
        player.playSound("firework.launch", { location: loc, volume: 1.0, pitch: 0.85 });
        player.playSound("mob.blaze.breathe", { location: loc, volume: 0.9, pitch: 1.6 });
        player.playSound("mob.ghast.fireball", { location: loc, volume: 0.8, pitch: 1.3 });
      } catch {}

      // 5. 赋予 3.5 秒动能缓降与免摔保护 (防止落地摔伤)
      try {
        player.addEffect("slow_falling", 70, { amplifier: 0, showParticles: false });
      } catch {}

      // 6. 扣除 1 点喷气背包耐久度
      try {
        const durComp = chestItem.getComponent("minecraft:durability");
        if (durComp) {
          const nextDmg = durComp.damage + 1;
          if (nextDmg >= durComp.maxDurability) {
            equippable.setEquipment("Chest", undefined);
            player.playSound("random.break", { location: loc, volume: 1.0, pitch: 0.9 });
            player.onScreenDisplay?.setActionBar?.("§c💥 您的【喷气背包】因耐久耗尽已损坏！");
          } else {
            durComp.damage = nextDmg;
            equippable.setEquipment("Chest", chestItem);
          }
        }
      } catch {}

      player.onScreenDisplay?.setActionBar?.(
        "§6🚀【离子喷气推进】已飞升升空! (充能中 1.5s...)"
      );
    } catch (e) {
      console.warn(`[ApexFirearms] Jetpack thrust error: ${e}`);
    }
  }

  static resetPlayer(playerId) {
    this.#playerJumpStates.delete(playerId);
  }
}
