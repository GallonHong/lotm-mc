import { EntityDamageCause } from "@minecraft/server";

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

    const baseDmg = gunConfig?.baseDamage ?? 22;
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
          damagingEntity: attacker
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
      const knockbackForce = gunConfig?.id === "apex:m82" ? 0.9 : 0.45;
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
   * 高爆烈焰弹范围轰炸结算
   */
  static applyExplosiveSplash(attacker, centerLoc, radius, splashDamage) {
    if (!attacker || !attacker.isValid() || !centerLoc) return 0;
    const dim = attacker.dimension;

    // 1. 生成恶魂火球爆炸特效与声音
    try {
      dim.createExplosion(centerLoc, 1.5, { breaksBlocks: false, causesFire: true });
    } catch {
      try {
        dim.spawnParticle("minecraft:huge_explosion_emitter", centerLoc);
      } catch {}
    }

    // 2. 溅射伤害与点燃
    let hitCount = 0;
    try {
      const nearby = dim.getEntities({
        location: centerLoc,
        maxDistance: radius
      });

      for (const ent of nearby) {
        if (!ent || !ent.isValid() || ent.id === attacker.id) continue;
        if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

        try {
          ent.applyDamage(splashDamage, {
            cause: EntityDamageCause.entityExplosion,
            damagingEntity: attacker
          });
          ent.setOnFire(4, true); // 附带 4 秒烈焰燃烧
          hitCount++;
        } catch {}
      }
    } catch {}

    return hitCount;
  }
}
