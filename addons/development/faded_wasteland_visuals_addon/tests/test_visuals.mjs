import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Faded Wasteland Visuals 0.3.0: multi-brightness subpacks (early LifeAfter daylight).
// Static validation only; real GPU/visual verification needs an in-game Vibrant Visuals pass.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rp = join(root, "faded_wasteland_visuals_rp");
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

const files = walkFiles(rp);
const relative = path => path.slice(rp.length + 1).replaceAll("\\", "/");

// 1) manifest + selectable subpacks
const manifest = json(join(rp, "manifest.json"));
assert.deepEqual(manifest.header.version, [0, 3, 0], "manifest version must be 0.3.0");
assert.deepEqual(manifest.modules[0].version, [0, 3, 0], "module version must be 0.3.0");
assert.equal(manifest.header.uuid, "61a15a41-271b-4326-86e3-e110db785760", "uuid must stay stable for updates");
assert.deepEqual(manifest.header.min_engine_version, [1, 26, 60]);
assert(manifest.capabilities?.includes("pbr"), "pbr capability required for vibrant visuals");
assert(manifest.header.name.includes("0.3.0"), "display name must mention 0.3.0");
const subpacks = manifest.subpacks || [];
assert.deepEqual(subpacks.map(entry => entry.folder_name), ["1", "2", "3", "4"], "four selectable brightness presets");
assert(subpacks[0].name.includes("偏暗"), "dimmer preset is the recommended default");
assert(subpacks[3].name.includes("诊断"), "darkest preset is the diagnostic preset");

// 2) every JSON file parses strictly
const jsonFiles = files.filter(path => path.endsWith(".json"));
for (const path of jsonFiles) assert.doesNotThrow(() => JSON.parse(read(path)), `invalid JSON: ${relative(path)}`);
assert(jsonFiles.length >= 150, "expected the full visual pack JSON set");

// 3) per-biome lighting/atmospherics/grading lives only inside subpacks
for (const isolated of ["lighting", "atmospherics", "color_grading"]) {
	assert.equal(existsSync(join(rp, isolated)), false, `${isolated}/ must move into subpacks (no root override)`);
}
const EXPECTED = {
	"1": { noon: 24000, sunrise: 3500, sky: 0.28, gain: 0.86, ambient: 0.04 },
	"2": { noon: 42000, sunrise: 6500, sky: 0.40, gain: 0.92, ambient: 0.055 },
	"3": { noon: 12000, sunrise: 1800, sky: 0.20, gain: 0.80, ambient: 0.03 },
	"4": { noon: 3000, sunrise: 400, sky: 0.10, gain: 0.55, ambient: 0.02 },
};
for (const [folder, expected] of Object.entries(EXPECTED)) {
	const base = join(rp, "subpacks", folder);
	const presetFiles = walkFiles(base);
	assert.equal(presetFiles.filter(path => path.endsWith(".json")).length, 3, `subpack ${folder}: expected 3 config files`);
	const lighting = json(join(base, "lighting/global.json"))["minecraft:lighting_settings"];
	const sun = lighting.directional_lights.orbital.sun;
	assert.equal(sun.illuminance["0"], expected.noon, `subpack ${folder}: noon illuminance`);
	assert.equal(sun.illuminance["0.25"], expected.sunrise, `subpack ${folder}: sunrise illuminance`);
	assert.equal(lighting.sky.intensity, expected.sky, `subpack ${folder}: sky intensity`);
	assert.equal(lighting.ambient.illuminance["0"], expected.ambient, `subpack ${folder}: ambient fill`);
	assert.equal(lighting.description.identifier, "faded_wasteland:lighting");
	assert.equal(lighting.emissive?.desaturation, 0.1);
	const atmos = json(join(base, "atmospherics/atmospherics.json"))["minecraft:atmosphere_settings"];
	assert.equal(atmos.description.identifier, "faded_wasteland:atmosphere");
	assert(atmos.rayleigh_strength && atmos.sun_mie_strength && atmos.sky_zenith_color && atmos.sky_horizon_color);
	const gradingDoc = json(join(base, "color_grading/color_grading.json"))["minecraft:color_grading_settings"];
	assert.equal(gradingDoc.description.identifier, "faded_wasteland:grading");
	assert.equal(gradingDoc.tone_mapping.operator, "reinhard_luminance", `subpack ${folder}: highlight rolloff`);
	const grading = gradingDoc.color_grading;
	assert.equal(grading.midtones.gain[0], expected.gain, `subpack ${folder}: post-tonemap gain (auto-exposure proof darkening)`);
	assert(grading.temperature.enabled, `subpack ${folder}: white balance enabled`);
	assert(grading.temperature.temperature >= 6000 && grading.temperature.temperature <= 7000);
	assert(grading.shadows.enabled && grading.highlights.enabled);
	assert.equal(grading.highlights.highlightsMin, 2.0);
	assert.equal(grading.shadows.shadowsMax, 0.35);
}

// 4) fogs: tinted absorbing haze (shared across presets)
const fogDir = join(rp, "fogs");
const fogFiles = readdirSync(fogDir).filter(name => name.endsWith(".json"));
assert.equal(fogFiles.length, 67, "67 surface fog definitions");
const fogIds = new Set();
for (const name of fogFiles) {
	const settings = json(join(fogDir, name))["minecraft:fog_settings"];
	fogIds.add(settings.description.identifier);
	assert(settings.volumetric?.media_coefficients?.air?.absorption.some(value => value > 0),
		`${name}: haze must absorb light (scattering-only fog turns white)`);
}
const defaultFog = json(join(fogDir, "fog_default.json"))["minecraft:fog_settings"];
assert.equal(defaultFog.distance.air.fog_start, 0.72);
assert.equal(defaultFog.distance.air.fog_color, "#A3A79B");
assert.equal(defaultFog.distance.weather.fog_color, "#7A7B73");
assert.equal(defaultFog.volumetric.density.air.max_density, 0.0035);
assert.equal(json(join(fogDir, "fog_desert.json"))["minecraft:fog_settings"].distance.air.fog_color, "#B9AC96");

// 5) shared water / local lighting / shadows / biomes
const WATER_IDS = ["water", "desert_water", "snowy_water", "swamp_water", "pale_water"];
const waterDefs = new Set();
for (const id of WATER_IDS) {
	const settings = json(join(rp, "water", `${id}.json`))["minecraft:water_settings"];
	assert.equal(settings.description.identifier, `faded_wasteland:${id}`);
	assert.equal(settings.caustics.texture, "textures/caustic/caustics.png");
	assert(existsSync(join(rp, settings.caustics.texture)));
	waterDefs.add(settings.description.identifier);
}
const biomes = readdirSync(join(rp, "biomes")).filter(name => name.endsWith(".json"));
assert.equal(biomes.length, 79, "all 79 vanilla overground biomes stay bound");
for (const name of biomes) {
	const biome = json(join(rp, "biomes", name))["minecraft:client_biome"];
	const components = biome.components;
	assert.equal(components["minecraft:lighting_identifier"].lighting_identifier, "faded_wasteland:lighting");
	assert.equal(components["minecraft:atmosphere_identifier"].atmosphere_identifier, "faded_wasteland:atmosphere");
	assert.equal(components["minecraft:color_grading_identifier"].color_grading_identifier, "faded_wasteland:grading");
	assert(fogIds.has(components["minecraft:fog_appearance"].fog_identifier), `${name}: fog id missing`);
	assert(waterDefs.has(components["minecraft:water_identifier"]?.water_identifier), `${name}: water id missing`);
}
const local = json(join(rp, "local_lighting/local_lighting.json"))["minecraft:local_light_settings"];
assert.equal(local["minecraft:torch"].light_color, "#FF8E42");
assert.equal(local["minecraft:campfire"].light_color, "#FF6B2B");
assert.equal(local["minecraft:soul_lantern"].light_color, "#3FB6C4");
const shadows = json(join(rp, "shadows/global.json"))["minecraft:shadow_settings"];
assert.equal(shadows.shadow_style, "soft_shadows");

// 6) only water/light related textures (no ore PBR overrides), no scripts/models
const allowedTextures = new Set([
	"textures/caustic/caustics.png",
	"textures/blocks/water_still_grey.png",
	"textures/blocks/water_still_grey.texture_set.json",
	"textures/terrain_texture.json",
]);
for (const path of files.map(relative).filter(path => path.startsWith("textures/"))) {
	assert(allowedTextures.has(path), `unexpected texture override: ${path}`);
}
for (const isolated of ["models", "sounds", "ui", "particles", "attachables", "entity"]) {
	assert.equal(existsSync(join(rp, isolated)), false, `must not add ${isolated}/ overrides`);
}

// 7) docs mention the presets and the diagnostic path
const inPackReadme = read(join(rp, "README_zh_CN.txt"));
assert(inPackReadme.includes("0.3.0") && inPackReadme.includes("诊断"), "in-pack readme must document subpacks + diagnostic preset");
assert(inPackReadme.includes("未"), "in-pack readme must stay honest about in-game verification");

console.log("Faded Wasteland Visuals 0.3.0 validation passed (4 selectable brightness presets + diagnostic; shared assets intact).");
