import { world, system } from "@minecraft/server";
import { DamageResolver } from "./DamageResolver.js";

export class ArcEngine {
  /**
   * 触发特斯拉高压电弧并向周围目标传递闪电链 (伤害递减)
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

      // 1. 首发射线检测
      let firstEntity = null;
      let firstImpactLoc = null;

      // 方块阻挡
      let blockDist = maxDist + 1;
      try {
        const blockHit = dim.getBlockFromRay(headLoc, viewDir, {
          maxDistance: maxDist,
          includePassableBlocks: false,
          includeLiquidBlocks: true
        });
        if (blockHit && blockHit.block) {
          blockDist = blockHit.distance;
          firstImpactLoc = {
            x: headLoc.x + viewDir.x * blockDist,
            y: headLoc.y + viewDir.y * blockDist,
            z: headLoc.z + viewDir.z * blockDist
          };
        }
      } catch {}

      // 实体射线
      try {
        const checkDist = Math.min(maxDist, blockDist);
        const entityHits = dim.getEntitiesFromRay(headLoc, viewDir, {
          maxDistance: checkDist,
          ignoreBlockCollision: false
        });

        if (entityHits && entityHits.length > 0) {
          for (const hit of entityHits) {
            const ent = hit.entity;
            if (!ent || !ent.isValid() || ent.id === player.id) continue;
            if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

            firstEntity = ent;
            firstImpactLoc = {
              x: headLoc.x + viewDir.x * hit.distance,
              y: headLoc.y + viewDir.y * hit.distance,
              z: headLoc.z + viewDir.z * hit.distance
            };
            break;
          }
        }
      } catch {}

      const initialTargetPos = firstImpactLoc || {
        x: headLoc.x + viewDir.x * maxDist,
        y: headLoc.y + viewDir.y * maxDist,
        z: headLoc.z + viewDir.z * maxDist
      };

      // 2. 生成从枪口到第一落点的高能等离子闪电光束
      this.drawLightningBeam(dim, muzzleLoc, initialTargetPos);

      // 3. 闪电链传递逻辑
      const hitEntities = [];
      const hitSet = new Set([player.id]);

      let currentSourcePos = initialTargetPos;
      let currentSourceEntity = firstEntity;

      const baseDamage = config.baseDamage ?? 24;
      const decayRate = config.decayRate ?? 0.25;
      const chainRadius = config.chainRadius ?? 7.0;
      const maxChains = config.maxChains ?? 5;

      // 如果直击第一只实体
      if (firstEntity && firstEntity.isValid()) {
        hitSet.add(firstEntity.id);
        const dmgResult = DamageResolver.applyDamage(player, firstEntity, initialTargetPos, {
          ...config,
          baseDamage: baseDamage,
          armorPiercing: 1.0 // 真实能量穿透
        });

        hitEntities.push({
          entity: firstEntity,
          damage: dmgResult?.damage ?? baseDamage,
          jump: 0
        });

        try {
          dim.playSound("apex.arc.hit", initialTargetPos, { volume: 1.2, pitch: 1.0 });
          dim.spawnParticle("minecraft:electric_spark_particle", initialTargetPos);
        } catch {}
      } else {
        // 未直击实体，打在地面/方块 -> 搜寻着弹点周围 4 格内最近的敌人作为链起点
        try {
          dim.playSound("apex.arc.hit", initialTargetPos, { volume: 1.0, pitch: 1.2 });
          dim.spawnParticle("minecraft:electric_spark_particle", initialTargetPos);
          dim.spawnParticle("minecraft:portal_directional", initialTargetPos);

          const nearby = dim.getEntities({
            location: initialTargetPos,
            maxDistance: 4.5
          });

          for (const ent of nearby) {
            if (!ent || !ent.isValid() || hitSet.has(ent.id)) continue;
            if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

            currentSourceEntity = ent;
            currentSourcePos = ent.location;
            hitSet.add(ent.id);

            const entLoc = { x: ent.location.x, y: ent.location.y + 0.8, z: ent.location.z };
            this.drawLightningBeam(dim, initialTargetPos, entLoc);

            const dmg = Math.round(baseDamage * 0.75);
            DamageResolver.applyDamage(player, ent, entLoc, { ...config, baseDamage: dmg, armorPiercing: 1.0 });
            hitEntities.push({ entity: ent, damage: dmg, jump: 1 });
            break;
          }
        } catch {}
      }

      // 4. 连续向周围 7 格内传递闪电链 (伤害逐级递减)
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

        if (!nextTarget) break; // 范围内无更多目标

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
        DamageResolver.applyDamage(player, nextTarget, nextLoc, {
          ...config,
          baseDamage: jumpDamage,
          armorPiercing: 1.0
        });

        try {
          dim.playSound("apex.arc.hit", nextLoc, { volume: 0.9, pitch: 1.0 + jump * 0.1 });
          dim.spawnParticle("minecraft:electric_spark_particle", nextLoc);
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
   * 绘制高能闪电等离子电弧光束
   */
  static drawLightningBeam(dim, p1, p2) {
    if (!dim || !p1 || !p2) return;

    try {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 0.2) return;

      const steps = Math.min(Math.floor(dist / 0.6), 50);

      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        // 电弧轻微曲折抖动
        const jitter = (i === 0 || i === steps) ? 0 : (Math.random() - 0.5) * 0.18;
        const px = p1.x + dx * frac + jitter;
        const py = p1.y + dy * frac + jitter;
        const pz = p1.z + dz * frac + jitter;

        try {
          dim.spawnParticle("apex:arc_beam", { x: px, y: py, z: pz });
          dim.spawnParticle("minecraft:electric_spark_particle", { x: px, y: py, z: pz });
        } catch {
          try {
            dim.spawnParticle("minecraft:electric_spark_particle", { x: px, y: py, z: pz });
          } catch {}
        }
      }
    } catch {}
  }
}
