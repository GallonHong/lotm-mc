import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bp = path.join(root, "Natural Disasters Survival Challenge  BP");
const rp = path.join(root, "Natural Disasters Survival Challenge  RP");
const read = file => fs.readFileSync(file, "utf8");
const json = file => JSON.parse(read(file));

const bpManifest = json(path.join(bp, "manifest.json"));
const rpManifest = json(path.join(rp, "manifest.json"));
assert.deepEqual(bpManifest.header.version, [2, 1, 0]);
assert.deepEqual(rpManifest.header.version, [2, 1, 0]);
assert(bpManifest.dependencies.some(dep => dep.module_name === "@minecraft/server" && dep.version === "2.9.0"));
assert(!rpManifest.capabilities?.includes("pbr"), "disaster resources must not request PBR/enhanced rendering globally");

const main = read(path.join(bp, "scripts/main.js"));
for (const marker of [
  "sando:settings:v2", "sando:state:v2", "interop:natural_disasters_heartbeat",
  "autoEnabled", "extractionEnabled", "protectSafeZones", "blockDamage",
  "sando:control", "weightedDisaster", "participantsFor", "apoc_extract:city",
  "interop:natural_disasters_request:v1", "interop:natural_disasters_ack:v1",
  "scriptEventContext", "consumeControlRequest", "__sapi_player__",
  "manualOrigin", "manualSafeZoneBypass", "normalizeOrigin", "locationTargets",
  "payload.origin", "payload.bypassSafeZone === true"
]) assert(main.includes(marker), `missing disaster integration marker: ${marker}`);
for (const disaster of ["tornado", "meteors", "flood", "lightning", "earthquake"]) assert(main.includes(disaster));
assert(!main.includes("give @s sando:disaster_controller"), "players must not receive a global disaster controller");
assert(main.includes("settings.blockDamage && !isSafeArea"), "block damage must be guarded by settings and safe zones");

for (const directory of [bp, rp]) {
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(file);
      else if (file.endsWith(".json")) assert.doesNotThrow(() => json(file), `invalid JSON: ${file}`);
    }
  }
}

console.log("Natural Disasters Server Events v2.1.0 validation passed.");
