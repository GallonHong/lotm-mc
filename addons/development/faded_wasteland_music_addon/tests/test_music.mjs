import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Faded Wasteland Music Pack 1.0.0: replaces vanilla overworld/menu music.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rp = join(root, "faded_wasteland_music_rp");
const read = path => readFileSync(path, "utf8");
const json = path => JSON.parse(read(path));

const manifest = json(join(rp, "manifest.json"));
assert.deepEqual(manifest.header.version, [1, 0, 1], "manifest version");
assert.deepEqual(manifest.modules[0].version, [1, 0, 1], "module version");
assert.equal(manifest.modules[0].type, "resources");
assert.deepEqual(manifest.header.min_engine_version, [1, 26, 10]);
assert(manifest.header.name.includes("音乐"), "pack name must mention music");
assert(manifest.header.name.includes("全部"), "name must mention full-slot replacement");

const definitions = json(join(rp, "sounds/sound_definitions.json"))["sound_definitions"];
for (const id of ["music.game", "music.menu"]) {
	assert(definitions[id], `missing sound definition: ${id}`);
	assert.equal(definitions[id].category, "music", `${id}: must use the music category`);
	assert.equal(definitions[id].sounds.length >= 1, true, `${id}: needs at least one sound`);
}
assert.equal(definitions["music.game"].sounds.length, 4, "four overworld background tracks");

const tracks = new Set();
for (const id of ["music.game", "music.menu"]) {
	for (const entry of definitions[id].sounds) {
		assert.equal(entry.stream, true, `${entry.name}: long tracks must be streamed`);
		assert(entry.volume > 0 && entry.volume <= 1, `${entry.name}: volume out of range`);
		const path = join(rp, `${entry.name}.ogg`);
		assert(existsSync(path), `missing ogg: ${entry.name}.ogg`);
		assert(readFileSync(path).length > 50 * 1024, `${entry.name}.ogg looks too small`);
		tracks.add(entry.name);
	}
}
assert(tracks.size >= 4, "all four supplied tracks should be wired");

for (const isolated of ["textures", "scripts", "ui", "models", "particles", "entity", "attachables", "biomes"]) {
	assert.equal(existsSync(join(rp, isolated)), false, `music pack must not add ${isolated}/`);
}

console.log("Faded Wasteland Music 1.0.1 validation passed (music.game + music.menu wired to 4 tracks).");
