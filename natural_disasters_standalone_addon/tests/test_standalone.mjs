import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bp = path.join(root, "standalone_disasters_bp");
const rp = path.join(root, "standalone_disasters_rp");
const read = file => fs.readFileSync(file, "utf8");
const json = file => JSON.parse(read(file));
const bpManifest = json(path.join(bp, "manifest.json"));
const rpManifest = json(path.join(rp, "manifest.json"));

assert.deepEqual(bpManifest.header.version, [1, 0, 1]);
assert.deepEqual(rpManifest.header.version, [1, 0, 1]);
assert(bpManifest.dependencies.some(dep => dep.module_name === "@minecraft/server" && dep.version === "2.9.0"));
assert(bpManifest.dependencies.some(dep => dep.module_name === "@minecraft/server-ui" && dep.version === "2.0.0"));
const resourceDependency = bpManifest.dependencies.find(dep => dep.uuid);
assert.equal(resourceDependency?.uuid, rpManifest.header.uuid);
assert.deepEqual(resourceDependency?.version, rpManifest.header.version);

const main = read(path.join(bp, "scripts/main.js"));
for (const marker of ["openControllerMenu", "ActionFormData", "autoEnabled: true", "sando_standalone:menu", "sando_standalone:start", "sando_standalone:stop"]) assert(main.includes(marker), `missing standalone control: ${marker}`);
for (const marker of ['protectSafeZones: false', 'const playersIn = id', 'return playersIn(id)', 'settings:v3']) assert(main.includes(marker), `missing direct target fix: ${marker}`);
for (const disaster of ["tornado", "meteors", "flood", "lightning", "earthquake"]) assert(main.includes(disaster));
for (const forbidden of ["sapi:server", "apoc_extract:city", "interop:natural_disasters_request", "consumeControlRequest"]) assert(!main.includes(forbidden), `standalone pack still references integration: ${forbidden}`);

for (const directory of [bp, rp]) {
  const queue = [directory];
  while (queue.length) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(file);
      else if (file.endsWith(".json")) assert.doesNotThrow(() => json(file), `invalid JSON: ${file}`);
    }
  }
}
console.log("Natural Disasters Standalone v1.0.1 validation passed.");
