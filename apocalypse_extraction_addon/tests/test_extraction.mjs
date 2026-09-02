import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "extraction_bp");
const rp = join(root, "extraction_rp");
function files(directory) { return readdirSync(directory).flatMap(name => { const path = join(directory, name); return statSync(path).isDirectory() ? files(path) : [path]; }); }
function json(path) { return JSON.parse(readFileSync(path, "utf8")); }

for (const path of files(bp).filter(path => path.endsWith(".json"))) assert.doesNotThrow(() => json(path), `invalid JSON: ${path}`);
const manifest = json(join(bp, "manifest.json"));
const resourceManifest = json(join(rp, "manifest.json"));
assert.deepEqual(manifest.header.version, [0, 3, 2]);
assert.deepEqual(resourceManifest.header.version, [0, 3, 2]);
assert.deepEqual(manifest.header.min_engine_version, [1, 21, 120]);
assert(manifest.dependencies.some(dep => dep.module_name === "@minecraft/server" && dep.version === "beta"));
assert(manifest.dependencies.some(dep => dep.module_name === "@minecraft/server-ui" && dep.version === "2.0.0"));
assert.equal(manifest.dependencies.some(dep => dep.uuid === "714f16b3-b6ad-47f3-af06-dd93095da201"), false, "optional Apocalypse Mobs must not block pack startup");
assert.equal(manifest.dependencies.some(dep => dep.uuid === "c6ef6f20-3d85-4d84-bf93-4b39e77e2760"), false, "optional Daily Events must not block pack startup");
assert(manifest.dependencies.some(dep => dep.uuid === resourceManifest.header.uuid && dep.version.join(".") === "0.3.2"), "own resource-pack dependency missing");
assert.equal(files(bp).some(path => path.includes("/dimensions/")), false, "obsolete data-driven dimension JSON must not be packaged");
assert.equal(json(join(bp, "biomes/ruined_city.json"))["minecraft:biome"].components["minecraft:tags"].tags.includes("apoc_extraction_city"), true);
assert(files(join(bp, "structures")).filter(path => path.endsWith(".mcstructure")).length >= 500, "RandS test city structures missing");
const jigsaw = json(join(bp, "worldgen/structures/village_custom.json"))["minecraft:jigsaw"];
assert(jigsaw.biome_filters.some(filter => filter.value === "apoc_extraction_city"));
const processors = files(join(bp, "worldgen/processors")).filter(path => path.endsWith(".json")).map(path => readFileSync(path, "utf8")).join("\n");
for (const tier of ["common", "rare", "epic", "legendary"]) assert(processors.includes(`daily:loot_crate_${tier}`));
assert(!processors.includes("loot_tables/chests/"), "legacy external loot tables must be removed");
const config = readFileSync(join(bp, "scripts/config.js"), "utf8");
for (const boss of ["fog_man", "goatman", "siren_head", "mutant_zombie", "mutant_skeleton", "mutant_lobber"]) assert(config.includes(boss));
for (const marker of ["cityHalfSize: 384", "districtSpacing: 256", "city_ready:v3", "activeStateKey", "lootNodesKey", "dusk_fog"]) assert(config.includes(marker), `missing expanded-city config: ${marker}`);
assert((config.match(/\{ x: (?:-?256|0), z: (?:-?256|0) \}/g) || []).length >= 9, "3x3 district centers missing");
const main = readFileSync(join(bp, "scripts/main.js"), "utf8");
for (const marker of ["registerCustomDimension", "placeJigsawStructure", "buildCityFoundation", "placeExtractionMarkers", "lime_stained_glass", "placeLootCrates", "cityReadyKey", "protectedHotbarSlots", "backpackSnapshots", "clearBackpackSlots", "dropBackpack", "extractionJobs", "entryPoints", "spawnExtractionMob", "cleanupVanillaHostiles", "spawnBoss", "entitySpawn", "extract:menu", "extract:enter", "extract:exit", "extract:exits", "extract:status", "extract:boss", "extract:rebuild", "gamerule keepinventory true"]) assert(main.includes(marker), `missing extraction behavior: ${marker}`);
assert(main.includes("scriptEventContext") && main.includes("__sapi_player__") && main.includes("event.initiator"), "robust script-event player resolution missing");
for (const id of ["apoc:infected_runner", "apoc:infected_spitter", "apoc:infected_mutant", "apoc:infected_heavy", "apoc:raider_rifleman"]) assert(main.includes(id), `missing direct Apocalypse spawn: ${id}`);
assert(!main.includes('spawnEntity("minecraft:ravager"'), "bosses must not silently fall back to vanilla mobs");
const fog = json(join(rp, "fogs/extraction_dusk.json"));
assert.equal(fog["minecraft:fog_settings"].description.identifier, "apoc_extract:dusk_fog");
assert(!processors.includes("chiseled_deepslste") && !processors.includes('"minecraft:deepslate_slab"'), "invalid RandS deepslate blocks remain");
console.log("Apocalypse Extraction City v0.3.2 validation passed.");
