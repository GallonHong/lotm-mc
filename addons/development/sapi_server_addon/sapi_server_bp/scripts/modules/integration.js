import { allowOrdinaryAction } from "./match_access.js";
import { world, system } from "@minecraft/server";
import { PlotSafeZone } from "./plot_safe_zone.js";

const SERVER_HEARTBEAT = "interop:sapi_server_heartbeat";
const LOTM_HEARTBEAT = "interop:lotm_heartbeat";
const DAILY_EVENTS_HEARTBEAT = "interop:daily_events_heartbeat";
const DAILY_SALES_KEY = "interop:daily_sales:v1";
const APOCALYPSE_HEARTBEAT = "apoc:heartbeat";
const EXTRACTION_HEARTBEAT = "interop:apoc_extraction_heartbeat";
const EXTRACTION_ACK = "interop:apoc_extraction_ack";
const EXTRACTION_MENU_REQUEST = "interop:apoc_extraction_menu_request:v1";
const APOCALYPSE_ZONES_KEY = "apoc:zones:v1";
const SAPI_WARPS_KEY = "sapi:server:warps:v1";
const HEARTBEAT_MAX_AGE_MS = 15000;
const APOCALYPSE_FALLBACK_SAFE_RADIUS = 64;

const APOCALYPSE_PRESET_ZONES = Object.freeze([
 { name: "安全区 1", type: "safe", dimension: "minecraft:overworld", minX: 1949, maxX: 3035, minZ: 1463, maxZ: 2469, priority: 500 },
 { name: "安全区 2", type: "safe", dimension: "minecraft:overworld", minX: 2352, maxX: 2585, minZ: 1165, maxZ: 1303, priority: 500 },
 { name: "安全区 3", type: "safe", dimension: "minecraft:overworld", minX: 1942, maxX: 2087, minZ: 1273, maxZ: 1465, priority: 500 },
 { name: "法制区 1", type: "law", dimension: "minecraft:overworld", minX: 3450, maxX: 3869, minZ: 2033, maxZ: 2478, priority: 300 },
 { name: "法制区 2", type: "law", dimension: "minecraft:overworld", minX: 1687, maxX: 2250, minZ: 2509, maxZ: 3127, priority: 300 },
]);

function parseArray(raw) {
 try {
  const value = typeof raw === "string" ? JSON.parse(raw) : [];
  return Array.isArray(value) ? value : [];
 } catch {
  return [];
 }
}

function readWorldArray(key) {
 try {
  return parseArray(world.getDynamicProperty(key));
 } catch {
  return [];
 }
}

function normalizeDimension(value) {
 return String(value || "").replace("minecraft:", "");
}

function rectanglesOverlap(a, b) {
 return a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

/** 独立 Add-on 之间不使用源码导入，只通过心跳、动态属性与 scriptevent 联动。 */
export class Integration {
 static pendingExtractionRequests = new Map();
 static pendingDailyProbes = new Map();
 static dailyEventsPongAt = 0;

 static readHeartbeat(key) {
  try {
   return Number(world.getDynamicProperty(key) || 0);
  } catch {
   return 0;
  }
 }

 static isAlive(key) {
  const heartbeat = this.readHeartbeat(key);
  return heartbeat > 0 && Date.now() - heartbeat <= HEARTBEAT_MAX_AGE_MS;
 }

 static isServerAvailable() {
  return this.isAlive(SERVER_HEARTBEAT);
 }

 static isLotmAvailable() {
  return this.isAlive(LOTM_HEARTBEAT);
 }

 static isDailyEventsAvailable() {
  // Dynamic Properties may be scoped to the behavior pack UUID on some
  // Bedrock builds. Prefer an explicit cross-pack ping/pong and retain
  // the old heartbeat only as a compatibility fallback.
  return Date.now() - this.dailyEventsPongAt <= HEARTBEAT_MAX_AGE_MS || this.isAlive(DAILY_EVENTS_HEARTBEAT);
 }

 static isApocalypseAvailable() {
  // Apocalypse 每 10 秒刷新一次心跳，额外留出一轮调度余量。
  const heartbeat = this.readHeartbeat(APOCALYPSE_HEARTBEAT);
  return heartbeat > 0 && Date.now() - heartbeat <= 30000;
 }

 static isExtractionAvailable() {
  return this.isAlive(EXTRACTION_HEARTBEAT);
 }

 /**
  * 判断整个 16x16 地皮区块是否与 Apocalypse 安全区相交。
  * 包含内置安全区、管理员动态安全区和主城出生点 64 格保险范围。
  */
 static isApocalypseSafeChunk(dimensionId, chunkX, chunkZ) {
  const dimension = normalizeDimension(dimensionId);
  const chunk = {
   minX: Math.floor(Number(chunkX)) * 16,
   maxX: Math.floor(Number(chunkX)) * 16 + 15,
   minZ: Math.floor(Number(chunkZ)) * 16,
   maxZ: Math.floor(Number(chunkZ)) * 16 + 15,
  };
  if (![chunk.minX, chunk.maxX, chunk.minZ, chunk.maxZ].every(Number.isFinite)) return true;

  const presetOverlap = APOCALYPSE_PRESET_ZONES.filter(z => z.type === "safe").some(zone =>
   normalizeDimension(zone.dimension) === dimension && rectanglesOverlap(chunk, zone)
  );
  if (presetOverlap) return true;

  const dynamicZones = readWorldArray(APOCALYPSE_ZONES_KEY);
  const dynamicOverlap = dynamicZones.some(zone => {
   if (zone?.type !== "safe" || !zone.min || !zone.max) return false;
   if (normalizeDimension(zone.dimension) !== dimension) return false;
   const bounds = {
    minX: Number(zone.min.x), maxX: Number(zone.max.x),
    minZ: Number(zone.min.z), maxZ: Number(zone.max.z),
   };
   if (![bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ].every(Number.isFinite)) return false;
   return rectanglesOverlap(chunk, bounds);
  });
  if (dynamicOverlap) return true;

  const warps = readWorldArray(SAPI_WARPS_KEY);
  const spawnWarp = warps.find(warp => warp?.id === "spawn" || warp?.isSpawn);
  let spawn;
  if (spawnWarp) {
   spawn = {
    dimension: spawnWarp.dimension,
    x: Number(spawnWarp.x),
    z: Number(spawnWarp.z),
   };
  } else {
   try {
    const location = world.getDefaultSpawnLocation();
    spawn = { dimension: "minecraft:overworld", x: Number(location.x), z: Number(location.z) };
   } catch {
    spawn = { dimension: "minecraft:overworld", x: 2423.49, z: 2019.55 };
   }
  }
  if (normalizeDimension(spawn.dimension) !== dimension || !Number.isFinite(spawn.x) || !Number.isFinite(spawn.z)) return false;

  // 圆形安全区与矩形区块的最近点距离。
  const nearestX = Math.max(chunk.minX, Math.min(spawn.x, chunk.maxX));
  const nearestZ = Math.max(chunk.minZ, Math.min(spawn.z, chunk.maxZ));
  const dx = nearestX - spawn.x;
  const dz = nearestZ - spawn.z;
  return dx * dx + dz * dz <= APOCALYPSE_FALLBACK_SAFE_RADIUS * APOCALYPSE_FALLBACK_SAFE_RADIUS;
 }

 /**
  * 解析玩家当前位置所属的末日/服务器区域类型与名称
  * @param {string} dimensionId 
  * @param {{x: number, y: number, z: number}} location 
  * @returns {{type: string, name: string, color: string}}
  */
 static resolveCurrentZone(dimensionId, location) {
  const dim = normalizeDimension(dimensionId);
  const pt = { x: Number(location.x), y: Number(location.y), z: Number(location.z) };

  if (PlotSafeZone.find(dim, pt)) return { type: "safe", name: "地皮周边安全区", color: "§a", source: "plot" };

  // 1. 检查预设区域 (安全区 / 法制区)
  const preset = APOCALYPSE_PRESET_ZONES.find(z =>
   normalizeDimension(z.dimension) === dim &&
   pt.x >= z.minX && pt.x <= z.maxX &&
   pt.z >= z.minZ && pt.z <= z.maxZ
  );
  if (preset) {
   if (preset.type === "safe") return { type: "safe", name: preset.name, color: "§a" };
   if (preset.type === "law") return { type: "law", name: preset.name, color: "§e" };
   return { type: preset.type, name: preset.name, color: "§6" };
  }

  // 2. 检查动态末日区域
  const dynamicZones = readWorldArray(APOCALYPSE_ZONES_KEY);
  const dyn = dynamicZones.find(z =>
   normalizeDimension(z.dimension) === dim &&
   z.min && z.max &&
   pt.x >= Number(z.min.x) && pt.x <= Number(z.max.x) &&
   pt.y >= Number(z.min.y) && pt.y <= Number(z.max.y) &&
   pt.z >= Number(z.min.z) && pt.z <= Number(z.max.z)
  );
  if (dyn) {
   const color = dyn.type === "safe" ? "§a" : dyn.type === "law" ? "§e" : "§c";
   return { type: dyn.type || "outlaw", name: dyn.name || "末日区域", color };
  }

  // 3. 检查出生点主城安全区
  const warps = readWorldArray(SAPI_WARPS_KEY);
  const spawnWarp = warps.find(warp => warp?.id === "spawn" || warp?.isSpawn);
  let spawn = { dimension: "minecraft:overworld", x: 2423.49, z: 2019.55 };
  if (spawnWarp) {
   spawn = { dimension: spawnWarp.dimension, x: Number(spawnWarp.x), z: Number(spawnWarp.z) };
  } else {
   try {
    const loc = world.getDefaultSpawnLocation();
    spawn = { dimension: "minecraft:overworld", x: Number(loc.x), z: Number(loc.z) };
   } catch {}
  }
  if (normalizeDimension(spawn.dimension) === dim) {
   const dx = pt.x - spawn.x;
   const dz = pt.z - spawn.z;
   if (dx * dx + dz * dz <= APOCALYPSE_FALLBACK_SAFE_RADIUS * APOCALYPSE_FALLBACK_SAFE_RADIUS) {
    return { type: "safe", name: "主城保护区", color: "§a" };
   }
  }

  // 4. 默认非法制区
  return { type: "outlaw", name: "非法制荒原", color: "§c" };
 }

 /** Conservative movement allowance around proof endpoints. Distance to every
  * potentially relevant boundary is a lower bound, never an optimistic radius.
  * Uses the same resolver data as segmentCrossesSafeZone. */
 static safeMovementMargin(dimensionId, points, regions = []) {
  const dim=normalizeDimension(dimensionId);let margin=0.5;
  if(!Array.isArray(points)||!points.length)return 0;
  const plane=(point,axis,value)=>{if(Number.isFinite(value))margin=Math.min(margin,Math.abs(point[axis]-value));};
  const dynamic=readWorldArray(APOCALYPSE_ZONES_KEY);
  const spawnWarp=readWorldArray(SAPI_WARPS_KEY).find(w=>w?.id==='spawn'||w?.isSpawn);
  let spawn={dimension:'minecraft:overworld',x:2423.49,z:2019.55};
  if(spawnWarp)spawn={dimension:spawnWarp.dimension,x:Number(spawnWarp.x),z:Number(spawnWarp.z)};
  else try{const p=world.getDefaultSpawnLocation();spawn={dimension:'minecraft:overworld',x:Number(p.x),z:Number(p.z)};}catch{}
  for(const point of points){
   if(!['x','y','z'].every(a=>Number.isFinite(point?.[a])))return 0;
   for(const r of regions){if(!r.min||!r.max)return 0;for(const a of ['x','y','z']){plane(point,a,r.min[a]);plane(point,a,r.max[a]);}}
   for(const z of APOCALYPSE_PRESET_ZONES.filter(z=>normalizeDimension(z.dimension)===dim)){
    plane(point,'x',z.minX);plane(point,'x',z.maxX);plane(point,'z',z.minZ);plane(point,'z',z.maxZ);
   }
   for(const z of dynamic.filter(z=>normalizeDimension(z?.dimension)===dim)){
    if(!z?.min||!z?.max)continue;for(const a of ['x','y','z']){plane(point,a,Number(z.min[a]));plane(point,a,Number(z.max[a]));}
   }
   if(normalizeDimension(spawn.dimension)===dim)margin=Math.min(margin,Math.abs(Math.hypot(point.x-spawn.x,point.z-spawn.z)-APOCALYPSE_FALLBACK_SAFE_RADIUS));
   // Only claims capable of intersecting the endpoint's half-block movement
   // ball matter. PlotSafeZone uses floor coordinates, so max edge is +1.
   for(let cx=Math.ceil((Math.floor(point.x-0.5)-45)/16);cx<=Math.floor((Math.floor(point.x+0.5)+30)/16);cx++){
    for(let cz=Math.ceil((Math.floor(point.z-0.5)-45)/16);cz<=Math.floor((Math.floor(point.z+0.5)+30)/16);cz++){
     try{const raw=world.getDynamicProperty(`plt_${dim}_${cx}_${cz}`);if(typeof raw!=='string')continue;const plot=JSON.parse(raw);
      if(!plot?.ownerId||plot.chunkX!==cx||plot.chunkZ!==cz||normalizeDimension(plot.dimension)!==dim)continue;
      plane(point,'x',cx*16-30);plane(point,'x',cx*16+46);plane(point,'z',cz*16-30);plane(point,'z',cz*16+46);
     }catch{return 0;}
    }
   }
  }
  // Stay strictly inside the same boundary cell, even under float round-off.
  return Math.max(0,margin-0.0001);
 }

 /** Exact segment safety query. Partition at every resolver boundary, including
  * integer claim columns and spawn-circle roots; thin regions cannot be skipped. */
 static segmentCrossesSafeZone(dimensionId, start, end) {
  if (!['x','y','z'].every(a => Number.isFinite(start?.[a]) && Number.isFinite(end?.[a]))) return true;
  const delta = {x:end.x-start.x,y:end.y-start.y,z:end.z-start.z};
  if (Math.hypot(delta.x,delta.y,delta.z) > 100) return true;
  const cuts = [0,1], add = t => { if (Number.isFinite(t) && t>0 && t<1) cuts.push(t); };
  const plane = (axis, value) => { if (delta[axis]) add((value-start[axis])/delta[axis]); };
  // PlotSafeZone resolves floor(x/z). Each open interval stays in one column.
  for (const axis of ['x','z']) {
   for(let n=Math.ceil(Math.min(start[axis],end[axis]));n<=Math.floor(Math.max(start[axis],end[axis]));n++) plane(axis,n);
  }
  for (const z of APOCALYPSE_PRESET_ZONES) {
   plane('x',z.minX);plane('x',z.maxX);plane('z',z.minZ);plane('z',z.maxZ);
  }
  for (const z of readWorldArray(APOCALYPSE_ZONES_KEY)) {
   if (!z?.min || !z?.max) continue;
   for(const axis of ['x','y','z']) { plane(axis,Number(z.min[axis]));plane(axis,Number(z.max[axis])); }
  }
  const spawnWarp=readWorldArray(SAPI_WARPS_KEY).find(w=>w?.id==='spawn'||w?.isSpawn);
  let spawn={dimension:'minecraft:overworld',x:2423.49,z:2019.55};
  if(spawnWarp)spawn={dimension:spawnWarp.dimension,x:Number(spawnWarp.x),z:Number(spawnWarp.z)};
  else try{const p=world.getDefaultSpawnLocation();spawn={dimension:'minecraft:overworld',x:Number(p.x),z:Number(p.z)};}catch{}
  if(normalizeDimension(spawn.dimension)===normalizeDimension(dimensionId)){
   const x=start.x-spawn.x,z=start.z-spawn.z,a=delta.x**2+delta.z**2,b=2*(x*delta.x+z*delta.z),c=x*x+z*z-APOCALYPSE_FALLBACK_SAFE_RADIUS**2;
   const disc=b*b-4*a*c;
   if(a>0&&disc>=0){add((-b-Math.sqrt(disc))/(2*a));add((-b+Math.sqrt(disc))/(2*a));}
  }
  cuts.sort((a,b)=>a-b);
  const checks=[...cuts];for(let i=1;i<cuts.length;i++)checks.push((cuts[i-1]+cuts[i])/2);
  return checks.some(t=>this.resolveCurrentZone(dimensionId,{x:start.x+delta.x*t,y:start.y+delta.y*t,z:start.z+delta.z*t}).type==='safe');
 }

 /** 累计成交额桥接：日常 Add-on 只读取差值，不介入 SAPI 交易。 */
 static recordDailySale(playerName, amount) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (!playerName || !value) return;
  try {
   const raw = world.getDynamicProperty(DAILY_SALES_KEY);
   const totals = typeof raw === "string" ? JSON.parse(raw) : {};
   totals[playerName] = Math.max(0, Math.floor(Number(totals[playerName]) || 0)) + value;
   world.setDynamicProperty(DAILY_SALES_KEY, JSON.stringify(totals));
  } catch (error) {
   console.warn(`[Integration] Failed to record daily sale: ${error}`);
  }
 }

 static startServerHeartbeat() {
  this.startHeartbeat(SERVER_HEARTBEAT);
  const probe = () => {
   const player = world.getAllPlayers()[0];
   if (player) this.probeDailyEvents(player);
  };
  system.runTimeout(probe, 20);
  system.runInterval(probe, 40);
 }

 static probeDailyEvents(player) {
  if (!player) return false;
  const nonce = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  this.pendingDailyProbes.set(nonce, Date.now() + 10000);
  for (const [key, expiresAt] of this.pendingDailyProbes) {
   if (expiresAt < Date.now()) this.pendingDailyProbes.delete(key);
  }
  return this.send(player, "sapi:daily_probe", nonce);
 }

 static receiveDailyPong(message) {
  const nonce = String(message || "").trim();
  if (!nonce || !this.pendingDailyProbes.has(nonce)) return false;
  this.pendingDailyProbes.delete(nonce);
  this.dailyEventsPongAt = Date.now();
  return true;
 }

 static startLotmHeartbeat() {
  this.startHeartbeat(LOTM_HEARTBEAT);
 }

 static startHeartbeat(key) {
  const beat = () => {
   try { world.setDynamicProperty(key, Date.now()); } catch {}
  };
  beat();
  system.runInterval(beat, 100);
 }

 static send(player, eventId, message = "") {
  if (!String(eventId).startsWith("pvp:") && !allowOrdinaryAction(player)) return false;
  try {
   // 等上一张服务器表单彻底关闭后再触发另一个 Addon 的 UI，
   // 避免 Bedrock 返回 UserBusy 后静默吞掉目标菜单。
   system.runTimeout(() => {
    try {
     // runCommand 触发的 scriptevent 在部分 Bedrock 版本中会被标为
     // Server 来源，目标 Add-on 收不到 sourceEntity。把玩家名放入
     // 联动信封，目标包可在多人服务器中准确找回发起者。
     const envelope = `__sapi_player__=${encodeURIComponent(player.name)}&data=${encodeURIComponent(String(message || ""))}`;
     if (!String(eventId).startsWith("pvp:") && !allowOrdinaryAction(player)) return false;
     player.runCommand(`scriptevent ${eventId} ${envelope}`);
    } catch (error) {
     console.warn(`[Integration] Failed to send ${eventId}: ${error}`);
     try { player.sendMessage("§c联动菜单打开失败，请确认目标 Addon 已启用。"); } catch {}
    }
   }, 3);
   return true;
  } catch {
   return false;
  }
 }

 static openExtractionMenu(player) {
  if (!allowOrdinaryAction(player)) return;
  const pending = this.pendingExtractionRequests.get(player.id);
  if (pending) {
   try {
    if (Number(player.getDynamicProperty(EXTRACTION_ACK) || 0) !== pending) {
     player.sendMessage("§e摸金都市仍在初始化，请稍候，不要重复点击入口。");
     return;
    }
   } catch {}
   this.pendingExtractionRequests.delete(player.id);
  }
  const requestId = Date.now();
  this.pendingExtractionRequests.set(player.id, requestId);
  try { player.setDynamicProperty(EXTRACTION_ACK, 0); } catch {}
  try { player.setDynamicProperty(EXTRACTION_MENU_REQUEST, requestId); } catch {}
  try { player.sendMessage("§e正在连接摸金都市……Beta 维度首次初始化可能需要 10～20 秒，请勿重复点击。"); } catch {}
  this.send(player, "extract:menu", String(requestId));
  const check = elapsedTicks => {
   try {
    if (Number(player.getDynamicProperty(EXTRACTION_ACK) || 0) === requestId) {
     this.pendingExtractionRequests.delete(player.id);
     return;
    }
    if (elapsedTicks === 60) player.sendMessage("§6摸金都市仍在加载，后台会继续等待；首次进入生成城区时可能需要更久。");
    if (elapsedTicks < 400) {
     system.runTimeout(() => check(elapsedTicks + 10), 10);
     return;
    }
    this.pendingExtractionRequests.delete(player.id);
    let dimensionRegistered = false;
    try { dimensionRegistered = !!world.getDimension("apoc_extract:city"); } catch {}
    player.sendMessage(dimensionRegistered
     ? "§c摸金都市维度已注册，但玩法脚本没有确认菜单请求。请检查内容日志中是否出现 [ExtractionCity] v0.3.4 initialized，以及是否同时启用了 Beta APIs。"
     : "§c摸金都市行为脚本没有启动。请在当前世界的行为包列表启用 Apocalypse Extraction City BP v0.3.4，并开启 Beta APIs；仅导入 .mcaddon 不会自动给已有世界启用行为包。");
   } catch {
    this.pendingExtractionRequests.delete(player.id);
   }
  };
  system.runTimeout(() => check(10), 10);
 }

}
