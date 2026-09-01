import { world, EntityDamageCause } from '@minecraft/server';
import { DamageHandler } from './damageHandler.js';

export class GrenadeEngine {
  static activeGrenades = [];

  /**
   * 发射一枚带有物理抛物线、引信与爆破效果的 40mm 高爆榴弹
   */
  static launchGrenade(player, gun) {
    if (!player || !player.isValid()) return;

    try {
      const dim = player.dimension;
      const headLoc = player.getHeadLocation();
      const viewDir = player.getViewDirection();
      const pLoc = player.location;

      const hx = Number(headLoc?.x) || Number(pLoc?.x) || 0;
      const hy = Number(headLoc?.y) || (Number(pLoc?.y) + 1.6) || 64;
      const hz = Number(headLoc?.z) || Number(pLoc?.z) || 0;
      const vx = Number(viewDir?.x) || 0;
      const vy = Number(viewDir?.y) || 0;
      const vz = Number(viewDir?.z) || 1;

      // 榴弹初速向量
      const baseSpeed = 1.45;
      const launchVel = {
        x: vx * baseSpeed,
        y: vy * baseSpeed + 0.12,
        z: vz * baseSpeed
      };

      const startPos = {
        x: hx + vx * 0.8,
        y: hy + vy * 0.8 - 0.1,
        z: hz + vz * 0.8
      };

      this.activeGrenades.push({
        shooterId: player.id,
        dim: dim,
        pos: startPos,
        velocity: launchVel,
        gravity: 0.045,
        drag: 0.995,
        age: 0,
        maxAge: 90,
        gun
      });

      // 枪口初速火光与开火气浪
      try {
        
        dim.spawnParticle('minecraft:basic_flame_particle', startPos);
        dim.spawnParticle('test_gun:he_tracer', startPos);
      } catch {}
    } catch (e) {
      console.warn('GrenadeEngine launchGrenade error:', e);
    }
  }

  /**
   * 20 TPS 物理帧步进与高精度碰撞检测
   */
  static onTick() {
    if (this.activeGrenades.length === 0) return;

    const remaining = [];

    for (const g of this.activeGrenades) {
      try {
        const dim = g.dim;
        if (!dim) continue;

        g.age++;
        if (g.age > g.maxAge) {
          this.explode(dim, g.pos, g.shooterId, g.gun, null);
          continue;
        }

        const curPos = g.pos;
        const nextPos = {
          x: curPos.x + g.velocity.x,
          y: curPos.y + g.velocity.y,
          z: curPos.z + g.velocity.z
        };

        const moveVec = {
          x: nextPos.x - curPos.x,
          y: nextPos.y - curPos.y,
          z: nextPos.z - curPos.z
        };
        const moveDist = Math.hypot(moveVec.x, moveVec.y, moveVec.z);

        if (moveDist < 0.01) {
          g.pos = nextPos;
          remaining.push(g);
          continue;
        }

        const normDir = {
          x: moveVec.x / moveDist,
          y: moveVec.y / moveDist,
          z: moveVec.z / moveDist
        };

        let hasCollided = false;
        let impactLoc = null;
        let directHitEntity = null;

        // 1. 方块射线碰撞检测
        try {
          const blockHit = dim.getBlockFromRay(curPos, normDir, {
            maxDistance: moveDist + 0.35,
            includePassableBlocks: false,
            includeLiquidBlocks: true
          });

          if (blockHit) {
            hasCollided = true;
            if (blockHit.faceLocation && Number.isFinite(blockHit.faceLocation.x)) {
              impactLoc = {
                x: blockHit.faceLocation.x,
                y: blockHit.faceLocation.y + 0.25,
                z: blockHit.faceLocation.z
              };
            } else if (blockHit.block) {
              const bl = blockHit.block.location;
              impactLoc = { x: bl.x + 0.5, y: bl.y + 0.5, z: bl.z + 0.5 };
            }
          }
        } catch {}

        // 2. 空间方块占用辅助检测
        if (!hasCollided) {
          try {
            const checkBlock = dim.getBlock(nextPos);
            if (checkBlock && !checkBlock.isAir && !checkBlock.isLiquid) {
              hasCollided = true;
              impactLoc = { x: nextPos.x, y: nextPos.y + 0.3, z: nextPos.z };
            }
          } catch {}
        }

        // 3. 实体碰撞检测
        try {
          const checkMax = hasCollided && impactLoc ? Math.min(moveDist, Math.hypot(impactLoc.x - curPos.x, impactLoc.y - curPos.y, impactLoc.z - curPos.z)) : moveDist + 0.3;
          const entityHits = dim.getEntitiesFromRay(curPos, normDir, {
            maxDistance: checkMax,
            ignoreBlockCollision: false
          });

          if (entityHits && entityHits.length > 0) {
            for (const hit of entityHits) {
              const ent = hit.entity;
              if (!ent || !ent.isValid() || ent.id === g.shooterId) continue;
              if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;

              hasCollided = true;
              directHitEntity = ent;
              const el = ent.location;
              impactLoc = { x: el.x, y: el.y + 0.9, z: el.z };
              break;
            }
          }
        } catch {}

        if (hasCollided && impactLoc) {
          this.explode(dim, impactLoc, g.shooterId, g.gun, directHitEntity);
          continue;
        }

        // 4. 飞行中渲染尾焰浓烟与高爆轨迹
        try {
          dim.spawnParticle('test_gun:he_tracer', nextPos);
          dim.spawnParticle('minecraft:basic_flame_particle', nextPos);
          
        } catch {}

        // 5. 应用重力加速度与空气阻力
        g.pos = nextPos;
        g.velocity.y -= g.gravity;
        g.velocity.x *= g.drag;
        g.velocity.z *= g.drag;

        remaining.push(g);
      } catch (err) {
        console.warn('GrenadeEngine tick error:', err);
      }
    }

    this.activeGrenades = remaining;
  }

  /**
   * 触发 40mm 高爆破片爆炸 (冲击波 + 巨型爆炸光效 + 范围穿透伤害)
   */
  static explode(dim, loc, shooterId, gun, directHitEntity) {
    if (!dim || !loc) return;
    if (!Number.isFinite(loc.x) || !Number.isFinite(loc.y) || !Number.isFinite(loc.z)) return;

    let shooter = null;
    try {
      const all = world.getAllPlayers();
      shooter = all.find(p => p.id === shooterId) || null;
    } catch {}

    // Fallback: If loc is uninitialized (0, 1, 0), use shooter location
    let validLoc = loc;
    if (Math.abs(loc.x) < 0.001 && Math.abs(loc.z) < 0.001 && Math.abs(loc.y - 1.0) < 0.1 && shooter && shooter.isValid()) {
      validLoc = shooter.location;
    }

    const stats = gun.stats || { damage: 40, heSplashDamage: 45, heRadius: 6.0 };

    // 1. 直击动能伤害
    if (directHitEntity && directHitEntity.isValid()) {
      DamageHandler.handleHit(null, shooter, directHitEntity, gun, validLoc);
    }

    // 2. 生成震撼爆炸光效与冲击波粒子 (保护在 try/catch 中防止未加载区块错误)
    try {
      dim.spawnParticle('test_gun:mgl_explosion', validLoc);
      dim.spawnParticle('test_gun:mgl_shockwave', validLoc);
      dim.spawnParticle('minecraft:huge_explosion_emitter', validLoc);
      dim.spawnParticle('minecraft:explosion_manual', validLoc);
      dim.spawnParticle('minecraft:sonic_explosion', validLoc);
      dim.spawnParticle('minecraft:lava_particle', validLoc);
      dim.spawnParticle('minecraft:basic_flame_particle', validLoc);
    } catch (e) {}

    // 3. 播放重型轰鸣爆炸音效
    try {
      dim.playSound('random.explode', validLoc, { volume: 2.0, pitch: 0.95 });
      dim.playSound('mob.ghast.fireball', validLoc, { volume: 1.5, pitch: 0.85 });
    } catch {}

    // 4. AOE 范围高爆破片伤害结算 (无敌帧穿透)
    const radius = stats.heRadius || 6.0;
    const maxSplash = stats.heSplashDamage || 45.0;

    try {
      const nearby = dim.getEntities({
        location: validLoc,
        maxDistance: radius
      });

      for (const ent of nearby) {
        if (!ent || !ent.isValid()) continue;
        if (shooter && ent.id === shooter.id) continue;
        if (directHitEntity && ent.id === directHitEntity.id) continue;
        if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;

        const el = ent.location;
        const dist = Math.hypot(el.x - validLoc.x, el.y - validLoc.y, el.z - validLoc.z);
        if (dist > radius) continue;

        const falloff = Math.max(0.5, 1.0 - (dist / (radius + 1)) * 0.5);
        const rawDamage = maxSplash * falloff;

        const armorPoints = DamageHandler.estimateArmorPoints(ent);
        const finalDmg = DamageHandler.calculateArmorReduction(rawDamage, armorPoints, stats.armorPenetration || 0.50);

        try {
          ent.applyDamage(finalDmg, {
            cause: EntityDamageCause.override,
            damagingEntity: (shooter && shooter.isValid()) ? shooter : undefined
          });
        } catch {
          try { ent.applyDamage(finalDmg); } catch {}
        }

        try { ent.setOnFire(4, true); } catch {}

        try {
          const kx = (el.x - validLoc.x) / (dist + 0.1);
          const kz = (el.z - validLoc.z) / (dist + 0.1);
          ent.applyKnockback(kx * 0.8, kz * 0.8, 0.8, 0.4);
        } catch {}

        DamageHandler.triggerMobAggro(ent, shooter);
      }
    } catch (err) {}
  }
}
