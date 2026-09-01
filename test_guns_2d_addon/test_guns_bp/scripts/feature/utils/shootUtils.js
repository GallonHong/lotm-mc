import { MathUtils } from './mathUtils.js';
import { DamageHandler } from '../damageHandler.js';
import { FireMode } from '../../data/types.js';

export function getSpawnLocation(player) {
  const headPos = player.getHeadLocation();
  const viewDir = player.getViewDirection();

  const hx = Number(headPos.x) || 0;
  const hy = Number(headPos.y) || 0;
  const hz = Number(headPos.z) || 0;
  const vx = Number(viewDir.x) || 0;
  const vy = Number(viewDir.y) || 0;
  const vz = Number(viewDir.z) || 0;

  const forward = { x: vx * 0.9, y: vy * 0.9, z: vz * 0.9 };

  let rx = -vz;
  let rz = vx;
  const rLen = Math.hypot(rx, rz);
  if (rLen < 1e-4) {
    rx = 1;
    rz = 0;
  } else {
    rx /= rLen;
    rz /= rLen;
  }

  const rightOffset = { x: rx * 0.18, y: 0, z: rz * 0.18 };
  const upOffset = { x: 0, y: -0.12, z: 0 };

  return {
    x: hx + forward.x + rightOffset.x + upOffset.x,
    y: hy + forward.y + rightOffset.y + upOffset.y,
    z: hz + forward.z + rightOffset.z + upOffset.z
  };
}

export function spawnMuzzleFlash(dimension, muzzleLoc, gun) {
  if (!dimension || !muzzleLoc) return;
  try {
    // 纯净清晰的枪口火花，彻底移除遮挡视线的浓厚烟雾
    dimension.spawnParticle('minecraft:basic_flame_particle', muzzleLoc);
    if (gun.id === 'test_gun:m82' || gun.type === 'shotgun') {
      dimension.spawnParticle('minecraft:basic_flame_particle', {
        x: muzzleLoc.x + (Math.random() - 0.5) * 0.08,
        y: muzzleLoc.y + (Math.random() - 0.5) * 0.08,
        z: muzzleLoc.z + (Math.random() - 0.5) * 0.08
      });
    }
  } catch {}
}

export function drawBulletTracer(dimension, startPos, endPos, gun) {
  if (!dimension || !startPos || !endPos) return;

  const sx = Number(startPos.x);
  const sy = Number(startPos.y);
  const sz = Number(startPos.z);
  const ex = Number(endPos.x);
  const ey = Number(endPos.y);
  const ez = Number(endPos.z);

  if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(sz) ||
      !Number.isFinite(ex) || !Number.isFinite(ey) || !Number.isFinite(ez)) {
    return;
  }

  const dx = ex - sx;
  const dy = ey - sy;
  const dz = ez - sz;
  const totalDist = Math.hypot(dx, dy, dz);
  if (totalDist < 0.2 || !Number.isFinite(totalDist)) return;

  let particleId = "test_gun:bullet_tracer";
  let stepSize = 0.45;

  if (gun.id === 'test_gun:m82') {
    particleId = "test_gun:heavy_tracer";
    stepSize = 0.50;
  } else if (gun.id === 'test_gun:vector' || gun.type === 'smg') {
    particleId = "test_gun:vector_tracer";
    stepSize = 0.35;
  } else if (gun.id === 'test_gun:shotgun' || gun.type === 'shotgun') {
    particleId = "test_gun:shotgun_tracer";
    stepSize = 0.55;
  }

  const steps = Math.max(2, Math.min(Math.floor(totalDist / stepSize), 100));

  for (let i = 1; i <= steps; i++) {
    const frac = i / steps;
    const px = sx + dx * frac;
    const py = sy + dy * frac;
    const pz = sz + dz * frac;

    try {
      dimension.spawnParticle(particleId, { x: px, y: py, z: pz });
    } catch {
      try {
        dimension.spawnParticle("minecraft:crit", { x: px, y: py, z: pz });
      } catch {}
    }
  }
}

function processBulletRay(player, gun, dir, spawnLoc, maxRange) {
  const dimension = player.dimension;
  const headPos = player.getHeadLocation();

  const hx = Number(headPos.x) || 0;
  const hy = Number(headPos.y) || 0;
  const hz = Number(headPos.z) || 0;

  const dx = Number(dir.x) || 0;
  const dy = Number(dir.y) || 0;
  const dz = Number(dir.z) || 0;

  let impactLoc = {
    x: hx + dx * maxRange,
    y: hy + dy * maxRange,
    z: hz + dz * maxRange
  };
  let blockDist = maxRange;
  let hitEntity = null;
  let hitBlock = false;

  try {
    const blockHit = dimension.getBlockFromRay(headPos, dir, {
      maxDistance: maxRange,
      includePassableBlocks: false,
      includeLiquidBlocks: false
    });

    if (blockHit) {
      hitBlock = true;
      if (blockHit.faceLocation && Number.isFinite(blockHit.faceLocation.x)) {
        impactLoc = {
          x: blockHit.faceLocation.x,
          y: blockHit.faceLocation.y,
          z: blockHit.faceLocation.z
        };
        blockDist = Math.hypot(impactLoc.x - hx, impactLoc.y - hy, impactLoc.z - hz);
      } else if (blockHit.block) {
        const bl = blockHit.block.location;
        impactLoc = { x: bl.x + 0.5, y: bl.y + 0.5, z: bl.z + 0.5 };
        blockDist = Math.hypot(impactLoc.x - hx, impactLoc.y - hy, impactLoc.z - hz);
      }
    }
  } catch {}

  try {
    const entityHits = dimension.getEntitiesFromRay(headPos, dir, {
      maxDistance: blockDist,
      ignoreBlockCollision: false
    });

    if (entityHits && entityHits.length > 0) {
      for (const hit of entityHits) {
        const ent = hit.entity;
        if (!ent || !ent.isValid() || ent.id === player.id) continue;
        if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;

        hitEntity = ent;
        const eDist = (typeof hit.distance === 'number' && Number.isFinite(hit.distance))
          ? hit.distance
          : Math.hypot(ent.location.x - hx, ent.location.y - hy, ent.location.z - hz);

        impactLoc = {
          x: hx + dx * eDist,
          y: hy + dy * eDist,
          z: hz + dz * eDist
        };
        break;
      }
    }
  } catch {}

  spawnMuzzleFlash(dimension, spawnLoc, gun);
  drawBulletTracer(dimension, spawnLoc, impactLoc, gun);

  if (hitEntity) {
    DamageHandler.handleHit(null, player, hitEntity, gun, impactLoc);
  } else if (hitBlock) {
    try {
      dimension.spawnParticle('minecraft:crit', impactLoc);
      
    } catch {}
  }

  try {
    const projectile = dimension.spawnEntity(gun.projectileTypeId, spawnLoc);
    if (projectile) {
      projectile.addTag('tg_weapon:' + gun.id);
      projectile.addTag('tg_shooter:' + player.id);
      const velocity = { x: dx * gun.shootPower, y: dy * gun.shootPower, z: dz * gun.shootPower };
      projectile.applyImpulse(velocity);
    }
  } catch {}
}

export function fireBullet(player, gun) {
  const spawnLoc = getSpawnLocation(player);
  const viewDir = player.getViewDirection();
  const maxRange = (gun.stats && gun.stats.maxRange) ? gun.stats.maxRange : 60;

  if (gun.mode === FireMode.SHOTGUN) {
    const PELLETS = 6;
    const spreadFactor = 0.075;

    const vx = Number(viewDir.x) || 0;
    const vy = Number(viewDir.y) || 0;
    const vz = Number(viewDir.z) || 0;

    let rx = -vz;
    let rz = vx;
    const rLen = Math.hypot(rx, rz);
    if (rLen < 1e-4) {
      rx = 1;
      rz = 0;
    } else {
      rx /= rLen;
      rz /= rLen;
    }

    const ux = vy * rz;
    const uy = vz * rx - vx * rz;
    const uz = -vy * rx;

    for (let i = 0; i < PELLETS; i++) {
      const offsetX = (Math.random() - 0.5) * 2 * spreadFactor;
      const offsetY = (Math.random() - 0.5) * 2 * spreadFactor;

      const px = vx + rx * offsetX + ux * offsetY;
      const py = vy + uy * offsetY;
      const pz = vz + rz * offsetX + uz * offsetY;
      const pLen = Math.hypot(px, py, pz) || 1;

      const spreadDir = { x: px / pLen, y: py / pLen, z: pz / pLen };
      processBulletRay(player, gun, spreadDir, spawnLoc, maxRange);
    }
  } else {
    processBulletRay(player, gun, viewDir, spawnLoc, maxRange);
  }
}
