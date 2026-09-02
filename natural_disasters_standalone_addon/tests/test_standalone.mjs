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

assert.deepEqual(bpManifest.header.version, [1, 3, 1]);
assert.deepEqual(rpManifest.header.version, [1, 3, 1]);
assert(bpManifest.dependencies.some(dep => dep.module_name === "@minecraft/server" && dep.version === "2.9.0"));
assert(bpManifest.dependencies.some(dep => dep.module_name === "@minecraft/server-ui" && dep.version === "2.0.0"));
const resourceDependency = bpManifest.dependencies.find(dep => dep.uuid);
assert.equal(resourceDependency?.uuid, rpManifest.header.uuid);
assert.deepEqual(resourceDependency?.version, rpManifest.header.version);

const main = read(path.join(bp, "scripts/main.js"));
for (const marker of ["openControllerMenu", "ActionFormData", "sando_standalone:menu", "sando_standalone:start", "sando_standalone:stop"]) assert(main.includes(marker), `missing standalone control: ${marker}`);
for (const marker of ["decodeSapiEnvelope", "resolveScriptEventPlayer", "__sapi_player__", "decodeURIComponent", "envelope.data.trim()"] ) assert(main.includes(marker), `missing direct SAPI menu bridge: ${marker}`);
for (const marker of ["STANDALONE_CONFIG", "chooseOccupiedAutoRegion", "automaticRegionForPlayer", "activeAutoRegion", "scheduledAutoRegion", "manualCenter", "scheduleAutoRegionRetry", "settings:v5"]) assert(main.includes(marker), `missing independent region control: ${marker}`);
const config = read(path.join(bp, "scripts/config.js"));
for (const marker of ["autoEnabled: true", "intervalMinutes", "law: Object.freeze({ min: 20, max: 40 })", "outlaw: Object.freeze({ min: 10, max: 20 })", "manualRadius: 96", "safe_zone_1", "safe_zone_2", "safe_zone_3", "law_zone_1", "law_zone_2", "3450", "3869", "1687", "2250"]) assert(config.includes(marker), `missing standalone region config: ${marker}`);
const disasterRegistry = main.slice(main.indexOf("const DISASTERS = ["), main.indexOf("const SCORE_OBJECTIVES"));
for (const disaster of ["tornado", "meteors", "lightning"]) assert(disasterRegistry.includes(disaster));
for (const removed of ["flood", "earthquake"]) assert(!disasterRegistry.includes(removed), `removed disaster remains registered: ${removed}`);
assert(!main.includes('.button("§9洪水")') && !main.includes('.button("§6地震")'), "removed disasters remain in standalone menu");
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
console.log("Natural Disasters Standalone v1.3.1 validation passed.");
