// SAPI publishes a short-lived, spatially bounded tag because dynamic
// properties cannot be read across different behavior-pack UUIDs.
export function isPlotSafe(player, now = Date.now()) {
 try {
  const dim = player.dimension.id.replace("minecraft:", "");
  const x = Math.floor(player.location.x), z = Math.floor(player.location.z);
  return player.getTags().some(tag => {
   if (!tag.startsWith("sapi_plot_safe:")) return false;
   try {
    const b = JSON.parse(tag.slice("sapi_plot_safe:".length));
    return b.dimension === dim && Number.isFinite(b.expires) && b.expires > now && b.expires <= now + 3000 &&
     [b.minX, b.maxX, b.minZ, b.maxZ].every(Number.isFinite) &&
     x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
   } catch { return false; }
  });
 } catch { return false; }
}
