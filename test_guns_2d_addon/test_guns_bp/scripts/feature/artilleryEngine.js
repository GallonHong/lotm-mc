import { world, system, EntityDamageCause } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';

export class ArtilleryEngine {
  static cooldowns = new Map(); // playerId -> remainingTicks
  static activeBarrages = [];   // Array of active barrage tasks

  /**
   * 打开 SAPI 空袭目标选择菜单
   * @param {Player} player 
   */
  static openMenu(player) {
    if (!player || !player.isValid()) return;

    const cd = this.cooldowns.get(player.id) || 0;
    if (cd > 0) {
      const sec = (cd / 20).toFixed(1);
      player.onScreenDisplay?.setActionBar?.(`§7[火炮阵地装填中... 剩余 ${sec}s]§r`);
      return;
    }

    const pLoc = player.location;
    const viewDir = player.getViewDirection();
    const headLoc = player.getHeadLocation();

    // 1. 预先计算准星瞄准点 (通过射线检测地面)
    let crosshairPos = null;
    try {
      const blockHit = player.dimension.getBlockFromRay(headLoc, viewDir, {
        maxDistance: 80,
        includePassableBlocks: false,
        includeLiquidBlocks: false
      });
      if (blockHit && blockHit.block) {
        crosshairPos = {
          x: blockHit.block.location.x + 0.5,
          y: blockHit.block.location.y + 1.0,
          z: blockHit.block.location.z + 0.5
        };
      }
    } catch {}

    if (!crosshairPos) {
      crosshairPos = {
        x: pLoc.x + viewDir.x * 25,
        y: pLoc.y,
        z: pLoc.z + viewDir.z * 25
      };
    }

    // 2. 预先计算正前方 30 格与 50 格
    const pos30 = {
      x: pLoc.x + viewDir.x * 30,
      y: pLoc.y,
      z: pLoc.z + viewDir.z * 30
    };
    const pos50 = {
      x: pLoc.x + viewDir.x * 50,
      y: pLoc.y,
      z: pLoc.z + viewDir.z * 50
    };

    const form = new ActionFormData();
    form.title('§6📡 战术火炮空袭指挥链路 (SAPI)§r');
    form.body('§7请选择集束迫击炮群的轰炸覆盖区域:\n§8(提示: 12发集束弹群饱和压制，单发5伤，不破坏地形)§r');

    form.button(`§e🎯【准星目标】锁定当前瞄准点\n§8(${crosshairPos.x.toFixed(0)}, ${crosshairPos.y.toFixed(0)}, ${crosshairPos.z.toFixed(0)})`, 'textures/ui/crosshair');
    form.button(`§b📍【中程压制】自身正前方 30 格\n§8(${pos30.x.toFixed(0)}, ${pos30.y.toFixed(0)}, ${pos30.z.toFixed(0)})`, 'textures/ui/magnifying_glass');
    form.button(`§c🚀【远程覆盖】自身正前方 50 格\n§8(${pos50.x.toFixed(0)}, ${pos50.y.toFixed(0)}, ${pos50.z.toFixed(0)})`, 'textures/ui/beacon');

    form.show(player).then(res => {
      if (res.canceled || typeof res.selection !== 'number') return;

      let targetLoc = crosshairPos;
      let modeName = '准星锁定区域';

      if (res.selection === 1) {
        targetLoc = pos30;
        modeName = '正前方 30 格';
      } else if (res.selection === 2) {
        targetLoc = pos50;
        modeName = '正前方 50 格';
      }

      this.startBarrage(player, targetLoc, modeName);
    }).catch(err => {
      console.warn('SAPI form error:', err);
    });
  }

  /**
   * 启动多波次集束火炮地毯轰炸
   */
  static startBarrage(player, centerLoc, modeName) {
    if (!player || !player.isValid() || !centerLoc) return;

    // 5秒测试冷却 (100 ticks)
    this.cooldowns.set(player.id, 100);

    const dim = player.dimension;
    const pId = player.id;

    // 寻找目标区域真实地面高度
    let groundY = centerLoc.y;
    for (let dy = 10; dy >= -15; dy--) {
      try {
        const b = dim.getBlock({ x: Math.floor(centerLoc.x), y: Math.floor(centerLoc.y + dy), z: Math.floor(centerLoc.z) });
        if (b && !b.isAir && !b.isLiquid) {
          groundY = b.location.y + 1.0;
          break;
        }
      } catch {}
    }

    const realCenter = { x: centerLoc.x, y: groundY, z: centerLoc.z };

    // 无线电确认提示与警笛音效
    try {
      player.onScreenDisplay?.setActionBar?.(`§6📡【火炮阵地收到】已锁定【${modeName}】! 12发集束炮群正在覆盖!§r`);
      dim.playSound('test_gun.radio_click', player.location, { volume: 1.5, pitch: 1.0 });
      dim.playSound('ambient.weather.thunder', realCenter, { volume: 1.5, pitch: 1.6 });
    } catch {}

    // 地面红圈标记粒子 (8格大圆环)
    try {
      for (let angle = 0; angle < 360; angle += 20) {
        const rad = (angle * Math.PI) / 180;
        const px = realCenter.x + Math.cos(rad) * 8.0;
        const pz = realCenter.z + Math.sin(rad) * 8.0;
        dim.spawnParticle('test_gun:he_tracer', { x: px, y: realCenter.y + 0.3, z: pz });
        dim.spawnParticle('minecraft:basic_flame_particle', { x: px, y: realCenter.y + 0.3, z: pz });
      }
    } catch {}

    // 创建轰炸任务 (12 发集束炮弹，每隔 5 刻发射一发，持续约 3.5 秒)
    this.activeBarrages.push({
      shooterId: pId,
      dim: dim,
      center: realCenter,
      totalShells: 12,
      shellsFired: 0,
      nextShellTick: 12, // 延迟 0.6 秒第一发落弹
      spreadRadius: 8.0,
      damage: 5.0
    });
  }

  static tick() {
    // 1. 冷却倒计时
    for (const [pId, cd] of this.cooldowns.entries()) {
      if (cd <= 1) {
        this.cooldowns.delete(pId);
        try {
          const p = world.getAllPlayers().find(x => x.id === pId);
          if (p && p.isValid()) {
            p.onScreenDisplay?.setActionBar?.('§a✔【火炮阵地】集束迫击炮装填就绪!§r');
          }
        } catch {}
      } else {
        this.cooldowns.set(pId, cd - 1);
      }
    }

    // 2. 轰炸波次推进
    if (this.activeBarrages.length === 0) return;

    const remaining = [];
    for (const b of this.activeBarrages) {
      try {
        b.nextShellTick--;
        if (b.nextShellTick <= 0) {
          this.dropShell(b);
          b.shellsFired++;
          b.nextShellTick = 5; // 0.25 秒一发
        }

        if (b.shellsFired < b.totalShells) {
          remaining.push(b);
        }
      } catch (err) {
        console.warn('ArtilleryEngine barrage error:', err);
      }
    }
    this.activeBarrages = remaining;
  }

  static dropShell(barrage) {
    const dim = barrage.dim;
    if (!dim) return;

    const cx = barrage.center.x;
    const cy = barrage.center.y;
    const cz = barrage.center.z;
    const radius = barrage.spreadRadius;

    // 8 格半径内随机散布落点
    const rx = cx + (Math.random() - 0.5) * 2 * radius;
    const rz = cz + (Math.random() - 0.5) * 2 * radius;

    // 精确向下探测实际地面实体或方块表面
    let targetY = cy;
    for (let dy = 12; dy >= -15; dy--) {
      try {
        const b = dim.getBlock({ x: Math.floor(rx), y: Math.floor(cy + dy), z: Math.floor(rz) });
        if (b && !b.isAir && !b.isLiquid) {
          targetY = b.location.y + 1.0;
          break;
        }
      } catch {}
    }

    const impactLoc = { x: rx, y: targetY + 0.1, z: rz };

    // 1. 🚀 天降导弹迫击炮尾迹光柱 (从高空直插地面)
    try {
      for (let h = 18; h >= 0; h -= 2.0) {
        dim.spawnParticle('test_gun:he_tracer', { x: rx, y: targetY + h, z: rz });
      }
    } catch {}

    // 2. 💥 逼真地面爆炸火球与白烟粒子 (100% 地面可见)
    try {
      dim.spawnParticle('minecraft:huge_explosion_emitter', impactLoc);
      dim.spawnParticle('minecraft:explosion_manual', impactLoc);
      dim.spawnParticle('minecraft:basic_smoke_particle', impactLoc);
      dim.spawnParticle('minecraft:basic_flame_particle', impactLoc);
      dim.spawnParticle('minecraft:lava_particle', impactLoc);
    } catch {}

    // 3. 真实迫击炮落地轰炸音效
    try {
      dim.playSound('random.explode', impactLoc, { volume: 2.2, pitch: 1.2 + Math.random() * 0.3 });
    } catch {}

    // 4. 5 点范围溅射伤害 (100% 保护地形方块)
    let shooter = null;
    try {
      shooter = world.getAllPlayers().find(p => p.id === barrage.shooterId) || null;
    } catch {}

    const splashRadius = 4.0;
    const shellDmg = barrage.damage || 5.0;

    try {
      const entities = dim.getEntities({
        location: impactLoc,
        maxDistance: splashRadius
      });

      for (const ent of entities) {
        if (!ent || !ent.isValid()) continue;
        if (shooter && ent.id === shooter.id) continue;
        if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;

        try {
          ent.applyDamage(shellDmg, {
            cause: EntityDamageCause.override,
            damagingEntity: (shooter && shooter.isValid()) ? shooter : undefined
          });
        } catch {
          try { ent.applyDamage(shellDmg); } catch {}
        }

        try { ent.setOnFire(2, true); } catch {}

        try {
          const el = ent.location;
          const kx = (el.x - impactLoc.x) * 0.25;
          const kz = (el.z - impactLoc.z) * 0.25;
          ent.applyKnockback(kx, kz, 0.4, 0.15);
        } catch {}
      }
    } catch (err) {
      console.warn('Shell splash error:', err);
    }
  }
}
