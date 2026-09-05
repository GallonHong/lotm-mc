import { world, system, EquipmentSlot } from '@minecraft/server';

export class ArmorEngine {
  static playerStates = new Map(); // playerId -> { nightVision: boolean, lastShieldTick: number }

  /**
   * 清理离开玩家的缓存
   */
  static clearPlayer(playerId) {
    this.playerStates.delete(playerId);
  }

  /**
   * 玩家周期性被动循环 (每刻或每数刻调用)
   * @param {Player} player 
   */
  static tick(player) {
    if (!player || !player.isValid()) return;

    try {
      const equ = player.getComponent('minecraft:equippable');
      if (!equ) return;

      const pId = player.id;
      let state = this.playerStates.get(pId);
      if (!state) {
        state = { nightVision: false, lastShieldTick: 0 };
        this.playerStates.set(pId, state);
      }

      const head = equ.getEquipment(EquipmentSlot.Head);
      const legs = equ.getEquipment(EquipmentSlot.Legs);

      // 1. 【战术侦察夜视仪】佩戴自动获得夜视效果，脱下自动移除
      const isNightVision = head && head.typeId.includes('armor_night_vision');
      if (isNightVision) {
        // 持续刷新夜视效果 (220 ticks = 11秒，无粒子干扰)
        player.addEffect('night_vision', 220, { amplifier: 0, showParticles: false });
        state.nightVision = true;
      } else if (state.nightVision) {
        // 脱下夜视仪，立即移除夜视效果
        player.removeEffect('night_vision');
        state.nightVision = false;
      }

      // 2. 【野战工兵战术面罩】恶劣环境净化（快速解毒）
      const isWaspMask = head && head.typeId.includes('armor_wasp_mask');
      if (isWaspMask) {
        try {
          player.removeEffect('poison');
          player.removeEffect('fatal_poison');
        } catch {}
      }

      // 3. 【特战作战裤】滑步机动（疾跑轻微移速加成）
      const isImmortalPants = legs && legs.typeId.includes('armor_immortal_pants');
      if (isImmortalPants && player.isSprinting) {
        player.addEffect('speed', 25, { amplifier: 0, showParticles: false });
      }

      // 4. 【堡垒重装防弹衣】常态低血量濒死护盾监控（如果尚未触发）
      const chest = equ.getEquipment(EquipmentSlot.Chest);
      if (chest && chest.typeId.includes('armor_mob_chest')) {
        const health = player.getComponent('minecraft:health');
        if (health && health.currentValue <= 6) {
          this.triggerEmergencyShield(player, state);
        }
      }
    } catch (err) {
      console.warn('ArmorEngine tick error:', err);
    }
  }

  /**
   * 触发堡垒重装防弹衣【濒死护盾】
   * @param {Player} player 
   * @param {Object} [state] 
   */
  static triggerEmergencyShield(player, state) {
    if (!player || !player.isValid()) return;

    if (!state) {
      state = this.playerStates.get(player.id);
      if (!state) {
        state = { nightVision: false, lastShieldTick: 0 };
        this.playerStates.set(player.id, state);
      }
    }

    const currentTick = system.currentTick;
    // 冷却时间 60 秒 (1200 ticks)
    if (currentTick - state.lastShieldTick < 1200) {
      return;
    }
    state.lastShieldTick = currentTick;

    try {
      // 赋予 4 颗金心吸收护盾 (Absorption IV 10秒) 与短暂抗性提升 (Resistance II 5秒)
      player.addEffect('absorption', 200, { amplifier: 3, showParticles: false });
      player.addEffect('resistance', 100, { amplifier: 1, showParticles: false });

      const pLoc = player.location;
      const dim = player.dimension;

      // 震撼音效与粒子
      dim.playSound('beacon.activate', pLoc, { volume: 1.5, pitch: 1.2 });
      dim.playSound('random.totem', pLoc, { volume: 0.8, pitch: 1.5 });
      dim.spawnParticle('minecraft:totem_particle', { x: pLoc.x, y: pLoc.y + 1.0, z: pLoc.z });
      dim.spawnParticle('minecraft:sonic_explosion', { x: pLoc.x, y: pLoc.y + 0.5, z: pLoc.z });

      player.onScreenDisplay?.setActionBar?.('§6🛡【堡垒重装·核心护盾】濒死超能护盾过载激活！吸收伤害并获得防御强化！§r');
    } catch (e) {
      console.warn('ArmorEngine triggerEmergencyShield error:', e);
    }
  }

  /**
   * 实体受击事件处理 (处理跌落减震、爆炸破片拦截、受创触发濒死护盾)
   * @param {Player} player 
   * @param {Object} damageSource 
   * @param {number} damage 
   */
  static handleHurt(player, damageSource, damage) {
    if (!player || !player.isValid() || damage <= 0) return;

    try {
      const equ = player.getComponent('minecraft:equippable');
      if (!equ) return;

      const chest = equ.getEquipment(EquipmentSlot.Chest);
      const feet = equ.getEquipment(EquipmentSlot.Feet);
      const cause = damageSource?.cause;

      // 1. 【野战工兵军靴】缓降防滑（吸收 60% 跌落摔伤）
      if (cause === 'fall' && feet && feet.typeId.includes('armor_wasp_boots')) {
        const health = player.getComponent('minecraft:health');
        if (health) {
          const absorbed = Math.max(0.5, Math.round(damage * 0.60 * 10) / 10);
          const newHp = Math.min(health.effectiveMax, health.currentValue + absorbed);
          health.setCurrentValue(newHp);
          player.dimension.spawnParticle('minecraft:cloud', player.location);
          player.dimension.playSound('step.cloth', player.location, { volume: 1.0, pitch: 0.8 });
          player.onScreenDisplay?.setActionBar?.(`§b🪂【工兵军靴】减震气垫吸收 ${absorbed.toFixed(1)} 点跌落伤害！§r`);
        }
      }

      // 2. 【特警特训防弹衣】破片拦截（吸收 30% 爆炸伤害）
      if ((cause === 'entityExplosion' || cause === 'blockExplosion') && chest && chest.typeId.includes('armor_immortal_vest')) {
        const health = player.getComponent('minecraft:health');
        if (health) {
          const absorbed = Math.max(0.5, Math.round(damage * 0.30 * 10) / 10);
          const newHp = Math.min(health.effectiveMax, health.currentValue + absorbed);
          health.setCurrentValue(newHp);
          player.dimension.spawnParticle('minecraft:crit', player.location);
          player.onScreenDisplay?.setActionBar?.(`§9🛡【特警防弹衣】破片防弹层吸收 ${absorbed.toFixed(1)} 点爆炸伤害！§r`);
        }
      }

      // 3. 【堡垒重装防弹衣】受重击时如果生命降至危险线，触发濒死护盾
      if (chest && chest.typeId.includes('armor_mob_chest')) {
        const health = player.getComponent('minecraft:health');
        if (health && health.currentValue <= 6) {
          this.triggerEmergencyShield(player);
        }
      }
    } catch (err) {
      console.warn('ArmorEngine handleHurt error:', err);
    }
  }
}