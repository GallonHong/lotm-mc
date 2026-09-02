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
assert.deepEqual(manifest.header.version, [0, 8, 1]);
assert.deepEqual(resourceManifest.header.version, [0, 8, 1]);
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
for (const marker of ["cityHalfSize: 384", "districtSpacing: 128", "districtCellSize: 16", "districtGridOrigin: -56", "city_ready:v5", "cityLayoutVersion: 8", "cityLayoutSentinelBlock", "activeStateKey", "lootNodesKey", "dusk_fog"]) assert(config.includes(marker), `missing dense-city config: ${marker}`);
const configModule = await import(`file://${join(bp, "scripts/config.js")}`);
assert.equal(configModule.CONFIG.districtCenters.length, 25, "5x5 district centers missing");
const main = readFileSync(join(bp, "scripts/main.js"), "utf8");
assert.match(main, /async function buildCityFoundation\(dimension\) \{\s+const half = CONFIG\.cityHalfSize;/, "buildCityFoundation must declare half in its own scope");
for (const marker of ["placePackStructure", "structure load \"${id}\"", "village:custom/houses/", "village:custom/streets/", "RANDS_BUILDING_FOOTPRINTS", "RANDS_STREET_STRUCTURES", "replaceRandSMarkers", "buildCityFoundation", "buildCityFoundationLayer", "expectedStreets", "roadCoordinates", "placeExtractionMarkers", "lime_stained_glass", "placeLootCrates", 'tier: "mythic"', "cityReadyKey", "protectedHotbarSlots", "backpackSnapshots", "insuredReturns", "restoreInsuredLoadout", "clearBackpackSlots", "dropBackpack", "extractionJobs", "entryPoints", "spawnExtractionMob", "cleanupVanillaHostiles", "spawnBoss", "entitySpawn", "extract:menu", "extract:enter", "extract:exit", "extract:exits", "extract:status", "extract:boss", "extract:rebuild", "gamerule keepinventory true"]) assert(main.includes(marker), `missing extraction behavior: ${marker}`);
for (const marker of ["cityReadyInSession", "cityReadyBackupKey", "cityPhysicallyPresent", "ensureCityServices", "prepareArrivalPad", "city service repair complete"]) assert(main.includes(marker) || config.includes(marker), `missing no-rebuild/safe-arrival behavior: ${marker}`);
for (const marker of ["cityLayoutVersionKey", "cityLayoutSentinel", "expectedBuildings", "expectedStreets", "airDropY", 'addEffect("slow_falling"', "225 个建筑与 1100 个 RandS 街道格"]) assert(main.includes(marker) || config.includes(marker), `missing direct-city/airdrop behavior: ${marker}`);
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
console.log("Apocalypse Extraction City v0.8.1 validation passed.");
