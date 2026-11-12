import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Pose compatibility pack is the highest-priority player.entity.json override for the
// server/merged resource pack. It must keep the Test Guns script flags, otherwise
// first/third-person gun poses (including sneak-aim) stop updating on servers.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(path, "utf8");
const json = path => JSON.parse(read(path));

const manifest = json(join(root, "manifest.json"));
assert.deepEqual(manifest.header.version, [1, 1, 7], "pose compatibility version");
assert.deepEqual(manifest.modules[0].version, [1, 1, 7], "pose compatibility module version");

const entity = json(join(root, "entity", "player.entity.json"));
const description = entity["minecraft:client_entity"]?.description;
assert(description, "player.entity.json must define minecraft:client_entity");
assert.equal(description.identifier, "minecraft:player");
const scripts = description.scripts || {};
assert.equal(scripts.should_update_bones_and_effects_offscreen, "1.0",
	"server/off-screen bone updates must stay enabled for multiplayer gun poses");
for (const key of ["animate", "initialize", "pre_animation", "variables", "scale"]) {
	assert(scripts[key] !== undefined, `player.entity.json scripts.${key} missing`);
}
const animations = description.animations || {};
assert(animations["humanoid_base_pose"], "humanoid_base_pose mapping missing");
assert.equal(animations.root, "controller.animation.tg3d.player.root",
	"root animation must use the Test Guns 3D player controller (sneak-aim poses)");
assert(Object.keys(animations).length >= 70, "gun hold-state animation mappings must be preserved");
assert(read(join(root, "entity", "player.entity.json")).includes("query.is_alive"),
	"persona/UI guard (query.is_alive) must be preserved");

console.log("Pose compatibility validation passed (offscreen bone updates + hold states present).");
