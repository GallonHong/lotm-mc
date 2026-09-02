import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
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
assert.equal(bpManifest.dependencies.find(value => value.uuid)?.uuid, rpManifest.header.uuid, "BP must depend on its RP");
assert.equal(bpManifest.modules.find(value => value.type === "script")?.entry, "scripts/main.js");

const health = {
  infected_basic: 20,
  infected_spitter: 50,
  infected_mutant: 100,
  infected_heavy: 200,
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

const zones = readFileSync(join(bp, "scripts/zones.js"), "utf8");
assert(zones.includes("sapiRegionsKey") && zones.includes("allowHostileSpawn"), "SAPI safe-zone compatibility missing");
const loot = readFileSync(join(bp, "scripts/loot.js"), "utf8");
assert(loot.includes('getObjective("money")'), "SAPI economy reward bridge missing");

const main = readFileSync(join(bp, "scripts/main.js"), "utf8");
for (const moduleName of ["SpawnDirector", "CombatAI", "LootManager", "WorldEventDirector", "AdminMenu"]) assert(main.includes(moduleName));

console.log("Apocalypse Mobs validation passed.");

