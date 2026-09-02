import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "extraction_bp");
function files(directory) { return readdirSync(directory).flatMap(name => { const path = join(directory, name); return statSync(path).isDirectory() ? files(path) : [path]; }); }
function json(path) { return JSON.parse(readFileSync(path, "utf8")); }

for (const path of files(bp).filter(path => path.endsWith(".json"))) assert.doesNotThrow(() => json(path), `invalid JSON: ${path}`);
const manifest = json(join(bp, "manifest.json"));
assert.deepEqual(manifest.header.version, [0, 2, 0]);
assert.deepEqual(manifest.header.min_engine_version, [1, 21, 120]);
assert(manifest.dependencies.some(dep => dep.module_name === "@minecraft/server" && dep.version === "beta"));
assert(manifest.dependencies.some(dep => dep.module_name === "@minecraft/server-ui" && dep.version === "2.0.0"));
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
const main = readFileSync(join(bp, "scripts/main.js"), "utf8");
for (const marker of ["registerCustomDimension", "placeJigsawStructure", "cityReadyKey", "protectedHotbarSlots", "dropBackpack", "extractionJobs", "entryPoints", "spawnBoss", "extract:menu", "extract:enter", "extract:exit", "gamerule keepinventory true"]) assert(main.includes(marker), `missing extraction behavior: ${marker}`);
assert(!processors.includes("chiseled_deepslste") && !processors.includes('"minecraft:deepslate_slab"'), "invalid RandS deepslate blocks remain");
console.log("Apocalypse Extraction City validation passed.");
