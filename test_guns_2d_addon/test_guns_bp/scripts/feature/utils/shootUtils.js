import { MathUtils } from './mathUtils.js';
import { DamageHandler } from '../damageHandler.js';
import { FireMode } from '../../data/types.js';

export function getSpawnLocation(player) {
  const headPos = player.getHeadLocation();
  const viewDir = player.getViewDirection();
  const forward = MathUtils.scale(viewDir, 1.2);

  // Compute right vector: (-z, 0, x)
  let right = { x: -viewDir.z, y: 0, z: viewDir.x };
  const rLen = MathUtils.length(right);
  if (rLen < 1e-4) {
    right = { x: 1, y: 0, z: 0 };
  } else {
    right = MathUtils.scale(right, 1 / rLen);
  }

  const rightOffset = MathUtils.scale(right, 0.20);
  const upOffset = { x: 0, y: -0.15, z: 0 };

  return MathUtils.add(MathUtils.add(MathUtils.add(headPos, forward), rightOffset), upOffset);
}

/**
 * 沿弹道射线渲染 Apex 高亮子弹轨迹粒子 (Tracer Particles)
 */
export function drawBulletTracer(dimension, startPos, endPos, gun) {
  if (!dimension || !startPos || !endPos) return;

  try {
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const dz = endPos.z - startPos.z;
    const totalDist = Math.hypot(dx, dy, dz);
    if (totalDist < 0.5) return;

    let particleId = "test_gun:bullet_tracer";
    let stepSize = 0.8;

    if (gun.id === 'test_gun:vector' || gun.type === 'smg') {
      particleId = "test_gun:vector_tracer";
      stepSize = 0.6;
    } else if (gun.id === 'test_gun:shotgun' || gun.type === 'shotgun') {
      particleId = "test_gun:shotgun_tracer";
      stepSize = 1.0;
    }

    const steps = Math.min(Math.floor(totalDist / stepSize), 75);

    for (let i = 1; i <= steps; i++) {
      const frac = i / steps;
      const px = startPos.x + dx * frac;
      const py = startPos.y + dy * frac;
      const pz = startPos.z + dz * frac;

      try {
        dimension.spawnParticle(particleId, { x: px, y: py, z: pz });
      } catch {
        try {
          dimension.spawnParticle("minecraft:crit", { x: px, y: py, z: pz });
        } catch {}
      }
    }
  } catch {}
}

/**
 * 执行单发弹道射线命中与伤害结算 (带射线实体优先命中)
 */
function processBulletRay(player, gun, dir, spawnLoc, maxRange) {
  const dimension = player.dimension;
  const headPos = player.getHeadLocation();

  let impactLoc = MathUtils.add(spawnLoc, MathUtils.scale(dir, maxRange));
  let hitEntity = null;

  // 1. 方块射线检测
  let blockDist = maxRange;
  try {
    const blockHit = dimension.getBlockFromRay(headPos, dir, {
      maxDistance: maxRange,
      includePassableBlocks: false,
      includeLiquidBlocks: false
    });
    if (blockHit && blockHit.block) {
      blockDist = blockHit.distance;
      impactLoc = {
        x: headPos.x + dir.x * blockDist,
        y: headPos.y + dir.y * blockDist,
        z: headPos.z + dir.z * blockDist
      };
    }
  } catch {}

  // 2. 实体射线检测 (检测视线内的第一个生物)
  try {
    const entityHits = dimension.getEntitiesFromRay(headPos, dir, {
      maxDistance: blockDist,
      ignoreBlockCollision: false
    });

    for (const hit of entityHits) {
      const ent = hit.entity;
      if (ent && ent.isValid() && ent.id !== player.id) {
        if (ent.typeId !== 'minecraft:item' && ent.typeId !== 'minecraft:xp_orb') {
          hitEntity = ent;
          impactLoc = {
            x: headPos.x + dir.x * hit.distance,
            y: headPos.y + dir.y * hit.distance,
            z: headPos.z + dir.z * hit.distance
          };
          break;
        }
      }
    }
  } catch {}

  // 3. 渲染 Apex 曳光粒子弹道
  drawBulletTracer(dimension, spawnLoc, impactLoc, gun);

  // 4. 立即结算命中伤害 (无敌帧穿透)
  if (hitEntity) {
    DamageHandler.handleHit(null, player, hitEntity, gun, impactLoc);
  } else {
    // 若未直接命中实体，生成高速投射物实体覆盖边缘区域
    try {
      const projectile = dimension.spawnEntity(gun.projectileTypeId, spawnLoc);
      if (projectile) {
        projectile.addTag('tg_weapon:' + gun.id);
        projectile.addTag('tg_shooter:' + player.id);
        const velocity = MathUtils.scale(dir, gun.shootPower);
        projectile.applyImpulse(velocity);
      }
    } catch {}
  }
}

export function fireBullet(player, gun) {
  const spawnLoc = getSpawnLocation(player);
  const viewDir = player.getViewDirection();
  const maxRange = (gun.stats && gun.stats.maxRange) ? gun.stats.maxRange : 60;

  if (gun.mode === FireMode.SHOTGUN) {
    // Shotgun: 6 pellets with conical spread & individual damage resolution
    const PELLETS = 6;
    const spreadFactor = 0.075;

    let right = { x: -viewDir.z, y: 0, z: viewDir.x };
    const rLen = MathUtils.length(right);
    right = rLen > 1e-4 ? MathUtils.scale(right, 1 / rLen) : { x: 1, y: 0, z: 0 };

    const up = {
      x: viewDir.y * right.z - viewDir.z * right.y,
      y: viewDir.z * right.x - viewDir.x * right.z,
      z: viewDir.x * right.y - viewDir.y * right.x
    };

    for (let i = 0; i < PELLETS; i++) {
      const offsetX = (Math.random() - 0.5) * 2 * spreadFactor;
      const offsetY = (Math.random() - 0.5) * 2 * spreadFactor;

      const spreadDir = MathUtils.normalize(
        MathUtils.add(
          MathUtils.add(viewDir, MathUtils.scale(right, offsetX)),
          MathUtils.scale(up, offsetY)
        )
      );

      processBulletRay(player, gun, spreadDir, spawnLoc, maxRange);
    }
  } else {
    // Single Bullet (AK-47 / MP7 Vector)
    processBulletRay(player, gun, viewDir, spawnLoc, maxRange);
  }
}
