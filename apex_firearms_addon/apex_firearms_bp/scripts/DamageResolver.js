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
   * 高爆烈焰/破片弹范围轰炸结算 (100% 遵守 0 地形破坏规则，特效与声音全覆盖)
   */
  static applyExplosiveSplash(attacker, centerLoc, radius, splashDamage, config, fallbackDim) {
    const dim = attacker?.dimension || fallbackDim;
    if (!dim || !centerLoc) return 0;

    const breaksBlocks = config?.heBreaksBlocks ?? false; // 绝不破坏地形
    const causesFire = config?.heCausesFire ?? false;
    const power = config?.id === "apex:mgl" ? 2.5 : 1.5;

    // 1. 原版爆炸物理模拟
    try {
      dim.createExplosion(centerLoc, power, { breaksBlocks, causesFire });
    } catch {}

    // 2. 保证 100% 出现震撼爆炸视觉粒子
    try {
      const blastLoc = { x: centerLoc.x, y: centerLoc.y + 0.35, z: centerLoc.z };
      dim.spawnParticle("minecraft:huge_explosion_emitter", blastLoc);
      dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", blastLoc);
      dim.spawnParticle("minecraft:lava_particle", blastLoc);
      dim.spawnParticle("minecraft:basic_flame_particle", blastLoc);
      dim.spawnParticle("minecraft:campfire_smoke_particle", blastLoc);
    } catch {}

    // 3. 播放 DeadZone 专属高保真重型爆炸音效与原版音效
    try {
      dim.playSound("apex.explosion", centerLoc, { volume: 1.5, pitch: 1.0 });
      dim.playSound("random.explode", centerLoc, { volume: 1.2, pitch: 0.9 });
      dim.playSound("mob.ghast.fireball", centerLoc, { volume: 0.9, pitch: 0.85 });
    } catch {}

    // 4. 溅射破片伤害与击退
    let hitCount = 0;
    try {
      const nearby = dim.getEntities({
        location: centerLoc,
        maxDistance: radius
      });

      for (const ent of nearby) {
        if (!ent || !ent.isValid()) continue;
        if (attacker && ent.id === attacker.id) continue;
        if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

        try {
          ent.applyDamage(splashDamage, {
            cause: EntityDamageCause.entityExplosion,
            damagingEntity: attacker || undefined
          });
          if (causesFire) {
            ent.setOnFire(4, true);
          }
          // 强力冲击波击飞
          const entLoc = ent.location;
          const dx = entLoc.x - centerLoc.x;
          const dz = entLoc.z - centerLoc.z;
          const dist = Math.hypot(dx, dz) || 1.0;
          ent.applyKnockback(dx / dist, dz / dist, 1.2, 0.35);
          hitCount++;
        } catch {}
      }
    } catch {}

    return hitCount;
  }
}
