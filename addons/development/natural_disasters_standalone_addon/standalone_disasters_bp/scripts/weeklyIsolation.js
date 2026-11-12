/** Independent weekly-raid protection, NOT PvP. Dynamic properties are pack-scoped.
 * Mirror Daily scripts/weekly/mapsConfig.js defaults; synchronize if maps move.
 * Daily additionally enforces its live configured regions. Below-platform terrain
 * remains ordinary world. Bounds are half-open, with 3D effect padding. */
export const WEEKLY_REGIONS = Object.freeze([
 { min: { x: 120000, y: 240, z: 120000 }, max: { x: 120160, y: 320, z: 120160 } },
 { min: { x: 120256, y: 240, z: 120000 }, max: { x: 120384, y: 320, z: 120128 } },
]);
export function isWeeklyParticipant(entity) {
 try { return !!entity && (entity.hasTag("weekly:participant") || entity.hasTag("weekly:admission")); }
 catch { return true; }
}
export function isWeeklyArea(dimensionId, location, padding = 0) {
 if (String(dimensionId || "").replace("minecraft:", "") !== "overworld" || !location) return false;
 return WEEKLY_REGIONS.some(({ min, max }) =>
  location.x >= min.x - padding && location.x < max.x + padding &&
  location.y >= min.y - padding && location.y < max.y + padding &&
  location.z >= min.z - padding && location.z < max.z + padding);
}
export function isWeeklyExcluded(entity) {
 try { return isWeeklyParticipant(entity) || isWeeklyArea(entity.dimension?.id, entity.location); }
 catch { return true; }
}
/** Native explosion/lightning damage cannot filter victims. Skip the source if
 * its whole influence can reach a protected entity, even during admission. */
export function touchesWeeklyProtection(dimension, location, radius) {
 if (isWeeklyArea(dimension.id, location, radius)) return true;
 try { return dimension.getEntities({ location, maxDistance: radius }).some(isWeeklyExcluded); }
 catch { return true; }
}
