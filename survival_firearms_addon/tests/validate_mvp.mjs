import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FireScheduler } from "../survival_guns_bp/scripts/guns/FireScheduler.js";
import { GunRegistry } from "../survival_guns_bp/scripts/guns/GunRegistry.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(path, "utf8").replace(/^\uFEFF/, "");
const json = (path) => JSON.parse(read(path));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const expected = {
  "survival:m1911": { damage: 18, rpm: 300, magazineSize: 7, ammoType: "survival:ammo_45" },
  "survival:akm": { damage: 13, rpm: 600, magazineSize: 30, ammoType: "survival:ammo_762" },
  "survival:mp5": { damage: 9, rpm: 900, magazineSize: 30, ammoType: "survival:ammo_9mm" },
  "survival:m870": { damage: 6, rpm: 75, magazineSize: 6, ammoType: "survival:ammo_12g" }
};

assert.equal(GunRegistry.getAllGuns().length, 4);
for (const [id, fields] of Object.entries(expected)) {
  const gun = GunRegistry.getGun(id);
  assert.ok(gun, `missing ${id}`);
  for (const [field, value] of Object.entries(fields)) assert.equal(gun[field], value, `${id}.${field}`);
}

for (const [rpm, mode, expectedShots] of [[300, "semi", 50], [600, "auto", 100], [900, "auto", 150]]) {
  const shots = FireScheduler.simulateFireTicks(rpm, mode, 200);
  assert.ok(Math.abs(shots - expectedShots) / expectedShots <= 0.02, `${rpm} RPM simulation drift`);
}

for (const [playerId, rpm, expectedShots] of [["akm-rate-test", 600, 100], ["mp5-rate-test", 900, 150]]) {
  FireScheduler.reset(playerId);
  let shots = 0;
  const gun = { fireMode: "auto", rpm };
  for (let tick = 0; tick < 200; tick += 1) {
    shots += FireScheduler.requestMolangShots(playerId, gun, tick);
  }
  assert.ok(Math.abs(shots - expectedShots) / expectedShots <= 0.02, `${rpm} RPM live-request drift: ${shots}`);
  FireScheduler.reset(playerId);
}

FireScheduler.reset("release-lock-test");
assert.equal(FireScheduler.requestMolangShots("release-lock-test", { fireMode: "auto", rpm: 600 }, 0), 1);
FireScheduler.blockUntilRelease("release-lock-test");
for (let tick = 1; tick <= 20; tick += 1) {
  assert.equal(FireScheduler.requestMolangShots("release-lock-test", { fireMode: "auto", rpm: 600 }, tick), 0, "continuous heartbeat must not clear release lock");
}
assert.equal(FireScheduler.requestMolangShots("release-lock-test", { fireMode: "auto", rpm: 600 }, 24), 1, "a real request gap must clear release lock");
FireScheduler.reset("release-lock-test");

for (const file of [...walk(join(root, "survival_guns_bp")), ...walk(join(root, "survival_guns_rp"))].filter((path) => path.endsWith(".json"))) {
  JSON.parse(read(file));
}

for (const gunName of ["m1911", "akm", "mp5", "m870"]) {
  const item = json(join(root, `survival_guns_bp/items/${gunName}.json`))["minecraft:item"].components;
  assert.equal(item["minecraft:use_modifiers"].use_duration, 3600, `${gunName} must expose a long hold-use state`);
  assert.equal(item["minecraft:food"].can_always_eat, true, `${gunName} must be usable at full hunger`);
  assert.equal(item["minecraft:icon"].textures.default, `survival:${gunName}`);
}

const fireController = read(join(root, "survival_guns_bp/animation_controllers/survival_firearms.controller.json"));
assert.ok(fireController.includes("q.is_using_item"), "fire must read the engine's explicit item-use boolean");
assert.ok(fireController.includes("!q.is_using_item"), "all fire states must stop on release");
assert.ok(!fireController.includes("main_hand_item_use_duration"), "use duration is not a reliable pressed-state signal");
for (const gunName of ["m1911", "akm", "mp5", "m870"]) {
  assert.ok(fireController.includes(`/scriptevent survival:fire ${gunName}`), `${gunName} fire event missing`);
}
assert.ok(!fireController.includes("query.has_tag"), "unsupported Molang query.has_tag must not return");

const mainSource = read(join(root, "survival_guns_bp/scripts/main.js"));
const controllerSource = read(join(root, "survival_guns_bp/scripts/guns/GunController.js"));
assert.ok(!mainSource.includes('subscribeAfterEvent("itemStartUse"'), "guns must not latch itemStartUse");
assert.ok(!mainSource.includes('subscribeAfterEvent("itemStopUse"'), "guns must not depend on itemStopUse");
assert.ok(mainSource.includes('id === "survival:fire"'));
assert.ok(!controllerSource.includes("autoFireDeadline"), "persistent automatic-fire deadline must be removed");
assert.ok(!controllerSource.includes("pressTrigger("), "Molang requests must not create a persistent JS trigger");

function ingredientCounts(recipe) {
  const shaped = recipe["minecraft:recipe_shaped"];
  const counts = new Map();
  for (const symbol of shaped.pattern.join("")) {
    if (symbol === " ") continue;
    const item = shaped.key[symbol].item;
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()];
}

const blueprintRegistry = Object.fromEntries(GunRegistry.getAllBlueprints().map((bp) => [bp.id, bp]));
for (const recipePath of walk(join(root, "survival_guns_bp/recipes")).filter((path) => path.endsWith(".json"))) {
  const recipe = json(recipePath);
  const body = recipe[Object.keys(recipe).find((key) => key.startsWith("minecraft:recipe_"))];
  assert.deepEqual(body.unlock, [{ context: "AlwaysUnlocked" }], `${recipePath} requires 1.20+ unlock data`);
}
for (const gunName of ["m1911", "akm", "mp5", "m870"]) {
  const recipe = json(join(root, `survival_guns_bp/recipes/blueprint_${gunName}.json`));
  assert.deepEqual(recipe["minecraft:recipe_shaped"].tags, ["crafting_table"]);
  assert.deepEqual(ingredientCounts(recipe), blueprintRegistry[`survival:blueprint_${gunName}`].synthesisRecipe.map(({ item, count }) => [item, count]));
  assert.ok(ingredientCounts(recipe).some(([item]) => item === "survival:paper_bundle"));

  const gunRecipe = json(join(root, `survival_guns_bp/recipes/gun_${gunName}.json`))["minecraft:recipe_shaped"];
  assert.deepEqual(gunRecipe.tags, ["crafting_table"]);
  assert.equal(gunRecipe.result.item, `survival:${gunName}`);
  assert.ok(Object.values(gunRecipe.key).some(({ item }) => item === `survival:blueprint_${gunName}`));
  assert.ok(Object.values(gunRecipe.key).some(({ item }) => item === "minecraft:iron_block"), `${gunName} must use iron blocks`);
}

const paperBundle = json(join(root, "survival_guns_bp/recipes/paper_bundle.json"))["minecraft:recipe_shaped"];
assert.deepEqual(paperBundle.pattern, ["PPP", "PPP", "PPP"]);
assert.equal(paperBundle.key.P.item, "minecraft:paper");
assert.equal(paperBundle.result.item, "survival:paper_bundle");

const rpFiles = walk(join(root, "survival_guns_rp"));
const disallowedVisual = rpFiles.filter((path) => path.includes("temporary_deadzone_assets") || path.includes("survival_guns_rp/animations/shoot/") || path.includes("survival_guns_rp/animations/reload/"));
assert.deepEqual(disallowedVisual, [], `DeadZone visual assets remain: ${disallowedVisual.join(", ")}`);
assert.ok(rpFiles.some((path) => path.includes("sounds/retained_audio/")), "approved retained audio is missing");

const geometryPath = join(root, "survival_guns_rp/models/entity/survival_firearms.geo.json");
const geometry = json(geometryPath);
assert.equal(geometry["minecraft:geometry"].length, 4);
for (const gunName of ["m1911", "akm", "mp5", "m870"]) {
  const model = geometry["minecraft:geometry"].find(({ description }) => description.identifier === `geometry.survival.${gunName}`);
  assert.ok(model, `${gunName} original geometry missing`);
  assert.ok(model.bones[0].binding.includes("query.item_slot_to_bone_name"));
  assert.ok(statSync(join(root, `survival_guns_rp/textures/entity/survival/${gunName}.png`)).size > 0);
  assert.ok(statSync(join(root, `survival_guns_rp/textures/items/${gunName}.png`)).size > 0);
  const attachable = json(join(root, `survival_guns_rp/attachables/survival_${gunName}.json`))["minecraft:attachable"].description;
  assert.equal(attachable.geometry.default, `geometry.survival.${gunName}`);
  assert.equal(attachable.textures.default, `textures/entity/survival/${gunName}`);
}

const bpManifest = json(join(root, "survival_guns_bp/manifest.json"));
const rpManifest = json(join(root, "survival_guns_rp/manifest.json"));
assert.deepEqual(bpManifest.header.version, [2, 0, 1]);
assert.deepEqual(rpManifest.header.version, [2, 0, 1]);

console.log("PASS: release-safe firing, recipe unlocks, original visuals, retained audio, manifests, scripts, and JSON validated");
