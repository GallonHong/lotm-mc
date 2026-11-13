import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Faded Wasteland Music Pack 1.0.5: replaces vanilla background music via music_definitions.json.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rp = join(root, "faded_wasteland_music_rp");
const read = path => readFileSync(path, "utf8");
const json = path => JSON.parse(read(path));

const manifest = json(join(rp, "manifest.json"));
assert.deepEqual(manifest.header.version, [1, 0, 5], "manifest version");
assert.deepEqual(manifest.modules[0].version, [1, 0, 5], "module version");
assert.equal(manifest.modules[0].type, "resources");
assert.deepEqual(manifest.header.min_engine_version, [1, 26, 10]);
assert(manifest.header.name.includes("音乐"), "pack name must mention music");
assert(manifest.header.name.includes("音乐包"), "name must mention the music pack");

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

// music_definitions.json must drive every biome to one of our events
const musicDefinitions = json(join(rp, "sounds/music_definitions.json"));
assert(musicDefinitions.game && musicDefinitions.menu && musicDefinitions.creative,
	"music_definitions must include game/menu/creative keys");
assert.equal(musicDefinitions.menu.event_name, "music.menu");
assert.equal(musicDefinitions.game.event_name, "music.game");
const knownEvents = new Set(Object.keys(definitions));
for (const [key, entry] of Object.entries(musicDefinitions)) {
	assert(knownEvents.has(entry.event_name), key + ": event " + entry.event_name + " is not defined");
	assert.equal(typeof entry.min_delay, "number");
	assert.equal(typeof entry.max_delay, "number");
}
assert(Object.keys(musicDefinitions).length >= 60, "music_definitions should cover all surface biomes");
assert.equal(musicDefinitions.game.min_delay, 1200, "default overworld min interval");
assert.equal(musicDefinitions.game.max_delay, 1800, "default overworld max interval");
assert.equal(musicDefinitions.menu.min_delay, 120, "menu min interval");
assert.equal(musicDefinitions.water.max_delay, 240, "water max interval");
const biomeSample = Object.entries(musicDefinitions).find(([key]) => key === "plains");
assert(biomeSample && biomeSample[1].min_delay === 600 && biomeSample[1].max_delay === 1200, "surface biome interval 10-20 min");
const usedEvents = new Set(Object.values(musicDefinitions).map(entry => entry.event_name));
assert(usedEvents.size >= 5, "biomes must be spread across several music events");
console.log("Faded Wasteland Music 1.0.5 validation passed (music_definitions biome mapping + all events defined).");
