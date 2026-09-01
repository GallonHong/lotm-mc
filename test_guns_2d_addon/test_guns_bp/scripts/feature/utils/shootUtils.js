import { MathUtils } from './mathUtils.js';
import { DamageHandler } from '../damageHandler.js';
import { FireMode } from '../../data/types.js';
import { EntityDamageCause } from '@minecraft/server';

export function getSpawnLocation(player) {
  const headPos = player.getHeadLocation();
  const viewDir = player.getViewDirection();

  const hx = Number(headPos?.x) || 0;
  const hy = Number(headPos?.y) || 0;
  const hz = Number(headPos?.z) || 0;
  const vx = Number(viewDir?.x) || 0;
  const vy = Number(viewDir?.y) || 0;
  const vz = Number(viewDir?.z) || 0;

  // 使用紧凑安全的 0.20 格偏移，确保在任何方向（南/北/东/西/俯仰）都不会穿入方块
  return {
    x: hx + vx * 0.20,
    y: hy + vy * 0.20 - 0.05,
    z: hz + vz * 0.20
  };
}

export function spawnMuzzleFlash(dimension, muzzleLoc, gun) {
  if (!dimension || !muzzleLoc) return;
  try {
    dimension.spawnParticle('minecraft:basic_flame_particle', muzzleLoc);
    if (gun.id === 'test_gun:m82' || gun.type === 'sniper' || gun.type === 'shotgun') {
      dimension.spawnParticle('minecraft:crit', muzzleLoc);
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
  if (totalDist < 0.1 || !Number.isFinite(totalDist)) return;

  // 全枪系专属全向高亮弹道粒子
  let particleId = "test_gun:bullet_tracer";
  let stepSize = 0.35;

  if (gun.id === 'test_gun:m82' || gun.type === 'sniper' || gun.id === 'test_gun:svd') {
    particleId = "test_gun:heavy_tracer";
    stepSize = 0.35;
  } else if (gun.type === 'smg' || gun.type === 'pistol' || gun.id === 'test_gun:vector' || gun.id === 'test_gun:p90' || gun.id === 'test_gun:bizon' || gun.id === 'test_gun:glock') {
    particleId = "test_gun:vector_tracer";
    stepSize = 0.30;
  } else if (gun.type === 'shotgun') {
    particleId = "test_gun:shotgun_tracer";
    stepSize = 0.40;
  } else {
    particleId = "test_gun:bullet_tracer";
    stepSize = 0.35;
  }

  const steps = Math.max(3, Math.min(Math.floor(totalDist / stepSize), 150));

  for (let i = 1; i <= steps; i++) {
    const frac = i / steps;
    const px = sx + dx * frac;
    const py = sy + dy * frac;
    const pz = sz + dz * frac;

    try {
      dimension.spawnParticle(particleId, { x: px, y: py, z: pz });
    } catch {}
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

  // 💥 巴雷特 M82 .50 高爆穿甲弹头被动 (100% 触发全地形高爆冲击波)
  if (gun.id === 'test_gun:m82') {
    try {
      const blastLoc = impactLoc;
      // 1. 产生超强高爆与冲击波视觉
      dimension.spawnParticle('minecraft:huge_explosion_emitter', blastLoc);
      dimension.spawnParticle('minecraft:basic_flame_particle', blastLoc);
      dimension.spawnParticle('minecraft:sonic_explosion', blastLoc);

      // 2. 播放重型反器材高爆轰鸣
      dimension.playSound('random.explode', blastLoc, { volume: 2.5, pitch: 1.1 });
      dimension.playSound('ambient.weather.thunder', blastLoc, { volume: 1.8, pitch: 1.8 });

      // 3. 对 4.5 格范围内的所有周围实体造成 25 点高爆范围溅射与点燃
      const victims = dimension.getEntities({
        location: blastLoc,
        maxDistance: 4.5
      });
      for (const vic of victims) {
        if (!vic || !vic.isValid() || (player && vic.id === player.id)) continue;
        if (vic.typeId === 'minecraft:item' || vic.typeId === 'minecraft:xp_orb') continue;
        if (hitEntity && vic.id === hitEntity.id) continue;

        const vl = vic.location;
        const d = Math.hypot(vl.x - blastLoc.x, vl.y - blastLoc.y, vl.z - blastLoc.z);
        const factor = Math.max(0.3, 1.0 - (d / 4.5));
        const splashDmg = Math.round(25.0 * factor);

        try {
          vic.applyDamage(splashDmg, {
            cause: EntityDamageCause.override,
            damagingEntity: (player && player.isValid()) ? player : undefined
          });
          vic.setOnFire(3, true);
        } catch {}
      }
    } catch (e) {
      console.warn('M82 blast error:', e);
    }
  }
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
