import { world, system } from "@minecraft/server";
import { DEFAULT_WEEKLY_SLOTS, getMapSlot, getMapTiles, mapFingerprint, getMapInstallConfirmation, pointInMap } from "./mapsConfig.js";
export { WEEKLY_MAPS, DEFAULT_WEEKLY_SLOTS, getMapSlot, getMapInstallConfirmation } from "./mapsConfig.js";

export const MAP_STATE_KEY = "daily:weekly_maps_v1";
export const MAP_WORK_AREA = "daily_weekly_work";
export const MAP_LOAD_TIMEOUT_TICKS = 1200;
const POLL_TICKS = 10;
const busyMaps = new Set();
let workTail = Promise.resolve();
const delay = ticks => new Promise(resolve => system.runTimeout(resolve, ticks));

export class WeeklyMapError extends Error {
 constructor(code, message) { super(message); this.name = "WeeklyMapError"; this.code = code; }
}
function failure(code, message) { throw new WeeklyMapError(code, message); }
function readState() {
 const raw = world.getDynamicProperty(MAP_STATE_KEY);
 if (!raw) return {};
 try { const parsed = JSON.parse(String(raw)); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed; } catch {}
 failure("STATE_CORRUPT", "周常地图安装记录损坏，已停止施工；请先检查记录，不会自动覆盖区域。");
}
function saveRecord(id, record) {
 const state = readState(); state[id] = record;
 world.setDynamicProperty(MAP_STATE_KEY, JSON.stringify(state));
}
function validPlayer(player) {
 try { return !!player && (typeof player.isValid === "function" ? player.isValid() : player.isValid === true); } catch { return false; }
}
function isAdmin(player) {
 if (!validPlayer(player)) return false;
 try { if (player.hasTag("admin")) return true; } catch {}
 try { return typeof player.isOp === "function" && player.isOp(); } catch { return false; }
}
function note(player, text) { try { player?.sendMessage(`§6[周常地图] §r${text}`); } catch {} }
function command(dimension, text, label) {
 let result;
 try { result = dimension.runCommand(text); }
 catch (error) { failure("COMMAND_FAILED", `${label}失败：${error.message || error}。不会删除其他系统的常加载区。`); }
 if (!(result?.successCount > 0)) failure("COMMAND_FAILED", `${label}未确认成功（successCount=${result?.successCount ?? "缺失"}）。请检查命令权限和全局常加载区名额；不会清理其他常加载区。`);
 return result;
}
function assertVacant(slot) {
 // A player just above the structure can fall into it during an asynchronous load.
 const safeBounds = { ...slot.bounds, maxY: 319 };
 for (const player of world.getAllPlayers()) {
  if (player.dimension.id === slot.dimension && pointInMap(player.location, safeBounds)) failure("PLAYER_PRESENT", `专用区域内仍有玩家 ${player.name || player.id}，拒绝覆盖。请先离开地图上方和内部。`);
 }
}
function assertAccess(id, slot, options, install) {
 if (typeof options.canInstall !== "function" || options.canInstall(id, slot) !== true) failure("ROOM_BUSY", "地图正在战斗/恢复或未提供空闲检查，拒绝施工。");
 if (install && !isAdmin(options.player)) failure("ADMIN_REQUIRED", "安装周常地图需要在线管理员。");
 assertVacant(slot);
}
export function isWeeklyMapBusy(id) { return busyMaps.has(id); }
export function isWeeklyMapInstalled(id, slots = DEFAULT_WEEKLY_SLOTS) {
 try {
  const slot = getMapSlot(id, slots), record = readState()[id];
  return record?.status === "ready" && record.fingerprint === mapFingerprint(slot);
 } catch { return false; }
}
export function inspectWeeklyMap(id, slots = DEFAULT_WEEKLY_SLOTS) {
 const slot = getMapSlot(id, slots), record = readState()[id] || null;
 return { ...slot, installed: isWeeklyMapInstalled(id, slots), busy: isWeeklyMapBusy(id), record,
  confirmation: getMapInstallConfirmation(id, slots),
  warning: `安装会把 ${slot.dimension} 的 ${slot.bounds.minX},${slot.bounds.minY},${slot.bounds.minZ} 至 ${slot.bounds.maxX},${slot.bounds.maxY},${slot.bounds.maxZ} 全部替换，包括空气、地形与原建筑。此区域此后专用于周常地图，每次重置均覆盖，请先备份世界。` };
}
export function mapChunkColumns(tile, dimension) {
 const p = tile.location, s = tile.size;
 if (![p.x, p.y, p.z, s.x, s.y, s.z].every(Number.isSafeInteger) || s.x < 1 || s.y < 1 || s.z < 1) failure("INVALID_TILE", "结构切片坐标/尺寸无效。");
 const h = dimension.heightRange || { min: -64, max: 320 };
 if (p.y < h.min || p.y + s.y > h.max) failure("HEIGHT_RANGE", "周常地图切片超出维度高度。");
 const x0 = Math.floor(p.x / 16), x1 = Math.floor((p.x + s.x - 1) / 16), z0 = Math.floor(p.z / 16), z1 = Math.floor((p.z + s.z - 1) / 16);
 if ((x1 - x0 + 1) * (z1 - z0 + 1) > 100) failure("AREA_CAPACITY", "单片超过100区块，拒绝申请常加载区。");
 const columns = [];
 for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) columns.push({ x: x * 16 + 8, y: p.y, z: z * 16 + 8 });
 return columns;
}
async function waitForColumns(dimension, columns, options, check) {
 let missing = columns.length, lastError = "";
 const timeout = options.timeoutTicks ?? MAP_LOAD_TIMEOUT_TICKS;
 if (!Number.isInteger(timeout) || timeout < 0 || timeout > 2400) failure("INVALID_TIMEOUT", "地图等待上限必须为0..2400 tick。");
 for (let elapsed = 0; elapsed <= timeout; elapsed += POLL_TICKS) {
  check(); missing = 0;
  for (const position of columns) {
   try { if (!dimension.getBlock(position)) missing++; }
   catch (error) { missing++; lastError = `${error.name || "Error"}: ${error.message || error}`; }
  }
  if (missing === 0) return;
  if (elapsed && elapsed % 200 === 0) note(options.player, `正在加载 ${columns.length - missing}/${columns.length} 区块，已等待${elapsed / 20}秒。`);
  if (elapsed + POLL_TICKS <= timeout) await delay(POLL_TICKS);
 }
 failure("LOAD_TIMEOUT", `周常地图加载超时：${missing}/${columns.length} 区块不可读。${lastError}`);
}
async function removeOwnWorkArea(dimension) {
 // Only this add-on's single private temporary name. Never remove_all or other areas.
 let lastError;
 for (let attempt = 0; attempt < 3; attempt++) {
  try {
   const removed = dimension.runCommand(`tickingarea remove ${MAP_WORK_AREA}`);
   if (removed?.successCount > 0) { await delay(10); return; }
   // A missing named area is already clean. Query failure is not proof of absence.
   const present = dimension.runCommand(`tickingarea preload ${MAP_WORK_AREA}`);
   if (present && present.successCount === 0) { await delay(10); return; }
   lastError = new Error("私有临时常加载区仍存在");
  } catch (error) {
   // Bedrock can throw for removing/querying a nonexistent name; an add later is
   // authoritative for capacity. A final failed removal is surfaced below.
   lastError = error;
  }
  await delay(10);
 }
 failure("CLEANUP_FAILED", `无法确认清理临时常加载区 ${MAP_WORK_AREA}：${lastError?.message || lastError}。请管理员只检查该名称。`);
}
async function withLoadedTile(dimension, tile, options, check, write) {
 const p = tile.location, s = tile.size, columns = mapChunkColumns(tile, dimension);
 let allocationAttempted = false, operationError = null;
 try {
  check(); allocationAttempted = true;
  // A previous interrupted load may own this exact name. Missing-name errors are harmless here.
  try { dimension.runCommand(`tickingarea remove ${MAP_WORK_AREA}`); } catch {}
  await delay(10); check();
  command(dimension, `tickingarea add ${p.x} ${p.y} ${p.z} ${p.x + s.x - 1} ${p.y} ${p.z + s.z - 1} ${MAP_WORK_AREA} true`, "申请周常地图临时常加载区");
  await delay(10);
  await waitForColumns(dimension, columns, options, check);
  check(); await write();
  await delay(5);
 } catch (error) { operationError = error; throw error; }
 finally {
  if (allocationAttempted) {
   try { await removeOwnWorkArea(dimension); }
   catch (error) {
    if (!operationError) throw error;
    operationError.message += `；另有清理错误：${error.message}`;
    console.warn(`[Weekly map cleanup] ${error.message}`);
   }
  }
 }
}
function enqueue(id, operation) {
 if (busyMaps.has(id)) return Promise.reject(new WeeklyMapError("MAP_BUSY", "该周常地图已在安装或重置中。"));
 busyMaps.add(id);
 const work = workTail.then(operation).finally(() => busyMaps.delete(id));
 workTail = work.catch(() => {});
 return work;
}
async function loadMap(id, options, install) {
 const slots = options.slots || DEFAULT_WEEKLY_SLOTS, slot = getMapSlot(id, slots);
 assertAccess(id, slot, options, install);
 const fingerprint = mapFingerprint(slot), previous = readState()[id];
 if (install && options.confirmation !== getMapInstallConfirmation(id, slots)) failure("CONFIRMATION_REQUIRED", "需要确认完整坐标范围与覆盖警告后，提交当前安装确认码。");
 if (!install && (previous?.status !== "ready" || previous.fingerprint !== fingerprint)) failure("NOT_INSTALLED", "此坐标/版本尚未完成管理员安装，不会自动生成地图。请先由管理员安装。");
 const dimension = world.getDimension(slot.dimension), tiles = getMapTiles(slot);
 const started = system.currentTick;
 const check = () => {
  assertAccess(id, slot, options, install);
  if (system.currentTick - started > 6000) failure("JOB_TIMEOUT", "周常地图施工已超过5分钟模拟时间，停止并保留未完成状态。");
 };
 // Durable intent precedes writes. Restart or partial failure can never look ready.
 saveRecord(id, { fingerprint, status: "loading", completedTiles: 0, totalTiles: tiles.length, installedBy: install ? options.player.id : previous.installedBy });
 try {
  for (let i = 0; i < tiles.length; i++) {
   const tile = tiles[i];
   await withLoadedTile(dimension, tile, options, check, () => {
    const p = tile.location;
    // Match the existing DungeonManager fallback. Assets contain no entities.
    // Default rotation, full block integrity, and included air are intentional.
    command(dimension, `structure load "${tile.name}" ${p.x} ${p.y} ${p.z}`, `载入地图切片 ${i + 1}/${tiles.length}`);
   });
   saveRecord(id, { fingerprint, status: "loading", completedTiles: i + 1, totalTiles: tiles.length, installedBy: install ? options.player.id : previous.installedBy });
   note(options.player, `${slot.name}：已完成${i + 1}/${tiles.length}片。`);
  }
  check();
  saveRecord(id, { fingerprint, status: "ready", completedTiles: tiles.length, totalTiles: tiles.length, installedBy: install ? options.player.id : previous.installedBy });
  return getMapSlot(id, slots);
 } catch (error) {
  const partial = readState()[id] || {};
  saveRecord(id, { ...partial, fingerprint, status: "failed", error: String(error.message || error).slice(0, 500) });
  throw error;
 }
}
/** Explicit admin installation reserves/overwrites this exact region, never automatic on entry. */
export function installWeeklyMap(id, options = {}) { return enqueue(id, () => loadMap(id, options, true)); }
/** Manager only: must pass canInstall(id,slot) returning true while the room is empty/inactive. */
export function resetWeeklyMap(id, options = {}) { return enqueue(id, () => loadMap(id, options, false)); }
