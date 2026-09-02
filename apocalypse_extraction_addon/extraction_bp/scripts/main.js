import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { CONFIG } from "./config.js";

let dimensionRegistrationError = "";
const startupSignal = system.beforeEvents?.startup;
if (startupSignal && typeof startupSignal.subscribe === "function") {
  startupSignal.subscribe(event => {
    try {
      event.dimensionRegistry.registerCustomDimension(CONFIG.dimensionId);
      console.warn(`[ExtractionCity] registered custom dimension ${CONFIG.dimensionId}.`);
    } catch (error) {
      dimensionRegistrationError = String(error);
      console.error(`[ExtractionCity] custom dimension registration failed: ${error}`);
    }
  });
} else {
  dimensionRegistrationError = "system.beforeEvents.startup / DimensionRegistry unavailable";
}

console.warn(`[ExtractionCity] v${CONFIG.version} initializing...`);

const extractionJobs = new Map();
const deathHandled = new Set();
const pendingReturn = new Map();
const backpackSnapshots = new Map();
let mobSpawnFailureNoticeTick = -1200;
let cityBuildPromise = null;

const APOCALYPSE_MOBS = Object.freeze({
  basic: "apoc:infected_basic",
  runner: "apoc:infected_runner",
  spitter: "apoc:infected_spitter",
  mutant: "apoc:infected_mutant",
  heavy: "apoc:infected_heavy",
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

async function withTickingArea(dimension, areaId, from, to, action) {
  let created = false;
  try {
    if (world.tickingAreaManager?.createTickingArea) {
      try { world.tickingAreaManager.removeTickingArea(areaId); } catch {}
      await world.tickingAreaManager.createTickingArea(areaId, { dimension, from, to });
      created = true;
    }
    return await action();
  } finally {
    if (created) {
      try { world.tickingAreaManager.removeTickingArea(areaId); } catch {}
    }
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
}

async function placeDistrict(dimension, center, index) {
  const areaId = `extract_district_${index}`;
  return withTickingArea(
    dimension,
    areaId,
    { x: center.x - 32, y: 56, z: center.z - 32 },
    { x: center.x + 32, y: 192, z: center.z + 32 },
    async () => {
      world.structureManager.placeJigsawStructure(
        "jigsaw:village_custom",
        dimension,
        { x: center.x, y: CONFIG.cityBaseY + 1, z: center.z },
        { ignoreStartHeight: true, includeEntities: false, keepJigsaws: false }
      );
      await waitTicks(8);
      return true;
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
        const layout = districtIndex === 4
          ? [...CRATE_LAYOUT, { dx: 0, dz: 18, tier: "legendary" }]
          : CRATE_LAYOUT;
        for (const crate of layout) {
          const ground = safeGround(dimension, center.x + crate.dx, center.z + crate.dz, 18);
          if (!ground) continue;
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
        const ground = standingGround(dimension, point.x, point.z);
        if (!ground) return;
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
  let previousReady = false;
  try { previousReady = world.getDynamicProperty(CONFIG.previousCityReadyKey) === true; } catch {}
  console.warn("[ExtractionCity] building 3x3 city districts and repairing the void foundation...");
  await buildCityFoundation(dimension);

  let generated = previousReady ? 1 : 0;
  for (let index = 0; index < CONFIG.districtCenters.length; index++) {
    const center = CONFIG.districtCenters[index];
    if (previousReady && center.x === 0 && center.z === 0) continue;
    try {
      if (await placeDistrict(dimension, center, index)) generated++;
    } catch (error) {
      console.warn(`[ExtractionCity] district ${index + 1} placement failed: ${error}`);
    }
  }

  if (!generated) throw new Error("No RandS Jigsaw districts could be placed");
  const exits = await placeExtractionMarkers(dimension);
  const crates = await placeLootCrates(dimension);
  try { world.setDynamicProperty(CONFIG.cityReadyKey, true); } catch {}
  console.warn(`[ExtractionCity] expanded city ready: ${generated} districts, ${exits} exit markers, ${crates} loot crates placed.`);
}

async function ensureCityReady(dimension, force = false) {
  try {
    if (!force && world.getDynamicProperty(CONFIG.cityReadyKey) === true) return;
  } catch {}
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

async function enter(player) {
  const dimension = extractionDimension();
  if (!dimension) {
    const detail = dimensionRegistrationError ? `\n§8${dimensionRegistrationError}` : "";
    player.sendMessage(`§c摸金维度未注册。请启用 Beta APIs，并确认安装的是摸金都市 v${CONFIG.version}。${detail}`);
    return;
  }
  player.sendMessage("§e[摸金都市] 正在准备城市区块，首次进入可能需要稍候……");
  try { await ensureCityReady(dimension); }
  catch (error) {
    player.sendMessage(`§c城市结构初始化失败：${error}`);
    console.error(`[ExtractionCity] city initialization failed: ${error}`);
    return;
  }
  storeReturn(player);
  const point = CONFIG.entryPoints[Math.floor(Math.random() * CONFIG.entryPoints.length)];
  const x = point.x + Math.floor(Math.random() * 41) - 20;
  const z = point.z + Math.floor(Math.random() * 41) - 20;
  let arrivalAreaCreated = false;
  const arrivalAreaId = `apoc_extract_arrival_${String(player.id).replace(/[^a-zA-Z0-9_]/g, "").slice(-12)}`;
  try {
    if (world.tickingAreaManager?.createTickingArea) {
      await world.tickingAreaManager.createTickingArea(arrivalAreaId, {
        dimension,
        from: { x: Math.floor(x) - 8, y: 54, z: Math.floor(z) - 8 },
        to: { x: Math.floor(x) + 8, y: 180, z: Math.floor(z) + 8 }
      });
      arrivalAreaCreated = true;
    }
  } catch (error) { console.warn(`[ExtractionCity] arrival ticking area unavailable: ${error}`); }
  system.runTimeout(() => {
    try {
      let location = safeGround(dimension, x, z, 36);
      if (!location) {
        for (const fallback of CONFIG.entryPoints) {
          location = safeGround(dimension, fallback.x, fallback.z, 48);
          if (location) break;
        }
      }
      if (!location) throw new Error("扩展城区中没有找到安全地面，请让管理员执行 /scriptevent extract:rebuild");
      player.teleport(location, { dimension });
      player.addTag(CONFIG.activeTag);
      player.setDynamicProperty(CONFIG.activeStateKey, true);
      player.addEffect("resistance", 100, { amplifier: 4, showParticles: false });
      applyExtractionEnvironment(player);
      snapshotBackpack(player);
      player.sendMessage(`§6[摸金都市] 随机出生：${point.name}。到达撤离点后执行 §e/scriptevent extract:exit §6开始撤离。`);
    } catch (error) { player.sendMessage(`§c进入失败：${error}`); }
    if (arrivalAreaCreated) {
      try { world.tickingAreaManager.removeTickingArea(arrivalAreaId); } catch {}
    }
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
      ? `§0快捷栏 1-9 与穿戴装备受保险保护。\n§4背包槽位 10-36 死亡时全部掉落。\n\n§0最近撤离点：§e${point?.name || "无"} §8(${Math.floor(point?.distance || 0)}格)\n§0到达 9 格内后点击下方按钮，或执行：\n§e/scriptevent extract:exit`
      : "§0这是持续开放的最高风险区域，不需要创建战局。\n§0九个城区组成约 768×768 的废弃都市；进入位置随机。\n§0都市传说 Boss 会低概率出现。")
    .button(inside ? "§a开始撤离" : "§6随机进入都市", inside ? "textures/ui/confirm" : "textures/ui/World")
    .button("§8关闭", "textures/ui/cancel");
  form.show(player).then(result => {
    if (result.canceled || result.selection !== 0) return;
    if (inside) startExtraction(player); else enter(player);
  }).catch(error => {
    console.warn(`[ExtractionCity] menu failed for ${player.name}: ${error}`);
    try { player.sendMessage("§c摸金都市菜单打开失败，请直接执行 /scriptevent extract:enter；若仍无响应，请确认行为包 v0.3.2 已启用。"); } catch {}
  });
}

function captureBackpack(player) {
  try {
    const container = player.getComponent("minecraft:inventory")?.container;
    if (!container) return null;
    const items = [];
    for (let slot = CONFIG.protectedHotbarSlots; slot < container.size; slot++) {
      const item = container.getItem(slot);
      if (item) items.push({ slot, item });
    }
    return { items, size: container.size };
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

function extractionSessionActive(player, snapshot) {
  if (snapshot?.dimensionId === CONFIG.dimensionId) return true;
  try { if (player.getDynamicProperty(CONFIG.activeStateKey) === true) return true; } catch {}
  try { return player.hasTag(CONFIG.activeTag); } catch { return false; }
}

function dropBackpack(player, location = null, dimension = null) {
  const cached = backpackSnapshots.get(player.id);
  if (deathHandled.has(player.id) || !extractionSessionActive(player, cached)) return;
  deathHandled.add(player.id);
  const current = captureBackpack(player);
  const dropped = current || cached || { items: [] };
  const dropLocation = location || cached?.location;
  let dropDimension = dimension;
  if (!dropDimension) {
    try { dropDimension = world.getDimension(cached?.dimensionId || CONFIG.dimensionId); } catch {}
  }
  clearBackpackSlots(player);
  if (dropDimension && dropLocation) for (const entry of dropped.items || []) {
    try { dropDimension.spawnItem(entry.item, dropLocation); } catch {}
  }
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
    } catch (error) {
      if (system.currentTick - mobSpawnFailureNoticeTick >= 1200) {
        mobSpawnFailureNoticeTick = system.currentTick;
        console.warn(`[ExtractionCity] Apocalypse mob spawn failed; verify Apocalypse Mobs is active: ${error}`);
      }
    }
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
    boss.addTag("apoc_extraction_boss"); boss.addTag("apoc_hostile");
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

try { world.getDimension("minecraft:overworld").runCommand("gamerule keepinventory true"); } catch {}
try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}

subscribe(world.afterEvents?.entityHurt, "entityHurt", event => {
  const player = event.hurtEntity;
  if (player?.typeId !== "minecraft:player" || !extractionSessionActive(player, backpackSnapshots.get(player.id))) return;
  try {
    const health = player.getComponent("minecraft:health");
    if (health && health.currentValue <= 0) {
      const cached = backpackSnapshots.get(player.id);
      dropBackpack(player, cached?.location, extractionDimension());
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
  let shouldReturn = pendingReturn.delete(event.player.id);
  try { shouldReturn ||= event.player.getDynamicProperty(CONFIG.deathReturnKey) === true; } catch {}
  if (!shouldReturn) return;
  try { event.player.setDynamicProperty(CONFIG.deathReturnKey, undefined); } catch {}
  system.runTimeout(() => {
    clearBackpackSlots(event.player);
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
  const { player } = scriptEventContext(event);
  if (!player) {
    if (String(event.id || "").startsWith("extract:")) {
      console.warn(`[ExtractionCity] ignored ${event.id}: player source could not be resolved.`);
      try { world.sendMessage("§c[摸金都市] 已收到指令，但无法识别发起玩家。请从 SAPI 菜单进入，或由玩家本人执行指令。"); } catch {}
    }
    return;
  }
  if (event.id === "extract:menu") system.run(() => openMenu(player));
  else if (event.id === "extract:enter") system.run(() => enter(player));
  else if (event.id === "extract:exit") system.run(() => startExtraction(player));
  else if (event.id === "extract:exits") system.run(() => {
    if (player.dimension.id !== CONFIG.dimensionId) return player.sendMessage("§c请先进入摸金都市。");
    const nearest = points().map(point => ({ ...point, distance: distance2D(player.location, point) })).sort((a, b) => a.distance - b.distance).slice(0, 5);
    player.sendMessage(`§6[撤离点]\n${nearest.map(point => `§e${point.name} §8- ${Math.floor(point.distance)}m §0(${point.x}, ${point.z})`).join("\n")}\n§0寻找绿色信标，到达 9 格内执行 /scriptevent extract:exit。`);
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
    player.sendMessage("§e正在修复承托层、扩建九个城区并重新布置物资箱，请稍候……");
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
    if (player.dimension.id !== CONFIG.dimensionId) continue;
    snapshotBackpack(player);
    if (system.currentTick % 100 === 0) applyExtractionEnvironment(player);
    const point = nearestExit(player);
    if (point && point.distance <= 32 && !extractionJobs.has(player.id)) {
      player.onScreenDisplay.setActionBar(`§a撤离点：${point.name} §f${Math.floor(point.distance)}m §8| §0${point.x},${point.z} §8| §e/scriptevent extract:exit`);
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

system.runInterval(() => {
  const players = world.getAllPlayers().filter(player => player.dimension.id === CONFIG.dimensionId);
  if (players.length) cleanupVanillaHostiles(players[0].dimension);
  for (const player of players) try { spawnExtractionMob(player); } catch {}
}, CONFIG.hostileSpawnIntervalTicks);

system.runInterval(() => {
  for (const player of world.getAllPlayers()) if (player.dimension.id === CONFIG.dimensionId) try { spawnBoss(player); } catch {}
}, CONFIG.bossCheckIntervalTicks);

console.warn("[ExtractionCity] v0.3.2 responsive inter-addon entry, 3x3 persistent city, Apocalypse hostiles, loot crates, 12 exits, bosses and dusk fog initialized.");
