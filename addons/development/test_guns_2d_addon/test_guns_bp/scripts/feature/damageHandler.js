import { EntityDamageCause, EquipmentSlot, system } from '@minecraft/server';
import { MathUtils } from './utils/mathUtils.js';
import { isProtectedTeammate } from './utils/teamRules.js';
import { isPvpDowned } from './utils/pvpRules.js';
import { DamageIndicator } from './damageIndicator.js';
import { ArmorEngine, ARMOR_KNOCKBACK_VALUES } from './armorEngine.js';

export { ARMOR_KNOCKBACK_VALUES };

export const WEAPON_ARCHETYPE_STATS = {
	sniper: { basePenetration: 0.60, floorRatio: 0.40 },
	rifle: { basePenetration: 0.38, floorRatio: 0.25 },
	lmg: { basePenetration: 0.42, floorRatio: 0.25 },
	smg: { basePenetration: 0.25, floorRatio: 0.18 },
	shotgun: { basePenetration: 0.22, floorRatio: 0.20 },
	pistol: { basePenetration: 0.20, floorRatio: 0.15 },
	special: { basePenetration: 0.70, floorRatio: 0.45 },
	energy: { basePenetration: 0.45, floorRatio: 0.30 }
};

export const ARMOR_PIECE_VALUES = {
 // 原版原貌装甲 (Vanilla Armors)
 leather_helmet: 1, leather_chestplate: 3, leather_leggings: 2, leather_boots: 1,
 golden_helmet: 2, golden_chestplate: 5, golden_leggings: 3, golden_boots: 1,
 chainmail_helmet: 2, chainmail_chestplate: 5, chainmail_leggings: 4, chainmail_boots: 1,
 iron_helmet: 2, iron_chestplate: 6, iron_leggings: 5, iron_boots: 2,
 diamond_helmet: 3, diamond_chestplate: 8, diamond_leggings: 6, diamond_boots: 3,
 netherite_helmet: 3, netherite_chestplate: 8, netherite_leggings: 6, netherite_boots: 3,
 turtle_helmet: 2,

 // 【先进战术装备 ATG】新增高科技与特种防具 (Advanced Tactical Armors)
 // 金色传说品质 (Gold / Legendary)
 armor_mlt_hg2: 16,
 armor_mlt_hg2_desert: 16,
 armor_killa_6b13: 14,
 armor_ocf_gpnvg18: 6,
 armor_ocf_gpnvg18_desert: 6,
 armor_ocf_gpnvg18_up: 6,

 // 紫色史诗品质 (Purple / Epic)
 armor_mch_fc: 6,
 armor_mch_fc_desert: 6,
 armor_mch_fc_up: 6,
 armor_ca_pvs31: 5,
 armor_ca_pvs31_desert: 5,
 armor_ca_pvs_31_up: 5,
 armor_jpc_2: 8,
 armor_jpc_2_desert: 8,

 // 蓝色精良品质 (Blue / Rare)
 armor_emr_6b13: 10,
 armor_ala_spc: 8,
 armor_oc_amp: 4,
 armor_black_ghillie: 5,
 armor_m50: 4,

 // 绿色优秀品质 (Green / Uncommon)
 armor_oak_ghillie: 4,
 armor_goggles_black: 3,
 armor_goggles_red: 3,

 // 原有装甲大幅补偿加强 (Original Armors - Compensated & Generously Buffed)
 armor_titan_chest: 14,    // 泰坦动力胸甲 (原 12 -> 14)
 armor_epic_titan_vest: 14,  // 史诗泰坦背心 (原 12 -> 14)
 armor_mob_chest: 12,     // 堡垒重装胸甲 (原 9 -> 12)
 armor_assault_vest: 9,    // 重装突击背心 (原 7 -> 9)
 armor_vest_heavy: 9,     // 重型防弹背心 (原 7 -> 9)
 armor_police_vest: 7,     // 警用防弹衣 (原 5 -> 7)
 armor_vest_light: 5,     // 轻型防弹背心 (原 4 -> 5)
 armor_epic_ghillie_suit: 7,  // 史诗潜行吉利服 (原 6 -> 7)
 armor_bdu_woodland_top: 5,  // 林地作战服上身 (原 4 -> 5)
 armor_hazmat_top: 5,     // 防化服上身 (原 4 -> 5)

 // 战术防暴头盔与面罩 (Helmets & Masks)
 armor_tactical_helmet: 6,   // 战术防暴头盔 (原 4 -> 6)
 armor_helmet_tactical: 6,   // 战术防弹头盔 (原 3 -> 6)
 armor_gasmask: 4,       // 军用防毒面具 (原 3 -> 4)
 armor_night_goggles: 3,    // 便携夜视风镜 (原 2 -> 3)
 armor_night_vision: 4,    // 战术夜视仪 (原 3 -> 4)
 armor_mob_mask: 6,      // 堡垒防暴面罩 (原 4 -> 6)
 armor_wasp_mask: 4,      // 黄蜂轻型面罩 (原 2 -> 4)
 armor_immortal_mask: 4,    // 不朽者防毒面罩 (原 2 -> 4)
 armor_analyzer: 3,      // 战术分析仪 (原 2 -> 3)
 armor_tech: 5,        // 科技战术头盔 (原 4 -> 5)
 armor_fraternity: 3,     // 兄弟会战术面具 (原 1 -> 3)

 // 作战裤与护腿 (Tactical Pants & Leggings)
 armor_mob_pants: 7,      // 堡垒重装防暴裤 (原 6 -> 7)
 armor_gorka_bottom: 6,    // 廓尔喀战斗裤 (原 5 -> 6)
 armor_bdu_woodland_bottom: 5, // 林地作战裤 (原 4 -> 5)
 armor_wasp_pants: 5,     // 黄蜂轻量作战裤 (原 4 -> 5)
 armor_immortal_pants: 6,   // 特警特训长裤 (原 5 -> 6)

 // 作战靴 (Tactical Boots)
 armor_wasp_boots: 4,     // 工兵减震军靴 (原 3 -> 4)

 // 特殊机动装备与战术盾牌 (Mobility & Shields)
 jetpack: 6,
 riot_shield: 5,        // 重装反甲盾 (原 4 -> 5)
 flash_shield: 5,       // G52 战术闪光盾 (原 4 -> 5)
 armor_wasp_rig: 8,      // 黄蜂轻型胸挂 (原 6 -> 8)
 armor_immortal_vest: 9,    // 特警特训背心 (原 7 -> 9)

 // 便服与作战常服 (Casual Wear & Clothes)
 cloth_hunting_vest: 3,
 cloth_leather_black: 3,
 cloth_cargo_tan: 2,
 cloth_jean_blue: 2,
 cloth_overall_blue: 2,
 cloth_puffer_blue: 2,
 cloth_hoodie_black: 2,
 cloth_flannel_red: 2,
 cloth_varsity_red: 2,
 cloth_ushanka: 2,
 cloth_beanie_black: 1,
 cloth_boonie_woodland: 1,
 cloth_cowboy_brown: 1,
 cloth_hawaiian_red: 1,
 cloth_shemagh_tan: 1,
 cloth_sweater_white: 1,
 cloth_trackpants_black: 1
};

export class DamageHandler {
	/**
	 * 获取实体当前装甲的总抗击退比例 (0.0 ~ 1.0, 1.0 为 100% 击退免疫 / 无击退效果)
	 * @param {Entity} entity
	 * @returns {number}
	 */
	static getKnockbackResistance(entity) {
		return ArmorEngine.getKnockbackResistance(entity);
	}

 /**
  * 估算目标实体的综合护甲点数 (0 ~ 24+)
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
     const rawName = item.typeId.includes(':') ? item.typeId.split(':')[1].toLowerCase() : item.typeId.toLowerCase();
     if (ARMOR_PIECE_VALUES[rawName] !== undefined) {
      points += ARMOR_PIECE_VALUES[rawName];
     } else {
      // 智能启发式兜底：按关键词与装备槽智能推算护甲，确保未来装备或联动装备绝对生效
      if (rawName.includes('titan') || rawName.includes('mob_chest') || rawName.includes('mlt_hg2')) points += 16;
      else if (rawName.includes('killa')) points += 14;
      else if (rawName.includes('6b13')) points += 10;
      else if (rawName.includes('jpc') || rawName.includes('spc') || rawName.includes('assault') || rawName.includes('immortal_vest')) points += 8;
      else if (rawName.includes('chest') || rawName.includes('vest') || rawName.includes('rig') || rawName.includes('top')) points += 6;
      else if (rawName.includes('gpnvg') || rawName.includes('mch_fc') || rawName.includes('mob_mask') || rawName.includes('pvs31')) points += 6;
      else if (rawName.includes('pants') || rawName.includes('bottom') || rawName.includes('leggings')) points += 5;
      else if (rawName.includes('helmet') || rawName.includes('mask') || rawName.includes('head') || rawName.includes('goggles')) points += 4;
      else if (rawName.includes('boots') || rawName.includes('feet')) points += 3;
      else if (rawName.includes('shield')) points += 5;
      else if (slot === EquipmentSlot.Chest) points += 6;
      else if (slot === EquipmentSlot.Legs) points += 4;
      else if (slot === EquipmentSlot.Head) points += 4;
      else if (slot === EquipmentSlot.Feet) points += 2;
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
  * 穿甲与减伤公式计算 (双曲递减收益曲线 + 动能保底)
  * @param {number} baseDamage 基础伤害
  * @param {number} armorPoints 护甲点数
  * @param {number} [armorPiercing=0.25] 穿甲系数 (0.0 ~ 1.0)
  * @param {number} [floorRatio=0.20] 动能保底伤害比例 (0.15 ~ 0.50)
  * @returns {number}
  */
 static calculateArmorReduction(baseDamage, armorPoints, armorPiercing = 0.25, floorRatio = 0.20) {
  if (armorPoints <= 0) return Math.max(1.0, Math.round(baseDamage * 10) / 10);
  const effectivePiercing = Math.max(0, Math.min(1.0, armorPiercing !== undefined ? armorPiercing : 0.25));
  const effectiveArmor = Math.max(0, armorPoints * (1.0 - effectivePiercing));
  // 双曲递减收益曲线：Reduction = EffectiveArmor / (EffectiveArmor + 16.0)，硬上限 70% (0.70)
  const reductionRatio = Math.min(0.70, effectiveArmor / (effectiveArmor + 16.0));
  const reducedDamage = baseDamage * (1.0 - reductionRatio);
  const floorDamage = baseDamage * (floorRatio !== undefined ? floorRatio : 0.20);
  const finalDamage = Math.max(floorDamage, reducedDamage);
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
  const dropFactor = Math.max(0.3, 1.0 - distance * (stats.damageDropOff ?? 0.02));
  let currentDamage = baseDmg * dropFactor;

  // ----------------------------------------------------
  // 1.1 射手战术装备攻击属性与致命暴击结算 (Offensive Stats & Critical Strike)
  // ----------------------------------------------------
  let critRate = 0.05; // 基础 5% 暴击率
  let critMultiplier = 1.5; // 基础 1.5x 暴击伤害倍率
  let dmgMultiplier = 1.0; // 武器基础伤害修正

  const shooterEquip = (shooter && shooter.isValid()) ? shooter.getComponent?.('minecraft:equippable') : undefined;
  const sHead = (shooterEquip?.getEquipment(EquipmentSlot.Head)?.typeId || '').toLowerCase();
  const sChest = (shooterEquip?.getEquipment(EquipmentSlot.Chest)?.typeId || '').toLowerCase();
  const sLegs = (shooterEquip?.getEquipment(EquipmentSlot.Legs)?.typeId || '').toLowerCase();
  const sFeet = (shooterEquip?.getEquipment(EquipmentSlot.Feet)?.typeId || '').toLowerCase();

  const gunId = (gun.id || '').toLowerCase();
  const gunCat = (gun.category || gun.type || '').toLowerCase();
  const isSniper = gunId.includes('svd') || gunId.includes('m82') || gunId.includes('awp') || gunId.includes('kar98') || gunId.includes('mosin') || gunId.includes('hunting') || gunId.includes('vss') || gunCat === 'sniper';
  const isShotgun = gunId.includes('m1014') || gunId.includes('usas12') || gunId.includes('remington') || gunId.includes('spas12') || gunId.includes('saiga12') || gunId.includes('double_barrel') || gunId.includes('shotgun') || gunId.includes('m1897') || gunId.includes('dbss') || gunCat === 'shotgun';
  const isLmg = gunId.includes('pkm') || gunId.includes('rpk') || gunId.includes('m249') || gunId.includes('dp27') || gunId.includes('minigun') || gunId.includes('bar') || gunCat === 'lmg';
  const isSmg = gunId.includes('p90') || gunId.includes('mp5') || gunId.includes('uzi') || gunId.includes('vector') || gunId.includes('ump45') || gunId.includes('mac10') || gunId.includes('bizon') || gunCat === 'smg';
  const isRifle = (!isLmg && (gunId.includes('ak47') || gunId.includes('ak74u') || gunId.includes('m4a1') || gunId.includes('scarh') || gunId.includes('hk416') || gunId.includes('aug') || gunId.includes('g36c') || gunId.includes('fal') || gunId.includes('galil') || gunId.includes('qbz95') || gunId.includes('arx') || gunCat === 'rifle'));
  const isPistol = gunId.includes('glock') || gunId.includes('deagle') || gunId.includes('colt') || gunId.includes('m1911') || gunId.includes('revolver') || gunId.includes('usp') || gunId.includes('tt33') || gunId.includes('makarov') || gunCat === 'pistol';
  const isSpecial = gunId.includes('rpg') || gunId.includes('m79') || gunId.includes('mgl') || gunCat === 'special' || Boolean(gun.isRocketLauncher || gun.isGrenadeLauncher);
  const isEnergy = gunId.includes('arc') || gunCat === 'energy' || Boolean(gun.isArcWeapon);

  // 头部攻击被动
  if (sHead.includes('armor_ocf_gpnvg18')) {
   critRate += 0.25; // GPNVG-18 全景四目夜视仪：+25% 全枪械暴击率
   critMultiplier = 1.85; // 暴击伤害倍率提升至 1.85x
   dmgMultiplier += 0.10; // 全局精准伤害加成 +10%
  } else if (sHead.includes('armor_ca_pvs31') || sHead.includes('armor_ca_pvs_31')) {
   critRate += (isSniper || isRifle) ? 0.20 : 0.15; // PVS-31: +15% 暴击率 (步枪/狙击 +20%)
   critMultiplier = 1.65;
   dmgMultiplier += 0.08;
  } else if (sHead.includes('armor_mch_fc')) {
   critRate += 0.10; // MICH 2000: +10% 暴击率
   dmgMultiplier += 0.06;
  } else if (sHead.includes('armor_oc_amp')) {
   critRate += 0.08; // 战术降噪拾音耳机: +8% 暴击率
  } else if (sHead.includes('armor_goggles_black') || sHead.includes('armor_goggles_red')) {
   critRate += 0.08; // 战术防弹风镜: +8% 暴击率
  } else if (sHead.includes('armor_tech') || sHead.includes('armor_analyzer')) {
   critRate += 0.12; // 战术分析仪 / 科技头盔: +12% 暴击率
  } else if (sHead.includes('armor_tactical_helmet') || sHead.includes('armor_helmet_tactical')) {
   critRate += 0.08; // 战术防暴头盔: +8% 暴击率
  } else if (sHead.includes('armor_wasp_mask')) {
   critRate += (isSmg || isPistol) ? 0.15 : 0.06;
  } else if (sHead.includes('armor_immortal_mask')) {
   critRate += isShotgun ? 0.15 : 0.06;
  }

  // 胸甲攻击被动
  if (sChest.includes('armor_killa_6b13')) {
   critRate += 0.20; // Killa 6B13: +20% 暴击率
   if (isSmg || isShotgun) dmgMultiplier += 0.30; // 冲锋枪/霰弹枪 +30% 伤害
   else dmgMultiplier += 0.15;
   try {
    const sHp = shooter?.getComponent?.('minecraft:health');
    if (sHp && (sHp.currentValue / sHp.effectiveMax) <= 0.4) {
     critRate += 0.20; // 濒死残血额外狂暴 +20% 暴击率
    }
   } catch {}
  } else if (sChest.includes('armor_mlt_hg2')) {
   dmgMultiplier += isLmg ? 0.30 : 0.15; // 军用科技 HG2: 重火器 +30% 伤害，其他 +15%
  } else if (sChest.includes('armor_jpc_2')) {
   dmgMultiplier += 0.20; // JPC 2.0: 全武器伤害 +20%
   critRate += 0.10;   // +10% 暴击率
  } else if (sChest.includes('armor_emr_6b13')) {
   dmgMultiplier += isRifle ? 0.20 : 0.10; // 6B13 EMR: 突击步枪 +20% 伤害
   critRate += 0.08;
  } else if (sChest.includes('armor_ala_spc')) {
   dmgMultiplier += 0.15; // 骷髅SPC: 全枪械伤害 +15%
   critRate += 0.08;
  } else if (sChest.includes('armor_black_ghillie')) {
   if (isSniper) {
    dmgMultiplier += shooter?.isSneaking ? 0.40 : 0.25; // 暗夜狙击手：潜行时狙击枪 +40% 伤害
    critRate += shooter?.isSneaking ? 0.30 : 0.15;
   } else {
    dmgMultiplier += 0.10;
   }
  } else if (sChest.includes('armor_oak_ghillie')) {
   if (isSniper) {
    dmgMultiplier += 0.25;
    critRate += 0.15;
   } else {
    dmgMultiplier += 0.08;
   }
  } else if (sChest.includes('armor_titan_chest') || sChest.includes('armor_epic_titan_vest')) {
   dmgMultiplier += isLmg ? 0.30 : 0.20; // 泰坦外骨骼：全枪械增伤 +20% (机枪 +30%)
  } else if (sChest.includes('armor_assault_vest') || sChest.includes('armor_vest_heavy')) {
   dmgMultiplier += isRifle ? 0.20 : 0.12; // 重装突击背心：步枪 +20% 伤害
   critRate += 0.08;
  } else if (sChest.includes('armor_police_vest')) {
   dmgMultiplier += (isPistol || isSmg) ? 0.20 : 0.10; // 警用防弹衣：手枪/冲锋枪 +20% 伤害
   critRate += 0.08;
  } else if (sChest.includes('armor_wasp_rig')) {
   dmgMultiplier += isSmg ? 0.25 : 0.12; // 黄蜂轻型胸挂：冲锋枪 +25% 伤害
   critRate += 0.10;
  } else if (sChest.includes('armor_immortal_vest')) {
   dmgMultiplier += isShotgun ? 0.25 : 0.12; // 特警特训背心：霰弹枪 +25% 伤害
   critRate += 0.10;
  } else if (sChest.includes('armor_epic_ghillie_suit')) {
   if (isSniper) {
    dmgMultiplier += 0.30;
    critRate += 0.20;
   }
  }

  // 腿部与脚部攻击被动
  if (sLegs.includes('armor_mob_pants') && shooter?.isSneaking) {
   dmgMultiplier += 0.18; // 堡垒防暴裤：下蹲架枪威力提升 18%
  }
  if (sFeet.includes('armor_m50')) {
   critRate += 0.05; // M50面具配件：专注瞄准 +5% 暴击率
  }

  currentDamage *= dmgMultiplier;

  // 战术致命暴击判定 (Critical Strike Roll)
  const isCritHit = !gun.disableCritical && Math.random() < critRate;
  if (isCritHit) {
   currentDamage *= critMultiplier;
   DamageIndicator.markCritical(target.id);
   try {
    const pLoc = target.location;
    const dim = target.dimension;
    dim.spawnParticle('minecraft:critical_hit_emitter', { x: pLoc.x, y: pLoc.y + 1.2, z: pLoc.z });
    dim.playSound('random.orb', pLoc, { volume: 0.9, pitch: 1.6 });
    dim.playSound('firework.blast', pLoc, { volume: 0.6, pitch: 1.4 });
   } catch {}
   if (shooter && shooter.typeId === 'minecraft:player') {
    shooter.onScreenDisplay?.setActionBar?.(`§c【战术暴击】触发致命暴击！造成 §e${critMultiplier.toFixed(2)}x§c暴击倍率伤害！§r`);
   }
  }

  // 2. 目标防具减免被动检测 (Tactical Armor Passives)
  const targetEquip = target.getComponent?.('minecraft:equippable');
  const chestItem = targetEquip?.getEquipment(EquipmentSlot.Chest);
  const headItem = targetEquip?.getEquipment(EquipmentSlot.Head);
  const offhandItem = targetEquip?.getEquipment(EquipmentSlot.Offhand);

  // 2.1 爆头判定与爆头头盔减伤
  const headshot = !gun.disableHeadshot && this.isHeadshot(impactLocation, target);
  if (headshot) {
   DamageIndicator.markHeadshot(target.id);
   let hsMult = stats.headshotMultiplier || 1.75;
   const headId = (headItem?.typeId || '').toLowerCase();

   if (headId.includes('armor_mob_mask') || headId.includes('armor_mch_fc')) {
    // 堡垒重装防暴面罩 & MICH 2000 战术防弹头盔：完全阻断爆头加成！
    hsMult = 1.0;
    try {
     target.dimension.playSound('random.anvil_land', targetLoc, { volume: 0.9, pitch: 2.0 });
     target.dimension.spawnParticle('minecraft:crit', (impactLocation && Number.isFinite(impactLocation.x)) ? impactLocation : targetLoc);
    } catch {}
    if (target.typeId === 'minecraft:player') {
     const helmetName = headId.includes('armor_mch_fc') ? 'MICH 2000' : '堡垒防暴面罩';
     target.onScreenDisplay?.setActionBar?.(`§6【${helmetName}】全防护重装头盔完全阻断爆头加成伤害！§r`);
    }
   } else if (headId.includes('armor_ocf_gpnvg18')) {
    hsMult = Math.max(1.10, hsMult - 0.60); // GPNVG-18: 吸收 60% 爆头加成
   } else if (headId.includes('armor_ca_pvs31') || headId.includes('armor_ca_pvs_31')) {
    hsMult = Math.max(1.15, hsMult - 0.50); // PVS-31: 吸收 50% 爆头加成
   } else if (headId.includes('armor_helmet_tactical') || headId.includes('armor_tactical_helmet') || headId.includes('armor_tech')) {
    hsMult = Math.max(1.15, hsMult - 0.50); // 战术防暴头盔吸收 50% 爆头额外伤害
   } else if (headId.includes('armor_oc_amp')) {
    hsMult = Math.max(1.20, hsMult - 0.35); // AMP战术拾音降噪耳机吸收 35% 爆头震荡
   } else if (headId.includes('armor_goggles_black') || headId.includes('armor_goggles_red')) {
    hsMult = Math.max(1.25, hsMult - 0.25); // 防弹风镜吸收 25% 爆头加成
   }
   currentDamage *= hsMult;
  }

  // 2.2 防弹衣额外减伤 (温和微调：吸收 6% ~ 20%，避免双重高减伤将伤害彻底压缩至 1)
  if (chestItem) {
   const chestId = (chestItem.typeId || '').toLowerCase();
   if (chestId.includes('armor_mlt_hg2')) {
    currentDamage *= 0.80; // 军用科技 HG2 全身重甲：20% 终伤吸收 (金色顶级防护)
   } else if (chestId.includes('armor_killa_6b13')) {
    currentDamage *= 0.82; // Killa 6B13 防弹衣：18% 终伤吸收
    if (distance <= 8.0 || isShotgun) {
     currentDamage *= 0.90; // 贴身近战/霰弹额外再吸收 10%
    }
   } else if (chestId.includes('armor_mob_chest')) {
    currentDamage *= 0.82; // 堡垒重装防弹衣 18% 终伤吸收
   } else if (chestId.includes('armor_titan_chest') || chestId.includes('armor_epic_titan_vest')) {
    currentDamage *= 0.84; // 泰坦动力外骨骼装甲 16% 终伤吸收
   } else if (chestId.includes('armor_emr_6b13')) {
    currentDamage *= 0.86; // 6B13 EMR 迷彩防弹衣 14% 终伤吸收
   } else if (chestId.includes('armor_ala_spc')) {
    currentDamage *= 0.88; // 艾斯链甲SPC背心 12% 终伤吸收
   } else if (chestId.includes('armor_assault_vest') || chestId.includes('armor_vest_heavy')) {
    currentDamage *= 0.88; // 重装突击防弹衣 12% 终伤吸收
   } else if (chestId.includes('armor_jpc_2')) {
    currentDamage *= 0.90; // JPC 2.0 轻量特战背心 10% 终伤吸收
   } else if (chestId.includes('armor_immortal_vest') || chestId.includes('armor_police_vest')) {
    currentDamage *= 0.90; // 特警特训 / 警用防弹衣 10% 终伤吸收
   } else if (chestId.includes('armor_black_ghillie') || chestId.includes('armor_epic_ghillie_suit')) {
    currentDamage *= 0.92; // 黑色吉利服 / 史诗吉利服 8% 终伤吸收
   } else if (chestId.includes('armor_oak_ghillie') || chestId.includes('armor_vest_light') || chestId.includes('armor_bdu_woodland_top') || chestId.includes('armor_hazmat_top')) {
    currentDamage *= 0.94; // 橡木吉利服 / 轻型战术背心 6% 终伤吸收
   }
  }

  // 2.2.1 堡垒重装防暴裤：下蹲架枪掩体减伤 15%
  const legsItem = targetEquip?.getEquipment(EquipmentSlot.Legs);
  if (target.isSneaking && legsItem) {
   const legsId = (legsItem.typeId || '').toLowerCase();
   if (legsId.includes('armor_mob_pants')) {
    currentDamage *= 0.85; // 下蹲架枪掩体吸收 15% 冲击
    if (target.typeId === 'minecraft:player') {
     target.onScreenDisplay?.setActionBar?.('§6【堡垒防暴裤】下蹲架枪掩体姿态吸收 15% 冲击伤害！§r');
    }
   } else if (legsId.includes('armor_immortal_pants') || legsId.includes('armor_gorka_bottom')) {
    currentDamage *= 0.92; // 特警战术裤 / 廓尔喀战斗裤：下蹲吸收 8% 伤害
   }
  }

  // 2.3 战术防暴盾牌格挡枪械子弹伤害与反弹 (Bullet Shield Blocking & Reflection)
  const mainhandItem = targetEquip?.getEquipment(EquipmentSlot.Mainhand);
  const hasShield = (offhandItem?.typeId?.includes('shield') || mainhandItem?.typeId?.includes('shield'));
  const isRiot = (offhandItem?.typeId?.includes('riot_shield') || mainhandItem?.typeId?.includes('riot_shield'));
  const isFlash = (offhandItem?.typeId?.includes('flash_shield') || mainhandItem?.typeId?.includes('flash_shield'));

  if (hasShield && !isPvpDowned(target)) {
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
      target.onScreenDisplay?.setActionBar?.(`§6【重装反甲盾】格挡子弹！吸收 ${(blockRate * 100).toFixed(0)}% 枪伤，反弹 §e${reflectDmg}§6动能反伤!§r`);
     }
    } else if (target.typeId === 'minecraft:player') {
     target.onScreenDisplay?.setActionBar?.(`§9【G52 防暴盾】格挡子弹！吸收 ${(blockRate * 100).toFixed(0)}% 枪械伤害!§r`);
    }
   }
  }

  // 3. 枪械类型穿甲、动能保底与武器专属机制 (Archetype Stats & Weapon Passives)
  let archetype = 'rifle';
  if (isSniper) archetype = 'sniper';
  else if (isLmg) archetype = 'lmg';
  else if (isShotgun) archetype = 'shotgun';
  else if (isSmg) archetype = 'smg';
  else if (isPistol) archetype = 'pistol';
  else if (isSpecial) archetype = 'special';
  else if (isEnergy) archetype = 'energy';

  const archStats = WEAPON_ARCHETYPE_STATS[archetype] || WEAPON_ARCHETYPE_STATS.rifle;
  let finalPenetration = stats.armorPenetration !== undefined ? stats.armorPenetration : archStats.basePenetration;
  let floorRatio = archStats.floorRatio;

  // 枪械特定调优 (Specific Gun Overrides)
  if (gunId.includes('m82')) {
   finalPenetration = 0.80;
   floorRatio = 0.45;
  } else if (gunId.includes('svd')) {
   finalPenetration = 0.60;
   floorRatio = 0.40;
  } else if (gunId.includes('scarh')) {
   finalPenetration = 0.45;
   floorRatio = 0.28;
  } else if (gunId.includes('deagle')) {
   finalPenetration = 0.45;
   floorRatio = 0.30;
  } else if (gunId.includes('p90')) {
   finalPenetration = 0.35;
   floorRatio = 0.20;
  } else if (gunId.includes('usas12')) {
   finalPenetration = 0.35;
   floorRatio = 0.22;
  } else if (gunId.includes('dbss')) {
   finalPenetration = 0.40;
   floorRatio = 0.30;
  } else if (gunId.includes('rpg')) {
   finalPenetration = 0.80;
   floorRatio = 0.50;
  } else if (gunId.includes('mgl') || gunId.includes('m79')) {
   finalPenetration = 0.50;
   floorRatio = 0.40;
  }

  // 霰弹枪近战 5 格内动能爆发穿甲增益
  if (isShotgun && distance <= 5.0) {
   finalPenetration = Math.max(finalPenetration, 0.35);
   floorRatio = Math.max(floorRatio, 0.25);
  }

  // 3.1 M1014 泰坦壁垒：【重装过载 / Armor-Scale Dynamic Damage】(自身护甲越厚伤害越高)
  if (gun.id === 'test_gun:m1014_ward' || gun.isArmorScaled) {
   const shooterArmor = (shooter && shooter.isValid()) ? this.estimateArmorPoints(shooter) : 0;
   // 每点自身护甲增伤 3.0% (满护甲 20点增伤 60%，泰坦套24点增伤 72%)
   const armorBonusRatio = 1.0 + Math.min(1.0, shooterArmor * 0.03);
   currentDamage *= armorBonusRatio;
   if (shooter && shooter.typeId === 'minecraft:player') {
    const bonusPct = Math.round((armorBonusRatio - 1.0) * 100);
    shooter.onScreenDisplay?.setActionBar?.(`§6【重装过载】自身护甲 §e${shooterArmor}§6点，霰弹威力爆发 §a+${bonusPct}%§6!§r`);
   }
  }

  // 3.2 PKM 烈焰重机枪：【硫磺烈焰 / Incendiary DOT】(连续灼烧与熔火爆燃)
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

  // 3.3 RPK 班用轻机枪：【火力压制 / Suppression】(强力减速与破除霸体)
  if (gun.id === 'test_gun:rpk') {
   try {
    target.addEffect('slowness', 40, { amplifier: 1, showParticles: false });
   } catch {}
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

  // 4. 护甲与穿透计算 (双曲递减曲线 + 保底动能伤害)
  const armorPoints = this.estimateArmorPoints(target);
  if (Number.isFinite(gun.fixedArmorPenetration)) finalPenetration = Math.max(0, Math.min(1, gun.fixedArmorPenetration));
  const finalDamage = this.calculateArmorReduction(currentDamage, armorPoints, finalPenetration, floorRatio);

  // 5. 施加无敌帧穿透伤害 (EntityDamageCause.override)
  const kbResistance = ArmorEngine.getKnockbackResistance(target);
  try {
   const damageOptions = {
    cause: EntityDamageCause.override,
    damagingEntity: (shooter && shooter.isValid()) ? shooter : undefined
   };
   const applied = target.applyDamage(finalDamage, damageOptions);
   if (gun.noHealthFallback && applied === false) return false;
   if (kbResistance >= 1.0) {
    try {
     target.clearVelocity();
    } catch {}
   }
  // USAS-12「嗜血狂潮」专属吸血被动结算 (Life-Steal & Overheal Barrier)
  if (gun && (gun.isLifeSteal || gun.id === 'test_gun:usas12') && shooter && shooter.isValid() && shooter.typeId === 'minecraft:player' && !isPvpDowned(shooter)) {
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
      shooter.onScreenDisplay?.setActionBar?.(`§c【噬血狂潮】汲取生命 +${healAmount.toFixed(1)} HP (§e${newHp.toFixed(0)}/${maxHp}§c)§r`);
     } else {
      // 满血过量吸血转化为临时金色伤害吸收护盾 (Absorption)
      shooter.addEffect('absorption', 120, { amplifier: 1, showParticles: false });
      shooter.onScreenDisplay?.setActionBar?.(`§6【鲜血盛宴】过量吸血激活金色伤害吸收护盾！§r`);
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
   if (gun.noHealthFallback) return false; // Never bypass protection by writing health.
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

  // 8. 施加物理击退 (高品质重甲 100% 击退免疫 / 无击退效果，其余品质按比例削减)
  if (kbResistance >= 1.0) {
   try {
    target.clearVelocity();
    system.run(() => {
     if (target.isValid()) target.clearVelocity();
    });
   } catch {}
  } else if (stats.knockback && shooter && shooter.isValid()) {
   try {
    const remainingFactor = Math.max(0, 1.0 - kbResistance);
    if (remainingFactor > 0.02) {
     const dir = shooter.getViewDirection();
     target.applyKnockback(
      dir.x * (stats.knockback.x || 0.3) * remainingFactor,
      dir.z * (stats.knockback.x || 0.3) * remainingFactor,
      (stats.knockback.x || 0.3) * remainingFactor,
      (stats.knockback.y || 0.15) * remainingFactor
     );
    }
   } catch {}
  }
  return true;
 }
}
