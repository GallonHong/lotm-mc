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
   * 执行带有散布偏移的视线射线投射 (支持高爆烈焰弹判定)
   */
  static castBullet(player, gunConfig, spreadMultiplier = 1.0, isHeRound = false) {
    if (!player || !player.isValid()) return null;

    try {
      const dim = player.dimension;
      const headLoc = player.getHeadLocation();
      const viewDir = player.getViewDirection();

      // 计算散布 (高斯微偏)
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

      // 限制最大检测距离在 64 格内 (防御 Unloaded Chunk)
      const maxCheckDist = Math.min(gunConfig.maxRange ?? 64, 64.0);

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

          if (BREAKABLE_BLOCKS.has(bTypeId)) {
            try {
              dim.runCommand(`fill ${bLoc.x} ${bLoc.y} ${bLoc.z} ${bLoc.x} ${bLoc.y} ${bLoc.z} air destroy`);
            } catch {}
          } else {
            try {
              if (isHeRound) {
                dim.spawnParticle("minecraft:basic_flame_particle", blockImpactLoc);
              } else {
                dim.spawnParticle("minecraft:crit", blockImpactLoc);
                dim.spawnParticle("minecraft:smoke_particle", blockImpactLoc);
              }
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

      // 3. 高爆弹爆炸与溅射结算 (若命中或触碰方块)
      let explosionSplashCount = 0;
      if (isHeRound && actualImpactLoc) {
        explosionSplashCount = DamageResolver.applyExplosiveSplash(
          player,
          actualImpactLoc,
          gunConfig.heRadius ?? 3.5,
          gunConfig.heSplashDamage ?? 30
        );
      }

      return {
        hitResult,
        impactLocation: actualImpactLoc,
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
