import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rp = path.join(root, "apocalypse_ui_rp");
const manifest = JSON.parse(fs.readFileSync(path.join(rp, "manifest.json"), "utf8"));
const ui = JSON.parse(fs.readFileSync(path.join(rp, "ui/apocalypse_server_form.json"), "utf8"));
const uiDefs = JSON.parse(fs.readFileSync(path.join(rp, "ui/_ui_defs.json"), "utf8"));

assert.equal(manifest.modules[0].type, "resources");
assert.equal(manifest.header.version.join("."), "1.0.2");
assert.deepEqual(uiDefs.ui_defs, ["ui/apocalypse_server_form.json"]);
assert.equal(fs.existsSync(path.join(rp, "ui/server_form.json")), false, "pack must never shadow vanilla/DDUI server_form.json by path");
assert.equal(ui.namespace, "server_form");
assert.ok(Array.isArray(ui.long_form?.modifications), "vanilla long_form must be modified incrementally");
assert.ok(Array.isArray(ui.main_screen_content?.modifications), "custom factory must be injected into the vanilla form root");
assert.equal(Object.hasOwn(ui, "custom_form"), false, "DDUI CustomForm must remain owned by vanilla server_form.json");
assert.equal(Object.hasOwn(ui, "modal_dialog"), false, "vanilla ModalForm must not be replaced");

const raw = JSON.stringify(ui);
assert.match(raw, /§l§2末日生存联盟§r/);
assert.match(raw, /server_form_factory/);
assert.match(raw, /server_form\.apoc_survival_form/);
for (let index = 0; index < 12; index++) {
  assert.match(raw, new RegExp(`"collection_index":${index}(?:[,}])`), `missing tile index ${index}`);
}

for (const texture of [
  "shop", "lottery", "home", "teleport", "land", "bank", "market",
  "more", "world_event", "extraction", "scrim", "highlight"
]) {
  assert.ok(fs.existsSync(path.join(rp, `textures/ui/apocalypse/${texture}.png`)), `missing texture ${texture}`);
}

console.log("Apocalypse Survival UI v1.0.2 validation passed.");
