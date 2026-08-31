import { EntityDamageCause, world } from "@minecraft/server";

export class DamageResolver {
  /**
   * 计算穿甲减伤公式
   */
  static calculateArmorReduction(baseDamage, armorPoints, armorPiercing) {
    if (armorPoints <= 0) return baseDamage;
    const effectivePiercing = Math.max(1 - armorPiercing, 0);
    let reductionPercent = armorPoints * 4 * effectivePiercing;
    
    const diminishingFactor = Math.min(1, baseDamage / 12);
    reductionPercent *= (1 - 0.1 * diminishingFactor);

    const finalReduction = (baseDamage * reductionPercent) / 100;
    return Math.max(1, Math.round(baseDamage - finalReduction));
  }

  /**
   * 估算实体的护甲值
   */
  static estimateArmorPoints(entity) {
    if (!entity) return 0;
    const equippable = entity.getComponent("minecraft:equippable");
    if (!equippable) return 0;

    let points = 0;
    const armorSlots = ["Head", "Chest", "Legs", "Feet"];
    const armorValues = {
      leather_helmet: 1, leather_chestplate: 3, leather_leggings: 2, leather_boots: 1,
      golden_helmet: 2, golden_chestplate: 5, golden_leggings: 3, golden_boots: 1,
      chainmail_helmet: 2, chainmail_chestplate: 5, chainmail_leggings: 4, chainmail_boots: 1,
      iron_helmet: 2, iron_chestplate: 6, iron_leggings: 5, iron_boots: 2,
      diamond_helmet: 3, diamond_chestplate: 8, diamond_leggings: 6, diamond_boots: 3,
      netherite_helmet: 3, netherite_chestplate: 8, netherite_leggings: 6, netherite_boots: 3
    };

    for (const slot of armorSlots) {
      const item = equippable.getEquipment(slot);
      if (item) {
        const type = item.typeId.replace("minecraft:", "");
        if (armorValues[type]) {
          points += armorValues[type];
        }
      }
    }
    return points;
  }

  /**
   * 判定是否命中头部
   */
  static isHeadshot(hitLocation, target) {
    if (!hitLocation || !target) return false;
    const targetLoc = target.location;
    const heightDiff = hitLocation.y - targetLoc.y;
    return heightDiff >= 1.35;
  }

  /**
   * 执行综合伤害结算
   */
  static applyDamage(attacker, target, hitLocation, gunConfig) {
    if (!target || !target.isValid()) return null;
    const healthComp = target.getComponent("minecraft:health");
    if (!healthComp) return null;

    const baseDmg = gunConfig?.baseDamage ?? 6;
    const headshotMult = gunConfig?.headshotMultiplier ?? 2.0;
    const ap = gunConfig?.armorPiercing ?? 0.35;

    const headshot = this.isHeadshot(hitLocation, target);
    let damage = baseDmg;
    if (headshot) {
      damage = Math.round(damage * headshotMult);
    }

    const armorPoints = this.estimateArmorPoints(target);
    const finalDamage = this.calculateArmorReduction(damage, armorPoints, ap);

    const currentHp = healthComp.currentValue;
    const isFatal = finalDamage >= currentHp;

    try {
      if (isFatal) {
        target.applyDamage(finalDamage, {
          cause: EntityDamageCause.override,
          damagingEntity: attacker || undefined
        });
      } else {
        target.applyDamage(finalDamage, {
          cause: EntityDamageCause.override
        });
      }
    } catch (e) {
      const newHp = Math.max(0, currentHp - finalDamage);
      healthComp.setCurrentValue(newHp);
    }

    // 施加方向性物理击退
    if (attacker) {
      const dir = attacker.getViewDirection();
      const knockbackForce = gunConfig?.id === "apex:m82" ? 0.9 : (gunConfig?.id === "apex:mgl" ? 1.0 : 0.4);
      try {
        target.applyKnockback(dir.x, dir.z, knockbackForce, 0.15);
      } catch {}
    }

    return {
      damage: finalDamage,
      headshot,
      isFatal,
      targetName: target.nameTag || target.typeId.replace("minecraft:", "")
    };
  }

  /**
   * 高爆破片范围轰炸结算 (严格校验坐标，绝不允许 NaN，保证方块碰撞必出范围溅射伤害)
   */
  static applyExplosiveSplash(attacker, centerLoc, radius, splashDamage, config, fallbackDim) {
    const dim = attacker?.dimension || fallbackDim;
    if (!dim || !centerLoc) return 0;

    const cx = Number(centerLoc.x);
    const cy = Number(centerLoc.y);
    const cz = Number(centerLoc.z);

    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(cz)) {
      console.warn(`[ApexFirearms] Non-finite centerLoc blocked in applyExplosiveSplash`);
      return 0;
    }

    const validLoc = { x: cx, y: cy, z: cz };
    const breaksBlocks = config?.heBreaksBlocks ?? false; // 绝不破坏地形
    const causesFire = config?.heCausesFire ?? false;
    const power = config?.id === "apex:mgl" ? 2.5 : 1.5;

    // 1. 原版爆炸物理冲击波模拟 (0 方块破坏)
    try {
      dim.createExplosion(validLoc, power, { breaksBlocks, causesFire });
    } catch {}

    // 2. 保证 100% 出现震撼爆炸视觉粒子 (提升 0.35 格避免被方块遮挡)
    const blastLoc = { x: cx, y: cy + 0.35, z: cz };
    try {
      dim.spawnParticle("minecraft:huge_explosion_emitter", blastLoc);
      dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", blastLoc);
      dim.spawnParticle("minecraft:lava_particle", blastLoc);
      dim.spawnParticle("minecraft:basic_flame_particle", blastLoc);
      dim.spawnParticle("minecraft:campfire_smoke_particle", blastLoc);
    } catch {}

    // 3. 播放 DeadZone 专属高保真重型爆炸音效与原版音效
    try {
      dim.playSound("apex.explosion", validLoc, { volume: 1.5, pitch: 1.0 });
      dim.playSound("random.explode", validLoc, { volume: 1.2, pitch: 0.9 });
      dim.playSound("mob.ghast.fireball", validLoc, { volume: 0.9, pitch: 0.85 });
    } catch {}

    // 4. 范围破片溅射伤害与物理冲击波结算
    let hitCount = 0;
    const searchCenter = { x: cx, y: cy + 0.5, z: cz };
    const effectiveRadius = Math.max(radius ?? 5.0, 5.5);

    try {
      const nearby = dim.getEntities({
        location: searchCenter,
        maxDistance: effectiveRadius
      });

      for (const ent of nearby) {
        if (!ent || !ent.isValid()) continue;
        if (attacker && ent.id === attacker.id) continue;
        if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

        const entLoc = ent.location;
        const dist = Math.hypot(entLoc.x - cx, entLoc.y - cy, entLoc.z - cz);
        if (dist > effectiveRadius) continue;

        // 计算距离伤害衰减 (核心 40 HP，边缘 ~25 HP)
        const falloff = Math.max(0.6, 1 - (dist / (effectiveRadius + 1)) * 0.4);
        const actualDmg = Math.max(12, Math.round((splashDamage ?? 40) * falloff));

        // 应用高可靠伤害结算
        const healthComp = ent.getComponent("minecraft:health");
        const curHp = healthComp?.currentValue ?? 20;

        try {
          ent.applyDamage(actualDmg, {
            cause: EntityDamageCause.override,
            damagingEntity: attacker || undefined
          });
        } catch (e) {
          if (healthComp) {
            healthComp.setCurrentValue(Math.max(0, curHp - actualDmg));
          }
        }

        if (causesFire) {
          try { ent.setOnFire(4, true); } catch {}
        }

        // 强力爆炸冲击波击退
        const dx = entLoc.x - cx;
        const dz = entLoc.z - cz;
        const hDist = Math.hypot(dx, dz) || 1.0;
        try {
          ent.applyKnockback(dx / hDist, dz / hDist, 1.25, 0.38);
        } catch {}

        hitCount++;
      }
    } catch (e) {
      console.warn(`[ApexFirearms] applyExplosiveSplash entity query error: ${e}`);
    }

    // 5. 命中击中反馈给开火玩家
    if (attacker && attacker.isValid() && hitCount > 0) {
      try {
        attacker.onScreenDisplay?.setActionBar?.(
          `§6[M32 榴弹炮] 💥 破片高爆溅射命中 §f${hitCount} §6个目标! (-40 HP 范围轰炸)`
        );
        attacker.playSound("apex.gun.hit_flesh", { volume: 1.0, pitch: 0.9 });
      } catch {}
    }

    return hitCount;
  }
}
