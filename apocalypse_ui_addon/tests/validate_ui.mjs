import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rp = path.join(root, "apocalypse_ui_rp");
const manifest = JSON.parse(fs.readFileSync(path.join(rp, "manifest.json"), "utf8"));
const ui = JSON.parse(fs.readFileSync(path.join(rp, "ui/server_form.json"), "utf8"));

assert.equal(manifest.modules[0].type, "resources");
assert.equal(manifest.header.version.join("."), "1.0.0");
assert.equal(ui.namespace, "server_form");

const raw = JSON.stringify(ui);
assert.match(raw, /§l§2末日生存联盟§r/);
assert.match(raw, /server_form\.long_form_panel/);
for (let index = 0; index < 12; index++) {
  assert.match(raw, new RegExp(`"collection_index":${index}(?:[,}])`), `missing tile index ${index}`);
}

for (const texture of [
  "shop", "lottery", "home", "teleport", "land", "bank", "market",
  "more", "world_event", "extraction", "scrim", "highlight"
]) {
  assert.ok(fs.existsSync(path.join(rp, `textures/ui/apocalypse/${texture}.png`)), `missing texture ${texture}`);
}

console.log("Apocalypse Survival UI v1.0.0 validation passed.");
