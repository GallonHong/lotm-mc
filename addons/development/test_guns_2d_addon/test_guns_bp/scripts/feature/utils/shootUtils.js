import { ReloadManager } from '../reload.js';
import { SkillManager } from '../skillManager.js';
import { RecoilManager } from '../recoilManager.js';
import { MathUtils } from './mathUtils.js';
import { DamageHandler } from '../damageHandler.js';
import { FireMode } from '../../data/types.js';
import { EntityDamageCause } from '@minecraft/server';
import { resolveBlockRaycastHit } from './raycastUtils.js';
import { isProtectedTeammate } from './teamRules.js';

export { getMuzzleLocation as getSpawnLocation } from './muzzleUtils.js';
import { getMuzzle, clipSegment } from './muzzleUtils.js';

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

 for (let i = 0; i <= steps; i++) {
  const frac = i / steps;
  const px = sx + dx * frac;
  const py = sy + dy * frac;
  const pz = sz + dz * frac;

  try {
   dimension.spawnParticle(particleId, { x: px, y: py, z: pz });
  } catch {}
 }
}

function processBulletRay(player, gun, dir, muzzle, maxRange) {
 const dimension = player.dimension;
 const spawnLoc = muzzle.location;
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

 // Preserve crosshair aim and spread, but the barrel must also have a clear
 // path to the selected impact. Covers eye-visible targets behind low cover.
 const barrelPath = muzzle.blocked ? muzzle : clipSegment(dimension, spawnLoc, impactLoc);
 if (barrelPath.blocked) {
  impactLoc = barrelPath.location;
  hitEntity = null;
  hitBlock = true;
 }
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

 // 巴雷特 M82 .50 高爆穿甲弹头被动 (20% 概率触发)
 if (gun.id === 'test_gun:m82' && Math.random() < (gun.explosiveChance || 0.20)) {
  try {
   const blastLoc = impactLoc;
   dimension.spawnParticle('minecraft:huge_explosion_emitter', blastLoc);
   dimension.spawnParticle('minecraft:basic_flame_particle', blastLoc);
   dimension.spawnParticle('minecraft:sonic_explosion', blastLoc);

   dimension.playSound('random.explode', blastLoc, { volume: 2.5, pitch: 1.1 });
   dimension.playSound('ambient.weather.thunder', blastLoc, { volume: 1.8, pitch: 1.8 });

   if (player && player.isValid()) {
    try { player.onScreenDisplay?.setActionBar?.('§e【巴雷特·高爆穿甲弹触发!】§r'); } catch {}
   }

   const victims = dimension.getEntities({
    location: blastLoc,
    maxDistance: 4.5
   });
   for (const vic of victims) {
    if (!vic || !vic.isValid() || (player && vic.id === player.id)) continue;
    if (vic.typeId === 'minecraft:item' || vic.typeId === 'minecraft:xp_orb') continue;
    if (hitEntity && vic.id === hitEntity.id) continue;
    if (isProtectedTeammate(player, vic)) continue;

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
 const muzzle = getMuzzle(player, gun);
 const viewDir = player.getViewDirection();
 const maxRange = (gun.stats && gun.stats.maxRange) ? gun.stats.maxRange : 60;

 // Muzzle flash is emitted by the animated attachable locator in both views.

 if (gun.mode === FireMode.SHOTGUN || gun.type === 'shotgun') {
  const PELLETS = (gun.stats && gun.stats.pelletCount) ? gun.stats.pelletCount : 8;
  const profile = RecoilManager.beginShot(player, gun);
  for (let i = 0; i < PELLETS; i++) {
   const spreadDir = RecoilManager.getShotDirection(player, gun, viewDir, profile, true);
   processBulletRay(player, gun, spreadDir, muzzle, maxRange);
  }
 } else {
  let finalDir = viewDir;
  if (!SkillManager.isOverdriveActive(player)) {
   finalDir = RecoilManager.getShotDirection(player, gun, viewDir);
  }

  processBulletRay(player, gun, finalDir, muzzle, maxRange);
 }
}
