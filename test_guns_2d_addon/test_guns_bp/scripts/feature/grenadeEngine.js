import { world, EntityDamageCause } from '@minecraft/server';
import { DamageHandler } from './damageHandler.js';

export class GrenadeEngine {
  static activeGrenades = [];

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

      const baseSpeed = (gun && gun.id === 'test_gun:m79') ? 1.35 : 1.45;
      const launchVel = {
        x: vx * baseSpeed,
        y: vy * baseSpeed + 0.12,
        z: vz * baseSpeed
      };

      const startPos = {
        x: hx + vx * 0.45,
        y: hy + vy * 0.45 - 0.08,
        z: hz + vz * 0.45
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

      try {
        dim.spawnParticle('minecraft:basic_flame_particle', startPos);
        dim.spawnParticle('test_gun:he_tracer', startPos);
      } catch {}
    } catch (e) {
      console.warn('GrenadeEngine launchGrenade error:', e);
    }
  }

  static onTick() {
    if (this.activeGrenades.length === 0) return;

    const remaining = [];

    for (const g of this.activeGrenades) {
      try {
        const dim = g.dim;
        if (!dim) continue;

        g.age++;
        if (g.age > g.maxAge) {
          this.explode(dim, g.pos, g.shooterId, g.gun, null, null);
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

        // 1. 实体碰撞检测
        try {
          const entityHits = dim.getEntitiesFromRay(curPos, normDir, {
            maxDistance: moveDist + 0.35,
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

        // 2. 方块碰撞检测
        if (!hasCollided) {
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
                  x: blockHit.faceLocation.x - normDir.x * 0.25,
                  y: blockHit.faceLocation.y - normDir.y * 0.25 + 0.15,
                  z: blockHit.faceLocation.z - normDir.z * 0.25
                };
              } else if (blockHit.block) {
                impactLoc = {
                  x: curPos.x,
                  y: curPos.y + 0.2,
                  z: curPos.z
                };
              }
            }
          } catch {}
        }

        // 3. 方块实体占用容错
        if (!hasCollided) {
          try {
            const checkBlock = dim.getBlock(nextPos);
            if (checkBlock && !checkBlock.isAir && !checkBlock.isLiquid) {
              hasCollided = true;
              impactLoc = {
                x: curPos.x,
                y: curPos.y + 0.2,
                z: curPos.z
              };
            }
          } catch {}
        }

        if (hasCollided && impactLoc) {
          this.explode(dim, impactLoc, g.shooterId, g.gun, directHitEntity, normDir);
          continue;
        }

        try {
          dim.spawnParticle('test_gun:he_tracer', nextPos);
          dim.spawnParticle('minecraft:basic_flame_particle', nextPos);
        } catch {}

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

  static explode(dim, loc, shooterId, gun, directHitEntity, hitDir) {
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

    const isM79 = (gun && gun.id === 'test_gun:m79');
    const stats = gun?.stats || { damage: 40, heSplashDamage: 45, heRadius: 6.0 };

    if (directHitEntity && directHitEntity.isValid()) {
      DamageHandler.handleHit(null, shooter, directHitEntity, gun, validLoc);
    }

    // 区分 M79 (单发优良榴弹：轻量精简特效) 与 MGL (传说级转轮自动榴弹：全屏多层爆轰)
    if (isM79) {
      try {
        dim.spawnParticle('minecraft:explosion_manual', validLoc);
        dim.spawnParticle('minecraft:basic_flame_particle', validLoc);
        dim.spawnParticle('minecraft:smoke_particle', validLoc);
      } catch {}

      try {
        dim.playSound('random.explode', validLoc, { volume: 1.4, pitch: 1.25 });
      } catch {}
    } else {
      // 传说级 MGL 专属多层冲击波与声波爆轰
      try {
        dim.spawnParticle('test_gun:mgl_explosion', validLoc);
        dim.spawnParticle('test_gun:mgl_shockwave', validLoc);
        dim.spawnParticle('minecraft:huge_explosion_emitter', validLoc);
        dim.spawnParticle('minecraft:explosion_manual', validLoc);
        dim.spawnParticle('minecraft:sonic_explosion', validLoc);
        dim.spawnParticle('minecraft:basic_flame_particle', validLoc);
        dim.spawnParticle('minecraft:lava_particle', validLoc);
      } catch {}

      try {
        dim.playSound('random.explode', validLoc, { volume: 2.5, pitch: 0.95 });
        dim.playSound('mob.ghast.fireball', validLoc, { volume: 2.0, pitch: 0.85 });
      } catch {}
    }

    // AOE 范围溅射伤害
    const radius = stats.heRadius || 4.2;
    const maxSplash = stats.heSplashDamage || 30.0;

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

        const falloff = Math.max(0.4, 1.0 - (dist / (radius + 1)) * 0.5);
        const rawDamage = maxSplash * falloff;

        const armorPoints = DamageHandler.estimateArmorPoints(ent);
        const finalDmg = DamageHandler.calculateArmorReduction(rawDamage, armorPoints, stats.armorPenetration || 0.35);

        try {
          ent.applyDamage(finalDmg, {
            cause: EntityDamageCause.override,
            damagingEntity: (shooter && shooter.isValid()) ? shooter : undefined
          });
        } catch {
          try { ent.applyDamage(finalDmg); } catch {}
        }

        try { ent.setOnFire(3, true); } catch {}

        try {
          const kx = (el.x - validLoc.x) / (dist + 0.1);
          const kz = (el.z - validLoc.z) / (dist + 0.1);
          ent.applyKnockback(kx * 0.6, kz * 0.6, 0.6, 0.3);
        } catch {}

        DamageHandler.triggerMobAggro(ent, shooter);
      }
    } catch (err) {}
  }
}
