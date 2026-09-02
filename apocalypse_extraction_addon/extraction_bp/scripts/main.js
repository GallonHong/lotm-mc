import { world, system, EquipmentSlot } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { CONFIG } from "./config.js";

console.warn(`[ExtractionCity] v${CONFIG.version} initializing...`);

const DIMENSION_BOOTSTRAP_HEARTBEAT = "interop:apoc_extraction_dimension_bootstrap:v1";
const DIMENSION_BOOTSTRAP_ERROR = "interop:apoc_extraction_dimension_error:v1";

const extractionJobs = new Map();
const deathHandled = new Set();
const pendingReturn = new Map();
const backpackSnapshots = new Map();
const insuredReturns = new Map();
let mobSpawnFailureNoticeTick = -1200;
let cityBuildPromise = null;
let cityReadyInSession = false;
let cityServicesCheckedInSession = false;
let activeHorde = null;
let nextHordeAllowedTick = 0;

const APOCALYPSE_MOBS = Object.freeze({
  basic: "apoc:infected_basic",
  runner: "apoc:infected_runner",
  spitter: "apoc:infected_spitter",
  shrieker: "apoc:infected_shrieker",
  charger: "apoc:infected_charger",
  hunter: "apoc:infected_hunter",
  mutant: "apoc:infected_mutant",
  heavy: "apoc:infected_heavy",
  tyrant: "apoc:infected_tyrant",
  broodmother: "apoc:infected_broodmother",
  raider: "apoc:raider_rifleman"
});

const VANILLA_HOSTILES = new Set([
  "minecraft:zombie", "minecraft:zombie_villager", "minecraft:husk", "minecraft:drowned",
  "minecraft:skeleton", "minecraft:stray", "minecraft:creeper", "minecraft:spider",
  "minecraft:cave_spider", "minecraft:witch", "minecraft:phantom", "minecraft:pillager",
  "minecraft:vindicator", "minecraft:ravager", "minecraft:evocation_illager"
]);

const CRATE_LAYOUT = Object.freeze([
  { dx: -46, dz: -34, tier: "common" },
  { dx: 42, dz: -38, tier: "common" },
  { dx: -34, dz: 44, tier: "rare" },
  { dx: 38, dz: 40, tier: "epic" }
]);

const INSURED_EQUIPMENT = Object.freeze([
  EquipmentSlot.Head,
  EquipmentSlot.Chest,
  EquipmentSlot.Legs,
  EquipmentSlot.Feet,
  EquipmentSlot.Offhand
]);

function subscribe(signal, label, handler) {
  if (!signal || typeof signal.subscribe !== "function") {
    console.warn(`[ExtractionCity] ${label} event unavailable.`);
    return false;
  }
  try { signal.subscribe(handler); return true; }
  catch (error) { console.warn(`[ExtractionCity] ${label} subscribe failed: ${error}`); return false; }
}

function scriptEventContext(event) {
  let player = event.sourceEntity?.typeId === "minecraft:player" ? event.sourceEntity : null;
  if (!player && event.initiator?.typeId === "minecraft:player") player = event.initiator;
  let message = String(event.message || "");
  const match = /^__sapi_player__=([^&]*)&data=([\s\S]*)$/.exec(message);
  if (match) {
    let playerName = "";
    try { playerName = decodeURIComponent(match[1]); } catch { playerName = match[1]; }
    try { message = decodeURIComponent(match[2]); } catch { message = match[2]; }
    if (!player) player = world.getAllPlayers().find(value => value.name === playerName) || null;
  }
  // 单人测试世界中，某些版本把玩家手动执行的 /scriptevent 也报告为 Server。
  if (!player) {
    const online = world.getAllPlayers();
    if (online.length === 1) player = online[0];
  }
  return { player, message };
}

function acknowledgeMenuRequest(player, rawRequestId = "") {
  let requestId = Number(rawRequestId) || 0;
  try { requestId ||= Number(player.getDynamicProperty(CONFIG.menuRequestKey) || 0); } catch {}
  if (!requestId) requestId = Date.now();

  try {
    if (Number(player.getDynamicProperty(CONFIG.menuAckKey) || 0) === requestId) return false;
    player.setDynamicProperty(CONFIG.menuAckKey, requestId);
    player.setDynamicProperty(CONFIG.menuRequestKey, undefined);
  } catch {}
  system.run(() => openMenu(player));
  return true;
}

function isAdmin(player) {
  try { return player.hasTag("admin") || player.hasTag("administrator") || player.isOp(); } catch { return false; }
}

function parse(raw, fallback) {
  try { return typeof raw === "string" ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function extractionDimension() {
  try { return world.getDimension(CONFIG.dimensionId); } catch { return null; }
}

function distance2D(a, b) { return Math.hypot(Number(a.x) - Number(b.x), Number(a.z) - Number(b.z)); }

function points() {
  const saved = parse(world.getDynamicProperty(CONFIG.pointsKey), null);
  return Array.isArray(saved) && saved.length ? saved : CONFIG.extractionPoints;
}

function weighted(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) { roll -= entry.weight; if (roll <= 0) return entry; }
  return entries[entries.length - 1];
}

function isAir(block) {
  const id = String(block?.typeId || "");
  return block?.isAir === true || id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air";
}

function isUnsafeFloor(block) {
  const id = String(block?.typeId || "");
  return !block || isAir(block) || id.includes("water") || id.includes("lava") ||
    id.includes("leaves") || id.includes("glass_pane") || id.includes("fence");
}

function standingGround(dimension, x, z, preferredY = CONFIG.cityBaseY) {
  x = Math.floor(x); z = Math.floor(z);
  const candidates = [];
  for (let delta = 0; delta <= 24; delta++) {
    candidates.push(preferredY + delta);
    if (delta) candidates.push(preferredY - delta);
  }
  for (const floorY of candidates) {
    try {
      const floor = dimension.getBlock({ x, y: floorY, z });
      const feet = dimension.getBlock({ x, y: floorY + 1, z });
      const head = dimension.getBlock({ x, y: floorY + 2, z });
      if (!isUnsafeFloor(floor) && isAir(feet) && isAir(head)) return { x: x + 0.5, y: floorY + 1, z: z + 0.5 };
    } catch {}
  }
  try {
    const top = dimension.getTopmostBlock({ x, z });
    if (top && top.location.y < 315 && !isUnsafeFloor(top)) {
      const feet = dimension.getBlock({ x, y: top.location.y + 1, z });
      const head = dimension.getBlock({ x, y: top.location.y + 2, z });
      if (isAir(feet) && isAir(head)) return { x: x + 0.5, y: top.location.y + 1, z: z + 0.5 };
    }
  } catch {}
  return null;
}

function safeGround(dimension, x, z, searchRadius = 16) {
  const direct = standingGround(dimension, x, z);
  if (direct) return direct;
  for (let radius = 4; radius <= searchRadius; radius += 4) {
    for (let step = 0; step < 16; step++) {
      const angle = (Math.PI * 2 * step / 16) + radius * 0.13;
      const found = standingGround(dimension, x + Math.cos(angle) * radius, z + Math.sin(angle) * radius);
      if (found) return found;
    }
  }
  return null;
}

function storeReturn(player) {
  try {
    player.setDynamicProperty(CONFIG.returnKey, JSON.stringify({ dimension: player.dimension.id, ...player.location }));
  } catch {}
}

function waitTicks(ticks) {
  if (typeof system.waitTicks === "function") return system.waitTicks(ticks);
  return new Promise(resolve => system.runTimeout(resolve, ticks));
}

function placePackStructure(dimension, structureId, location) {
  const id = String(structureId || "");
  if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/i.test(id)) throw new Error(`invalid structure id: ${id}`);
  try {
    // Nested ids must be quoted or the Bedrock command parser treats `/` as
    // an unexpected token.
    dimension.runCommand(`structure load "${id}" ${location.x} ${location.y} ${location.z}`);
  } catch (commandError) {
    throw new Error(`structure ${id}: command=${commandError}`);
  }
}

async function withTickingArea(dimension, areaId, from, to, action) {
  let created = false;
  try {
    try { dimension.runCommand(`tickingarea remove ${areaId}`); } catch {}
    try {
      dimension.runCommand(`tickingarea add ${from.x} ${from.y} ${from.z} ${to.x} ${to.y} ${to.z} ${areaId} true`);
      created = true;
    } catch (error) { console.warn(`[ExtractionCity] ticking area ${areaId} unavailable: ${error}`); }
    return await action();
  } finally {
    if (created) try { dimension.runCommand(`tickingarea remove ${areaId}`); } catch {}
  }
}

async function buildCityFoundation(dimension) {
  const half = CONFIG.cityHalfSize;
  const size = CONFIG.cityTileSize;
  let tileIndex = 0;
  for (let minX = -half; minX < half; minX += size) {
    for (let minZ = -half; minZ < half; minZ += size) {
      const maxX = Math.min(half - 1, minX + size - 1);
      const maxZ = Math.min(half - 1, minZ + size - 1);
      const areaId = `extract_foundation_${tileIndex++}`;
      await withTickingArea(
        dimension,
        areaId,
        { x: minX, y: CONFIG.cityBaseY - 1, z: minZ },
        { x: maxX, y: CONFIG.cityBaseY + 4, z: maxZ },
        async () => {
          dimension.runCommand(`fill ${minX} ${CONFIG.cityBaseY} ${minZ} ${maxX} ${CONFIG.cityBaseY} ${maxZ} minecraft:deepslate_tiles`);
          await waitTicks(1);
        }
      );
    }
  }

  // Dense permanent road grid between Jigsaw districts. It is placed before
  // structures, so buildings can overwrite it while uncovered gaps remain
  // navigable streets instead of a featureless deepslate square.
  const roadCoordinates = [-256, -128, 0, 128, 256];
  for (const coordinate of roadCoordinates) {
    dimension.runCommand(`fill ${-half} ${CONFIG.cityBaseY + 1} ${coordinate - 5} ${half - 1} ${CONFIG.cityBaseY + 1} ${coordinate + 5} minecraft:stone_bricks`);
    dimension.runCommand(`fill ${coordinate - 5} ${CONFIG.cityBaseY + 1} ${-half} ${coordinate + 5} ${CONFIG.cityBaseY + 1} ${half - 1} minecraft:stone_bricks`);
    await waitTicks(1);
  }
}

async function placeDistrict(dimension, center, index) {
  const areaId = `extract_district_${index}`;
  return withTickingArea(
    dimension,
    areaId,
    { x: center.x - 72, y: 56, z: center.z - 72 },
    { x: center.x + 72, y: 192, z: center.z + 72 },
    async () => {
      // Jigsaw placement can report command success without creating any
      // pieces in a runtime-registered void dimension. Load the packaged
      // 16x16 building structures directly so command success equals a real
      // building deployment. Nine buildings per district = 225 city blocks.
      const offsets = [-40, -8, 24];
      const buildings = ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9"];
      let loaded = 0;
      for (let row = 0; row < offsets.length; row++) {
        for (let column = 0; column < offsets.length; column++) {
          const structure = buildings[(index * 3 + row * 3 + column) % buildings.length];
          const x = center.x + offsets[column], z = center.z + offsets[row];
          placePackStructure(dimension, `village:custom/houses/${structure}`, { x, y: CONFIG.cityBaseY + 1, z });
          try {
            dimension.runCommand(`fill ${x} ${CONFIG.cityBaseY + 1} ${z} ${x + 15} ${CONFIG.cityBaseY + 64} ${z + 15} daily:loot_crate_common replace minecraft:mob_spawner`);
          } catch {
            try { dimension.runCommand(`fill ${x} ${CONFIG.cityBaseY + 1} ${z} ${x + 15} ${CONFIG.cityBaseY + 64} ${z + 15} minecraft:chest replace minecraft:mob_spawner`); } catch {}
          }
          loaded++;
          await waitTicks(1);
        }
      }
      dimension.runCommand(`setblock ${center.x} ${CONFIG.cityBaseY - 1} ${center.z} minecraft:bedrock`);
      return loaded;
    }
  );
}

function addFallbackLootNode(nodes, location, tier) {
  const x = Math.floor(location.x), y = Math.floor(location.y), z = Math.floor(location.z);
  if (nodes.some(node => node.dimension === CONFIG.dimensionId && node.x === x && node.y === y && node.z === z)) return;
  nodes.push({
    id: `extract_loot_${x}_${y}_${z}`,
    type: tier === "epic" || tier === "legendary" ? "military" : tier === "rare" ? "medical" : "tools",
    dimension: CONFIG.dimensionId,
    x, y, z,
    respawnMinutes: tier === "legendary" ? 120 : tier === "epic" ? 60 : tier === "rare" ? 30 : 15,
    lastLooted: 0,
    createdBy: "Apocalypse Extraction City"
  });
}

async function placeLootCrates(dimension) {
  let existingNodes = [];
  try { existingNodes = parse(world.getDynamicProperty(CONFIG.lootNodesKey), []); } catch {}
  const fallbackNodes = Array.isArray(existingNodes) ? existingNodes.slice() : [];
  let placed = 0;
  for (let districtIndex = 0; districtIndex < CONFIG.districtCenters.length; districtIndex++) {
    const center = CONFIG.districtCenters[districtIndex];
    await withTickingArea(
      dimension,
      `extract_crates_${districtIndex}`,
      { x: center.x - 64, y: 56, z: center.z - 64 },
      { x: center.x + 64, y: 192, z: center.z + 64 },
      async () => {
        const layout = districtIndex === 12
          ? [...CRATE_LAYOUT, { dx: 0, dz: 18, tier: "mythic" }]
          : CRATE_LAYOUT;
        for (const crate of layout) {
          let ground = safeGround(dimension, center.x + crate.dx, center.z + crate.dz, 18);
          // Some custom-dimension builds do not expose getTopmostBlock while a
          // freshly added ticking area is warming up. Use the permanent road
          // deck as a deterministic fallback instead of reporting zero crates.
          if (!ground) {
            const fallbackOffsets = [[3, 12], [-3, -12], [12, 3], [-12, -3], [0, 18]];
            const fallback = fallbackOffsets[Math.min(layout.indexOf(crate), fallbackOffsets.length - 1)];
            const x = center.x + fallback[0], z = center.z + fallback[1];
            try {
              dimension.runCommand(`setblock ${x} ${CONFIG.cityBaseY + 1} ${z} minecraft:stone_bricks`);
              dimension.runCommand(`fill ${x} ${CONFIG.cityBaseY + 2} ${z} ${x} ${CONFIG.cityBaseY + 3} ${z} minecraft:air`);
              ground = { x: x + 0.5, y: CONFIG.cityBaseY + 2, z: z + 0.5 };
            } catch { continue; }
          }
          const location = { x: Math.floor(ground.x), y: Math.floor(ground.y), z: Math.floor(ground.z) };
          const block = dimension.getBlock(location);
          if (!block || !isAir(block)) continue;
          try {
            block.setType(`daily:loot_crate_${crate.tier}`);
          } catch {
            try {
              block.setType("apoc:loot_crate");
              addFallbackLootNode(fallbackNodes, location, crate.tier);
            } catch { continue; }
          }
          placed++;
        }
        await waitTicks(1);
      }
    );
  }
  try { world.setDynamicProperty(CONFIG.lootNodesKey, JSON.stringify(fallbackNodes.slice(-300))); } catch {}
  try { world.setDynamicProperty("apoc_extract:crate_count:v1", placed); } catch {}
  return placed;
}

async function placeExtractionMarkers(dimension) {
  let placed = 0;
  for (let index = 0; index < CONFIG.extractionPoints.length; index++) {
    const point = CONFIG.extractionPoints[index];
    await withTickingArea(
      dimension,
      `extract_exit_${index}`,
      { x: point.x - 16, y: 56, z: point.z - 16 },
      { x: point.x + 16, y: 192, z: point.z + 16 },
      async () => {
        let ground = standingGround(dimension, point.x, point.z);
        if (!ground) {
          // Exit coordinates sit on the city foundation. Recreate a tiny road
          // pad directly so exits remain usable even when surface queries fail.
          try {
            dimension.runCommand(`fill ${point.x - 2} ${CONFIG.cityBaseY + 1} ${point.z - 2} ${point.x + 2} ${CONFIG.cityBaseY + 1} ${point.z + 2} minecraft:stone_bricks`);
            dimension.runCommand(`fill ${point.x - 2} ${CONFIG.cityBaseY + 2} ${point.z - 2} ${point.x + 2} ${CONFIG.cityBaseY + 7} ${point.z + 2} minecraft:air`);
            ground = { x: point.x + 0.5, y: CONFIG.cityBaseY + 2, z: point.z + 0.5 };
          } catch { return; }
        }
        const x = Math.floor(ground.x), y = Math.floor(ground.y), z = Math.floor(ground.z);
        try {
          dimension.runCommand(`fill ${x - 2} ${y - 1} ${z - 2} ${x + 2} ${y - 1} ${z + 2} minecraft:lime_concrete`);
          dimension.runCommand(`fill ${x} ${y} ${z} ${x} ${y + 4} ${z} minecraft:lime_stained_glass`);
          dimension.getBlock({ x, y: y + 5, z })?.setType("minecraft:sea_lantern");
          placed++;
        } catch {}
        await waitTicks(1);
      }
    );
  }
  return placed;
}

async function buildCity(dimension) {
  console.warn("[ExtractionCity] building persistent 5x5 city districts, connector streets and void foundation...");
  await buildCityFoundation(dimension);

  let generated = 0;
  for (let index = 0; index < CONFIG.districtCenters.length; index++) {
    const center = CONFIG.districtCenters[index];
    try {
      generated += await placeDistrict(dimension, center, index);
    } catch (error) {
      console.warn(`[ExtractionCity] district ${index + 1} placement failed: ${error}`);
    }
  }

  const expectedBuildings = CONFIG.districtCenters.length * 9;
  if (generated !== expectedBuildings) {
    throw new Error(`Dense city placement incomplete: ${generated}/${expectedBuildings} direct structures. The city was not marked ready and will retry next entry.`);
  }
  const exits = await placeExtractionMarkers(dimension);
  const crates = await placeLootCrates(dimension);
  try {
    world.setDynamicProperty(CONFIG.cityReadyKey, true);
    world.setDynamicProperty(CONFIG.cityReadyBackupKey, Date.now());
    world.setDynamicProperty("apoc_extract:exit_count:v1", exits);
    world.setDynamicProperty("apoc_extract:crate_count:v1", crates);
    world.setDynamicProperty(CONFIG.cityLayoutVersionKey, CONFIG.cityLayoutVersion);
    cityReadyInSession = true;
    cityServicesCheckedInSession = true;
  } catch {}
  try {
    await withTickingArea(
      dimension,
      "extract_city_sentinel",
      { x: -4, y: 56, z: -4 },
      { x: 4, y: 72, z: 4 },
      async () => dimension.getBlock(CONFIG.citySentinel)?.setType("minecraft:bedrock")
    );
  } catch {}
  try {
    await withTickingArea(
      dimension,
      "extract_city_layout_sentinel",
      { x: -4, y: 56, z: -4 },
      { x: 4, y: 72, z: 4 },
      async () => dimension.getBlock(CONFIG.cityLayoutSentinel)?.setType("minecraft:redstone_block")
    );
  } catch {}
  console.warn(`[ExtractionCity] persistent city ready: ${generated}/${expectedBuildings} direct buildings, ${exits} exit markers, ${crates} loot crates placed.`);
}

function readyFlagStored() {
  try {
    return Number(world.getDynamicProperty(CONFIG.cityLayoutVersionKey) || 0) >= CONFIG.cityLayoutVersion;
  } catch { return false; }
}

function cityPhysicallyPresent(dimension) {
  let ticking = false;
  try {
    try {
      dimension.runCommand("tickingarea remove extract_city_probe");
      dimension.runCommand("tickingarea add -8 56 -8 8 80 8 extract_city_probe true");
      ticking = true;
    } catch {}
    return dimension.getBlock(CONFIG.cityLayoutSentinel)?.typeId === "minecraft:redstone_block";
  } catch { return false; }
  finally { if (ticking) try { dimension.runCommand("tickingarea remove extract_city_probe"); } catch {} }
}

async function ensureCityServices(dimension) {
  if (cityServicesCheckedInSession) return;
  cityServicesCheckedInSession = true;
  let recordedExits = 0, recordedCrates = 0;
  try {
    recordedExits = Number(world.getDynamicProperty("apoc_extract:exit_count:v1") || 0);
    recordedCrates = Number(world.getDynamicProperty("apoc_extract:crate_count:v1") || 0);
  } catch {}
  if (recordedExits >= CONFIG.extractionPoints.length && recordedCrates > 0) return;
  console.warn("[ExtractionCity] city exists; repairing exit markers and loot crates without rebuilding districts...");
  const exits = await placeExtractionMarkers(dimension);
  const crates = await placeLootCrates(dimension);
  try {
    world.setDynamicProperty("apoc_extract:exit_count:v1", exits);
    world.setDynamicProperty("apoc_extract:crate_count:v1", crates);
  } catch {}
  console.warn(`[ExtractionCity] city service repair complete: ${exits} exits, ${crates} crates.`);
}

async function ensureCityReady(dimension, force = false) {
  if (!force && (cityReadyInSession || readyFlagStored() || cityPhysicallyPresent(dimension))) {
    cityReadyInSession = true;
    try {
      world.setDynamicProperty(CONFIG.cityReadyKey, true);
      world.setDynamicProperty(CONFIG.cityReadyBackupKey, Date.now());
      world.setDynamicProperty(CONFIG.cityLayoutVersionKey, CONFIG.cityLayoutVersion);
    } catch {}
    try { dimension.getBlock(CONFIG.citySentinel)?.setType("minecraft:bedrock"); } catch {}
    await ensureCityServices(dimension);
    return;
  }
  if (!cityBuildPromise) cityBuildPromise = buildCity(dimension);
  const pending = cityBuildPromise;
  try { await pending; }
  finally { if (cityBuildPromise === pending) cityBuildPromise = null; }
}

function returnPlayer(player, reason = "已离开摸金都市。") {
  let saved = parse(player.getDynamicProperty(CONFIG.returnKey), null);
  let dimension;
  try { dimension = world.getDimension(saved?.dimension || "minecraft:overworld"); }
  catch { dimension = world.getDimension("minecraft:overworld"); saved = null; }
  let location = saved && [saved.x, saved.y, saved.z].every(Number.isFinite) ? saved : world.getDefaultSpawnLocation();
  try {
    player.teleport(location, { dimension });
    player.removeTag(CONFIG.activeTag);
    player.setDynamicProperty(CONFIG.activeStateKey, undefined);
    player.setDynamicProperty(CONFIG.returnKey, undefined);
    backpackSnapshots.delete(player.id);
    try { player.runCommand(`fog @s remove ${CONFIG.fogStackId}`); } catch {}
    player.sendMessage(`§a[撤离] ${reason}`);
  } catch (error) { player.sendMessage(`§c撤离失败：${error}`); }
}

function applyExtractionEnvironment(player) {
  try { player.runCommand(`fog @s push ${CONFIG.fogId} ${CONFIG.fogStackId}`); } catch {}
}

function prepareArrivalPad(dimension, point) {
  // District centres are aligned to the permanent road grid. A deterministic
  // pad avoids custom-dimension surface-query failures and building interiors.
  const x = Math.floor(point.x + 3);
  const z = Math.floor(point.z + 10);
  const floorY = CONFIG.cityBaseY + 1;
  try {
    dimension.runCommand(`fill ${x - 2} ${floorY} ${z - 2} ${x + 2} ${floorY} ${z + 2} minecraft:stone_bricks`);
    dimension.runCommand(`fill ${x - 2} ${floorY + 1} ${z - 2} ${x + 2} ${floorY + 5} ${z + 2} minecraft:air`);
    dimension.runCommand(`setblock ${x} ${floorY} ${z} minecraft:yellow_concrete`);
    return { x: x + 0.5, y: floorY + 1, z: z + 0.5 };
  } catch { return null; }
}

function enforceKeepInventory() {
  try { world.gameRules.keepInventory = true; } catch {}
  try { world.getDimension("minecraft:overworld").runCommand("gamerule keepinventory true"); } catch {}
}

async function enter(player) {
  const dimension = extractionDimension();
  if (!dimension) {
    let bootstrapAlive = false;
    let bootstrapError = "";
    try {
      const heartbeat = Number(world.getDynamicProperty(DIMENSION_BOOTSTRAP_HEARTBEAT) || 0);
      bootstrapAlive = heartbeat > 0 && Date.now() - heartbeat < 15000;
      bootstrapError = String(world.getDynamicProperty(DIMENSION_BOOTSTRAP_ERROR) || "");
    } catch {}
    const detail = bootstrapError ? `\n§8注册错误：${bootstrapError}` : "";
    player.sendMessage(bootstrapAlive
      ? `§cBeta 引导脚本在线，但摸金维度没有成功注册。${detail}`
      : `§c摸金维度引导包没有启动。请启用 Apocalypse Extraction Dimension Bootstrap v0.1.0 与 Beta APIs。${detail}`);
    return;
  }
  player.sendMessage("§e[摸金都市] 正在确认城市状态。若旧版只有平台，将一次性部署 225 个实际建筑；完成后永久复用……");
  try { await ensureCityReady(dimension); }
  catch (error) {
    player.sendMessage(`§c城市结构初始化失败：${error}`);
    console.error(`[ExtractionCity] city initialization failed: ${error}`);
    return;
  }
  storeReturn(player);
  const point = CONFIG.entryPoints[Math.floor(Math.random() * CONFIG.entryPoints.length)];
  const x = point.x + 3;
  const z = point.z + 10;
  const arrivalAreaId = `apoc_extract_arrival_${String(player.id).replace(/[^a-zA-Z0-9_]/g, "").slice(-12)}`;
  try { dimension.runCommand(`tickingarea remove ${arrivalAreaId}`); } catch {}
  try {
    dimension.runCommand(`tickingarea add ${Math.floor(x) - 8} 54 ${Math.floor(z) - 8} ${Math.floor(x) + 8} 180 ${Math.floor(z) + 8} ${arrivalAreaId} true`);
  } catch (error) { console.warn(`[ExtractionCity] arrival ticking area unavailable: ${error}`); }
  system.runTimeout(() => {
    try {
      const location = { x: x + 0.5, y: CONFIG.airDropY, z: z + 0.5 };
      player.teleport(location, { dimension });
      player.addTag(CONFIG.activeTag);
      player.setDynamicProperty(CONFIG.activeStateKey, true);
      player.addEffect("resistance", 100, { amplifier: 4, showParticles: false });
      player.addEffect("slow_falling", CONFIG.airDropSlowFallingTicks, { amplifier: 0, showParticles: true });
      applyExtractionEnvironment(player);
      snapshotBackpack(player);
      const exit = nearestExit(player);
      player.sendMessage(`§6[摸金都市] 已在 ${point.name} 上空投放，并获得 60 秒缓降。最近撤离点：§a${exit?.name || "未知"} §8(${Math.floor(exit?.distance || 0)}m，${exit?.x || 0}, ${exit?.z || 0})§6。跟随屏幕撤离向导，进入撤离点 ${CONFIG.extractionRadius} 格范围后会自动开始倒计时。`);
    } catch (error) { player.sendMessage(`§c进入失败：${error}`); }
    system.runTimeout(() => { try { dimension.runCommand(`tickingarea remove ${arrivalAreaId}`); } catch {} }, 100);
  }, 30);
}

function nearestExit(player) {
  return points().map(point => ({ ...point, distance: distance2D(player.location, point) })).sort((a, b) => a.distance - b.distance)[0] || null;
}

function startExtraction(player) {
  const point = nearestExit(player);
  if (!point || point.distance > CONFIG.extractionRadius) {
    player.sendMessage(`§c需要进入撤离点 ${CONFIG.extractionRadius} 格范围。最近：${point?.name || "无"}（${Math.floor(point?.distance || 0)}格）`);
    return;
  }
  extractionJobs.set(player.id, { pointId: point.id, startedTick: system.currentTick, origin: { ...player.location } });
  player.sendMessage(`§e[撤离] ${CONFIG.extractionSeconds} 秒倒计时开始，请留在 ${point.name} 的 ${CONFIG.extractionRadius} 格范围内。`);
}

function openMenu(player) {
  const inside = player.dimension.id === CONFIG.dimensionId;
  const point = inside ? nearestExit(player) : null;
  const form = new ActionFormData().title("§l§6末日摸金都市")
    .body(inside
      ? `§0快捷栏 1-9 与穿戴装备受保险保护。\n§4背包槽位 10-36 死亡时全部掉落。\n\n§0最近撤离点：§e${point?.name || "无"} §8(${Math.floor(point?.distance || 0)}格)\n§0进入 ${CONFIG.extractionRadius} 格范围会自动开始撤离；下方按钮与命令仅作为备用。\n§e/scriptevent extract:exit`
      : "§0这是持续开放的最高风险区域，不需要创建战局。\n§025 个密集城区组成约 768×768 的废弃都市；首次升级只生成一次。\n§0都市传说 Boss 会低概率出现。")
    .button(inside ? "§a开始撤离" : "§6随机进入都市", inside ? "textures/ui/confirm" : "textures/ui/World")
    .button("§8关闭", "textures/ui/cancel");
  form.show(player).then(result => {
    if (result.canceled || result.selection !== 0) return;
    if (inside) startExtraction(player); else enter(player);
  }).catch(error => {
    console.warn(`[ExtractionCity] menu failed for ${player.name}: ${error}`);
    try { player.sendMessage(`§c摸金都市菜单打开失败，请直接执行 /scriptevent extract:enter；若仍无响应，请确认行为包 v${CONFIG.version} 已启用。`); } catch {}
  });
}

function captureBackpack(player) {
  try {
    const container = player.getComponent("minecraft:inventory")?.container;
    if (!container) return null;
    const hotbarItems = [];
    const backpackItems = [];
    for (let slot = 0; slot < Math.min(CONFIG.protectedHotbarSlots, container.size); slot++) {
      const item = container.getItem(slot);
      if (item) hotbarItems.push({ slot, item });
    }
    for (let slot = CONFIG.protectedHotbarSlots; slot < container.size; slot++) {
      const item = container.getItem(slot);
      if (item) backpackItems.push({ slot, item });
    }
    const equipmentItems = [];
    try {
      const equippable = player.getComponent("minecraft:equippable");
      for (const slot of INSURED_EQUIPMENT) {
        const item = equippable?.getEquipment(slot);
        if (item) equipmentItems.push({ slot, item });
      }
    } catch {}
    return { hotbarItems, backpackItems, equipmentItems, size: container.size };
  } catch { return null; }
}

function snapshotBackpack(player) {
  try {
    if (player.dimension.id !== CONFIG.dimensionId) return;
    const captured = captureBackpack(player);
    if (!captured) return;
    backpackSnapshots.set(player.id, {
      ...captured,
      dimensionId: CONFIG.dimensionId,
      location: { ...player.location },
      updatedTick: system.currentTick
    });
  } catch {}
}

function clearBackpackSlots(player) {
  try {
    const container = player.getComponent("minecraft:inventory")?.container;
    if (!container) return false;
    for (let slot = CONFIG.protectedHotbarSlots; slot < container.size; slot++) container.setItem(slot, undefined);
    return true;
  } catch { return false; }
}

function restoreInsuredLoadout(player, snapshot) {
  if (!snapshot) return false;
  let restored = false;
  try {
    const container = player.getComponent("minecraft:inventory")?.container;
    if (container) {
      for (let slot = 0; slot < Math.min(CONFIG.protectedHotbarSlots, container.size); slot++) container.setItem(slot, undefined);
      for (const entry of snapshot.hotbarItems || []) container.setItem(entry.slot, entry.item);
      restored = true;
    }
  } catch {}
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      for (const slot of INSURED_EQUIPMENT) equippable.setEquipment(slot, undefined);
      for (const entry of snapshot.equipmentItems || []) equippable.setEquipment(entry.slot, entry.item);
      restored = true;
    }
  } catch {}
  return restored;
}

function extractionSessionActive(player, snapshot) {
  if (snapshot?.dimensionId === CONFIG.dimensionId) return true;
  try { if (player.getDynamicProperty(CONFIG.activeStateKey) === true) return true; } catch {}
  try { return player.hasTag(CONFIG.activeTag); } catch { return false; }
}

function dropBackpack(player, location = null, dimension = null, preferCurrent = false) {
  const cached = backpackSnapshots.get(player.id);
  if (deathHandled.has(player.id) || !extractionSessionActive(player, cached)) return;
  deathHandled.add(player.id);
  const current = captureBackpack(player);
  const dropped = (preferCurrent && current) ? current : (cached || current || { backpackItems: [] });
  const dropLocation = location || cached?.location;
  let dropDimension = dimension;
  if (!dropDimension) {
    try { dropDimension = world.getDimension(cached?.dimensionId || CONFIG.dimensionId); } catch {}
  }
  clearBackpackSlots(player);
  if (dropDimension && dropLocation) for (const entry of dropped.backpackItems || []) {
    try { dropDimension.spawnItem(entry.item, dropLocation); } catch {}
  }
  insuredReturns.set(player.id, {
    hotbarItems: [...(dropped.hotbarItems || [])],
    equipmentItems: [...(dropped.equipmentItems || [])]
  });
  backpackSnapshots.delete(player.id);
  pendingReturn.set(player.id, true);
  try { player.setDynamicProperty(CONFIG.deathReturnKey, true); } catch {}
  try { player.setDynamicProperty(CONFIG.activeStateKey, undefined); } catch {}
  extractionJobs.delete(player.id);
  try { player.removeTag(CONFIG.activeTag); } catch {}
  system.runTimeout(() => deathHandled.delete(player.id), 100);
}

function spawnExtractionMob(player) {
  const nearby = player.dimension.getEntities({ location: player.location, maxDistance: 48, tags: ["apoc_hostile"] });
  if (nearby.length >= CONFIG.hostileCapPerPlayer) return;
  const choice = weighted(CONFIG.mobPool);
  const count = nearby.length < 4 ? 2 : 1;
  for (let index = 0; index < count; index++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 18 + Math.random() * 18;
    const location = safeGround(
      player.dimension,
      player.location.x + Math.cos(angle) * radius,
      player.location.z + Math.sin(angle) * radius,
      10
    );
    if (!location) continue;
    try {
      const entity = player.dimension.spawnEntity(APOCALYPSE_MOBS[choice.key] || APOCALYPSE_MOBS.mutant, location);
      entity.addTag("apoc_hostile");
      entity.addTag("apoc_director");
      entity.addTag("apoc_extraction_hostile");
      entity.addTag("apoc_zone_extraction");
    } catch (error) {
      if (system.currentTick - mobSpawnFailureNoticeTick >= 1200) {
        mobSpawnFailureNoticeTick = system.currentTick;
        console.warn(`[ExtractionCity] Apocalypse mob spawn failed; verify Apocalypse Mobs is active: ${error}`);
      }
    }
  }
}

function spawnHordeWave(player, wave) {
  const waves = [
    ["runner", "runner", "basic", "basic", "spitter", "shrieker"],
    ["runner", "spitter", "shrieker", "charger", "hunter", "hunter"],
    ["heavy", "charger", "hunter", "mutant", "tyrant"]
  ];
  let spawned = 0;
  for (const key of waves[Math.max(0, Math.min(2, wave - 1))]) {
    const angle = Math.random() * Math.PI * 2;
    const location = safeGround(player.dimension, player.location.x + Math.cos(angle) * (18 + Math.random() * 12), player.location.z + Math.sin(angle) * (18 + Math.random() * 12), 12);
    if (!location) continue;
    try {
      const entity = player.dimension.spawnEntity(APOCALYPSE_MOBS[key], location);
      for (const tag of ["apoc_hostile", "apoc_director", "apoc_extraction_hostile", "apoc_zone_extraction", "apoc_extraction_horde"]) entity.addTag(tag);
      spawned++;
    } catch {}
  }
  world.sendMessage(`§4[摸金尸潮] 第 ${wave}/3 波来袭，侦测到 ${spawned} 个目标！`);
}

function tickHorde(allowStart = false) {
  const players = world.getAllPlayers().filter(player => player.dimension.id === CONFIG.dimensionId);
  if (!players.length) { activeHorde = null; return; }
  const now = system.currentTick;
  if (!activeHorde) {
    if (!allowStart || now < nextHordeAllowedTick || Math.random() >= CONFIG.hordeChancePerCheck) return;
    activeHorde = { wave: 1, startedTick: now, nextWaveTick: now + CONFIG.hordeWaveTimeoutTicks };
    world.sendMessage("§c[都市警报] 尸潮正在向城区聚集！共三波，寻找掩体并准备交战。");
    spawnHordeWave(players[Math.floor(Math.random() * players.length)], 1);
    return;
  }
  let alive = 0;
  try { alive = players[0].dimension.getEntities({ tags: ["apoc_extraction_horde"] }).length; } catch {}
  if (activeHorde.wave < 3 && (alive === 0 || now >= activeHorde.nextWaveTick)) {
    activeHorde.wave++;
    activeHorde.nextWaveTick = now + CONFIG.hordeWaveTimeoutTicks;
    spawnHordeWave(players[Math.floor(Math.random() * players.length)], activeHorde.wave);
  } else if (activeHorde.wave === 3 && alive === 0) {
    world.sendMessage("§a[摸金尸潮] 尸潮已被击退，城区暂时恢复平静。");
    activeHorde = null;
    nextHordeAllowedTick = now + CONFIG.hordeCooldownTicks;
  }
}

function cleanupVanillaHostiles(dimension) {
  for (const typeId of VANILLA_HOSTILES) {
    let entities = [];
    try { entities = dimension.getEntities({ type: typeId }); } catch {}
    for (const entity of entities) {
      try { if (!entity.hasTag("apoc_extraction_allowed")) entity.remove(); } catch {}
    }
  }
}

function spawnBoss(player, force = false) {
  const existing = player.dimension.getEntities({ tags: ["apoc_extraction_boss"] });
  if (existing.length) return { spawned: false, reason: "existing", entity: existing[0] };
  if (!force && Math.random() >= CONFIG.bossChancePerCheck) return { spawned: false, reason: "chance" };
  const profile = weighted(CONFIG.bossPool);
  const angle = Math.random() * Math.PI * 2;
  const location = safeGround(player.dimension, player.location.x + Math.cos(angle) * 45, player.location.z + Math.sin(angle) * 45);
  if (!location) return { spawned: false, reason: "ground" };
  try {
    const boss = player.dimension.spawnEntity(profile.id, location);
    boss.addTag("apoc_extraction_boss"); boss.addTag("apoc_hostile"); boss.addTag("apoc_zone_extraction");
    world.sendMessage(`§4[都市警报] ${profile.urbanLegend ? "都市传说" : "变异首领"}已在摸金都市出现：${profile.id}`);
    return { spawned: true, id: profile.id, entity: boss };
  } catch (error) {
    console.warn(`[ExtractionCity] boss ${profile.id} unavailable: ${error}`);
    return { spawned: false, reason: "unavailable", error };
  }
}

function command(player, message) {
  const args = String(message).trim().split(/\s+/);
  if (args[0].toLowerCase() !== "!extract") return false;
  if (args[1] === "enter") enter(player);
  else if (args[1] === "exit") startExtraction(player);
  else if (args[1] === "point" && args[2] === "add" && isAdmin(player) && player.dimension.id === CONFIG.dimensionId) {
    const list = points().slice();
    const id = `custom_${Date.now().toString(36)}`;
    list.push({ id, name: args.slice(3).join(" ") || `自定义撤离点 ${list.length + 1}`, x: Math.floor(player.location.x), z: Math.floor(player.location.z) });
    world.setDynamicProperty(CONFIG.pointsKey, JSON.stringify(list.slice(-32)));
    player.sendMessage("§a已将当前位置加入撤离点列表。");
  } else if (args[1] === "point" && args[2] === "reset" && isAdmin(player)) {
    world.setDynamicProperty(CONFIG.pointsKey, undefined); player.sendMessage("§a撤离点已恢复默认配置。");
  } else openMenu(player);
  return true;
}

enforceKeepInventory();
try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}

subscribe(world.afterEvents?.entityHurt, "entityHurt", event => {
  const player = event.hurtEntity;
  if (player?.typeId !== "minecraft:player" || !extractionSessionActive(player, backpackSnapshots.get(player.id))) return;
  try {
    const health = player.getComponent("minecraft:health");
    if (health && health.currentValue <= 0) {
      const cached = backpackSnapshots.get(player.id);
      dropBackpack(player, cached?.location, extractionDimension(), true);
    }
  } catch {}
});

subscribe(world.afterEvents?.entityDie, "entityDie", event => {
  const player = event.deadEntity;
  if (player?.typeId === "minecraft:player") {
    try {
      const cached = backpackSnapshots.get(player.id);
      dropBackpack(player, cached?.location, extractionDimension());
    } catch {}
  }
});

subscribe(world.afterEvents?.playerSpawn, "playerSpawn", event => {
  if (event.initialSpawn && isAdmin(event.player)) {
    system.runTimeout(() => {
      try { event.player.sendMessage(`§a[摸金都市] 行为脚本 v${CONFIG.version} 已加载，菜单与原版 /scriptevent 入口可用。`); } catch {}
    }, 40);
  }
  let shouldReturn = pendingReturn.delete(event.player.id);
  try { shouldReturn ||= event.player.getDynamicProperty(CONFIG.deathReturnKey) === true; } catch {}
  if (!shouldReturn) return;
  try { event.player.setDynamicProperty(CONFIG.deathReturnKey, undefined); } catch {}
  system.runTimeout(() => {
    const insured = insuredReturns.get(event.player.id);
    clearBackpackSlots(event.player);
    restoreInsuredLoadout(event.player, insured);
    insuredReturns.delete(event.player.id);
    returnPlayer(event.player, "行动失败，已返回安全区域；背包物资留在死亡地点。");
  }, 20);
});

subscribe(world.afterEvents?.entitySpawn, "entitySpawn", event => {
  const entity = event.entity;
  if (!entity || !VANILLA_HOSTILES.has(entity.typeId)) return;
  system.run(() => {
    try {
      if (entity.dimension.id === CONFIG.dimensionId && !entity.hasTag("apoc_extraction_allowed")) entity.remove();
    } catch {}
  });
});

subscribe(world.beforeEvents?.chatSend, "chatSend", event => {
  if (!String(event.message).toLowerCase().startsWith("!extract")) return;
  event.cancel = true;
  system.run(() => command(event.sender, event.message));
});

subscribe(system.afterEvents?.scriptEventReceive, "scriptEventReceive", event => {
  const { player, message } = scriptEventContext(event);
  if (!player) {
    if (String(event.id || "").startsWith("extract:")) {
      console.warn(`[ExtractionCity] ignored ${event.id}: player source could not be resolved.`);
      try { world.sendMessage("§c[摸金都市] 已收到指令，但无法识别发起玩家。请从 SAPI 菜单进入，或由玩家本人执行指令。"); } catch {}
    }
    return;
  }
  if (event.id === "extract:menu") {
    acknowledgeMenuRequest(player, message);
  }
  else if (event.id === "extract:enter") system.run(() => enter(player));
  else if (event.id === "extract:exit") system.run(() => startExtraction(player));
  else if (event.id === "extract:exits") system.run(() => {
    if (player.dimension.id !== CONFIG.dimensionId) return player.sendMessage("§c请先进入摸金都市。");
    const nearest = points().map(point => ({ ...point, distance: distance2D(player.location, point) })).sort((a, b) => a.distance - b.distance).slice(0, 5);
    player.sendMessage(`§6[撤离点]\n${nearest.map(point => `§e${point.name} §8- ${Math.floor(point.distance)}m §0(${point.x}, ${point.z})`).join("\n")}\n§0寻找绿色信标，进入 ${CONFIG.extractionRadius} 格范围会自动开始撤离。`);
  });
  else if (event.id === "extract:status" && isAdmin(player)) system.run(() => {
    const ready = world.getDynamicProperty(CONFIG.cityReadyKey) === true;
    const heartbeat = Number(world.getDynamicProperty(CONFIG.apocalypseHeartbeatKey) || 0);
    const crates = Number(world.getDynamicProperty("apoc_extract:crate_count:v1") || 0);
    const dimension = extractionDimension();
    const bosses = dimension ? dimension.getEntities({ tags: ["apoc_extraction_boss"] }).length : 0;
    player.sendMessage(`§6[摸金都市状态] §0v${CONFIG.version}\n§0扩展城区：${ready ? "§a已生成" : "§c未生成"}\n§0Apocalypse Mobs：${heartbeat && Date.now() - heartbeat < 30000 ? "§a已连接" : "§c未连接"}\n§0已布置物资箱：§e${crates}\n§0当前 Boss：§e${bosses}`);
  });
  else if (event.id === "extract:boss" && isAdmin(player)) system.run(() => {
    if (player.dimension.id !== CONFIG.dimensionId) return player.sendMessage("§c请先进入摸金都市再测试 Boss。");
    const result = spawnBoss(player, true);
    if (result?.spawned) return player.sendMessage(`§a已在附近生成 Boss：${result.id}`);
    if (result?.reason === "existing") return player.sendMessage("§e摸金维度中已有一个存活的 Boss；击败后才能生成下一个。");
    if (result?.reason === "ground") return player.sendMessage("§c附近没有可用生成地面，请移动到城区道路后重试。");
    player.sendMessage("§cBoss 生成失败，请检查 Apocalypse Mobs 是否启用并查看内容日志。");
  });
  else if (event.id === "extract:rebuild" && isAdmin(player)) system.run(async () => {
    const dimension = extractionDimension();
    if (!dimension) return player.sendMessage("§c摸金维度不可用。");
    player.sendMessage("§e正在一次性升级为 25 个密集城区、铺设连接道路并重新布置物资箱，请等待 1～3 分钟……");
    try {
      world.setDynamicProperty(CONFIG.cityReadyKey, undefined);
      await ensureCityReady(dimension, true);
      player.sendMessage("§a摸金都市扩建与修复完成。");
    } catch (error) {
      player.sendMessage(`§c摸金都市重建失败：${error}`);
      console.error(`[ExtractionCity] manual rebuild failed: ${error}`);
    }
  });
});

system.runInterval(() => {
  try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}
  for (const player of world.getAllPlayers()) {
    try {
      const requestId = Number(player.getDynamicProperty(CONFIG.menuRequestKey) || 0);
      const acknowledged = Number(player.getDynamicProperty(CONFIG.menuAckKey) || 0);
      if (requestId && requestId !== acknowledged) acknowledgeMenuRequest(player, requestId);
    } catch {}
    if (player.dimension.id !== CONFIG.dimensionId) continue;
    snapshotBackpack(player);
    if (system.currentTick % 100 === 0) applyExtractionEnvironment(player);
    const point = nearestExit(player);
    if (point && point.distance <= CONFIG.extractionRadius && !extractionJobs.has(player.id)) {
      startExtraction(player);
      continue;
    }
    if (point && !extractionJobs.has(player.id) && system.currentTick % 40 === 0) {
      const near = point.distance <= 32 ? "§a已接近" : "§6向导";
      player.onScreenDisplay.setActionBar(`${near} §f${point.name} §e${Math.floor(point.distance)}m §8| §0${point.x},${point.z} §8| §e/scriptevent extract:exits`);
    }
    const job = extractionJobs.get(player.id);
    if (!job) continue;
    const activePoint = points().find(value => value.id === job.pointId);
    if (!activePoint || distance2D(player.location, activePoint) > CONFIG.extractionRadius) {
      extractionJobs.delete(player.id); player.sendMessage("§c[撤离] 已离开撤离点，倒计时取消。"); continue;
    }
    const elapsed = system.currentTick - job.startedTick;
    const remaining = CONFIG.extractionSeconds - Math.floor(elapsed / 20);
    player.onScreenDisplay.setActionBar(`§e撤离倒计时：${Math.max(0, remaining)}秒`);
    if (elapsed >= CONFIG.extractionSeconds * 20) { extractionJobs.delete(player.id); returnPlayer(player, "撤离成功，已保全全部携带物资。"); }
  }
}, 10);

system.runInterval(enforceKeepInventory, 200);

system.runInterval(() => {
  const players = world.getAllPlayers().filter(player => player.dimension.id === CONFIG.dimensionId);
  if (players.length) cleanupVanillaHostiles(players[0].dimension);
  for (const player of players) try { spawnExtractionMob(player); } catch {}
}, CONFIG.hostileSpawnIntervalTicks);

system.runInterval(() => {
  for (const player of world.getAllPlayers()) if (player.dimension.id === CONFIG.dimensionId) try { spawnBoss(player); } catch {}
}, CONFIG.bossCheckIntervalTicks);

system.runInterval(() => {
  try { tickHorde(true); } catch (error) { console.warn(`[ExtractionCity] horde start check failed: ${error}`); }
}, CONFIG.hordeCheckIntervalTicks);

system.runInterval(() => {
  try { tickHorde(false); } catch (error) { console.warn(`[ExtractionCity] active horde tick failed: ${error}`); }
}, 40);

console.warn(`[ExtractionCity] v${CONFIG.version} dense city, regional Apocalypse special infected, random hordes, loot crates, exits and dusk fog initialized.`);
