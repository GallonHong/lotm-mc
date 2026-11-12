import { WEEKLY_MAPS, getMapSlot } from "./mapsConfig.js";
import { isWeeklyMapInstalled } from "./maps.js";

const dimensionKey = id => String(id || "").replace("minecraft:", "");

// Protect the arena and the sky above it, not pets/terrain below the platform.
// Installation is the authorization boundary; moving a configured slot requires
// reinstalling it before this pack starts removing creatures in that location.
export function protectedWeeklySlots() {
 const slots = [];
 for (const id of Object.keys(WEEKLY_MAPS)) {
  try {
   if (!isWeeklyMapInstalled(id)) continue;
   const slot = getMapSlot(id);
   slots.push({ ...slot, protectedBounds: { ...slot.bounds, maxY: 319 } });
  } catch {}
 }
 return slots;
}

export function inWeeklySlot(slot, dimensionId, location, padding = 0) {
 if (!location || dimensionKey(dimensionId) !== dimensionKey(slot.dimension)) return false;
 const b = slot.protectedBounds;
 return location.x >= b.minX - padding && location.x < b.maxX + 1 + padding &&
  location.z >= b.minZ - padding && location.z < b.maxZ + 1 + padding &&
  location.y >= b.minY - padding && location.y < b.maxY + 1 + padding;
}

export function isWeeklyArea(dimensionId, location, padding = 0) {
 return protectedWeeklySlots().some(slot => inWeeklySlot(slot, dimensionId, location, padding));
}

export function isWeeklyExcluded(player) {
 try {
  return !!player && (player.hasTag("weekly:participant") ||
   isWeeklyArea(player.dimension?.id, player.location));
 } catch { return true; }
}
