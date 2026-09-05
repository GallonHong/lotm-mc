import { world, system, EntityDamageCause } from "@minecraft/server";
import { DamageResolver } from "./DamageResolver.js";

export class ArcEngine {
  /**
   * 触发特斯拉电弧发射器开火
   */
  static fireArc(player, config) {
    if (!player || !player.isValid()) return null;

    try {
      const dim = player.dimension;
      const headLoc = player.getHeadLocation();
      const viewDir = player.getViewDirection();
      const maxDist = config.maxRange ?? 22.0;

      const muzzleLoc = {
        x: headLoc.x + viewDir.x * 0.8,
        y: headLoc.y + viewDir.y * 0.8 - 0.1,
        z: headLoc.z + viewDir.z * 0.8
      };

      // 枪口离子火花
      try {
        dim.spawnParticle("apex:arc_spark", muzzleLoc);
        dim.spawnParticle("minecraft:endrod", muzzleLoc);
      } catch {}

      // 1. 直线视线探测第一落点/目标
      let primaryTarget = null;
      let primaryHitPos = null;

      try {
        const entHits = dim.getEntitiesFromRay(headLoc, viewDir, {
          maxDistance: maxDist,
          ignoreBlockCollision: false
        });

        if (entHits && entHits.length > 0) {
          for (const eh of entHits) {
            const ent = eh.entity;
            if (!ent || !ent.isValid() || ent.id === player.id) continue;
            if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

            primaryTarget = ent;
            primaryHitPos = {
              x: headLoc.x + viewDir.x * eh.distance,
              y: headLoc.y + viewDir.y * eh.distance,
              z: headLoc.z + viewDir.z * eh.distance
            };
            break;
          }
        }
      } catch {}

      if (!primaryHitPos) {
        try {
          const blockHit = dim.getBlockFromRay(headLoc, viewDir, {
            maxDistance: maxDist,
            includePassableBlocks: false,
            includeLiquidBlocks: false
          });

          if (blockHit && blockHit.block) {
            const bDist = blockHit.distance;
            primaryHitPos = {
              x: headLoc.x + viewDir.x * bDist,
              y: headLoc.y + viewDir.y * bDist,
              z: headLoc.z + viewDir.z * bDist
            };
          }
        } catch {}
      }

      if (!primaryHitPos) {
        primaryHitPos = {
          x: headLoc.x + viewDir.x * maxDist,
          y: headLoc.y + viewDir.y * maxDist,
          z: headLoc.z + viewDir.z * maxDist
        };
      }

      // 2. 绘制从枪口到第一落点的高亮等离子闪电光束
      this.drawLightningBeam(dim, muzzleLoc, primaryHitPos);

      // 3. 伤害与连锁闪电跃迁结算
      const hitEntities = [];
      const hitSet = new Set([player.id]);

      const baseDamage = config.baseDamage ?? 24;
      const decayRate = config.decayRate ?? 0.25;
      const chainRadius = config.chainRadius ?? 7.0;
      const maxChains = config.maxChains ?? 5;

      let currentSourcePos = primaryHitPos;
      let currentSourceEntity = primaryTarget;

      if (primaryTarget && primaryTarget.isValid()) {
        hitSet.add(primaryTarget.id);
        const dmgResult = this.#applyElectricDamage(player, primaryTarget, primaryHitPos, baseDamage);

        hitEntities.push({
          entity: primaryTarget,
          damage: dmgResult?.damage ?? baseDamage,
          jump: 0
        });

        try {
          dim.playSound("apex.arc.hit", primaryHitPos, { volume: 1.2, pitch: 1.0 });
          dim.spawnParticle("apex:arc_spark", primaryHitPos);
          dim.spawnParticle("minecraft:crit", primaryHitPos);
        } catch {}
      } else {
        try {
          dim.playSound("apex.arc.hit", primaryHitPos, { volume: 1.0, pitch: 1.2 });
          dim.spawnParticle("apex:arc_spark", primaryHitPos);

          const nearby = dim.getEntities({
            location: primaryHitPos,
            maxDistance: 5.0
          });

          for (const cand of nearby) {
            if (!cand || !cand.isValid() || hitSet.has(cand.id)) continue;
            if (cand.typeId === "minecraft:item" || cand.typeId === "minecraft:xp_orb") continue;

            currentSourceEntity = cand;
            currentSourcePos = cand.location;
            hitSet.add(cand.id);

            const dmgResult = this.#applyElectricDamage(player, cand, cand.location, baseDamage);
            hitEntities.push({
              entity: cand,
              damage: dmgResult?.damage ?? baseDamage,
              jump: 0
            });

            this.drawLightningBeam(dim, primaryHitPos, cand.location);
            break;
          }
        } catch {}
      }

      // 4. 连锁闪电最多 5 次目标跃迁
      let currentJumpDamage = baseDamage;

      for (let jump = 1; jump < maxChains; jump++) {
        if (!currentSourceEntity && !currentSourcePos) break;

        currentJumpDamage = Math.max(4, Math.round(currentJumpDamage * (1 - decayRate)));

        let nextTarget = null;
        let nextDistance = 999;

        try {
          const originPos = currentSourceEntity?.location || currentSourcePos;
          const candidates = dim.getEntities({
            location: originPos,
            maxDistance: chainRadius
          });

          for (const cand of candidates) {
            if (!cand || !cand.isValid() || hitSet.has(cand.id)) continue;
            if (cand.typeId === "minecraft:item" || cand.typeId === "minecraft:xp_orb") continue;

            const cLoc = cand.location;
            const dist = Math.hypot(cLoc.x - originPos.x, cLoc.y - originPos.y, cLoc.z - originPos.z);
            if (dist < nextDistance) {
              nextDistance = dist;
              nextTarget = cand;
            }
          }
        } catch {}

        if (!nextTarget) break;

        hitSet.add(nextTarget.id);
        const fromPos = currentSourceEntity?.location || currentSourcePos;
        const toPos = nextTarget.location;

        this.drawLightningBeam(dim, fromPos, toPos);

        const dmgResult = this.#applyElectricDamage(player, nextTarget, toPos, currentJumpDamage);
        hitEntities.push({
          entity: nextTarget,
          damage: dmgResult?.damage ?? currentJumpDamage,
          jump
        });

        try {
          dim.playSound("apex.arc.hit", toPos, { volume: 0.9, pitch: 1.0 + jump * 0.1 });
          dim.spawnParticle("apex:arc_spark", toPos);
        } catch {}

        currentSourceEntity = nextTarget;
        currentSourcePos = toPos;
      }

      return {
        totalHits: hitEntities.length,
        hitEntities
      };
    } catch (err) {
      console.warn(`[ApexFirearms] ArcEngine fire error: ${err}`);
      return null;
    }
  }

  /**
   * 结算单体等离子电弧真伤并吸引仇恨
   */
  static #applyElectricDamage(attacker, target, hitLoc, damage) {
    if (!target || !target.isValid()) return null;

    const healthComp = target.getComponent("minecraft:health");
    if (!healthComp) return null;

    const currentHp = healthComp.currentValue;

    try {
      target.applyDamage(damage, {
        cause: EntityDamageCause.projectile,
        damagingEntity: attacker || undefined
      });
    } catch (e) {
      try {
        target.applyDamage(damage, {
          cause: EntityDamageCause.override,
          damagingEntity: attacker || undefined
        });
      } catch (e2) {
        const newHp = Math.max(0, currentHp - damage);
        healthComp.setCurrentValue(newHp);
      }
    }

    // 触发被电击生物对玩家的仇恨锁定
    DamageResolver.triggerMobAggro(target, attacker);

    // 施加短暂麻痹电击击退
    if (attacker) {
      const dir = attacker.getViewDirection();
      try {
        target.applyKnockback(dir.x, dir.z, 0.45, 0.15);
      } catch {}
    }

    return {
      damage,
      targetName: target.nameTag || target.typeId.replace("minecraft:", "")
    };
  }

  /**
   * 绘制高能闪电等离子电弧光束
   */
  static drawLightningBeam(dim, p1, p2) {
    if (!dim || !p1 || !p2) return;

    try {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 0.15) return;

      const steps = Math.min(Math.floor(dist / 0.45), 65);

      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const jitterX = (i === 0 || i === steps) ? 0 : (Math.random() - 0.5) * 0.22;
        const jitterY = (i === 0 || i === steps) ? 0 : (Math.random() - 0.5) * 0.22;
        const jitterZ = (i === 0 || i === steps) ? 0 : (Math.random() - 0.5) * 0.22;

        const px = p1.x + dx * frac + jitterX;
        const py = p1.y + dy * frac + jitterY;
        const pz = p1.z + dz * frac + jitterZ;

        try {
          dim.spawnParticle("apex:arc_beam", { x: px, y: py, z: pz });
          if (i % 2 === 0) {
            dim.spawnParticle("minecraft:endrod", { x: px, y: py, z: pz });
          }
        } catch {}
      }
    } catch {}
  }
}
