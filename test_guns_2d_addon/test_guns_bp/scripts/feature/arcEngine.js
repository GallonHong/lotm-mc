import { world, EntityDamageCause } from '@minecraft/server';
import { DamageHandler } from './damageHandler.js';
import { resolveBlockRaycastHit } from './utils/raycastUtils.js';

export class ArcEngine {
  static fireArc(player, gun) {
    if (!player || !player.isValid()) return;

    try {
      const dim = player.dimension;
      const headPos = player.getHeadLocation();
      const viewDir = player.getViewDirection();
      const maxRange = gun.stats?.maxRange || 25;

      const hx = Number(headPos.x) || 0;
      const hy = Number(headPos.y) || 0;
      const hz = Number(headPos.z) || 0;
      const dx = Number(viewDir.x) || 0;
      const dy = Number(viewDir.y) || 0;
      const dz = Number(viewDir.z) || 0;

      const muzzleLoc = {
        x: hx + dx * 0.8,
        y: hy + dy * 0.8 - 0.1,
        z: hz + dz * 0.8
      };

      try {
        dim.spawnParticle('test_gun:arc_spark', muzzleLoc);
        dim.spawnParticle('minecraft:endrod', muzzleLoc);
      } catch {}

      let primaryTarget = null;
      let primaryHitPos = { x: hx + dx * maxRange, y: hy + dy * maxRange, z: hz + dz * maxRange };
      let blockDist = maxRange;

      try {
        const blockHit = dim.getBlockFromRay(headPos, viewDir, {
          maxDistance: maxRange,
          includePassableBlocks: false,
          includeLiquidBlocks: false
        });
        if (blockHit) {
          const resolved = resolveBlockRaycastHit(blockHit, viewDir);
          if (resolved) {
            primaryHitPos = resolved.visual;
            blockDist = Math.hypot(resolved.surface.x - hx, resolved.surface.y - hy, resolved.surface.z - hz);
          }
        }
      } catch {}

      try {
        const entHits = dim.getEntitiesFromRay(headPos, viewDir, {
          maxDistance: blockDist,
          ignoreBlockCollision: false
        });
        if (entHits && entHits.length > 0) {
          for (const eh of entHits) {
            const ent = eh.entity;
            if (!ent || !ent.isValid() || ent.id === player.id) continue;
            if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;

            primaryTarget = ent;
            const el = ent.location;
            primaryHitPos = { x: el.x, y: el.y + 0.9, z: el.z };
            break;
          }
        }
      } catch {}

      this.drawLightningBeam(dim, muzzleLoc, primaryHitPos);

      const hitSet = new Set([player.id]);
      const baseDamage = gun.stats?.damage || 16;
      const chainRadius = gun.stats?.chainRadius || 8.0;
      const maxChains = gun.stats?.maxChains || 4;
      const decayRate = gun.stats?.decayRate || 0.20;

      let currentSourcePos = primaryHitPos;

      if (primaryTarget && primaryTarget.isValid()) {
        hitSet.add(primaryTarget.id);
        this.applyElectricDamage(player, primaryTarget, primaryHitPos, baseDamage, gun);
      }

      let currentDmg = baseDamage;
      for (let chain = 0; chain < maxChains; chain++) {
        currentDmg *= (1.0 - decayRate);
        if (currentDmg < 4) break;

        let nextTarget = null;
        let nextTargetDist = chainRadius + 1;

        try {
          const candidates = dim.getEntities({
            location: currentSourcePos,
            maxDistance: chainRadius
          });

          for (const cand of candidates) {
            if (!cand || !cand.isValid() || hitSet.has(cand.id)) continue;
            if (cand.typeId === 'minecraft:item' || cand.typeId === 'minecraft:xp_orb') continue;

            const cl = cand.location;
            const d = Math.hypot(cl.x - currentSourcePos.x, cl.y - currentSourcePos.y, cl.z - currentSourcePos.z);
            if (d < nextTargetDist) {
              nextTargetDist = d;
              nextTarget = cand;
            }
          }
        } catch {}

        if (!nextTarget) break;

        hitSet.add(nextTarget.id);
        const nl = nextTarget.location;
        const targetPos = { x: nl.x, y: nl.y + 0.9, z: nl.z };

        this.drawLightningBeam(dim, currentSourcePos, targetPos);
        this.applyElectricDamage(player, nextTarget, targetPos, currentDmg, gun);

        currentSourcePos = targetPos;
      }
    } catch (e) {
      console.warn('ArcEngine fireArc error:', e);
    }
  }

  static applyElectricDamage(attacker, target, hitLoc, damage, gun) {
    if (!target || !target.isValid()) return;

    try {
      const dim = target.dimension;
      dim.spawnParticle('test_gun:arc_spark', hitLoc);
      dim.spawnParticle('minecraft:endrod', hitLoc);
    } catch {}

    const armor = DamageHandler.estimateArmorPoints(target);
    const finalDmg = DamageHandler.calculateArmorReduction(damage, armor, gun.stats?.armorPenetration || 0.40);

    try {
      target.applyDamage(finalDmg, {
        cause: EntityDamageCause.override,
        damagingEntity: (attacker && attacker.isValid()) ? attacker : undefined
      });
    } catch {
      try { target.applyDamage(finalDmg); } catch {}
    }

    try { target.setOnFire(2, true); } catch {}
    DamageHandler.triggerMobAggro(target, attacker);
  }

  static drawLightningBeam(dimension, startPos, endPos) {
    if (!dimension || !startPos || !endPos) return;

    const sx = Number(startPos.x);
    const sy = Number(startPos.y);
    const sz = Number(startPos.z);
    const ex = Number(endPos.x);
    const ey = Number(endPos.y);
    const ez = Number(endPos.z);

    if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(sz) ||
        !Number.isFinite(ex) || !Number.isFinite(ey) || !Number.isFinite(ez)) return;

    const dx = ex - sx;
    const dy = ey - sy;
    const dz = ez - sz;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.2) return;

    const steps = Math.min(Math.floor(dist / 0.4), 60);

    for (let i = 1; i <= steps; i++) {
      const frac = i / steps;
      const jx = (Math.random() - 0.5) * 0.15;
      const jy = (Math.random() - 0.5) * 0.15;
      const jz = (Math.random() - 0.5) * 0.15;

      const px = sx + dx * frac + jx;
      const py = sy + dy * frac + jy;
      const pz = sz + dz * frac + jz;

      try {
        dimension.spawnParticle('test_gun:arc_beam', { x: px, y: py, z: pz });
      } catch {}
    }
  }
}
