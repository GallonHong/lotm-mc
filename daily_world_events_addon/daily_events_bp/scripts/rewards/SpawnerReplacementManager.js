import { BlockPermutation, world } from "@minecraft/server";
import { CONFIG } from "../config.js";

function overworld(dimensionId) {
  return String(dimensionId || "").replace("minecraft:", "") === "overworld";
}

/**
 * 分片扫描玩家实际探索到的主世界区块，把遗迹/地牢中已有的原版刷怪笼
 * 换成无品质废墟物资箱。直接读取方块并设置 permutation，不依赖 fill 命令、
 * 管理员权限或刷怪笼内部保存的实体类型。
 */
export class SpawnerReplacementManager {
  static jobs = [];
  static queued = new Set();
  static scanned = new Set();

  static chunkKey(chunkX, chunkZ) {
    return `${chunkX}:${chunkZ}`;
  }

  static enqueueAroundPlayer(player, force = false) {
    if (!player || !overworld(player.dimension?.id)) return 0;
    const centerX = Math.floor(Number(player.location.x) / 16);
    const centerZ = Math.floor(Number(player.location.z) / 16);
    let added = 0;
    for (let dx = -CONFIG.spawnerScanChunkRadius; dx <= CONFIG.spawnerScanChunkRadius; dx++) {
      for (let dz = -CONFIG.spawnerScanChunkRadius; dz <= CONFIG.spawnerScanChunkRadius; dz++) {
        const chunkX = centerX + dx;
        const chunkZ = centerZ + dz;
        const key = this.chunkKey(chunkX, chunkZ);
        if (force) this.scanned.delete(key);
        if (this.scanned.has(key) || this.queued.has(key)) continue;
        if (this.jobs.length >= CONFIG.spawnerScanQueueLimit) return added;
        this.queued.add(key);
        this.jobs.push({ key, chunkX, chunkZ, cursor: 0, retries: 0, replaced: 0 });
        added++;
      }
    }
    return added;
  }

  static enqueueAroundPlayers() {
    for (const player of world.getAllPlayers()) this.enqueueAroundPlayer(player, false);
  }

  static tick() {
    const job = this.jobs.shift();
    if (!job) return;
    let dimension;
    try { dimension = world.getDimension("minecraft:overworld"); }
    catch {
      this.queued.delete(job.key);
      return;
    }
    const x1 = job.chunkX * 16;
    const z1 = job.chunkZ * 16;
    const height = CONFIG.spawnerScanMaxY - CONFIG.spawnerScanMinY + 1;
    const volume = 16 * 16 * height;
    const end = Math.min(volume, job.cursor + CONFIG.spawnerScanBlocksPerTick);
    let unavailable = false;
    let cratePermutation;
    try { cratePermutation = BlockPermutation.resolve("daily:loot_crate_scavenger"); }
    catch { unavailable = true; }
    for (let index = job.cursor; !unavailable && index < end; index++) {
      const localX = index % 16;
      const localZ = Math.floor(index / 16) % 16;
      const y = CONFIG.spawnerScanMinY + Math.floor(index / 256);
      try {
        const block = dimension.getBlock({ x: x1 + localX, y, z: z1 + localZ });
        if (!block) { unavailable = true; break; }
        if (block.typeId === "minecraft:mob_spawner" || block.typeId === "minecraft:monster_spawner") {
          block.setPermutation(cratePermutation);
          job.replaced++;
        }
      } catch { unavailable = true; }
    }
    if (unavailable) {
      job.retries = Number(job.retries || 0) + 1;
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
    this.queued.delete(job.key);
    this.scanned.add(job.key);
    if (job.replaced > 0) console.warn(`[DailyEvents] replaced ${job.replaced} spawner(s) in overworld chunk ${job.key}.`);
    if (this.scanned.size > CONFIG.spawnerScanRememberChunks) this.scanned.clear();
  }
}
