import { world, system, EntityDamageCause } from "@minecraft/server";
import { DamageResolver } from "./DamageResolver.js";

export class ArcEngine {
  /**
   * 触发高压特斯拉电弧 (智能电磁索敌 + 连锁闪电跃迁)
   */
  static fireArc(player, config) {
    if (!player || !player.isValid()) return null;

    try {
      const dim = player.dimension;
      const headLoc = player.getHeadLocation();
      const viewDir = player.getViewDirection();

      const muzzleLoc = {
        x: headLoc.x + viewDir.x * 0.7,
        y: headLoc.y + viewDir.y * 0.7 - 0.1,
        z: headLoc.z + viewDir.z * 0.7
      };

      const maxDist = config.maxRange ?? 32.0;

      // 1. 智能电磁索敌 (40度前方广角自动磁吸锁定)
      let primaryTarget = null;
      let primaryHitPos = null;
      let bestScore = -999;

      try {
        const nearby = dim.getEntities({
          location: headLoc,
          maxDistance: maxDist
        });

        for (const ent of nearby) {
          if (!ent || !ent.isValid() || ent.id === player.id) continue;
          if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

          const entLoc = ent.location;
          const eCenter = { x: entLoc.x, y: entLoc.y + 0.9, z: entLoc.z };
          const dx = eCenter.x - headLoc.x;
          const dy = eCenter.y - headLoc.y;
          const dz = eCenter.z - headLoc.z;
          const dist = Math.hypot(dx, dy, dz);
          if (dist < 0.5 || dist > maxDist) continue;

          const dot = (dx * viewDir.x + dy * viewDir.y + dz * viewDir.z) / dist;
          if (dot > 0.70) {
            const normToEnt = { x: dx / dist, y: dy / dist, z: dz / dist };
            let hasWall = false;
            try {
              const bHit = dim.getBlockFromRay(headLoc, normToEnt, {
                maxDistance: dist - 0.2,
                includePassableBlocks: false,
                includeLiquidBlocks: false
              });
              if (bHit && bHit.block) hasWall = true;
            } catch {}

            if (!hasWall) {
              const score = (dot * 2.5) - (dist / maxDist);
              if (score > bestScore) {
                bestScore = score;
                primaryTarget = ent;
                primaryHitPos = eCenter;
              }
            }
          }
        }
      } catch (err) {}

      // 如果未锁定到活体目标，检测准星直指方块
      if (!primaryTarget) {
        try {
          const blockHit = dim.getBlockFromRay(headLoc, viewDir, {
            maxDistance: maxDist,
            includePassableBlocks: false,
            includeLiquidBlocks: true
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

      // 如果命中了第一只目标
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
        // 未直击实体，打在地面/方块 -> 搜寻落点周围 5 格内最近的敌人作为链起点
        try {
          dim.playSound("apex.arc.hit", primaryHitPos, { volume: 1.0, pitch: 1.2 });
          dim.spawnParticle("apex:arc_spark", primaryHitPos);

          const nearby = dim.getEntities({
            location: primaryHitPos,
            maxDistance: 5.0
          });

          for (const ent of nearby) {
            if (!ent || !ent.isValid() || hitSet.has(ent.id)) continue;
            if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

            currentSourceEntity = ent;
            const entLoc = { x: ent.location.x, y: ent.location.y + 0.8, z: ent.location.z };
            currentSourcePos = entLoc;
            hitSet.add(ent.id);

            this.drawLightningBeam(dim, primaryHitPos, entLoc);

            const dmg = Math.round(baseDamage * 0.75);
            this.#applyElectricDamage(player, ent, entLoc, dmg);
            hitEntities.push({ entity: ent, damage: dmg, jump: 1 });
            break;
          }
        } catch {}
      }

      // 4. 连续向周围 7 格内传递闪电链 (伤害逐级递减 25%)
      let prevPos = currentSourceEntity ? {
        x: currentSourceEntity.location.x,
        y: currentSourceEntity.location.y + 0.8,
        z: currentSourceEntity.location.z
      } : currentSourcePos;

      for (let jump = 1; jump <= maxChains; jump++) {
        if (!prevPos) break;

        let nextTarget = null;
        let nextTargetDist = chainRadius + 1;

        try {
          const candidates = dim.getEntities({
            location: prevPos,
            maxDistance: chainRadius
          });

          for (const cand of candidates) {
            if (!cand || !cand.isValid() || hitSet.has(cand.id)) continue;
            if (cand.typeId === "minecraft:item" || cand.typeId === "minecraft:xp_orb") continue;

            const cLoc = cand.location;
            const d = Math.hypot(cLoc.x - prevPos.x, cLoc.y - prevPos.y, cLoc.z - prevPos.z);
            if (d < nextTargetDist) {
              nextTargetDist = d;
              nextTarget = cand;
            }
          }
        } catch {}

        if (!nextTarget) break;

        hitSet.add(nextTarget.id);
        const nextLoc = {
          x: nextTarget.location.x,
          y: nextTarget.location.y + 0.8,
          z: nextTarget.location.z
        };

        // 绘制两怪之间的连锁闪电电弧
        this.drawLightningBeam(dim, prevPos, nextLoc);

        // 计算递减伤害
        const jumpDamage = Math.max(3, Math.round(baseDamage * Math.pow(1 - decayRate, jump)));
        this.#applyElectricDamage(player, nextTarget, nextLoc, jumpDamage);

        try {
          dim.playSound("apex.arc.hit", nextLoc, { volume: 0.9, pitch: 1.0 + jump * 0.1 });
          dim.spawnParticle("apex:arc_spark", nextLoc);
        } catch {}

        hitEntities.push({
          entity: nextTarget,
          damage: jumpDamage,
          jump
        });

        prevPos = nextLoc;
      }

      return {
        totalHits: hitEntities.length,
        hitEntities
      };
    } catch (e) {
      console.warn(`[ApexFirearms] ArcEngine error: ${e}`);
      return null;
    }
  }

  /**
   * 应用真实闪电电击伤害 (100% 真实能量穿透)
   */
  static #applyElectricDamage(attacker, target, hitLocation, damage) {
    if (!target || !target.isValid()) return null;
    const healthComp = target.getComponent("minecraft:health");
    if (!healthComp) return null;

    const currentHp = healthComp.currentValue;
    const isFatal = damage >= currentHp;

    try {
      if (isFatal) {
        target.applyDamage(damage, {
          cause: EntityDamageCause.override,
          damagingEntity: attacker || undefined
        });
      } else {
        target.applyDamage(damage, {
          cause: EntityDamageCause.override
        });
      }
    } catch (e) {
      const newHp = Math.max(0, currentHp - damage);
      healthComp.setCurrentValue(newHp);
    }

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
   * 绘制高能闪电等离子电弧光束 (使用 apex:arc_beam + endrod，0 报错，高亮耀眼)
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
