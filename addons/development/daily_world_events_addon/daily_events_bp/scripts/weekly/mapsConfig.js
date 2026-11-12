// Original vanilla-block arenas. Only this file configures their world slots.
// Changing a slot invalidates its installation record and requires explicit admin installation.
export const MAP_REVISION = 1;
export const WEEKLY_MAPS = Object.freeze({
 sirok: Object.freeze({ id: "sirok", name: "斯洛克·沉沙采掘场", size: { x: 160, y: 32, z: 160 }, tileWidth: 64,
  spawnOffset: { x: 80.5, y: 4, z: 128.5 }, bossOffset: { x: 80, y: 4, z: 64 },
  combat: { minX: 16, maxX: 143, minY: 4, maxY: 31, minZ: 16, maxZ: 143 } }),
 mogathul: Object.freeze({ id: "mogathul", name: "莫加苏尔·黑箱隔离庭院", size: { x: 128, y: 32, z: 128 }, tileWidth: 64,
  spawnOffset: { x: 64.5, y: 4, z: 98.5 }, bossOffset: { x: 64, y: 4, z: 48 },
  combat: { minX: 16, maxX: 111, minY: 4, maxY: 31, minZ: 16, maxZ: 111 } })
});
export const DEFAULT_WEEKLY_SLOTS = Object.freeze({
 sirok: Object.freeze({ dimension: "minecraft:overworld", origin: { x: 120000, y: 240, z: 120000 } }),
 mogathul: Object.freeze({ dimension: "minecraft:overworld", origin: { x: 120256, y: 240, z: 120000 } })
});
// Keep a conservative gap from existing Daily town slots, PVP map/vault, and documented server zones.
// Administrators moving those systems should update these exclusions together.
export const WEEKLY_PROTECTED_REGIONS = Object.freeze([
 { dimension: "minecraft:overworld", minX: 99968, maxX: 101024, minZ: 99968, maxZ: 100512, name: "Daily/PVP" },
 { dimension: "minecraft:overworld", minX: 1600, maxX: 4000, minZ: 1100, maxZ: 3200, name: "server zones" }
]);

export function mapDefinition(id) {
 const map = WEEKLY_MAPS[id];
 if (!map) throw new Error(`未知周常地图：${id}`);
 return map;
}
export function boxesOverlap(a, b) {
 return a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}
export function pointInMap(point, bounds) {
 return !!point && point.x >= bounds.minX && point.x < bounds.maxX + 1 && point.z >= bounds.minZ && point.z < bounds.maxZ + 1 && point.y >= bounds.minY && point.y < bounds.maxY + 1;
}
export function getMapSlot(id, slots = DEFAULT_WEEKLY_SLOTS) {
 const map = mapDefinition(id), configured = slots[id];
 if (!configured || configured.dimension !== "minecraft:overworld") throw new Error("周常地图只支持已配置的主世界专用区域。");
 const o = configured.origin;
 if (!o || ![o.x, o.y, o.z].every(Number.isSafeInteger) || o.x % 16 || o.z % 16) throw new Error("周常地图坐标必须为整数，X/Z 必须16格对齐。");
 if (Math.abs(o.x) > 29000000 || Math.abs(o.z) > 29000000 || o.y < -64 || o.y + map.size.y > 320) throw new Error("周常地图超出主世界可施工高度/坐标范围。");
 const bounds = { minX: o.x, maxX: o.x + map.size.x - 1, minY: o.y, maxY: o.y + map.size.y - 1, minZ: o.z, maxZ: o.z + map.size.z - 1 };
 for (const area of WEEKLY_PROTECTED_REGIONS) if (area.dimension === configured.dimension && boxesOverlap(bounds, area)) throw new Error(`周常地图与已保留区域 ${area.name} 重叠。`);
 for (const [otherId, other] of Object.entries(slots)) {
  if (otherId === id || other.dimension !== configured.dimension || !WEEKLY_MAPS[otherId]) continue;
  const s = WEEKLY_MAPS[otherId].size, q = other.origin;
  if (!q || ![q.x, q.y, q.z].every(Number.isSafeInteger)) throw new Error("另一周常地图配置无效。");
  if (boxesOverlap(bounds, { minX: q.x, maxX: q.x + s.x - 1, minZ: q.z, maxZ: q.z + s.z - 1 })) throw new Error("周常地图专用区域相互重叠。");
 }
 const absolute = p => ({ x: o.x + p.x, y: o.y + p.y, z: o.z + p.z });
 const c = map.combat;
 return { id, name: map.name, revision: MAP_REVISION, dimension: configured.dimension, origin: { ...o }, size: { ...map.size },
  bounds, combatBounds: { minX: o.x + c.minX, maxX: o.x + c.maxX, minY: o.y + c.minY, maxY: o.y + c.maxY, minZ: o.z + c.minZ, maxZ: o.z + c.maxZ },
  spawn: absolute(map.spawnOffset), bossSpawn: absolute(map.bossOffset),
  center: absolute({ x: map.size.x / 2, y: 4, z: map.size.z / 2 }) };
}
export function getMapTiles(slot) {
 const tiles = [];
 for (let x = 0; x < slot.size.x; x += 64) for (let z = 0; z < slot.size.z; z += 64) {
  tiles.push({ name: `weekly:${slot.id}/tile_${x / 64}_${z / 64}`, location: { x: slot.origin.x + x, y: slot.origin.y, z: slot.origin.z + z },
   size: { x: Math.min(64, slot.size.x - x), y: slot.size.y, z: Math.min(64, slot.size.z - z) } });
 }
 return tiles;
}
export function mapFingerprint(slot) {
 return `${slot.id}|${slot.dimension}|${slot.origin.x},${slot.origin.y},${slot.origin.z}|${slot.size.x},${slot.size.y},${slot.size.z}|r${slot.revision}`;
}
export function getMapInstallConfirmation(id, slots = DEFAULT_WEEKLY_SLOTS) {
 const s = getMapSlot(id, slots), o = s.origin, n = s.size;
 return `INSTALL ${id} ${s.dimension} ${o.x} ${o.y} ${o.z} ${n.x} ${n.y} ${n.z} r${s.revision}`;
}
