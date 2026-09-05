import { world, system, BlockPermutation } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { STANDALONE_CONFIG } from "./config.js";

const CFG = {
  warningSeconds: 20,
  disasterSeconds: 45,
  cooldownSeconds: 12,
  maxTrackedMeteors: 18,
  maxFloodBlocks: 180,
  maxEarthquakeQueue: 120,
  maxEntitiesAffectedByTornado: 18,
  floodRestorePerTick: 12,
  maxSurfaceCache: 280,
};

const SETTINGS_KEY = "sando_standalone:settings:v5";
const STATE_KEY = "sando_standalone:state:v2";
const HEARTBEAT_KEY = "sando_standalone:heartbeat:v1";

console.warn("[NaturalDisastersStandalone] v1.3.4 initializing; Extraction City automatic disasters enabled...");

const DEFAULT_SETTINGS = Object.freeze({
  enabled: STANDALONE_CONFIG.enabled,
  autoEnabled: STANDALONE_CONFIG.autoEnabled,
  overworldEnabled: true,
  extractionCityEnabled: STANDALONE_CONFIG.extractionCityEnabled,
  protectSafeZones: STANDALONE_CONFIG.protectSpawn,
  blockDamage: STANDALONE_CONFIG.blockDamage,
  warningSeconds: STANDALONE_CONFIG.warningSeconds,
  disasterSeconds: STANDALONE_CONFIG.disasterSeconds,
  cooldownSeconds: STANDALONE_CONFIG.cooldownSeconds,
  difficulty: STANDALONE_CONFIG.difficulty,
  weights: { ...STANDALONE_CONFIG.weights }
});

const DISASTERS = [
  { id: "tornado", name: "§fTORNADO" },
  { id: "meteors", name: "§cMETEOR SHOWER" },
  { id: "lightning", name: "§dELECTRIC STORM" },
];

const SCORE_OBJECTIVES = [
  ["ds_wins", "Wins"],
  ["ds_streak", "Wave_Streak"],
  ["ds_best", "Best_Waves"],
  ["ds_cycle", "Cycle_Progress"],
  ["ds_global", "Disaster_Global"],
];

let initialized = false;
let bootMessageShown = false;
let gameStarted = false;
let phase = "warning";
let remaining = CFG.warningSeconds;
let disasterIndex = 0;
let disasterLevel = 0;
let disaster = DISASTERS[0];
let tickCounter = 0;
let activeTick = 0;
let activeDimensionId = "minecraft:overworld";
let settings = { ...DEFAULT_SETTINGS, weights: { ...DEFAULT_SETTINGS.weights } };
let nextAutoTick = Number.POSITIVE_INFINITY;

let tornado = null;
let meteors = [];
let floodBlocks = new Map();
let floodByPlayer = new Map();
let floodRestoreQueue = [];
let earthquakeQueue = [];
let earthquakeQueuedKeys = new Set();
let failedPlayers = new Set();
let runParticipants = new Set();
let deadParticipants = new Set();
let surfaceCache = new Map();
let activeAutoRegion = null;
let scheduledAutoRegion = null;
let manualCenter = null;

function clamp(value, min, max, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
}

function parseJson(raw, fallback) {
  try { return typeof raw === "string" ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
}

function normalizeSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const weights = source.weights && typeof source.weights === "object" ? source.weights : {};
  return {
    enabled: source.enabled !== false,
    autoEnabled: source.autoEnabled === true,
    overworldEnabled: source.overworldEnabled !== false,
    extractionCityEnabled: source.extractionCityEnabled !== false,
    protectSafeZones: source.protectSafeZones !== false,
    blockDamage: source.blockDamage === true,
    warningSeconds: Math.floor(clamp(source.warningSeconds, 5, 300, DEFAULT_SETTINGS.warningSeconds)),
    disasterSeconds: Math.floor(clamp(source.disasterSeconds, 10, 600, DEFAULT_SETTINGS.disasterSeconds)),
    cooldownSeconds: Math.floor(clamp(source.cooldownSeconds, 10, 3600, DEFAULT_SETTINGS.cooldownSeconds)),
    difficulty: Math.floor(clamp(source.difficulty, 0, 10, DEFAULT_SETTINGS.difficulty)),
    weights: Object.fromEntries(DISASTERS.map(entry => [entry.id, Math.floor(clamp(weights[entry.id], 0, 1000, DEFAULT_SETTINGS.weights[entry.id]))]))
  };
}

function loadSettings() {
  try {
    settings = normalizeSettings(parseJson(world.getDynamicProperty(SETTINGS_KEY), DEFAULT_SETTINGS));
    world.setDynamicProperty(SETTINGS_KEY, JSON.stringify(settings));
  } catch (_) {
    settings = normalizeSettings(DEFAULT_SETTINGS);
  }
  return settings;
}

function scheduleNextAuto() {
  if (!settings.enabled || !settings.autoEnabled) {
    nextAutoTick = Number.POSITIVE_INFINITY;
    scheduledAutoRegion = null;
    return;
  }
  scheduledAutoRegion = chooseOccupiedAutoRegion();
  if (!scheduledAutoRegion) return scheduleAutoRegionRetry();
  const interval = STANDALONE_CONFIG.intervalMinutes[scheduledAutoRegion.type] || STANDALONE_CONFIG.intervalMinutes.outlaw;
  const min = Math.max(1, Number(interval.min) || 1);
  const max = Math.max(min, Number(interval.max) || min);
  const minutes = min + Math.random() * (max - min);
  nextAutoTick = system.currentTick + Math.max(1200, Math.floor(minutes * 1200));
}

function scheduleAutoRegionRetry() {
  scheduledAutoRegion = null;
  const minutes = Math.max(1, Number(STANDALONE_CONFIG.emptyRegionRetryMinutes) || 1);
  nextAutoTick = system.currentTick + Math.floor(minutes * 1200);
}

function weightedDisaster() {
  const weighted = DISASTERS.map(entry => ({ ...entry, weight: Math.max(0, Number(settings.weights?.[entry.id]) || 0) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return DISASTERS[Math.floor(Math.random() * DISASTERS.length)];
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return weighted[weighted.length - 1];
}

function allowedDimensionIds() {
  const dimensions = [];
  if (settings.overworldEnabled) dimensions.push("minecraft:overworld");
  if (settings.extractionCityEnabled) dimensions.push("apoc_extract:city");
  return dimensions;
}

function dimensionLabel(dimensionId) {
  if (dimensionId === "minecraft:overworld" || dimensionId === "overworld") return "主世界";
  if (dimensionId === "apoc_extract:city") return "摸金都市";
  return String(dimensionId || "未知维度");
}

function inBounds(entry, dimensionId, location) {
  const dimension = String(entry?.dimension || "minecraft:overworld");
  if (dimension !== dimensionId && dimension.replace("minecraft:", "") !== dimensionId.replace("minecraft:", "")) return false;
  const min = entry.min || { x: entry.minX, y: -64, z: entry.minZ };
  const max = entry.max || { x: entry.maxX, y: 320, z: entry.maxZ };
  return location.x >= Number(min.x) && location.x <= Number(max.x) &&
    location.y >= Number(min.y ?? -64) && location.y <= Number(max.y ?? 320) &&
    location.z >= Number(min.z) && location.z <= Number(max.z);
}

function automaticRegionForPlayer(player) {
  try {
    if (player.dimension.id === "apoc_extract:city") {
      if (!settings.extractionCityEnabled) return null;
      const radius = Math.max(16, Number(STANDALONE_CONFIG.automaticRadius) || 96);
      return {
        id: `city_${player.name}`,
        name: `摸金都市（${player.name}附近）`,
        type: "city",
        dimension: player.dimension.id,
        minX: player.location.x - radius,
        maxX: player.location.x + radius,
        minZ: player.location.z - radius,
        maxZ: player.location.z + radius,
      };
    }
    if (player.dimension.id !== "minecraft:overworld" || !settings.overworldEnabled) return null;
    if (STANDALONE_CONFIG.safeRegions.some(region => inBounds(region, player.dimension.id, player.location))) return null;
    const law = STANDALONE_CONFIG.autoRegions.find(region => inBounds(region, player.dimension.id, player.location));
    if (law) return law;
    const radius = Math.max(16, Number(STANDALONE_CONFIG.automaticRadius) || 96);
    return {
      id: `outlaw_${player.name}`,
      name: `非法制区（${player.name}附近）`,
      type: "outlaw",
      dimension: player.dimension.id,
      minX: player.location.x - radius,
      maxX: player.location.x + radius,
      minZ: player.location.z - radius,
      maxZ: player.location.z + radius,
    };
  } catch (_) { return null; }
}

function chooseOccupiedAutoRegion(preferredType = "") {
  const candidates = world.getAllPlayers().map(automaticRegionForPlayer).filter(region => region && (!preferredType || region.type === preferredType));
  const unique = [...new Map(candidates.map(region => [region.id, region])).values()];
  return unique.length ? unique[Math.floor(Math.random() * unique.length)] : null;
}

function isSafeArea(dimensionId, location) {
  // The controller is an explicit administrator override and can target any area.
  if (manualCenter) return false;
  if (STANDALONE_CONFIG.safeRegions.some(region => inBounds(region, dimensionId, location))) return true;
  if (!settings.protectSafeZones) return false;
  if (dimensionId !== "minecraft:overworld") return false;
  let spawn = null;
  try { spawn = world.getDefaultSpawnLocation(); } catch (_) {}
  if (!spawn) return false;
  const dx = Number(location.x) - Number(spawn.x);
  const dz = Number(location.z) - Number(spawn.z);
  return Number.isFinite(dx) && Number.isFinite(dz) && dx * dx + dz * dz <= 64 * 64;
}

function touchesSafeArea(dimensionId, location, radius) {
  if (!settings.protectSafeZones) return false;
  const offsets = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius],
    [radius, radius], [radius, -radius], [-radius, radius], [-radius, -radius]];
  return offsets.some(([x, z]) => isSafeArea(dimensionId, { x: location.x + x, y: location.y, z: location.z + z }));
}

function participantsFor(dimensionId = activeDimensionId) {
  return world.getAllPlayers().filter(player => {
    try {
      if (player.dimension.id !== dimensionId) return false;
      if (manualCenter) {
        if (manualCenter.dimension !== dimensionId) return false;
        const dx = player.location.x - manualCenter.x;
        const dz = player.location.z - manualCenter.z;
        return dx * dx + dz * dz <= STANDALONE_CONFIG.manualRadius * STANDALONE_CONFIG.manualRadius;
      }
      if (isSafeArea(dimensionId, player.location)) return false;
      if (activeAutoRegion) return inBounds(activeAutoRegion, dimensionId, player.location);
      return automaticRegionForPlayer(player) !== null;
    }
    catch (_) { return false; }
  });
}

function publishState() {
  try {
    world.setDynamicProperty(HEARTBEAT_KEY, Date.now());
    world.setDynamicProperty(STATE_KEY, JSON.stringify({
      running: gameStarted,
      phase: gameStarted ? phase : "idle",
      disasterId: gameStarted ? disaster.id : "",
      disasterName: gameStarted ? disaster.name.replace(/§./g, "") : "",
      dimensionId: gameStarted ? activeDimensionId : "",
      remaining: gameStarted ? remaining : 0,
      difficulty: disasterLevel,
      regionId: activeAutoRegion?.id || "",
      regionName: activeAutoRegion?.name || (manualCenter ? "管理员定点释放" : ""),
      regionType: activeAutoRegion?.type || (manualCenter ? "manual" : ""),
      scheduledRegionType: scheduledAutoRegion?.type || "",
      manualCenter,
      nextAutoSeconds: Number.isFinite(nextAutoTick) ? Math.max(0, Math.floor((nextAutoTick - system.currentTick) / 20)) : -1,
      updatedAt: Date.now()
    }));
  } catch (error) { console.warn(`[NaturalDisasters] state publish failed: ${error}`); }
}

function safeCmd(target, command) {
  try { return target.runCommand(command); } catch (_) { return undefined; }
}

function isAdmin(player) {
  if (!player || player.typeId !== "minecraft:player") return false;
  try { return player.hasTag("admin") || player.hasTag("administrator") || player.isOp(); } catch (_) { return false; }
}

function ensureObjectives() {
  try {
    for (const [id, display] of SCORE_OBJECTIVES) {
      try {
        if (!world.scoreboard.getObjective(id)) world.scoreboard.addObjective(id, display);
      } catch (_) {}
    }

    const dim = world.getDimension("overworld");
    // `scoreboard players add <fake player> <objective> 0` creates the fake
    // participant if missing, but preserves an existing value. This avoids
    // getScore() throwing on brand-new worlds before the fake participant exists.
    safeCmd(dim, 'scoreboard players add "GLOBAL_BEST" ds_global 0');
    safeCmd(dim, 'scoreboard players add "WORLD_LEVEL" ds_global 0');
    safeCmd(dim, 'scoreboard players add "DISASTER_INDEX" ds_global 0');

    const global = world.scoreboard.getObjective("ds_global");
    if (!global) {
      initialized = false;
      return;
    }

    let worldLevel = 0;
    let savedIndex = 0;
    try { worldLevel = global.getScore("WORLD_LEVEL") ?? 0; } catch (_) {}
    try { savedIndex = global.getScore("DISASTER_INDEX") ?? 0; } catch (_) {}

    if (worldLevel < 0) {
      try { global.setScore("WORLD_LEVEL", 0); } catch (_) {}
      worldLevel = 0;
    }

    disasterLevel = Math.max(0, worldLevel);
    disasterIndex = Math.max(0, Math.min(DISASTERS.length - 1, savedIndex));
    disaster = DISASTERS[disasterIndex];
    initialized = true;
  } catch (_) {
    initialized = false;
  }
}

function objective(id) {
  try { return world.scoreboard.getObjective(id); } catch (_) { return undefined; }
}

function score(player, id) {
  try { return objective(id)?.getScore(player) ?? 0; } catch (_) { return 0; }
}

function setScore(player, id, value) {
  try { objective(id)?.setScore(player, Math.max(0, Math.floor(value))); } catch (_) {}
}

function addScore(player, id, amount) {
  try { objective(id)?.addScore(player, Math.floor(amount)); } catch (_) {}
}

function globalScore(key) {
  try { return objective("ds_global")?.getScore(key) ?? 0; } catch (_) { return 0; }
}

function setGlobalScore(key, value) {
  try { objective("ds_global")?.setScore(key, Math.max(0, Math.floor(value))); } catch (_) {}
}

function ensurePlayerScores(player) {
  try {
    for (const id of ["ds_wins", "ds_streak", "ds_best", "ds_cycle"]) {
      const obj = objective(id);
      if (obj && obj.getScore(player) === undefined) obj.setScore(player, 0);
    }
  } catch (_) {}
}

function bar(seconds, max) {
  const width = 14;
  const filled = Math.max(0, Math.min(width, Math.round((seconds / Math.max(1, max)) * width)));
  return "§a" + "■".repeat(filled) + "§8" + "■".repeat(width - filled);
}

function hud() {
  // 冷却期保持 Action Bar 空闲，避免覆盖枪械 HUD、任务进度等其他 Addon 信息。
  if (phase !== "warning" && phase !== "active") return;
  const max = phase === "warning" ? settings.warningSeconds : settings.disasterSeconds;
  for (const p of participantsFor()) {
    const title = phase === "active"
      ? disaster.name
      : `§eNEXT: ${disaster.name}`;
    try {
      p.onScreenDisplay.setActionBar(
        `${title} §8| §6难度 ${disasterLevel} §8| ${bar(remaining, max)} §f${remaining}s §8| §3${dimensionLabel(activeDimensionId)}`
      );
    } catch (_) {}
  }
}

function centerForPlayer(p, radius = 20, minRadius = 7) {
  const a = Math.random() * Math.PI * 2;
  const r = minRadius + Math.random() * Math.max(1, radius - minRadius);
  return { x: p.location.x + Math.cos(a) * r, y: p.location.y + 2, z: p.location.z + Math.sin(a) * r };
}

function surfaceY(dim, x, aroundY, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const key = `${dim.id}|${ix}|${iz}|${Math.floor(aroundY / 8)}`;
  const cached = surfaceCache.get(key);
  if (cached && (tickCounter - cached.tick) <= 80) return cached.y;

  let result = Math.floor(aroundY - 1);
  for (let y = Math.min(Math.floor(aroundY) + 12, 318); y >= Math.max(-60, Math.floor(aroundY) - 14); y--) {
    try {
      const b = dim.getBlock({ x: ix, y, z: iz });
      if (b && !b.isAir && b.typeId !== "minecraft:water" && b.typeId !== "minecraft:lava") {
        result = y;
        break;
      }
    } catch (_) {}
  }

  if (surfaceCache.size >= CFG.maxSurfaceCache) {
    const first = surfaceCache.keys().next().value;
    if (first !== undefined) surfaceCache.delete(first);
  }
  surfaceCache.set(key, { y: result, tick: tickCounter });
  return result;
}

function spawnParticleSafe(dim, id, loc) {
  try { dim.spawnParticle(id, loc); } catch (_) {}
}

function vanillaWaterParticle(dim, loc) {
  try { dim.spawnParticle("minecraft:water_splash_particle_manual", loc); } catch (_) {}
}

function vanillaCampfireSmoke(dim, loc) {
  try {
    dim.spawnParticle("minecraft:campfire_smoke_particle", loc);
  } catch (_) {
    try { dim.spawnParticle("minecraft:basic_smoke_particle", loc); } catch (_) {}
  }
}

function queueFloodRestore(key, oldType, dimensionId = activeDimensionId) {
  const [x, y, z] = key.split(",").map(Number);
  floodRestoreQueue.push({ x, y, z, oldType, dimensionId });
}

function processFloodRestoreQueue() {
  if (!floodRestoreQueue.length) return;
  let count = 0;
  while (floodRestoreQueue.length && count < CFG.floodRestorePerTick) {
    const q = floodRestoreQueue.shift();
    try {
      const dim = world.getDimension(q.dimensionId || "minecraft:overworld");
      const b = dim.getBlock({ x: q.x, y: q.y, z: q.z });
      if (b?.typeId === "minecraft:water") b.setPermutation(BlockPermutation.resolve(q.oldType));
    } catch (_) {}
    count++;
  }
}

function isProtectedBlock(typeId) {
  return [
    "minecraft:bedrock", "minecraft:barrier", "minecraft:command_block", "minecraft:chain_command_block",
    "minecraft:repeating_command_block", "minecraft:structure_block", "minecraft:jigsaw", "minecraft:end_portal",
    "minecraft:end_portal_frame", "minecraft:nether_portal", "minecraft:water", "minecraft:lava", "minecraft:air"
  ].includes(typeId);
}

function updateBest(player) {
  const streak = score(player, "ds_streak");
  const personalBest = score(player, "ds_best");
  if (streak > personalBest) setScore(player, "ds_best", streak);
  if (streak > globalScore("GLOBAL_BEST")) setGlobalScore("GLOBAL_BEST", streak);
}

function markPlayerFailed(name) {
  failedPlayers.add(name);
}

function resetCycleProgressAtNewCycle() {
  for (const p of world.getAllPlayers()) {
    ensurePlayerScores(p);
    setScore(p, "ds_cycle", 0);
  }
}

function startDisaster() {
  const players = participantsFor();
  if (!players.length) {
    stopGame(null, "目标维度没有位于非安全区的玩家，灾害已取消。");
    return;
  }
  phase = "active";
  remaining = settings.disasterSeconds;
  activeTick = 0;
  tornado = null;
  meteors = [];
  floodBlocks.clear();
  earthquakeQueue = [];
  earthquakeQueuedKeys.clear();
  failedPlayers.clear();

  for (const p of players) {
    ensurePlayerScores(p);
    safeCmd(p, "fog @s push sando_standalone:apocalypse_fog sando_standalone_disaster");
    safeCmd(p, "playsound ambient.weather.thunder @s ~ ~ ~ 0.8 0.8");
    try {
      p.onScreenDisplay.setTitle(disaster.name, {
        subtitle: `§f难度 ${disasterLevel} §8| §f坚持 ${settings.disasterSeconds} 秒`,
        fadeInDuration: 5,
        stayDuration: 35,
        fadeOutDuration: 10
      });
    } catch (_) {}
  }
  publishState();
}

function cleanupWorld() {
  for (const p of world.getAllPlayers()) safeCmd(p, "fog @s remove sando_standalone_disaster");
  try { tornado?.remove(); } catch (_) {}
  tornado = null;
  for (const m of meteors) try { m.entity?.remove(); } catch (_) {}
  meteors = [];

  // Flood cleanup is queued and restored over several ticks to avoid a freeze.
  for (const [key, oldType] of floodBlocks) queueFloodRestore(key, oldType, activeDimensionId);
  floodBlocks.clear();
  floodByPlayer.clear();
  earthquakeQueue = [];
  earthquakeQueuedKeys.clear();
}

function finishDisaster() {
  cleanupWorld();

  for (const p of world.getAllPlayers().filter(player => runParticipants.has(player.name))) {
    ensurePlayerScores(p);
    const failed = failedPlayers.has(p.name);

    if (!failed) {
      addScore(p, "ds_streak", 1);
      updateBest(p);

      const streak = score(p, "ds_streak");
      safeCmd(p, "playsound random.levelup @s ~ ~ ~ 0.8 1.2");
      try {
        p.onScreenDisplay.setTitle("§a灾害幸存", {
          subtitle: `§3连续幸存 ${streak} 次 §8| §6最佳 ${score(p, "ds_best")} 次`,
          fadeInDuration: 5,
          stayDuration: 30,
          fadeOutDuration: 10
        });
      } catch (_) {}
    } else {
      setScore(p, "ds_streak", 0);
      try {
        p.onScreenDisplay.setTitle("§c灾害挑战失败", {
          subtitle: "§8连续幸存记录已重置。",
          fadeInDuration: 5,
          stayDuration: 30,
          fadeOutDuration: 10
        });
      } catch (_) {}
    }
  }

  phase = "cooldown";
  remaining = settings.cooldownSeconds;
  publishState();
}

function advanceSequence() {
  gameStarted = false;
  phase = "idle";
  remaining = 0;
  runParticipants.clear();
  deadParticipants.clear();
  failedPlayers.clear();
  activeAutoRegion = null;
  manualCenter = null;
  scheduleNextAuto();
  publishState();
}

function tornadoProfile(level) {
  return {
    radius: Math.min(18, 7 + level * 1.25),
    heightLayers: Math.min(16, 8 + Math.floor(level * 1.1)),
    particleStep: level >= 4 ? 1 : level >= 2 ? 2 : 3,
    moveSpeed: Math.min(1.9, 0.75 + level * 0.14),
    pull: Math.min(0.25, 0.08 + level * 0.022),
    swirl: Math.min(0.26, 0.07 + level * 0.027),
    lift: Math.min(0.23, 0.065 + level * 0.022),
    destruct: level >= 3,
    blocksPerPulse: Math.min(9, 2 + Math.floor(level / 2)),
  };
}

function tornadoTick(dim, players) {
  if (!players.length) return;
  const profile = tornadoProfile(disasterLevel);

  if (!tornado || !tornado.isValid) {
    const p = players[Math.floor(Math.random() * players.length)];
    const c = centerForPlayer(p, 24, 10);
    c.y = surfaceY(dim, c.x, p.location.y, c.z) + 1;
    try { tornado = dim.spawnEntity("sando_standalone:tornado_core", c); } catch (_) { tornado = null; }
  }
  if (!tornado?.isValid) return;

  if (activeTick % 10 === 0) {
    const target = players[Math.floor(Math.random() * players.length)];
    const l = tornado.location;
    const dx = target.location.x - l.x, dz = target.location.z - l.z;
    const len = Math.max(1, Math.hypot(dx, dz));
    const ny = surfaceY(dim, l.x + dx / len, target.location.y, l.z + dz / len) + 1;
    try {
      tornado.teleport({
        x: l.x + dx / len * profile.moveSpeed,
        y: Math.max(l.y - 1, Math.min(l.y + 1, ny)),
        z: l.z + dz / len * profile.moveSpeed
      });
    } catch (_) {}
  }

  const l = tornado.location;
  if (activeTick % profile.particleStep === 0) {
    for (let i = 0; i < profile.heightLayers; i++) {
      const y = i * 1.8;
      const ang = (activeTick * 0.24) + (i * 0.9);
      const rad = 0.9 + i * (0.40 + disasterLevel * 0.025);
      spawnParticleSafe(dim, "sando_standalone:tornado_debris", {
        x: l.x + Math.cos(ang) * rad,
        y: l.y + y,
        z: l.z + Math.sin(ang) * rad
      });
    }
    if (activeTick % 4 === 0) spawnParticleSafe(dim, "sando_standalone:dust_cloud", { x: l.x, y: l.y + 1, z: l.z });
  }

  // Spatial vanilla weather ambience works as a wind roar around the funnel.
  if (activeTick % 40 === 0) {
    safeCmd(dim, `playsound ambient.weather.rain @a ${l.x} ${l.y + 6} ${l.z} 1.35 0.55 0.06`);
  }

  // Pull + giro tangencial + elevacion. A corta distancia expulsa en pulsos para simular el embudo.
  const ents = dim.getEntities({ location: l, maxDistance: profile.radius }).slice(0, CFG.maxEntitiesAffectedByTornado);
  for (const e of ents) {
    if (e.id === tornado.id || e.typeId === "minecraft:lightning_bolt") continue;
    try { if (isSafeArea(dim.id, e.location)) continue; } catch (_) { continue; }
    const ex = e.location.x - l.x, ez = e.location.z - l.z;
    const d = Math.max(0.8, Math.hypot(ex, ez));
    const nx = ex / d, nz = ez / d;
    const tx = -nz, tz = nx;
    const inward = d > 3.0 ? profile.pull : profile.pull * 0.35;
    const outwardBurst = d < 3.2 && activeTick % Math.max(22, 46 - disasterLevel * 3) === 0;
    try {
      e.applyImpulse({
        x: outwardBurst ? nx * (0.45 + disasterLevel * 0.05) : (-nx * inward + tx * profile.swirl),
        y: outwardBurst ? (0.20 + disasterLevel * 0.025) : profile.lift + Math.max(0, (profile.radius - d)) * 0.004,
        z: outwardBurst ? nz * (0.45 + disasterLevel * 0.05) : (-nz * inward + tz * profile.swirl)
      });
    } catch (_) {}
  }

  // From level 3 onward the funnel tears blocks directly along the path it travels.
  if (profile.destruct && activeTick % Math.max(26, 46 - disasterLevel * 3) === 0) {
    for (let i = 0; i < profile.blocksPerPulse; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * Math.min(5.5, profile.radius * 0.48);
      const x = Math.floor(l.x + Math.cos(a) * r);
      const z = Math.floor(l.z + Math.sin(a) * r);
      const y = surfaceY(dim, x, l.y, z);
      try {
        const b = dim.getBlock({ x, y, z });
        if (!b || b.isAir || isProtectedBlock(b.typeId)) continue;
        vanillaCampfireSmoke(dim, { x: x + 0.5, y: y + 0.6, z: z + 0.5 });
        if (settings.blockDamage && !isSafeArea(dim.id, { x, y, z })) b.setPermutation(BlockPermutation.resolve("minecraft:air"));
      } catch (_) {}
    }
  }
}

function spawnMeteor(dim, player) {
  const level = disasterLevel;
  const targetRadius = Math.min(30, 18 + level * 2);
  const target = centerForPlayer(player, targetRadius, 6);
  target.y = surfaceY(dim, target.x, player.location.y, target.z) + 1;
  if (isSafeArea(dim.id, target)) {
    target.x = player.location.x;
    target.y = surfaceY(dim, player.location.x, player.location.y, player.location.z) + 1;
    target.z = player.location.z;
  }

  const giantChance = level >= 4 ? Math.min(0.34, 0.08 + (level - 4) * 0.045) : 0;
  const giant = Math.random() < giantChance;
  const start = {
    x: target.x + (Math.random() - 0.5) * 20,
    y: target.y + 34 + Math.random() * 15,
    z: target.z + (Math.random() - 0.5) * 20
  };

  try {
    const e = dim.spawnEntity("sando_standalone:meteor", start);
    if (giant) {
      try { e.triggerEvent("sando_standalone:giant"); } catch (_) {}
    }
    meteors.push({ entity: e, target, life: 0, giant });
  } catch (_) {}
}

function meteorTick(dim, players) {
  const interval = Math.max(10, 24 - disasterLevel * 2);
  const perPulse = Math.min(4, 1 + Math.floor(disasterLevel / 2));

  if (activeTick % interval === 0 && meteors.length < CFG.maxTrackedMeteors) {
    for (let n = 0; n < perPulse && meteors.length < CFG.maxTrackedMeteors; n++) {
      const p = players[Math.floor(Math.random() * players.length)];
      if (p) spawnMeteor(dim, p);
    }
  }

  const alive = [];
  for (const m of meteors) {
    if (!m.entity?.isValid) continue;
    m.life++;
    const l = m.entity.location;
    const dx = m.target.x - l.x, dy = m.target.y - l.y, dz = m.target.z - l.z;
    const len = Math.max(0.001, Math.hypot(dx, dy, dz));

    spawnParticleSafe(dim, "sando_standalone:meteor_trail", l);
    if (m.giant && activeTick % 2 === 0) {
      spawnParticleSafe(dim, "sando_standalone:meteor_trail", { x: l.x + 0.8, y: l.y + 0.3, z: l.z - 0.6 });
      spawnParticleSafe(dim, "sando_standalone:meteor_trail", { x: l.x - 0.7, y: l.y - 0.2, z: l.z + 0.7 });
    }

    if (len < (m.giant ? 3.5 : 2.2) || m.life > 60) {
      const radius = m.giant
        ? Math.min(7.5, 5.2 + disasterLevel * 0.22)
        : Math.min(4.8, 3.0 + disasterLevel * 0.16);
      const safeBoundary = touchesSafeArea(dim.id, m.target, radius * 1.5);
      const allowDamage = settings.blockDamage && !safeBoundary;
      if (!safeBoundary) try { dim.createExplosion(m.target, radius, { breaksBlocks: allowDamage, causesFire: allowDamage }); } catch (_) {}
      spawnParticleSafe(dim, "minecraft:campfire_smoke_particle", m.target);
      if (m.giant) {
        spawnParticleSafe(dim, "minecraft:campfire_smoke_particle", { x: m.target.x + 1.2, y: m.target.y + 0.5, z: m.target.z });
        spawnParticleSafe(dim, "minecraft:campfire_smoke_particle", { x: m.target.x - 1.2, y: m.target.y + 0.5, z: m.target.z });
      }
      safeCmd(dim, `playsound random.explode @a ${m.target.x} ${m.target.y} ${m.target.z} ${m.giant ? 2.4 : 1.6} ${m.giant ? 0.55 : 0.75}`);
      for (const p of players) {
        const pd = Math.hypot(p.location.x - m.target.x, p.location.y - m.target.y, p.location.z - m.target.z);
        if (pd < radius * 3.5) safeCmd(p, `camerashake add @s ${m.giant ? 0.7 : 0.35} ${m.giant ? 0.7 : 0.35} positional`);
      }
      try { m.entity.remove(); } catch (_) {}
    } else {
      const speed = m.giant ? 1.12 : 1.48;
      try {
        m.entity.teleport({ x: l.x + dx / len * speed, y: l.y + dy / len * speed, z: l.z + dz / len * speed });
      } catch (_) {}
      alive.push(m);
    }
  }
  meteors = alive;
}

function floodTick(dim, players) {
  const level = disasterLevel;
  const push = Math.min(0.15, 0.045 + level * 0.006);
  const downward = Math.min(0.19, 0.085 + level * 0.007);

  // Water pressure is applied frequently, but only to players. It keeps the
  // player submerged while still allowing determined upward swimming.
  if (activeTick % 5 === 0) {
    for (const p of players) {
      const a = (activeTick * 0.045) + (p.location.x + p.location.z) * 0.015;
      try {
        p.applyImpulse({
          x: Math.cos(a) * push,
          y: -downward,
          z: Math.sin(a) * push
        });
      } catch (_) {}
    }
  }

  // A light vanilla splash ring sells the wave without custom particle spam.
  if (activeTick % 15 === 0) {
    for (const p of players) {
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i / 8) + activeTick * 0.05;
        vanillaWaterParticle(dim, {
          x: p.location.x + Math.cos(a) * 4.5,
          y: p.location.y + 0.6,
          z: p.location.z + Math.sin(a) * 4.5
        });
      }
    }
  }

  // Move a tiny 3-block-high flood pocket with every player instead of filling
  // hundreds of world blocks. This keeps feet, body and head underwater.
  if (activeTick % 10 !== 0) return;

  const offsets = players.length <= 4
    ? [[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]]
    : players.length <= 10
      ? [[0,0],[1,0],[-1,0],[0,1],[0,-1]]
      : [[0,0]];

  const desired = new Set();
  for (const p of players) {
    const baseX = Math.floor(p.location.x);
    const baseY = Math.floor(p.location.y);
    const baseZ = Math.floor(p.location.z);

    for (const [ox, oz] of offsets) {
      for (let h = 0; h < 3; h++) {
        const pos = { x: baseX + ox, y: baseY + h, z: baseZ + oz };
        if (isSafeArea(dim.id, pos)) continue;
        const key = `${pos.x},${pos.y},${pos.z}`;
        desired.add(key);
        if (floodBlocks.has(key) || floodBlocks.size >= CFG.maxFloodBlocks) continue;
        try {
          const b = dim.getBlock(pos);
          if (!b || !b.isAir) continue;
          floodBlocks.set(key, b.typeId);
          b.setPermutation(BlockPermutation.resolve("minecraft:water"));
        } catch (_) {}
      }
    }
  }

  // Restore only water pockets the players have already moved away from.
  for (const [key, oldType] of Array.from(floodBlocks)) {
    if (desired.has(key)) continue;
    queueFloodRestore(key, oldType, dim.id);
    floodBlocks.delete(key);
  }
  floodByPlayer.clear();
}

function lightningTick(dim, players) {
  const level = disasterLevel;
  const interval = Math.max(8, 28 - level * 2);
  const boltsPerPulse = Math.min(6, 1 + Math.floor(level / 2));
  if (activeTick % interval !== 0) return;

  for (let i = 0; i < boltsPerPulse; i++) {
    const p = players[Math.floor(Math.random() * players.length)];
    if (!p) continue;
    const c = centerForPlayer(p, Math.min(28, 17 + level * 2), 5);
    c.y = surfaceY(dim, c.x, p.location.y, c.z) + 1;
    if (!touchesSafeArea(dim.id, c, 3)) try { dim.spawnEntity("minecraft:lightning_bolt", c); } catch (_) {}

    // No custom particles. Nearby strikes create a lightweight camera shake.
    for (const viewer of players) {
      const d = Math.hypot(viewer.location.x - c.x, viewer.location.y - c.y, viewer.location.z - c.z);
      if (d <= 20) {
        const closeness = Math.max(0, 1 - d / 20);
        const intensity = Math.min(0.9, 0.16 + level * 0.05 + closeness * 0.35);
        safeCmd(viewer, `camerashake add @s ${intensity.toFixed(2)} 0.35 positional`);
      }
    }
  }
}

function queueEarthquakeCrack(dim, player) {
  if (earthquakeQueue.length >= CFG.maxEarthquakeQueue) return;
  const level = disasterLevel;
  const length = Math.min(24, 6 + Math.floor(level * 1.7));
  const branches = Math.min(4, 1 + Math.floor(level / 4));
  const halfWidth = Math.floor(Math.sqrt(Math.max(0, level)) / 1.5);
  const start = centerForPlayer(player, 13 + Math.min(10, level), 4);
  const baseY = surfaceY(dim, start.x, player.location.y, start.z);
  const mainAngle = Math.random() * Math.PI * 2;

  for (let branch = 0; branch < branches; branch++) {
    const ang = mainAngle + (branch - (branches - 1) / 2) * (0.28 + Math.random() * 0.25);
    const branchLength = Math.max(4, length - branch * 2);

    for (let i = 0; i < branchLength && earthquakeQueue.length < CFG.maxEarthquakeQueue; i++) {
      const wobble = Math.sin(i * 1.35 + branch) * (0.35 + level * 0.035);
      const centerX = start.x + Math.cos(ang) * i + Math.cos(ang + Math.PI / 2) * wobble;
      const centerZ = start.z + Math.sin(ang) * i + Math.sin(ang + Math.PI / 2) * wobble;

      for (let w = -halfWidth; w <= halfWidth && earthquakeQueue.length < CFG.maxEarthquakeQueue; w++) {
        const x = Math.floor(centerX + Math.cos(ang + Math.PI / 2) * w);
        const z = Math.floor(centerZ + Math.sin(ang + Math.PI / 2) * w);
        const y = surfaceY(dim, x, baseY, z);
        const key = `${x},${y},${z}`;
        if (earthquakeQueuedKeys.has(key)) continue;

        try {
          const b = dim.getBlock({ x, y, z });
          if (!b || b.isAir || isProtectedBlock(b.typeId) || isSafeArea(dim.id, { x, y, z })) continue;
          earthquakeQueuedKeys.add(key);
          earthquakeQueue.push({ x, y, z, key, delay: i * 3 + branch * 5 + Math.abs(w), stage: 0 });
        } catch (_) {}
      }
    }
  }
}

function processEarthquakeQueue(dim) {
  let processed = 0;
  for (let i = 0; i < earthquakeQueue.length && processed < 2; i++) {
    const q = earthquakeQueue[i];
    if (q.delay > 0) {
      q.delay--;
      continue;
    }

    const loc = { x: q.x + 0.5, y: q.y + 1.0, z: q.z + 0.5 };
    if (q.stage < 2) {
      vanillaCampfireSmoke(dim, loc);
      if (q.stage === 0) safeCmd(dim, `playsound step.stone @a ${q.x} ${q.y} ${q.z} 0.35 0.55`);
      if (q.stage === 1) safeCmd(dim, `playsound dig.stone @a ${q.x} ${q.y} ${q.z} 0.48 0.48`);
      q.stage++;
      q.delay = Math.max(2, 6 - Math.min(4, disasterLevel));
      processed++;
      continue;
    }

    for (let depth = 0; depth < 4; depth++) {
      const by = q.y - depth;
      try {
        const b = dim.getBlock({ x: q.x, y: by, z: q.z });
        if (settings.blockDamage && !isSafeArea(dim.id, { x: q.x, y: by, z: q.z }) && b && !b.isAir && !isProtectedBlock(b.typeId)) {
          b.setPermutation(BlockPermutation.resolve("minecraft:air"));
        }
      } catch (_) {}
    }
    vanillaCampfireSmoke(dim, { x: q.x + 0.5, y: q.y + 0.7, z: q.z + 0.5 });

    earthquakeQueuedKeys.delete(q.key);
    earthquakeQueue.splice(i, 1);
    i--;
    processed++;
  }
}

function earthquakeTick(dim, players) {
  const level = disasterLevel;
  const shakeInterval = Math.max(7, 17 - level);
  if (activeTick % shakeInterval === 0) {
    const intensity = Math.min(1.25, 0.20 + level * 0.10);
    const duration = Math.min(0.70, 0.28 + level * 0.035);
    for (const p of players) {
      safeCmd(p, `camerashake add @s ${intensity.toFixed(2)} ${duration.toFixed(2)} positional`);
      if (activeTick % (shakeInterval * 2) === 0) {
        const c = centerForPlayer(p, Math.min(18, 9 + level), 3);
        const y = surfaceY(dim, c.x, p.location.y, c.z);
        vanillaCampfireSmoke(dim, { x: c.x, y: y + 1, z: c.z });
        safeCmd(dim, `playsound dig.stone @a ${c.x} ${y} ${c.z} 0.40 0.42`);
      }
    }
  }

  const crackInterval = Math.max(34, 72 - level * 5);
  if (activeTick % crackInterval === 0 && earthquakeQueue.length < CFG.maxEarthquakeQueue) {
    for (const p of players.slice(0, Math.min(3, players.length))) queueEarthquakeCrack(dim, p);
  }
  processEarthquakeQueue(dim);
}

function disasterTick() {
  let dim;
  try { dim = world.getDimension(activeDimensionId); } catch (_) { return stopGame(null, "目标维度不可用，灾害已停止。"); }
  const players = participantsFor(activeDimensionId);
  if (!players.length) return;

  if (disaster.id === "tornado") tornadoTick(dim, players);
  else if (disaster.id === "meteors") meteorTick(dim, players);
  else if (disaster.id === "flood") floodTick(dim, players);
  else if (disaster.id === "lightning") lightningTick(dim, players);
  else if (disaster.id === "earthquake") earthquakeTick(dim, players);
}

function resetChallengeAfterAllDead() {
  cleanupWorld();

  for (const p of world.getAllPlayers()) {
    ensurePlayerScores(p);
    setScore(p, "ds_streak", 0);
    setScore(p, "ds_cycle", 0);
  }

  gameStarted = false;
  phase = "idle";
  remaining = 0;
  activeTick = 0;
  failedPlayers.clear();
  deadParticipants.clear();
  runParticipants.clear();
  scheduleNextAuto();
  publishState();

  try {
    world.sendMessage("§c[自然灾害] §f当前参与者全部死亡，本次灾害事件已经结束。");
  } catch (_) {}
}

function allCurrentParticipantsHaveDied() {
  const online = world.getAllPlayers().filter(p => runParticipants.has(p.name));
  return online.length > 0 && online.every(p => deadParticipants.has(p.name));
}

world.afterEvents.playerSpawn.subscribe(ev => {
  const p = ev.player;
  system.run(() => {
    // Scoreboard setup is allowed to retry, but never starts a disaster.
    if (!initialized) ensureObjectives();
    ensurePlayerScores(p);

    if (gameStarted) {
      ensurePlayerScores(p);
      try {
        if (p.dimension.id === activeDimensionId && !isSafeArea(activeDimensionId, p.location)) runParticipants.add(p.name);
      } catch (_) {}
    }
    if (ev.initialSpawn && isAdmin(p)) {
      try { p.sendMessage("§a[独立自然灾害] v1.3.4 已加载。法制区/摸金都市 20～40 分钟、非法制区 10～20 分钟；资源包已声明灵动视效兼容。"); } catch (_) {}
    }
  });
});

world.afterEvents.entityDie.subscribe(ev => {
  const e = ev.deadEntity;
  if (!gameStarted || e.typeId !== "minecraft:player") return;
  const name = e.name;
  system.run(() => {
    if (!runParticipants.has(name)) return;
    failedPlayers.add(name);
    deadParticipants.add(name);
    runParticipants.add(name);

    try {
      const p = world.getAllPlayers().find(pl => pl.name === name);
      if (p) {
        setScore(p, "ds_streak", 0);
        setScore(p, "ds_cycle", 0);
      }
    } catch (_) {}

    if (allCurrentParticipantsHaveDied()) {
      resetChallengeAfterAllDead();
    } else {
      try {
        world.sendMessage(`§e[Natural Disasters] §f${name} died, but the challenge continues until all players have died.`);
      } catch (_) {}
    }
  });
});

function bootSystem(showMessage = false) {
  try {
    ensureObjectives();
    if (!initialized) return false;
    for (const p of world.getAllPlayers()) ensurePlayerScores(p);
    if (showMessage) {
      try { world.sendMessage("§a[Natural Disasters] §fSystem ready. Use the §cDisaster Controller §fto begin."); } catch (_) {}
    }
    return true;
  } catch (_) {
    initialized = false;
    return false;
  }
}

function chooseTargetDimension(requestedDimensionId) {
  const allowed = allowedDimensionIds();
  if (!allowed.length) return null;
  const playersIn = id => world.getAllPlayers().some(player => {
    try { return player.dimension.id === id; } catch (_) { return false; }
  });
  if (requestedDimensionId && allowed.includes(requestedDimensionId) && playersIn(requestedDimensionId)) return requestedDimensionId;
  const occupied = allowed.filter(id => {
    try { world.getDimension(id); return playersIn(id); } catch (_) { return false; }
  });
  return occupied.length ? occupied[Math.floor(Math.random() * occupied.length)] : null;
}

function stopGame(source, reason = "管理员停止了当前灾害。") {
  const wasRunning = gameStarted;
  cleanupWorld();
  gameStarted = false;
  phase = "idle";
  remaining = 0;
  activeTick = 0;
  runParticipants.clear();
  deadParticipants.clear();
  failedPlayers.clear();
  activeAutoRegion = null;
  manualCenter = null;
  scheduleNextAuto();
  publishState();
  if (wasRunning) {
    try { world.sendMessage(`§a[自然灾害] §f${reason}`); } catch (_) {}
  } else {
    try { source?.sendMessage("§8当前没有正在运行的自然灾害。"); } catch (_) {}
  }
}

function startGame(source, requestedDisasterId = "", requestedDimensionId = "", requestedDifficulty = undefined) {
  try {
    loadSettings();
    if (source?.typeId === "minecraft:player" && !isAdmin(source)) {
      source.sendMessage("§c只有管理员可以启动自然灾害。");
      return;
    }
    if (!settings.enabled) {
      try { source?.sendMessage("§c自然灾害总开关已关闭，请用独立灾害控制器重新启用。"); } catch (_) {}
      return;
    }
    if (!bootSystem(false)) {
      try { source?.sendMessage("§e[Natural Disasters] Preparing scoreboards... starting in a moment."); } catch (_) {}
      system.runTimeout(() => {
        if (bootSystem(false)) startGame(source, requestedDisasterId, requestedDimensionId, requestedDifficulty);
        else {
          try { source?.sendMessage("§c[Natural Disasters] Scoreboard initialization failed. Check Content Log for the exact error."); } catch (_) {}
        }
      }, 20);
      return;
    }

    // If already running, do not duplicate loops or reset progress accidentally.
    if (gameStarted) {
      try { source?.sendMessage(`§e[Natural Disasters] §fEvents are already running: ${disaster.name} §8| §fLevel ${disasterLevel}.`); } catch (_) {}
      return;
    }

    const manual = source?.typeId === "minecraft:player";
    if (manual) {
      activeAutoRegion = null;
      scheduledAutoRegion = null;
      manualCenter = {
        dimension: source.dimension.id,
        x: Number(source.location.x),
        y: Number(source.location.y),
        z: Number(source.location.z),
      };
    } else {
      manualCenter = null;
      const scheduledType = scheduledAutoRegion?.type || "";
      scheduledAutoRegion = null;
      activeAutoRegion = chooseOccupiedAutoRegion(scheduledType);
      if (!activeAutoRegion) {
        scheduleAutoRegionRetry();
        publishState();
        return;
      }
    }

    const selected = DISASTERS.find(entry => entry.id === requestedDisasterId) || weightedDisaster();
    const targetDimensionId = chooseTargetDimension(requestedDimensionId || manualCenter?.dimension || activeAutoRegion?.dimension);
    if (!targetDimensionId) {
      activeAutoRegion = null;
      manualCenter = null;
      try { source?.sendMessage("§c没有可用目标：已启用的主世界或摸金都市中至少需要一名在线玩家。"); } catch (_) {}
      scheduleNextAuto();
      return;
    }

    cleanupWorld();
    gameStarted = true;
    bootMessageShown = true;
    phase = "warning";
    remaining = settings.warningSeconds;
    disaster = selected;
    disasterIndex = Math.max(0, DISASTERS.findIndex(entry => entry.id === selected.id));
    disasterLevel = Math.floor(clamp(requestedDifficulty, 0, 10, settings.difficulty));
    activeDimensionId = targetDimensionId;
    runParticipants = new Set(participantsFor(targetDimensionId).map(p => p.name));
    deadParticipants.clear();
    setGlobalScore("DISASTER_INDEX", disasterIndex);
    setGlobalScore("WORLD_LEVEL", disasterLevel);
    nextAutoTick = Number.POSITIVE_INFINITY;
    publishState();

    const targetLabel = activeAutoRegion?.name || (manualCenter ? `管理员坐标 ${Math.floor(manualCenter.x)}, ${Math.floor(manualCenter.y)}, ${Math.floor(manualCenter.z)}` : activeDimensionId);
    try { world.sendMessage(`§c§l[自然灾害预警] §r§f${disaster.name} §f将在 ${remaining} 秒后袭击 ${targetLabel}！`); } catch (_) {}
    for (const p of participantsFor(targetDimensionId)) {
      try {
        p.onScreenDisplay.setTitle("§c§lNATURAL DISASTERS", {
          subtitle: `§f${remaining} 秒后开始 §8| §e难度 ${disasterLevel}`,
          fadeInDuration: 3,
          stayDuration: 40,
          fadeOutDuration: 7
        });
        safeCmd(p, "playsound random.levelup @s ~ ~ ~ 1 0.8");
      } catch (_) {}
    }
  } catch (error) {
    console.error(`[NaturalDisasters] start failed: ${error?.stack || error}`);
    try { source?.sendMessage(`§c自然灾害启动失败：${error}`); } catch (_) {}
  }
}

function saveSettings() {
  try { world.setDynamicProperty(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
}

function openControllerMenu(player) {
  if (!isAdmin(player)) return player?.sendMessage("§c只有管理员可以使用独立灾害控制器。");
  const activeText = gameStarted ? `${disaster.name} §8· §f${phase} §8· §f${remaining}s` : "§a当前无灾害";
  const form = new ActionFormData()
    .title("§l§c独立自然灾害控制器")
    .body(`§e本版本完全独立运行；摸金都市存在时可直接识别其维度。\n§e状态：${activeText}\n§e自动灾害：${settings.autoEnabled ? "§a开启" : "§c关闭"}\n§e法制区间隔：§e20～40 分钟\n§e非法制区间隔：§e10～20 分钟\n§e摸金都市间隔：§e20～40 分钟\n§e已排除：§a${STANDALONE_CONFIG.safeRegions.map(region => region.name).join("、")}\n§e下次目标：§e${scheduledAutoRegion?.type === "law" ? "法制区" : scheduledAutoRegion?.type === "outlaw" ? "非法制区" : scheduledAutoRegion?.type === "city" ? "摸金都市" : "等待区域玩家"}\n§e下次检查：§e${Number.isFinite(nextAutoTick) ? Math.max(0, Math.ceil((nextAutoTick - system.currentTick) / 20)) : "--"} 秒\n§e手动释放：以管理员当前位置为中心 ${STANDALONE_CONFIG.manualRadius} 格`)
    .button("§6随机灾害")
    .button("§f龙卷风")
    .button("§c陨石雨")
    .button("§d雷暴")
    .button(settings.autoEnabled ? "§c关闭自动灾害" : "§a开启自动灾害")
    .button("§4停止当前灾害")
    .button("§8关闭");
  form.show(player).then(result => {
    if (result.canceled || result.selection === 6) return;
    const ids = ["", "tornado", "meteors", "lightning"];
    if (result.selection <= 3) return startGame(player, ids[result.selection], player.dimension.id, settings.difficulty);
    if (result.selection === 4) {
      settings.autoEnabled = !settings.autoEnabled;
      saveSettings();
      if (settings.autoEnabled) scheduleNextAuto();
      else {
        nextAutoTick = Number.POSITIVE_INFINITY;
        scheduledAutoRegion = null;
      }
      player.sendMessage(`§a自动灾害已${settings.autoEnabled ? "开启" : "关闭"}。`);
      return;
    }
    if (result.selection === 5) stopGame(player);
  }).catch(error => player.sendMessage(`§c控制器菜单打开失败：${error}`));
}

function decodeSapiEnvelope(rawMessage) {
  const raw = String(rawMessage || "");
  if (!raw.startsWith("__sapi_player__=")) return { playerName: "", data: raw };
  const values = {};
  for (const part of raw.split("&")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator);
    const encoded = part.slice(separator + 1);
    try { values[key] = decodeURIComponent(encoded); }
    catch (_) { values[key] = encoded; }
  }
  return { playerName: String(values.__sapi_player__ || ""), data: String(values.data || "") };
}

function resolveScriptEventPlayer(event, envelope) {
  const direct = event.sourceEntity?.typeId === "minecraft:player"
    ? event.sourceEntity
    : event.initiator?.typeId === "minecraft:player"
      ? event.initiator
      : null;
  if (direct) return direct;
  if (!envelope.playerName) return null;
  return world.getAllPlayers().find(player => player.name === envelope.playerName) || null;
}

// Register the controller as a real custom item component during startup.
// This is the primary activation path.
try {
  system.beforeEvents.startup.subscribe((initEvent) => {
    try {
      initEvent.itemComponentRegistry.registerCustomComponent("sando_standalone:start_disasters", {
        onUse(event) {
          system.run(() => openControllerMenu(event.source));
        }
      });
    } catch (_) {}
  });
} catch (_) {}

// Backup activation path in case a platform handles generic item use differently.
try {
  world.afterEvents.itemUse.subscribe((ev) => {
    try {
      if (ev.itemStack?.typeId === "sando_standalone:disaster_controller") {
        system.run(() => openControllerMenu(ev.source));
      }
    } catch (_) {}
  });
} catch (_) {}

// Optional native commands; these are handled entirely inside this pack.
try {
  system.afterEvents.scriptEventReceive.subscribe(ev => {
    const envelope = decodeSapiEnvelope(ev.message);
    const source = resolveScriptEventPlayer(ev, envelope);
    if (!source || !isAdmin(source)) return;
    if (ev.id === "sando_standalone:menu") system.run(() => openControllerMenu(source));
    else if (ev.id === "sando_standalone:start") system.run(() => startGame(source, envelope.data.trim(), source.dimension.id, settings.difficulty));
    else if (ev.id === "sando_standalone:stop") system.run(() => stopGame(source));
  });
} catch (_) {}

// Initialize and schedule automatic standalone disasters when enabled.
system.runTimeout(() => {
  loadSettings();
  if (settings.autoEnabled) scheduleNextAuto();
  bootSystem(false);
  publishState();
}, 20);

system.runInterval(() => {
  tickCounter++;
  processFloodRestoreQueue();
  if (!initialized) {
    if (tickCounter % 20 === 0) bootSystem(false);
    return;
  }

  if (tickCounter % 100 === 0) {
    const previousAuto = settings.autoEnabled;
    loadSettings();
    if (!settings.enabled && gameStarted) stopGame(null, "自然灾害总开关已关闭，当前事件终止。");
    if (settings.autoEnabled && (!previousAuto || !Number.isFinite(nextAutoTick)) && !gameStarted) scheduleNextAuto();
    if (!settings.autoEnabled && !gameStarted) nextAutoTick = Number.POSITIVE_INFINITY;
    publishState();
  }

  if (!gameStarted) {
    if (settings.enabled && settings.autoEnabled && system.currentTick >= nextAutoTick) startGame(null);
    return;
  }

  if (phase === "active") {
    activeTick++;
    disasterTick();
  }

  if (tickCounter % 20 === 0) {
    hud();
    remaining--;
    if (remaining <= 0) {
      if (phase === "warning") startDisaster();
      else if (phase === "active") finishDisaster();
      else advanceSequence();
    }
  }
}, 1);
