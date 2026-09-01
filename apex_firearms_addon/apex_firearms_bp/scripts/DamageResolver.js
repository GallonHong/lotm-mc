import { EntityDamageCause, world } from "@minecraft/server";
import { ShieldEngine } from "./ShieldEngine.js";

export class DamageResolver {
  /**
   * 计算穿甲与重型战甲免伤减伤公式
   */
  static calculateArmorReduction(baseDamage, armorPoints, armorPiercing, hasTitanChestplate = false) {
    if (armorPoints <= 0) return baseDamage;
    const effectivePiercing = Math.max(1 - armorPiercing, 0);
    let reductionPercent = armorPoints * 3.8 * effectivePiercing;
    
    // 泰坦动力装甲高分子防弹插板额外 15% 动能偏折免伤
    if (hasTitanChestplate) {
      reductionPercent += 15;
    }

    // 减伤上限封顶 85% (防止完全免伤)
    reductionPercent = Math.min(85, Math.max(0, reductionPercent));

    const finalReduction = (baseDamage * reductionPercent) / 100;
    return Math.max(1, Math.round(baseDamage - finalReduction));
  }

  /**
   * 估算实体的护甲值 (全面适配原版、Apex 动力战甲、喷气背包及第三方模组)
   */
  static estimateArmorPoints(entity) {
    if (!entity) return 0;
    let equippable = null;
    try {
      equippable = entity.getComponent("minecraft:equippable");
    } catch {}
    if (!equippable) return 0;

    let points = 0;
    const armorSlots = ["Head", "Chest", "Legs", "Feet", "head", "chest", "legs", "feet"];
    const armorValues = {
      // 原版皮甲/金甲/锁链/铁甲/钻甲/合金/海龟壳/犰狳鳞甲
      leather_helmet: 1, leather_chestplate: 3, leather_leggings: 2, leather_boots: 1,
      golden_helmet: 2, golden_chestplate: 5, golden_leggings: 3, golden_boots: 1,
      chainmail_helmet: 2, chainmail_chestplate: 5, chainmail_leggings: 4, chainmail_boots: 1,
      iron_helmet: 2, iron_chestplate: 6, iron_leggings: 5, iron_boots: 2,
      diamond_helmet: 3, diamond_chestplate: 8, diamond_leggings: 6, diamond_boots: 3,
      netherite_helmet: 3, netherite_chestplate: 8, netherite_leggings: 6, netherite_boots: 3,
      turtle_helmet: 2, armadillo_scute: 1,
      
      // Apex 泰坦外骨骼动力装甲 & 离子喷气背包
      exo_helmet: 4,
      exo_chestplate: 9,
      exo_leggings: 7,
      exo_boots: 4,
      jetpack: 5
    };

    const visitedSlots = new Set();
    for (const slot of armorSlots) {
      const normalized = slot.toLowerCase();
      if (visitedSlots.has(normalized)) continue;

      try {
        const item = equippable.getEquipment(slot);
        if (item) {
          visitedSlots.add(normalized);
          const rawId = item.typeId.toLowerCase();
          const cleanId = rawId.replace("minecraft:", "").replace("apex:", "").replace("deadzone:", "");
          
          if (armorValues[cleanId] !== undefined) {
            points += armorValues[cleanId];
          } else if (cleanId.includes("helmet") || cleanId.includes("cap")) {
            points += 3;
          } else if (cleanId.includes("chestplate") || cleanId.includes("vest") || cleanId.includes("armor") || cleanId.includes("jacket")) {
            points += 8;
          } else if (cleanId.includes("leggings") || cleanId.includes("pants")) {
            points += 6;
          } else if (cleanId.includes("boots") || cleanId.includes("shoes")) {
            points += 3;
          }
        }
      } catch {}
    }
    return points;
  }

  /**
   * 检查实体是否装备了泰坦外骨骼胸甲
   */
  static hasExoChestplate(entity) {
    if (!entity) return false;
    try {
      const equippable = entity.getComponent("minecraft:equippable");
      const chest = equippable?.getEquipment("Chest") || equippable?.getEquipment("chest");
      return chest?.typeId === "apex:exo_chestplate";
    } catch {
      return false;
    }
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
   * 执行综合伤害结算 (含护甲免伤、盾牌格挡与反甲反震拦截)
   */
  static applyDamage(attacker, target, hitLocation, gunConfig) {
    if (!target || !target.isValid()) return null;

    const healthComp = target.getComponent("minecraft:health");
    if (!healthComp) return null;

    const baseDmg = gunConfig?.baseDamage ?? 6;
    let headshotMult = gunConfig?.headshotMultiplier ?? 2.0;
    try {
      const equippable = attacker?.getComponent?.("minecraft:equippable");
      if (equippable?.getEquipment?.("Head")?.typeId === "apex:exo_helmet") {
        headshotMult += 0.25; // 泰坦全息鹰眼头盔爆头增伤 25%
      }
    } catch {}
    const ap = gunConfig?.armorPiercing ?? 0.35;

    const headshot = this.isHeadshot(hitLocation, target);
    let damage = baseDmg;
    if (headshot) {
      damage = Math.round(damage * headshotMult);
    }

    const armorPoints = this.estimateArmorPoints(target);
    const hasTitanChest = this.hasExoChestplate(target);
    let finalDamage = this.calculateArmorReduction(damage, armorPoints, ap, hasTitanChest);

    // 盾牌格挡与反甲拦截
    const blockResult = ShieldEngine.checkBulletShieldBlock(attacker, target, finalDamage, gunConfig);
    if (blockResult.blocked) {
      if (blockResult.damage <= 0) {
        return {
          damage: 0,
          headshot: false,
          isFatal: false,
          targetName: target.nameTag || target.typeId.replace("minecraft:", ""),
          blocked: true
        };
      }
      finalDamage = blockResult.damage;
    }

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
   * 高爆破片范围轰炸结算
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
    const blastLoc = { x: cx, y: cy + 0.45, z: cz };
    const breaksBlocks = config?.heBreaksBlocks ?? false;
    const causesFire = config?.heCausesFire ?? false;
    const power = config?.id === "apex:mgl" ? 2.5 : 1.5;

    // 1. 原版爆炸物理冲击波模拟 (0 方块破坏)
    try {
      dim.createExplosion(validLoc, power, { breaksBlocks, causesFire });
    } catch {}

    // 2. 爆炸视觉特效
    try {
      dim.spawnParticle("apex:mgl_explosion", blastLoc);
      dim.spawnParticle("apex:mgl_shockwave", blastLoc);
      dim.spawnParticle("minecraft:explosion_manual", blastLoc);
      dim.spawnParticle("minecraft:sonic_explosion", blastLoc);
      dim.spawnParticle("minecraft:lava_particle", blastLoc);
      dim.spawnParticle("minecraft:basic_flame_particle", blastLoc);
      dim.spawnParticle("minecraft:campfire_smoke_particle", blastLoc);
    } catch {}

    // 3. 播放 DeadZone 重型爆炸音效
    try {
      dim.playSound("apex.explosion", validLoc, { volume: 1.8, pitch: 1.0 });
      dim.playSound("apex.explosion.distant", validLoc, { volume: 1.2, pitch: 1.0 });
      dim.playSound("random.explode", validLoc, { volume: 1.2, pitch: 0.95 });
      dim.playSound("mob.ghast.fireball", validLoc, { volume: 1.0, pitch: 0.85 });
    } catch {}

    // 4. 范围破片溅射伤害 (计入目标护甲减伤)
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

        const falloff = Math.max(0.6, 1 - (dist / (effectiveRadius + 1)) * 0.4);
        const baseDmg = Math.max(12, Math.round((splashDamage ?? 40) * falloff));

        const targetArmor = this.estimateArmorPoints(ent);
        const hasChest = this.hasExoChestplate(ent);
        const actualDmg = this.calculateArmorReduction(baseDmg, targetArmor, config.armorPiercing ?? 0.5, hasChest);

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
