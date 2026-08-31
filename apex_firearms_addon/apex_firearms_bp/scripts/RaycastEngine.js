import { MolangVariableMap } from "@minecraft/server";
import { AK47_CONFIG } from "./AmmoSystem.js";
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
   * 执行带有散布偏移的视线射线投射
   */
  static castBullet(player, spreadMultiplier = 1.0) {
    if (!player || !player.isValid()) return null;

    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();

    // 计算散布 (高斯微偏)
    const spread = (player.isSneaking ? AK47_CONFIG.spreadSneak : AK47_CONFIG.spreadStand) * spreadMultiplier;
    const spreadX = (Math.random() - 0.5) * spread;
    const spreadY = (Math.random() - 0.5) * spread;
    const spreadZ = (Math.random() - 0.5) * spread;

    const shootDir = {
      x: viewDir.x + spreadX,
      y: viewDir.y + spreadY,
      z: viewDir.z + spreadZ
    };

    // 向量归一化
    const len = Math.sqrt(shootDir.x ** 2 + shootDir.y ** 2 + shootDir.z ** 2) || 1.0;
    const normDir = { x: shootDir.x / len, y: shootDir.y / len, z: shootDir.z / len };

    // 1. 方块射线检测
    const blockHit = dim.getBlockFromRay(headLoc, normDir, {
      maxDistance: AK47_CONFIG.maxRange,
      includePassableBlocks: false,
      includeLiquidBlocks: false
    });

    let maxDistance = AK47_CONFIG.maxRange;
    let blockImpactLoc = null;

    if (blockHit) {
      const bLoc = blockHit.block.location;
      const bTypeId = blockHit.block.typeId;
      maxDistance = Math.sqrt((bLoc.x - headLoc.x) ** 2 + (bLoc.y - headLoc.y) ** 2 + (bLoc.z - headLoc.z) ** 2);
      blockImpactLoc = {
        x: headLoc.x + normDir.x * maxDistance,
        y: headLoc.y + normDir.y * maxDistance,
        z: headLoc.z + normDir.z * maxDistance
      };

      // 穿透与破坏脆弱方块 (玻璃/树叶)
      if (BREAKABLE_BLOCKS.has(bTypeId)) {
        try {
          dim.runCommand(`fill ${bLoc.x} ${bLoc.y} ${bLoc.z} ${bLoc.x} ${bLoc.y} ${bLoc.z} air destroy`);
        } catch {}
      } else {
        // 生成方块撞击火花与碎屑
        try {
          dim.spawnParticle("minecraft:crit", blockImpactLoc);
          dim.spawnParticle("minecraft:smoke_particle", blockImpactLoc);
        } catch {}
      }
    }

    // 2. 实体射线检测
    const entityHits = dim.getEntitiesFromRay(headLoc, normDir, {
      maxDistance: maxDistance,
      ignoreBlockCollision: false
    });

    let hitResult = null;
    if (entityHits && entityHits.length > 0) {
      for (const hit of entityHits) {
        const entity = hit.entity;
        if (entity.id === player.id) continue; // 忽略玩家自身

        const hitLoc = {
          x: headLoc.x + normDir.x * hit.distance,
          y: headLoc.y + normDir.y * hit.distance,
          z: headLoc.z + normDir.z * hit.distance
        };

        const dmgResult = DamageResolver.applyDamage(player, entity, hitLoc);
        if (dmgResult) {
          hitResult = {
            target: entity,
            distance: hit.distance,
            ...dmgResult
          };
          break; // 击中第一个有效实体
        }
      }
    }

    return {
      hitResult,
      blockHit,
      impactLocation: hitResult ? null : blockImpactLoc,
      direction: normDir
    };
  }
}
