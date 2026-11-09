import { world, system } from "@minecraft/server";

// Block columns of the 16x16 claim, expanded by 30 on each horizontal side.
// No ownership, PVP or hostile-spawn permissions are changed here.
export const PLOT_SAFE_TAG_PREFIX = "sapi_plot_safe:";
export class PlotSafeZone {
 static find(dimensionId, location) {
  const dim = String(dimensionId).replace("minecraft:", "");
  const x = Math.floor(location.x), z = Math.floor(location.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  // At most 25 local keys; never enumerate all world properties/claims.
  for (let cx = Math.ceil((x - 45) / 16); cx <= Math.floor((x + 30) / 16); cx++) {
   for (let cz = Math.ceil((z - 45) / 16); cz <= Math.floor((z + 30) / 16); cz++) {
    try {
     const raw = world.getDynamicProperty(`plt_${dim}_${cx}_${cz}`);
     if (typeof raw !== "string") continue;
     const plot = JSON.parse(raw);
     if (!plot?.ownerId || plot.chunkX !== cx || plot.chunkZ !== cz ||
         String(plot.dimension).replace("minecraft:", "") !== dim) continue;
     return { dimension: dim, minX: cx * 16 - 30, maxX: cx * 16 + 45,
      minZ: cz * 16 - 30, maxZ: cz * 16 + 45 };
    } catch { /* Ignore malformed/unavailable claims. */ }
   }
  }
  return null;
 }

 static publish(player) {
  // Tags are visible across behavior packs; dynamic properties are pack-scoped.
  for (const tag of player.getTags()) if (tag.startsWith(PLOT_SAFE_TAG_PREFIX)) player.removeTag(tag);
  const bounds = this.find(player.dimension.id, player.location);
  if (bounds) player.addTag(PLOT_SAFE_TAG_PREFIX + JSON.stringify({ ...bounds, expires: Date.now() + 2500 }));
 }

 static start() {
  system.runInterval(() => {
   for (const player of world.getAllPlayers()) {
    try { this.publish(player); } catch { /* Player may disconnect mid-tick. */ }
   }
  }, 20);
 }
}
