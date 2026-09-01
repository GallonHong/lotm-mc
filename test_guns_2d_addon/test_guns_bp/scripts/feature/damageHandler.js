import { EntityDamageCause, EquipmentSlot } from '@minecraft/server';
import { MathUtils } from './utils/mathUtils.js';

export const ARMOR_PIECE_VALUES = {
  // Vanilla Armors
  leather_helmet: 1, leather_chestplate: 3, leather_leggings: 2, leather_boots: 1,
  golden_helmet: 2, golden_chestplate: 5, golden_leggings: 3, golden_boots: 1,
  chainmail_helmet: 2, chainmail_chestplate: 5, chainmail_leggings: 4, chainmail_boots: 1,
  iron_helmet: 2, iron_chestplate: 6, iron_leggings: 5, iron_boots: 2,
  diamond_helmet: 3, diamond_chestplate: 8, diamond_leggings: 6, diamond_boots: 3,
  netherite_helmet: 3, netherite_chestplate: 8, netherite_leggings: 6, netherite_boots: 3,
  turtle_helmet: 2,

  // Custom Tactical Armors & Equipment
  armor_vest_light: 4,
  armor_vest_heavy: 7,
  armor_helmet_tactical: 3,
  armor_titan_chest: 12,
  jetpack: 5,
  riot_shield: 4
};

export class DamageHandler {
  /**
   * 估算目标实体的综合护甲点数 (0 ~ 20+)
   */
  static estimateArmorPoints(entity) {
    if (!entity || !entity.isValid()) return 0;
    try {
      const equippable = entity.getComponent('minecraft:equippable');
      if (!equippable) return 0;

      let points = 0;
      const slots = [
        EquipmentSlot.Head,
        EquipmentSlot.Chest,
        EquipmentSlot.Legs,
        EquipmentSlot.Feet,
        EquipmentSlot.Offhand
      ];

      for (const slot of slots) {
        const item = equippable.getEquipment(slot);
        if (item && item.typeId) {
          const rawName = item.typeId.replace(/^(minecraft|test_gun):/, '').toLowerCase();
          if (ARMOR_PIECE_VALUES[rawName]) {
            points += ARMOR_PIECE_VALUES[rawName];
          }
        }
      }
      return points;
    } catch {
      return 0;
    }
  }

  /**
   * 判断是否命中头部 (爆头判定)
   */
  static isHeadshot(hitLocation, target) {
    if (!hitLocation || !target || !target.isValid()) return false;
    try {
      const targetLoc = target.location;
      const heightDiff = hitLocation.y - targetLoc.y;
      return heightDiff >= 1.35;
    } catch {
      return false;
    }
  }

  /**
   * 穿甲与减伤公式计算
   */
  static calculateArmorReduction(baseDamage, armorPoints, armorPiercing) {
    if (armorPoints <= 0) return baseDamage;
    const effectivePiercing = Math.max(0, 1.0 - (armorPiercing || 0.2));
    const reductionPercent = Math.min(80, Math.max(0, armorPoints * 3.8 * effectivePiercing));
    const finalDamage = baseDamage * (1.0 - reductionPercent / 100.0);
    return Math.max(1.0, Math.round(finalDamage * 10) / 10);
  }

  /**
   * 唤醒生物仇恨锁定攻击者
   */
  static triggerMobAggro(target, attacker) {
    if (!target || !target.isValid() || !attacker || !attacker.isValid()) return;
    try {
      if (typeof target.setTarget === 'function') {
        target.setTarget(attacker);
      }
    } catch {}
  }

  /**
   * 执行综合伤害结算
   */
  static handleHit(projectile, shooter, target, gun, impactLocation) {
    if (!target || !target.isValid()) return;
    if (shooter && target.id === shooter.id) return;
    if (!gun) return;

    const stats = gun.stats || { damage: 10, armorPenetration: 0.25, maxRange: 60 };

    // 1. 距离衰减计算
    const shooterLoc = (shooter && shooter.isValid()) ? shooter.location : (impactLocation || target.location);
    const targetLoc = target.location;
    const distance = MathUtils.distance(shooterLoc, targetLoc);

    const baseDmg = stats.damage;
    const dropFactor = Math.max(0.3, 1.0 - distance * (stats.damageDropOff || 0.02));
    let currentDamage = baseDmg * dropFactor;

    // 2. 目标防具减免被动检测 (Tactical Armor Passives)
    const targetEquip = target.getComponent?.('minecraft:equippable');
    const chestItem = targetEquip?.getEquipment(EquipmentSlot.Chest);
    const headItem = targetEquip?.getEquipment(EquipmentSlot.Head);
    const offhandItem = targetEquip?.getEquipment(EquipmentSlot.Offhand);

    // 2.1 爆头判定与爆头头盔减伤
    const headshot = this.isHeadshot(impactLocation, target);
    if (headshot) {
      let hsMult = stats.headshotMultiplier || 1.75;
      if (headItem && headItem.typeId.includes('armor_helmet_tactical')) {
        hsMult = Math.max(1.15, hsMult - 0.45); // 特警头盔吸收 45% 爆头额外伤害
      }
      currentDamage *= hsMult;
    }

    // 2.2 防弹衣额外减伤
    if (chestItem) {
      if (chestItem.typeId.includes('armor_titan_chest')) {
        currentDamage *= 0.65; // 泰坦动力甲 35% 终伤吸收
      } else if (chestItem.typeId.includes('armor_vest_heavy')) {
        currentDamage *= 0.75; // 重装防弹衣 25% 终伤吸收
      } else if (chestItem.typeId.includes('armor_vest_light')) {
        currentDamage *= 0.85; // 轻型防弹衣 15% 终伤吸收
      }
    }

    // 2.3 防暴盾反弹荆棘
    if (offhandItem && offhandItem.typeId.includes('riot_shield') && shooter && shooter.isValid()) {
      try {
        const reflectDmg = Math.max(1.0, Math.round(currentDamage * 0.4));
        shooter.applyDamage(reflectDmg, { cause: EntityDamageCause.thorns, damagingEntity: target });
        target.dimension.playSound('item.shield.block', targetLoc, { volume: 1.0, pitch: 1.2 });
      } catch {}
    }

    // 3. 武器专属被动机制结算 (Weapon Passives)
    let finalPenetration = stats.armorPenetration || 0.25;

    // SCAR-H: 精准重击 (连续穿透)
    if (gun.id === 'test_gun:scarh') {
      finalPenetration = Math.min(0.60, finalPenetration + 0.15);
    }
    // FN P90: 压制减速
    if (gun.id === 'test_gun:p90') {
      try {
        target.addEffect('slowness', 30, { amplifier: 1, showParticles: false });
      } catch {}
    }
    // SVD: 标记发光
    if (gun.id === 'test_gun:svd') {
      try {
        target.addEffect('glowing', 100, { amplifier: 0, showParticles: false });
      } catch {}
    }
    // M82: 命中高爆冲击波
    if (gun.id === 'test_gun:m82') {
      try {
        target.dimension.spawnParticle('minecraft:sonic_explosion', {
          x: targetLoc.x,
          y: targetLoc.y + 1,
          z: targetLoc.z
        });
        target.dimension.playSound('random.explode', targetLoc, { volume: 1.2, pitch: 1.5 });
      } catch {}
    }

    // 4. 护甲与穿透计算
    const armorPoints = this.estimateArmorPoints(target);
    const finalDamage = this.calculateArmorReduction(currentDamage, armorPoints, finalPenetration);

    // 5. 施加无敌帧穿透伤害 (EntityDamageCause.override)
    try {
      const damageOptions = {
        cause: EntityDamageCause.override,
        damagingEntity: (shooter && shooter.isValid()) ? shooter : undefined
      };
      target.applyDamage(finalDamage, damageOptions);
    } catch {
      try {
        const healthComp = target.getComponent('minecraft:health');
        if (healthComp) {
          healthComp.setCurrentValue(Math.max(0, healthComp.currentValue - finalDamage));
        }
      } catch {}
    }

    // 6. 命中粒子特效与音效反馈
    try {
      const dim = target.dimension;
      const hitLoc = (impactLocation && Number.isFinite(impactLocation.x)) ? impactLocation : { x: targetLoc.x, y: targetLoc.y + 1.0, z: targetLoc.z };
      if (headshot) {
        dim.spawnParticle('minecraft:critical_hit_emitter', hitLoc);
      } else {
        dim.spawnParticle('minecraft:crit', hitLoc);
      }
    } catch {}

    // 7. 唤醒仇恨
    this.triggerMobAggro(target, shooter);

    // 8. 施加物理击退
    if (stats.knockback && shooter && shooter.isValid()) {
      try {
        const dir = shooter.getViewDirection();
        target.applyKnockback(
          dir.x * (stats.knockback.x || 0.3),
          dir.z * (stats.knockback.x || 0.3),
          (stats.knockback.x || 0.3),
          (stats.knockback.y || 0.15)
        );
      } catch {}
    }
  }
}
