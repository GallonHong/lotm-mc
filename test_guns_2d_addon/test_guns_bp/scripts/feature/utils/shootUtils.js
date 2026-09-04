import { ReloadManager } from '../reload.js';
import { SkillManager } from '../skillManager.js';
import { RecoilManager } from '../recoilManager.js';
import { MathUtils } from './mathUtils.js';
import { DamageHandler } from '../damageHandler.js';
import { FireMode } from '../../data/types.js';
import { EntityDamageCause } from '@minecraft/server';
import { resolveBlockRaycastHit } from './raycastUtils.js';

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
    const isHeavy = gun.id === 'test_gun:m82' || gun.type === 'sniper' || gun.type === 'shotgun' || gun.ammoTypeId === 'test_gun:ammo_50cal' || gun.id === 'test_gun:deagle';
    if (isHeavy) {
      dimension.spawnParticle('test_gun:muzzle_flash_heavy', muzzleLoc);
    } else {
      dimension.spawnParticle('test_gun:muzzle_flash_circle', muzzleLoc);
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

  let particleId = "test_gun:bullet_tracer";
  let stepSize = 0.75;
  let maxSteps = 55;

  // 1. 重型弹头 / .50口径 (Barrett M82, SVD, Deagle 沙漠之鹰)
  if (gun.id === 'test_gun:m82' || gun.type === 'sniper' || gun.id === 'test_gun:svd' || gun.ammoTypeId === 'test_gun:ammo_50cal' || gun.id === 'test_gun:deagle') {
    particleId = "test_gun:heavy_tracer";
    stepSize = 0.70;
    maxSteps = 70;
  }
  // 2. PKM 烈焰重机枪专属燃烧曳光
  else if (gun.isIncendiaryDot || gun.id === 'test_gun:pkm') {
    particleId = "test_gun:pkm_burn";
    stepSize = 0.75;
    maxSteps = 55;
  }
  // 3. 霰弹枪多弹丸
  else if (gun.type === 'shotgun' || gun.mode === FireMode.SHOTGUN) {
    particleId = "test_gun:shotgun_tracer";
    stepSize = 1.20;
    maxSteps = 16;
  }
  // 4. 冲锋枪与轻型手枪
  else if (gun.type === 'smg' || gun.type === 'pistol') {
    particleId = "test_gun:vector_tracer";
    stepSize = 0.80;
    maxSteps = 40;
  }
  // 5. 突击步枪
  else {
    particleId = "test_gun:bullet_tracer";
    stepSize = 0.75;
    maxSteps = 55;
  }

  const steps = Math.max(2, Math.min(Math.floor(totalDist / stepSize), maxSteps));

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
      const resolved = resolveBlockRaycastHit(blockHit, dir);
      if (resolved) {
        impactLoc = resolved.visual;
        blockDist = Math.hypot(resolved.surface.x - hx, resolved.surface.y - hy, resolved.surface.z - hz);
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

  drawBulletTracer(dimension, spawnLoc, impactLoc, gun);

  if (hitEntity) {
    DamageHandler.handleHit(null, player, hitEntity, gun, impactLoc);
  } else if (hitBlock) {
    try {
      dimension.spawnParticle('test_gun:bullet_hit_spark', impactLoc);
      dimension.spawnParticle('test_gun:bullet_hit_smoke', impactLoc);
      if (gun.ammoTypeId === 'test_gun:ammo_50cal' || gun.type === 'sniper' || gun.id === 'test_gun:deagle') {
        dimension.spawnParticle('test_gun:bullet_hit_heavy_flash', impactLoc);
      }
    } catch {}
  }

  // 💥 巴雷特 M82 .50 高爆穿甲弹头被动 (20% 概率触发)
  if (gun.id === 'test_gun:m82' && Math.random() < (gun.explosiveChance || 0.20)) {
    try {
      const blastLoc = impactLoc;
      dimension.spawnParticle('minecraft:huge_explosion_emitter', blastLoc);
      dimension.spawnParticle('minecraft:basic_flame_particle', blastLoc);
      dimension.spawnParticle('minecraft:sonic_explosion', blastLoc);

      dimension.playSound('random.explode', blastLoc, { volume: 2.5, pitch: 1.1 });
      dimension.playSound('ambient.weather.thunder', blastLoc, { volume: 1.8, pitch: 1.8 });

      if (player && player.isValid()) {
        try { player.onScreenDisplay?.setActionBar?.('§e💥【巴雷特·高爆穿甲弹触发!】§r'); } catch {}
      }

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
  const isADS = Boolean(player.isSneaking);

  // 枪口火焰直接生成在玩家视线正前方 0.2 格处
  spawnMuzzleFlash(player.dimension, spawnLoc, gun);

  if (gun.mode === FireMode.SHOTGUN || gun.type === 'shotgun') {
    const PELLETS = (gun.stats && gun.stats.pelletCount) ? gun.stats.pelletCount : 8;
    // 战术开镜瞄准时散布极度收拢 (0.02 vs 0.075)
    const spreadFactor = isADS ? 0.022 : 0.075;

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
    let finalDir = viewDir;
    if (!SkillManager.isOverdriveActive(player)) {
      const offset = RecoilManager.getSprayOffset(player.id, gun.recoil);
      // 开镜状态下散布减小 75%
      const spreadMult = isADS ? 0.25 : 1.0;
      const sx = (Number(viewDir.x) || 0) + offset.x * spreadMult;
      const sy = (Number(viewDir.y) || 0) + offset.y * spreadMult;
      const sz = (Number(viewDir.z) || 0) + offset.z * spreadMult;
      const sLen = Math.hypot(sx, sy, sz) || 1;
      finalDir = { x: sx / sLen, y: sy / sLen, z: sz / sLen };
    }

    processBulletRay(player, gun, finalDir, spawnLoc, maxRange);
  }
}
