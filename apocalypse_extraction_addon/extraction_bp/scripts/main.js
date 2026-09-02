import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { CONFIG } from "./config.js";

console.warn(`[ExtractionCity] v${CONFIG.version} initializing...`);

const extractionJobs = new Map();
const deathHandled = new Set();
const pendingReturn = new Map();

function subscribe(signal, label, handler) {
  if (!signal || typeof signal.subscribe !== "function") {
    console.warn(`[ExtractionCity] ${label} event unavailable.`);
    return false;
  }
  try { signal.subscribe(handler); return true; }
  catch (error) { console.warn(`[ExtractionCity] ${label} subscribe failed: ${error}`); return false; }
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

function safeGround(dimension, x, z) {
  x = Math.floor(x); z = Math.floor(z);
  try {
    const top = dimension.getTopmostBlock({ x, z });
    if (top && top.location.y < 315) return { x: x + 0.5, y: top.location.y + 1, z: z + 0.5 };
  } catch {}
  for (let y = 250; y >= -50; y--) {
    try {
      const floor = dimension.getBlock({ x, y, z });
      const feet = dimension.getBlock({ x, y: y + 1, z });
      const head = dimension.getBlock({ x, y: y + 2, z });
      if (floor && floor.typeId !== "minecraft:air" && feet?.typeId === "minecraft:air" && head?.typeId === "minecraft:air") return { x: x + 0.5, y: y + 1, z: z + 0.5 };
    } catch {}
  }
  try {
    dimension.getBlock({ x, y: 96, z })?.setType("minecraft:stone");
    return { x: x + 0.5, y: 97, z: z + 0.5 };
  } catch { return { x: x + 0.5, y: 120, z: z + 0.5 }; }
}

function storeReturn(player) {
  try {
    player.setDynamicProperty(CONFIG.returnKey, JSON.stringify({ dimension: player.dimension.id, ...player.location }));
  } catch {}
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
    player.setDynamicProperty(CONFIG.returnKey, undefined);
    player.sendMessage(`§a[撤离] ${reason}`);
  } catch (error) { player.sendMessage(`§c撤离失败：${error}`); }
}

function enter(player) {
  const dimension = extractionDimension();
  if (!dimension) {
    player.sendMessage("§c摸金维度未注册。请使用 1.21.120+ 并开启 Beta API 实验玩法。");
    return;
  }
  storeReturn(player);
  const point = CONFIG.entryPoints[Math.floor(Math.random() * CONFIG.entryPoints.length)];
  const x = point.x + Math.floor(Math.random() * 41) - 20;
  const z = point.z + Math.floor(Math.random() * 41) - 20;
  try { dimension.runCommand(`tickingarea add circle ${Math.floor(x)} 96 ${Math.floor(z)} 2 extract_entry true`); } catch {}
  system.runTimeout(() => {
    try {
      const location = safeGround(dimension, x, z);
      player.teleport(location, { dimension });
      player.addTag(CONFIG.activeTag);
      player.addEffect("resistance", 100, { amplifier: 4, showParticles: false });
      player.sendMessage(`§6[摸金都市] 随机出生：${point.name}。寻找任一撤离点安全离开。`);
    } catch (error) { player.sendMessage(`§c进入失败：${error}`); }
    try { dimension.runCommand("tickingarea remove extract_entry"); } catch {}
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
  player.sendMessage(`§e[撤离] ${CONFIG.extractionSeconds} 秒倒计时开始，请留在 ${point.name}。`);
}

function openMenu(player) {
  const inside = player.dimension.id === CONFIG.dimensionId;
  const point = inside ? nearestExit(player) : null;
  const form = new ActionFormData().title("§l§6末日摸金都市")
    .body(inside
      ? `§0快捷栏 1-9 与穿戴装备受保险保护。\n§4背包槽位 10-36 死亡时全部掉落。\n\n§0最近撤离点：§e${point?.name || "无"} §8(${Math.floor(point?.distance || 0)}格)`
      : "§0这是持续开放的最高风险区域，不需要创建战局。\n§0进入位置随机；都市传说 Boss 会低概率出现。")
    .button(inside ? "§a开始撤离" : "§6随机进入都市", inside ? "textures/ui/confirm" : "textures/ui/World")
    .button("§8关闭", "textures/ui/cancel");
  form.show(player).then(result => {
    if (result.canceled || result.selection !== 0) return;
    if (inside) startExtraction(player); else enter(player);
  }).catch(() => {});
}

function dropBackpack(player, location, dimension) {
  if (deathHandled.has(player.id) || player.dimension.id !== CONFIG.dimensionId) return;
  deathHandled.add(player.id);
  const container = player.getComponent("minecraft:inventory")?.container;
  if (container) {
    for (let slot = CONFIG.protectedHotbarSlots; slot < container.size; slot++) {
      try {
        const item = container.getItem(slot);
        if (!item) continue;
        dimension.spawnItem(item, location);
        container.setItem(slot, undefined);
      } catch {}
    }
  }
  pendingReturn.set(player.id, true);
  try { player.setDynamicProperty(CONFIG.deathReturnKey, true); } catch {}
  extractionJobs.delete(player.id);
  try { player.removeTag(CONFIG.activeTag); } catch {}
  system.runTimeout(() => deathHandled.delete(player.id), 100);
}

function enqueueMob(player) {
  const nearby = player.dimension.getEntities({ location: player.location, maxDistance: 48, tags: ["apoc_hostile"] });
  if (nearby.length >= CONFIG.hostileCapPerPlayer) return;
  const choice = weighted(CONFIG.mobPool);
  const heartbeat = Number(world.getDynamicProperty(CONFIG.apocalypseHeartbeatKey) || 0);
  if (!heartbeat || Date.now() - heartbeat > 30000) {
    const angle = Math.random() * Math.PI * 2;
    const location = safeGround(player.dimension, player.location.x + Math.cos(angle) * 24, player.location.z + Math.sin(angle) * 24);
    try {
      const fallback = player.dimension.spawnEntity(choice.key === "raider" ? "minecraft:pillager" : choice.key === "spitter" ? "minecraft:skeleton" : "minecraft:zombie", location);
      fallback.addTag("apoc_hostile"); fallback.addTag("apoc_extraction_hostile");
      if (choice.key === "heavy") fallback.addEffect("resistance", 999999, { amplifier: 2, showParticles: false });
      if (choice.key === "mutant") fallback.addEffect("strength", 999999, { amplifier: 1, showParticles: false });
    } catch {}
    return;
  }
  const queue = parse(world.getDynamicProperty(CONFIG.spawnQueueKey), []);
  queue.push({
    id: `extract_${Date.now().toString(36)}_${Math.floor(Math.random() * 9999)}`,
    dimension: CONFIG.dimensionId, center: { ...player.location }, mobKey: choice.key,
    count: nearby.length < 3 ? 2 : 1, minDistance: 18, maxDistance: 34,
    tags: ["apoc_extraction_hostile"]
  });
  world.setDynamicProperty(CONFIG.spawnQueueKey, JSON.stringify(queue.slice(-50)));
}

function spawnBoss(player) {
  if (player.dimension.getEntities({ tags: ["apoc_extraction_boss"] }).length) return;
  if (Math.random() >= CONFIG.bossChancePerCheck) return;
  const profile = weighted(CONFIG.bossPool);
  const angle = Math.random() * Math.PI * 2;
  const location = safeGround(player.dimension, player.location.x + Math.cos(angle) * 45, player.location.z + Math.sin(angle) * 45);
  try {
    const boss = player.dimension.spawnEntity(profile.id, location);
    boss.addTag("apoc_extraction_boss"); boss.addTag("apoc_hostile");
    world.sendMessage(`§4[都市警报] ${profile.urbanLegend ? "都市传说" : "变异首领"}已在摸金都市出现：${profile.id}`);
  } catch (error) {
    console.warn(`[ExtractionCity] boss ${profile.id} unavailable: ${error}`);
    try {
      const fallback = player.dimension.spawnEntity("minecraft:ravager", location);
      fallback.addTag("apoc_extraction_boss"); fallback.addTag("apoc_hostile");
    } catch {}
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
  if (player?.typeId !== "minecraft:player" || player.dimension.id !== CONFIG.dimensionId) return;
  try {
    const health = player.getComponent("minecraft:health");
    if (health && health.currentValue <= 0) dropBackpack(player, { ...player.location }, player.dimension);
  } catch {}
});

subscribe(world.afterEvents?.entityDie, "entityDie", event => {
  const player = event.deadEntity;
  if (player?.typeId === "minecraft:player") {
    try { dropBackpack(player, { ...player.location }, player.dimension); } catch {}
  }
});

subscribe(world.afterEvents?.playerSpawn, "playerSpawn", event => {
  let shouldReturn = pendingReturn.delete(event.player.id);
  try { shouldReturn ||= event.player.getDynamicProperty(CONFIG.deathReturnKey) === true; } catch {}
  if (!shouldReturn) return;
  try { event.player.setDynamicProperty(CONFIG.deathReturnKey, undefined); } catch {}
  system.runTimeout(() => returnPlayer(event.player, "行动失败，已返回安全区域；背包物资留在死亡地点。"), 20);
});

subscribe(world.beforeEvents?.chatSend, "chatSend", event => {
  if (!String(event.message).toLowerCase().startsWith("!extract")) return;
  event.cancel = true;
  system.run(() => command(event.sender, event.message));
});

subscribe(system.afterEvents?.scriptEventReceive, "scriptEventReceive", event => {
  if (event.id !== "extract:menu" || event.sourceEntity?.typeId !== "minecraft:player") return;
  system.run(() => openMenu(event.sourceEntity));
});

system.runInterval(() => {
  try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}
  for (const player of world.getAllPlayers()) {
    if (player.dimension.id !== CONFIG.dimensionId) continue;
    const point = nearestExit(player);
    if (point && point.distance <= 32) player.onScreenDisplay.setActionBar(`§a撤离点：${point.name} §f${Math.floor(point.distance)}m`);
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
  for (const player of world.getAllPlayers()) if (player.dimension.id === CONFIG.dimensionId) try { enqueueMob(player); } catch {}
}, CONFIG.hostileSpawnIntervalTicks);

system.runInterval(() => {
  for (const player of world.getAllPlayers()) if (player.dimension.id === CONFIG.dimensionId) try { spawnBoss(player); } catch {}
}, CONFIG.bossCheckIntervalTicks);

console.warn("[ExtractionCity] persistent city, insurance, random entry, 8 exits and urban-legend boss pool initialized.");
