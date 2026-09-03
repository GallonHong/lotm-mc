import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "test_guns_bp");
const rp = join(root, "test_guns_rp");
const json = path => JSON.parse(readFileSync(path, "utf8"));
function files(directory) { return readdirSync(directory).flatMap(name => { const path = join(directory, name); return statSync(path).isDirectory() ? files(path) : [path]; }); }
for (const path of [...files(bp), ...files(rp)].filter(path => path.endsWith(".json"))) assert.doesNotThrow(() => json(path), `invalid JSON: ${path}`);
const bpManifest = json(join(bp, "manifest.json"));
const rpManifest = json(join(rp, "manifest.json"));
assert.deepEqual(bpManifest.header.version, [3, 10, 0]);
assert.deepEqual(rpManifest.header.version, [3, 10, 0]);
assert.deepEqual(bpManifest.dependencies.find(value => value.uuid === rpManifest.header.uuid)?.version, [3, 10, 0]);
assert.equal(json(join(bp, "items/blueprint_usas12.json"))["minecraft:item"].description.identifier, "test_gun:blueprint_usas12");
assert(readFileSync(join(bp, "recipes/recipe_usas12.json"), "utf8").includes("test_gun:blueprint_usas12"));
for (const id of ["ak47_commander", "pkm", "m1014_ward", "flash_shield", "titan_chest"]) assert.equal(existsSync(join(bp, "recipes", `recipe_blueprint_${id}.json`)), false, `${id} limited blueprint recipe remains`);
const textureMap = json(join(rp, "textures/item_texture.json"));
assert.equal(textureMap.texture_data.test_gun_ammo_belt_100.textures, "textures/ammo/ammo_belt_100_generated");
const png = readFileSync(join(rp, "textures/ammo/ammo_belt_100_generated.png"));
assert.equal(png.readUInt32BE(16), 32);
assert.equal(png.readUInt32BE(20), 32);
console.log("Test Guns 2D v3.10.0 validation passed.");
