/**
 * 副本坐标均相对实例槽位。DeadZone 与 RandS 结构在导入时已经移除
 * 自带实体、刷怪笼和外部自定义方块；怪物、物资箱和剧情由脚本统一管理。
 */
const dz = (asset, id, x, z, sx, sy, sz) => ({ id, structureId: `daily_dungeon:imports/deadzone/${asset}`, offset: { x, y: 0, z }, size: { x: sx, y: sy, z: sz } });
const rs = (asset, id, x, z, sx = 16, sy = 7, sz = 16, y = 0) => ({ id, structureId: `daily_dungeon:imports/rands/${asset}`, offset: { x, y, z }, size: { x: sx, y: sy, z: sz } });
const sp = (id, x, z, y = 1) => ({ id, offset: { x, y, z } });
const cp = (id, name, x, z, radius = 5, y = 1) => ({ id, name, offset: { x, y, z }, radius });
const rules = {
  dimension: "minecraft:overworld", structureLoadDelayTicks: 5,
  maxPlayers: 4, maxDeathsPerPlayer: 2, joinWindowTicks: 3600,
  timeoutTicks: 30000, abandonTicks: 900, spawnConfirmTicks: 60
};

export const DUNGEON_TEMPLATES = Object.freeze({
  newcomer_valley: {
    ...rules,
    id: "newcomer_valley", name: "曙光谷·第一次撤离", category: "tutorial",
    difficulty: "教学", recommendedPlayers: "1 人",
    description: "原创单人新手剧情：车队坠毁后，在林岚的无线电引导下学习蓝图、枪械、载具、物资箱、灾害与摸金撤离。",
    structureSize: { x: 96, y: 28, z: 106 },
    arenaBounds: { min: { x: -2, y: -4, z: -2 }, max: { x: 98, y: 34, z: 108 } },
    platform: { min: { x: -1, z: -1 }, max: { x: 96, z: 106 }, block: "minecraft:stone_bricks" },
    entryOffset: { x: 7.5, y: 1, z: 7.5 },
    structures: [
      dz("clinic", "clinic", 3, 3, 18, 10, 15), rs("road1", "road1", 24, 3),
      rs("house1", "house1", 43, 3, 16, 16, 16), rs("road2", "road2", 24, 19),
      dz("gas_station", "gas_station", 43, 21, 31, 20, 36), rs("cross1", "cross1", 24, 35),
      dz("garage_0", "garage", 2, 38, 21, 6, 14), rs("road3", "road3", 24, 51),
      rs("house2", "house2", 2, 57, 16, 16, 16), rs("road4", "road4", 24, 67),
      dz("radio_tower", "radio_tower", 46, 72, 18, 25, 12), rs("corner1", "corner1", 24, 83),
      rs("streetlights", "streetlights", 41, 36, 1, 8, 9), rs("cars1", "cars", 29, 48, 7, 4, 3, 1)
    ],
    spawnPoints: [sp("clinic", 14, 11), sp("road", 31, 28), sp("station", 55, 45), sp("garage", 11, 44), sp("defense_center", 31, 74), sp("horde_left", 24, 68), sp("horde_right", 38, 68), sp("tower", 55, 78), sp("final", 31, 91)],
    checkpoints: [
      cp("workbench", "废弃工坊", 31, 28), cp("crate", "公路物资箱", 31, 42), cp("garage", "车库", 12, 46),
      cp("drive_1", "坠毁路口", 31, 58, 6), cp("drive_2", "加油站外沿", 31, 74, 6),
      cp("tower", "撤离电台", 55, 78, 6), cp("evac", "曙光谷撤离点", 31, 91, 6)
    ],
    stages: [
      { type: "briefing", name: "坠毁后的无线电", durationTicks: 100, messages: [
        "§7转运车队在曙光谷入口失联。你从翻覆的医疗车里醒来，远处传来感染者的吼声。",
        "§b林岚：§f‘听得到吗？沿路找工坊。枪不是捡来就能造——每种枪都需要对应蓝图。’"
      ] },
      { type: "checkpoint", name: "前往废弃工坊", checkpoint: "workbench", hint: "沿 RandS 街道前往工坊，寻找验证过的普通枪械蓝图。" },
      { type: "briefing", name: "蓝图与普通枪械", durationTicks: 120, loadout: [
        { id: "test_gun:ak74u", amount: 1, name: "§f教学用 AK74U [普通]§r" }, { id: "test_gun:ammo_rifle", amount: 64, name: "§7教学步枪弹§r" }
      ], messages: [
        "§b林岚：§f‘这是普通品质 AK74U，只用于教学。电脑版右键、手机版长按使用键射击。’",
        "§7品质主要影响耐久、操控和特殊能力；弹药不通用，AK74U 使用步枪弹。蓝图是正式合成枪械的前提。"
      ] },
      { type: "eliminate", name: "第一次射击", groups: [{ mobKey: "basic", count: 3, spawnPoint: "road" }] },
      { type: "checkpoint", name: "检查公路补给", checkpoint: "crate", hint: "前往公路物资箱位置。" },
      { type: "interact", name: "开启普通物资箱", checkpoint: "crate", crateTier: "common", hint: "点击脚下生成的普通物资箱；每名玩家奖励独立结算。" },
      { type: "checkpoint", name: "抵达车库", checkpoint: "garage", hint: "到车库寻找还能启动的载具。" },
      { type: "route", name: "载具转移", route: ["drive_1", "drive_2"], vehicleId: "ab_ve:motorcycle", vehicleSpawnPoint: "garage", hint: "驾驶生存摩托依次通过两个标记；未安装载具包时可步行完成。" },
      { type: "defend", name: "最低强度尸潮", durationTicks: 360, defensePoint: "defense_center", defenseLeashRadius: 24, waves: [
        { atTicks: 0, groups: [{ mobKey: "basic", count: 3, spawnPoint: "horde_left" }] },
        { atTicks: 140, groups: [{ mobKey: "basic", count: 4, spawnPoint: "horde_right" }, { mobKey: "runner", count: 1, spawnPoint: "horde_left" }] }
      ] },
      { type: "disaster", name: "电磁风暴避险", disasterId: "lightning", difficulty: 0, durationTicks: 300, messages: ["§d林岚：§f‘自然灾害会随机发生。雷暴来临时远离高处和开阔地，寻找实体屋顶。’"] },
      { type: "checkpoint", name: "启动撤离电台", checkpoint: "tower", hint: "到电台发出撤离信号。" },
      { type: "briefing", name: "摸金模式说明", durationTicks: 140, messages: [
        "§6林岚：§f‘摸金都市可随时进入：随机出生、搜刮不同品质箱子，再按左上角定时导航与绿色光柱前往撤离点。’",
        "§7摸金都市死亡会损失非保险物资；撤离成功才把战利品安全带回。副本按各自规则结算。"
      ] },
      { type: "checkpoint", name: "完成第一次撤离", checkpoint: "evac", hint: "前往最后的道路撤离标记。" }
    ],
    rewardId: "dungeon_newcomer_valley", oneTimeReward: true,
    completionKey: "daily:tutorial:newcomer_valley:v1", minimumContribution: 8,
    maxPlayers: 1, maxDeathsPerPlayer: 5
  },

  outpost_defense: {
    ...rules,
    id: "outpost_defense", name: "灰港防线·最后一夜", category: "defense",
    difficulty: "普通", recommendedPlayers: "1–4 人",
    description: "利用警局、施工区与工业厂房组成的防线，抵御四波感染者并守住无线电中继器。",
    structureSize: { x: 112, y: 30, z: 108 },
    arenaBounds: { min: { x: -2, y: -4, z: -2 }, max: { x: 114, y: 36, z: 110 } },
    platform: { min: { x: -1, z: -1 }, max: { x: 112, z: 108 }, block: "minecraft:deepslate_tiles" },
    entryOffset: { x: 32, y: 1, z: 12 },
    structures: [
      dz("police_station", "police", 20, 4, 16, 15, 16), rs("road1", "road1", 40, 4),
      dz("industrial_0_1", "factory", 60, 3, 33, 25, 19), rs("cross4", "cross4", 40, 20),
      dz("construction_0", "construction", 17, 31, 19, 15, 19), rs("road2", "road2", 40, 36),
      rs("house3", "house3", 61, 31, 16, 16, 16), rs("road3", "road3", 40, 52),
      dz("garage_0", "garage", 15, 63, 21, 6, 14), rs("house4", "house4", 61, 55, 16, 16, 16),
      rs("road4", "road4", 40, 68), dz("radio_tower", "radio", 65, 77, 18, 25, 12),
      rs("cars2", "cars", 45, 48, 7, 4, 3, 1)
    ],
    spawnPoints: [sp("defense_center", 72, 82), sp("north", 72, 69), sp("east", 84, 82), sp("west", 60, 82), sp("south", 72, 95), sp("boss", 72, 73)],
    checkpoints: [cp("relay", "防线中继器", 72, 82, 7), cp("exit", "灰港撤离门", 47, 91, 7)],
    stages: [
      { type: "briefing", name: "接管灰港防线", durationTicks: 80, messages: ["§b守备队：§f‘电网只剩最后一组电池。守住中继器，天亮前不能让感染者越线。’"] },
      { type: "checkpoint", name: "启动中继器", checkpoint: "relay", hint: "穿过警局和施工区，到无线电塔下启动中继器。" },
      { type: "defend", name: "北侧缺口", durationTicks: 420, defensePoint: "defense_center", defenseLeashRadius: 28, waves: [
        { atTicks: 0, groups: [{ mobKey: "basic", count: 5, spawnPoint: "north" }] },
        { atTicks: 120, groups: [{ mobKey: "runner", count: 3, spawnPoint: "east" }] },
        { atTicks: 240, groups: [{ mobKey: "basic", count: 5, spawnPoint: "west" }, { mobKey: "spitter", count: 1, spawnPoint: "south" }] }
      ] },
      { type: "defend", name: "最后尸潮", durationTicks: 480, defensePoint: "defense_center", defenseLeashRadius: 28, waves: [
        { atTicks: 0, groups: [{ mobKey: "basic", count: 6, spawnPoint: "south" }, { mobKey: "runner", count: 2, spawnPoint: "east" }] },
        { atTicks: 180, groups: [{ mobKey: "charger", count: 1, spawnPoint: "north" }, { mobKey: "spitter", count: 2, spawnPoint: "west" }] },
        { atTicks: 320, groups: [{ mobKey: "heavy", count: 1, spawnPoint: "boss" }] }
      ] },
      { type: "checkpoint", name: "防线撤离", checkpoint: "exit", hint: "防线已稳定，前往南侧撤离门。" }
    ],
    rewardId: "dungeon_outpost_defense", minimumContribution: 12
  },

  storm_rescue: {
    ...rules,
    id: "storm_rescue", name: "黑雨医院·营救计划", category: "rescue",
    difficulty: "困难", recommendedPlayers: "2–4 人",
    description: "穿越医院、超市和居民区找到医生，沿人工路径护送撤离；途中包含伏击、雷暴与暴君 Boss。",
    structureSize: { x: 126, y: 32, z: 118 },
    arenaBounds: { min: { x: -2, y: -4, z: -2 }, max: { x: 128, y: 38, z: 120 } },
    platform: { min: { x: -1, z: -1 }, max: { x: 126, z: 118 }, block: "minecraft:stone_bricks" },
    entryOffset: { x: 8, y: 1, z: 8 },
    structures: [
      dz("hospital", "hospital", 3, 3, 29, 25, 42), rs("road1", "road1", 35, 3),
      dz("supermarket_0", "market", 55, 3, 30, 20, 33), rs("road2", "road2", 35, 19),
      rs("house5", "house5", 88, 3, 16, 16, 16), rs("cross1", "cross1", 35, 35),
      dz("construction_0", "construction", 56, 40, 19, 15, 19), rs("house10", "house10", 88, 25, 16, 16, 16),
      rs("road3", "road3", 35, 51), rs("house11", "house11", 4, 55, 16, 19, 16),
      rs("corner2", "corner2", 35, 67), dz("radio_tower", "radio", 61, 71, 18, 25, 12),
      rs("road4", "road4", 35, 83), rs("streetlights", "lights", 52, 69, 1, 8, 9),
      rs("cars3", "cars", 40, 48, 7, 4, 3, 1)
    ],
    spawnPoints: [sp("ward", 16, 23), sp("market", 67, 22), sp("ambush", 43, 58), sp("storm", 43, 74), sp("boss", 43, 91)],
    checkpoints: [
      cp("ward", "医院隔离病房", 18, 30, 6), cp("route_1", "超市路口", 43, 43, 6),
      cp("route_2", "施工区", 43, 58, 6), cp("route_3", "黑雨街口", 43, 74, 6), cp("evac", "救援直升机信标", 69, 77, 7)
    ],
    stages: [
      { type: "briefing", name: "失联医生", durationTicks: 100, messages: ["§b联盟指挥部：§f‘黑雨医院的周医生掌握感染样本。进入隔离楼，找到他并沿东侧道路撤离。’"] },
      { type: "eliminate", name: "肃清医院", groups: [{ mobKey: "basic", count: 5, spawnPoint: "ward" }, { mobKey: "hunter", count: 1, spawnPoint: "ward" }] },
      { type: "checkpoint", name: "确认幸存者", checkpoint: "ward", hint: "在医院隔离病房确认周医生位置。" },
      { type: "route", name: "护送医生穿越街区", route: ["route_1", "route_2"], escortEntity: "daily:survivor", escortSpawnPoint: "ward", hint: "靠近医生才能让他移动；护送至超市路口与施工区。", routeWaves: [
        { routeIndex: 0, groups: [{ mobKey: "basic", count: 7, spawnPoint: "market" }, { mobKey: "runner", count: 3, spawnPoint: "ambush" }] },
        { routeIndex: 1, groups: [{ mobKey: "basic", count: 8, spawnPoint: "ambush" }, { mobKey: "spitter", count: 2, spawnPoint: "market" }, { mobKey: "hunter", count: 1, spawnPoint: "ambush" }] }
      ] },
      { type: "eliminate", name: "掠夺者阻击", groups: [{ mobKey: "raider", count: 3, spawnPoint: "ambush" }, { mobKey: "spitter", count: 1, spawnPoint: "market" }] },
      { type: "disaster", name: "黑雨雷暴", disasterId: "lightning", difficulty: 3, durationTicks: 420, messages: ["§d气象台：§f‘强雷暴覆盖撤离道路。利用建筑和车辆残骸掩护，等待最强放电过去。’"] },
      { type: "route", name: "穿越黑雨街口", route: ["route_3", "evac"], escortEntity: "daily:survivor", reuseEscort: true, hint: "继续护送医生到直升机信标。", routeWaves: [
        { routeIndex: 0, groups: [{ mobKey: "basic", count: 9, spawnPoint: "storm" }, { mobKey: "runner", count: 4, spawnPoint: "ambush" }] },
        { routeIndex: 1, groups: [{ mobKey: "basic", count: 9, spawnPoint: "boss" }, { mobKey: "runner", count: 4, spawnPoint: "storm" }, { mobKey: "charger", count: 1, spawnPoint: "boss" }] }
      ] },
      { type: "boss", name: "重装暴君", groups: [{ bossKey: "tyrant", count: 1, spawnPoint: "boss" }, { mobKey: "runner", count: 2, spawnPoint: "storm" }] }
    ],
    rewardId: "dungeon_storm_rescue", minimumContribution: 14, timeoutTicks: 36000
  },

  convoy_escort: {
    ...rules,
    id: "convoy_escort", name: "断桥公路·车队护送", category: "escort",
    difficulty: "进阶", recommendedPlayers: "2–4 人",
    description: "驾驶或跟随补给车穿越加油站、仓库与废弃住宅，清除路障并在终点完成防守。",
    structureSize: { x: 124, y: 28, z: 116 },
    arenaBounds: { min: { x: -2, y: -4, z: -2 }, max: { x: 126, y: 34, z: 118 } },
    platform: { min: { x: -1, z: -1 }, max: { x: 124, z: 116 }, block: "minecraft:stone" },
    entryOffset: { x: 12, y: 1, z: 12 },
    structures: [
      dz("gas_station", "gas", 2, 2, 31, 20, 36), rs("road1", "road1", 36, 2),
      dz("werehouse_0", "warehouse", 58, 2, 23, 15, 22), rs("road2", "road2", 36, 18),
      rs("house1c", "house1c", 84, 3, 16, 16, 16), rs("cross4", "cross4", 36, 34),
      dz("garage_0", "garage", 3, 47, 21, 6, 14), rs("road3", "road3", 36, 50),
      dz("construction_0", "construction", 58, 48, 19, 15, 19), rs("house3a", "house3a", 84, 43, 16, 16, 16),
      rs("corner1", "corner1", 36, 66), dz("industrial_0_1", "factory", 58, 72, 33, 25, 19),
      rs("road4", "road4", 36, 82), rs("cars4", "cars", 41, 46, 7, 4, 3, 1)
    ],
    spawnPoints: [sp("start", 22, 24), sp("roadblock", 43, 43), sp("garage", 13, 53), sp("flank", 67, 56), sp("factory", 72, 82), sp("final", 43, 91), sp("defense_center", 43, 82), sp("defense_north", 43, 70), sp("defense_east", 54, 82), sp("defense_west", 32, 82), sp("defense_south", 43, 94)],
    checkpoints: [
      cp("route_1", "加油站出口", 43, 26, 6), cp("route_2", "仓库路口", 43, 43, 6),
      cp("route_3", "维修车库", 43, 59, 6), cp("route_4", "工业区入口", 43, 75, 6), cp("route_5", "车队终点", 43, 91, 7)
    ],
    stages: [
      { type: "briefing", name: "补给车发车", durationTicks: 80, messages: ["§b车队长：§f‘这批药品必须送到工业区。驾驶卡车或紧跟车辆，别让公路上的东西拖住我们。’"] },
      { type: "route", name: "穿过加油站", route: ["route_1", "route_2"], vehicleId: "ab_ve:truck", vehicleSpawnPoint: "start", hint: "乘坐或跟随补给卡车通过前两个道路节点。", routeWaves: [
        { routeIndex: 0, groups: [{ mobKey: "basic", count: 7, spawnPoint: "roadblock" }, { mobKey: "runner", count: 3, spawnPoint: "flank" }] },
        { routeIndex: 1, groups: [{ mobKey: "basic", count: 8, spawnPoint: "flank" }, { mobKey: "runner", count: 4, spawnPoint: "roadblock" }, { mobKey: "spitter", count: 1, spawnPoint: "roadblock" }] }
      ] },
      { type: "eliminate", name: "清除武装路障", groups: [{ mobKey: "raider", count: 3, spawnPoint: "roadblock" }, { mobKey: "basic", count: 3, spawnPoint: "flank" }] },
      { type: "route", name: "通过维修区", route: ["route_3", "route_4"], reuseVehicle: true, hint: "保护车辆继续通过车库和工业区入口。", routeWaves: [
        { routeIndex: 0, groups: [{ mobKey: "basic", count: 8, spawnPoint: "garage" }, { mobKey: "runner", count: 4, spawnPoint: "flank" }] },
        { routeIndex: 1, groups: [{ mobKey: "basic", count: 10, spawnPoint: "factory" }, { mobKey: "runner", count: 4, spawnPoint: "flank" }, { mobKey: "charger", count: 1, spawnPoint: "factory" }] }
      ] },
      { type: "defend", name: "终点卸货", durationTicks: 480, defensePoint: "defense_center", defenseLeashRadius: 26, waves: [
        { atTicks: 0, groups: [{ mobKey: "basic", count: 5, spawnPoint: "defense_north" }] },
        { atTicks: 160, groups: [{ mobKey: "runner", count: 3, spawnPoint: "defense_west" }, { mobKey: "spitter", count: 1, spawnPoint: "defense_east" }] },
        { atTicks: 320, groups: [{ mobKey: "heavy", count: 1, spawnPoint: "defense_south" }, { mobKey: "raider", count: 2, spawnPoint: "defense_north" }] }
      ] },
      { type: "checkpoint", name: "确认交付", checkpoint: "route_5", hint: "到车队终点完成药品交付。" }
    ],
    rewardId: "dungeon_convoy_escort", minimumContribution: 12
  },

  abandoned_clinic: {
    ...rules,
    id: "abandoned_clinic", name: "废弃医院·封锁小镇", category: "combat",
    difficulty: "进阶", recommendedPlayers: "1–4 人",
    description: "从感染诊所突围，穿过街区和警局，在市场与车库完成最终清剿。",
    structureSize: { x: 55, y: 25, z: 105 },
    arenaBounds: { min: { x: -2, y: -4, z: -2 }, max: { x: 56, y: 32, z: 106 } },
    platform: { min: { x: -1, z: -1 }, max: { x: 55, z: 104 }, block: "minecraft:stone_bricks" },
    entryOffset: { x: 6.5, y: 1, z: 6.5 },
    structures: [
      { id: "clinic_a", structureId: "daily_dungeon:abandoned_town/clinic_a", offset: { x: 3, y: 0, z: 3 }, size: { x: 18, y: 10, z: 15 } },
      { id: "street_a", structureId: "daily_dungeon:abandoned_town/street_a", offset: { x: 0, y: 0, z: 21 }, size: { x: 25, y: 10, z: 9 } },
      { id: "police_b", structureId: "daily_dungeon:abandoned_town/police_b", offset: { x: 5, y: 0, z: 33 }, size: { x: 16, y: 15, z: 16 } },
      { id: "street_b", structureId: "daily_dungeon:abandoned_town/street_b", offset: { x: 5, y: 0, z: 52 }, size: { x: 16, y: 10, z: 16 } },
      { id: "market_c", structureId: "daily_dungeon:abandoned_town/market_c", offset: { x: 2, y: 0, z: 72 }, size: { x: 20, y: 9, z: 25 } },
      { id: "garage_final", structureId: "daily_dungeon:abandoned_town/garage_final", offset: { x: 32, y: 0, z: 79 }, size: { x: 21, y: 6, z: 14 } }
    ],
    spawnPoints: [sp("clinic_waiting", 8.5, 11.5), sp("clinic_ward", 17.5, 6.5), sp("street_left", 7.5, 25.5), sp("street_right", 18.5, 26.5), sp("police_lobby", 13.5, 43.5, 2), sp("police_side", 9.5, 37.5, 2), sp("market_floor", 10.5, 76.5), sp("market_back", 17.5, 84.5), sp("garage_center", 42.5, 83.5), sp("garage_flank", 47.5, 82.5)],
    checkpoints: [cp("clinic_gate", "诊所外集合点", 12.5, 20.5), cp("police_gate", "警察局入口", 13.5, 32), cp("market_gate", "废弃市场入口", 12, 70.5, 6), cp("garage_gate", "维修车库封锁线", 35, 78.5)],
    stages: [
      { type: "eliminate", name: "清理 A 楼感染诊所", groups: [{ mobKey: "basic", count: 4, spawnPoint: "clinic_waiting" }, { mobKey: "runner", count: 2, spawnPoint: "clinic_ward" }] },
      { type: "checkpoint", name: "从诊所撤离", checkpoint: "clinic_gate", hint: "离开 A 楼，到诊所外集合点打卡。" },
      { type: "eliminate", name: "街道阻击", groups: [{ mobKey: "basic", count: 5, spawnPoint: "street_left" }, { mobKey: "runner", count: 2, spawnPoint: "street_right" }, { mobKey: "raider", count: 1, spawnPoint: "street_right" }] },
      { type: "checkpoint", name: "转移至 B 楼", checkpoint: "police_gate", hint: "沿道路前进，到警察局入口打卡。" },
      { type: "eliminate", name: "肃清 B 楼警察局", groups: [{ mobKey: "basic", count: 4, spawnPoint: "police_lobby" }, { mobKey: "spitter", count: 2, spawnPoint: "police_side" }, { mobKey: "raider", count: 2, spawnPoint: "police_lobby" }] },
      { type: "checkpoint", name: "穿越第二街区", checkpoint: "market_gate", hint: "继续前往废弃市场入口。" },
      { type: "eliminate", name: "市场感染巢穴", groups: [{ mobKey: "basic", count: 5, spawnPoint: "market_floor" }, { mobKey: "runner", count: 2, spawnPoint: "market_back" }, { mobKey: "mutant", count: 2, spawnPoint: "market_back" }] },
      { type: "checkpoint", name: "抵达最终封锁线", checkpoint: "garage_gate", hint: "离开市场，到维修车库集合。" },
      { type: "eliminate", name: "车库最终清剿", groups: [{ mobKey: "heavy", count: 1, spawnPoint: "garage_center" }, { mobKey: "mutant", count: 2, spawnPoint: "garage_flank" }, { mobKey: "raider", count: 2, spawnPoint: "garage_center" }] }
    ],
    rewardId: "dungeon_abandoned_clinic", minimumContribution: 10
  },

  fogbound_hospital: {
    ...rules,
    id: "fogbound_hospital", name: "白雾医院·无面病区", category: "boss",
    difficulty: "噩梦", recommendedPlayers: "2–4 人",
    description: "封锁被异常白雾吞没的医院街区，击败雾中人与盘踞地下病区的变异感染者。Boss 只使用 Apocalypse Mobs 实体。",
    structureSize: { x: 104, y: 30, z: 116 },
    arenaBounds: { min: { x: -2, y: -4, z: -2 }, max: { x: 106, y: 38, z: 118 } },
    platform: { min: { x: -1, z: -1 }, max: { x: 104, z: 116 }, block: "minecraft:deepslate_tiles" },
    entryOffset: { x: 8, y: 1, z: 8 },
    structures: [
      dz("hospital", "hospital", 3, 3, 29, 25, 42), rs("road1", "road1", 36, 3),
      rs("house11", "ward_annex", 56, 3, 16, 19, 16), rs("road2", "road2", 36, 19),
      dz("police_station", "police", 57, 24, 16, 15, 16), rs("cross1", "cross", 36, 35),
      dz("clinic", "clinic", 3, 51, 18, 10, 15), rs("road3", "road3", 36, 51),
      rs("house5", "house", 57, 51, 16, 16, 16), rs("road4", "road4", 36, 67),
      dz("radio_tower", "radio", 58, 76, 18, 25, 12), rs("corner2", "corner", 36, 83),
      rs("cars1", "wrecks", 41, 48, 7, 4, 3, 1)
    ],
    spawnPoints: [sp("entry", 14, 14), sp("ward", 16, 28), sp("street", 44, 56), sp("fog_court", 44, 76), sp("morgue", 44, 98)],
    checkpoints: [cp("hospital_gate", "医院封锁门", 32, 46, 6), cp("fog_gate", "白雾隔离线", 44, 68, 7), cp("morgue_gate", "地下病区入口", 44, 90, 7)],
    stages: [
      { type: "briefing", name: "失控的隔离病区", durationTicks: 100, messages: ["§8联盟调查员：§f‘监控里的人影没有脸。清空病区，切勿长时间盯着白雾中的轮廓。’"] },
      { type: "eliminate", name: "肃清住院部", groups: [{ mobKey: "basic", count: 7, spawnPoint: "ward" }, { mobKey: "hunter", count: 2, spawnPoint: "ward" }] },
      { type: "checkpoint", name: "穿过医院封锁门", checkpoint: "hospital_gate", hint: "离开住院部，沿残骸道路前往白雾隔离线。" },
      { type: "boss", name: "白雾中的注视", groups: [{ bossKey: "fog_man", count: 1, spawnPoint: "fog_court" }, { mobKey: "runner", count: 4, spawnPoint: "street" }] },
      { type: "checkpoint", name: "追踪地下信号", checkpoint: "morgue_gate", hint: "雾暂时散开，追踪异常心跳信号到地下病区入口。" },
      { type: "boss", name: "零号变异病患", groups: [{ bossKey: "mutant_zombie", count: 1, spawnPoint: "morgue" }, { mobKey: "spitter", count: 3, spawnPoint: "street" }] }
    ],
    rewardId: "dungeon_fogbound_hospital", minimumContribution: 16, timeoutTicks: 36000
  },

  redhorn_industrial: {
    ...rules,
    id: "redhorn_industrial", name: "赤角工厂·猎杀之夜", category: "boss",
    difficulty: "噩梦", recommendedPlayers: "2–4 人",
    description: "穿过废弃加油站与工业厂房追猎山羊人，最终摧毁被感染核心控制的变异铁傀儡。",
    structureSize: { x: 112, y: 30, z: 116 },
    arenaBounds: { min: { x: -2, y: -4, z: -2 }, max: { x: 114, y: 38, z: 118 } },
    platform: { min: { x: -1, z: -1 }, max: { x: 112, z: 116 }, block: "minecraft:stone" },
    entryOffset: { x: 10, y: 1, z: 10 },
    structures: [
      dz("gas_station", "gas", 3, 3, 31, 20, 36), rs("road1", "road1", 38, 3),
      dz("werehouse_0", "warehouse", 58, 3, 23, 15, 22), rs("road2", "road2", 38, 19),
      rs("house3a", "house", 84, 3, 16, 16, 16), rs("cross4", "cross", 38, 35),
      dz("garage_0", "garage", 4, 49, 21, 6, 14), rs("road3", "road3", 38, 51),
      dz("construction_0", "construction", 59, 46, 19, 15, 19), rs("road4", "road4", 38, 67),
      dz("industrial_0_1", "factory", 58, 76, 33, 25, 19), rs("corner1", "corner", 38, 83),
      rs("cars2", "wrecks", 43, 48, 7, 4, 3, 1)
    ],
    spawnPoints: [sp("station", 18, 22), sp("warehouse", 69, 15), sp("hunt", 46, 60), sp("goat_ring", 46, 78), sp("forge", 74, 91)],
    checkpoints: [cp("track", "染血蹄印", 46, 45, 6), cp("factory_gate", "炼钢厂闸门", 46, 88, 7)],
    stages: [
      { type: "briefing", name: "赤角目击报告", durationTicks: 90, messages: ["§4猎杀队：§f‘它会借助建筑遮挡冲锋。跟随蹄印推进，不要单独进入厂房。’"] },
      { type: "eliminate", name: "清理外围巢穴", groups: [{ mobKey: "runner", count: 8, spawnPoint: "station" }, { mobKey: "charger", count: 2, spawnPoint: "warehouse" }] },
      { type: "checkpoint", name: "确认追猎路线", checkpoint: "track", hint: "在主路中央检查染血蹄印。" },
      { type: "boss", name: "赤角猎杀者", groups: [{ bossKey: "goatman", count: 1, spawnPoint: "goat_ring" }, { mobKey: "hunter", count: 3, spawnPoint: "hunt" }] },
      { type: "checkpoint", name: "开启炼钢厂闸门", checkpoint: "factory_gate", hint: "进入炼钢厂，切断异常能源核心。" },
      { type: "boss", name: "失控钢铁巨像", groups: [{ bossKey: "mutant_iron_golem", count: 1, spawnPoint: "forge" }, { mobKey: "raider", count: 3, spawnPoint: "warehouse" }] }
    ],
    rewardId: "dungeon_redhorn_industrial", minimumContribution: 18, timeoutTicks: 36000
  },

  siren_blackout: {
    ...rules,
    id: "siren_blackout", name: "失声城区·最后广播", category: "boss",
    difficulty: "灾厄", recommendedPlayers: "3–4 人",
    description: "重启城区广播中继器，引出占据制高点的变异骷髅，并在露天街区对抗警笛头。",
    structureSize: { x: 108, y: 34, z: 120 },
    arenaBounds: { min: { x: -2, y: -4, z: -2 }, max: { x: 110, y: 42, z: 122 } },
    platform: { min: { x: -1, z: -1 }, max: { x: 108, z: 120 }, block: "minecraft:gray_concrete" },
    entryOffset: { x: 8, y: 1, z: 8 },
    structures: [
      dz("police_station", "police", 3, 3, 16, 15, 16), rs("road1", "road1", 28, 3),
      rs("house10", "residence", 50, 3, 16, 16, 16), rs("road2", "road2", 28, 19),
      dz("supermarket_0", "market", 68, 3, 30, 20, 33), rs("cross1", "cross", 28, 35),
      dz("construction_0", "construction", 3, 49, 19, 15, 19), rs("road3", "road3", 28, 51),
      rs("house1c", "house", 50, 51, 16, 16, 16), rs("road4", "road4", 28, 67),
      dz("radio_tower", "radio", 62, 73, 18, 25, 12), rs("corner2", "corner", 28, 83),
      rs("streetlights", "lights", 45, 69, 1, 8, 9), rs("cars3", "wrecks", 33, 48, 7, 4, 3, 1)
    ],
    spawnPoints: [sp("police", 12, 12), sp("rooftop", 58, 29), sp("relay", 42, 72), sp("tower", 70, 82), sp("siren_field", 42, 101)],
    checkpoints: [cp("relay", "静默广播中继器", 42, 70, 7), cp("broadcast", "紧急广播控制台", 70, 80, 7), cp("open_ground", "露天诱导区", 42, 96, 8)],
    stages: [
      { type: "briefing", name: "全城失声", durationTicks: 100, messages: ["§c广播员：§f‘城区所有扬声器在同一秒发出尖啸，然后彻底失声。恢复中继器，把源头引到开阔地。’"] },
      { type: "eliminate", name: "夺回中继道路", groups: [{ mobKey: "basic", count: 8, spawnPoint: "police" }, { mobKey: "spitter", count: 3, spawnPoint: "relay" }] },
      { type: "checkpoint", name: "恢复中继器", checkpoint: "relay", hint: "前往道路中继器，让城市广播重新上线。" },
      { type: "boss", name: "制高点狙击者", groups: [{ bossKey: "mutant_skeleton", count: 1, spawnPoint: "rooftop" }, { mobKey: "spitter", count: 3, spawnPoint: "relay" }] },
      { type: "checkpoint", name: "发送诱导广播", checkpoint: "broadcast", hint: "到广播塔发送最大功率诱导信号。" },
      { type: "checkpoint", name: "进入露天诱导区", checkpoint: "open_ground", hint: "警笛声正在接近，立即转移到露天街区。" },
      { type: "boss", name: "警笛头", groups: [{ bossKey: "siren_head", count: 1, spawnPoint: "siren_field" }, { mobKey: "shrieker", count: 2, spawnPoint: "tower" }] }
    ],
    rewardId: "dungeon_siren_blackout", minimumContribution: 20, timeoutTicks: 42000
  },

  drowned_pumpstation: {
    ...rules,
    id: "drowned_pumpstation", name: "沉没泵站·深水回声", category: "boss",
    difficulty: "噩梦", recommendedPlayers: "2–4 人",
    description: "调查被洪水隔绝的泵站与仓库，消灭变异溺尸和从高处投掷感染物的变异投掷者。",
    structureSize: { x: 104, y: 30, z: 112 },
    arenaBounds: { min: { x: -2, y: -4, z: -2 }, max: { x: 106, y: 38, z: 114 } },
    platform: { min: { x: -1, z: -1 }, max: { x: 104, z: 112 }, block: "minecraft:dark_prismarine" },
    entryOffset: { x: 8, y: 1, z: 8 },
    structures: [
      dz("werehouse_0", "warehouse", 3, 3, 23, 15, 22), rs("road1", "road1", 31, 3),
      dz("garage_0", "garage", 52, 3, 21, 6, 14), rs("road2", "road2", 31, 19),
      rs("house4", "pump_house", 77, 3, 16, 16, 16), rs("cross4", "cross", 31, 35),
      dz("industrial_0_1", "pumpworks", 52, 40, 33, 25, 19), rs("road3", "road3", 31, 51),
      dz("construction_0", "spillway", 3, 53, 19, 15, 19), rs("road4", "road4", 31, 67),
      dz("radio_tower", "water_tower", 59, 75, 18, 25, 12), rs("corner1", "corner", 31, 83),
      rs("cars4", "wrecks", 36, 48, 7, 4, 3, 1)
    ],
    spawnPoints: [sp("warehouse", 14, 14), sp("spillway", 14, 62), sp("basin", 39, 75), sp("tower", 67, 82), sp("deep_end", 39, 99)],
    checkpoints: [cp("valve", "主排水阀", 39, 45, 6), cp("basin", "蓄水池边缘", 39, 69, 7), cp("tower", "水塔检修梯", 67, 78, 6)],
    stages: [
      { type: "briefing", name: "水下求救信号", durationTicks: 90, messages: ["§3水务站：§f‘泵站已经断电，但水下仍有规律敲击声。开启主阀后，所有人离开低洼区域。’"] },
      { type: "eliminate", name: "清理泵站仓库", groups: [{ mobKey: "basic", count: 7, spawnPoint: "warehouse" }, { mobKey: "spitter", count: 2, spawnPoint: "spillway" }] },
      { type: "checkpoint", name: "开启主排水阀", checkpoint: "valve", hint: "沿道路到中央阀门平台。" },
      { type: "checkpoint", name: "检查蓄水池", checkpoint: "basin", hint: "排水后进入蓄水池边缘调查敲击声。" },
      { type: "boss", name: "深水变异体", groups: [{ bossKey: "mutant_drowned", count: 1, spawnPoint: "deep_end" }, { mobKey: "basic", count: 5, spawnPoint: "basin" }] },
      { type: "checkpoint", name: "登上水塔", checkpoint: "tower", hint: "投掷物来自水塔方向，前往检修梯。" },
      { type: "boss", name: "腐化投掷者", groups: [{ bossKey: "mutant_lobber", count: 1, spawnPoint: "tower" }, { mobKey: "charger", count: 2, spawnPoint: "spillway" }] }
    ],
    rewardId: "dungeon_drowned_pumpstation", minimumContribution: 18, timeoutTicks: 36000
  },

  mutation_gauntlet: {
    ...rules,
    id: "mutation_gauntlet", name: "黑箱实验场·终极样本", category: "boss",
    difficulty: "炼狱", recommendedPlayers: "4 人",
    description: "最高难度连续 Boss 副本：穿越实验区，击败空间变异体与召唤母体。适合装备成型的小队。",
    structureSize: { x: 116, y: 34, z: 122 },
    arenaBounds: { min: { x: -2, y: -4, z: -2 }, max: { x: 118, y: 42, z: 124 } },
    platform: { min: { x: -1, z: -1 }, max: { x: 116, z: 122 }, block: "minecraft:blackstone" },
    entryOffset: { x: 10, y: 1, z: 10 },
    structures: [
      dz("clinic", "intake", 3, 3, 18, 10, 15), rs("road1", "road1", 28, 3),
      dz("hospital", "laboratory", 52, 3, 29, 25, 42), rs("road2", "road2", 28, 19),
      dz("police_station", "security", 85, 3, 16, 15, 16), rs("cross1", "cross", 28, 35),
      dz("construction_0", "breach", 3, 49, 19, 15, 19), rs("road3", "road3", 28, 51),
      dz("industrial_0_1", "reactor", 52, 49, 33, 25, 19), rs("road4", "road4", 28, 67),
      rs("house11", "containment", 87, 50, 16, 19, 16), rs("corner2", "corner", 28, 83),
      dz("radio_tower", "observation", 59, 83, 18, 25, 12), rs("cars1", "wrecks", 33, 48, 7, 4, 3, 1)
    ],
    spawnPoints: [sp("intake", 12, 12), sp("breach", 14, 58), sp("rift", 43, 70), sp("reactor", 68, 60), sp("reactor_north", 68, 48), sp("reactor_east", 80, 60), sp("reactor_west", 56, 60), sp("reactor_south", 68, 72), sp("nest", 43, 103)],
    checkpoints: [cp("lab", "黑箱实验室", 43, 44, 7), cp("reactor", "异常反应堆", 68, 68, 7), cp("nest", "母体培养舱", 43, 95, 8)],
    stages: [
      { type: "briefing", name: "终极样本失控", durationTicks: 110, messages: ["§5研究主管：§f‘实验场封锁协议已失效。空间读数不稳定；如果母体完成孵化，整个城区都会被感染。’"] },
      { type: "eliminate", name: "突破安保隔离", groups: [{ mobKey: "mutant", count: 5, spawnPoint: "intake" }, { mobKey: "raider", count: 4, spawnPoint: "breach" }] },
      { type: "checkpoint", name: "进入黑箱实验室", checkpoint: "lab", hint: "穿过隔离门，进入异常样本区。" },
      { type: "boss", name: "空间撕裂者", groups: [{ bossKey: "mutant_enderman", count: 1, spawnPoint: "rift" }, { mobKey: "hunter", count: 3, spawnPoint: "breach" }] },
      { type: "checkpoint", name: "过载反应堆", checkpoint: "reactor", hint: "在母体苏醒前过载异常反应堆。" },
      { type: "defend", name: "反应堆过载", durationTicks: 420, defensePoint: "reactor", defenseLeashRadius: 24, waves: [
        { atTicks: 0, groups: [{ mobKey: "runner", count: 7, spawnPoint: "reactor_north" }] },
        { atTicks: 140, groups: [{ mobKey: "spitter", count: 3, spawnPoint: "reactor_west" }, { mobKey: "charger", count: 2, spawnPoint: "reactor_east" }] },
        { atTicks: 280, groups: [{ mobKey: "heavy", count: 2, spawnPoint: "reactor_south" }] }
      ] },
      { type: "checkpoint", name: "开启母体培养舱", checkpoint: "nest", hint: "反应堆已过载，前往最终培养舱。" },
      { type: "boss", name: "召唤母体", groups: [{ bossKey: "broodmother", count: 1, spawnPoint: "nest" }, { mobKey: "shrieker", count: 2, spawnPoint: "rift" }] }
    ],
    rewardId: "dungeon_mutation_gauntlet", minimumContribution: 26, timeoutTicks: 48000, maxDeathsPerPlayer: 1
  }
});

export const DUNGEON_SLOTS = Object.freeze([
  { id: "town_01", dimension: "minecraft:overworld", origin: { x: 100000, y: 250, z: 100000 } },
  { id: "town_02", dimension: "minecraft:overworld", origin: { x: 100256, y: 250, z: 100000 } },
  { id: "town_03", dimension: "minecraft:overworld", origin: { x: 100512, y: 250, z: 100000 } },
  { id: "town_04", dimension: "minecraft:overworld", origin: { x: 100768, y: 250, z: 100000 } }
]);

export function dungeonTemplate(id) { return DUNGEON_TEMPLATES[id] || null; }
export function absolutePoint(origin, offset) {
  return { x: Number(origin.x) + Number(offset.x), y: Number(origin.y) + Number(offset.y), z: Number(origin.z) + Number(offset.z) };
}
