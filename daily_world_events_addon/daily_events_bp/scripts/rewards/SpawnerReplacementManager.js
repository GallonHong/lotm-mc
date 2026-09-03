import { BlockPermutation, world } from "@minecraft/server";
import { CONFIG } from "../config.js";

function overworld(dimensionId) {
  return String(dimensionId || "").replace("minecraft:", "") === "overworld";
}

function orderedChunkOffsets(radius) {
  const offsets = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) offsets.push({ dx, dz });
  }
  return offsets.sort((a, b) => (a.dx * a.dx + a.dz * a.dz) - (b.dx * b.dx + b.dz * b.dz));
}

/**
 * 只扫描最可能出现刷怪笼的两个窄层：地表上下 6 格，以及玩家
 * 上方 6 格/下方 12 格。其余高度完全不访问。高度带会按玩家所在
 * 的 12 格分段分别记忆，因此玩家以后深入地下仍会触发一次新扫描。
 */
export class SpawnerReplacementManager {
  static jobs = [];
  static queued = new Set();
  static scanned = new Set();

  static chunkKey(chunkX, chunkZ, playerY) {
    return `${chunkX}:${chunkZ}:${Math.floor(Number(playerY) / 12)}`;
  }

  static enqueueAroundPlayer(player, force = false) {
    if (!player || !overworld(player.dimension?.id)) return 0;
    const centerX = Math.floor(Number(player.location.x) / 16);
    const centerZ = Math.floor(Number(player.location.z) / 16);
    const playerY = Math.floor(Number(player.location.y));
    let added = 0;
    for (const { dx, dz } of orderedChunkOffsets(CONFIG.spawnerScanChunkRadius)) {
      const chunkX = centerX + dx;
      const chunkZ = centerZ + dz;
      const key = this.chunkKey(chunkX, chunkZ, playerY);
      if (force) this.scanned.delete(key);
      if (this.scanned.has(key) || this.queued.has(key)) continue;
      if (this.jobs.length >= CONFIG.spawnerScanQueueLimit) return added;
      this.queued.add(key);
      this.jobs.push({
        key, chunkX, chunkZ, playerY, phase: "surface", cursor: 0,
        retries: 0, replaced: 0, surfaceY: new Array(256)
      });
      added++;
    }
    return added;
  }

  static enqueueAroundPlayers() {
    for (const player of world.getAllPlayers()) this.enqueueAroundPlayer(player, false);
  }

  static finish(job) {
    this.queued.delete(job.key);
    this.scanned.add(job.key);
    if (job.replaced > 0) console.warn(`[DailyEvents] replaced ${job.replaced} spawner(s) in overworld chunk ${job.key}.`);
    if (this.scanned.size > CONFIG.spawnerScanRememberChunks) this.scanned.clear();
  }

  static replaceIfSpawner(dimension, cratePermutation, x, y, z) {
    const block = dimension.getBlock({ x, y, z });
    if (!block) throw new Error("chunk unavailable");
    if (block.typeId !== "minecraft:mob_spawner" && block.typeId !== "minecraft:monster_spawner") return 0;
    block.setPermutation(cratePermutation);
    return 1;
  }

  static tick() {
    const job = this.jobs.shift();
    if (!job) return;
    let dimension;
    let cratePermutation;
    try {
      dimension = world.getDimension("minecraft:overworld");
      cratePermutation = BlockPermutation.resolve("daily:loot_crate_scavenger");
    } catch {
      this.queued.delete(job.key);
      return;
    }

    const x1 = job.chunkX * 16;
    const z1 = job.chunkZ * 16;
    const surfaceDepth = CONFIG.spawnerSurfaceAbove + CONFIG.spawnerSurfaceBelow + 1;
    const playerDepth = CONFIG.spawnerPlayerAbove + CONFIG.spawnerPlayerBelow + 1;
    const volume = 256 * (job.phase === "surface" ? surfaceDepth : playerDepth);
    const end = Math.min(volume, job.cursor + CONFIG.spawnerScanBlocksPerTick);
    let unavailable = false;

    for (let index = job.cursor; index < end; index++) {
      const depth = job.phase === "surface" ? surfaceDepth : playerDepth;
      const column = Math.floor(index / depth);
      const localX = column % 16;
      const localZ = Math.floor(column / 16);
      const x = x1 + localX;
      const z = z1 + localZ;
      let y;
      try {
        if (job.phase === "surface") {
          if (!Number.isFinite(job.surfaceY[column])) {
            const top = dimension.getTopmostBlock({ x, z });
            if (!top) throw new Error("surface unavailable");
            job.surfaceY[column] = Math.floor(top.location.y);
          }
          y = job.surfaceY[column] - CONFIG.spawnerSurfaceBelow + (index % depth);
        } else {
          y = job.playerY - CONFIG.spawnerPlayerBelow + (index % depth);
          const surfaceY = Number(job.surfaceY[column]);
          if (Number.isFinite(surfaceY) && y >= surfaceY - CONFIG.spawnerSurfaceBelow && y <= surfaceY + CONFIG.spawnerSurfaceAbove) continue;
        }
        job.replaced += this.replaceIfSpawner(dimension, cratePermutation, x, y, z);
      } catch {
        unavailable = true;
        break;
      }
    }

    if (unavailable) {
      job.retries++;
      if (job.retries <= 20) this.jobs.push(job);
      else this.queued.delete(job.key);
      return;
    }
    job.retries = 0;
    job.cursor = end;
    if (job.cursor < volume) {
      this.jobs.push(job);
      return;
    }
    if (job.phase === "surface") {
      job.phase = "player";
      job.cursor = 0;
      this.jobs.push(job);
      return;
    }
    this.finish(job);
  }
}
