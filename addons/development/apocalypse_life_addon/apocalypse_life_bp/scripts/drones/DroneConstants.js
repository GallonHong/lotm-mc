/**
 * 战术无人机配置常量与规格参数
 * 对齐 drone.md 设计方案与经济规范
 */

export const DRONE_TIERS = {
 COMMON: { name: "基础", color: "§a" },
 RARE: { name: "特装", color: "§b" },
 EPIC: { name: "高级", color: "§d" },
 LEGENDARY: { name: "典藏", color: "§6" }
};

/**
 * 机体固有护甲点数：接入 Test Guns / SAPI 既有护甲公式（减伤随武器穿甲降低）。
 * 数值必须与 SAPI scripts/vendor/baizhan_damage/data/droneArmor.js 和
 * Test Guns scripts/data/droneArmor.js 保持一致，由 tests/test_drone_armor.mjs 校验。
 */
export const DRONE_ARMOR_BY_TIER = {
 COMMON: 10,
 RARE: 10,
 EPIC: 18,
 LEGENDARY: 25
};

/**
 * 机体固有爆炸减免：只作用于脚本爆炸（RPG / M79 / MGL / 迫击炮溅射、百战溅射、裂轨爆炸）。
 * 原生爆炸（苦力怕 / TNT / 自然灾害陨石 createExplosion）不在本机制范围内。
 * 数值必须与 SAPI / Test Guns 的 droneArmor.js 保持一致。
 */
export const DRONE_BLAST_REDUCTION_BY_TIER = {
 COMMON: 0.45,
 RARE: 0.55,
 EPIC: 0.65,
 LEGENDARY: 0.75
};

export const DRONE_REGISTRY = {
 // 1. 普通型
 "hummingbird": {
  id: "hummingbird",
  name: "「蜂鸟-I」侦察无人机",
  entityType: "makercamp_dr:summoner_drone",
  tier: DRONE_TIERS.COMMON,
  armor: DRONE_ARMOR_BY_TIER.COMMON,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.COMMON,
  maxDurability: 2000,
  baseHp: 60,
  baseDamage: 7.5,
  fireIntervalTicks: 16, // 0.8s 射击一次
  autoRevive: false,
  skills: []
 },
 // 2. 医疗型 - 低级
 "lifeline": {
  id: "lifeline",
  name: "「生命线」战地急救机",
  entityType: "makercamp_dr:ore_finder_drone",
  tier: DRONE_TIERS.RARE,
  armor: DRONE_ARMOR_BY_TIER.RARE,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.RARE,
  maxDurability: 2500,
  baseHp: 75,
  baseDamage: 7.5,
  fireIntervalTicks: 16,
  autoRevive: false,
  skills: [
   {
    id: "first_aid",
    name: "残血战地急救",
    trigger: "owner_low_hp",
    threshold: 0.30,
    cooldownTicks: 60 * 20, // 60s
    desc: "主人生命低于30%时触发：瞬间恢复6点生命，并获得再生I(5秒)"
   }
  ]
 },
 // 3. 医疗型 - 高级
 "guardian_angel": {
  id: "guardian_angel",
  name: "「守护天使」特战医疗机",
  entityType: "makercamp_dr:healing_drone",
  tier: DRONE_TIERS.EPIC,
  armor: DRONE_ARMOR_BY_TIER.EPIC,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.EPIC,
  maxDurability: 3500,
  baseHp: 95,
  baseDamage: 12,
  fireIntervalTicks: 15,
  autoRevive: true,
  skills: [
   {
    id: "high_aid",
    name: "强效战地急救",
    trigger: "owner_low_hp",
    threshold: 0.35,
    cooldownTicks: 40 * 20, // 40s
    desc: "主人生命低于35%时触发：瞬间恢复10点生命，并获得再生II(8秒)"
   },
   {
    id: "adrenaline_shot",
    name: "肾上腺素超频注入",
    trigger: "combat_buff",
    cooldownTicks: 60 * 20, // 60s
    desc: "进入交火时为主人注入战术肾上腺素：速度II、抗性提升I、伤害提升20%(8秒)"
   }
  ]
 },
 // 4. 攻击型 - 低级A
 "punisher": {
  id: "punisher",
  name: "「惩戒者」突击无人机",
  entityType: "makercamp_dr:mob_transporter_drone",
  tier: DRONE_TIERS.RARE,
  armor: DRONE_ARMOR_BY_TIER.RARE,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.RARE,
  maxDurability: 2500,
  baseHp: 80,
  baseDamage: 10.5,
  fireIntervalTicks: 10, // 0.5s 高速扫射
  autoRevive: false,
  skills: [
   {
    id: "berserk_mode",
    name: "狂暴火力压制",
    trigger: "combat_active",
    cooldownTicks: 40 * 20,
    durationTicks: 3 * 20,
    armorPenetration: 0.20,
    desc: "开启狂暴过载模式，持续3秒疯狂扫射敌人，附带20%穿甲效果"
   }
  ]
 },
 // 5. 攻击型 - 低级B
 "specter": {
  id: "specter",
  name: "「幽灵」聚能激光机",
  entityType: "makercamp_dr:spy_drone",
  tier: DRONE_TIERS.RARE,
  armor: DRONE_ARMOR_BY_TIER.RARE,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.RARE,
  maxDurability: 2500,
  baseHp: 75,
  baseDamage: 7.5,
  fireIntervalTicks: 10,
  autoRevive: false,
  skills: [
   {
    id: "laser_burst",
    name: "高能贯穿激光",
    trigger: "combat_target",
    cooldownTicks: 40 * 20,
    burstDamage: 35,
    desc: "锁定单个敌人发射高能聚能激光，造成35点巨额穿甲爆发伤害"
   }
  ]
 },
 // 6. 攻击型 - 高级
 "destroyer": {
  id: "destroyer",
  name: "「毁灭者」重装突击机",
  entityType: "makercamp_dr:mining_drone",
  tier: DRONE_TIERS.EPIC,
  armor: DRONE_ARMOR_BY_TIER.EPIC,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.EPIC,
  maxDurability: 3500,
  baseHp: 110,
  baseDamage: 12,
  pellets: 3, // 3*8 霰弹
  fireIntervalTicks: 25,
  autoRevive: true,
  skills: [
   {
    id: "heavy_berserk",
    name: "重装狂暴扫射",
    trigger: "combat_active",
    cooldownTicks: 40 * 20,
    durationTicks: 3 * 20,
    armorPenetration: 0.30,
    desc: "开启重装狂暴扫射持续3秒，附带30%高额穿甲"
   },
   {
    id: "grenade_shot",
    name: "高爆战术榴弹",
    trigger: "combat_target",
    cooldownTicks: 40 * 20,
    burstDamage: 45,
    desc: "向敌人目标区域发射高爆榴弹，造成45点大范围爆破破片伤害"
   }
  ]
 },
 // 7. 攻击型 - 典藏
 "aurora": {
  id: "aurora",
  name: "「极光天灾」典藏战术母机",
  entityType: "makercamp_dr:laser_drone",
  tier: DRONE_TIERS.LEGENDARY,
  armor: DRONE_ARMOR_BY_TIER.LEGENDARY,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.LEGENDARY,
  maxDurability: 5000,
  baseHp: 150,
  baseDamage: 13.5,
  fireIntervalTicks: 8, // 极速射击
  fireType: "incendiary", // 灼烧子弹 (不破坏/不点燃方块)
  autoRevive: true,
  skills: [
   {
    id: "overclock_berserk",
    name: "天灾狂暴扫射",
    trigger: "combat_active",
    cooldownTicks: 40 * 20,
    durationTicks: 3 * 20,
    armorPenetration: 0.30,
    desc: "开启天灾狂暴扫射持续3秒，附带30%高额穿甲"
   },
   {
    id: "micro_missiles",
    name: "微型制导飞弹",
    trigger: "combat_target",
    cooldownTicks: 50 * 20,
    burstDamage: 50,
    desc: "锁定小范围内多个敌人发射必中制导飞弹，造成50点巨额爆发伤害"
   },
   {
    id: "drone_jamming",
    name: "抗干扰与电磁干扰弹",
    trigger: "pvp_jam",
    cooldownTicks: 100 * 20,
    desc: "自身免疫一切电子干扰，且可发射EMP干扰敌方玩家无人机致其炸机"
   }
  ]
 },
 // 8. 自爆型 - 低级
 "kamikaze": {
  id: "kamikaze",
  name: "「神风」巡飞自爆机",
  entityType: "makercamp_dr:tnt_launcher_drone",
  tier: DRONE_TIERS.RARE,
  armor: DRONE_ARMOR_BY_TIER.RARE,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.RARE,
  maxDurability: 2500,
  baseHp: 70,
  baseDamage: 10.5,
  fireIntervalTicks: 16,
  autoRevive: false,
  skills: [
   {
    id: "blast_rush",
    name: "殉爆突击",
    trigger: "owner_low_hp_or_dying",
    threshold: 0.25,
    cooldownTicks: 40 * 20,
    burstDamage: 60,
    desc: "主人生命危急或机体濒临损毁时冲入敌阵剧烈自爆，造成60点范围伤害(耐久消耗减半)"
   }
  ]
 },
 // 9. 自爆型 - 高级
 "reaper": {
  id: "reaper",
  name: "「死神」腐蚀自爆机",
  entityType: "makercamp_dr:poison_drone",
  tier: DRONE_TIERS.EPIC,
  armor: DRONE_ARMOR_BY_TIER.EPIC,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.EPIC,
  maxDurability: 3500,
  baseHp: 95,
  baseDamage: 12,
  fireIntervalTicks: 16,
  autoRevive: true,
  skills: [
   {
    id: "toxic_blast",
    name: "剧毒死神殉爆",
    trigger: "owner_low_hp_or_dying",
    threshold: 0.25,
    cooldownTicks: 40 * 20,
    burstDamage: 80,
    desc: "冲入敌群殉爆造成80点范围伤害，并在原地留下持续剧毒腐蚀减速力场"
   },
   {
    id: "poison_shots",
    name: "腐蚀毒液连射",
    trigger: "combat_target",
    cooldownTicks: 40 * 20,
    desc: "发射高浓度毒液酸弹，使目标陷入持续虚弱与减速控制"
   }
  ]
 },
 // 10. 负重型
 "camel": {
  id: "camel",
  name: "「骆驼」重载货运机",
  entityType: "makercamp_dr:inventory_drone",
  tier: DRONE_TIERS.COMMON,
  armor: DRONE_ARMOR_BY_TIER.COMMON,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.COMMON,
  maxDurability: 2000,
  baseHp: 80,
  baseDamage: 7.5,
  fireIntervalTicks: 16,
  autoRevive: false,
  skills: [
   {
    id: "cloud_trunk",
    name: "便携机载货仓",
    trigger: "inventory",
    desc: "靠近右键或在终端中可随时打开飞行保险箱，随时存取物资"
   }
  ]
 },
 // 11. 辅助型 - 高级
 "gale": {
  id: "gale",
  name: "「疾风」战术增幅机",
  entityType: "makercamp_dr:race_drone",
  tier: DRONE_TIERS.EPIC,
  armor: DRONE_ARMOR_BY_TIER.EPIC,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.EPIC,
  maxDurability: 3500,
  baseHp: 90,
  baseDamage: 9,
  fireIntervalTicks: 16,
  autoRevive: true,
  skills: [
   {
    id: "gale_buff",
    name: "战术战意注入",
    trigger: "combat_active",
    cooldownTicks: 60 * 20,
    durationTicks: 8 * 20,
    desc: "注入战术战意：提高主人20%伤害与暴击率，并赋予2颗额外黄金吸收心(持续8秒)"
   },
   {
    id: "emp_jam",
    name: "电子干扰弹",
    trigger: "pvp_jam",
    cooldownTicks: 120 * 20,
    desc: "对敌对玩家无人机发射EMP干扰弹致其直接炸机"
   }
  ]
 },
 // 12. 辅助型 - 典藏
 "abyssal": {
  id: "abyssal",
  name: "「深渊主宰」典藏战术矩阵",
  entityType: "makercamp_dr:water_drone",
  tier: DRONE_TIERS.LEGENDARY,
  armor: DRONE_ARMOR_BY_TIER.LEGENDARY,
  blastReduction: DRONE_BLAST_REDUCTION_BY_TIER.LEGENDARY,
  maxDurability: 5000,
  baseHp: 150,
  baseDamage: 12,
  fireIntervalTicks: 15,
  autoRevive: true,
  skills: [
   {
    id: "abyssal_matrix",
    name: "终极超频矩阵",
    trigger: "combat_active",
    cooldownTicks: 60 * 20,
    durationTicks: 10 * 20,
    desc: "开启终极矩阵：大幅提升主人35%伤害与暴击率，力量II、速度II并赋予2颗额外心(持续10秒)"
   },
   {
    id: "emp_shield_jam",
    name: "抗干扰与EMP电子干扰弹",
    trigger: "pvp_jam",
    cooldownTicks: 100 * 20,
    desc: "自身抗一切干扰，并对敌对无人机发射毁灭性干扰弹使其炸机"
   },
   {
    id: "abyssal_heal",
    name: "深渊复原协议",
    trigger: "owner_low_hp",
    threshold: 0.30,
    cooldownTicks: 60 * 20,
    desc: "主人残血时触发：高级瞬间恢复10点生命+强效持续治疗"
   }
  ]
 }
};
