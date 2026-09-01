import { MathUtils } from './mathUtils.js';
import { DamageHandler } from '../damageHandler.js';
import { FireMode } from '../../data/types.js';

export function getSpawnLocation(player) {
  const headPos = player.getHeadLocation();
  const viewDir = player.getViewDirection();
  const forward = MathUtils.scale(viewDir, 1.0);

  // Compute right vector: (-z, 0, x)
  let right = { x: -viewDir.z, y: 0, z: viewDir.x };
  const rLen = MathUtils.length(right);
  if (rLen < 1e-4) {
    right = { x: 1, y: 0, z: 0 };
  } else {
    right = MathUtils.scale(right, 1 / rLen);
  }

  const rightOffset = MathUtils.scale(right, 0.18);
  const upOffset = { x: 0, y: -0.12, z: 0 };

  return MathUtils.add(MathUtils.add(MathUtils.add(headPos, forward), rightOffset), upOffset);
}

/**
 * 枪口初速火光与开火气浪
 */
export function spawnMuzzleFlash(dimension, muzzleLoc, gun) {
  if (!dimension || !muzzleLoc) return;
  try {
    dimension.spawnParticle('minecraft:basic_flame_particle', muzzleLoc);
    if (gun.type === 'shotgun') {
      dimension.spawnParticle('minecraft:huge_explosion_lab_misc_emitter', muzzleLoc);
    } else {
      dimension.spawnParticle('minecraft:campfire_smoke_particle', muzzleLoc);
    }
  } catch {}
}

/**
 * 沿弹道射线高密度渲染发光曳光流 (Tracer Beam)
 */
export function drawBulletTracer(dimension, startPos, endPos, gun) {
  if (!dimension || !startPos || !endPos) return;

  try {
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const dz = endPos.z - startPos.z;
    const totalDist = Math.hypot(dx, dy, dz);
    if (totalDist < 0.3) return;

    let particleId = "test_gun:bullet_tracer";
    let stepSize = 0.5;

    if (gun.id === 'test_gun:vector' || gun.type === 'smg') {
      particleId = "test_gun:vector_tracer";
      stepSize = 0.4;
    } else if (gun.id === 'test_gun:shotgun' || gun.type === 'shotgun') {
      particleId = "test_gun:shotgun_tracer";
      stepSize = 0.6;
    }

    const steps = Math.min(Math.floor(totalDist / stepSize), 85);

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
 * 执行单发弹道射线命中与伤害结算 (枪口火光 + 高密曳光 + 命中火花)
 */
function processBulletRay(player, gun, dir, spawnLoc, maxRange) {
  const dimension = player.dimension;
  const headPos = player.getHeadLocation();

  let impactLoc = MathUtils.add(spawnLoc, MathUtils.scale(dir, maxRange));
  let hitEntity = null;
  let hitBlock = false;

  // 1. 方块射线碰撞检测
  let blockDist = maxRange;
  try {
    const blockHit = dimension.getBlockFromRay(headPos, dir, {
      maxDistance: maxRange,
      includePassableBlocks: false,
      includeLiquidBlocks: false
    });
    if (blockHit && blockHit.block) {
      hitBlock = true;
      blockDist = blockHit.distance;
      impactLoc = {
        x: headPos.x + dir.x * blockDist,
        y: headPos.y + dir.y * blockDist,
        z: headPos.z + dir.z * blockDist
      };
    }
  } catch {}

  // 2. 实体射线碰撞检测
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

  // 3. 渲染枪口火光与高密度曳光弹道
  spawnMuzzleFlash(dimension, spawnLoc, gun);
  drawBulletTracer(dimension, spawnLoc, impactLoc, gun);

  // 4. 结算击中效果 (实体受击 / 方块跳弹火花)
  if (hitEntity) {
    DamageHandler.handleHit(null, player, hitEntity, gun, impactLoc);
  } else if (hitBlock) {
    // 命中方块产生跳弹火花与撞击烟尘
    try {
      dimension.spawnParticle('minecraft:crit', impactLoc);
      dimension.spawnParticle('minecraft:basic_smoke_particle', impactLoc);
    } catch {}
  }

  // 5. 生成飞行投射物实体确保多人联机同步
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

export function fireBullet(player, gun) {
  const spawnLoc = getSpawnLocation(player);
  const viewDir = player.getViewDirection();
  const maxRange = (gun.stats && gun.stats.maxRange) ? gun.stats.maxRange : 60;

  if (gun.mode === FireMode.SHOTGUN) {
    // Shotgun: 6 pellets with conical spread & individual tracers
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
