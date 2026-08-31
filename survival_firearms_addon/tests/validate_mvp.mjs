import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FireScheduler } from "../survival_guns_bp/scripts/guns/FireScheduler.js";
import { GunRegistry } from "../survival_guns_bp/scripts/guns/GunRegistry.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const expected = {
  "survival:m1911": { damage: 18, rpm: 300, magazineSize: 7, range: 32, durabilityMax: 700, ammoType: "survival:ammo_45" },
  "survival:akm": { damage: 13, rpm: 600, magazineSize: 30, range: 46, durabilityMax: 1300, ammoType: "survival:ammo_762" },
  "survival:mp5": { damage: 9, rpm: 900, magazineSize: 30, range: 30, durabilityMax: 1100, ammoType: "survival:ammo_9mm" },
  "survival:m870": { damage: 6, rpm: 75, magazineSize: 6, range: 20, durabilityMax: 900, ammoType: "survival:ammo_12g" }
};

assert.equal(GunRegistry.getAllGuns().length, 4, "MVP must register exactly four guns");
for (const [id, fields] of Object.entries(expected)) {
  const actual = GunRegistry.getGun(id);
  assert.ok(actual, `missing ${id}`);
  for (const [key, value] of Object.entries(fields)) assert.equal(actual[key], value, `${id}.${key}`);
}

for (const [name, rpm, mode, expectedShots] of [
  ["M1911", 300, "semi", 50], ["AKM", 600, "auto", 100], ["MP5", 900, "auto", 150]
]) {
  const shots = FireScheduler.simulateFireTicks(rpm, mode, 200);
  const error = Math.abs(shots - expectedShots) / expectedShots;
  assert.ok(error <= 0.02, `${name} RPM error ${(error * 100).toFixed(2)}%`);
}
assert.equal(FireScheduler.simulateFireTicks(5000, "auto", 200), 200, "RPM must clamp to 1200");

const recipes = Object.fromEntries(GunRegistry.getAllBlueprints().map(bp => [bp.id, bp]));
assert.deepEqual(recipes["survival:blueprint_m1911"].synthesisRecipe.map(x => [x.item, x.count]), [
  ["survival:basic_firearm_page", 8], ["survival:mechanical_data", 4], ["minecraft:paper", 2]
]);
assert.deepEqual(recipes["survival:blueprint_akm"].synthesisRecipe.map(x => [x.item, x.count]), [
  ["survival:rifle_page", 24], ["survival:mechanical_data", 18], ["survival:gun_structure_sample", 1], ["minecraft:paper", 4]
]);
for (const bp of Object.values(recipes)) {
  assert.equal(bp.playerCraftable, true);
  assert.equal(bp.consumedOnCraft, true);
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
for (const file of walk(root).filter(path => path.endsWith(".json"))) {
  JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

const rpFiles = walk(join(root, "survival_guns_rp_mvp"));
assert.ok(rpFiles.length < 100, `temporary RP scope leaked: ${rpFiles.length} files`);
assert.equal(rpFiles.filter(path => path.includes("temporary_deadzone_assets") && path.endsWith(".geo.json")).length, 4);
assert.equal(rpFiles.filter(path => path.includes("temporary_deadzone_assets/items") && path.endsWith(".png")).length, 4);
const stateController = readFileSync(join(root, "survival_guns_rp_mvp/animation_controllers/temporary_deadzone_assets/survival_gun_states.json"), "utf8");
assert.ok(!stateController.includes("query.has_tag"), "client animation controller must not use unsupported query.has_tag");

console.log("PASS: four-gun registry, RPM, recipes, JSON, Molang, and isolated assets validated");
