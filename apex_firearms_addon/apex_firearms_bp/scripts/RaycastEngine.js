import { DamageResolver } from "./DamageResolver.js";

const BREAKABLE_BLOCKS = new Set([
  "minecraft:glass",
  "minecraft:glass_pane",
  "minecraft:stained_glass",
  "minecraft:stained_glass_pane",
  "minecraft:oak_leaves",
  "minecraft:spruce_leaves",
  "minecraft:birch_leaves",
  "minecraft:jungle_leaves",
  "minecraft:acacia_leaves",
  "minecraft:dark_oak_leaves",
  "minecraft:mangrove_leaves",
  "minecraft:cherry_leaves",
  "minecraft:azalea_leaves",
  "minecraft:azalea_leaves_flowered"
]);

export class RaycastEngine {
  /**
   * 生成高能弹道轨迹粒子线
   */
  static spawnTracer(dim, startLoc, endLoc, gunConfig, isHeRound) {
    if (!dim || !startLoc || !endLoc) return;

    try {
      const dx = endLoc.x - startLoc.x;
      const dy = endLoc.y - startLoc.y;
      const dz = endLoc.z - startLoc.z;
      const totalDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (totalDist < 0.5) return;

      // 枪口微火光
      try {
        dim.spawnParticle("minecraft:crit", startLoc);
      } catch {}

      // 步长与粒子密度配置
      const step = gunConfig.id === "apex:m82" ? 1.0 : (gunConfig.id === "apex:mgl" ? 1.0 : 1.5);
      const steps = Math.min(Math.floor(totalDist / step), 45);

      const customParticle = isHeRound
        ? "apex:he_tracer"
        : (gunConfig.id === "apex:m82"
            ? "apex:heavy_tracer"
            : (gunConfig.id === "apex:vector"
                ? "apex:vector_tracer"
                : "apex:bullet_tracer"));

      const fallbackParticle = isHeRound
        ? "minecraft:basic_flame_particle"
        : (gunConfig.id === "apex:m82"
            ? "minecraft:wax_particle"
            : (gunConfig.id === "apex:vector"
                ? "minecraft:electric_spark_particle"
                : "minecraft:crit"));

      for (let i = 1; i <= steps; i++) {
        const frac = i / steps;
        const px = startLoc.x + dx * frac;
        const py = startLoc.y + dy * frac;
        const pz = startLoc.z + dz * frac;

        try {
          dim.spawnParticle(customParticle, { x: px, y: py, z: pz });
        } catch {
          try {
            dim.spawnParticle(fallbackParticle, { x: px, y: py, z: pz });
          } catch {}
        }
      }
    } catch (e) {}
  }

  /**
   * 执行带有散布偏移的视线射线投射 (包含弹道轨迹渲染)
   */
  static castBullet(player, gunConfig, spreadMultiplier = 1.0, isHeRound = false) {
    if (!player || !player.isValid()) return null;

    try {
      const dim = player.dimension;
      const headLoc = player.getHeadLocation();
      const viewDir = player.getViewDirection();

      // 计算散布
      const baseSpread = player.isSneaking ? gunConfig.spreadSneak : gunConfig.spreadStand;
      const spread = baseSpread * spreadMultiplier;
      const spreadX = (Math.random() - 0.5) * spread;
      const spreadY = (Math.random() - 0.5) * spread;
      const spreadZ = (Math.random() - 0.5) * spread;

      const shootDir = {
        x: viewDir.x + spreadX,
        y: viewDir.y + spreadY,
        z: viewDir.z + spreadZ
      };

      const len = Math.sqrt(shootDir.x ** 2 + shootDir.y ** 2 + shootDir.z ** 2) || 1.0;
      const normDir = { x: shootDir.x / len, y: shootDir.y / len, z: shootDir.z / len };

      const maxCheckDist = Math.min(gunConfig.maxRange ?? 64, 64.0);

      // 枪口起始位置 (头部朝前微偏 0.6 格)
      const startLoc = {
        x: headLoc.x + normDir.x * 0.6,
        y: headLoc.y + normDir.y * 0.6 - 0.1,
        z: headLoc.z + normDir.z * 0.6
      };

      // 1. 方块射线检测
      let blockHitDist = maxCheckDist + 1;
      let blockImpactLoc = null;

      try {
        const blockHit = dim.getBlockFromRay(headLoc, normDir, {
          maxDistance: maxCheckDist,
          includePassableBlocks: false,
          includeLiquidBlocks: false
        });

        if (blockHit && blockHit.block) {
          const bLoc = blockHit.block.location;
          const bTypeId = blockHit.block.typeId;
          blockHitDist = Math.sqrt((bLoc.x - headLoc.x) ** 2 + (bLoc.y - headLoc.y) ** 2 + (bLoc.z - headLoc.z) ** 2);
          blockImpactLoc = {
            x: headLoc.x + normDir.x * blockHitDist,
            y: headLoc.y + normDir.y * blockHitDist,
            z: headLoc.z + normDir.z * blockHitDist
          };

          if (BREAKABLE_BLOCKS.has(bTypeId) && gunConfig.id !== "apex:mgl") {
            try {
              dim.runCommand(`fill ${bLoc.x} ${bLoc.y} ${bLoc.z} ${bLoc.x} ${bLoc.y} ${bLoc.z} air destroy`);
            } catch {}
          } else if (!isHeRound) {
            try {
              dim.spawnParticle("minecraft:crit", blockImpactLoc);
              dim.spawnParticle("minecraft:smoke_particle", blockImpactLoc);
            } catch {}
          }
        }
      } catch (err) {}

      // 2. 实体射线检测
      let hitResult = null;
      let actualImpactLoc = blockImpactLoc;

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

            const hitLoc = {
              x: headLoc.x + normDir.x * hit.distance,
              y: headLoc.y + normDir.y * hit.distance,
              z: headLoc.z + normDir.z * hit.distance
            };

            actualImpactLoc = hitLoc;

            const dmgResult = DamageResolver.applyDamage(player, entity, hitLoc, gunConfig);
            if (dmgResult) {
              hitResult = {
                target: entity,
                distance: hit.distance,
                ...dmgResult
              };
              break;
            }
          }
        }
      } catch (err) {}

      // 3. 计算弹道终点 (未命中则延伸至最大射程)
      const finalImpactLoc = actualImpactLoc || {
        x: headLoc.x + normDir.x * maxCheckDist,
        y: headLoc.y + normDir.y * maxCheckDist,
        z: headLoc.z + normDir.z * maxCheckDist
      };

      // 4. 渲染弹道痕迹 (Bullet Tracer)
      this.spawnTracer(dim, startLoc, finalImpactLoc, gunConfig, isHeRound);

      // 5. 高爆弹爆炸与溅射结算 (100% 遵守 0 地形破坏规则)
      let explosionSplashCount = 0;
      if (isHeRound && actualImpactLoc) {
        explosionSplashCount = DamageResolver.applyExplosiveSplash(
          player,
          actualImpactLoc,
          gunConfig.heRadius ?? 5.0,
          gunConfig.heSplashDamage ?? 40,
          gunConfig
        );
      }

      return {
        hitResult,
        impactLocation: finalImpactLoc,
        isHeRound,
        explosionSplashCount,
        direction: normDir
      };
    } catch (e) {
      console.warn(`[ApexFirearms] Raycast error: ${e}`);
      return null;
    }
  }
}
