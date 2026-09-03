import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "extraction_bp");
const rp = join(root, "extraction_rp");
const bootstrap = join(root, "extraction_dimension_bootstrap_bp");
function files(directory) { return readdirSync(directory).flatMap(name => { const path = join(directory, name); return statSync(path).isDirectory() ? files(path) : [path]; }); }
function json(path) { return JSON.parse(readFileSync(path, "utf8")); }

for (const path of files(bp).filter(path => path.endsWith(".json"))) assert.doesNotThrow(() => json(path), `invalid JSON: ${path}`);
const manifest = json(join(bp, "manifest.json"));
const resourceManifest = json(join(rp, "manifest.json"));
const bootstrapManifest = json(join(bootstrap, "manifest.json"));
assert.deepEqual(manifest.header.version, [0, 10, 6]);
assert.deepEqual(resourceManifest.header.version, [0, 10, 6]);
assert.deepEqual(manifest.header.min_engine_version, [1, 21, 120]);
assert(manifest.dependencies.some(dep => dep.module_name === "@minecraft/server" && dep.version === "2.9.0"));
assert(manifest.dependencies.some(dep => dep.module_name === "@minecraft/server-ui" && dep.version === "2.0.0"));
assert(manifest.dependencies.some(dep => dep.uuid === bootstrapManifest.header.uuid && dep.version.join(".") === "0.1.0"));
assert(bootstrapManifest.dependencies.some(dep => dep.module_name === "@minecraft/server" && dep.version === "beta"));
assert.equal(manifest.dependencies.some(dep => dep.uuid === "714f16b3-b6ad-47f3-af06-dd93095da201"), false, "optional Apocalypse Mobs must not block pack startup");
assert.equal(manifest.dependencies.some(dep => dep.uuid === "c6ef6f20-3d85-4d84-bf93-4b39e77e2760"), false, "optional Daily Events must not block pack startup");
assert.equal(manifest.dependencies.filter(dep => dep.uuid).length, 1, "only the dimension bootstrap may be a hard pack dependency");
assert.equal(files(bp).some(path => path.includes("/dimensions/")), false, "obsolete data-driven dimension JSON must not be packaged");
assert.equal(json(join(bp, "biomes/ruined_city.json"))["minecraft:biome"].components["minecraft:tags"].tags.includes("apoc_extraction_city"), true);
assert(files(join(bp, "structures")).filter(path => path.endsWith(".mcstructure")).length >= 500, "RandS test city structures missing");
for (const street of ["road1", "road2", "road3", "road4", "cross1", "corner1", "center1"]) {
  assert(statSync(join(bp, "structures", "village", "custom", "streets", `${street}.mcstructure`)).isFile(), `missing directly materialized RandS street ${street}`);
}
for (let index = 1; index <= 11; index++) {
  assert(statSync(join(bp, "structures", "village", "custom", "houses", `house${index}.mcstructure`)).isFile(), `missing RandS house${index}`);
}
const jigsaw = json(join(bp, "worldgen/structures/village_custom.json"))["minecraft:jigsaw"];
assert(jigsaw.biome_filters.some(filter => filter.value === "apoc_extraction_city"));
const processorPaths = files(join(bp, "worldgen/processors")).filter(path => path.endsWith(".json"));
const processors = processorPaths.map(path => readFileSync(path, "utf8")).join("\n");
let spawnerRuleCount = 0;
function inspectSpawnerRules(value) {
  if (Array.isArray(value)) return value.forEach(inspectSpawnerRules);
  if (!value || typeof value !== "object") return;
  if (value.input_predicate?.block === "minecraft:mob_spawner") {
    spawnerRuleCount++;
    assert.equal(value.input_predicate.predicate_type, "minecraft:block_match", "spawner replacement must be deterministic");
    assert.equal(value.output_state?.name, "daily:loot_crate_common", "every structure spawner must become a crate");
  }
  Object.values(value).forEach(inspectSpawnerRules);
}
processorPaths.map(json).forEach(inspectSpawnerRules);
assert(spawnerRuleCount > 0, "no deterministic spawner replacement rules found");
assert(!processors.includes("loot_tables/chests/"), "legacy external loot tables must be removed");
const config = readFileSync(join(bp, "scripts/config.js"), "utf8");
for (const boss of ["fog_man", "goatman", "siren_head", "mutant_zombie", "mutant_skeleton", "mutant_lobber"]) assert(config.includes(boss));
for (const marker of ["cityHalfSize: 384", "districtSpacing: 128", "districtCellSize: 16", "districtGridOrigin: -56", "city_ready:v8", "cityLayoutVersion: 12", 'cityLayoutSentinelBlock: "minecraft:diamond_block"', "activeStateKey", "lootNodesKey", "premiumCratePointsKey", "extractionOutpostVersionKey", "roadRepairVersionKey", "crateDistributionVersionKey", "navigationChatIntervalTicks: 1200", "dusk_fog"]) assert(config.includes(marker), `missing dense-city config: ${marker}`);
const configModule = await import(`file://${join(bp, "scripts/config.js")}`);
assert.equal(configModule.CONFIG.districtCenters.length, 25, "5x5 district centers missing");
assert.deepEqual(configModule.CONFIG.crateTierWeights, { common: 60, rare: 25, epic: 10, legendary: 4, mythic: 1 });
assert.equal(Object.values(configModule.CONFIG.crateTierWeights).reduce((sum, weight) => sum + weight, 0), 100, "crate tier weights must total 100%");
for (const tier of ["epic", "legendary", "mythic"]) assert(configModule.CONFIG.crateTierWeights[tier] > 0, `${tier} must remain available in every city crate roll`);
const main = readFileSync(join(bp, "scripts/main.js"), "utf8");
assert.match(main, /async function buildCityFoundation\(dimension\) \{\s+const half = CONFIG\.cityHalfSize;/, "buildCityFoundation must declare half in its own scope");
for (const marker of ["placePackStructure", "structure load \"${id}\"", "village:custom/houses/", "village:custom/streets/", "RANDS_BUILDING_FOOTPRINTS", "RANDS_STREET_STRUCTURES", "RANDS_SMALL_HOUSES", "LANDMARK_ANCHORS", "deterministicIndex", "isDistrictRoadCell", "clearCommands", "cityBaseY - 1", "buildCityFoundation", "buildCityFoundationLayer", "expectedStreets", "roadCoordinates", "placeExtractionMarkers", "lime_stained_glass", "minecraft:beacon", "navigationDirection", "nearestLegendaryCrate", "City 不占用枪械 HUD", "传说物资箱", "placeLootCrates", "PREMIUM_CRATE_TIERS", "premiumCratePointsKey", "deterministicCrateTier", "refreshStructureCrateDistribution", "crateDistributionVersion", "cityReadyKey", "protectedHotbarSlots", "backpackSnapshots", "insuredReturns", "restoreInsuredLoadout", "clearBackpackSlots", "dropBackpack", "extractionJobs", "entryPoints", "spawnExtractionMob", "cleanupVanillaHostiles", "spawnBoss", "entitySpawn", "extract:menu", "extract:enter", "extract:exit", "extract:exits", "extract:status", "extract:boss", "extract:rebuild", "gamerule keepinventory true"]) assert(main.includes(marker) || config.includes(marker), `missing extraction behavior: ${marker}`);
for (const marker of ["cityReadyInSession", "cityReadyBackupKey", "cityPhysicallyPresent", "ensureCityServices", "prepareArrivalPad", "city service repair complete"]) assert(main.includes(marker) || config.includes(marker), `missing no-rebuild/safe-arrival behavior: ${marker}`);
for (const marker of ["cityLayoutVersionKey", "cityLayoutSentinel", "expectedBuildings", "expectedStreets", "roadCellsPerDistrict", "airDropY", 'addEffect("slow_falling"', "11 类建筑"]) assert(main.includes(marker) || config.includes(marker), `missing mixed-city/airdrop behavior: ${marker}`);
for (const marker of ["groundOffset: 9", "groundOffset: 10", "CONFIG.cityBaseY + 1 - footprint.groundOffset", "CRATE_BLOCK_BY_TIER", "RANDS_SPAWNER_MARKERS", "structureMarkerCrateTier", "mixedStructureCrateTiers", "markerIndex", "districtCrateLayout", "prepareCratePad", "loot_crate_rare", "loot_crate_epic", "loot_crate_legendary", "crate_tiers:v1"]) assert(main.includes(marker), `missing aligned-building/mixed-crate behavior: ${marker}`);
for (const marker of ["repairDistrictRoadCross", "minecraft:void_air", "crossMin", "crossMax", "supportMinY", "supportMaxY", "cityBaseY - 3", "checked % 512", "block.setType(\"minecraft:stone_bricks\")"]) assert(main.includes(marker), `missing verified void-trench repair: ${marker}`);
for (const marker of ["repairCitySurfaceVoids", "extract_surface_repair_", "minecraft:stone_bricks replace ${emptyBlock}", "roadRepairVersionKey"]) assert(main.includes(marker) || config.includes(marker), `missing full-city surface repair: ${marker}`);
assert.equal(main.includes("LEGENDARY_CRATE_DISTRICTS"), false, "premium crates must not be capped or restricted to fixed districts");
for (const marker of ["buildExtractionOutpost", "polished_deepslate", "lime_stained_glass", "iron_bars", "navigationChatTicks", "publishNavigationChat", "附近没有已确认存在的传说或神话物资箱"]) assert(main.includes(marker), `missing extraction outpost/chat navigation behavior: ${marker}`);
assert(main.includes("storedLayoutIsCurrent && sentinelIsPresent"), "layout upgrades must require both current version and a physical sentinel");
assert.equal(main.includes("onScreenDisplay.setActionBar") || main.includes("publishNavigationActionBar"), false, "extraction must leave the action bar exclusively to Test Guns");
assert.equal(main.includes("onScreenDisplay.setTitle") || main.includes("subtitle:"), false, "extraction navigation must never use title/subtitle");
assert.equal(main.includes("CONFIG.navigationHudKey") || config.includes("navigationHudKey"), false, "extraction must not depend on Test Guns HUD state");
const gunUi = readFileSync(resolve(root, "../test_guns_2d_addon/test_guns_bp/scripts/feature/ui.js"), "utf8");
assert.equal(gunUi.includes("apoc_extraction_navigation") || gunUi.includes("extractionNavigation"), false, "Test Guns must remain untouched by extraction navigation");
assert(main.includes("point.distance <= CONFIG.extractionRadius && !extractionJobs.has(player.id)"), "entering an extraction point must automatically start extraction");
assert(!main.includes("registerCustomDimension") && !main.includes("world.tickingAreaManager") && !main.includes("world.structureManager"), "stable extraction core must not access Beta-only registries/managers");
const bootstrapMain = readFileSync(join(bootstrap, "scripts/main.js"), "utf8");
assert(bootstrapMain.includes("registerCustomDimension") && bootstrapMain.includes("apoc_extract:city"));
assert(main.includes("scriptEventContext") && main.includes("__sapi_player__") && main.includes("event.initiator"), "robust script-event player resolution missing");
assert(main.includes("menuRequestKey") && main.includes("menuAckKey") && main.includes("acknowledgeMenuRequest"), "dual-channel SAPI extraction acknowledgement missing");
for (const id of ["apoc:infected_runner", "apoc:infected_spitter", "apoc:infected_shrieker", "apoc:infected_charger", "apoc:infected_hunter", "apoc:infected_mutant", "apoc:infected_heavy", "apoc:infected_tyrant", "apoc:infected_broodmother", "apoc:raider_rifleman"]) assert(main.includes(id), `missing direct Apocalypse spawn: ${id}`);
for (const marker of ["tickHorde", "spawnHordeWave", "apoc_extraction_horde", "hordeChancePerCheck", "hordeCooldownTicks"]) assert(main.includes(marker) || config.includes(marker), `missing extraction horde behavior: ${marker}`);
assert(!main.includes('spawnEntity("minecraft:ravager"'), "bosses must not silently fall back to vanilla mobs");
const fog = json(join(rp, "fogs/extraction_dusk.json"));
assert.equal(fog["minecraft:fog_settings"].description.identifier, "apoc_extract:dusk_fog");
assert(!processors.includes("chiseled_deepslste") && !processors.includes('"minecraft:deepslate_slab"'), "invalid RandS deepslate blocks remain");
console.log("Apocalypse Extraction City v0.10.6 validation passed.");
