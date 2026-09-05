import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "apocalypse_boss_bp");
const rp = join(root, "apocalypse_boss_rp");
const json = path => JSON.parse(readFileSync(path, "utf8"));
const bpManifest = json(join(bp, "manifest.json"));
const rpManifest = json(join(rp, "manifest.json"));
assert.deepEqual(bpManifest.header.version, [1, 3, 0]);
assert.deepEqual(rpManifest.header.version, [1, 3, 0]);
assert.deepEqual(bpManifest.dependencies.find(value => value.uuid === rpManifest.header.uuid)?.version, [1, 3, 0]);

const files = readdirSync(join(bp, "loot_tables/boss")).filter(name => name.endsWith(".json"));
assert.equal(files.length, 7);
for (const name of files) {
  const path = join(bp, "loot_tables/boss", name);
  const source = readFileSync(path, "utf8");
  const table = json(path);
  assert(Array.isArray(table.pools) && table.pools.length >= 3, `${name} loot is incomplete`);
  const blueprintPools = table.pools.filter(pool => (pool.entries || []).some(entry => entry.name?.startsWith("test_gun:blueprint_")));
  const chances = blueprintPools.flatMap(pool => pool.conditions || []).filter(value => value.condition === "random_chance").map(value => value.chance);
  assert(chances.length && chances.reduce((sum, value) => sum + value, 0) <= 0.02, `${name} Epic chance exceeds 2%`);
  for (const forbidden of ["blueprint_arc", "blueprint_mgl", "blueprint_mp7", "blueprint_ak47_commander", "blueprint_jetpack"]) assert.equal(source.includes(forbidden), false, `${name} drops a Legendary blueprint`);
}
assert.equal(readFileSync(join(bp, "loot_tables/boss/siren_head.json"), "utf8").includes('"chance": 0.02'), true);
console.log("Apocalypse Boss v1.3.0 loot validation passed.");
