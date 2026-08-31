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

for (const gunName of ["m1911", "akm", "mp5", "m870"]) {
  const item = JSON.parse(readFileSync(join(root, `survival_guns_bp/items/${gunName}.json`), "utf8").replace(/^\uFEFF/, ""));
  assert.ok(
    Number(item.format_version.split(".").slice(0, 2).join(".")) >= 1.21,
    `${gunName} must use an item format that recognizes minecraft:use_modifiers`
  );
  assert.ok(item["minecraft:item"].components["minecraft:use_modifiers"], `${gunName} must be hold-usable`);
}

const rpFiles = walk(join(root, "survival_guns_rp_mvp"));
assert.ok(rpFiles.length < 100, `temporary RP scope leaked: ${rpFiles.length} files`);
assert.equal(rpFiles.filter(path => path.includes("temporary_deadzone_assets") && path.endsWith(".geo.json")).length, 4);
assert.equal(rpFiles.filter(path => path.includes("temporary_deadzone_assets/items") && path.endsWith(".png")).length, 4);
const stateController = readFileSync(join(root, "survival_guns_rp_mvp/animation_controllers/temporary_deadzone_assets/survival_gun_states.json"), "utf8");
assert.ok(!stateController.includes("query.has_tag"), "client animation controller must not use unsupported query.has_tag");
const animationSources = walk(join(root, "survival_guns_rp_mvp/animations"))
  .filter(path => path.endsWith(".json"))
  .map(path => readFileSync(path, "utf8"))
  .join("\n");
assert.ok(!animationSources.includes("v.is_first_person"), "standalone animations must not depend on DeadZone variable.is_first_person");
assert.ok(!/\b(?:v|variable)\.[A-Za-z_][A-Za-z0-9_]*/.test(animationSources), "standalone animations must not depend on any DeadZone player variables");
assert.ok(animationSources.includes("query.is_first_person"), "standalone animations must use the supported first-person query");

const renderControllerPath = join(root, "survival_guns_rp_mvp/render_controllers/survival_guns.render_controllers.json");
const renderController = JSON.parse(readFileSync(renderControllerPath, "utf8"));
assert.ok(renderController.render_controllers["controller.render.survival_gun"], "standalone gun render controller is missing");
for (const attachablePath of walk(join(root, "survival_guns_rp_mvp/attachables")).filter(path => path.endsWith(".json"))) {
  const attachable = JSON.parse(readFileSync(attachablePath, "utf8"));
  const description = attachable["minecraft:attachable"].description;
  assert.deepEqual(description.scripts.animate, ["controller"], `${attachablePath} must animate in first and third person`);
  assert.deepEqual(description.render_controllers, ["controller.render.survival_gun"], `${attachablePath} must use the isolated render controller`);
  const texturePath = join(root, "survival_guns_rp_mvp", `${description.textures.default}.png`);
  assert.ok(rpFiles.includes(texturePath), `${attachablePath} texture is missing: ${texturePath}`);
}

console.log("PASS: four-gun registry, RPM, recipes, right-click use, JSON, standalone rendering, Molang, and isolated assets validated");
