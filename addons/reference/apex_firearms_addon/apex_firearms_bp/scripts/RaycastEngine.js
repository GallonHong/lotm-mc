import { world, system, EntityDamageCause } from "@minecraft/server";
import { DamageResolver } from "./DamageResolver.js";

export class RaycastEngine {
  /**
   * 计算带有随机扩散角的视线射线方向向量
   */
  static getSpreadDirection(player, spreadMultiplier = 1.0, gunConfig) {
    const viewDir = player.getViewDirection();
    const isSneaking = player.isSneaking;

    const baseSpread = isSneaking
      ? (gunConfig?.spreadSneak ?? 0.008)
      : (gunConfig?.spreadStand ?? 0.02);

    const actualSpread = baseSpread * spreadMultiplier;

    // 高斯随机微小扰动
    const jitterX = (Math.random() - 0.5) * actualSpread * 2;
    const jitterY = (Math.random() - 0.5) * actualSpread * 2;
    const jitterZ = (Math.random() - 0.5) * actualSpread * 2;

    const dir = {
      x: viewDir.x + jitterX,
      y: viewDir.y + jitterY,
      z: viewDir.z + jitterZ
    };

    const len = Math.hypot(dir.x, dir.y, dir.z);
    return {
      x: dir.x / len,
      y: dir.y / len,
      z: dir.z / len
    };
  }

  /**
   * 执行完整的枪械实弹射线检测、弹道渲染与伤害结算
   */
  static castBullet(player, gunConfig, spreadMultiplier = 1.0, isHeRound = false) {
    if (!player || !player.isValid()) return null;

    try {
      const dim = player.dimension;
      const headLoc = player.getHeadLocation();
      const normDir = this.getSpreadDirection(player, spreadMultiplier, gunConfig);
      const maxCheckDist = gunConfig?.maxRange ?? 64;

      const muzzleLoc = {
        x: headLoc.x + normDir.x * 0.8,
        y: headLoc.y + normDir.y * 0.8 - 0.1,
        z: headLoc.z + normDir.z * 0.8
      };

      // 1. 枪口火光粒子
      try {
        if (gunConfig?.id === "apex:m82") {
          dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", muzzleLoc);
        } else {
          dim.spawnParticle("minecraft:basic_flame_particle", muzzleLoc);
        }
      } catch {}

      let hitResult = null;
      let actualImpactLoc = null;

      // 2. 检测方块碰撞
      let blockHitDist = maxCheckDist;
      try {
        const blockHit = dim.getBlockFromRay(headLoc, normDir, {
          maxDistance: maxCheckDist,
          includePassableBlocks: false,
          includeLiquidBlocks: false
        });

        if (blockHit && blockHit.block) {
          const bDist = (typeof blockHit.distance === "number" && Number.isFinite(blockHit.distance)) ? blockHit.distance : maxCheckDist;
          blockHitDist = bDist;
          actualImpactLoc = {
            x: headLoc.x + normDir.x * bDist,
            y: headLoc.y + normDir.y * bDist,
            z: headLoc.z + normDir.z * bDist
          };

          // 击中方块生成金属/泥土碎屑火花
          try {
            dim.spawnParticle("minecraft:crit", actualImpactLoc);
            dim.spawnParticle("minecraft:smoke_particle", actualImpactLoc);
          } catch {}
        }
      } catch (err) {}

      // 3. 检测实体碰撞
      try {
        const maxEntityDist = Math.min(maxCheckDist, blockHitDist);
        const entityHits = dim.getEntitiesFromRay(headLoc, normDir, {
          maxDistance: maxEntityDist,
          ignoreBlockCollision: false
        });

        if (entityHits && entityHits.length > 0) {
          for (const hit of entityHits) {
            const entity = hit.entity;
            if (!entity || !entity.isValid() || entity.id === player.id) continue;
            if (entity.typeId === "minecraft:item" || entity.typeId === "minecraft:xp_orb") continue;

            const el = entity.location;
            const eDist = (typeof hit.distance === "number" && Number.isFinite(hit.distance))
              ? hit.distance
              : Math.hypot(el.x - headLoc.x, el.y - headLoc.y, el.z - headLoc.z);

            const hitLoc = {
              x: headLoc.x + normDir.x * eDist,
              y: headLoc.y + normDir.y * eDist,
              z: headLoc.z + normDir.z * eDist
            };

            actualImpactLoc = hitLoc;

            const dmgResult = DamageResolver.applyDamage(player, entity, hitLoc, gunConfig);
            if (dmgResult) {
              hitResult = {
                target: entity,
                distance: eDist,
                ...dmgResult
              };
              break;
            }
          }
        }
      } catch (err) {}

      // 4. 计算弹道终点 (未命中则延伸至最大射程)
      const finalImpactLoc = actualImpactLoc || {
        x: headLoc.x + normDir.x * maxCheckDist,
        y: headLoc.y + normDir.y * maxCheckDist,
        z: headLoc.z + normDir.z * maxCheckDist
      };

      // 5. 渲染高保真高速弹道轨迹 (Bullet Tracer Line)
      this.#drawBulletTracer(dim, muzzleLoc, finalImpactLoc, gunConfig?.id);

      // 6. 高爆烈焰弹判定 (Barrett M82A1 20% 恶魂烈焰高爆)
      if (isHeRound && actualImpactLoc) {
        DamageResolver.applyExplosiveSplash(
          player,
          actualImpactLoc,
          gunConfig.heRadius ?? 3.5,
          gunConfig.heSplashDamage ?? 30,
          gunConfig
        );
      }

      return {
        hitResult,
        impactLocation: finalImpactLoc,
        isHeRound
      };
    } catch (e) {
      console.warn(`[ApexFirearms] RaycastEngine error: ${e}`);
      return null;
    }
  }

  /**
   * 沿弹道射线密集生成高亮轨迹粒子
   */
  static #drawBulletTracer(dim, startPos, endPos, gunId) {
    if (!dim || !startPos || !endPos) return;

    try {
      const dx = endPos.x - startPos.x;
      const dy = endPos.y - startPos.y;
      const dz = endPos.z - startPos.z;
      const totalDist = Math.hypot(dx, dy, dz);
      if (totalDist < 0.5) return;

      let particleId = "apex:bullet_tracer";
      let stepSize = 1.0;

      if (gunId === "apex:m82") {
        particleId = "apex:heavy_tracer";
        stepSize = 0.6;
      } else if (gunId === "apex:vector") {
        particleId = "apex:vector_tracer";
        stepSize = 0.9;
      }

      const steps = Math.min(Math.floor(totalDist / stepSize), 80);

      for (let i = 1; i <= steps; i++) {
        const frac = i / steps;
        const px = startPos.x + dx * frac;
        const py = startPos.y + dy * frac;
        const pz = startPos.z + dz * frac;

        try {
          dim.spawnParticle(particleId, { x: px, y: py, z: pz });
        } catch {
          try {
            dim.spawnParticle("minecraft:crit", { x: px, y: py, z: pz });
          } catch {}
        }
      }
    } catch {}
  }
}
