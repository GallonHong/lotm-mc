import { EntityDamageCause, EquipmentSlot } from '@minecraft/server';
import { MathUtils } from './utils/mathUtils.js';
import { isProtectedTeammate } from './utils/teamRules.js';

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
  riot_shield: 4,

  // New LifeAfter Tactical Armors
  armor_mob_chest: 9,
  armor_mob_pants: 6,
  armor_mob_mask: 4,
  armor_night_vision: 3,
  armor_wasp_rig: 6,
  armor_wasp_pants: 4,
  armor_wasp_boots: 3,
  armor_wasp_mask: 2,
  armor_immortal_vest: 7,
  armor_immortal_pants: 5,
  armor_immortal_mask: 2,
  armor_analyzer: 2,
  armor_tech: 4,
  armor_fraternity: 1
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
    if (isProtectedTeammate(shooter, target)) return;
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
      if (headItem && headItem.typeId.includes('armor_mob_mask')) {
        // 堡垒重装防暴面罩：完全阻断爆头加成
        hsMult = 1.0;
        try {
          target.dimension.playSound('random.anvil_land', targetLoc, { volume: 0.9, pitch: 2.0 });
          target.dimension.spawnParticle('minecraft:crit', (impactLocation && Number.isFinite(impactLocation.x)) ? impactLocation : targetLoc);
        } catch {}
        if (target.typeId === 'minecraft:player') {
          target.onScreenDisplay?.setActionBar?.('§6🛡【堡垒防暴面罩】重装面甲完全阻断爆头加成伤害！§r');
        }
      } else if (headItem && headItem.typeId.includes('armor_helmet_tactical')) {
        hsMult = Math.max(1.15, hsMult - 0.45); // 特警头盔吸收 45% 爆头额外伤害
      }
      currentDamage *= hsMult;
    }

    // 2.2 防弹衣额外减伤
    if (chestItem) {
      if (chestItem.typeId.includes('armor_mob_chest')) {
        currentDamage *= 0.50; // 堡垒重装防弹衣 50% 终伤吸收 (传说级硬核防御)
      } else if (chestItem.typeId.includes('armor_titan_chest')) {
        currentDamage *= 0.65; // 泰坦动力甲 35% 终伤吸收
      } else if (chestItem.typeId.includes('armor_immortal_vest')) {
        currentDamage *= 0.80; // 特警特训防弹衣 20% 终伤吸收
      } else if (chestItem.typeId.includes('armor_vest_heavy')) {
        currentDamage *= 0.75; // 重装防弹衣 25% 终伤吸收
      } else if (chestItem.typeId.includes('armor_vest_light')) {
        currentDamage *= 0.85; // 轻型防弹衣 15% 终伤吸收
      }
    }

    // 2.2.1 堡垒重装防暴裤：下蹲架枪掩体减伤 20%
    const legsItem = targetEquip?.getEquipment(EquipmentSlot.Legs);
    if (target.isSneaking && legsItem && legsItem.typeId.includes('armor_mob_pants')) {
      currentDamage *= 0.80; // 下蹲架枪掩体吸收 20% 冲击
      if (target.typeId === 'minecraft:player') {
        target.onScreenDisplay?.setActionBar?.('§6🛡【堡垒防暴裤】下蹲架枪掩体姿态吸收 20% 冲击伤害！§r');
      }
    }

    // 2.3 战术防暴盾牌格挡枪械子弹伤害与反弹 (Bullet Shield Blocking & Reflection)
    const mainhandItem = targetEquip?.getEquipment(EquipmentSlot.Mainhand);
    const hasShield = (offhandItem?.typeId?.includes('shield') || mainhandItem?.typeId?.includes('shield'));
    const isRiot = (offhandItem?.typeId?.includes('riot_shield') || mainhandItem?.typeId?.includes('riot_shield'));
    const isFlash = (offhandItem?.typeId?.includes('flash_shield') || mainhandItem?.typeId?.includes('flash_shield'));

    if (hasShield) {
      // 判定攻击方向是否在正面 (前方 200° 大扇形格挡)
      let isFrontal = true;
      if (shooter && shooter.isValid()) {
        const sLoc = shooter.location;
        const tLoc = target.location;
        const viewDir = target.getViewDirection ? target.getViewDirection() : { x: 0, z: 0 };
        const dx = sLoc.x - tLoc.x;
        const dz = sLoc.z - tLoc.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.1) {
          const dot = (dx / dist) * viewDir.x + (dz / dist) * viewDir.z;
          isFrontal = (dot > -0.25);
        }
      }

      if (isFrontal) {
        // 潜行举盾吸收 85% 枪械伤害，常态持盾吸收 70% 枪械伤害
        const blockRate = target.isSneaking ? 0.85 : 0.70;
        currentDamage *= (1.0 - blockRate);

        // 盾牌金属跳弹火花与格挡重击音效
        try {
          target.dimension.playSound('item.shield.block', targetLoc, { volume: 1.3, pitch: 1.1 });
          target.dimension.playSound('random.anvil_land', targetLoc, { volume: 0.7, pitch: 1.9 });
          const sparkLoc = (impactLocation && Number.isFinite(impactLocation.x)) ? impactLocation : targetLoc;
          target.dimension.spawnParticle('minecraft:crit', sparkLoc);
          target.dimension.spawnParticle('minecraft:camera_shoot_explosion', sparkLoc);
        } catch {}

        // 重装反甲盾 50% 真实动能反伤
        if (isRiot && shooter && shooter.isValid() && shooter.id !== target.id) {
          const reflectDmg = Math.max(2.0, Math.round(baseDmg * 0.50));
          try {
            shooter.applyDamage(reflectDmg, { cause: EntityDamageCause.thorns, damagingEntity: target });
            shooter.dimension.spawnParticle('minecraft:critical_hit_emitter', shooter.location);
          } catch {}
          if (target.typeId === 'minecraft:player') {
            target.onScreenDisplay?.setActionBar?.(`§6🛡【重装反甲盾】格挡子弹！吸收 ${(blockRate * 100).toFixed(0)}% 枪伤，反弹 §e${reflectDmg}§6 动能反伤!§r`);
          }
        } else if (target.typeId === 'minecraft:player') {
          target.onScreenDisplay?.setActionBar?.(`§9🛡【G52 防暴盾】格挡子弹！吸收 ${(blockRate * 100).toFixed(0)}% 枪械伤害!§r`);
        }
      }
    }

    // 3. 武器专属被动机制结算 (Weapon Passives)
    let finalPenetration = stats.armorPenetration || 0.25;

    // 3.1 🟣 M1014 泰坦壁垒：【重装过载 / Armor-Scale Dynamic Damage】(自身护甲越厚伤害越高)
    if (gun.id === 'test_gun:m1014_ward' || gun.isArmorScaled) {
      const shooterArmor = (shooter && shooter.isValid()) ? this.estimateArmorPoints(shooter) : 0;
      // 每点自身护甲增伤 3.0% (满护甲 20点增伤 60%，泰坦套24点增伤 72%)
      const armorBonusRatio = 1.0 + Math.min(1.0, shooterArmor * 0.03);
      currentDamage *= armorBonusRatio;
      if (shooter && shooter.typeId === 'minecraft:player') {
        const bonusPct = Math.round((armorBonusRatio - 1.0) * 100);
        shooter.onScreenDisplay?.setActionBar?.(`§6🛡【重装过载】自身护甲 §e${shooterArmor}§6 点，霰弹威力爆发 §a+${bonusPct}%§6!§r`);
      }
    }

    // 3.2 🟣 PKM 烈焰重机枪：【硫磺烈焰 / Incendiary DOT】(连续灼烧与熔火爆燃)
    if (gun.id === 'test_gun:pkm' || gun.isIncendiaryDot) {
      try {
        target.setOnFire(4, true); // 施加4秒持续燃烧
        // 概率触发熔火爆炸钢屑与爆燃音效
        const dim = target.dimension;
        dim.spawnParticle('test_gun:pkm_burn', { x: targetLoc.x, y: targetLoc.y + 1, z: targetLoc.z });
        dim.spawnParticle('minecraft:basic_flame_particle', { x: targetLoc.x, y: targetLoc.y + 1.2, z: targetLoc.z });
        if (Math.random() < 0.35) {
          dim.playSound('random.fizz', targetLoc, { volume: 0.8, pitch: 1.2 });
        }
      } catch {}
    }

    // 3.3 🔵 RPK 班用轻机枪：【火力压制 / Suppression】(强力减速与破除霸体)
    if (gun.id === 'test_gun:rpk') {
      try {
        target.addEffect('slowness', 40, { amplifier: 1, showParticles: false });
      } catch {}
    }

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
    // 🩸 USAS-12「嗜血狂潮」专属吸血被动结算 (Life-Steal & Overheal Barrier)
    if (gun && (gun.isLifeSteal || gun.id === 'test_gun:usas12') && shooter && shooter.isValid() && shooter.typeId === 'minecraft:player') {
      try {
        const ratio = gun.lifeStealRatio || 0.18;
        const healAmount = Math.max(0.5, Math.round(finalDamage * ratio * 10) / 10);
        
        const healthComp = shooter.getComponent('minecraft:health');
        if (healthComp) {
          const currentHp = healthComp.currentValue;
          const maxHp = healthComp.effectiveMax;
          
          if (currentHp < maxHp) {
            const newHp = Math.min(maxHp, currentHp + healAmount);
            healthComp.setCurrentValue(newHp);
            shooter.dimension.spawnParticle('minecraft:heart_particle', {
              x: shooter.location.x + (Math.random() - 0.5) * 0.4,
              y: shooter.location.y + 1.2,
              z: shooter.location.z + (Math.random() - 0.5) * 0.4
            });
            shooter.onScreenDisplay?.setActionBar?.(`§c🩸【噬血狂潮】汲取生命 +${healAmount.toFixed(1)} HP (§e${newHp.toFixed(0)}/${maxHp}§c)§r`);
          } else {
            // 满血过量吸血转化为临时金色伤害吸收护盾 (Absorption)
            shooter.addEffect('absorption', 120, { amplifier: 1, showParticles: false });
            shooter.onScreenDisplay?.setActionBar?.(`§6🛡【鲜血盛宴】过量吸血激活金色伤害吸收护盾！§r`);
          }
          
          // 受害者产生猩红噬血粒子与音效
          target.dimension.spawnParticle('minecraft:critical_hit_emitter', target.location);
          if (Math.random() < 0.20) {
            shooter.dimension.playSound('random.drink', shooter.location, { volume: 0.6, pitch: 1.4 });
          }
        }
      } catch (err) {
        console.warn('Error in life-steal handler:', err);
      }
    }

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

    // 8. 施加物理击退 (堡垒重装防弹衣 100% 击退免疫)
    const hasMobChest = chestItem && chestItem.typeId.includes('armor_mob_chest');
    if (stats.knockback && shooter && shooter.isValid() && !hasMobChest) {
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
