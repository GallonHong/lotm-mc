import { world, system, EquipmentSlot } from '@minecraft/server';
import { updateActionBar } from './ui.js';

export class JetpackEngine {
  static playerJumpStates = new Map();

  static onTick() {
    const currentTick = system.currentTick;
    const allPlayers = world.getAllPlayers();

    for (const player of allPlayers) {
      if (!player || !player.isValid()) continue;

      let isJetpackEquipped = false;

      try {
        const equippable = player.getComponent('minecraft:equippable');
        if (equippable) {
          const chest = equippable.getEquipment(EquipmentSlot.Chest);
          if (chest && (chest.typeId === 'test_gun:jetpack' || chest.typeId === 'apex:jetpack')) {
            isJetpackEquipped = true;
          }
        }
      } catch {}

      if (!isJetpackEquipped) {
        this.playerJumpStates.delete(player.id);
        continue;
      }

      let state = this.playerJumpStates.get(player.id);
      if (!state) {
        state = { wasJumping: false, lastJumpTick: 0, nextReadyTick: 0 };
        this.playerJumpStates.set(player.id, state);
      }

      const isJumpingNow = player.isJumping;
      const justPressedJump = isJumpingNow && !state.wasJumping;

      if (justPressedJump) {
        const timeSinceLastJump = currentTick - state.lastJumpTick;
        const isAirborne = player.isFalling || timeSinceLastJump <= 12;

        if (isAirborne) {
          if (currentTick >= state.nextReadyTick) {
            this.activateJetThrust(player, currentTick, state);
          } else {
            const remainSec = Math.max(0, (state.nextReadyTick - currentTick) / 20).toFixed(1);
            updateActionBar(player, `§c⚠ 喷气推进器充能中 (剩余 ${remainSec}s)!`);
          }
        }
        state.lastJumpTick = currentTick;
      }

      state.wasJumping = isJumpingNow;
    }
  }

  static activateJetThrust(player, currentTick, state) {
    try {
      state.nextReadyTick = currentTick + 30;

      const viewDir = player.getViewDirection();
      const hSpeed = 0.45;
      const vSpeed = 0.92;

      player.applyImpulse({
        x: viewDir.x * hSpeed,
        y: vSpeed,
        z: viewDir.z * hSpeed
      });

      const dim = player.dimension;
      const loc = player.location;
      const footLoc = { x: loc.x, y: loc.y + 0.1, z: loc.z };

      try {
        dim.spawnParticle('minecraft:basic_flame_particle', footLoc);
        
        dim.spawnParticle('minecraft:lava_particle', footLoc);
        
      } catch {}

      try {
        dim.playSound('mob.ghast.fireball', loc, { volume: 1.2, pitch: 1.3 });
        dim.playSound('firework.launch', loc, { volume: 1.0, pitch: 0.85 });
      } catch {}

      try {
        player.addEffect('slow_falling', 70, { amplifier: 0, showParticles: false });
      } catch {}

      const broke = this.deductDurability(player);
      if (!broke) {
        updateActionBar(player, '§3⚡【离子喷气推进】升空飞升已激活!§r');
      }
    } catch (e) {
      console.warn('JetpackEngine error:', e);
    }
  }

  /**
   * 每次成功推进消耗 1 点耐久。只处理穿在胸甲槽的喷气背包，
   * 不计算耐久附魔的减免概率。
   */
  static deductDurability(player) {
    try {
      const equippable = player.getComponent('minecraft:equippable');
      if (!equippable) return false;

      const chest = equippable.getEquipment(EquipmentSlot.Chest);
      if (!chest || (chest.typeId !== 'test_gun:jetpack' && chest.typeId !== 'apex:jetpack')) {
        return false;
      }

      const durability = chest.getComponent('minecraft:durability');
      if (!durability) return false;

      const nextDamage = (durability.damage || 0) + 1;
      if (nextDamage >= durability.maxDurability) {
        equippable.setEquipment(EquipmentSlot.Chest, undefined);
        player.dimension.playSound('random.break', player.location, { volume: 1.2, pitch: 0.85 });
        updateActionBar(player, '§c⚠ 你的【战术离子喷气背包】耐久耗尽，已损坏!§r');
        return true;
      }

      durability.damage = nextDamage;
      equippable.setEquipment(EquipmentSlot.Chest, chest);
      return false;
    } catch (e) {
      console.warn('JetpackEngine durability error:', e);
      return false;
    }
  }
}
