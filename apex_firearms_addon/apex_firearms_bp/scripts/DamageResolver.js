import { EntityDamageCause } from "@minecraft/server";
import { AK47_CONFIG } from "./AmmoSystem.js";

export class DamageResolver {
  /**
   * 计算穿甲减伤公式 (源自 ACE 穿甲递减模型)
   */
  static calculateArmorReduction(baseDamage, armorPoints, armorPiercing) {
    if (armorPoints <= 0) return baseDamage;
    const effectivePiercing = Math.max(1 - armorPiercing, 0);
    let reductionPercent = armorPoints * 4 * effectivePiercing;
    
    // 递减平滑因子
    const diminishingFactor = Math.min(1, baseDamage / 12);
    reductionPercent *= (1 - 0.1 * diminishingFactor);

    const finalReduction = (baseDamage * reductionPercent) / 100;
    return Math.max(1, Math.round(baseDamage - finalReduction));
  }

  /**
   * 估算实体的护甲值 (根据身上穿着的装备)
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
   * 判定是否命中头部 (命中相对高度 >= 70%)
   */
  static isHeadshot(hitLocation, target) {
    if (!hitLocation || !target) return false;
    const targetLoc = target.location;
    const heightDiff = hitLocation.y - targetLoc.y;
    // 标准人形高约 1.8 格，头部在 1.35 以上
    return heightDiff >= 1.35;
  }

  /**
   * 执行综合伤害结算
   */
  static applyDamage(attacker, target, hitLocation) {
    if (!target || !target.isValid()) return null;
    const healthComp = target.getComponent("minecraft:health");
    if (!healthComp) return null;

    const headshot = this.isHeadshot(hitLocation, target);
    let damage = AK47_CONFIG.baseDamage;
    if (headshot) {
      damage = Math.round(damage * AK47_CONFIG.headshotMultiplier);
    }

    const armorPoints = this.estimateArmorPoints(target);
    const finalDamage = this.calculateArmorReduction(damage, armorPoints, AK47_CONFIG.armorPiercing);

    const currentHp = healthComp.currentValue;
    const isFatal = finalDamage >= currentHp;

    try {
      if (isFatal) {
        // 致命一击：使用 override 绕过无敌帧，并带上 damagingEntity 保留真实击杀统计与击杀掉落
        target.applyDamage(finalDamage, {
          cause: EntityDamageCause.override,
          damagingEntity: attacker
        });
      } else {
        // 普通命中：使用 override 实现全自动连发 0 延迟连续扣血
        target.applyDamage(finalDamage, {
          cause: EntityDamageCause.override
        });
      }
    } catch (e) {
      // 容错兜底：直接扣血
      const newHp = Math.max(0, currentHp - finalDamage);
      healthComp.setCurrentValue(newHp);
    }

    // 施加方向性物理击退
    if (attacker) {
      const dir = attacker.getViewDirection();
      try {
        target.applyKnockback(dir.x, dir.z, 0.45, 0.12);
      } catch {}
    }

    return {
      damage: finalDamage,
      headshot,
      isFatal,
      targetName: target.nameTag || target.typeId.replace("minecraft:", "")
    };
  }
}
