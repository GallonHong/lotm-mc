import { world, system, EntityDamageCause } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';

export class ArtilleryEngine {
  static cooldowns = new Map(); // playerId -> remainingTicks
  static activeBarrages = [];   // Array of active barrage tasks
  static fallingShells = [];    // Array of shells currently in mid-air descent
  static isMenuOpen = new Set(); // playerId lock to prevent duplicate popups
  static lastOpenTime = new Map(); // playerId -> timestamp for debounce

  /**
   * 打开 SAPI 空袭目标选择菜单 (带严格防重复弹窗机制)
   * @param {Player} player 
   */
  static openMenu(player) {
    if (!player || !player.isValid()) return;
    if (this.isMenuOpen.has(player.id)) return;

    const now = Date.now();
    const last = this.lastOpenTime.get(player.id) || 0;
    if (now - last < 800) return; // 800ms 严格防抖
    this.lastOpenTime.set(player.id, now);

    const cd = this.cooldowns.get(player.id) || 0;
    if (cd > 0) {
      const sec = (cd / 20).toFixed(1);
      player.onScreenDisplay?.setActionBar?.(`§7[火炮阵地装填中... 剩余 ${sec}s]§r`);
      return;
    }

    this.isMenuOpen.add(player.id);

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
    form.body('§7请选择集束迫击炮群的轰炸覆盖区域:\n§8(提示: 24发迫击炮弹从天而降，单发5伤，原版TNT特效，不破坏地形)§r');

    form.button(`§e🎯【准星目标】锁定当前瞄准点\n§8(${crosshairPos.x.toFixed(0)}, ${crosshairPos.y.toFixed(0)}, ${crosshairPos.z.toFixed(0)})`, 'textures/ui/crosshair');
    form.button(`§b📍【中程压制】自身正前方 30 格\n§8(${pos30.x.toFixed(0)}, ${pos30.y.toFixed(0)}, ${pos30.z.toFixed(0)})`, 'textures/ui/magnifying_glass');
    form.button(`§c🚀【远程覆盖】自身正前方 50 格\n§8(${pos50.x.toFixed(0)}, ${pos50.y.toFixed(0)}, ${pos50.z.toFixed(0)})`, 'textures/ui/beacon');

    form.show(player).then(res => {
      this.isMenuOpen.delete(player.id);
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
    }).catch(() => {
      this.isMenuOpen.delete(player.id);
    });
  }

  /**
   * 轰炸技能消耗 10 点枪械耐久
   */
  static deductSkillDurability(player, amount = 10) {
    if (!player || !player.isValid()) return;
    try {
      const equippable = player.getComponent('minecraft:equippable');
      if (!equippable) return;

      const mainhand = equippable.getEquipment('Mainhand');
      if (!mainhand || mainhand.typeId !== 'test_gun:ak47_commander') return;

      const durComp = mainhand.getComponent('minecraft:durability');
      if (!durComp) return;

      const currentDamage = durComp.damage || 0;
      const maxDur = durComp.maxDurability || 2100;
      const nextDamage = currentDamage + amount;

      if (nextDamage >= maxDur) {
        equippable.setEquipment('Mainhand', undefined);
        player.dimension.playSound('random.break', player.location, { volume: 1.2, pitch: 0.85 });
        player.onScreenDisplay?.setActionBar?.('§c⚠ 你的【AK-47 · 战术指挥官】已磨损报废!§r');
      } else {
        durComp.damage = nextDamage;
        equippable.setEquipment('Mainhand', mainhand);
      }
    } catch (err) {
      console.warn('deductSkillDurability error:', err);
    }
  }

  /**
   * 启动多波次集束火炮地毯轰炸
   */
  static startBarrage(player, centerLoc, modeName) {
    if (!player || !player.isValid() || !centerLoc) return;

    // 5秒测试冷却 (100 ticks)
    this.cooldowns.set(player.id, 100);
    this.deductSkillDurability(player, 10);

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
      player.onScreenDisplay?.setActionBar?.(`§6📡【火炮阵地收到】已锁定【${modeName}】! 24发迫击炮弹正在自天顶下落!§r`);
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
      totalShells: 24,
      shellsFired: 0,
      nextShellTick: 6,
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

    // 2. 推进正在下落的炸弹物理与空中下落粒子 (Falling Shells)
    if (this.fallingShells.length > 0) {
      const nextFalling = [];
      for (const s of this.fallingShells) {
        try {
          s.y -= s.speed;

          // 炸弹从天而降的简单自然粒子：头部火光 + 尾部轻烟 (Clean falling bomb trail)
          const shellPos = { x: s.x, y: s.y, z: s.z };
          const trailPos = { x: s.x, y: s.y + 1.2, z: s.z };
          try {
            s.dim.spawnParticle('minecraft:basic_flame_particle', shellPos);
            s.dim.spawnParticle('test_gun:he_tracer', shellPos);
            s.dim.spawnParticle('minecraft:basic_smoke_particle', trailPos);
          } catch {}

          if (s.y <= s.targetY) {
            this.explodeShell(s);
          } else {
            nextFalling.push(s);
          }
        } catch (err) {
          // safely ignore unloaded chunk
          if (err.name !== 'LocationInUnloadedChunkError') console.warn('Falling shell error:', err);
        }
      }
      this.fallingShells = nextFalling;
    }

    // 3. 轰炸批次生成落弹
    if (this.activeBarrages.length === 0) return;

    const remaining = [];
    for (const b of this.activeBarrages) {
      try {
        b.nextShellTick--;
        if (b.nextShellTick <= 0) {
          this.spawnFallingShell(b);
          b.shellsFired++;
          b.nextShellTick = 4; // 0.20 秒下一发 (24发集束炮弹密集倾泻)
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

  /**
   * 在天顶生成一枚真实下落的炸弹 (Sky Spawn)
   */
  static spawnFallingShell(barrage) {
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
    for (let dy = 8; dy >= -10; dy--) {
      try {
        const b = dim.getBlock({ x: Math.floor(rx), y: Math.floor(cy + dy), z: Math.floor(rz) });
        if (b && !b.isAir && !b.isLiquid) {
          targetY = b.location.y + 1.0;
          break;
        }
      } catch {}
    }

    // 从高空 24 格处生成炸弹，以 3.0 格/刻的速度呼啸砸向地面 (约 8 刻 = 0.4 秒着陆)
    this.fallingShells.push({
      dim: dim,
      shooterId: barrage.shooterId,
      x: rx,
      y: targetY + 24.0,
      z: rz,
      targetY: targetY + 0.1,
      speed: 3.0,
      damage: barrage.damage || 5.0
    });
  }

  /**
   * 炸弹触地引发原版经典 TNT 爆炸
   */
  static explodeShell(shell) {
    const dim = shell.dim;
    const impactLoc = { x: shell.x, y: shell.targetY, z: shell.z };

    // 1. 原版经典 TNT 爆炸特效 (minecraft:huge_explosion_emitter + explosion_manual + basic_smoke_particle)
    try {
      dim.spawnParticle('minecraft:huge_explosion_emitter', impactLoc);
      dim.spawnParticle('minecraft:explosion_manual', impactLoc);
      dim.spawnParticle('minecraft:basic_smoke_particle', impactLoc);
    } catch {}

    // 2. 战术迫击炮爆鸣 (适中音量，温和舒适不刺耳)
    try {
      dim.playSound('test_gun.artillery_explode', impactLoc, {
        volume: 1.2,
        pitch: 0.95 + Math.random() * 0.15
      });
    } catch {}

    // 3. 5 点范围溅射伤害 (100% 保护地形方块)
    let shooter = null;
    try {
      shooter = world.getAllPlayers().find(p => p.id === shell.shooterId) || null;
    } catch {}

    const splashRadius = 4.0;
    const shellDmg = shell.damage || 5.0;

    try {
      const entities = dim.getEntities({
        location: impactLoc,
        maxDistance: splashRadius
      });

      for (const ent of entities) {
        if (!ent || !ent.isValid()) continue;
        if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;
        // 无差别地毯轰炸：自身进入轰炸区同样受到迫击炮溅射伤害与击退

        try {
          ent.applyDamage(shellDmg, {
            cause: EntityDamageCause.override,
            damagingEntity: (shooter && shooter.isValid()) ? shooter : undefined
          });
        } catch {
          try { ent.applyDamage(shellDmg); } catch {}
        }

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
