import { world, system } from "@minecraft/server";
import { DamageResolver } from "./DamageResolver.js";

export class GrenadeEngine {
  static #activeGrenades = [];

  /**
   * 发射一枚带有物理重力与抛物线的 40mm 高爆榴弹
   */
  static launchGrenade(player, config) {
    if (!player || !player.isValid()) return;

    try {
      const dim = player.dimension;
      const headLoc = player.getHeadLocation();
      const viewDir = player.getViewDirection();

      // 榴弹初速 (约 1.25 格/tick，肉眼清晰可见优美抛物线飞行)
      const baseSpeed = 1.25;
      const launchVel = {
        x: viewDir.x * baseSpeed,
        y: viewDir.y * baseSpeed + 0.08,
        z: viewDir.z * baseSpeed
      };

      const startPos = {
        x: headLoc.x + viewDir.x * 0.8,
        y: headLoc.y + viewDir.y * 0.8 - 0.1,
        z: headLoc.z + viewDir.z * 0.8
      };

      this.#activeGrenades.push({
        shooterId: player.id,
        dimensionId: dim.id,
        pos: startPos,
        velocity: launchVel,
        gravity: 0.045, // 40mm 重力下坠加速度
        drag: 0.995,    // 空气阻力
        age: 0,
        maxAge: 80,     // 4 秒最大飞行寿命
        config
      });

      // 枪口初速火光与开火气浪
      try {
        dim.spawnParticle("minecraft:huge_explosion_emitter", startPos);
        dim.spawnParticle("minecraft:basic_flame_particle", startPos);
      } catch {}
    } catch (e) {
      console.warn(`[ApexFirearms] launchGrenade error: ${e}`);
    }
  }

  /**
   * 20 TPS 榴弹抛物线物理步进与碰撞检测
   */
  static onTick() {
    if (this.#activeGrenades.length === 0) return;

    const remainingGrenades = [];

    for (const g of this.#activeGrenades) {
      try {
        const dim = world.getDimension(g.dimensionId);
        if (!dim) continue;

        g.age++;
        if (g.age > g.maxAge) {
          // 超时凌空引爆
          this.#explode(dim, g.pos, g.shooterId, g.config, null);
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
          remainingGrenades.push(g);
          continue;
        }

        const normDir = {
          x: moveVec.x / moveDist,
          y: moveVec.y / moveDist,
          z: moveVec.z / moveDist
        };

        // 1. 弹道射线碰撞检测 (防穿墙穿方块)
        let hasCollided = false;
        let impactLoc = null;
        let directHitEntity = null;

        // 方块碰撞
        try {
          const blockHit = dim.getBlockFromRay(curPos, normDir, {
            maxDistance: moveDist + 0.2,
            includePassableBlocks: false,
            includeLiquidBlocks: true
          });

          if (blockHit && blockHit.block) {
            hasCollided = true;
            const bDist = blockHit.distance;
            impactLoc = {
              x: curPos.x + normDir.x * bDist,
              y: curPos.y + normDir.y * bDist + 0.25,
              z: curPos.z + normDir.z * bDist
            };
          }
        } catch {}

        // 实体碰撞
        try {
          const checkMax = hasCollided ? Math.min(moveDist, Math.hypot(impactLoc.x - curPos.x, impactLoc.y - curPos.y, impactLoc.z - curPos.z)) : moveDist + 0.25;
          const entityHits = dim.getEntitiesFromRay(curPos, normDir, {
            maxDistance: checkMax,
            ignoreBlockCollision: false
          });

          if (entityHits && entityHits.length > 0) {
            for (const hit of entityHits) {
              const ent = hit.entity;
              if (!ent || !ent.isValid() || ent.id === g.shooterId) continue;
              if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

              hasCollided = true;
              directHitEntity = ent;
              impactLoc = {
                x: curPos.x + normDir.x * hit.distance,
                y: curPos.y + normDir.y * hit.distance,
                z: curPos.z + normDir.z * hit.distance
              };
              break;
            }
          }
        } catch {}

        if (hasCollided && impactLoc) {
          // 触发落地引爆与范围溅射
          this.#explode(dim, impactLoc, g.shooterId, g.config, directHitEntity);
          continue;
        }

        // 2. 飞行中渲染抛物线轨迹 (火光与浓烟)
        try {
          dim.spawnParticle("apex:he_tracer", nextPos);
          dim.spawnParticle("minecraft:basic_flame_particle", nextPos);
          dim.spawnParticle("minecraft:smoke_particle", nextPos);
        } catch {}

        // 3. 应用重力下坠与空气阻力
        g.pos = nextPos;
        g.velocity.y -= g.gravity;
        g.velocity.x *= g.drag;
        g.velocity.z *= g.drag;

        remainingGrenades.push(g);
      } catch (err) {
        console.warn(`[ApexFirearms] Grenade update error: ${err}`);
      }
    }

    this.#activeGrenades = remainingGrenades;
  }

  /**
   * 触发 40mm 破片高爆 (0 地形破坏 + 保证地面与实体大范围溅射伤害)
   */
  static #explode(dim, loc, shooterId, config, directHitEntity) {
    if (!dim || !loc) return;

    let shooter = null;
    try {
      const allPlayers = world.getAllPlayers();
      shooter = allPlayers.find((p) => p.id === shooterId) || null;
    } catch {}

    // 1. 直击动能伤害
    if (directHitEntity && directHitEntity.isValid()) {
      try {
        DamageResolver.applyDamage(shooter, directHitEntity, loc, config);
      } catch {}
    }

    // 2. 范围 40 HP 破片高爆溅射 (0 地形破坏 + 保证地面溅射伤害与击退)
    DamageResolver.applyExplosiveSplash(
      shooter,
      loc,
      config.heRadius ?? 5.5,
      config.heSplashDamage ?? 40,
      config,
      dim
    );
  }
}
