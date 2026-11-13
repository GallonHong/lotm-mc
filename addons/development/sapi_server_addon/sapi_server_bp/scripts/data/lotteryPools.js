export const LOTTERY_RARITIES = Object.freeze({
 common: { name: "§8普通", color: "§8", broadcast: false },
 rare: { name: "§9稀有", color: "§9", broadcast: false },
 epic: { name: "§5史诗", color: "§5", broadcast: true },
 legendary: { name: "§6传说", color: "§6", broadcast: true },
 mythic: { name: "§l§c神话限定", color: "§c", broadcast: true },
});

export const LEGENDARY_FEATURED_CANDIDATES = Object.freeze([
 { key: "legendary_mp7", id: "test_gun:blueprint_mp7", amount: 1, name: "§6HK MP7 暴走狂潮核心设计图", rarity: "legendary" },
 { key: "legendary_mgl", id: "test_gun:blueprint_mgl", amount: 1, name: "§6MGL 自动榴弹炮核心设计图", rarity: "legendary" },
 { key: "legendary_arc", id: "test_gun:blueprint_arc", amount: 1, name: "§6特斯拉高能电弧风暴核心图纸", rarity: "legendary" },
 { key: "legendary_jetpack", id: "test_gun:blueprint_jetpack", amount: 1, name: "§6战术离子喷气背包结构图", rarity: "legendary" },
 { key: "legendary_commander", id: "test_gun:blueprint_ak47_commander", amount: 1, name: "§6AK-47 战术指挥官设计图", rarity: "legendary" },
]);

const LIMITED_EPIC_BLUEPRINTS = [
 { key: "epic_pkm", id: "test_gun:blueprint_pkm", amount: 1, name: "§5PKM 烈焰重机枪设计图", weight: 1, rarity: "epic", isPityTarget: true },
 { key: "epic_usas12", id: "test_gun:blueprint_usas12", amount: 1, name: "§5USAS-12 嗜血狂潮设计图", weight: 1, rarity: "epic", isPityTarget: true },
 { key: "epic_m1014_ward", id: "test_gun:blueprint_m1014_ward", amount: 1, name: "§5M1014 泰坦壁垒设计图", weight: 1, rarity: "epic", isPityTarget: true },
 { key: "epic_flash_shield", id: "test_gun:blueprint_flash_shield", amount: 1, name: "§5G52 战术闪光盾图纸", weight: 1, rarity: "epic", isPityTarget: true },
 { key: "epic_titan", id: "test_gun:blueprint_titan_chest", amount: 1, name: "§5泰坦动力外骨骼装甲蓝图", weight: 1, rarity: "epic", isPityTarget: true },
 { key: "epic_carbon_spider_bow", id: "test_gun:blueprint_carbon_spider_bow", amount: 1, name: "§5碳素蛛弓设计图", weight: 1, rarity: "epic", isPityTarget: true },
];

const STANDARD_LOTTERY_POOLS = [
 {
  id: "epic_armory",
  name: "§5高级军备箱",
  icon: "textures/items/amethyst_shard",
  description: "完整限定 Epic 蓝图合计 5%；第 20 抽必出随机限定 Epic 蓝图。",
  singleCost: 1200,
  tenCost: 12000,
  pityThreshold: 20,
  pityMode: "random_target",
  items: [
   // Keep the existing combined 5% blueprint weight, shared equally.
   ...LIMITED_EPIC_BLUEPRINTS.map(item => ({ ...item, weight: 5 / LIMITED_EPIC_BLUEPRINTS.length })),
   { id: "test_gun:part_heavy_barrel", amount: 1, name: "重型加固合金枪管", weight: 3, rarity: "rare" },
   { id: "test_gun:part_ceramic_plate", amount: 1, name: "复合陶瓷插板", weight: 3, rarity: "rare" },
   { id: "test_gun:part_kevlar_sheet", amount: 2, name: "军规凯夫拉", weight: 3, rarity: "rare" },
   { id: "test_gun:part_plasma_core", amount: 1, name: "特殊等离子核心", weight: 3, rarity: "rare" },
   { id: "test_gun:part_barrel", amount: 2, name: "枪管 x2", weight: 5, rarity: "common" },
   { id: "test_gun:part_receiver", amount: 2, name: "机匣 x2", weight: 5, rarity: "common" },
   { id: "test_gun:part_stock", amount: 2, name: "枪托 x2", weight: 5, rarity: "common" },
   { id: "test_gun:part_drum_mag", amount: 1, name: "弹鼓", weight: 4, rarity: "common" },
   { id: "test_gun:part_shield_frame", amount: 1, name: "盾牌框架", weight: 4, rarity: "common" },
   { id: "test_gun:ammo_rifle", amount: 30, name: "步枪弹药包 x30", weight: 5, rarity: "common" },
   { id: "test_gun:ammo_45acp", amount: 50, name: "冲锋枪弹药包 x50", weight: 5, rarity: "common" },
   { id: "test_gun:ammo_shotgun", amount: 12, name: "霰弹药包 x12", weight: 5, rarity: "common" },
   { id: "test_gun:ammo_50cal", amount: 10, name: ".50 弹药包 x10", weight: 5, rarity: "rare" },
   { id: "test_gun:ammo_battery", amount: 20, name: "能量电池 x20", weight: 5, rarity: "rare" },
   { id: "minecraft:iron_ingot", amount: 12, name: "铁锭 x12", weight: 2, rarity: "common" },
   { id: "minecraft:gold_ingot", amount: 6, name: "金锭 x6", weight: 2, rarity: "common" },
   { id: "minecraft:copper_ingot", amount: 16, name: "铜锭 x16", weight: 2, rarity: "common" },
   { id: "minecraft:redstone", amount: 16, name: "红石 x16", weight: 2, rarity: "common" },
   { id: "minecraft:emerald", amount: 6, name: "绿宝石 x6", weight: 2, rarity: "rare" },
   { id: "minecraft:diamond", amount: 2, name: "钻石 x2", weight: 2, rarity: "rare" },
   { id: "minecraft:amethyst_shard", amount: 12, name: "紫水晶碎片 x12", weight: 2, rarity: "rare" },
   { id: "minecraft:obsidian", amount: 8, name: "黑曜石 x8", weight: 2, rarity: "rare" },
   { id: "minecraft:blaze_rod", amount: 4, name: "烈焰棒 x4", weight: 2, rarity: "rare" },
   { id: "minecraft:ender_pearl", amount: 4, name: "末影珍珠 x4", weight: 2, rarity: "rare" },
   { id: "test_gun:blueprint_scarh", amount: 1, name: "SCAR-H Rare 蓝图", weight: 1, rarity: "rare" },
   { id: "test_gun:blueprint_svd", amount: 1, name: "SVD Rare 蓝图", weight: 1, rarity: "rare" },
   { id: "test_gun:blueprint_p90", amount: 1, name: "P90 Rare 蓝图", weight: 1, rarity: "rare" },
   { id: "test_gun:blueprint_m1014", amount: 1, name: "M1014 Rare 蓝图", weight: 1, rarity: "rare" },
   { id: "test_gun:blueprint_arx", amount: 1, name: "ARX Rare 蓝图", weight: 1, rarity: "rare" },
   { id: "survival_vehicle:vehicle_engine", amount: 1, name: "载具引擎", weight: 2, rarity: "rare" },
   { id: "survival_vehicle:vehicle_battery", amount: 1, name: "载具电池", weight: 2, rarity: "rare" },
   { id: "survival_vehicle:vehicle_tire", amount: 2, name: "载具轮胎 x2", weight: 2, rarity: "rare" },
   { id: "survival_vehicle:scrap_metal", amount: 4, name: "高级载具金属 x4", weight: 2, rarity: "rare" },
   { id: "daily:mythic_supply_key", amount: 1, name: "§d神话补给密钥", weight: 2, rarity: "epic" },
  ],
 },
 {
  id: "legendary_featured",
  name: "§6限定军备箱·第一期",
  icon: "textures/items/nether_star",
  description: "当期 Legendary 蓝图基础概率 2%；第 30 抽必出当前 UP 蓝图。",
  singleCost: 2000,
  tenCost: 20000,
  pityThreshold: 30,
  pityMode: "featured",
  featuredWeight: 2,
  defaultFeaturedKey: "legendary_mp7",
  featuredCandidates: LEGENDARY_FEATURED_CANDIDATES,
  items: [
   { id: "test_gun:blueprint_pkm", amount: 1, name: "PKM 限定 Epic 蓝图", weight: 2, rarity: "epic" },
   { id: "test_gun:blueprint_usas12", amount: 1, name: "USAS-12 限定 Epic 蓝图", weight: 2, rarity: "epic" },
   { id: "test_gun:blueprint_m1014_ward", amount: 1, name: "M1014 泰坦壁垒限定 Epic 蓝图", weight: 2, rarity: "epic" },
   { id: "test_gun:blueprint_flash_shield", amount: 1, name: "G52 限定 Epic 蓝图", weight: 1, rarity: "epic" },
   { id: "test_gun:blueprint_titan_chest", amount: 1, name: "泰坦外骨骼限定 Epic 蓝图", weight: 1, rarity: "epic" },
   { id: "test_gun:part_plasma_core", amount: 1, name: "等离子核心", weight: 3, rarity: "epic" },
   { id: "test_gun:part_exo_core", amount: 1, name: "外骨骼核心", weight: 3, rarity: "epic" },
   { id: "test_gun:part_ion_thruster", amount: 1, name: "离子推进器", weight: 3, rarity: "epic" },
   { id: "test_gun:part_deflection_generator", amount: 1, name: "偏转发生器", weight: 3, rarity: "epic" },
   { id: "daily:mythic_supply_key", amount: 1, name: "§d神话补给密钥", weight: 3, rarity: "epic" },
   { id: "test_gun:part_heavy_barrel", amount: 2, name: "重型枪管 x2", weight: 4, rarity: "rare" },
   { id: "test_gun:part_ceramic_plate", amount: 2, name: "陶瓷插板 x2", weight: 4, rarity: "rare" },
   { id: "test_gun:part_kevlar_sheet", amount: 3, name: "军规凯夫拉 x3", weight: 4, rarity: "rare" },
   { id: "test_gun:part_military_fcu", amount: 1, name: "军规火控单元", weight: 4, rarity: "epic" },
   { id: "test_gun:part_tungsten_bolt", amount: 1, name: "钨合金枪机", weight: 4, rarity: "epic" },
   { id: "test_gun:ammo_belt_100", amount: 2, name: "机枪弹链 x2", weight: 5, rarity: "rare" },
   { id: "test_gun:ammo_50cal", amount: 20, name: ".50 弹药 x20", weight: 5, rarity: "rare" },
   { id: "test_gun:ammo_battery", amount: 32, name: "能量电池 x32", weight: 5, rarity: "rare" },
   { id: "test_gun:ammo_40mm", amount: 8, name: "40mm 榴弹 x8", weight: 5, rarity: "epic" },
   { id: "minecraft:iron_block", amount: 3, name: "铁块 x3", weight: 4, rarity: "rare" },
   { id: "minecraft:diamond", amount: 5, name: "钻石 x5", weight: 4, rarity: "rare" },
   { id: "minecraft:emerald_block", amount: 2, name: "绿宝石块 x2", weight: 4, rarity: "rare" },
   { id: "minecraft:netherite_scrap", amount: 2, name: "下界合金碎片 x2", weight: 4, rarity: "epic" },
   { id: "minecraft:amethyst_shard", amount: 24, name: "紫水晶碎片 x24", weight: 4, rarity: "rare" },
   { id: "survival_vehicle:vehicle_engine", amount: 2, name: "高级载具引擎 x2", weight: 2, rarity: "epic" },
   { id: "survival_vehicle:vehicle_battery", amount: 2, name: "高级载具电池 x2", weight: 2, rarity: "epic" },
   { id: "survival_vehicle:vehicle_chassis", amount: 1, name: "载具底盘", weight: 2, rarity: "epic" },
   { id: "survival_vehicle:heli_rotor", amount: 1, name: "直升机旋翼", weight: 2, rarity: "epic" },
   { id: "survival_vehicle:medical_box_module", amount: 1, name: "医疗舱模块", weight: 2, rarity: "epic" },
   { id: "test_gun:blueprint_scarh", amount: 1, name: "SCAR-H Rare 蓝图", weight: 1, rarity: "rare" },
   { id: "test_gun:blueprint_svd", amount: 1, name: "SVD Rare 蓝图", weight: 1, rarity: "rare" },
   { id: "test_gun:blueprint_p90", amount: 1, name: "P90 Rare 蓝图", weight: 1, rarity: "rare" },
   { id: "test_gun:blueprint_m1014", amount: 1, name: "M1014 Rare 蓝图", weight: 1, rarity: "rare" },
   { id: "test_gun:blueprint_arx", amount: 1, name: "ARX Rare 蓝图", weight: 1, rarity: "rare" },
  ],
 },
];

// 独立常驻裂轨奖池：不占用旧传说 UP，不进入其他补给/商店奖励来源。
export const LIEGUI_LOTTERY_POOL = Object.freeze({
 id: "legendary_liegui",
 name: "§6限定军备箱·裂轨",
 icon: "textures/items/nether_star",
 description: "裂轨传说蓝图仅限本池抽奖获得，基础概率 2%；最多 30 抽必出，抽中后保底重置。",
 singleCost: 2000,
 tenCost: 20000,
 pityThreshold: 30,
 pityPrizeKey: "legendary_liegui_blueprint",
 items: [
  { key: "legendary_liegui_blueprint", id: "test_gun:blueprint_liegui", amount: 1, name: "§6裂轨设计图 [传说]", weight: 2, rarity: "legendary", isPityTarget: true },
  // 将旧池的 13 权重载具/日常联动奖励换成原版材料，避免缺少那些包时概率被重算。
  ...STANDARD_LOTTERY_POOLS.find(pool => pool.id === "legendary_featured").items
   .filter(item => item.id.startsWith("minecraft:") || item.id.startsWith("test_gun:")),
  { id: "minecraft:copper_block", amount: 8, name: "铜块 x8", weight: 13, rarity: "rare" },
 ],
});

// 百战沿用裂轨的独立传说奖池规则，不改变已有奖池或 UP 候选。
export const BAIZHAN_LOTTERY_POOL = Object.freeze({
 ...LIEGUI_LOTTERY_POOL,
 id: "legendary_baizhan",
 name: "§6限定军备箱·百战",
 description: "百战传说蓝图仅限本池抽奖获得，基础概率 2%；最多 30 抽必出，抽中后保底重置。",
 pityPrizeKey: "legendary_baizhan_blueprint",
 items: [
  { key: "legendary_baizhan_blueprint", id: "test_gun:blueprint_baizhan", amount: 1, name: "§6百战设计图 [传说]", weight: 2, rarity: "legendary", isPityTarget: true },
  ...LIEGUI_LOTTERY_POOL.items.filter(item => item.key !== LIEGUI_LOTTERY_POOL.pityPrizeKey),
 ],
});

export const BUILT_IN_LOTTERY_POOLS = Object.freeze([...STANDARD_LOTTERY_POOLS, LIEGUI_LOTTERY_POOL, BAIZHAN_LOTTERY_POOL]);

// 战术无人机限定奖池定义 (默认未开启，需管理员在控制台手动开)
export const DRONE_EPIC_LIMITED_POOL = Object.freeze({
 id: "drone_epic_limited",
 name: "§5限定军备·高级战术无人机",
 icon: "textures/drones/items/healing_drone",
 description: "高级战术无人机限定卡池：守护天使、毁灭者、死神；第 20 抽必出随机高级无人机蓝图。",
 singleCost: 1500,
 tenCost: 15000,
 pityThreshold: 20,
 pityMode: "random_target",
 items: [
  { key: "epic_guardian_angel", id: "ab_dr:blueprint_guardian_angel", amount: 1, name: "§5「守护天使」特战医疗机蓝图", weight: 1, rarity: "epic", isPityTarget: true },
  { key: "epic_destroyer", id: "ab_dr:blueprint_destroyer", amount: 1, name: "§5「毁灭者」重装突击机蓝图", weight: 1, rarity: "epic", isPityTarget: true },
  { key: "epic_reaper", id: "ab_dr:blueprint_reaper", amount: 1, name: "§5「死神」腐蚀自爆机蓝图", weight: 1, rarity: "epic", isPityTarget: true },
  { id: "ab_dr:chip_t2", amount: 1, name: "T2 高级火控芯片", weight: 4, rarity: "rare" },
  { id: "ab_dr:chip_t1", amount: 2, name: "T1 基础火控芯片 x2", weight: 5, rarity: "rare" },
  { id: "ab_dr:battery", amount: 2, name: "无人机高能锂电池 x2", weight: 6, rarity: "common" },
  { id: "ab_dr:rotor_motor", amount: 2, name: "高转速旋翼电机 x2", weight: 6, rarity: "common" },
  { id: "ab_dr:frame", amount: 1, name: "无人机碳纤维机架", weight: 5, rarity: "common" },
  { id: "minecraft:iron_block", amount: 2, name: "铁块 x2", weight: 4, rarity: "common" },
  { id: "minecraft:gold_block", amount: 2, name: "金块 x2", weight: 3, rarity: "common" },
  { id: "minecraft:diamond", amount: 3, name: "钻石 x3", weight: 3, rarity: "rare" },
  { id: "minecraft:amethyst_shard", amount: 12, name: "紫水晶碎片 x12", weight: 4, rarity: "rare" },
  { id: "daily:mythic_supply_key", amount: 1, name: "§d神话补给密钥", weight: 2, rarity: "epic" }
 ]
});

export const DRONE_LEGENDARY_FEATURED_CANDIDATES = Object.freeze([
 { key: "drone_aurora", id: "ab_dr:blueprint_aurora", amount: 1, name: "§6「极光天灾」典藏战术母机蓝图", rarity: "legendary" },
 { key: "drone_abyssal", id: "ab_dr:blueprint_abyssal", amount: 1, name: "§6「深渊主宰」典藏战术矩阵蓝图", rarity: "legendary" }
]);

export const DRONE_LEGENDARY_LIMITED_POOL = Object.freeze({
 id: "drone_legendary_limited",
 name: "§6限定军备·典藏战术母机",
 icon: "textures/drones/items/laser_drone",
 description: "限定典藏战术母机蓝图；第 30 抽必出当期 UP 典藏无人机蓝图。",
 singleCost: 2500,
 tenCost: 25000,
 pityThreshold: 30,
 pityMode: "featured",
 featuredWeight: 2,
 defaultFeaturedKey: "drone_aurora",
 featuredCandidates: DRONE_LEGENDARY_FEATURED_CANDIDATES,
 items: [
  { id: "ab_dr:blueprint_guardian_angel", amount: 1, name: "「守护天使」特战医疗机蓝图", weight: 1, rarity: "epic" },
  { id: "ab_dr:blueprint_destroyer", amount: 1, name: "「毁灭者」重装突击机蓝图", weight: 1, rarity: "epic" },
  { id: "ab_dr:blueprint_reaper", amount: 1, name: "「死神」腐蚀自爆机蓝图", weight: 1, rarity: "epic" },
  { id: "ab_dr:chip_t3", amount: 1, name: "T3 典藏矩阵芯片", weight: 3, rarity: "epic" },
  { id: "ab_dr:chip_t2", amount: 2, name: "T2 高级火控芯片 x2", weight: 5, rarity: "rare" },
  { id: "ab_dr:battery", amount: 4, name: "无人机高能锂电池 x4", weight: 6, rarity: "rare" },
  { id: "ab_dr:frame", amount: 2, name: "无人机碳纤维机架 x2", weight: 6, rarity: "common" },
  { id: "ab_dr:rotor_motor", amount: 4, name: "高转速旋翼电机 x4", weight: 6, rarity: "common" },
  { id: "minecraft:netherite_scrap", amount: 2, name: "下界合金碎片 x2", weight: 3, rarity: "epic" },
  { id: "minecraft:diamond", amount: 6, name: "钻石 x6", weight: 4, rarity: "rare" },
  { id: "minecraft:emerald_block", amount: 3, name: "绿宝石块 x3", weight: 4, rarity: "rare" },
  { id: "daily:mythic_supply_key", amount: 2, name: "§d神话补给密钥 x2", weight: 3, rarity: "epic" }
 ]
});
