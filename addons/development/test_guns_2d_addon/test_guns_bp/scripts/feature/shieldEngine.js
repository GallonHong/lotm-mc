import { world, system, EntityDamageCause } from '@minecraft/server';
import { isProtectedTeammate } from './utils/teamRules.js';

export class ShieldEngine {
  static flashCooldowns = new Map(); // playerId -> remainingTicks
  static blindedMobs = new Map();    // entityId -> { entity, remainingTicks, shooterId }

  /**
   * 处理闪盾右键触发强光闪光技能
   * @param {Player} player 
   * @param {ItemStack} item 
   */
  static triggerFlash(player, item) {
    if (!player || !player.isValid()) return false;
    if (!item || item.typeId !== 'test_gun:flash_shield') return false;

    const cd = this.flashCooldowns.get(player.id) || 0;
    if (cd > 0) {
      const remainingSec = (cd / 20).toFixed(1);
      player.onScreenDisplay?.setActionBar?.(`§7[G52 战术闪光充能中... 剩余 ${remainingSec}s]§r`);
      return false;
    }

    // 设置 14 秒冷却
    this.flashCooldowns.set(player.id, 280);

    const dim = player.dimension;
    const pLoc = player.location;
    const viewDir = player.getViewDirection();
    const headLoc = player.getHeadLocation();

    const flashPos = {
      x: headLoc.x + viewDir.x * 0.8,
      y: headLoc.y + viewDir.y * 0.8,
      z: headLoc.z + viewDir.z * 0.8
    };

    // 1. 播放高压闪光与高频耳鸣音效
    try {
      dim.playSound('test_gun.flashbang', flashPos, { volume: 2.5, pitch: 1.0 });
    } catch {}

    // 2. 强光粒子爆发与屏幕剧烈震颤
    try {
      dim.spawnParticle('test_gun:flash_particle_white', flashPos);
      dim.spawnParticle('minecraft:sonic_explosion', flashPos);
      dim.spawnParticle('minecraft:basic_flame_particle', flashPos);
      player.runCommandAsync('camerashake add @s 0.20 0.25 rotational');
    } catch {}

    player.onScreenDisplay?.setActionBar?.('§5⚡【G52 战术超能闪光】§e 强光致盲已释放!§r');

    // 3. 前方 7.0 格 110° 扇形范围真致盲与 AI 瘫痪
    const radius = 7.0;
    try {
      const nearby = dim.getEntities({
        location: pLoc,
        maxDistance: radius
      });

      for (const target of nearby) {
        if (!target || !target.isValid() || target.id === player.id) continue;
        if (target.typeId === 'minecraft:item' || target.typeId === 'minecraft:xp_orb') continue;

        const tLoc = target.location;
        const dx = tLoc.x - pLoc.x;
        const dy = (tLoc.y + 1.0) - (pLoc.y + 1.6);
        const dz = tLoc.z - pLoc.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 0.1 || dist > radius) continue;

        // 视线夹角 (Dot product)
        const toTargetX = dx / dist;
        const toTargetY = dy / dist;
        const toTargetZ = dz / dist;
        const dot = toTargetX * viewDir.x + toTargetY * viewDir.y + toTargetZ * viewDir.z;

        if (dot >= 0.25) {
          // 命中正面扇形！
          try {
            // 1. 原版视觉效果 (对玩家有效)
            target.addEffect('blindness', 70, { amplifier: 0, showParticles: false });
            target.addEffect('darkness', 70, { amplifier: 0, showParticles: false });

            // 2. 彻底定身封锁移动 (Amplifier 255 怪物完全无法走动/位移)
            target.addEffect('slowness', 70, { amplifier: 255, showParticles: false });
            target.addEffect('weakness', 80, { amplifier: 255, showParticles: false });

            // 3. 剥夺怪物仇恨与清除目标
            try {
              target.runCommandAsync('event entity @s minecraft:stop_aggro');
            } catch {}

            // 4. 注册到持续 3.5 秒 (70 ticks) 的致盲眩晕瘫痪队列
            this.blindedMobs.set(target.id, {
              entity: target,
              remainingTicks: 70,
              shooterId: player.id
            });
          } catch {}

          // 物理击退与致盲火花
          try {
            dim.spawnParticle('minecraft:critical_hit_emitter', tLoc);
            target.applyKnockback(toTargetX * 0.5, toTargetZ * 0.5, 0.5, 0.1);
          } catch {}

          // 如果是玩家目标，给予震屏与提示
          try {
            if (target.typeId === 'minecraft:player') {
              target.runCommandAsync('camerashake add @s 0.25 0.30 rotational');
              target.onScreenDisplay?.setActionBar?.('§c⚠ 你被 G52 战术闪盾致盲! 视野与行动力丧失!§r');
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('ShieldEngine flash hit error:', e);
    }

    return true;
  }

  static tick() {
    // 1. 冷却倒计时
    for (const [pId, cd] of this.flashCooldowns.entries()) {
      if (cd <= 1) {
        this.flashCooldowns.delete(pId);
        try {
          const p = world.getAllPlayers().find(x => x.id === pId);
          if (p && p.isValid()) {
            p.onScreenDisplay?.setActionBar?.('§a✔【G52 战术闪盾】高压电容充能完毕!§r');
          }
        } catch {}
      } else {
        this.flashCooldowns.set(pId, cd - 1);
      }
    }

    // 2. 维持怪物致盲混乱、打乱朝向与失能眩晕特效
    if (this.blindedMobs.size > 0) {
      for (const [mId, info] of this.blindedMobs.entries()) {
        try {
          const mob = info.entity;
          if (!mob || !mob.isValid()) {
            this.blindedMobs.delete(mId);
            continue;
          }

          info.remainingTicks--;

          // 每 2 刻强制打乱怪物视角方向 (模拟双目失明乱转与无法瞄准)
          if (info.remainingTicks % 2 === 0) {
            try {
              mob.setRotation({
                x: (Math.random() - 0.5) * 110, // 向上/向下乱望
                y: Math.random() * 360 - 180    // 360° 随机乱转
              });
            } catch {}
          }

          // 头部持续产生眩晕失能粒子 (Dazed / Stunned Stars)
          if (info.remainingTicks % 5 === 0) {
            try {
              const mLoc = mob.location;
              mob.dimension.spawnParticle('minecraft:camera_shoot_explosion', {
                x: mLoc.x,
                y: mLoc.y + 1.8,
                z: mLoc.z
              });
              mob.dimension.spawnParticle('minecraft:critical_hit_emitter', {
                x: mLoc.x + (Math.random() - 0.5) * 0.4,
                y: mLoc.y + 1.9,
                z: mLoc.z + (Math.random() - 0.5) * 0.4
              });
            } catch {}
          }

          if (info.remainingTicks <= 0) {
            this.blindedMobs.delete(mId);
          }
        } catch (err) {
          this.blindedMobs.delete(mId);
        }
      }
    }
  }

  /**
   * 判定盾牌正面格挡减伤 70% 与反甲盾 50% 动能反伤
   * @param {Player} player 
   * @param {Object} damageSource 
   * @param {number} damage 
   */
  static handleDamageReduction(player, damageSource, damage) {
    if (!player || !player.isValid() || damage <= 0) return;

    try {
      const equ = player.getComponent('minecraft:equippable');
      const mainhand = equ?.getEquipment('Mainhand');
      const offhand = equ?.getEquipment('Offhand');

      const isFlash = (mainhand?.typeId === 'test_gun:flash_shield' || offhand?.typeId === 'test_gun:flash_shield');
      const isRiot = (mainhand?.typeId === 'test_gun:riot_shield' || offhand?.typeId === 'test_gun:riot_shield');
      if (!isFlash && !isRiot) return;

      const attacker = damageSource?.damagingEntity || damageSource?.damagingProjectile;

      // 判定攻击方向是否在正面 (前方 200° 大扇形格挡)
      let isFrontal = true;
      if (attacker && attacker.isValid()) {
        const pLoc = player.location;
        const aLoc = attacker.location;
        const viewDir = player.getViewDirection();

        const dx = aLoc.x - pLoc.x;
        const dz = aLoc.z - pLoc.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.1) {
          const dot = (dx / dist) * viewDir.x + (dz / dist) * viewDir.z;
          isFrontal = (dot > -0.25);
        }
      }

      if (!isFrontal) return;

      // 1. 真实恢复 70% 被格挡吸收的血量 (Instant Health Recovery of 70% absorbed damage)
      const health = player.getComponent('minecraft:health');
      if (health) {
        const absorbedAmount = damage * 0.70;
        const nextHp = Math.min(health.effectiveMax, health.currentValue + absorbedAmount);
        health.setCurrentValue(nextHp);
      }

      const pLoc = player.location;

      // 2. 盾牌受击格挡音效与火花粒子
      try {
        player.dimension.playSound('random.anvil_land', pLoc, { volume: 0.8, pitch: 1.8 });
        player.dimension.playSound('item.shield.block', pLoc, { volume: 1.2, pitch: 1.0 });
        player.dimension.spawnParticle('minecraft:crit', { x: pLoc.x, y: pLoc.y + 1.2, z: pLoc.z });
      } catch {}

      // 3. 重装反甲盾 50% 真实动能反伤 (Thorns Reflection)
      if (isRiot && attacker && attacker.isValid() && attacker.id !== player.id) {
        // 如果攻击者是弹射物 (如箭矢/火球)，寻找其发射者主体
        let realTarget = attacker;
        try {
          if (attacker.typeId === 'minecraft:arrow' || attacker.typeId.includes('projectile')) {
            const shooter = attacker.getComponent('minecraft:projectile')?.owner;
            if (shooter && shooter.isValid()) realTarget = shooter;
          }
        } catch {}

        const reflectDmg = Math.max(2.0, damage * 0.50);
        if (isProtectedTeammate(player, realTarget)) return;
        try {
          realTarget.applyDamage(reflectDmg, {
            cause: EntityDamageCause.thorns,
            damagingEntity: player
          });
        } catch {
          try { realTarget.applyDamage(reflectDmg); } catch {}
        }

        try {
          realTarget.dimension.spawnParticle('minecraft:critical_hit_emitter', realTarget.location);
          player.dimension.playSound('random.break', realTarget.location, { volume: 0.8, pitch: 1.4 });
        } catch {}

        player.onScreenDisplay?.setActionBar?.(`§6🛡【重装反甲盾】吸收 70% 伤害，反弹 §e${reflectDmg.toFixed(1)}§6 动能反伤!§r`);
      } else {
        player.onScreenDisplay?.setActionBar?.(`§9🛡【G52 防暴格挡】吸收 70% 伤害!§r`);
      }
    } catch (err) {
      console.warn('handleDamageReduction error:', err);
    }
  }
}
