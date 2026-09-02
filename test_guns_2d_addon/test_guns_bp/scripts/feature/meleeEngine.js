import { world, system, EntityDamageCause } from '@minecraft/server';

/**
 * 战术近战冷兵器引擎 (Melee Combat Engine)
 * - 普通/优良/稀有：纯冷兵器特性 (背刺暴击/钝击震颤/重劈破甲)
 * - 史诗 (Epic)：真·横扫之刃 + 右键专属主动战术技能 (旋风横斩 / 居合拔刀斩)
 */
export class MeleeEngine {
  static cooldowns = new Map(); // player.id_weapon -> timestamp(ms)
  static bleedingTargets = new Map(); // entity.id -> remainingTicks

  static init() {
    system.runInterval(() => {
      this.tickBleeding();
    }, 1);
  }

  static tickBleeding() {
    for (const [entId, info] of this.bleedingTargets.entries()) {
      info.ticks--;
      if (info.ticks % 20 === 0) {
        try {
          const entity = world.getEntity(entId);
          if (entity && entity.isValid()) {
            entity.applyDamage(2.0, { cause: EntityDamageCause.magic });
            entity.dimension.spawnParticle('minecraft:critical_hit_emitter', entity.location);
          } else {
            this.bleedingTargets.delete(entId);
          }
        } catch {
          this.bleedingTargets.delete(entId);
        }
      }
      if (info.ticks <= 0) {
        this.bleedingTargets.delete(entId);
      }
    }
  }

  /**
   * 处理近战武器命中实体 (EntityHitEntity)
   * @param {Player} player 
   * @param {Entity} target 
   */
  static handleEntityHit(player, target) {
    if (!player || !player.isValid() || !target || !target.isValid()) return;

    try {
      const equ = player.getComponent('minecraft:equippable');
      const mainhand = equ?.getEquipment('Mainhand');
      if (!mainhand) return;

      const typeId = mainhand.typeId;
      const pLoc = player.location;
      const tLoc = target.location;
      const viewDir = player.getViewDirection();

      // 1. 军用格斗匕首 (Combat Knife) - 潜行致命背刺
      if (typeId === 'test_gun:combat_knife') {
        try { player.dimension.playSound('test_gun.melee_hit', pLoc, { volume: 0.8, pitch: 1.2 }); } catch {}
        if (player.isSneaking) {
          try {
            const tView = target.getViewDirection ? target.getViewDirection() : { x: 0, z: 0 };
            const dot = viewDir.x * tView.x + viewDir.z * tView.z;
            if (dot > 0.4) {
              target.applyDamage(8.0, { cause: EntityDamageCause.entityAttack, damagingEntity: player });
              player.dimension.spawnParticle('minecraft:critical_hit_emitter', tLoc);
              player.dimension.playSound('random.break', pLoc, { volume: 0.9, pitch: 1.8 });
              player.onScreenDisplay?.setActionBar?.('§c🗡【潜行背刺暗杀】触发 300% 致命暴击!§r');
            }
          } catch {}
        }
      }

      // 2. 工兵战术破拆铲 (Tactical Shovel) - 钝击破盾震颤
      else if (typeId === 'test_gun:tactical_shovel') {
        try {
          player.dimension.playSound('random.anvil_land', pLoc, { volume: 0.6, pitch: 2.2 });
          target.addEffect('slowness', 40, { amplifier: 1, showParticles: true });
        } catch {}
      }

      // 3. 战术突击破障斧 (Tactical Axe) - 重劈破甲
      else if (typeId === 'test_gun:tactical_axe') {
        try {
          player.dimension.playSound('random.break', pLoc, { volume: 0.8, pitch: 1.2 });
          target.applyDamage(3.0, { cause: EntityDamageCause.override, damagingEntity: player });
          target.applyKnockback(viewDir.x, viewDir.z, 0.8, 0.2);
        } catch {}
      }

      // 4. 尼泊尔库克锐弯刀 (Kukri Machete - 史诗) - 真·横扫之刃 + 流血割裂
      else if (typeId === 'test_gun:kukri_machete') {
        try { player.dimension.playSound('test_gun.melee_slash', pLoc, { volume: 1.0, pitch: 1.0 }); } catch {}
        this.performSweepingBlade(player, target, 12.0, 4.0, true);
      }

      // 5. 战术冷钢黑刃武士刀 (Katana - 史诗) - 真·横扫之刃
      else if (typeId === 'test_gun:katana') {
        try { player.dimension.playSound('test_gun.katana_slash', pLoc, { volume: 1.0, pitch: 1.0 }); } catch {}
        this.performSweepingBlade(player, target, 14.0, 4.5, false);
      }
    } catch (err) {
      console.warn('handleEntityHit error:', err);
    }
  }

  /**
   * 执行真实横扫之刃群攻 (True Sweeping Blade)
   */
  static performSweepingBlade(player, primaryTarget, sweepDmg, radius, applyBleed = false) {
    try {
      const pLoc = player.location;
      const viewDir = player.getViewDirection();

      // 横扫月牙刀光
      const sweepLoc = {
        x: pLoc.x + viewDir.x * 1.5,
        y: pLoc.y + 1.2,
        z: pLoc.z + viewDir.z * 1.5
      };
      player.dimension.spawnParticle('minecraft:sweep_attack', sweepLoc);

      if (applyBleed && primaryTarget && primaryTarget.isValid()) {
        this.bleedingTargets.set(primaryTarget.id, { ticks: 60 });
      }

      const nearby = player.dimension.getEntities({
        location: pLoc,
        maxDistance: radius
      });

      for (const ent of nearby) {
        if (!ent || !ent.isValid() || ent.id === player.id || ent.id === primaryTarget?.id) continue;
        if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;

        const eLoc = ent.location;
        const dx = eLoc.x - pLoc.x;
        const dz = eLoc.z - pLoc.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.1) {
          const dot = (dx / dist) * viewDir.x + (dz / dist) * viewDir.z;
          if (dot > 0.25) {
            try {
              ent.applyDamage(sweepDmg * 0.85, { cause: EntityDamageCause.entityAttack, damagingEntity: player });
              ent.dimension.spawnParticle('minecraft:critical_hit_emitter', eLoc);
              if (applyBleed) {
                this.bleedingTargets.set(ent.id, { ticks: 60 });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn('performSweepingBlade error:', err);
    }
  }

  /**
   * 处理史诗近战右键主动技能 (ItemUse / ItemStartUse)
   * @param {Player} player 
   * @param {ItemStack} item 
   */
  static handleSkillUse(player, item) {
    if (!player || !player.isValid() || !item) return;

    const typeId = item.typeId;
    const pId = player.id;
    const cdKey = `${pId}_${typeId}`;
    const now = Date.now();

    const cdEnd = this.cooldowns.get(cdKey) || 0;
    if (now < cdEnd) {
      const remaining = Math.max(1, Math.ceil((cdEnd - now) / 1000));
      player.onScreenDisplay?.setActionBar?.(`§e⏳ 战术技能冷却中... (${remaining}s)§r`);
      return;
    }

    const pLoc = player.location;
    const viewDir = player.getViewDirection();

    // 1. 尼泊尔库克锐弯刀 - 【旋风横斩 (Whirlwind Slash)】
    if (typeId === 'test_gun:kukri_machete') {
      this.cooldowns.set(cdKey, now + 5000); // 5秒绝对时间冷却

      try {
        player.dimension.playSound('test_gun.melee_slash', pLoc, { volume: 1.2, pitch: 0.9 });
        player.dimension.playSound('random.explode', pLoc, { volume: 0.5, pitch: 2.0 });

        // 前冲突进
        player.applyKnockback(viewDir.x, viewDir.z, 1.4, 0.15);

        // 360° 周身横扫刀光粒子环
        for (let a = 0; a < 360; a += 45) {
          const rad = (a * Math.PI) / 180;
          const px = pLoc.x + Math.cos(rad) * 2.0;
          const pz = pLoc.z + Math.sin(rad) * 2.0;
          player.dimension.spawnParticle('minecraft:sweep_attack', { x: px, y: pLoc.y + 1.0, z: pz });
        }

        const targets = player.dimension.getEntities({
          location: pLoc,
          maxDistance: 4.5
        });

        for (const ent of targets) {
          if (!ent || !ent.isValid() || ent.id === player.id) continue;
          if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;

          try {
            ent.applyDamage(18.0, { cause: EntityDamageCause.entityAttack, damagingEntity: player });
            const el = ent.location;
            ent.applyKnockback(el.x - pLoc.x, el.z - pLoc.z, 1.2, 0.35);
            ent.dimension.spawnParticle('minecraft:critical_hit_emitter', el);
          } catch {}
        }

        player.onScreenDisplay?.setActionBar?.('§5🪝【旋风横斩】释放！对周身群怪造成 18 点重击并击飞!§r');
      } catch (err) {
        console.warn('Whirlwind slash error:', err);
      }
    }

    // 2. 战术冷钢黑刃武士刀 - 【居合·疾影拔刀斩 (Iaido Dash Slash)】
    else if (typeId === 'test_gun:katana') {
      this.cooldowns.set(cdKey, now + 5000); // 5秒绝对时间冷却

      try {
        player.dimension.playSound('test_gun.katana_slash', pLoc, { volume: 1.4, pitch: 1.1 });
        player.dimension.playSound('random.anvil_land', pLoc, { volume: 0.6, pitch: 2.2 });

        // 极速向前闪刺突进 7 格
        player.applyKnockback(viewDir.x, viewDir.z, 2.8, 0.1);

        // 沿突刺轨迹生成残影与剑芒粒子
        for (let d = 1; d <= 7; d += 1) {
          const stepLoc = {
            x: pLoc.x + viewDir.x * d,
            y: pLoc.y + 1.0,
            z: pLoc.z + viewDir.z * d
          };
          player.dimension.spawnParticle('minecraft:sweep_attack', stepLoc);
          player.dimension.spawnParticle('minecraft:critical_hit_emitter', stepLoc);
        }

        // 突刺路径上的所有敌人受到 22 点居合斩杀
        const endLoc = {
          x: pLoc.x + viewDir.x * 4.0,
          y: pLoc.y,
          z: pLoc.z + viewDir.z * 4.0
        };
        const targets = player.dimension.getEntities({
          location: endLoc,
          maxDistance: 5.0
        });

        for (const ent of targets) {
          if (!ent || !ent.isValid() || ent.id === player.id) continue;
          if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;

          try {
            ent.applyDamage(22.0, { cause: EntityDamageCause.entityAttack, damagingEntity: player });
            ent.addEffect('weakness', 60, { amplifier: 1, showParticles: true });
            ent.dimension.spawnParticle('minecraft:critical_hit_emitter', ent.location);
          } catch {}
        }

        player.onScreenDisplay?.setActionBar?.('§5⚔【居合·疾影拔刀斩】释放！向前疾突瞬斩沿途敌人造成 22 点斩杀!§r');
      } catch (err) {
        console.warn('Iaido dash error:', err);
      }
    }
  }
}
