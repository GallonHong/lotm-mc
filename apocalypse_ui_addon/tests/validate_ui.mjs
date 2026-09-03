import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rp = path.join(root, "apocalypse_ui_rp");
const manifest = JSON.parse(fs.readFileSync(path.join(rp, "manifest.json"), "utf8"));
const ui = JSON.parse(fs.readFileSync(path.join(rp, "ui/server_form.json"), "utf8"));
const uiDefs = JSON.parse(fs.readFileSync(path.join(rp, "ui/_ui_defs.json"), "utf8"));

assert.equal(manifest.modules[0].type, "resources");
assert.equal(manifest.header.version.join("."), "1.1.0");
assert.deepEqual(uiDefs.ui_defs, ["ui/server_form.json"]);
assert.equal(fs.existsSync(path.join(rp, "ui/server_form.json")), true, "server_form.json must exist in ui directory");
assert.equal(ui.namespace, "server_form");

// Verify that custom_form and related controls exist so modal inputs/dropdowns never break
assert.ok(ui["custom_form@common_dialogs.main_panel_no_buttons"] || ui.custom_form, "custom_form must be preserved for ModalFormData");
assert.ok(ui.custom_input || ui["custom_input@settings_common.option_text_edit"], "custom_input must be preserved");
assert.ok(ui.custom_dropdown, "custom_dropdown must be preserved");

// Verify long_form dual branch
assert.ok(Array.isArray(ui.long_form?.controls), "long_form must contain controls for dual branch");
const longFormRaw = JSON.stringify(ui.long_form);
assert.match(longFormRaw, /default_long_form/);
assert.match(longFormRaw, /apoc_survival_form/);

// Verify title gate and 13 tiles (social is a first-level entry)
const raw = JSON.stringify(ui);
assert.match(raw, /§l§2幸存者联盟§r/);
assert.match(raw, /§l§2快乐101·贸易联盟§r/);
assert.match(raw, /§l§2末日生存联盟§r/);
assert.doesNotMatch(raw, /"ignored":\s*true/, "no tile art or labels should be ignored");

for (let index = 0; index < 13; index++) {
  assert.match(raw, new RegExp(`"collection_index":\\s*${index}(?:[,}])`), `missing tile index ${index}`);
}
assert.match(raw, /textures\/ui\/FriendsIcon/);
assert.match(raw, /社交 · 好友 · 队伍 · 公会/);

for (const texture of [
  "shop", "lottery", "home", "teleport", "land", "bank", "market",
  "more", "world_event", "extraction", "scrim", "highlight", "welfare", "dungeon"
]) {
  assert.ok(fs.existsSync(path.join(rp, `textures/ui/apocalypse/${texture}.png`)), `missing texture ${texture}`);
}

console.log("Apocalypse Survival UI v1.1.0 validation passed.");
