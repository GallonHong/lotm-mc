import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "apocalypse_vehicles_bp");
const rp = join(root, "apocalypse_vehicles_rp");
const json = path => JSON.parse(readFileSync(path, "utf8"));
assert.deepEqual(json(join(bp, "manifest.json")).header.version, [1, 2, 0]);
assert.deepEqual(json(join(rp, "manifest.json")).header.version, [1, 2, 0]);
const recipe = name => join(bp, "recipes/vehicles", `recipe_blueprint_${name}.json`);
for (const craftable of ["motorcycle", "speedboat"]) assert(existsSync(recipe(craftable)), `${craftable} blueprint must remain craftable`);
for (const shopOnly of ["truck", "ambulance", "helicopter"]) assert.equal(existsSync(recipe(shopOnly)), false, `${shopOnly} blueprint must be shop-only`);
console.log("Apocalypse Vehicles v1.2.0 validation passed.");
