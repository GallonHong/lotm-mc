import { world, system, EntityDamageCause } from '@minecraft/server';

export class ShieldEngine {
  static flashCooldowns = new Map(); // playerId -> remainingTicks

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

    // 3. 前方 6.0 格 90° 扇形范围致盲与瘫痪
    const radius = 6.0;
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

        // 视线夹角 (Dot product) - 判定是否在前方 90° 锥形范围
        const toTargetX = dx / dist;
        const toTargetY = dy / dist;
        const toTargetZ = dz / dist;
        const dot = toTargetX * viewDir.x + toTargetY * viewDir.y + toTargetZ * viewDir.z;

        if (dot >= 0.35) {
          // 命中正面扇形
          try {
            // 失明 3.5 秒 (70 ticks)
            target.addEffect('blindness', 70, { amplifier: 0, showParticles: false });
            // 黑暗 3.5 秒 (70 ticks)
            target.addEffect('darkness', 70, { amplifier: 0, showParticles: false });
            // 重度缓慢 3.0 秒 (60 ticks) - 移速降低
            target.addEffect('slowness', 60, { amplifier: 1, showParticles: false });
            // 虚弱 4.0 秒 (80 ticks) - 攻击削弱
            target.addEffect('weakness', 80, { amplifier: 1, showParticles: false });
          } catch {}

          // 播放被闪光致盲粒子与击退定身
          try {
            dim.spawnParticle('minecraft:critical_hit_emitter', tLoc);
            target.applyKnockback(toTargetX * 0.4, toTargetZ * 0.4, 0.4, 0.1);
          } catch {}

          // 如果是玩家目标，额外给予震屏
          try {
            if (target.typeId === 'minecraft:player') {
              target.runCommandAsync('camerashake add @s 0.25 0.30 rotational');
              target.onScreenDisplay?.setActionBar?.('§c⚠ 你被 G52 战术闪盾致盲! 视野丧失!§r');
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
  }

  /**
   * 判定盾牌正面格挡减伤 70%
   * @param {Player} player 
   * @param {Entity} attacker 
   * @param {number} damage 
   * @returns {number} 最终受到的伤害
   */
  static handleDamageReduction(player, attacker, damage) {
    if (!player || !player.isValid()) return damage;

    try {
      const equ = player.getComponent('minecraft:equippable');
      const mainhand = equ?.getEquipment('Mainhand');
      const offhand = equ?.getEquipment('Offhand');

      const hasShield = (mainhand?.typeId === 'test_gun:flash_shield' || offhand?.typeId === 'test_gun:flash_shield');
      if (!hasShield) return damage;

      // 判定攻击方向是否在正面
      if (attacker && attacker.isValid()) {
        const pLoc = player.location;
        const aLoc = attacker.location;
        const viewDir = player.getViewDirection();

        const dx = aLoc.x - pLoc.x;
        const dz = aLoc.z - pLoc.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.1) {
          const dot = (dx / dist) * viewDir.x + (dz / dist) * viewDir.z;
          if (dot > 0.2) {
            // 正面格挡成功！减免 70% 伤害
            const reducedDmg = Math.max(1, damage * 0.30);
            try {
              player.dimension.playSound('random.anvil_land', pLoc, { volume: 0.6, pitch: 2.0 });
              player.dimension.spawnParticle('minecraft:crit', { x: pLoc.x, y: pLoc.y + 1.2, z: pLoc.z });
              player.onScreenDisplay?.setActionBar?.(`§9🛡【G52 防暴格挡】吸收 70% 伤害! (受到 ${reducedDmg.toFixed(1)} 伤)§r`);
            } catch {}
            return reducedDmg;
          }
        }
      }
    } catch {}

    return damage;
  }
}
