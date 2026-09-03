import { world, system, EquipmentSlot } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { CONFIG } from "./config.js";

console.warn(`[ExtractionCity] v${CONFIG.version} initializing...`);

const DIMENSION_BOOTSTRAP_HEARTBEAT = "interop:apoc_extraction_dimension_bootstrap:v1";
const DIMENSION_BOOTSTRAP_ERROR = "interop:apoc_extraction_dimension_error:v1";

const extractionJobs = new Map();
const deathHandled = new Set();
const pendingReturn = new Map();
const backpackSnapshots = new Map();
const insuredReturns = new Map();
const navigationChatTicks = new Map();
let mobSpawnFailureNoticeTick = -1200;
let cityBuildPromise = null;
let cityReadyInSession = false;
let cityServicesCheckedInSession = false;
let activeHorde = null;
let nextHordeAllowedTick = 0;

const APOCALYPSE_MOBS = Object.freeze({
  basic: "apoc:infected_basic",
  runner: "apoc:infected_runner",
  spitter: "apoc:infected_spitter",
  shrieker: "apoc:infected_shrieker",
  charger: "apoc:infected_charger",
  hunter: "apoc:infected_hunter",
  mutant: "apoc:infected_mutant",
  heavy: "apoc:infected_heavy",
  tyrant: "apoc:infected_tyrant",
  broodmother: "apoc:infected_broodmother",
  raider: "apoc:raider_rifleman"
});

const VANILLA_HOSTILES = new Set([
  "minecraft:zombie", "minecraft:zombie_villager", "minecraft:husk", "minecraft:drowned",
  "minecraft:skeleton", "minecraft:stray", "minecraft:creeper", "minecraft:spider",
  "minecraft:cave_spider", "minecraft:witch", "minecraft:phantom", "minecraft:pillager",
  "minecraft:vindicator", "minecraft:ravager", "minecraft:evocation_illager"
]);

const CRATE_LAYOUT = Object.freeze([
  // All four locations sit on the permanent two-cell road cross. They are
  // deliberately not resolved with safeGround: that could move a crate onto
  // a roof or into an interior and made higher tiers almost impossible to see.
  { dx: -4, dz: -20, tier: "common" },
  { dx: 12, dz: 20, tier: "common" },
  { dx: -20, dz: 4, tier: "rare" },
  { dx: 20, dz: -4, tier: "epic" }
]);

const CRATE_BLOCK_BY_TIER = Object.freeze({
  common: "daily:loot_crate_common",
  rare: "daily:loot_crate_rare",
  epic: "daily:loot_crate_epic",
  legendary: "daily:loot_crate_legendary",
  mythic: "daily:loot_crate_mythic"
});

const CRATE_PAD_BY_TIER = Object.freeze({
  common: "minecraft:stone_bricks",
  rare: "minecraft:light_blue_concrete",
  epic: "minecraft:purple_concrete",
  legendary: "minecraft:yellow_concrete",
  mythic: "minecraft:magenta_concrete"
});

const LEGENDARY_CRATE_DISTRICTS = Object.freeze([0, 6, 12, 18, 24]);
const PREMIUM_CRATE_TIERS = Object.freeze(["legendary", "mythic"]);

// These are the exact X/Z footprints of the nine RandS landmark structures.
// The original add-on lets Jigsaw reserve these cells. In the runtime void
// dimension we reproduce that reservation explicitly, then fill every unused
// 16x16 cell with an actual RandS street piece.
const RANDS_BUILDING_FOOTPRINTS = Object.freeze({
  // groundOffset is the structure-local layer that represents street level.
  // RandS saved several towers with their underground foundation starting at
  // layer 0, while the smaller buildings were saved directly at street level.
  b1: { xCells: 1, zCells: 1, height: 46, groundOffset: 9 },
  b2: { xCells: 2, zCells: 2, height: 50, groundOffset: 9 },
  b3: { xCells: 1, zCells: 2, height: 55, groundOffset: 2 },
  b4: { xCells: 1, zCells: 1, height: 50, groundOffset: 10 },
  b5: { xCells: 1, zCells: 1, height: 50, groundOffset: 9 },
  b6: { xCells: 1, zCells: 1, height: 45, groundOffset: 10 },
  b7: { xCells: 2, zCells: 2, height: 55, groundOffset: 1 },
  b8: { xCells: 1, zCells: 2, height: 31, groundOffset: 2 },
  b9: { xCells: 2, zCells: 2, height: 33, groundOffset: 3 }
});

const RANDS_STREET_STRUCTURES = Object.freeze([
  "road1", "road2", "road3", "road4",
  "cross1", "cross2", "cross3", "cross4", "cross5", "cross6",
  "corner1", "corner2", "corner3", "corner4", "corner5", "corner6", "corner7", "corner8",
  "center1"
]);

// RandS also ships eleven distinct 16x16 building shells. The previous
// materialized layout ignored them and repeated only b1..b9 in every district,
// which made the city look like a single cloned building. These structures are
// now distributed through each block around a permanent two-cell road cross.
const RANDS_SMALL_HOUSES = Object.freeze([
  "house1", "house2", "house3", "house4", "house5", "house6",
  "house7", "house8", "house9", "house10", "house11"
]);

// Structure-load does not apply Jigsaw processors. These offsets are read from
// the RandS .mcstructure files used by the runtime layout, so every original
// mob-spawner marker can receive its own deterministic crate quality instead
// of every marker in one house being replaced by the same block.
const RANDS_SPAWNER_MARKERS = Object.freeze({
  b8: Object.freeze([[4, 2, 22]]),
  house1: Object.freeze([[3, 1, 5], [12, 1, 8], [12, 5, 8]]),
  house2: Object.freeze([[4, 1, 9], [9, 1, 8], [12, 5, 6]]),
  house3: Object.freeze([[4, 1, 10], [6, 9, 7], [9, 5, 11], [9, 9, 7], [11, 1, 5]]),
  house4: Object.freeze([[4, 1, 5], [7, 5, 5], [7, 9, 4], [8, 5, 7]]),
  house5: Object.freeze([[5, 2, 6], [5, 5, 12], [9, 5, 12]]),
  house6: Object.freeze([[6, 1, 8], [6, 1, 12], [12, 1, 12]]),
  house7: Object.freeze([[7, 2, 7], [8, 5, 7]]),
  house8: Object.freeze([[4, 2, 8], [8, 6, 9], [11, 2, 9]]),
  house9: Object.freeze([[4, 1, 7], [4, 5, 7]]),
  house10: Object.freeze([[4, 5, 11], [11, 1, 11]]),
  house11: Object.freeze([[11, 5, 8], [11, 9, 8], [11, 13, 8]])
});

const RANDS_LANDMARKS = Object.freeze(Object.keys(RANDS_BUILDING_FOOTPRINTS));
const LANDMARK_ANCHORS = Object.freeze([
  { column: 0, row: 0 }, { column: 5, row: 0 },
  { column: 0, row: 5 }, { column: 5, row: 5 }
]);

function deterministicIndex(districtIndex, row, column, length, salt = 0) {
  const value = Math.imul(districtIndex + 1, 73856093) ^ Math.imul(row + 11, 19349663) ^ Math.imul(column + 17, 83492791) ^ salt;
  return (value >>> 0) % length;
}

function isDistrictRoadCell(row, column) {
  return row === 3 || row === 4 || column === 3 || column === 4;
}

const INSURED_EQUIPMENT = Object.freeze([
  EquipmentSlot.Head,
  EquipmentSlot.Chest,
  EquipmentSlot.Legs,
  EquipmentSlot.Feet,
  EquipmentSlot.Offhand
]);

function subscribe(signal, label, handler) {
  if (!signal || typeof signal.subscribe !== "function") {
    console.warn(`[ExtractionCity] ${label} event unavailable.`);
    return false;
  }
  try { signal.subscribe(handler); return true; }
  catch (error) { console.warn(`[ExtractionCity] ${label} subscribe failed: ${error}`); return false; }
}

function scriptEventContext(event) {
  let player = event.sourceEntity?.typeId === "minecraft:player" ? event.sourceEntity : null;
  if (!player && event.initiator?.typeId === "minecraft:player") player = event.initiator;
  let message = String(event.message || "");
  const match = /^__sapi_player__=([^&]*)&data=([\s\S]*)$/.exec(message);
  if (match) {
    let playerName = "";
    try { playerName = decodeURIComponent(match[1]); } catch { playerName = match[1]; }
    try { message = decodeURIComponent(match[2]); } catch { message = match[2]; }
    if (!player) player = world.getAllPlayers().find(value => value.name === playerName) || null;
  }
  // 单人测试世界中，某些版本把玩家手动执行的 /scriptevent 也报告为 Server。
  if (!player) {
    const online = world.getAllPlayers();
    if (online.length === 1) player = online[0];
  }
  return { player, message };
}

function acknowledgeMenuRequest(player, rawRequestId = "") {
  let requestId = Number(rawRequestId) || 0;
  try { requestId ||= Number(player.getDynamicProperty(CONFIG.menuRequestKey) || 0); } catch {}
  if (!requestId) requestId = Date.now();

  try {
    if (Number(player.getDynamicProperty(CONFIG.menuAckKey) || 0) === requestId) return false;
    player.setDynamicProperty(CONFIG.menuAckKey, requestId);
    player.setDynamicProperty(CONFIG.menuRequestKey, undefined);
  } catch {}
  system.run(() => openMenu(player));
  return true;
}

function isAdmin(player) {
  try { return player.hasTag("admin") || player.hasTag("administrator") || player.isOp(); } catch { return false; }
}

function parse(raw, fallback) {
  try { return typeof raw === "string" ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function extractionDimension() {
  try { return world.getDimension(CONFIG.dimensionId); } catch { return null; }
}

function distance2D(a, b) { return Math.hypot(Number(a.x) - Number(b.x), Number(a.z) - Number(b.z)); }

function points() {
  const saved = parse(world.getDynamicProperty(CONFIG.pointsKey), null);
  return Array.isArray(saved) && saved.length ? saved : CONFIG.extractionPoints;
}

function weighted(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) { roll -= entry.weight; if (roll <= 0) return entry; }
  return entries[entries.length - 1];
}

function isAir(block) {
  const id = String(block?.typeId || "");
  return block?.isAir === true || id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air";
}

function isUnsafeFloor(block) {
  const id = String(block?.typeId || "");
  return !block || isAir(block) || id.includes("water") || id.includes("lava") ||
    id.includes("leaves") || id.includes("glass_pane") || id.includes("fence");
}

function standingGround(dimension, x, z, preferredY = CONFIG.cityBaseY) {
  x = Math.floor(x); z = Math.floor(z);
  const candidates = [];
  for (let delta = 0; delta <= 24; delta++) {
    candidates.push(preferredY + delta);
    if (delta) candidates.push(preferredY - delta);
  }
  for (const floorY of candidates) {
    try {
      const floor = dimension.getBlock({ x, y: floorY, z });
      const feet = dimension.getBlock({ x, y: floorY + 1, z });
      const head = dimension.getBlock({ x, y: floorY + 2, z });
      if (!isUnsafeFloor(floor) && isAir(feet) && isAir(head)) return { x: x + 0.5, y: floorY + 1, z: z + 0.5 };
    } catch {}
  }
  try {
    const top = dimension.getTopmostBlock({ x, z });
    if (top && top.location.y < 315 && !isUnsafeFloor(top)) {
      const feet = dimension.getBlock({ x, y: top.location.y + 1, z });
      const head = dimension.getBlock({ x, y: top.location.y + 2, z });
      if (isAir(feet) && isAir(head)) return { x: x + 0.5, y: top.location.y + 1, z: z + 0.5 };
    }
  } catch {}
  return null;
}

function safeGround(dimension, x, z, searchRadius = 16) {
  const direct = standingGround(dimension, x, z);
  if (direct) return direct;
  for (let radius = 4; radius <= searchRadius; radius += 4) {
    for (let step = 0; step < 16; step++) {
      const angle = (Math.PI * 2 * step / 16) + radius * 0.13;
      const found = standingGround(dimension, x + Math.cos(angle) * radius, z + Math.sin(angle) * radius);
      if (found) return found;
    }
  }
  return null;
}

function storeReturn(player) {
  try {
    player.setDynamicProperty(CONFIG.returnKey, JSON.stringify({ dimension: player.dimension.id, ...player.location }));
  } catch {}
}

function waitTicks(ticks) {
  if (typeof system.waitTicks === "function") return system.waitTicks(ticks);
  return new Promise(resolve => system.runTimeout(resolve, ticks));
}

function placePackStructure(dimension, structureId, location) {
  const id = String(structureId || "");
  if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/i.test(id)) throw new Error(`invalid structure id: ${id}`);
  try {
    // Nested ids must be quoted or the Bedrock command parser treats `/` as
    // an unexpected token.
    dimension.runCommand(`structure load "${id}" ${location.x} ${location.y} ${location.z}`);
  } catch (commandError) {
    throw new Error(`structure ${id}: command=${commandError}`);
  }
}

async function withTickingArea(dimension, areaId, from, to, action) {
  let created = false;
  try {
    try { dimension.runCommand(`tickingarea remove ${areaId}`); } catch {}
    try {
      dimension.runCommand(`tickingarea add ${from.x} ${from.y} ${from.z} ${to.x} ${to.y} ${to.z} ${areaId} true`);
      created = true;
    } catch (error) { console.warn(`[ExtractionCity] ticking area ${areaId} unavailable: ${error}`); }
    return await action();
  } finally {
    if (created) try { dimension.runCommand(`tickingarea remove ${areaId}`); } catch {}
  }
}

async function buildCityFoundationLayer(dimension) {
  const half = CONFIG.cityHalfSize;
  const size = CONFIG.cityTileSize;
  let tileIndex = 0;
  for (let minX = -half; minX < half; minX += size) {
    for (let minZ = -half; minZ < half; minZ += size) {
      const maxX = Math.min(half - 1, minX + size - 1);
      const maxZ = Math.min(half - 1, minZ + size - 1);
      const areaId = `extract_foundation_${tileIndex++}`;
      await withTickingArea(
        dimension,
        areaId,
        { x: minX, y: CONFIG.cityBaseY - 1, z: minZ },
        { x: maxX, y: CONFIG.cityBaseY + 4, z: maxZ },
        async () => {
          // Always write chunk-sized slices. A single successful probe in the
          // middle of a 128x128 command did not prove that its edge chunks were
          // persisted, which left long void seams in some custom dimensions.
          for (let x = minX; x <= maxX; x += 32) {
            for (let z = minZ; z <= maxZ; z += 32) {
              dimension.runCommand(`fill ${x} ${CONFIG.cityBaseY - 3} ${z} ${Math.min(maxX, x + 31)} ${CONFIG.cityBaseY} ${Math.min(maxZ, z + 31)} minecraft:deepslate_tiles`);
            }
            await waitTicks(1);
          }
        }
      );
    }
  }
}

async function buildCityFoundation(dimension) {
  const half = CONFIG.cityHalfSize;
  await buildCityFoundationLayer(dimension);

  // Dense permanent road grid between Jigsaw districts. It is placed before
  // structures, so buildings can overwrite it while uncovered gaps remain
  // navigable streets instead of a featureless deepslate square.
  const roadCoordinates = [-256, -128, 0, 128, 256];
  for (const coordinate of roadCoordinates) {
    dimension.runCommand(`fill ${-half} ${CONFIG.cityBaseY + 1} ${coordinate - 5} ${half - 1} ${CONFIG.cityBaseY + 1} ${coordinate + 5} minecraft:stone_bricks`);
    dimension.runCommand(`fill ${coordinate - 5} ${CONFIG.cityBaseY + 1} ${-half} ${coordinate + 5} ${CONFIG.cityBaseY + 1} ${half - 1} minecraft:stone_bricks`);
    await waitTicks(1);
  }
}

function structureMarkerCrateTier(districtIndex, row, column, markerIndex, isLandmark = false) {
  const salt = 0x4c00f00d ^ Math.imul(markerIndex + 1, 0x45d9f3b);
  const roll = deterministicIndex(districtIndex, row, column, 1000, salt);
  if (isLandmark && roll < 250) return "legendary";
  if (roll < 1) return "mythic";
  if (roll < 11) return "legendary";
  if (roll < 91) return "epic";
  if (roll < 321) return "rare";
  return "common";
}

function mixedStructureCrateTiers(districtIndex, row, column, markerCount, isLandmark = false) {
  const tiers = Array.from(
    { length: markerCount },
    (_value, markerIndex) => structureMarkerCrateTier(districtIndex, row, column, markerIndex, isLandmark)
  );
  if (tiers.length > 1 && tiers.every(tier => tier === tiers[0])) {
    const index = deterministicIndex(districtIndex, row, column, tiers.length, 0x6d2b79f5);
    const promoted = { common: "rare", rare: "epic", epic: "legendary", legendary: "epic", mythic: "legendary" };
    tiers[index] = promoted[tiers[index]] || "rare";
  }
  return tiers;
}

function replaceRandSMarkers(dimension, x, z, footprint, structureName, districtIndex, row, column, isLandmark = false) {
  const structureY = CONFIG.cityBaseY + 1 - Number(footprint.groundOffset || 0);
  const markers = RANDS_SPAWNER_MARKERS[structureName] || [];
  const tiers = mixedStructureCrateTiers(districtIndex, row, column, markers.length, isLandmark);
  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    const [dx, dy, dz] = markers[markerIndex];
    const block = dimension.getBlock({ x: x + dx, y: structureY + dy, z: z + dz });
    if (!block || block.typeId !== "minecraft:mob_spawner") continue;
    const crateBlock = CRATE_BLOCK_BY_TIER[tiers[markerIndex]] || CRATE_BLOCK_BY_TIER.common;
    try { block.setType(crateBlock); }
    catch {
      try { block.setType("apoc:loot_crate"); }
      catch { try { block.setType("minecraft:chest"); } catch {} }
    }
  }
  for (let cellX = 0; cellX < footprint.xCells; cellX++) {
    for (let cellZ = 0; cellZ < footprint.zCells; cellZ++) {
      const minX = x + cellX * CONFIG.districtCellSize;
      const minZ = z + cellZ * CONFIG.districtCellSize;
      const maxX = minX + CONFIG.districtCellSize - 1;
      const maxZ = minZ + CONFIG.districtCellSize - 1;
      const maxY = structureY + Math.max(25, footprint.height) + 1;
      // A future RandS asset may add an unlisted marker. Convert it to an
      // inert chest instead of leaving an active vanilla spawner behind.
      try { dimension.runCommand(`fill ${minX} ${structureY} ${minZ} ${maxX} ${maxY} ${maxZ} minecraft:chest replace minecraft:mob_spawner`); } catch {}
      try { dimension.runCommand(`fill ${minX} ${structureY} ${minZ} ${maxX} ${maxY} ${maxZ} minecraft:air replace minecraft:jigsaw`); } catch {}
    }
  }
}

async function repairDistrictRoadCross(dimension, gridOriginX, gridOriginZ) {
  const supportMinY = CONFIG.cityBaseY - 3;
  const supportMaxY = CONFIG.cityBaseY;
  const surfaceY = CONFIG.cityBaseY + 1;
  const crossMin = 3 * CONFIG.districtCellSize;
  const crossMax = 5 * CONFIG.districtCellSize - 1;
  const districtMax = 8 * CONFIG.districtCellSize - 1;
  const corridors = [
    {
      minX: gridOriginX + crossMin,
      maxX: gridOriginX + crossMax,
      minZ: gridOriginZ,
      maxZ: gridOriginZ + districtMax
    },
    {
      minX: gridOriginX,
      maxX: gridOriginX + districtMax,
      minZ: gridOriginZ + crossMin,
      maxZ: gridOriginZ + crossMax
    }
  ];
  for (const corridor of corridors) {
    // RandS street structures include saved air. Loading them can erase a
    // road surface after the initial city foundation was laid, producing the
    // long void trench seen through the middle of a district. Repair only air
    // after every structure has loaded, preserving all existing road details.
    dimension.runCommand(`fill ${corridor.minX} ${supportMinY} ${corridor.minZ} ${corridor.maxX} ${supportMaxY} ${corridor.maxZ} minecraft:deepslate_tiles`);
    for (const emptyBlock of ["minecraft:air", "minecraft:cave_air", "minecraft:void_air"]) {
      try {
        dimension.runCommand(`fill ${corridor.minX} ${surfaceY} ${corridor.minZ} ${corridor.maxX} ${surfaceY} ${corridor.maxZ} minecraft:stone_bricks replace ${emptyBlock}`);
      } catch {}
    }
    // A custom dimension can report a successful /fill while an edge chunk is
    // still becoming writable. Verify every road block through the stable API
    // and repair any remaining hole before releasing the ticking area.
    let checked = 0;
    for (let x = corridor.minX; x <= corridor.maxX; x++) {
      for (let z = corridor.minZ; z <= corridor.maxZ; z++) {
        try {
          const block = dimension.getBlock({ x, y: surfaceY, z });
          if (isAir(block)) block.setType("minecraft:stone_bricks");
        } catch {}
        if (++checked % 512 === 0) await waitTicks(1);
      }
    }
    await waitTicks(1);
  }
}

async function placeDistrict(dimension, center, index) {
  const areaId = `extract_district_${index}`;
  return withTickingArea(
    dimension,
    areaId,
    { x: center.x - 72, y: 56, z: center.z - 72 },
    { x: center.x + 72, y: 192, z: center.z + 72 },
    async () => {
      const gridOriginX = center.x + CONFIG.districtGridOrigin;
      const gridOriginZ = center.z + CONFIG.districtGridOrigin;

      // Remove remnants of the old nine-tower layout. 32x32x32 is exactly the
      // vanilla /fill volume limit and prevents upper floors from floating over
      // the new RandS blocks after an in-place upgrade.
      let clearCommands = 0;
      for (let x = gridOriginX; x < gridOriginX + 128; x += 32) {
        for (let z = gridOriginZ; z < gridOriginZ + 128; z += 32) {
          for (let y = CONFIG.cityBaseY + 1; y <= CONFIG.cityBaseY + 64; y += 32) {
            dimension.runCommand(`fill ${x} ${y} ${z} ${x + 31} ${y + 31} ${z + 31} minecraft:air`);
            if (++clearCommands % 4 === 0) await waitTicks(1);
          }
        }
      }

      const occupied = Array.from({ length: 8 }, () => Array(8).fill(false));
      let buildingsLoaded = 0;

      // One differently positioned tall landmark per district keeps the skyline
      // varied without allowing a 32x32 building to cut through the road cross.
      const landmark = RANDS_LANDMARKS[(index * 5) % RANDS_LANDMARKS.length];
      const footprint = RANDS_BUILDING_FOOTPRINTS[landmark];
      const anchor = LANDMARK_ANCHORS[index % LANDMARK_ANCHORS.length];
      const landmarkX = gridOriginX + anchor.column * CONFIG.districtCellSize;
      const landmarkZ = gridOriginZ + anchor.row * CONFIG.districtCellSize;
      const landmarkY = CONFIG.cityBaseY + 1 - footprint.groundOffset;
      placePackStructure(dimension, `village:custom/houses/${landmark}`, { x: landmarkX, y: landmarkY, z: landmarkZ });
      replaceRandSMarkers(dimension, landmarkX, landmarkZ, footprint, landmark, index, anchor.row, anchor.column, true);
      for (let dx = 0; dx < footprint.xCells; dx++) {
        for (let dz = 0; dz < footprint.zCells; dz++) {
          occupied[anchor.row + dz][anchor.column + dx] = true;
        }
      }
      buildingsLoaded++;
      await waitTicks(1);

      let streetsLoaded = 0;
      for (let row = 0; row < 8; row++) {
        for (let column = 0; column < 8; column++) {
          if (occupied[row][column]) continue;
          const x = gridOriginX + column * CONFIG.districtCellSize;
          const z = gridOriginZ + row * CONFIG.districtCellSize;
          if (isDistrictRoadCell(row, column)) {
            const variant = RANDS_STREET_STRUCTURES[deterministicIndex(index, row, column, RANDS_STREET_STRUCTURES.length, 0x51f15e)];
            placePackStructure(dimension, `village:custom/streets/${variant}`, { x, y: CONFIG.cityBaseY + 1, z });
            replaceRandSMarkers(dimension, x, z, { xCells: 1, zCells: 1, height: 25 }, variant, index, row, column);
            streetsLoaded++;
          } else {
            const house = RANDS_SMALL_HOUSES[deterministicIndex(index, row, column, RANDS_SMALL_HOUSES.length, 0x19a4c3)];
            placePackStructure(dimension, `village:custom/houses/${house}`, { x, y: CONFIG.cityBaseY + 1, z });
            replaceRandSMarkers(dimension, x, z, { xCells: 1, zCells: 1, height: house === "house11" ? 19 : 16 }, house, index, row, column);
            buildingsLoaded++;
          }
          if ((buildingsLoaded + streetsLoaded) % 4 === 0) await waitTicks(1);
        }
      }

      // A two-block-thick district deck eliminates the one-block void seams
      // visible in old worlds and is repaired while the district is tick-loaded.
      dimension.runCommand(`fill ${gridOriginX} ${CONFIG.cityBaseY - 1} ${gridOriginZ} ${gridOriginX + 127} ${CONFIG.cityBaseY} ${gridOriginZ + 127} minecraft:deepslate_tiles`);
      await waitTicks(1);
      await repairDistrictRoadCross(dimension, gridOriginX, gridOriginZ);
      dimension.runCommand(`setblock ${center.x} ${CONFIG.cityBaseY - 1} ${center.z} minecraft:bedrock`);
      return { buildingsLoaded, streetsLoaded };
    }
  );
}

function addFallbackLootNode(nodes, location, tier) {
  const x = Math.floor(location.x), y = Math.floor(location.y), z = Math.floor(location.z);
  if (nodes.some(node => node.dimension === CONFIG.dimensionId && node.x === x && node.y === y && node.z === z)) return;
  nodes.push({
    id: `extract_loot_${x}_${y}_${z}`,
    type: tier === "epic" || tier === "legendary" ? "military" : tier === "rare" ? "medical" : "tools",
    dimension: CONFIG.dimensionId,
    x, y, z,
    respawnMinutes: tier === "legendary" ? 120 : tier === "epic" ? 60 : tier === "rare" ? 30 : 15,
    lastLooted: 0,
    createdBy: "Apocalypse Extraction City"
  });
}

function districtCrateLayout(districtIndex) {
  const layout = [...CRATE_LAYOUT];
  if (LEGENDARY_CRATE_DISTRICTS.includes(districtIndex)) layout.push({ dx: 4, dz: 20, tier: "legendary" });
  if (districtIndex === 12) layout.push({ dx: 4, dz: -20, tier: "mythic" });
  return layout;
}

function prepareCratePad(dimension, center, crate) {
  const x = Math.floor(center.x + crate.dx);
  const z = Math.floor(center.z + crate.dz);
  const floorY = CONFIG.cityBaseY + 1;
  const crateY = floorY + 1;
  const pad = CRATE_PAD_BY_TIER[crate.tier] || CRATE_PAD_BY_TIER.common;
  // A small coloured road-side pad makes quality obvious and guarantees two
  // clear blocks above every crate even if a RandS car/canopy occupied the cell.
  dimension.runCommand(`fill ${x - 1} ${floorY} ${z - 1} ${x + 1} ${floorY} ${z + 1} ${pad}`);
  dimension.runCommand(`fill ${x} ${crateY} ${z} ${x} ${crateY + 2} ${z} minecraft:air`);
  return { x, y: crateY, z };
}

async function placeLootCrates(dimension) {
  let existingNodes = [];
  try { existingNodes = parse(world.getDynamicProperty(CONFIG.lootNodesKey), []); } catch {}
  const fallbackNodes = Array.isArray(existingNodes) ? existingNodes.slice() : [];
  let placed = 0;
  const placedByTier = { common: 0, rare: 0, epic: 0, legendary: 0, mythic: 0, fallback: 0 };
  const premiumCratePoints = [];
  for (let districtIndex = 0; districtIndex < CONFIG.districtCenters.length; districtIndex++) {
    const center = CONFIG.districtCenters[districtIndex];
    await withTickingArea(
      dimension,
      `extract_crates_${districtIndex}`,
      { x: center.x - 64, y: 56, z: center.z - 64 },
      { x: center.x + 64, y: 192, z: center.z + 64 },
      async () => {
        const layout = districtCrateLayout(districtIndex);
        for (const crate of layout) {
          let location;
          try { location = prepareCratePad(dimension, center, crate); } catch { continue; }
          const block = dimension.getBlock(location);
          if (!block) continue;
          let placedAsRequestedTier = false;
          try {
            block.setType(CRATE_BLOCK_BY_TIER[crate.tier] || CRATE_BLOCK_BY_TIER.common);
            placedAsRequestedTier = true;
          } catch {
            try {
              block.setType("apoc:loot_crate");
              addFallbackLootNode(fallbackNodes, location, crate.tier);
            } catch { continue; }
          }
          placed++;
          if (placedAsRequestedTier) {
            placedByTier[crate.tier]++;
            if (PREMIUM_CRATE_TIERS.includes(crate.tier)) {
              premiumCratePoints.push({
                id: `${crate.tier}_${districtIndex}_${location.x}_${location.z}`,
                name: crate.tier === "mythic" ? "神话物资箱" : "传说物资箱",
                tier: crate.tier,
                dimension: CONFIG.dimensionId,
                x: location.x,
                y: location.y,
                z: location.z
              });
            }
          } else placedByTier.fallback++;
        }
        await waitTicks(1);
      }
    );
  }
  try { world.setDynamicProperty(CONFIG.lootNodesKey, JSON.stringify(fallbackNodes.slice(-300))); } catch {}
  try { world.setDynamicProperty("apoc_extract:crate_count:v1", placed); } catch {}
  try { world.setDynamicProperty("apoc_extract:crate_tiers:v1", JSON.stringify(placedByTier)); } catch {}
  try { world.setDynamicProperty(CONFIG.premiumCratePointsKey, JSON.stringify(premiumCratePoints)); } catch {}
  return placed;
}

async function placeExtractionMarkers(dimension) {
  let placed = 0;
  for (let index = 0; index < CONFIG.extractionPoints.length; index++) {
    const point = CONFIG.extractionPoints[index];
    await withTickingArea(
      dimension,
      `extract_exit_${index}`,
      { x: point.x - 16, y: 56, z: point.z - 16 },
      { x: point.x + 16, y: 192, z: point.z + 16 },
      async () => {
        const x = Math.floor(point.x), z = Math.floor(point.z);
        const floorY = CONFIG.cityBaseY + 1;
        const y = floorY + 1;
        try {
          buildExtractionOutpost(dimension, point);
          dimension.runCommand(`fill ${x - 4} ${floorY} ${z - 4} ${x + 4} ${floorY} ${z + 4} minecraft:lime_concrete`);
          dimension.runCommand(`fill ${x - 1} ${floorY} ${z - 1} ${x + 1} ${floorY} ${z + 1} minecraft:iron_block`);
          dimension.runCommand(`fill ${x - 2} ${y} ${z - 2} ${x + 2} ${y + 3} ${z + 2} minecraft:air`);
          dimension.runCommand(`setblock ${x} ${y} ${z} minecraft:beacon`);
          dimension.runCommand(`fill ${x} ${y + 1} ${z} ${x} ${y + 31} ${z} minecraft:lime_stained_glass`);
          for (const lightY of [y + 6, y + 14, y + 22, y + 30]) {
            dimension.runCommand(`setblock ${x + 1} ${lightY} ${z} minecraft:sea_lantern`);
          }
          placed++;
        } catch {}
        await waitTicks(1);
      }
    );
  }
  return placed;
}

function buildExtractionOutpost(dimension, point) {
  const x = Math.floor(point.x), z = Math.floor(point.z);
  const floorY = CONFIG.cityBaseY + 1;
  const northSouth = Math.abs(z) >= Math.abs(x);
  dimension.runCommand(`fill ${x - 11} ${floorY - 1} ${z - 11} ${x + 11} ${floorY} ${z + 11} minecraft:deepslate_tiles`);

  const booths = northSouth
    ? [
        { minX: x - 10, maxX: x - 4, minZ: z - 7, maxZ: z + 7, door: `fill ${x - 4} ${floorY + 1} ${z - 1} ${x - 4} ${floorY + 3} ${z + 1} minecraft:air` },
        { minX: x + 4, maxX: x + 10, minZ: z - 7, maxZ: z + 7, door: `fill ${x + 4} ${floorY + 1} ${z - 1} ${x + 4} ${floorY + 3} ${z + 1} minecraft:air` }
      ]
    : [
        { minX: x - 7, maxX: x + 7, minZ: z - 10, maxZ: z - 4, door: `fill ${x - 1} ${floorY + 1} ${z - 4} ${x + 1} ${floorY + 3} ${z - 4} minecraft:air` },
        { minX: x - 7, maxX: x + 7, minZ: z + 4, maxZ: z + 10, door: `fill ${x - 1} ${floorY + 1} ${z + 4} ${x + 1} ${floorY + 3} ${z + 4} minecraft:air` }
      ];

  for (const booth of booths) {
    dimension.runCommand(`fill ${booth.minX} ${floorY + 1} ${booth.minZ} ${booth.maxX} ${floorY + 6} ${booth.maxZ} minecraft:polished_deepslate`);
    dimension.runCommand(`fill ${booth.minX + 1} ${floorY + 1} ${booth.minZ + 1} ${booth.maxX - 1} ${floorY + 5} ${booth.maxZ - 1} minecraft:air`);
    dimension.runCommand(booth.door);
    dimension.runCommand(`fill ${booth.minX + 1} ${floorY + 3} ${booth.minZ} ${booth.maxX - 1} ${floorY + 4} ${booth.minZ} minecraft:lime_stained_glass`);
    dimension.runCommand(`fill ${booth.minX + 1} ${floorY + 3} ${booth.maxZ} ${booth.maxX - 1} ${floorY + 4} ${booth.maxZ} minecraft:lime_stained_glass`);
    dimension.runCommand(`setblock ${booth.minX + 1} ${floorY + 2} ${booth.minZ + 1} minecraft:sea_lantern`);
    dimension.runCommand(`setblock ${booth.maxX - 1} ${floorY + 2} ${booth.maxZ - 1} minecraft:sea_lantern`);
  }

  if (northSouth) {
    dimension.runCommand(`fill ${x - 3} ${floorY + 6} ${z - 4} ${x + 3} ${floorY + 6} ${z + 4} minecraft:iron_block`);
    dimension.runCommand(`fill ${x - 2} ${floorY + 6} ${z - 3} ${x + 2} ${floorY + 6} ${z + 3} minecraft:lime_stained_glass`);
    dimension.runCommand(`fill ${x - 11} ${floorY + 1} ${z - 11} ${x - 11} ${floorY + 3} ${z + 11} minecraft:iron_bars`);
    dimension.runCommand(`fill ${x + 11} ${floorY + 1} ${z - 11} ${x + 11} ${floorY + 3} ${z + 11} minecraft:iron_bars`);
  } else {
    dimension.runCommand(`fill ${x - 4} ${floorY + 6} ${z - 3} ${x + 4} ${floorY + 6} ${z + 3} minecraft:iron_block`);
    dimension.runCommand(`fill ${x - 3} ${floorY + 6} ${z - 2} ${x + 3} ${floorY + 6} ${z + 2} minecraft:lime_stained_glass`);
    dimension.runCommand(`fill ${x - 11} ${floorY + 1} ${z - 11} ${x + 11} ${floorY + 3} ${z - 11} minecraft:iron_bars`);
    dimension.runCommand(`fill ${x - 11} ${floorY + 1} ${z + 11} ${x + 11} ${floorY + 3} ${z + 11} minecraft:iron_bars`);
  }
}

async function buildCity(dimension) {
  console.warn("[ExtractionCity] building persistent 5x5 mixed RandS districts, continuous roads and reinforced foundation...");
  await buildCityFoundation(dimension);

  let generated = 0;
  let streets = 0;
  for (let index = 0; index < CONFIG.districtCenters.length; index++) {
    const center = CONFIG.districtCenters[index];
    try {
      const result = await placeDistrict(dimension, center, index);
      generated += result.buildingsLoaded;
      streets += result.streetsLoaded;
    } catch (error) {
      console.warn(`[ExtractionCity] district ${index + 1} placement failed: ${error}`);
    }
  }

  const roadCellsPerDistrict = 28;
  const expectedBuildings = CONFIG.districtCenters.reduce((sum, _center, index) => {
    const landmark = RANDS_LANDMARKS[(index * 5) % RANDS_LANDMARKS.length];
    const footprint = RANDS_BUILDING_FOOTPRINTS[landmark];
    return sum + 1 + (64 - roadCellsPerDistrict - footprint.xCells * footprint.zCells);
  }, 0);
  const expectedStreets = CONFIG.districtCenters.length * roadCellsPerDistrict;
  if (generated !== expectedBuildings || streets !== expectedStreets) {
    throw new Error(`Dense city placement incomplete: buildings ${generated}/${expectedBuildings}, streets ${streets}/${expectedStreets}. The city was not marked ready and will retry next entry.`);
  }
  // Run the deck again after all structures. This cannot overwrite buildings
  // because they begin one block above it, and it repairs any foundation tile
  // that a custom-dimension chunk did not persist during the first pass.
  await buildCityFoundationLayer(dimension);
  const exits = await placeExtractionMarkers(dimension);
  const crates = await placeLootCrates(dimension);
  try {
    world.setDynamicProperty(CONFIG.cityReadyKey, true);
    world.setDynamicProperty(CONFIG.cityReadyBackupKey, Date.now());
    world.setDynamicProperty("apoc_extract:exit_count:v1", exits);
    world.setDynamicProperty("apoc_extract:crate_count:v1", crates);
    world.setDynamicProperty(CONFIG.extractionOutpostVersionKey, CONFIG.extractionOutpostVersion);
    world.setDynamicProperty(CONFIG.cityLayoutVersionKey, CONFIG.cityLayoutVersion);
    cityReadyInSession = true;
    cityServicesCheckedInSession = true;
  } catch {}
  try {
    await withTickingArea(
      dimension,
      "extract_city_sentinel",
      { x: -4, y: 56, z: -4 },
      { x: 4, y: 72, z: 4 },
      async () => dimension.getBlock(CONFIG.citySentinel)?.setType("minecraft:bedrock")
    );
  } catch {}
  try {
    await withTickingArea(
      dimension,
      "extract_city_layout_sentinel",
      { x: -4, y: 56, z: -4 },
      { x: 4, y: 72, z: 4 },
      async () => dimension.getBlock(CONFIG.cityLayoutSentinel)?.setType(CONFIG.cityLayoutSentinelBlock)
    );
  } catch {}
  console.warn(`[ExtractionCity] persistent city ready: ${generated}/${expectedBuildings} direct buildings, ${streets} RandS street cells, ${exits} exit markers, ${crates} loot crates placed.`);
}

function readyFlagStored() {
  try {
    return Number(world.getDynamicProperty(CONFIG.cityLayoutVersionKey) || 0) >= CONFIG.cityLayoutVersion;
  } catch { return false; }
}

function cityPhysicallyPresent(dimension) {
  let ticking = false;
  try {
    try {
      dimension.runCommand("tickingarea remove extract_city_probe");
      dimension.runCommand("tickingarea add -8 56 -8 8 80 8 extract_city_probe true");
      ticking = true;
    } catch {}
    return dimension.getBlock(CONFIG.cityLayoutSentinel)?.typeId === CONFIG.cityLayoutSentinelBlock;
  } catch { return false; }
  finally { if (ticking) try { dimension.runCommand("tickingarea remove extract_city_probe"); } catch {} }
}

async function ensureCityServices(dimension) {
  if (cityServicesCheckedInSession) return;
  cityServicesCheckedInSession = true;
  let recordedExits = 0, recordedCrates = 0, premiumCrates = [], outpostVersion = 0;
  try {
    recordedExits = Number(world.getDynamicProperty("apoc_extract:exit_count:v1") || 0);
    recordedCrates = Number(world.getDynamicProperty("apoc_extract:crate_count:v1") || 0);
    premiumCrates = parse(world.getDynamicProperty(CONFIG.premiumCratePointsKey), []);
    outpostVersion = Number(world.getDynamicProperty(CONFIG.extractionOutpostVersionKey) || 0);
  } catch {}
  const expectedCrates = CONFIG.districtCenters.reduce((count, _center, index) => count + districtCrateLayout(index).length, 0);
  const expectedPremiumCrates = LEGENDARY_CRATE_DISTRICTS.length + 1;
  if (recordedExits >= CONFIG.extractionPoints.length && recordedCrates >= expectedCrates &&
      premiumCrates.length >= expectedPremiumCrates && outpostVersion >= CONFIG.extractionOutpostVersion) return;
  console.warn("[ExtractionCity] city exists; repairing exit markers and loot crates without rebuilding districts...");
  const exits = await placeExtractionMarkers(dimension);
  const crates = await placeLootCrates(dimension);
  try {
    world.setDynamicProperty("apoc_extract:exit_count:v1", exits);
    world.setDynamicProperty("apoc_extract:crate_count:v1", crates);
    world.setDynamicProperty(CONFIG.extractionOutpostVersionKey, CONFIG.extractionOutpostVersion);
  } catch {}
  console.warn(`[ExtractionCity] city service repair complete: ${exits} exits, ${crates} crates.`);
}

async function ensureCityReady(dimension, force = false) {
  const storedLayoutIsCurrent = readyFlagStored();
  const sentinelIsPresent = cityPhysicallyPresent(dimension);
  // A stale version flag or a lone sentinel is not enough to prove that an
  // upgraded city is complete. Requiring both also makes layout-version bumps
  // actually rebuild older cities instead of silently blessing their holes.
  if (!force && (cityReadyInSession || (storedLayoutIsCurrent && sentinelIsPresent))) {
    cityReadyInSession = true;
    try {
      world.setDynamicProperty(CONFIG.cityReadyKey, true);
      world.setDynamicProperty(CONFIG.cityReadyBackupKey, Date.now());
      world.setDynamicProperty(CONFIG.cityLayoutVersionKey, CONFIG.cityLayoutVersion);
    } catch {}
    try { dimension.getBlock(CONFIG.citySentinel)?.setType("minecraft:bedrock"); } catch {}
    await ensureCityServices(dimension);
    return;
  }
  if (!cityBuildPromise) cityBuildPromise = buildCity(dimension);
  const pending = cityBuildPromise;
  try { await pending; }
  finally { if (cityBuildPromise === pending) cityBuildPromise = null; }
}

function returnPlayer(player, reason = "已离开摸金都市。") {
  let saved = parse(player.getDynamicProperty(CONFIG.returnKey), null);
  let dimension;
  try { dimension = world.getDimension(saved?.dimension || "minecraft:overworld"); }
  catch { dimension = world.getDimension("minecraft:overworld"); saved = null; }
  let location = saved && [saved.x, saved.y, saved.z].every(Number.isFinite) ? saved : world.getDefaultSpawnLocation();
  try {
    player.teleport(location, { dimension });
    player.removeTag(CONFIG.activeTag);
    player.setDynamicProperty(CONFIG.activeStateKey, undefined);
    player.setDynamicProperty(CONFIG.returnKey, undefined);
    backpackSnapshots.delete(player.id);
    navigationChatTicks.delete(player.id);
    try { player.runCommand(`fog @s remove ${CONFIG.fogStackId}`); } catch {}
    player.sendMessage(`§a[撤离] ${reason}`);
  } catch (error) { player.sendMessage(`§c撤离失败：${error}`); }
}

function applyExtractionEnvironment(player) {
  try { player.runCommand(`fog @s push ${CONFIG.fogId} ${CONFIG.fogStackId}`); } catch {}
}

function prepareArrivalPad(dimension, point) {
  // District centres are aligned to the permanent road grid. A deterministic
  // pad avoids custom-dimension surface-query failures and building interiors.
  const x = Math.floor(point.x + 3);
  const z = Math.floor(point.z + 10);
  const floorY = CONFIG.cityBaseY + 1;
  try {
    dimension.runCommand(`fill ${x - 2} ${floorY} ${z - 2} ${x + 2} ${floorY} ${z + 2} minecraft:stone_bricks`);
    dimension.runCommand(`fill ${x - 2} ${floorY + 1} ${z - 2} ${x + 2} ${floorY + 5} ${z + 2} minecraft:air`);
    dimension.runCommand(`setblock ${x} ${floorY} ${z} minecraft:yellow_concrete`);
    return { x: x + 0.5, y: floorY + 1, z: z + 0.5 };
  } catch { return null; }
}

function enforceKeepInventory() {
  try { world.gameRules.keepInventory = true; } catch {}
  try { world.getDimension("minecraft:overworld").runCommand("gamerule keepinventory true"); } catch {}
}

async function enter(player) {
  const dimension = extractionDimension();
  if (!dimension) {
    let bootstrapAlive = false;
    let bootstrapError = "";
    try {
      const heartbeat = Number(world.getDynamicProperty(DIMENSION_BOOTSTRAP_HEARTBEAT) || 0);
      bootstrapAlive = heartbeat > 0 && Date.now() - heartbeat < 15000;
      bootstrapError = String(world.getDynamicProperty(DIMENSION_BOOTSTRAP_ERROR) || "");
    } catch {}
    const detail = bootstrapError ? `\n§8注册错误：${bootstrapError}` : "";
    player.sendMessage(bootstrapAlive
      ? `§cBeta 引导脚本在线，但摸金维度没有成功注册。${detail}`
      : `§c摸金维度引导包没有启动。请启用 Apocalypse Extraction Dimension Bootstrap v0.1.0 与 Beta APIs。${detail}`);
    return;
  }
  player.sendMessage("§e[摸金都市] 正在确认城市状态。首次升级将部署约 870 个建筑与 700 个 RandS 街道格；完成后永久复用，请勿重复点击入口……");
  try { await ensureCityReady(dimension); }
  catch (error) {
    player.sendMessage(`§c城市结构初始化失败：${error}`);
    console.error(`[ExtractionCity] city initialization failed: ${error}`);
    return;
  }
  storeReturn(player);
  const point = CONFIG.entryPoints[Math.floor(Math.random() * CONFIG.entryPoints.length)];
  const x = point.x + 3;
  const z = point.z + 10;
  const arrivalAreaId = `apoc_extract_arrival_${String(player.id).replace(/[^a-zA-Z0-9_]/g, "").slice(-12)}`;
  try { dimension.runCommand(`tickingarea remove ${arrivalAreaId}`); } catch {}
  try {
    dimension.runCommand(`tickingarea add ${Math.floor(x) - 8} 54 ${Math.floor(z) - 8} ${Math.floor(x) + 8} 180 ${Math.floor(z) + 8} ${arrivalAreaId} true`);
  } catch (error) { console.warn(`[ExtractionCity] arrival ticking area unavailable: ${error}`); }
  system.runTimeout(() => {
    try {
      const location = { x: x + 0.5, y: CONFIG.airDropY, z: z + 0.5 };
      player.teleport(location, { dimension });
      player.addTag(CONFIG.activeTag);
      player.setDynamicProperty(CONFIG.activeStateKey, true);
      player.addEffect("resistance", 100, { amplifier: 4, showParticles: false });
      player.addEffect("slow_falling", CONFIG.airDropSlowFallingTicks, { amplifier: 0, showParticles: true });
      applyExtractionEnvironment(player);
      snapshotBackpack(player);
      const exit = nearestExit(player);
      player.sendMessage(`§6[摸金都市] 已在 ${point.name} 上空投放，并获得 60 秒缓降。City 不占用枪械 HUD；左上角聊天每 60 秒更新一次导航。进入撤离点 ${CONFIG.extractionRadius} 格范围后会自动开始倒计时。`);
      publishNavigationChat(player, exit, nearestLegendaryCrate(player));
      navigationChatTicks.set(player.id, system.currentTick);
    } catch (error) { player.sendMessage(`§c进入失败：${error}`); }
    system.runTimeout(() => { try { dimension.runCommand(`tickingarea remove ${arrivalAreaId}`); } catch {} }, 100);
  }, 30);
}

function nearestExit(player) {
  return points().map(point => ({ ...point, distance: distance2D(player.location, point) })).sort((a, b) => a.distance - b.distance)[0] || null;
}

function legendaryCratePoints() {
  try {
    const points = parse(world.getDynamicProperty(CONFIG.premiumCratePointsKey), []);
    return points.filter(point => point?.id && PREMIUM_CRATE_TIERS.includes(point.tier) &&
      point.dimension === CONFIG.dimensionId && [point.x, point.y, point.z].every(Number.isFinite));
  } catch { return []; }
}

function nearestLegendaryCrate(player) {
  return legendaryCratePoints()
    .map(point => ({ ...point, distance: distance2D(player.location, point) }))
    .sort((a, b) => a.distance - b.distance)
    .find(point => {
      if (point.distance > 96) return true;
      try {
        const expected = CRATE_BLOCK_BY_TIER[point.tier];
        return player.dimension.getBlock({ x: point.x, y: point.y, z: point.z })?.typeId === expected;
      } catch { return true; }
    }) || null;
}

function navigationDirection(player, point) {
  const dx = Number(point.x) - Number(player.location.x);
  const dz = Number(point.z) - Number(player.location.z);
  const length = Math.max(0.001, Math.hypot(dx, dz));
  const nx = dx / length, nz = dz / length;
  let view = { x: 0, z: -1 };
  try { view = player.getViewDirection(); } catch {}
  const viewLength = Math.max(0.001, Math.hypot(view.x, view.z));
  const vx = view.x / viewLength, vz = view.z / viewLength;
  const forward = vx * nx + vz * nz;
  const right = vx * nz - vz * nx;
  let relative;
  if (forward >= 0.7) relative = "↑前方";
  else if (forward <= -0.7) relative = "↓后方";
  else if (right >= 0.7) relative = "→右侧";
  else if (right <= -0.7) relative = "←左侧";
  else if (forward >= 0 && right >= 0) relative = "↗右前";
  else if (forward >= 0) relative = "↖左前";
  else if (right >= 0) relative = "↘右后";
  else relative = "↙左后";
  const eastWest = Math.abs(dx) < length * 0.25 ? "" : dx > 0 ? "东" : "西";
  const northSouth = Math.abs(dz) < length * 0.25 ? "" : dz > 0 ? "南" : "北";
  return `${relative}·${northSouth}${eastWest || (northSouth ? "" : "原地")}`;
}

function publishNavigationChat(player, exit, premium) {
  const lines = [
    `§6[摸金导航] §a撤离：§f${exit?.name || "未知"} §e${Math.floor(exit?.distance || 0)}m §b${exit ? navigationDirection(player, exit) : ""} §8(${exit?.x || 0}, ${exit?.z || 0})`
  ];
  if (premium) lines.push(`§6高价值目标：§f${premium.name} §e${Math.floor(premium.distance)}m §b${navigationDirection(player, premium)} §8(${premium.x}, ${premium.y}, ${premium.z})`);
  else lines.push("§7附近没有已确认存在的传说或神话物资箱。");
  try { player.sendMessage(lines.join("\n")); } catch {}
}

function startExtraction(player) {
  const point = nearestExit(player);
  if (!point || point.distance > CONFIG.extractionRadius) {
    player.sendMessage(`§c需要进入撤离点 ${CONFIG.extractionRadius} 格范围。最近：${point?.name || "无"}（${Math.floor(point?.distance || 0)}格）`);
    return;
  }
  extractionJobs.set(player.id, { pointId: point.id, startedTick: system.currentTick, origin: { ...player.location } });
  player.sendMessage(`§e[撤离] ${CONFIG.extractionSeconds} 秒倒计时开始，请留在 ${point.name} 的 ${CONFIG.extractionRadius} 格范围内。`);
}

function openMenu(player) {
  const inside = player.dimension.id === CONFIG.dimensionId;
  const point = inside ? nearestExit(player) : null;
  const form = new ActionFormData().title("§l§6末日摸金都市")
    .body(inside
      ? `§0快捷栏 1-9 与穿戴装备受保险保护。\n§4背包槽位 10-36 死亡时全部掉落。\n\n§0最近撤离点：§e${point?.name || "无"} §8(${Math.floor(point?.distance || 0)}格)\n§0进入 ${CONFIG.extractionRadius} 格范围会自动开始撤离；下方按钮与命令仅作为备用。\n§e/scriptevent extract:exit`
      : "§0这是持续开放的最高风险区域，不需要创建战局。\n§025 个密集城区组成约 768×768 的废弃都市；首次升级只生成一次。\n§0都市传说 Boss 会低概率出现。")
    .button(inside ? "§a开始撤离" : "§6随机进入都市", inside ? "textures/ui/confirm" : "textures/ui/World")
    .button("§8关闭", "textures/ui/cancel");
  form.show(player).then(result => {
    if (result.canceled || result.selection !== 0) return;
    if (inside) startExtraction(player); else enter(player);
  }).catch(error => {
    console.warn(`[ExtractionCity] menu failed for ${player.name}: ${error}`);
    try { player.sendMessage(`§c摸金都市菜单打开失败，请直接执行 /scriptevent extract:enter；若仍无响应，请确认行为包 v${CONFIG.version} 已启用。`); } catch {}
  });
}

function captureBackpack(player) {
  try {
    const container = player.getComponent("minecraft:inventory")?.container;
    if (!container) return null;
    const hotbarItems = [];
    const backpackItems = [];
    for (let slot = 0; slot < Math.min(CONFIG.protectedHotbarSlots, container.size); slot++) {
      const item = container.getItem(slot);
      if (item) hotbarItems.push({ slot, item });
    }
    for (let slot = CONFIG.protectedHotbarSlots; slot < container.size; slot++) {
      const item = container.getItem(slot);
      if (item) backpackItems.push({ slot, item });
    }
    const equipmentItems = [];
    try {
      const equippable = player.getComponent("minecraft:equippable");
      for (const slot of INSURED_EQUIPMENT) {
        const item = equippable?.getEquipment(slot);
        if (item) equipmentItems.push({ slot, item });
      }
    } catch {}
    return { hotbarItems, backpackItems, equipmentItems, size: container.size };
  } catch { return null; }
}

function snapshotBackpack(player) {
  try {
    if (player.dimension.id !== CONFIG.dimensionId) return;
    const captured = captureBackpack(player);
    if (!captured) return;
    backpackSnapshots.set(player.id, {
      ...captured,
      dimensionId: CONFIG.dimensionId,
      location: { ...player.location },
      updatedTick: system.currentTick
    });
  } catch {}
}

function clearBackpackSlots(player) {
  try {
    const container = player.getComponent("minecraft:inventory")?.container;
    if (!container) return false;
    for (let slot = CONFIG.protectedHotbarSlots; slot < container.size; slot++) container.setItem(slot, undefined);
    return true;
  } catch { return false; }
}

function restoreInsuredLoadout(player, snapshot) {
  if (!snapshot) return false;
  let restored = false;
  try {
    const container = player.getComponent("minecraft:inventory")?.container;
    if (container) {
      for (let slot = 0; slot < Math.min(CONFIG.protectedHotbarSlots, container.size); slot++) container.setItem(slot, undefined);
      for (const entry of snapshot.hotbarItems || []) container.setItem(entry.slot, entry.item);
      restored = true;
    }
  } catch {}
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      for (const slot of INSURED_EQUIPMENT) equippable.setEquipment(slot, undefined);
      for (const entry of snapshot.equipmentItems || []) equippable.setEquipment(entry.slot, entry.item);
      restored = true;
    }
  } catch {}
  return restored;
}

function extractionSessionActive(player, snapshot) {
  if (snapshot?.dimensionId === CONFIG.dimensionId) return true;
  try { if (player.getDynamicProperty(CONFIG.activeStateKey) === true) return true; } catch {}
  try { return player.hasTag(CONFIG.activeTag); } catch { return false; }
}

function dropBackpack(player, location = null, dimension = null, preferCurrent = false) {
  const cached = backpackSnapshots.get(player.id);
  if (deathHandled.has(player.id) || !extractionSessionActive(player, cached)) return;
  deathHandled.add(player.id);
  const current = captureBackpack(player);
  const dropped = (preferCurrent && current) ? current : (cached || current || { backpackItems: [] });
  const dropLocation = location || cached?.location;
  let dropDimension = dimension;
  if (!dropDimension) {
    try { dropDimension = world.getDimension(cached?.dimensionId || CONFIG.dimensionId); } catch {}
  }
  clearBackpackSlots(player);
  if (dropDimension && dropLocation) for (const entry of dropped.backpackItems || []) {
    try { dropDimension.spawnItem(entry.item, dropLocation); } catch {}
  }
  insuredReturns.set(player.id, {
    hotbarItems: [...(dropped.hotbarItems || [])],
    equipmentItems: [...(dropped.equipmentItems || [])]
  });
  backpackSnapshots.delete(player.id);
  pendingReturn.set(player.id, true);
  try { player.setDynamicProperty(CONFIG.deathReturnKey, true); } catch {}
  try { player.setDynamicProperty(CONFIG.activeStateKey, undefined); } catch {}
  extractionJobs.delete(player.id);
  try { player.removeTag(CONFIG.activeTag); } catch {}
  system.runTimeout(() => deathHandled.delete(player.id), 100);
}

function spawnExtractionMob(player) {
  const nearby = player.dimension.getEntities({ location: player.location, maxDistance: 48, tags: ["apoc_hostile"] });
  if (nearby.length >= CONFIG.hostileCapPerPlayer) return;
  const choice = weighted(CONFIG.mobPool);
  const count = nearby.length < 4 ? 2 : 1;
  for (let index = 0; index < count; index++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 18 + Math.random() * 18;
    const location = safeGround(
      player.dimension,
      player.location.x + Math.cos(angle) * radius,
      player.location.z + Math.sin(angle) * radius,
      10
    );
    if (!location) continue;
    try {
      const entity = player.dimension.spawnEntity(APOCALYPSE_MOBS[choice.key] || APOCALYPSE_MOBS.mutant, location);
      entity.addTag("apoc_hostile");
      entity.addTag("apoc_director");
      entity.addTag("apoc_extraction_hostile");
      entity.addTag("apoc_zone_extraction");
    } catch (error) {
      if (system.currentTick - mobSpawnFailureNoticeTick >= 1200) {
        mobSpawnFailureNoticeTick = system.currentTick;
        console.warn(`[ExtractionCity] Apocalypse mob spawn failed; verify Apocalypse Mobs is active: ${error}`);
      }
    }
  }
}

function spawnHordeWave(player, wave) {
  const waves = [
    ["runner", "runner", "basic", "basic", "spitter", "shrieker"],
    ["runner", "spitter", "shrieker", "charger", "hunter", "hunter"],
    ["heavy", "charger", "hunter", "mutant", "tyrant"]
  ];
  let spawned = 0;
  for (const key of waves[Math.max(0, Math.min(2, wave - 1))]) {
    const angle = Math.random() * Math.PI * 2;
    const location = safeGround(player.dimension, player.location.x + Math.cos(angle) * (18 + Math.random() * 12), player.location.z + Math.sin(angle) * (18 + Math.random() * 12), 12);
    if (!location) continue;
    try {
      const entity = player.dimension.spawnEntity(APOCALYPSE_MOBS[key], location);
      for (const tag of ["apoc_hostile", "apoc_director", "apoc_extraction_hostile", "apoc_zone_extraction", "apoc_extraction_horde"]) entity.addTag(tag);
      spawned++;
    } catch {}
  }
  world.sendMessage(`§4[摸金尸潮] 第 ${wave}/3 波来袭，侦测到 ${spawned} 个目标！`);
}

function tickHorde(allowStart = false) {
  const players = world.getAllPlayers().filter(player => player.dimension.id === CONFIG.dimensionId);
  if (!players.length) { activeHorde = null; return; }
  const now = system.currentTick;
  if (!activeHorde) {
    if (!allowStart || now < nextHordeAllowedTick || Math.random() >= CONFIG.hordeChancePerCheck) return;
    activeHorde = { wave: 1, startedTick: now, nextWaveTick: now + CONFIG.hordeWaveTimeoutTicks };
    world.sendMessage("§c[都市警报] 尸潮正在向城区聚集！共三波，寻找掩体并准备交战。");
    spawnHordeWave(players[Math.floor(Math.random() * players.length)], 1);
    return;
  }
  let alive = 0;
  try { alive = players[0].dimension.getEntities({ tags: ["apoc_extraction_horde"] }).length; } catch {}
  if (activeHorde.wave < 3 && (alive === 0 || now >= activeHorde.nextWaveTick)) {
    activeHorde.wave++;
    activeHorde.nextWaveTick = now + CONFIG.hordeWaveTimeoutTicks;
    spawnHordeWave(players[Math.floor(Math.random() * players.length)], activeHorde.wave);
  } else if (activeHorde.wave === 3 && alive === 0) {
    world.sendMessage("§a[摸金尸潮] 尸潮已被击退，城区暂时恢复平静。");
    activeHorde = null;
    nextHordeAllowedTick = now + CONFIG.hordeCooldownTicks;
  }
}

function cleanupVanillaHostiles(dimension) {
  for (const typeId of VANILLA_HOSTILES) {
    let entities = [];
    try { entities = dimension.getEntities({ type: typeId }); } catch {}
    for (const entity of entities) {
      try { if (!entity.hasTag("apoc_extraction_allowed")) entity.remove(); } catch {}
    }
  }
}

function spawnBoss(player, force = false) {
  const existing = player.dimension.getEntities({ tags: ["apoc_extraction_boss"] });
  if (existing.length) return { spawned: false, reason: "existing", entity: existing[0] };
  if (!force && Math.random() >= CONFIG.bossChancePerCheck) return { spawned: false, reason: "chance" };
  const profile = weighted(CONFIG.bossPool);
  const angle = Math.random() * Math.PI * 2;
  const location = safeGround(player.dimension, player.location.x + Math.cos(angle) * 45, player.location.z + Math.sin(angle) * 45);
  if (!location) return { spawned: false, reason: "ground" };
  try {
    const boss = player.dimension.spawnEntity(profile.id, location);
    boss.addTag("apoc_extraction_boss"); boss.addTag("apoc_hostile"); boss.addTag("apoc_zone_extraction");
    world.sendMessage(`§4[都市警报] ${profile.urbanLegend ? "都市传说" : "变异首领"}已在摸金都市出现：${profile.id}`);
    return { spawned: true, id: profile.id, entity: boss };
  } catch (error) {
    console.warn(`[ExtractionCity] boss ${profile.id} unavailable: ${error}`);
    return { spawned: false, reason: "unavailable", error };
  }
}

function command(player, message) {
  const args = String(message).trim().split(/\s+/);
  if (args[0].toLowerCase() !== "!extract") return false;
  if (args[1] === "enter") enter(player);
  else if (args[1] === "exit") startExtraction(player);
  else if (args[1] === "point" && args[2] === "add" && isAdmin(player) && player.dimension.id === CONFIG.dimensionId) {
    const list = points().slice();
    const id = `custom_${Date.now().toString(36)}`;
    list.push({ id, name: args.slice(3).join(" ") || `自定义撤离点 ${list.length + 1}`, x: Math.floor(player.location.x), z: Math.floor(player.location.z) });
    world.setDynamicProperty(CONFIG.pointsKey, JSON.stringify(list.slice(-32)));
    player.sendMessage("§a已将当前位置加入撤离点列表。");
  } else if (args[1] === "point" && args[2] === "reset" && isAdmin(player)) {
    world.setDynamicProperty(CONFIG.pointsKey, undefined); player.sendMessage("§a撤离点已恢复默认配置。");
  } else openMenu(player);
  return true;
}

enforceKeepInventory();
try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}

subscribe(world.afterEvents?.entityHurt, "entityHurt", event => {
  const player = event.hurtEntity;
  if (player?.typeId !== "minecraft:player" || !extractionSessionActive(player, backpackSnapshots.get(player.id))) return;
  try {
    const health = player.getComponent("minecraft:health");
    if (health && health.currentValue <= 0) {
      const cached = backpackSnapshots.get(player.id);
      dropBackpack(player, cached?.location, extractionDimension(), true);
    }
  } catch {}
});

subscribe(world.afterEvents?.entityDie, "entityDie", event => {
  const player = event.deadEntity;
  if (player?.typeId === "minecraft:player") {
    try {
      const cached = backpackSnapshots.get(player.id);
      dropBackpack(player, cached?.location, extractionDimension());
    } catch {}
  }
});

subscribe(world.afterEvents?.playerSpawn, "playerSpawn", event => {
  if (event.initialSpawn && isAdmin(event.player)) {
    system.runTimeout(() => {
      try { event.player.sendMessage(`§a[摸金都市] 行为脚本 v${CONFIG.version} 已加载，菜单与原版 /scriptevent 入口可用。`); } catch {}
    }, 40);
  }
  let shouldReturn = pendingReturn.delete(event.player.id);
  try { shouldReturn ||= event.player.getDynamicProperty(CONFIG.deathReturnKey) === true; } catch {}
  if (!shouldReturn) return;
  try { event.player.setDynamicProperty(CONFIG.deathReturnKey, undefined); } catch {}
  system.runTimeout(() => {
    const insured = insuredReturns.get(event.player.id);
    clearBackpackSlots(event.player);
    restoreInsuredLoadout(event.player, insured);
    insuredReturns.delete(event.player.id);
    returnPlayer(event.player, "行动失败，已返回安全区域；背包物资留在死亡地点。");
  }, 20);
});

subscribe(world.afterEvents?.entitySpawn, "entitySpawn", event => {
  const entity = event.entity;
  if (!entity || !VANILLA_HOSTILES.has(entity.typeId)) return;
  system.run(() => {
    try {
      if (entity.dimension.id === CONFIG.dimensionId && !entity.hasTag("apoc_extraction_allowed")) entity.remove();
    } catch {}
  });
});

subscribe(world.beforeEvents?.chatSend, "chatSend", event => {
  if (!String(event.message).toLowerCase().startsWith("!extract")) return;
  event.cancel = true;
  system.run(() => command(event.sender, event.message));
});

subscribe(system.afterEvents?.scriptEventReceive, "scriptEventReceive", event => {
  const { player, message } = scriptEventContext(event);
  if (!player) {
    if (String(event.id || "").startsWith("extract:")) {
      console.warn(`[ExtractionCity] ignored ${event.id}: player source could not be resolved.`);
      try { world.sendMessage("§c[摸金都市] 已收到指令，但无法识别发起玩家。请从 SAPI 菜单进入，或由玩家本人执行指令。"); } catch {}
    }
    return;
  }
  if (event.id === "extract:menu") {
    acknowledgeMenuRequest(player, message);
  }
  else if (event.id === "extract:enter") system.run(() => enter(player));
  else if (event.id === "extract:exit") system.run(() => startExtraction(player));
  else if (event.id === "extract:exits") system.run(() => {
    if (player.dimension.id !== CONFIG.dimensionId) return player.sendMessage("§c请先进入摸金都市。");
    const nearest = points().map(point => ({ ...point, distance: distance2D(player.location, point) })).sort((a, b) => a.distance - b.distance).slice(0, 5);
    player.sendMessage(`§6[撤离点]\n${nearest.map(point => `§e${point.name} §8- ${Math.floor(point.distance)}m §0(${point.x}, ${point.z})`).join("\n")}\n§0寻找绿色信标，进入 ${CONFIG.extractionRadius} 格范围会自动开始撤离。`);
  });
  else if (event.id === "extract:status" && isAdmin(player)) system.run(() => {
    const ready = world.getDynamicProperty(CONFIG.cityReadyKey) === true;
    const heartbeat = Number(world.getDynamicProperty(CONFIG.apocalypseHeartbeatKey) || 0);
    const crates = Number(world.getDynamicProperty("apoc_extract:crate_count:v1") || 0);
    const crateTiers = parse(world.getDynamicProperty("apoc_extract:crate_tiers:v1"), {});
    const dimension = extractionDimension();
    const bosses = dimension ? dimension.getEntities({ tags: ["apoc_extraction_boss"] }).length : 0;
    player.sendMessage(`§6[摸金都市状态] §0v${CONFIG.version}\n§0扩展城区：${ready ? "§a已生成" : "§c未生成"}\n§0Apocalypse Mobs：${heartbeat && Date.now() - heartbeat < 30000 ? "§a已连接" : "§c未连接"}\n§0已布置物资箱：§e${crates} §8(普通 ${crateTiers.common || 0} / 稀有 ${crateTiers.rare || 0} / 史诗 ${crateTiers.epic || 0} / 传奇 ${crateTiers.legendary || 0} / 神话 ${crateTiers.mythic || 0})\n§0当前 Boss：§e${bosses}`);
  });
  else if (event.id === "extract:boss" && isAdmin(player)) system.run(() => {
    if (player.dimension.id !== CONFIG.dimensionId) return player.sendMessage("§c请先进入摸金都市再测试 Boss。");
    const result = spawnBoss(player, true);
    if (result?.spawned) return player.sendMessage(`§a已在附近生成 Boss：${result.id}`);
    if (result?.reason === "existing") return player.sendMessage("§e摸金维度中已有一个存活的 Boss；击败后才能生成下一个。");
    if (result?.reason === "ground") return player.sendMessage("§c附近没有可用生成地面，请移动到城区道路后重试。");
    player.sendMessage("§cBoss 生成失败，请检查 Apocalypse Mobs 是否启用并查看内容日志。");
  });
  else if (event.id === "extract:rebuild" && isAdmin(player)) system.run(async () => {
    const dimension = extractionDimension();
    if (!dimension) return player.sendMessage("§c摸金维度不可用。");
    player.sendMessage("§e正在一次性升级 25 个混合城区：清理旧重复高楼、部署 RandS 地标与 11 类建筑、铺设连续道路并加固双层承托面。预计 3～6 分钟，请勿重复执行……");
    try {
      world.setDynamicProperty(CONFIG.cityReadyKey, undefined);
      await ensureCityReady(dimension, true);
      player.sendMessage("§a摸金都市扩建与修复完成。");
    } catch (error) {
      player.sendMessage(`§c摸金都市重建失败：${error}`);
      console.error(`[ExtractionCity] manual rebuild failed: ${error}`);
    }
  });
});

system.runInterval(() => {
  try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}
  for (const player of world.getAllPlayers()) {
    try {
      const requestId = Number(player.getDynamicProperty(CONFIG.menuRequestKey) || 0);
      const acknowledged = Number(player.getDynamicProperty(CONFIG.menuAckKey) || 0);
      if (requestId && requestId !== acknowledged) acknowledgeMenuRequest(player, requestId);
    } catch {}
    if (player.dimension.id !== CONFIG.dimensionId) {
      navigationChatTicks.delete(player.id);
      continue;
    }
    snapshotBackpack(player);
    if (system.currentTick % 100 === 0) applyExtractionEnvironment(player);
    const point = nearestExit(player);
    if (!navigationChatTicks.has(player.id)) navigationChatTicks.set(player.id, system.currentTick);
    const lastNavigationChat = Number(navigationChatTicks.get(player.id));
    if (system.currentTick - lastNavigationChat >= CONFIG.navigationChatIntervalTicks) {
      const premium = nearestLegendaryCrate(player);
      publishNavigationChat(player, point, premium);
      navigationChatTicks.set(player.id, system.currentTick);
    }
    if (point && point.distance <= CONFIG.extractionRadius && !extractionJobs.has(player.id)) {
      startExtraction(player);
      continue;
    }
    const job = extractionJobs.get(player.id);
    if (!job) continue;
    const activePoint = points().find(value => value.id === job.pointId);
    if (!activePoint || distance2D(player.location, activePoint) > CONFIG.extractionRadius) {
      extractionJobs.delete(player.id); player.sendMessage("§c[撤离] 已离开撤离点，倒计时取消。"); continue;
    }
    const elapsed = system.currentTick - job.startedTick;
    if (elapsed >= CONFIG.extractionSeconds * 20) { extractionJobs.delete(player.id); returnPlayer(player, "撤离成功，已保全全部携带物资。"); }
  }
}, 10);

system.runInterval(enforceKeepInventory, 200);

system.runInterval(() => {
  const players = world.getAllPlayers().filter(player => player.dimension.id === CONFIG.dimensionId);
  if (players.length) cleanupVanillaHostiles(players[0].dimension);
  for (const player of players) try { spawnExtractionMob(player); } catch {}
}, CONFIG.hostileSpawnIntervalTicks);

system.runInterval(() => {
  for (const player of world.getAllPlayers()) if (player.dimension.id === CONFIG.dimensionId) try { spawnBoss(player); } catch {}
}, CONFIG.bossCheckIntervalTicks);

system.runInterval(() => {
  try { tickHorde(true); } catch (error) { console.warn(`[ExtractionCity] horde start check failed: ${error}`); }
}, CONFIG.hordeCheckIntervalTicks);

system.runInterval(() => {
  try { tickHorde(false); } catch (error) { console.warn(`[ExtractionCity] active horde tick failed: ${error}`); }
}, 40);

console.warn(`[ExtractionCity] v${CONFIG.version} dense city, regional Apocalypse special infected, random hordes, loot crates, exits and dusk fog initialized.`);
