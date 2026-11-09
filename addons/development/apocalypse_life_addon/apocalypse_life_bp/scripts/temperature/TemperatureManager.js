import { world, system, EntityComponentTypes, EquipmentSlot } from "@minecraft/server";
import { SeasonManager, SEASONS } from "../seasons/SeasonManager.js";
import { ArmorInsulation } from "./ArmorInsulation.js";
import { DietThermoregulation } from "./DietThermoregulation.js";

import { isPlotSafe } from "./PlotSafeZoneBridge.js";

const TEMP_PROP_KEY = "apoc:player_temp_v1";

const APOCALYPSE_PRESET_ZONES = [
 { name: "安全区 1", type: "safe", minX: 1949, maxX: 3035, minZ: 1463, maxZ: 2469 },
 { name: "安全区 2", type: "safe", minX: 2352, maxX: 2585, minZ: 1165, maxZ: 1303 },
 { name: "安全区 3", type: "safe", minX: 1942, maxX: 2087, minZ: 1273, maxZ: 1465 },
 { name: "法制区 1", type: "law", minX: 3450, maxX: 3869, minZ: 2033, maxZ: 2478 },
 { name: "法制区 2", type: "law", minX: 1687, maxX: 2250, minZ: 2509, maxZ: 3127 }
];

export class TemperatureManager {
 static lastDamageTicks = new Map();

 /**
  * 初始化体温系统
  */
 static init() {
  console.warn("[TemperatureManager] Apocalypse Temperature Engine initializing...");

  DietThermoregulation.init();

  // 每秒 (20 Ticks) 运行一次体温演算主循环
  system.runInterval(() => {
   this.updateAllPlayers();
  }, 20);
 }

 /**
  * 获取玩家当前体温值 (0 ~ 100, 50 为健康标准体温 36.5℃)
  */
 static getPlayerTemp(player) {
  if (!player || !player.isValid()) return 50;
  try {
   const val = player.getDynamicProperty(TEMP_PROP_KEY);
   if (typeof val === "number" && !isNaN(val)) {
    return Math.max(0, Math.min(100, val));
   }
  } catch {}
  return 50;
 }

 /**
  * 保存玩家当前体温值
  */
 static setPlayerTemp(player, val) {
  if (!player || !player.isValid()) return;
  try {
   player.setDynamicProperty(TEMP_PROP_KEY, Math.max(0, Math.min(100, val)));
  } catch {}
 }

 /**
  * 判断玩家当前处于哪类区域 (safe, law, outlaw)
  */
 static resolvePlayerZoneType(player) {
  if (!player || !player.isValid()) return "outlaw";
  if (isPlotSafe(player)) return "safe";
  const loc = player.location;
  const x = loc.x;
  const z = loc.z;

  // 1. 检查预设安全区与法制区
  for (const zone of APOCALYPSE_PRESET_ZONES) {
   if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
    return zone.type;
   }
  }

  // 2. 检查主城出生点保护圈 (半径 64 格)
  let spawn = { x: 2423.49, z: 2019.55 };
  try {
   const worldSpawn = world.getDefaultSpawnLocation();
   if (worldSpawn) spawn = { x: worldSpawn.x, z: worldSpawn.z };
  } catch {}

  const dx = x - spawn.x;
  const dz = z - spawn.z;
  if (dx * dx + dz * dz <= 64 * 64) {
   return "safe";
  }

  // 3. 检查动态配置安全区
  try {
   const raw = world.getDynamicProperty("apoc:zones:v1");
   if (typeof raw === "string") {
    const zones = JSON.parse(raw);
    if (Array.isArray(zones)) {
     for (const z of zones) {
      if (z && z.min && z.max) {
       if (x >= z.min.x && x <= z.max.x && loc.z >= z.min.z && loc.z <= z.max.z) {
        return z.type || "safe";
       }
      }
     }
    }
   }
  } catch {}

  return "outlaw";
 }

 /**
  * 检测玩家是否处于封闭载具车厢内 (皮卡、救护车、直升机)
  */
 static isInsideEnclosedVehicle(player) {
  if (!player || !player.isValid()) return false;
  try {
   const loc = player.location;
   const dim = player.dimension;
   const nearbyEntities = dim.getEntities({
    location: loc,
    maxDistance: 2.5
   });

   const enclosedTypes = ["ab_ve:truck", "ab_ve:ambulance", "ab_ve:helicopter"];
   for (const ent of nearbyEntities) {
    if (enclosedTypes.includes(ent.typeId)) {
     const rideComp = ent.getComponent("minecraft:rideable");
     if (rideComp) {
      const riders = rideComp.getRiders();
      if (riders.some(r => r.id === player.id)) {
       return true;
      }
     }
    }
   }
  } catch {}
  return false;
 }

 /**
  * 检测玩家是否处于室内 / 建筑物屋顶掩体下方
  */
 static isSheltered(player) {
  if (!player || !player.isValid()) return false;
  try {
   const dim = player.dimension;
   const loc = player.location;
   const topBlock = dim.getTopmostBlock({ x: loc.x, z: loc.z });
   if (topBlock && topBlock.y > loc.y + 1.8) {
    return true;
   }
  } catch {}
  return false;
 }

 /**
  * 检测附近火源 / 熔炉 / 岩浆辐射以及手持火把
  */
 static getNearbyHeatSourceBonus(player) {
  if (!player || !player.isValid()) return 0;
  let bonus = 0;

  try {
   // 1. 手持火把 (主手或副手)
   const equippable = player.getComponent("minecraft:equippable");
   if (equippable) {
    const main = equippable.getEquipment(EquipmentSlot.Mainhand);
    const off = equippable.getEquipment(EquipmentSlot.Offhand);
    if (main && (main.typeId.includes("torch") || main.typeId.includes("lantern"))) bonus += 8;
    if (off && (off.typeId.includes("torch") || off.typeId.includes("lantern"))) bonus += 8;
   }

   // 2. 附近地面火源与营火 (以 4 格为半轻量采样)
   const dim = player.dimension;
   const pLoc = player.location;
   const cx = Math.floor(pLoc.x);
   const cy = Math.floor(pLoc.y);
   const cz = Math.floor(pLoc.z);

   const offsets = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
    { x: 0, y: -1, z: 0 },
    { x: 2, y: 0, z: 0 }, { x: -2, y: 0, z: 0 },
    { x: 0, y: 0, z: 2 }, { x: 0, y: 0, z: -2 }
   ];

   for (const off of offsets) {
    const b = dim.getBlock({ x: cx + off.x, y: cy + off.y, z: cz + off.z });
    if (!b) continue;
    const tid = b.typeId;
    if (tid.includes("campfire") || tid.includes("fire")) {
     bonus += 22;
     break;
    } else if (tid.includes("furnace") || tid.includes("lava") || tid.includes("smoker")) {
     bonus += 15;
     break;
    }
   }
  } catch {}

  return Math.min(30, bonus);
 }

 /**
  * 20 TPS 主循环更新所有玩家体温
  */
 static updateAllPlayers() {
  const seasonInfo = SeasonManager.getSeasonInfo();
  const currentTick = system.currentTick;

  for (const player of world.getAllPlayers()) {
   if (!player || !player.isValid()) continue;

   const zoneType = this.resolvePlayerZoneType(player);
   let currentTemp = this.getPlayerTemp(player);

   // 1. 饮食 Buff 与体温即时调节更新
   const dietStatus = DietThermoregulation.updatePlayerBuffs(player);

   // ==========================================
   // 规则 A：安全区 (Safe Zone) 绝对恒温庇护
   // ==========================================
   if (zoneType === "safe") {
    // 安全区内迅速平滑恢复至标准健康体温 50 (36.5℃)
    if (currentTemp < 50) currentTemp = Math.min(50, currentTemp + 2.5);
    else if (currentTemp > 50) currentTemp = Math.max(50, currentTemp - 2.5);

    this.setPlayerTemp(player, currentTemp);
    continue; // 安全区完全不承受恶化与伤害，直接跳过后续严寒酷暑运算
   }

   // ==========================================
   // 规则 B：末日载具车厢恒温空调
   // ==========================================
   const isEnclosedCar = this.isInsideEnclosedVehicle(player);
   if (isEnclosedCar) {
    // 车载恒温舱，平滑回稳至 50
    if (currentTemp < 50) currentTemp = Math.min(50, currentTemp + 2.0);
    else if (currentTemp > 50) currentTemp = Math.max(50, currentTemp - 2.0);

    this.setPlayerTemp(player, currentTemp);
    continue;
   }

   // ==========================================
   // 规则 C：野外 / 建筑内环境目标体温计算
   // ==========================================
   let targetTemp = seasonInfo.baseTemp; // 四季基准温度 (春:52, 夏:72, 秋:42, 冬:18)

   // 日夜温差修正 (正午偏热，深夜偏冷)
   let timeOfDay = 0;
   try {
    timeOfDay = world.getTimeOfDay(); // 0 ~ 24000
   } catch {}
   // 6000 为正午最高温，18000 为子夜最低温
   const sunAngle = Math.cos(((timeOfDay - 6000) / 24000) * 2 * Math.PI);
   targetTemp += sunAngle * (seasonInfo.tempSwing * 0.5);

   // 室内建筑掩体判定 (削减 80% 外界温差)
   const sheltered = this.isSheltered(player);
   if (sheltered) {
    targetTemp = targetTemp * 0.2 + 50 * 0.8;
   }

   // 火源热辐射
   const heatBonus = this.getNearbyHeatSourceBonus(player);
   targetTemp += heatBonus;

   // 冷水浸泡与暴雨
   if (player.isInWater) {
    if (seasonInfo.id === SEASONS.WINTER || seasonInfo.id === SEASONS.FALL) {
     targetTemp -= 25; // 寒水失温
    } else {
     targetTemp -= 15; // 夏季戏水消暑
    }
   }

   // 饮食即时偏移
   targetTemp += dietStatus.tempOffset;

   // 饮食御寒与消暑 Buff 强力保护
   if (dietStatus.hasWarming && targetTemp < 50) {
    targetTemp = Math.max(targetTemp, 50); // 御寒 Buff 保底不低于 50
   }
   if (dietStatus.hasCooling && targetTemp > 50) {
    targetTemp = Math.min(targetTemp, 50); // 消暑 Buff 保底不高过 50
   }

   // ==========================================
   // 规则 D：Test Guns 护甲防寒散热修正
   // ==========================================
   const insulation = ArmorInsulation.getPlayerInsulation(player);
   let diff = targetTemp - currentTemp;

   // 寒冷下行温差，受护甲防寒指数减免 (最多减免 85%)
   if (diff < 0) {
    diff *= (1 - insulation.coldResistance);
   }
   // 酷暑上行温差，受护甲散热指数修正
   if (diff > 0) {
    diff *= (1 - insulation.heatResistance);
   }

   // ==========================================
   // 规则 E：区域难度差异 (法制区减负，荒原区加剧)
   // ==========================================
   if (zoneType === "law") {
    // 法制区难度减半：温差波动减半，体温恶化速率降一倍
    diff *= 0.5;
   } else {
    // 非法制荒原区：真实严酷废土，恶化温差加剧
    diff *= 1.15;
   }

   // 平滑逼近每秒温变 (每秒温变在 0.5 ~ 2 度之间平缓过渡)
   const step = Math.sign(diff) * Math.min(Math.abs(diff) * 0.05, 1.8);
   currentTemp = Math.max(0, Math.min(100, currentTemp + step));
   this.setPlayerTemp(player, currentTemp);

   // ==========================================
   // 规则 F：纯感官拟真分级反馈与宽容保护
   // ==========================================
   this.handlePhysicalSensations(player, currentTemp, zoneType, currentTick);
  }
 }

 /**
  * 拟真身体反馈处理 (零屏幕 HUD，霜雾、寒颤、心跳、分级宽容微伤)
  */
 static handlePhysicalSensations(player, temp, zoneType, currentTick) {
  const lastDmg = this.lastDamageTicks.get(player.id) || 0;

  // ----------------- 极寒分支 -----------------
  if (temp < 42) {
   // 阶段 1 & 2 (20 ~ 42)：轻微受寒与发凉，仅在自然呼吸周期 (每 5 秒 100 Ticks) 飘出微弱呼气白雾，无性能负担
   if (temp >= 20) {
    if (currentTick % 100 === 0) {
     try {
      player.dimension.spawnParticle("minecraft:basic_smoke_particle", {
       x: player.location.x,
       y: player.location.y + 1.6,
       z: player.location.z
      });
     } catch {}
    }
    if (temp < 35 && currentTick % 160 === 0) {
     try { player.runCommandAsync("playsound random.shiver @s ~~~ 0.5 1.0"); } catch {}
    }
   }
   // 阶段 3 (< 20)：严重失温，渐进惩罚期 (每 6 秒扣 1 点血，绝不秒杀)
   else {
    if (zoneType === "law") {
     // 法制区高容错：仅给予虚弱，完全免疫致死冻伤
     try { player.runCommandAsync("effect @s weakness 3 0 true"); } catch {}
    } else {
     // 荒原区：每 6 秒 (120 Ticks) 扣除 1 点真实伤害
     if (currentTick - lastDmg >= 120) {
      this.lastDamageTicks.set(player.id, currentTick);
      try {
       const healthComp = player.getComponent(EntityComponentTypes.Health);
       if (healthComp && healthComp.currentValue > 1) {
        player.applyDamage(1);
        player.runCommandAsync("playsound mob.player.hurt_freeze @s ~~~ 0.7 1.0");
       }
      } catch {}
     }
    }
   }
  }
  // ----------------- 酷暑分支 -----------------
  else if (temp > 58) {
   // 阶段 1 (58 ~ 65)：轻微燥热，零粒子损耗，纯感官自然过渡
   // 阶段 2 (65 ~ 80)：明显闷热，低频粗重喘息音效，耐力消耗加快，无粒子负载
   if (temp <= 80) {
    if (temp > 65 && currentTick % 160 === 0) {
     try { player.runCommandAsync("playsound mob.player.hurt_drown @s ~~~ 0.25 1.2"); } catch {}
    }
   }
   // 阶段 3 (> 80)：重度中暑脱水，渐进惩罚期 (每 6 秒扣 1 点血)
   else {
    if (zoneType === "law") {
     // 法制区高容错：仅给予轻微挖掘疲劳，不扣血
     try { player.runCommandAsync("effect @s mining_fatigue 3 0 true"); } catch {}
    } else {
     if (currentTick - lastDmg >= 120) {
      this.lastDamageTicks.set(player.id, currentTick);
      try {
       const healthComp = player.getComponent(EntityComponentTypes.Health);
       if (healthComp && healthComp.currentValue > 1) {
        player.applyDamage(1);
        player.runCommandAsync("playsound mob.player.hurt_on_fire @s ~~~ 0.6 1.0");
       }
      } catch {}
     }
    }
   }
  }
 }
}
