import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Faded Wasteland combined pack 0.4.7: visuals (0.3.6) + music (1.0.0).
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rp = join(root, "faded_wasteland_combined_rp");
const read = path => readFileSync(path, "utf8");
const json = path => JSON.parse(read(path));

function walkFiles(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walkFiles(path, out);
		else out.push(path);
	}
	return out;
}

// 1) manifest
const manifest = json(join(rp, "manifest.json"));
assert.deepEqual(manifest.header.version, [0, 4, 7], "combined version 0.4.7");
assert.deepEqual(manifest.modules[0].version, [0, 4, 7], "module version 0.4.7");
assert.equal(manifest.header.uuid, "61a15a41-271b-4326-86e3-e110db785760", "keeps the visual pack uuid");
assert.deepEqual(manifest.header.min_engine_version, [1, 26, 60]);
assert(manifest.capabilities?.includes("pbr"));
assert(manifest.header.name.includes("音乐") && manifest.header.name.includes("0.4.7"));
assert.equal(manifest.subpacks, undefined, "no selectable subpacks");

// 2) strict JSON parse across the merged tree
const files = walkFiles(rp);
for (const path of files.filter(path => path.endsWith(".json"))) {
	assert.doesNotThrow(() => JSON.parse(read(path)), `invalid JSON: ${path}`);
}

// 3) visuals contract: fixed darker preset with the latest noon cut
const lighting = json(join(rp, "lighting/global.json"))["minecraft:lighting_settings"];
const sun = lighting.directional_lights.orbital.sun;
assert.equal(sun.illuminance["0"], 900, "noon illuminance");
assert.equal(sun.illuminance["0.2"], 550, "midday illuminance");
assert.equal(sun.illuminance["0.25"], 540, "sunset key untouched");
assert.equal(sun.illuminance["0.5"], 0.6, "night key untouched");
const grading = json(join(rp, "color_grading/color_grading.json"))["minecraft:color_grading_settings"];
assert.equal(grading.tone_mapping.operator, "reinhard_luminance");
assert.deepEqual(grading.color_grading.midtones.gain, [0.66, 0.66, 0.65]);
assert.equal(existsSync(join(rp, "subpacks")), false, "no subpacks dir");

// 4) rain particles wired
assert(existsSync(join(rp, "particles/rain_splash_particle.particle.json")));
assert(existsSync(join(rp, "particles/rain/rain_ripple.particle.json")));
assert(existsSync(join(rp, "particles/rain/rain_fog.particle.json")));
assert(existsSync(join(rp, "textures/particle/rain_ripple.png")));
assert(existsSync(join(rp, "textures/environment/weather.png")));

// 5) shared visual assets
assert.equal(readdirSync(join(rp, "biomes")).filter(name => name.endsWith(".json")).length, 79);
assert.equal(readdirSync(join(rp, "fogs")).filter(name => name.endsWith(".json")).length, 67);
assert.equal(readdirSync(join(rp, "water")).filter(name => name.endsWith(".json")).length, 5);
assert(existsSync(join(rp, "local_lighting/local_lighting.json")));
assert(existsSync(join(rp, "shadows/global.json")));

// 6) music definitions + audio files
const definitions = json(join(rp, "sounds/sound_definitions.json"))["sound_definitions"];
assert.equal(definitions["music.game"].sounds.length, 4, "four overworld tracks");
assert.equal(definitions["music.menu"].sounds.length, 1, "one menu track");
for (const id of ["music.game", "music.menu"]) {
	for (const entry of definitions[id].sounds) {
		assert.equal(entry.stream, true);
		const ogg = join(rp, `${entry.name}.ogg`);
		assert(existsSync(ogg), `missing ogg: ${entry.name}`);
		assert(readFileSync(ogg).length > 50 * 1024, `${entry.name}.ogg too small`);
	}
}
const oggs = files.filter(path => path.endsWith(".ogg"));
assert.equal(oggs.length, 4, "exactly four ogg tracks in the merged pack");

// 7) scope: no scripts / models / entity overrides
for (const isolated of ["scripts", "models", "ui", "entity", "attachables"]) {
	assert.equal(existsSync(join(rp, isolated)), false, `must not add ${isolated}/`);
}

console.log("Faded Wasteland combined 0.4.7 validation passed (visuals 0.3.12 + music 1.0.4 wired together).");
