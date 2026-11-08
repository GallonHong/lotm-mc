import { world, system, EquipmentSlot, EntityDamageCause } from '@minecraft/server';

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
      const chest = equ.getEquipment(EquipmentSlot.Chest);
      const legs = equ.getEquipment(EquipmentSlot.Legs);
      const feet = equ.getEquipment(EquipmentSlot.Feet);

      // 1. 【夜视系统 (GPNVG-18 / PVS-31 / 战术夜视仪)】
      const headId = head?.typeId || '';
      const hasNightVisionHelmet = (
        headId.includes('armor_night_vision') ||
        (headId.includes('armor_ocf_gpnvg18') && !headId.includes('_up')) ||
        (headId.includes('armor_ca_pvs31') && !headId.includes('_up')) ||
        (headId.includes('armor_ca_pvs_31') && !headId.includes('_up'))
      );

      if (hasNightVisionHelmet) {
        player.addEffect('night_vision', 240, { amplifier: 0, showParticles: false });
        state.nightVision = true;
      } else if (state.nightVision) {
        player.removeEffect('night_vision');
        state.nightVision = false;
      }

      // 2. 【M50 军用三防防毒面具 & 黄蜂面罩】恶劣环境净化（解毒、抗凋零、水下呼吸）
      const feetId = feet?.typeId || '';
      const hasM50 = feetId.includes('armor_m50') || headId.includes('armor_gasmask');
      const isWaspMask = headId.includes('armor_wasp_mask');

      if (hasM50 || isWaspMask) {
        try {
          player.removeEffect('poison');
          player.removeEffect('fatal_poison');
          if (hasM50) {
            player.removeEffect('wither');
            player.addEffect('water_breathing', 100, { amplifier: 0, showParticles: false });
          }
        } catch {}
      }

      // 3. 【机动性战术装备】移速与机动
      // 3.1 JPC 2.0 轻量特战背心：常驻轻巧机动 (+10% 移速)
      const chestId = chest?.typeId || '';
      if (chestId.includes('armor_jpc_2')) {
        player.addEffect('speed', 40, { amplifier: 0, showParticles: false });
      }

      // 3.2 军用科技 HG2 全身重甲：常驻 +8 HP 护盾心与负重轻度减速
      if (chestId.includes('armor_mlt_hg2')) {
        player.addEffect('absorption', 40, { amplifier: 1, showParticles: false });
        player.addEffect('slowness', 40, { amplifier: 0, showParticles: false });
      }

      // 3.3 特战作战裤：疾跑滑步冲刺
      const legsId = legs?.typeId || '';
      if (legsId.includes('armor_immortal_pants') && player.isSprinting) {
        player.addEffect('speed', 25, { amplifier: 0, showParticles: false });
      }

      // 4. 【堡垒重装防弹衣】常态低血量濒死护盾监控 (放宽阈值至 <= 8 HP)
      if (chestId.includes('armor_mob_chest')) {
        const health = player.getComponent('minecraft:health');
        if (health && health.currentValue <= 8) {
          this.triggerEmergencyShield(player, state);
        }
      }
    } catch (err) {
      console.warn('ArmorEngine tick error:', err);
    }
  }

  /**
   * 触发堡垒重装防弹衣【濒死核心护盾】(大幅补偿增强: 6 颗金心 + Resistance II)
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
    // 冷却时间 50 秒 (1000 ticks)
    if (currentTick - state.lastShieldTick < 1000) {
      return;
    }
    state.lastShieldTick = currentTick;

    try {
      // 赋予 6 颗金心吸收护盾 (Absorption V 12秒) 与强力抗性提升 (Resistance II 6秒)
      player.addEffect('absorption', 240, { amplifier: 5, showParticles: false });
      player.addEffect('resistance', 120, { amplifier: 1, showParticles: false });

      const pLoc = player.location;
      const dim = player.dimension;

      // 震撼音效与粒子
      dim.playSound('beacon.activate', pLoc, { volume: 1.5, pitch: 1.2 });
      dim.playSound('random.totem', pLoc, { volume: 0.8, pitch: 1.5 });
      dim.spawnParticle('minecraft:totem_particle', { x: pLoc.x, y: pLoc.y + 1.0, z: pLoc.z });
      dim.spawnParticle('minecraft:sonic_explosion', { x: pLoc.x, y: pLoc.y + 0.5, z: pLoc.z });

      player.onScreenDisplay?.setActionBar?.('§6🛡【堡垒重装·超频护盾】濒死超能装甲超频过载！激活6颗金心护盾并获得抗性强化！§r');
    } catch (e) {
      console.warn('ArmorEngine triggerEmergencyShield error:', e);
    }
  }

  /**
   * 实体受击事件处理 (处理跌落减震、爆炸破片拦截、近战反伤、受创触发濒死护盾)
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
      const attacker = damageSource?.damagingEntity;
      const chestId = chest?.typeId || '';

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

      // 2. 【特警特训防弹衣】破片拦截（大幅补偿：吸收 40% 爆炸伤害）
      if ((cause === 'entityExplosion' || cause === 'blockExplosion') && chestId.includes('armor_immortal_vest')) {
        const health = player.getComponent('minecraft:health');
        if (health) {
          const absorbed = Math.max(0.5, Math.round(damage * 0.40 * 10) / 10);
          const newHp = Math.min(health.effectiveMax, health.currentValue + absorbed);
          health.setCurrentValue(newHp);
          player.dimension.spawnParticle('minecraft:crit', player.location);
          player.onScreenDisplay?.setActionBar?.(`§9🛡【特警防弹衣】破片防弹层吸收 ${absorbed.toFixed(1)} 点爆炸伤害！§r`);
        }
      }

      // 3. 【艾斯链甲骷髅战术背心】反弹 30% 近战穿透刺伤
      if ((cause === 'entityAttack' || cause === 'entitySwipe') && chestId.includes('armor_ala_spc') && attacker && attacker.isValid()) {
        try {
          const reflectDmg = Math.max(1.0, Math.round(damage * 0.30 * 10) / 10);
          attacker.applyDamage(reflectDmg, { cause: EntityDamageCause.thorns, damagingEntity: player });
          player.dimension.spawnParticle('minecraft:critical_hit_emitter', attacker.location);
          player.dimension.playSound('random.anvil_land', player.location, { volume: 0.7, pitch: 2.2 });
        } catch {}
      }

      // 4. 【堡垒重装防弹衣】受重击时如果生命降至危险线，触发濒死护盾
      if (chestId.includes('armor_mob_chest')) {
        const health = player.getComponent('minecraft:health');
        if (health && health.currentValue <= 8) {
          this.triggerEmergencyShield(player);
        }
      }
    } catch (err) {
      console.warn('ArmorEngine handleHurt error:', err);
    }
  }
}
