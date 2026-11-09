/** PvP isolation compatibility. Keep this rectangle synchronized with SAPI pvp/rules.js
 * and tools/pvp_map_convert.py if the arena is relocated. All heights are protected. */
export function isPvpPlayer(player) {
 try { return !!player && (player.hasTag("pvp:participant") || player.hasTag("pvp:admission")); }
 catch { return true; }
}
export function isPvpArea(dimensionId, location, padding = 0) {
 if (String(dimensionId || "").replace("minecraft:", "") !== "overworld" || !location) return false;
 return location.x >= 100096 - padding && location.x < 100320 + padding &&
  location.z >= 100096 - padding && location.z < 100384 + padding;
}
export function isPvpExcluded(player) {
 try { return isPvpPlayer(player) || isPvpArea(player.dimension?.id, player.location); }
 catch { return true; }
}
