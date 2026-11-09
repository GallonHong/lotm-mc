import { world, system } from "@minecraft/server";
import { SeasonManager, SEASONS } from "./SeasonManager.js";
import { TemperatureManager } from "../temperature/TemperatureManager.js";

/**
 * 原生轻量季节自然演变与环境氛围引擎 (高性能优化版)
 * - 针对性能进行深度裁剪与稀疏化调度：彻底剔除重型发射器粒子 (*_emitter)
 * - 凛冬：极轻量室外自然积雪 (snow_layer)、水面结冰 (ice)、低频稀疏雪花微粒
 * - 初春：冰雪自然消融归还大地与水源、零环境粒子负载
 * - 盛夏：烈日艳阳、积雪彻底融净、零环境粒子负载
 * - 金秋：仅在处于树冠下方时极低频飘落单颗落叶粒子
 * - 性能保证：每 4 秒 (80 Ticks) 仅采样 2 个点位，无持续粒子发射器，确保多人联机与低配设备满帧运行
 */
export class SeasonalEnvironment {
 /**
  * 初始化环境演变循环
  */
 static init() {
  console.warn("[SeasonalEnvironment] Seasonal Natural Environment System (Optimized) initializing...");

  // 每 80 Ticks (4 秒) 执行一次极轻量自然演变与环境微效
  system.runInterval(() => {
   this.updateEnvironment();
  }, 80);

  // 每 1200 Ticks (60 秒) 检查并智能校准季节天气
  system.runInterval(() => {
   this.updateSeasonalWeather();
  }, 1200);
 }

 /**
  * 判断方块是否适合承载顶层雪 (露天自然地形与坚固结构)
  */
 static isSnowSupport(block) {
  if (!block || block.isAir || block.isLiquid) return false;
  const id = block.typeId;

  // 排除流体、火焰、易损装饰与红石零件
  if (id.includes("snow") || id.includes("water") || id.includes("lava") || id.includes("fire")) return false;
  if (id.includes("door") || id.includes("torch") || id.includes("slab") || id.includes("stair") || 
   id.includes("pane") || id.includes("carpet") || id.includes("button") || id.includes("lever")) return false;
  if (id.includes("grass") && !id.includes("grass_block")) return false;
  if (id.includes("flower") || id.includes("crop") || id.includes("sapling") || 
   id.includes("vending") || id.includes("target") || id.includes("chest")) return false;

  // 常见可承载积雪的废土自然地貌与公路
  if (id.includes("grass_block") || id.includes("dirt") || id.includes("stone") || id.includes("sand") || 
   id.includes("gravel") || id.includes("concrete") || id.includes("terracotta") || id.includes("leaves") || 
   id.includes("planks") || id.includes("wood") || id.includes("log") || id.includes("cobblestone")) {
   return true;
  }

  return false;
 }

 /**
  * 智能校准季节天气 (冬雪、夏晴、春秋适度)
  */
 static updateSeasonalWeather() {
  try {
   const seasonInfo = SeasonManager.getSeasonInfo();
   const overworld = world.getDimension("overworld");
   if (!overworld) return;

   if (seasonInfo.id === SEASONS.WINTER) {
    // 凛冬时节：高概率维持降水 (在低温下表现为暴风雪)
    if (Math.random() < 0.70) {
     overworld.runCommandAsync("weather rain 1200");
    }
   } else if (seasonInfo.id === SEASONS.SUMMER) {
    // 盛夏酷暑：多维持艳阳晴空
    if (Math.random() < 0.85) {
     overworld.runCommandAsync("weather clear 1200");
    }
   }
  } catch {}
 }

 /**
  * 主环境演变更新逻辑 (每 4 秒运行一次，每个玩家仅采样 2 次)
  */
 static updateEnvironment() {
  const seasonInfo = SeasonManager.getSeasonInfo();
  const seasonId = seasonInfo.id;

  for (const player of world.getAllPlayers()) {
   if (!player || !player.isValid()) continue;

   const dim = player.dimension;
   if (dim.id !== "minecraft:overworld") continue;

   const pLoc = player.location;
   const zoneType = TemperatureManager.resolvePlayerZoneType(player);
   const isSafeZone = (zoneType === "safe");

   // ==========================================
   // 1. 周边地面自然方块极轻量演变采样 (仅随机 2 个水平坐标)
   // ==========================================
   for (let i = 0; i < 2; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * 15;
    const sampleX = Math.floor(pLoc.x + Math.cos(angle) * dist);
    const sampleZ = Math.floor(pLoc.z + Math.sin(angle) * dist);

    try {
     const topBlock = dim.getTopmostBlock({ x: sampleX, z: sampleZ });
     if (!topBlock || !topBlock.isValid()) continue;

     // ---------------- 凛冬：露天积雪与水面结冰 ----------------
     if (seasonId === SEASONS.WINTER) {
      // 安全区受保护：不自然堆雪，保持主城地面干净
      if (!isSafeZone) {
       if (topBlock.typeId === "minecraft:water") {
        if (Math.random() < 0.20) {
         topBlock.setType("minecraft:ice");
        }
       } else if (this.isSnowSupport(topBlock)) {
        const above = dim.getBlock({ x: topBlock.x, y: topBlock.y + 1, z: topBlock.z });
        if (above && above.isAir && Math.random() < 0.30) {
         above.setType("minecraft:snow_layer");
        }
       }
      }
     }
     // ---------------- 春夏：积雪消融与冰层化水 ----------------
     else if (seasonId === SEASONS.SPRING || seasonId === SEASONS.SUMMER) {
      if (topBlock.typeId === "minecraft:snow_layer") {
       topBlock.setType("minecraft:air");
      } else if (topBlock.typeId === "minecraft:ice") {
       topBlock.setType("minecraft:water");
      }
     }
     // ---------------- 金秋：微量初霜与残留融化 ----------------
     else if (seasonId === SEASONS.FALL) {
      if (topBlock.typeId === "minecraft:ice" && Math.random() < 0.2) {
       topBlock.setType("minecraft:water");
      }
     }
    } catch {}
   }

   // ==========================================
   // 2. 沉浸式季节微氛围处理 (极轻量、零持续发射器)
   // ==========================================
   this.handleAtmosphericEffects(player, seasonId, isSafeZone);
  }
 }

 /**
  * 极轻量季节特定氛围微粒子处理
  */
 static handleAtmosphericEffects(player, seasonId, isSafeZone) {
  const dim = player.dimension;
  const pLoc = player.location;

  try {
   // ---------------- 凛冬：室外稀疏飘雪 (25% 概率单颗微粒) ----------------
   if (seasonId === SEASONS.WINTER && !isSafeZone) {
    if (Math.random() < 0.25) {
     const sx = pLoc.x + (Math.random() - 0.5) * 8;
     const sy = pLoc.y + 1.2 + Math.random() * 1.5;
     const sz = pLoc.z + (Math.random() - 0.5) * 8;
     dim.spawnParticle("minecraft:snowflake_particle", { x: sx, y: sy, z: sz });
    }

    // 罕见远方寒风微音效 (5% 概率)
    if (Math.random() < 0.05) {
     player.runCommandAsync("playsound ambient.weather.rain @s ~~~ 0.1 0.5");
    }
   }
   // ---------------- 金秋：近距树叶下方偶发单颗落叶 (15% 概率) ----------------
   else if (seasonId === SEASONS.FALL) {
    if (Math.random() < 0.15) {
     const headBlock = dim.getBlock({ 
      x: Math.floor(pLoc.x), 
      y: Math.floor(pLoc.y + 2.5), 
      z: Math.floor(pLoc.z) 
     });
     if (headBlock && headBlock.typeId.includes("leaves")) {
      dim.spawnParticle("minecraft:falling_dust", {
       x: pLoc.x,
       y: pLoc.y + 2.0,
       z: pLoc.z
      });
     }
    }
   }
   // ---------------- 春夏：零粒子发射，完全依赖原生天气与光照，极大提升流畅度 ----------------
  } catch {}
 }
}
