import { world } from "@minecraft/server";

/** Standalone read-only fallback. These presets match Mobs zones.js.
 * Dynamic properties belong to each behavior pack; do not read Mobs/SAPI keys.
 * With Mobs installed its earlier spawn observer owns dynamic-zone assignment.
 */
function dimensionMatches(a, b) {
 return String(a || "").replace("minecraft:", "") === String(b || "").replace("minecraft:", "");
}

function contains(region, dimensionId, location) {
 return dimensionMatches(region.dimension, dimensionId) &&
  location.x >= region.min.x && location.x <= region.max.x &&
  location.y >= region.min.y && location.y <= region.max.y &&
  location.z >= region.min.z && location.z <= region.max.z;
}

export const PRESET_ZONES = Object.freeze([
 {
  id: "apoc_zone_safe_1",
  name: "安全区 1",
  type: "safe",
  dimension: "minecraft:overworld",
  min: { x: 1949, y: -64, z: 1463 },
  max: { x: 3035, y: 320, z: 2469 },
  priority: 500
 },
 {
  id: "apoc_zone_safe_2",
  name: "安全区 2",
  type: "safe",
  dimension: "minecraft:overworld",
  min: { x: 2352, y: -64, z: 1165 },
  max: { x: 2585, y: 320, z: 1303 },
  priority: 500
 },
 {
  id: "apoc_zone_safe_3",
  name: "安全区 3",
  type: "safe",
  dimension: "minecraft:overworld",
  min: { x: 1942, y: -64, z: 1273 },
  max: { x: 2087, y: 320, z: 1465 },
  priority: 500
 },
 {
  id: "apoc_zone_law_1",
  name: "法制区 1",
  type: "law",
  dimension: "minecraft:overworld",
  min: { x: 3450, y: -64, z: 2033 },
  max: { x: 3869, y: 320, z: 2478 },
  priority: 300
 },
 {
  id: "apoc_zone_law_2",
  name: "法制区 2",
  type: "law",
  dimension: "minecraft:overworld",
  min: { x: 1687, y: -64, z: 2509 },
  max: { x: 2250, y: 320, z: 3127 },
  priority: 300
 }
]);

export function resolveBossArmorZone(dimensionId, location) {
 const preset = PRESET_ZONES.filter(zone => contains(zone, dimensionId, location))
  .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
 if (preset) return preset.type;
 if (dimensionMatches(dimensionId, "minecraft:overworld")) {
  let spawn;
  try { spawn = world.getDefaultSpawnLocation(); } catch { spawn = { x: 0, z: 0 }; }
  const dx = location.x - spawn.x;
  const dz = location.z - spawn.z;
  if (dx * dx + dz * dz <= 64 * 64) return "safe";
 }
 return "outlaw";
}
