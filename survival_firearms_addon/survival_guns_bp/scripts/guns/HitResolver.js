/**
 * 命中解析器 (HitResolver)
 * 职责：
 * 1. 服务端权威 Raycast 射线检测 (绝对不信任客户端声称的“我击中了谁”)
 * 2. 结合 Hip-fire (腰射) 与 ADS (瞄准) 散射角扩散计算
 * 3. 方块遮挡判定 (无法穿墙击中实体)
 * 4. 判定部位分析 (头部 head vs 身体 body)
 */
export class HitResolver {
  /**
   * 执行单发弹道射线命中检测
   * @param {import("@minecraft/server").Player} player 射击玩家
   * @param {object} gunDef 枪械配置
   * @param {boolean} isAds 是否处于瞄准状态
   * @returns {object} 命中结果详情
   */
  static castShot(player, gunDef, isAds = false) {
    const dim = player.dimension;
    const eyePos = player.getHeadLocation();
    const viewDir = player.getViewDirection();

    // 1. 计算散射偏移
    const spread = isAds ? (gunDef.spreadAds ?? 0.01) : (gunDef.spreadHip ?? 0.04);
    const shootDir = this.#applySpread(viewDir, spread);

    // 枪口大概位置 (用于发射特效)
    const muzzlePos = {
      x: eyePos.x + shootDir.x * 0.6,
      y: eyePos.y - 0.15 + shootDir.y * 0.6,
      z: eyePos.z + shootDir.z * 0.6
    };

    const maxDist = gunDef.range;

    // 2. 检测方块遮挡
    let blockHitDist = maxDist + 1;
    let blockHitPos = null;
    try {
      const blockRay = dim.getBlockFromRay(eyePos, shootDir, { maxDistance: maxDist });
      if (blockRay && blockRay.block) {
        blockHitPos = blockRay.faceLocation ?? blockRay.block.location;
        blockHitDist = Math.hypot(
          blockHitPos.x - eyePos.x,
          blockHitPos.y - eyePos.y,
          blockHitPos.z - eyePos.z
        );
      }
    } catch {}

    // 3. 检测实体相交
    let targetHit = null;
    let targetDist = maxDist + 1;
    let targetHitPos = null;

    try {
      const entityRays = dim.getEntitiesFromRay(eyePos, shootDir, {
        maxDistance: maxDist
      });

      for (const hit of entityRays) {
        const entity = hit.entity;
        if (!entity || entity.id === player.id) continue;
        if (entity.typeId === "minecraft:item" || entity.typeId === "minecraft:xp_orb") continue;

        const dist = hit.distance;
        if (dist < targetDist) {
          targetDist = dist;
          targetHit = entity;
          targetHitPos = {
            x: eyePos.x + shootDir.x * dist,
            y: eyePos.y + shootDir.y * dist,
            z: eyePos.z + shootDir.z * dist
          };
        }
      }
    } catch {}

    // 4. 遮挡比较：若方块阻挡先于实体命中，则判定为击中方块
    if (blockHitDist < targetDist) {
      return {
        hit: false,
        hitType: "block",
        hitLocation: blockHitPos,
        muzzleLocation: muzzlePos,
        distance: blockHitDist
      };
    }

    // 5. 实体命中判定
    if (targetHit && targetDist <= maxDist) {
      const hitZone = this.#resolveHitZone(targetHit, targetHitPos);
      return {
        hit: true,
        hitType: "entity",
        target: targetHit,
        distance: targetDist,
        hitZone: hitZone,
        hitLocation: targetHitPos,
        muzzleLocation: muzzlePos
      };
    }

    // 6. 未命中任何物体
    const endPoint = {
      x: eyePos.x + shootDir.x * maxDist,
      y: eyePos.y + shootDir.y * maxDist,
      z: eyePos.z + shootDir.z * maxDist
    };

    return {
      hit: false,
      hitType: "none",
      hitLocation: endPoint,
      muzzleLocation: muzzlePos,
      distance: maxDist
    };
  }

  static #applySpread(viewDir, spread) {
    if (spread <= 0) return viewDir;

    // 随机球面扩散
    const offsetX = (Math.random() - 0.5) * spread * 2;
    const offsetY = (Math.random() - 0.5) * spread * 2;
    const offsetZ = (Math.random() - 0.5) * spread * 2;

    const dx = viewDir.x + offsetX;
    const dy = viewDir.y + offsetY;
    const dz = viewDir.z + offsetZ;
    const len = Math.hypot(dx, dy, dz) || 1.0;

    return {
      x: dx / len,
      y: dy / len,
      z: dz / len
    };
  }

  static #resolveHitZone(entity, hitPos) {
    try {
      const entPos = entity.location;
      const relY = hitPos.y - entPos.y;
      // 若受击相对高度高于 1.4 格 (对于 1.8~2.0 格高的生物)，认定为头部判定
      if (relY >= 1.4) {
        return "head";
      }
    } catch {}
    return "body";
  }
}
