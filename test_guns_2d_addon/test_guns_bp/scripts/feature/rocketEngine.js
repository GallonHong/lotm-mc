import { world, EntityDamageCause } from '@minecraft/server';
import { DamageHandler } from './damageHandler.js';
import { isProtectedTeammate } from './utils/teamRules.js';

export class RocketEngine {
  static activeRockets = [];

  static launchRocket(player, gun) {
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

      const speed = 2.2;
      const launchVel = {
        x: vx * speed,
        y: vy * speed + 0.05,
        z: vz * speed
      };

      const startPos = {
        x: hx + vx * 0.6,
        y: hy + vy * 0.6 - 0.05,
        z: hz + vz * 0.6
      };

      this.activeRockets.push({
        shooterId: player.id,
        dim: dim,
        pos: startPos,
        velocity: launchVel,
        gravity: 0.015,
        drag: 0.999,
        age: 0,
        maxAge: 100,
        gun
      });

      try {
        dim.spawnParticle('minecraft:huge_explosion_emitter', startPos);
        dim.spawnParticle('minecraft:basic_flame_particle', startPos);
        dim.spawnParticle('minecraft:basic_smoke_particle', startPos);
      } catch {}
    } catch (e) {
      console.warn('RocketEngine launchRocket error:', e);
    }
  }

  static onTick() {
    if (this.activeRockets.length === 0) return;

    const remaining = [];

    for (const r of this.activeRockets) {
      try {
        const dim = r.dim;
        if (!dim) continue;

        r.age++;
        if (r.age > r.maxAge) {
          this.explode(dim, r.pos, r.shooterId, r.gun, null);
          continue;
        }

        const curPos = r.pos;
        const nextPos = {
          x: curPos.x + r.velocity.x,
          y: curPos.y + r.velocity.y,
          z: curPos.z + r.velocity.z
        };

        const moveVec = {
          x: nextPos.x - curPos.x,
          y: nextPos.y - curPos.y,
          z: nextPos.z - curPos.z
        };
        const moveDist = Math.hypot(moveVec.x, moveVec.y, moveVec.z);

        if (moveDist < 0.01) {
          r.pos = nextPos;
          remaining.push(r);
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

        // 1. 实体碰撞检测
        try {
          const entityHits = dim.getEntitiesFromRay(curPos, normDir, {
            maxDistance: moveDist + 0.4,
            ignoreBlockCollision: false
          });

          if (entityHits && entityHits.length > 0) {
            for (const hit of entityHits) {
              const ent = hit.entity;
              if (!ent || !ent.isValid() || ent.id === r.shooterId) continue;
              if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;

              hasCollided = true;
              directHitEntity = ent;
              const el = ent.location;
              impactLoc = { x: el.x, y: el.y + 0.8, z: el.z };
              break;
            }
          }
        } catch {}

        // 2. 方块射线碰撞检测
        if (!hasCollided) {
          try {
            const blockHit = dim.getBlockFromRay(curPos, normDir, {
              maxDistance: moveDist + 0.4,
              includePassableBlocks: false,
              includeLiquidBlocks: true
            });

            if (blockHit && blockHit.block) {
              hasCollided = true;
              impactLoc = {
                x: curPos.x + normDir.x * (moveDist * 0.85),
                y: curPos.y + normDir.y * (moveDist * 0.85) + 0.25,
                z: curPos.z + normDir.z * (moveDist * 0.85)
              };
            }
          } catch {}
        }

        // 3. 地形接触容错
        if (!hasCollided) {
          try {
            const checkBlock = dim.getBlock(nextPos);
            if (checkBlock && !checkBlock.isAir && !checkBlock.isLiquid) {
              hasCollided = true;
              impactLoc = {
                x: curPos.x,
                y: curPos.y + 0.25,
                z: curPos.z
              };
            }
          } catch {}
        }

        if (hasCollided && impactLoc) {
          this.explode(dim, impactLoc, r.shooterId, r.gun, directHitEntity);
          continue;
        }

        // 飞行火箭尾烟与推进火光渲染 (轻量化 RPG 涡流尾烟)
        try {
          dim.spawnParticle('test_gun:rpg_smoke_lean', nextPos);
          dim.spawnParticle('minecraft:basic_flame_particle', nextPos);
        } catch {}

        r.pos = nextPos;
        r.velocity.y -= r.gravity;
        r.velocity.x *= r.drag;
        r.velocity.z *= r.drag;

        remaining.push(r);
      } catch (err) {
        console.warn('RocketEngine tick error:', err);
      }
    }

    this.activeRockets = remaining;
  }

  static explode(dim, loc, shooterId, gun, directHitEntity) {
    if (!dim || !loc) return;
    if (!Number.isFinite(loc.x) || !Number.isFinite(loc.y) || !Number.isFinite(loc.z)) return;

    let shooter = null;
    try {
      const all = world.getAllPlayers();
      shooter = all.find(p => p.id === shooterId) || null;
    } catch {}

    const validLoc = {
      x: loc.x,
      y: loc.y + 0.25,
      z: loc.z
    };

    const stats = gun?.stats || { damage: 100, heSplashDamage: 80, heRadius: 6.5, armorPenetration: 0.80 };

    // 1. 产生超强高爆冲击波与火焰火球粒子
    try {
      dim.spawnParticle('minecraft:huge_explosion_emitter', validLoc);
      dim.spawnParticle('minecraft:sonic_explosion', validLoc);
      dim.spawnParticle('minecraft:basic_flame_particle', validLoc);
      dim.spawnParticle('minecraft:lava_particle', validLoc);
      dim.spawnParticle('minecraft:basic_smoke_particle', validLoc);
    } catch {}

    // 2. 播放重型火箭爆炸轰鸣
    try {
      dim.playSound('random.explode', validLoc, { volume: 3.5, pitch: 0.85 });
      dim.playSound('ambient.weather.thunder', validLoc, { volume: 2.5, pitch: 1.2 });
    } catch {}

    // 3. 💥 破坏方块 (Block Destruction) - 真实炸毁周围掩体与方块
    try {
      dim.createExplosion(validLoc, 3.2, {
        breaksBlocks: true,
        causesFire: true,
        source: (shooter && shooter.isValid()) ? shooter : undefined
      });
    } catch (err) {
      console.warn('createExplosion error:', err);
    }

    // 4. 单体直接命中高额穿甲杀伤
    if (directHitEntity && directHitEntity.isValid()) {
      DamageHandler.handleHit(null, shooter, directHitEntity, gun, validLoc);
    }

    // 5. AOE 范围溅射高爆杀伤
    const radius = stats.heRadius || 6.5;
    const maxSplash = stats.heSplashDamage || 80.0;

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
        if (isProtectedTeammate(shooter, ent)) continue;

        const el = ent.location;
        const dist = Math.hypot(el.x - validLoc.x, el.y - validLoc.y, el.z - validLoc.z);
        if (dist > radius) continue;

        const falloff = Math.max(0.4, 1.0 - (dist / (radius + 1)) * 0.5);
        const rawDamage = maxSplash * falloff;

        const armorPoints = DamageHandler.estimateArmorPoints(ent);
        const finalDmg = DamageHandler.calculateArmorReduction(rawDamage, armorPoints, stats.armorPenetration || 0.80);

        try {
          ent.applyDamage(finalDmg, {
            cause: EntityDamageCause.override,
            damagingEntity: (shooter && shooter.isValid()) ? shooter : undefined
          });
        } catch {
          try { ent.applyDamage(finalDmg); } catch {}
        }

        try { ent.setOnFire(5, true); } catch {}

        try {
          const kx = (el.x - validLoc.x) / (dist + 0.1);
          const kz = (el.z - validLoc.z) / (dist + 0.1);
          ent.applyKnockback(kx * 1.5, kz * 1.5, 1.2, 0.6);
        } catch {}

        DamageHandler.triggerMobAggro(ent, shooter);
      }
    } catch (err) {
      console.warn('RPG Splash error:', err);
    }
  }
}
