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
FireScheduler.reset("pulse-test");
assert.equal(FireScheduler.requestPulseShot("pulse-test", { rpm: 600 }, 100), 1, "first right-click pulse must fire");
assert.equal(FireScheduler.requestPulseShot("pulse-test", { rpm: 600 }, 101), 0, "pulse must respect RPM cooldown");
assert.equal(FireScheduler.requestPulseShot("pulse-test", { rpm: 600 }, 102), 1, "next eligible right-click pulse must fire");
FireScheduler.reset("pulse-test");

const recipes = Object.fromEntries(GunRegistry.getAllBlueprints().map(bp => [bp.id, bp]));
assert.deepEqual(recipes["survival:blueprint_m1911"].synthesisRecipe.map(x => [x.item, x.count]), [
  ["survival:basic_firearm_page", 4], ["survival:mechanical_data", 2], ["minecraft:paper", 2]
]);
assert.deepEqual(recipes["survival:blueprint_akm"].synthesisRecipe.map(x => [x.item, x.count]), [
  ["survival:rifle_page", 4], ["survival:mechanical_data", 3], ["survival:gun_structure_sample", 1], ["minecraft:paper", 1]
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

function shapedIngredientCounts(recipe) {
  const shaped = recipe["minecraft:recipe_shaped"];
  const counts = new Map();
  for (const symbol of shaped.pattern.join("")) {
    if (symbol === " ") continue;
    const item = shaped.key[symbol].item;
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return Array.from(counts.entries());
}
for (const gunName of ["m1911", "akm", "mp5", "m870"]) {
  const recipe = JSON.parse(readFileSync(join(root, `survival_guns_bp/recipes/blueprint_${gunName}.json`), "utf8"));
  const blueprint = recipes[`survival:blueprint_${gunName}`];
  assert.deepEqual(shapedIngredientCounts(recipe), blueprint.synthesisRecipe.map(x => [x.item, x.count]), `${gunName} crafting-table recipe must match the registry`);
  assert.deepEqual(recipe["minecraft:recipe_shaped"].tags, ["crafting_table"], `${gunName} blueprint must be crafted at a vanilla crafting table`);
}

for (const gunName of ["m1911", "akm", "mp5", "m870"]) {
  const item = JSON.parse(readFileSync(join(root, `survival_guns_bp/items/${gunName}.json`), "utf8").replace(/^\uFEFF/, ""));
  assert.ok(
    Number(item.format_version.split(".").slice(0, 2).join(".")) >= 1.21,
    `${gunName} must use an item format that recognizes minecraft:use_modifiers`
  );
  assert.ok(item["minecraft:item"].components["minecraft:use_modifiers"], `${gunName} must be hold-usable`);
  assert.equal(item["minecraft:item"].components["minecraft:icon"].textures.default, `survival:${gunName}`, `${gunName} icon must use the current textures.default schema`);
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

for (const attachablePath of walk(join(root, "survival_guns_rp_mvp/attachables")).filter(path => path.endsWith(".json"))) {
  const attachable = JSON.parse(readFileSync(attachablePath, "utf8"));
  const description = attachable["minecraft:attachable"].description;
  assert.equal(attachable.format_version, "1.20.30", `${attachablePath} must use the current attachable sample format`);
  assert.equal(description.item[description.identifier], "query.is_owner_identifier_any('minecraft:player')", `${attachablePath} must map the held item`);
  assert.deepEqual(description.scripts.animate, ["hold"], `${attachablePath} must run only its static hold pose`);
  assert.ok(description.animations.hold.includes("static_hold"), `${attachablePath} must use a static compatibility pose`);
  assert.deepEqual(description.render_controllers, ["controller.render.item_default"], `${attachablePath} must use the built-in item render controller`);
  assert.equal(description.materials.enchanted, "entity_alphatest_glint", `${attachablePath} must provide the enchanted material required by item_default`);
  assert.equal(description.textures.enchanted, "textures/misc/enchanted_item_glint", `${attachablePath} must provide the enchanted texture required by item_default`);
  const texturePath = join(root, "survival_guns_rp_mvp", `${description.textures.default}.png`);
  assert.ok(rpFiles.includes(texturePath), `${attachablePath} texture is missing: ${texturePath}`);
}

const itemAtlas = JSON.parse(readFileSync(join(root, "survival_guns_rp_mvp/textures/item_texture.json"), "utf8"));
for (const gunName of ["m1911", "akm", "mp5", "m870"]) {
  assert.equal(itemAtlas.texture_data[`survival:${gunName}`].textures, `textures/items/${gunName}`, `${gunName} namespaced icon atlas entry is missing`);
  const modelName = gunName === "akm" ? "ak47" : gunName;
  const modelSource = readFileSync(join(root, `survival_guns_rp_mvp/models/entity/temporary_deadzone_assets/${modelName}.geo.json`), "utf8");
  assert.ok(modelSource.includes("query.item_slot_to_bone_name(context.item_slot)"), `${gunName} model must bind to the held item slot`);
  const model = JSON.parse(modelSource);
  assert.equal(model.format_version, "1.16.0", `${gunName} model must use a geometry format that supports attachable binding`);
  assert.equal(model["minecraft:geometry"][0].description.visible_bounds_width, 8, `${gunName} model bounds must prevent hand-held culling`);
}

const staticHold = JSON.parse(readFileSync(join(root, "survival_guns_rp_mvp/animations/survival_static_hold.animation.json"), "utf8"));
assert.ok(staticHold.animations["animation.survival.rifle.static_hold"], "rifle static hold pose is missing");
assert.ok(staticHold.animations["animation.survival.pistol.static_hold"], "pistol static hold pose is missing");

const controllerSource = readFileSync(join(root, "survival_guns_bp/scripts/guns/GunController.js"), "utf8");
assert.ok(controllerSource.includes("MAX_AUTO_BURST_TICKS = 60"), "automatic fire must have a three-second hard timeout");
assert.ok(controllerSource.includes("this.#autoFireDeadline.delete(player.id)"), "automatic fire must clear its deadline when stopped");

console.log("PASS: four-gun registry, bounded auto fire, pulse firing, current icon schema, static model binding, JSON, and isolated assets validated");
