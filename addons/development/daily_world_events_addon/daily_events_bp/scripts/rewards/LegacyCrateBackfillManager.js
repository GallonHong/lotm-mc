import { BlockPermutation, world } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { LOOT_CRATE_BLOCKS } from "./lootCratePools.js";

const NATURAL_SUPPORT = new Set([
  "minecraft:grass_block", "minecraft:dirt", "minecraft:coarse_dirt", "minecraft:podzol",
  "minecraft:mycelium", "minecraft:moss_block", "minecraft:mud", "minecraft:stone",
  "minecraft:deepslate", "minecraft:sand", "minecraft:red_sand", "minecraft:gravel",
  "minecraft:hardened_clay", "minecraft:terracotta"
]);

const ARTIFICIAL_MARKERS = [
  "planks", "concrete", "glass", "bricks", "crafting_table", "chest", "barrel",
  "furnace", "door", "bed", "stairs", "slab", "fence", "wall", "lantern",
  "torch", "rail", "bookshelf", "anvil", "hopper", "dispenser", "dropper"
];

function hashChunk(chunkX, chunkZ, salt = 0) {
  let value = Math.imul(chunkX | 0, 0x45d9f3b) ^ Math.imul(chunkZ | 0, 0x119de1f3) ^ Math.imul(salt | 0, 0x27d4eb2d);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
}

function selectedChunk(chunkX, chunkZ) {
  return hashChunk(chunkX, chunkZ) % 6 === 0;
}

/** 管理员手动开启的旧地图迁移器；自然 Feature 仍负责以后生成的新区块。 */
export class LegacyCrateBackfillManager {
  static enabled = false;
  static jobs = [];
  static queued = new Set();
  static seen = new Set();
  static processed = new Set();

  static chunkKey(chunkX, chunkZ) {
    return `${chunkX}:${chunkZ}`;
  }

  static initialize() {
    try { this.enabled = world.getDynamicProperty(CONFIG.crateBackfillEnabledKey) === true; }
    catch { this.enabled = false; }
    try {
      const saved = JSON.parse(String(world.getDynamicProperty(CONFIG.crateBackfillProcessedKey) || "[]"));
      if (Array.isArray(saved)) this.processed = new Set(saved.map(String).slice(-CONFIG.crateBackfillProcessedLimit));
    } catch { this.processed = new Set(); }
  }

  static setEnabled(value) {
    this.enabled = value === true;
    this.jobs = [];
    this.queued.clear();
    this.seen.clear();
    try { world.setDynamicProperty(CONFIG.crateBackfillEnabledKey, this.enabled); } catch {}
    return this.enabled;
  }

  static status() {
    return { enabled: this.enabled, queued: this.jobs.length, processed: this.processed.size };
  }

  static saveProcessed() {
    const values = [...this.processed].slice(-CONFIG.crateBackfillProcessedLimit);
    this.processed = new Set(values);
    try { world.setDynamicProperty(CONFIG.crateBackfillProcessedKey, JSON.stringify(values)); } catch {}
  }

  static enqueueAroundPlayers() {
    if (!this.enabled) return 0;
    let added = 0;
    for (const player of world.getAllPlayers()) {
      if (String(player.dimension?.id || "").replace("minecraft:", "") !== "overworld") continue;
      const centerX = Math.floor(Number(player.location.x) / 16);
      const centerZ = Math.floor(Number(player.location.z) / 16);
      for (let dx = -CONFIG.crateBackfillChunkRadius; dx <= CONFIG.crateBackfillChunkRadius; dx++) {
        for (let dz = -CONFIG.crateBackfillChunkRadius; dz <= CONFIG.crateBackfillChunkRadius; dz++) {
          const chunkX = centerX + dx;
          const chunkZ = centerZ + dz;
          const key = this.chunkKey(chunkX, chunkZ);
          if (this.seen.has(key) || this.processed.has(key) || this.queued.has(key)) continue;
          this.seen.add(key);
          if (!selectedChunk(chunkX, chunkZ)) continue;
          if (this.jobs.length >= CONFIG.crateBackfillQueueLimit) return added;
          this.queued.add(key);
          this.jobs.push({ key, chunkX, chunkZ, cursor: 0, retries: 0, found: false, surfaceY: new Array(256) });
          added++;
        }
      }
    }
    return added;
  }

  static finish(job) {
    this.queued.delete(job.key);
    this.processed.add(job.key);
    this.saveProcessed();
  }

  static nearbyArtificial(dimension, location) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = -1; dy <= 2; dy++) {
          const block = dimension.getBlock({ x: location.x + dx, y: location.y + dy, z: location.z + dz });
          if (!block) return true;
          const id = String(block.typeId || "");
          if (LOOT_CRATE_BLOCKS[id]) return true;
          if (ARTIFICIAL_MARKERS.some(marker => id.includes(marker))) return true;
        }
      }
    }
    return false;
  }

  static placeCandidate(job, dimension) {
    let permutation;
    try { permutation = BlockPermutation.resolve("daily:loot_crate_scavenger"); }
    catch { return false; }
    for (let attempt = 0; attempt < 8; attempt++) {
      const random = hashChunk(job.chunkX, job.chunkZ, attempt + 1);
      const localX = random & 15;
      const localZ = (random >>> 8) & 15;
      const column = localZ * 16 + localX;
      let topY = Number(job.surfaceY[column]);
      try {
        if (!Number.isFinite(topY)) {
          const top = dimension.getTopmostBlock({ x: job.chunkX * 16 + localX, z: job.chunkZ * 16 + localZ });
          if (!top) continue;
          topY = Math.floor(top.location.y);
        }
        const location = { x: job.chunkX * 16 + localX, y: topY + 1, z: job.chunkZ * 16 + localZ };
        const support = dimension.getBlock({ x: location.x, y: location.y - 1, z: location.z });
        const target = dimension.getBlock(location);
        if (!support || !target?.isAir || !NATURAL_SUPPORT.has(support.typeId)) continue;
        if (this.nearbyArtificial(dimension, location)) continue;
        target.setPermutation(permutation);
        console.warn(`[DailyEvents][Backfill] placed legacy-world scavenger crate in chunk ${job.key}.`);
        return true;
      } catch {}
    }
    return false;
  }

  static tick() {
    if (!this.enabled) return;
    const job = this.jobs.shift();
    if (!job) return;
    let dimension;
    try { dimension = world.getDimension("minecraft:overworld"); }
    catch { this.queued.delete(job.key); return; }

    const depth = CONFIG.spawnerSurfaceAbove + CONFIG.spawnerSurfaceBelow + 1;
    const volume = 256 * depth;
    const end = Math.min(volume, job.cursor + CONFIG.crateBackfillBlocksPerTick);
    let unavailable = false;
    for (let index = job.cursor; index < end; index++) {
      const column = Math.floor(index / depth);
      const localX = column % 16;
      const localZ = Math.floor(column / 16);
      const x = job.chunkX * 16 + localX;
      const z = job.chunkZ * 16 + localZ;
      try {
        if (!Number.isFinite(job.surfaceY[column])) {
          const top = dimension.getTopmostBlock({ x, z });
          if (!top) throw new Error("surface unavailable");
          job.surfaceY[column] = Math.floor(top.location.y);
        }
        const y = job.surfaceY[column] - CONFIG.spawnerSurfaceBelow + (index % depth);
        const block = dimension.getBlock({ x, y, z });
        if (!block) throw new Error("chunk unavailable");
        if (LOOT_CRATE_BLOCKS[block.typeId]) job.found = true;
      } catch { unavailable = true; break; }
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
    if (!job.found) this.placeCandidate(job, dimension);
    this.finish(job);
  }
}
