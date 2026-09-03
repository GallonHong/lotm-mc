import { world } from "@minecraft/server";
import { CONFIG } from "../config.js";

function overworld(dimensionId) {
  return String(dimensionId || "").replace("minecraft:", "") === "overworld";
}

/**
 * 分片扫描玩家实际探索到的主世界区块，把遗迹/地牢中已有的原版刷怪笼
 * 换成无品质废墟物资箱。每次只执行一个 16×32×16 的 fill，避免一次扫完整高度。
 */
export class SpawnerReplacementManager {
  static jobs = [];
  static queued = new Set();
  static scanned = new Set();

  static chunkKey(chunkX, chunkZ) {
    return `${chunkX}:${chunkZ}`;
  }

  static enqueueAroundPlayers() {
    for (const player of world.getAllPlayers()) {
      if (!overworld(player.dimension?.id)) continue;
      const centerX = Math.floor(Number(player.location.x) / 16);
      const centerZ = Math.floor(Number(player.location.z) / 16);
      for (let dx = -CONFIG.spawnerScanChunkRadius; dx <= CONFIG.spawnerScanChunkRadius; dx++) {
        for (let dz = -CONFIG.spawnerScanChunkRadius; dz <= CONFIG.spawnerScanChunkRadius; dz++) {
          const chunkX = centerX + dx;
          const chunkZ = centerZ + dz;
          const key = this.chunkKey(chunkX, chunkZ);
          if (this.scanned.has(key) || this.queued.has(key)) continue;
          if (this.jobs.length >= CONFIG.spawnerScanQueueLimit) return;
          this.queued.add(key);
          this.jobs.push({ key, chunkX, chunkZ, y: CONFIG.spawnerScanMinY, retries: 0 });
        }
      }
    }
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
    const y2 = Math.min(CONFIG.spawnerScanMaxY, job.y + CONFIG.spawnerScanLayerHeight - 1);
    try {
      dimension.runCommand(`fill ${x1} ${job.y} ${z1} ${x1 + 15} ${y2} ${z1 + 15} daily:loot_crate_scavenger replace minecraft:mob_spawner`);
      job.retries = 0;
    } catch {
      job.retries = Number(job.retries || 0) + 1;
      if (job.retries <= 2) this.jobs.push(job);
      else this.queued.delete(job.key);
      return;
    }
    job.y = y2 + 1;
    if (job.y <= CONFIG.spawnerScanMaxY) {
      this.jobs.push(job);
      return;
    }
    this.queued.delete(job.key);
    this.scanned.add(job.key);
    if (this.scanned.size > CONFIG.spawnerScanRememberChunks) this.scanned.clear();
  }
}
