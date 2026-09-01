import { world, system, EntityDamageCause } from "@minecraft/server";
import { DamageResolver } from "./DamageResolver.js";
import { ShieldEngine } from "./ShieldEngine.js";

export class ShotgunEngine {
  /**
   * 获取玩家的综合圣盾/防御指数 (护甲值 + 金心吸收护盾 + 副手持盾)
   */
  static getPlayerShieldRating(player) {
    if (!player || !player.isValid()) return 0;

    // 1. 基础护甲点数 (0 ~ 24)
    let armorPoints = DamageResolver.estimateArmorPoints(player);

    // 2. 伤害吸收金心护盾 (Absorption Effect: 0 ~ 16+ HP)
    let absorptionBonus = 0;
    try {
      const absEffect = player.getEffect("absorption");
      if (absEffect) {
        absorptionBonus = (absEffect.amplifier + 1) * 4;
      }
    } catch {}

    // 3. 副手持盾加成 (重装反甲盾 +8，原版盾牌 +4)
    let offhandShieldBonus = 0;
    try {
      const equippable = player.getComponent("minecraft:equippable");
      const offhand = equippable?.getEquipment("Offhand") || equippable?.getEquipment("offhand");
      if (offhand) {
        if (offhand.typeId === "apex:riot_shield") {
          offhandShieldBonus = 8;
        } else if (offhand.typeId.includes("shield")) {
          offhandShieldBonus = 4;
        }
      }
    } catch {}

    return armorPoints + absorptionBonus + offhandShieldBonus;
  }

  /**
   * 触发圣盾防暴霰弹枪开火 (8 枚弹丸同时发射，计入目标护甲免伤减伤与仇恨唤醒)
   */
  static fireShotgun(player, config) {
    if (!player || !player.isValid()) return null;

    try {
      const dim = player.dimension;
      const headLoc = player.getHeadLocation();
      const viewDir = player.getViewDirection();
      const isSneaking = player.isSneaking;

      // 1. 计算自身圣盾充能与基础单丸伤害 (单枚 2 ~ 22 HP)
      const shieldRating = this.getPlayerShieldRating(player);
      const scale = Math.min(1.0, Math.max(0.0, shieldRating / 20.0));
      const basePelletDamage = Math.max(2, Math.min(22, Math.round(2 + (22 - 2) * scale)));

      const pelletCount = config.pelletCount ?? 8;
      const baseSpread = isSneaking ? (config.spreadSneak ?? 0.035) : (config.spreadStand ?? 0.055);
      const maxDist = config.maxRange ?? 28.0;

      const muzzleLoc = {
        x: headLoc.x + viewDir.x * 0.7,
        y: headLoc.y + viewDir.y * 0.7 - 0.1,
        z: headLoc.z + viewDir.z * 0.7
      };

      // 枪口初速火光
      try {
        dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", muzzleLoc);
        dim.spawnParticle("minecraft:basic_flame_particle", muzzleLoc);
      } catch {}

      const hitMap = new Map();
      let totalPelletsHit = 0;

      // 2. 并行发射 8 枚散射弹丸
      for (let i = 0; i < pelletCount; i++) {
        const jx = (Math.random() - 0.5) * baseSpread * 2;
        const jy = (Math.random() - 0.5) * baseSpread * 2;
        const jz = (Math.random() - 0.5) * baseSpread * 2;

        const rayDir = {
          x: viewDir.x + jx,
          y: viewDir.y + jy,
          z: viewDir.z + jz
        };
        const rayLen = Math.hypot(rayDir.x, rayDir.y, rayDir.z);
        const normDir = { x: rayDir.x / rayLen, y: rayDir.y / rayLen, z: rayDir.z / rayLen };

        let blockHitDist = maxDist;
        try {
          const bHit = dim.getBlockFromRay(headLoc, normDir, {
            maxDistance: maxDist,
            includePassableBlocks: false,
            includeLiquidBlocks: false
          });
          if (bHit && bHit.block) {
            blockHitDist = bHit.distance;
          }
        } catch {}

        let hitEntity = null;
        let hitDist = blockHitDist;

        try {
          const entHits = dim.getEntitiesFromRay(headLoc, normDir, {
            maxDistance: blockHitDist,
            ignoreBlockCollision: false
          });

          if (entHits && entHits.length > 0) {
            for (const eh of entHits) {
              const ent = eh.entity;
              if (!ent || !ent.isValid() || ent.id === player.id) continue;
              if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

              hitEntity = ent;
              hitDist = eh.distance;
              break;
            }
          }
        } catch {}

        const endPos = {
          x: headLoc.x + normDir.x * hitDist,
          y: headLoc.y + normDir.y * hitDist,
          z: headLoc.z + normDir.z * hitDist
        };

        // 绘制弹丸高速破片轨迹
        this.#drawPelletTracer(dim, muzzleLoc, endPos);

        // 如果击中实体
        if (hitEntity && hitEntity.isValid()) {
          // A. 判定受击目标自身的护甲点数与免伤减伤
          const targetArmor = DamageResolver.estimateArmorPoints(hitEntity);
          const hasTitanChest = DamageResolver.hasExoChestplate(hitEntity);
          const armorMitigatedDmg = DamageResolver.calculateArmorReduction(
            basePelletDamage,
            targetArmor,
            config.armorPiercing ?? 0.30,
            hasTitanChest
          );

          // B. 判定受击目标是否持盾格挡与反甲反震
          const blockResult = ShieldEngine.checkBulletShieldBlock(player, hitEntity, armorMitigatedDmg, config);
          DamageResolver.triggerMobAggro(hitEntity, player);

          if (blockResult.blocked && blockResult.damage <= 0) {
            continue; // 弹丸被完全格挡
          }

          const finalPelletDmg = blockResult.blocked ? blockResult.damage : armorMitigatedDmg;
          totalPelletsHit++;
          const targetId = hitEntity.id;
          const prev = hitMap.get(targetId) || {
            count: 0,
            totalDamage: 0,
            name: hitEntity.nameTag || hitEntity.typeId.replace("minecraft:", ""),
            entity: hitEntity
          };

          prev.count += 1;
          prev.totalDamage += finalPelletDmg;
          hitMap.set(targetId, prev);

          // C. 施加单枚弹丸伤害并传递 player 作为伤害源
          const healthComp = hitEntity.getComponent("minecraft:health");
          const curHp = healthComp?.currentValue ?? 20;

          try {
            hitEntity.applyDamage(finalPelletDmg, {
              cause: EntityDamageCause.projectile,
              damagingEntity: player
            });
          } catch (e) {
            try {
              hitEntity.applyDamage(finalPelletDmg, {
                cause: EntityDamageCause.override,
                damagingEntity: player
              });
            } catch (e2) {
              if (healthComp) {
                healthComp.setCurrentValue(Math.max(0, curHp - finalPelletDmg));
              }
            }
          }

          // 弹丸物理冲击波击退
          try {
            hitEntity.applyKnockback(normDir.x, normDir.z, 0.35, 0.1);
          } catch {}
        }
      }

      // 3. 击中音效与反馈
      if (totalPelletsHit > 0) {
        try {
          player.playSound("apex.gun.hit_flesh", { volume: 1.0, pitch: 0.95 });
        } catch {}
      }

      let totalDamageDone = 0;
      let primaryTargetName = "";
      for (const info of hitMap.values()) {
        totalDamageDone += info.totalDamage;
        if (!primaryTargetName) primaryTargetName = info.name;
      }

      if (totalPelletsHit > 0) {
        try {
          player.onScreenDisplay?.setActionBar?.(
            `§e[圣盾霰弹枪] 🛡️ 自身护甲: §f${shieldRating} §7(基础单丸 §f${basePelletDamage} §7HP) 💥 命中 §f${totalPelletsHit}/8 §e丸 (-§c${totalDamageDone} §eHP!)`
          );
        } catch {}
      }

      return {
        pelletDamage: basePelletDamage,
        totalPelletsHit,
        totalDamageDone,
        targetCount: hitMap.size,
        primaryTargetName
      };
    } catch (err) {
      console.warn(`[ApexFirearms] Shotgun fire error: ${err}`);
      return null;
    }
  }

  /**
   * 绘制霰弹破片高速曳光弹道轨迹
   */
  static #drawPelletTracer(dim, start, end) {
    if (!dim || !start || !end) return;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const dist = Math.hypot(dx, dz) ? Math.hypot(dx, dy, dz) : 0;
    if (dist < 0.5) return;

    const stepSize = 1.2;
    const steps = Math.min(Math.floor(dist / stepSize), 20);

    for (let s = 1; s <= steps; s++) {
      const frac = s / steps;
      const px = start.x + dx * frac;
      const py = start.y + dy * frac;
      const pz = start.z + dz * frac;

      try {
        dim.spawnParticle("apex:shotgun_tracer", { x: px, y: py, z: pz });
      } catch {}
    }
  }
}
