import { world, system, BlockPermutation } from "@minecraft/server";

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

// Fixed order. Every survived wave increases the challenge level.
const DISASTERS = [
  { id: "tornado", name: "§fTORNADO" },
  { id: "meteors", name: "§cMETEOR SHOWER" },
  { id: "flood", name: "§9MEGA FLOOD" },
  { id: "lightning", name: "§dELECTRIC STORM" },
  { id: "earthquake", name: "§6EARTHQUAKE" },
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

function safeCmd(target, command) {
  try { return target.runCommand(command); } catch (_) { return undefined; }
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
  const max = phase === "warning" ? CFG.warningSeconds : phase === "active" ? CFG.disasterSeconds : CFG.cooldownSeconds;
  for (const p of world.getAllPlayers()) {
    ensurePlayerScores(p);
    const wins = score(p, "ds_wins");
    const best = score(p, "ds_best");
    const title = phase === "active"
      ? disaster.name
      : phase === "warning"
        ? `§eNEXT: ${disaster.name}`
        : "§aSAFE TIME";
    try {
      p.onScreenDisplay.setActionBar(
        `${title} §8| §6LEVEL ${disasterLevel} §8| ${bar(remaining, max)} §f${remaining}s
` +
        `§aCircuits Completed §f${wins} §8| §eBest §f${best} Waves §8| §dWorld Record §fEL SANDO - 12 Waves`
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

function queueFloodRestore(key, oldType) {
  const [x, y, z] = key.split(",").map(Number);
  floodRestoreQueue.push({ x, y, z, oldType });
}

function processFloodRestoreQueue() {
  if (!floodRestoreQueue.length) return;
  const dim = world.getDimension("overworld");
  let count = 0;
  while (floodRestoreQueue.length && count < CFG.floodRestorePerTick) {
    const q = floodRestoreQueue.shift();
    try {
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
  phase = "active";
  remaining = CFG.disasterSeconds;
  activeTick = 0;
  tornado = null;
  meteors = [];
  floodBlocks.clear();
  earthquakeQueue = [];
  earthquakeQueuedKeys.clear();
  failedPlayers.clear();

  if (disasterIndex === 0) resetCycleProgressAtNewCycle();

  for (const p of world.getAllPlayers()) {
    ensurePlayerScores(p);
    safeCmd(p, "fog @s push sando:apocalypse_fog sando_disaster");
    safeCmd(p, "playsound ambient.weather.thunder @s ~ ~ ~ 0.8 0.8");
    try {
      p.onScreenDisplay.setTitle(disaster.name, {
        subtitle: `§fLEVEL ${disasterLevel} §8| §fSURVIVE WAVE ${disasterIndex + 1}/5!`,
        fadeInDuration: 5,
        stayDuration: 35,
        fadeOutDuration: 10
      });
    } catch (_) {}
  }
}

function cleanupWorld() {
  for (const p of world.getAllPlayers()) safeCmd(p, "fog @s remove sando_disaster");
  try { tornado?.remove(); } catch (_) {}
  tornado = null;
  for (const m of meteors) try { m.entity?.remove(); } catch (_) {}
  meteors = [];

  // Flood cleanup is queued and restored over several ticks to avoid a freeze.
  for (const [key, oldType] of floodBlocks) queueFloodRestore(key, oldType);
  floodBlocks.clear();
  floodByPlayer.clear();
  earthquakeQueue = [];
  earthquakeQueuedKeys.clear();
}

function finishDisaster() {
  cleanupWorld();

  const isCycleEnd = disasterIndex === DISASTERS.length - 1;
  for (const p of world.getAllPlayers()) {
    ensurePlayerScores(p);
    const failed = failedPlayers.has(p.name);

    if (!failed) {
      addScore(p, "ds_streak", 1);
      addScore(p, "ds_cycle", 1);
      updateBest(p);

      const streak = score(p, "ds_streak");
      const cycle = score(p, "ds_cycle");
      safeCmd(p, "playsound random.levelup @s ~ ~ ~ 0.8 1.2");

      if (isCycleEnd && cycle >= 5) {
        addScore(p, "ds_wins", 1);
        try {
          p.onScreenDisplay.setTitle("§6CIRCUIT COMPLETE", {
            subtitle: `§aCircuits ${score(p, "ds_wins")} §8| §eBest ${score(p, "ds_best")} Waves`,
            fadeInDuration: 5,
            stayDuration: 50,
            fadeOutDuration: 10
          });
        } catch (_) {}
      } else {
        try {
          p.onScreenDisplay.setTitle("§aWAVE SURVIVED!", {
            subtitle: `§fSurvived ${streak} Waves §8| §eBest ${score(p, "ds_best")} Waves`,
            fadeInDuration: 5,
            stayDuration: 30,
            fadeOutDuration: 10
          });
        } catch (_) {}
      }
    } else {
      setScore(p, "ds_streak", 0);
      setScore(p, "ds_cycle", 0);
      try {
        p.onScreenDisplay.setTitle("§cWAVE FAILED", {
          subtitle: "§7Challenge reset to Level 0.",
          fadeInDuration: 5,
          stayDuration: 30,
          fadeOutDuration: 10
        });
      } catch (_) {}
    }
  }

  phase = "cooldown";
  remaining = CFG.cooldownSeconds;
}

function advanceSequence() {
  disasterIndex++;
  if (disasterIndex >= DISASTERS.length) {
    disasterIndex = 0;
  }

  disasterLevel++;
  disaster = DISASTERS[disasterIndex];
  setGlobalScore("DISASTER_INDEX", disasterIndex);
  setGlobalScore("WORLD_LEVEL", disasterLevel);
  phase = "warning";
  remaining = CFG.warningSeconds;
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
    try { tornado = dim.spawnEntity("sando:tornado_core", c); } catch (_) { tornado = null; }
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
      spawnParticleSafe(dim, "sando:tornado_debris", {
        x: l.x + Math.cos(ang) * rad,
        y: l.y + y,
        z: l.z + Math.sin(ang) * rad
      });
    }
    if (activeTick % 4 === 0) spawnParticleSafe(dim, "sando:dust_cloud", { x: l.x, y: l.y + 1, z: l.z });
  }

  // Spatial vanilla weather ambience works as a wind roar around the funnel.
  if (activeTick % 40 === 0) {
    safeCmd(dim, `playsound ambient.weather.rain @a ${l.x} ${l.y + 6} ${l.z} 1.35 0.55 0.06`);
  }

  // Pull + giro tangencial + elevacion. A corta distancia expulsa en pulsos para simular el embudo.
  const ents = dim.getEntities({ location: l, maxDistance: profile.radius }).slice(0, CFG.maxEntitiesAffectedByTornado);
  for (const e of ents) {
    if (e.id === tornado.id || e.typeId === "minecraft:lightning_bolt") continue;
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
        b.setPermutation(BlockPermutation.resolve("minecraft:air"));
      } catch (_) {}
    }
  }
}

function spawnMeteor(dim, player) {
  const level = disasterLevel;
  const targetRadius = Math.min(30, 18 + level * 2);
  const target = centerForPlayer(player, targetRadius, 6);
  target.y = surfaceY(dim, target.x, player.location.y, target.z) + 1;

  const giantChance = level >= 4 ? Math.min(0.34, 0.08 + (level - 4) * 0.045) : 0;
  const giant = Math.random() < giantChance;
  const start = {
    x: target.x + (Math.random() - 0.5) * 20,
    y: target.y + 34 + Math.random() * 15,
    z: target.z + (Math.random() - 0.5) * 20
  };

  try {
    const e = dim.spawnEntity("sando:meteor", start);
    if (giant) {
      try { e.triggerEvent("sando:giant"); } catch (_) {}
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

    spawnParticleSafe(dim, "sando:meteor_trail", l);
    if (m.giant && activeTick % 2 === 0) {
      spawnParticleSafe(dim, "sando:meteor_trail", { x: l.x + 0.8, y: l.y + 0.3, z: l.z - 0.6 });
      spawnParticleSafe(dim, "sando:meteor_trail", { x: l.x - 0.7, y: l.y - 0.2, z: l.z + 0.7 });
    }

    if (len < (m.giant ? 3.5 : 2.2) || m.life > 60) {
      const radius = m.giant
        ? Math.min(7.5, 5.2 + disasterLevel * 0.22)
        : Math.min(4.8, 3.0 + disasterLevel * 0.16);
      try { dim.createExplosion(m.target, radius, { breaksBlocks: true, causesFire: true }); } catch (_) {}
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
    queueFloodRestore(key, oldType);
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
    try { dim.spawnEntity("minecraft:lightning_bolt", c); } catch (_) {}

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
          if (!b || b.isAir || isProtectedBlock(b.typeId)) continue;
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
        if (b && !b.isAir && !isProtectedBlock(b.typeId)) {
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
  const dim = world.getDimension("overworld");
  const players = world.getAllPlayers().filter(p => p.dimension.id === "minecraft:overworld");
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

  disasterLevel = 0;
  disasterIndex = 0;
  disaster = DISASTERS[0];
  phase = "warning";
  remaining = 10;
  activeTick = 0;
  failedPlayers.clear();
  deadParticipants.clear();
  runParticipants = new Set(world.getAllPlayers().map(p => p.name));
  setGlobalScore("WORLD_LEVEL", 0);
  setGlobalScore("DISASTER_INDEX", 0);

  try {
    world.sendMessage("§c[Natural Disasters] §fAll players died. Challenge reset to §6Level 0§f. Tornado in 10 seconds.");
  } catch (_) {}
}

function allCurrentParticipantsHaveDied() {
  const online = world.getAllPlayers().filter(p => runParticipants.has(p.name));
  return online.length > 0 && online.every(p => deadParticipants.has(p.name));
}

world.afterEvents.playerSpawn.subscribe(ev => {
  const p = ev.player;
  system.run(() => {
    // Give the starter exactly once per player. Tags persist with the player/world.
    try {
      if (ev.initialSpawn === true && !p.hasTag("sando_disaster_starter_received")) {
        safeCmd(p, "give @s sando:disaster_controller 1");
        p.addTag("sando_disaster_starter_received");
        p.sendMessage("§a[Natural Disasters] §fYou received the §cDisaster Controller§f. Use it to start the disaster waves!");
      }
    } catch (_) {}

    // Scoreboard setup is allowed to retry, but DOES NOT start the game.
    if (!initialized) ensureObjectives();
    ensurePlayerScores(p);

    if (gameStarted) {
      ensurePlayerScores(p);
      runParticipants.add(p.name);
    }
  });
});

world.afterEvents.entityDie.subscribe(ev => {
  const e = ev.deadEntity;
  if (!gameStarted || e.typeId !== "minecraft:player") return;
  const name = e.name;
  system.run(() => {
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

function startGame(source) {
  try {
    if (!bootSystem(false)) {
      try { source?.sendMessage("§e[Natural Disasters] Preparing scoreboards... starting in a moment."); } catch (_) {}
      system.runTimeout(() => {
        if (bootSystem(false)) startGame(source);
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

    cleanupWorld();
    gameStarted = true;
    bootMessageShown = true;
    phase = "warning";
    remaining = 10;
    disasterIndex = 0;
    disasterLevel = 0;
    disaster = DISASTERS[0];
    runParticipants = new Set(world.getAllPlayers().map(p => p.name));
    deadParticipants.clear();
    setGlobalScore("DISASTER_INDEX", 0);
    setGlobalScore("WORLD_LEVEL", 0);

    try { world.sendMessage("§c§l[NATURAL DISASTERS] §r§fThe disaster challenge has started! §eTornado in 10 seconds."); } catch (_) {}
    for (const p of world.getAllPlayers()) {
      try {
        p.onScreenDisplay.setTitle("§c§lNATURAL DISASTERS", {
          subtitle: "§fSTARTED §8| §eTORNADO IN 10 SECONDS",
          fadeInDuration: 3,
          stayDuration: 40,
          fadeOutDuration: 7
        });
        safeCmd(p, "playsound random.levelup @s ~ ~ ~ 1 0.8");
      } catch (_) {}
    }
  } catch (_) {}
}

// Register the controller as a real custom item component during startup.
// This is the primary activation path.
try {
  system.beforeEvents.startup.subscribe((initEvent) => {
    try {
      initEvent.itemComponentRegistry.registerCustomComponent("sando:start_disasters", {
        onUse(event) {
          system.run(() => startGame(event.source));
        }
      });
    } catch (_) {}
  });
} catch (_) {}

// Backup activation path in case a platform handles generic item use differently.
try {
  world.afterEvents.itemUse.subscribe((ev) => {
    try {
      if (ev.itemStack?.typeId === "sando:disaster_controller") {
        system.run(() => startGame(ev.source));
      }
    } catch (_) {}
  });
} catch (_) {}

// Keep /scriptevent as a developer fallback only.
try {
  system.afterEvents.scriptEventReceive.subscribe(ev => {
    if (ev.id !== "sando:start") return;
    system.run(() => startGame(ev.sourceEntity));
  });
} catch (_) {}

// Initialize data only; never auto-start disasters.
system.runTimeout(() => bootSystem(false), 20);

system.runInterval(() => {
  tickCounter++;
  processFloodRestoreQueue();
  if (!initialized) {
    if (tickCounter % 20 === 0) bootSystem(false);
    return;
  }

  if (!gameStarted) {
    if (tickCounter % 40 === 0) {
      for (const p of world.getAllPlayers()) {
        try { p.onScreenDisplay.setActionBar("§cNatural Disasters §8| §fUse the §eDisaster Controller §fto start"); } catch (_) {}
      }
    }
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
