import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "apocalypse_mobs_bp");
const rp = join(root, "apocalypse_mobs_rp");

function files(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function json(path) { return JSON.parse(readFileSync(path, "utf8")); }

for (const path of [...files(bp), ...files(rp)].filter(path => path.endsWith(".json"))) {
  assert.doesNotThrow(() => json(path), `invalid JSON: ${path}`);
}

const bpManifest = json(join(bp, "manifest.json"));
const rpManifest = json(join(rp, "manifest.json"));
assert.deepEqual(bpManifest.header.version, [0, 5, 0]);
assert.deepEqual(rpManifest.header.version, [0, 5, 0]);
assert.equal(bpManifest.dependencies.find(value => value.uuid)?.uuid, rpManifest.header.uuid, "BP must depend on its RP");
assert.equal(bpManifest.modules.find(value => value.type === "script")?.entry, "scripts/main.js");

const health = {
  infected_basic: 20,
  infected_runner: 30,
  infected_spitter: 50,
  infected_shrieker: 45,
  infected_charger: 70,
  infected_hunter: 60,
  infected_mutant: 100,
  infected_heavy: 200,
  infected_tyrant: 220,
  infected_broodmother: 500,
  raider_rifleman: 50
};
for (const [name, expected] of Object.entries(health)) {
  const entity = json(join(bp, "entities", `${name}.json`))["minecraft:entity"];
  assert.equal(entity.components["minecraft:health"].max, expected, `${name} HP mismatch`);
  assert(entity.components["minecraft:type_family"].family.includes("apoc_hostile"));
}

const combat = readFileSync(join(bp, "scripts/combatAI.js"), "utf8");
for (const effect of ["blindness", "darkness", "slowness", "weakness"]) assert(combat.includes(`\"${effect}\"`), `missing flash-shield effect: ${effect}`);
assert(combat.includes("burstInterval") && combat.includes("reloadTicks"), "raider must use burst and reload profile");
assert(combat.includes("hasLineOfSight"), "ranged AI must check cover/line of sight");
assert(combat.includes('new ItemStack("test_gun:ak47", 1)'), "raider must restore its Test Guns AK47");

const raider = json(join(bp, "entities", "raider_rifleman.json"))["minecraft:entity"];
assert(raider.components["minecraft:equippable"], "raider must expose a main-hand equipment slot");
assert.equal(
  json(join(bp, "loot_tables", "entities", "raider_rifleman_gear.json")).pools[0].entries[0].name,
  "test_gun:ak47",
  "raider equipment table must use the Test Guns AK47"
);
const raiderClient = json(join(rp, "entity", "raider_rifleman.entity.json"))["minecraft:client_entity"].description;
assert.equal(raiderClient.geometry.default, "geometry.apoc.infected", "raider must use the namespaced bundled humanoid geometry");
assert.equal(raiderClient.geometry.item_in_hand, undefined, "held-item rendering must not declare a fake entity geometry");
assert.equal(raiderClient.materials.item_in_hand, undefined, "held-item rendering must use the equipped item's attachable material");
assert.equal(raiderClient.enable_attachables, true, "raider must enable the Test Guns AK47 attachable");
assert(!raiderClient.render_controllers.includes("controller.render.item_in_hand"), "attachable must not be rendered through the entity geometry controller");

const infectedGeometry = json(join(rp, "models", "entity", "infected.geo.json"))["minecraft:geometry"];
assert(infectedGeometry.some(value => value.description.identifier === "geometry.apoc.infected"), "namespaced humanoid geometry missing");
const infectedBones = infectedGeometry.find(value => value.description.identifier === "geometry.apoc.infected").bones.map(value => value.name);
for (const bone of ["root", "body", "head", "leftArm", "rightArm", "leftLeg", "rightLeg"]) {
  assert(infectedBones.includes(bone), `armor-compatible infected bone missing: ${bone}`);
}
const infectedNames = ["infected_basic", "infected_runner", "infected_spitter", "infected_shrieker", "infected_charger", "infected_hunter", "infected_mutant", "infected_heavy", "infected_tyrant", "infected_broodmother"];
for (const name of infectedNames) {
  const server = json(join(bp, "entities", `${name}.json`))["minecraft:entity"];
  assert.deepEqual(server.description.properties["apoc:appearance"].range, [0, 7], `${name} appearance property missing`);
  const client = json(join(rp, "entity", `${name}.entity.json`))["minecraft:client_entity"].description;
  assert.equal(client.geometry.default, "geometry.apoc.infected", `${name} must use the namespaced geometry`);
  assert.equal(client.enable_attachables, true, `${name} must render equipped armor attachables`);
  assert(client.render_controllers.includes("controller.render.apoc.infected_variants"), `${name} variant render controller missing`);
  for (let index = 0; index < 8; index++) assert(client.textures[`appearance_${index}`], `${name} appearance_${index} missing`);
}
for (const name of ["infected_spitter", "infected_shrieker", "infected_charger", "infected_hunter", "infected_tyrant", "infected_broodmother"]) {
  const client = json(join(rp, "entity", `${name}.entity.json`))["minecraft:client_entity"].description;
  assert.equal(client.geometry.default, "geometry.apoc.infected", `${name} must use the proven namespaced humanoid geometry`);
  assert.equal(client.spawn_egg.texture, "spawn_egg_zombie", `${name} must use a visible vanilla spawn egg icon`);
  assert.equal(client.enable_attachables, true, `${name} must render equipped armor attachables`);
}
const variantController = json(join(rp, "render_controllers", "infected_variants.render_controllers.json")).render_controllers["controller.render.apoc.infected_variants"];
assert(variantController.textures[0].includes("apoc:appearance"), "variant controller must use the synchronized appearance property");
for (let index = 0; index < 8; index++) {
  assert(existsSync(join(rp, "textures", "entity", "deadzone_variants", `infected_${index}.png`)), `Deadzone appearance texture ${index} missing`);
}
const ranzieGeometry = json(join(rp, "models", "entity", "ranzie", "infected_special.geo.json"))["minecraft:geometry"];
assert(ranzieGeometry.some(value => value.description.identifier === "geometry.apoc.ranzie_infected"), "Ranzie geometry namespace isolation missing");
assert.equal(json(join(bp, "entities", "infected_tyrant.json"))["minecraft:entity"].components["minecraft:boss"].name, "重装暴君");
assert.equal(json(join(bp, "entities", "infected_broodmother.json"))["minecraft:entity"].components["minecraft:boss"].name, "召唤母体");
const zh = readFileSync(join(rp, "texts", "zh_CN.lang"), "utf8");
for (const name of ["infected_spitter", "infected_shrieker", "infected_charger", "infected_hunter", "infected_tyrant", "infected_broodmother"]) {
  assert(zh.includes(`entity.apoc:${name}.name=`), `missing localized entity name for ${name}`);
  assert(zh.includes(`item.spawn_egg.entity.apoc:${name}.name=`), `missing localized spawn egg name for ${name}`);
}

const zones = readFileSync(join(bp, "scripts/zones.js"), "utf8");
assert(zones.includes("sapiRegionsKey") && zones.includes("allowHostileSpawn"), "SAPI safe-zone compatibility missing");
for (const marker of ["apoc_zone_safe_1", "2349", "2635", "1863", "2069"]) assert(zones.includes(marker), `missing built-in safe-zone marker: ${marker}`);
assert(zones.includes('type: "outlaw", name: "非法制荒原"'), "unassigned locations must default to outlaw");
const spawnDirector = readFileSync(join(bp, "scripts/spawnDirector.js"), "utf8");
assert(spawnDirector.includes('typeof entity.isValid === "function"') && spawnDirector.includes("const dimensionId = entity.dimension.id"), "spawn listener must validate entities before reading dimension");
for (const marker of ["health_boost", "EquipmentSlot", "ARMOR_POOLS", "apoc_zone_${zoneType}", "registerSpawnConfiguration", "apoc:appearance", "VANILLA_ARMOR_FALLBACKS", "equippedPieces"]) assert(spawnDirector.includes(marker), `missing regional spawn configuration: ${marker}`);
const config = readFileSync(join(bp, "scripts/config.js"), "utf8");
for (const marker of ["ZONE_DIFFICULTY", "armorChance", "test_gun:armor_titan_chest", "broodmother", "tyrant"]) assert(config.includes(marker), `missing regional balance config: ${marker}`);
const special = readFileSync(join(bp, "scripts/specialInfectedAI.js"), "utf8");
for (const marker of ["tickShrieker", "tickCharger", "tickHunter", "tickTyrant", "tickBroodmother", "isFlashDisabled", "builderMaxBlocksPerMob", 'zone.type !== "outlaw"']) assert(special.includes(marker), `missing special infected behavior: ${marker}`);
const loot = readFileSync(join(bp, "scripts/loot.js"), "utf8");
assert(loot.includes('getObjective("money")'), "SAPI economy reward bridge missing");

const main = readFileSync(join(bp, "scripts/main.js"), "utf8");
for (const moduleName of ["SpawnDirector", "CombatAI", "SpecialInfectedAI", "LootManager", "WorldEventDirector", "AdminMenu"]) assert(main.includes(moduleName));

console.log("Apocalypse Mobs validation passed.");
