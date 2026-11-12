/** Weekly raids are not PvP. These reserved defaults mirror Daily's
 * weekly/mapsConfig.js. If the administrator moves a map, update this list and
 * the disaster pack's copy together. Cross-pack dynamic properties are not a
 * shared configuration bus. Daily also enforces its actual installed slots.
 * Do not change terrain/pets below the elevated arenas.
 */
export const WEEKLY_AREAS = Object.freeze([
 { id: "sirok", minX: 120000, maxX: 120160, minZ: 120000, maxZ: 120160, minY: 240, maxY: 320 },
 { id: "mogathul", minX: 120256, maxX: 120384, minZ: 120000, maxZ: 120128, minY: 240, maxY: 320 }
]);
export function isWeeklyArea(dimensionId, location) {
 if (String(dimensionId || "").replace("minecraft:", "") !== "overworld" || !location) return false;
 return WEEKLY_AREAS.some(b => location.x >= b.minX && location.x < b.maxX &&
  location.z >= b.minZ && location.z < b.maxZ && location.y >= b.minY && location.y < b.maxY);
}
export function isWeeklyExcluded(entity) {
 try { return !!entity && (entity.hasTag("weekly:participant") || isWeeklyArea(entity.dimension?.id, entity.location)); }
 catch { return true; }
}
