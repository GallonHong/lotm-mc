import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Faded Wasteland Visuals 0.3.13: sky layering + softer haze / clearer water test build.
// Static validation only; real GPU/visual verification needs an in-game Vibrant Visuals pass.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rp = join(root, "faded_wasteland_visuals_rp");
const read = path => readFileSync(path, "utf8");
const json = path => JSON.parse(read(path));
const near = (actual, expected, label, epsilon = 1e-6) =>
	assert(Math.abs(actual - expected) <= epsilon, `${label}: expected ${expected}, got ${actual}`);

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

// 1) manifest: single fixed preset, no subpacks
const manifest = json(join(rp, "manifest.json"));
assert.deepEqual(manifest.header.version, [0, 3, 13], "manifest version must be 0.3.13");
assert.deepEqual(manifest.modules[0].version, [0, 3, 13], "module version must be 0.3.13");
assert.equal(manifest.header.uuid, "61a15a41-271b-4326-86e3-e110db785760", "uuid stays stable");
assert.deepEqual(manifest.header.min_engine_version, [1, 26, 60]);
assert(manifest.capabilities?.includes("pbr"));
assert(manifest.header.name.includes("0.3.13"), "display name must mention 0.3.13");
assert.equal(manifest.subpacks, undefined, "single fixed look: no selectable subpacks");
assert.equal(existsSync(join(rp, "subpacks")), false, "subpacks directory must be gone");

// 2) strict JSON parse
const jsonFiles = files.filter(path => path.endsWith(".json"));
for (const path of jsonFiles) assert.doesNotThrow(() => JSON.parse(read(path)), `invalid JSON: ${relative(path)}`);

// 3) single fixed lighting/atmospherics/grading contract (noon cut vs 0.3.5)
const lighting = json(join(rp, "lighting/global.json"))["minecraft:lighting_settings"];
const sun = lighting.directional_lights.orbital.sun;
assert.equal(sun.illuminance["0"], 900, "noon illuminance cut to 900");
assert.equal(sun.illuminance["1"], 900, "noon wrap key");
assert.equal(sun.illuminance["0.2"], 550, "late morning/afternoon cut");
assert.equal(sun.illuminance["0.8"], 550, "late morning/afternoon cut");
assert.equal(sun.illuminance["0.25"], 540, "sunset key must stay untouched");
assert.equal(sun.illuminance["0.5"], 0.6, "night sun key must stay untouched");
assert.equal(sun.color["0"], "#E6D8C6", "noon sun color dimmed");
assert.equal(sun.color["0.25"], "#FFC98F", "sunset sun color must stay untouched");
assert.equal(lighting.directional_lights.orbital.moon.illuminance, 0.22, "moon stays untouched");
assert.equal(lighting.ambient.illuminance["0"], 0.016, "noon ambient cut");
assert.equal(lighting.ambient.illuminance["0.25"], 0.02, "sunset ambient untouched");
assert.equal(lighting.sky.intensity, 0.1);
assert.equal(lighting.emissive?.desaturation, 0.1);

const atmos = json(join(rp, "atmospherics/atmospherics.json"))["minecraft:atmosphere_settings"];
assert.deepEqual(atmos.sky_zenith_color["0"], [31, 49, 68], "natural blue-gray noon zenith");
assert.deepEqual(atmos.sky_horizon_color["0"], [64, 79, 89], "clearer noon horizon");
assert.deepEqual(atmos.sky_horizon_color["0.25"], [115, 94, 78], "sunset horizon untouched");
near(atmos.rayleigh_strength["0.000000"], 1.287, "noon rayleigh reduced");
near(atmos.rayleigh_strength["0.250000"], 1.1, "sunset rayleigh untouched");
near(atmos.sun_mie_strength["0.250000"], 0.125, "mie untouched");

const gradingDoc = json(join(rp, "color_grading/color_grading.json"))["minecraft:color_grading_settings"];
assert.equal(gradingDoc.tone_mapping.operator, "reinhard_luminance");
const grading = gradingDoc.color_grading;
assert.deepEqual(grading.midtones.gain, [0.66, 0.66, 0.65], "post-tonemap gain stays the darker level");
assert.deepEqual(grading.midtones.saturation, [0.80, 0.80, 0.80], "natural desaturation (0.3.13)");
assert.deepEqual(grading.highlights.gain, [0.63, 0.63, 0.63], "neutral highlight gain (0.3.13)");
assert.equal(grading.highlights.highlightsMin, 1.8, "highlight threshold (0.3.13)");
assert.deepEqual(grading.highlights.saturation, [0.82, 0.82, 0.82], "highlight saturation (0.3.13)");
assert.deepEqual(grading.midtones.offset, [-0.022, -0.020, -0.017]);
assert.equal(grading.temperature.temperature, 6450);
assert(grading.temperature.enabled && grading.shadows.enabled && grading.highlights.enabled);

// 4) rain particles replaced (dark fantasy rain system, identifiers preserved)
const splash = json(join(rp, "particles/rain_splash_particle.particle.json"))["particle_effect"];
assert.equal(splash.description.identifier, "minecraft:rain_splash_particle", "vanilla rain splash identifier");
assert.equal(splash.description.basic_render_parameters.texture, "textures/particle/particles");
assert.deepEqual(Object.keys(splash.events), ["drp:rain"], "leaf events stripped, rain ripple/fog kept");
for (const name of ["rain/rain_ripple", "rain/rain_puddle", "rain/rain_fog", "rain/ripple", "rain/water_splash_particle_manual"]) {
	const effect = json(join(rp, `particles/${name}.particle.json`))["particle_effect"];
	assert(effect.description.identifier.startsWith("drp:") || effect.description.identifier.startsWith("minecraft:"), `${name}: identifier`);
	const texture = effect.description.basic_render_parameters.texture;
	assert(existsSync(join(rp, `${texture}.png`)), `${name}: texture missing (${texture}.png)`);
}
for (const texture of ["rain_fog", "rain_puddle", "rain_ripple", "particles", "dot"]) {
	assert(existsSync(join(rp, `textures/particle/${texture}.png`)), `rain texture missing: ${texture}`);
}
assert(existsSync(join(rp, "textures/environment/weather.png")), "weather overlay texture missing");

// 5) fogs from the 0.3.1 base: tinted absorbing haze
const fogDir = join(rp, "fogs");
const fogFiles = readdirSync(fogDir).filter(name => name.endsWith(".json"));
assert.equal(fogFiles.length, 67);
const fogIds = new Set();
for (const name of fogFiles) {
	const settings = json(join(fogDir, name))["minecraft:fog_settings"];
	fogIds.add(settings.description.identifier);
	assert(settings.volumetric?.media_coefficients?.air?.absorption.some(value => value > 0),
		`${name}: haze must absorb light`);
}
const defaultFog = json(join(fogDir, "fog_default.json"))["minecraft:fog_settings"];
assert.equal(defaultFog.distance.air.fog_start, 0.78, "haze moved back (0.3.13)");
assert.equal(defaultFog.distance.weather.fog_start, 0.3, "weather haze start (0.3.13)");
assert.equal(defaultFog.distance.weather.fog_end, 0.8, "weather haze end (0.3.13)");
assert.equal(defaultFog.volumetric.density.weather.max_density, 0.0105, "weather haze density (0.3.13)");
assert.equal(defaultFog.distance.air.fog_color, "#A4A7A8");
assert.equal(defaultFog.distance.water.fog_color, "#3E6156");
assert.equal(defaultFog.volumetric.density.air.max_density, 0.0036, "clearer haze density (0.3.13)");
assert.equal(defaultFog.volumetric.henyey_greenstein_g.air.henyey_greenstein_g, 0.65, "softer forward scattering (0.3.13)");

// 6) shared water / lights / shadows / biomes
const WATER_IDS = ["water", "desert_water", "snowy_water", "swamp_water", "pale_water"];
const waterDefs = new Set();
for (const id of WATER_IDS) {
	const settings = json(join(rp, "water", `${id}.json`))["minecraft:water_settings"];
	assert.equal(settings.description.identifier, `faded_wasteland:${id}`);
	assert.equal(settings.caustics.texture, "textures/caustic/caustics.png");
	assert(existsSync(join(rp, settings.caustics.texture)));
	assert.equal(settings.caustics.power, 1, `${id}: caustics power must be the schema integer 1`);
	assert.equal(settings.caustics.frame_length, 0.05);
	assert.equal(settings.caustics.scale, 0.12);
	waterDefs.add(settings.description.identifier);
}
const biomes = readdirSync(join(rp, "biomes")).filter(name => name.endsWith(".json"));
assert.equal(biomes.length, 79);
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
assert.equal(local["minecraft:soul_lantern"].light_color, "#3FB6C4");
assert.equal(json(join(rp, "shadows/global.json"))["minecraft:shadow_settings"].shadow_style, "soft_shadows");

// 7) scope: only water/caustic/rain related textures, no scripts/models/sounds
const allowedTextures = new Set([
	"textures/caustic/caustics.png",
	"textures/blocks/water_still_grey.png",
	"textures/blocks/water_still_grey.texture_set.json",
	"textures/terrain_texture.json",
	"textures/particle/rain_fog.png",
	"textures/particle/rain_puddle.png",
	"textures/particle/rain_ripple.png",
	"textures/particle/particles.png",
	"textures/particle/dot.png",
	"textures/environment/weather.png",
]);
for (const path of files.map(relative).filter(path => path.startsWith("textures/"))) {
	if (path.startsWith("textures/blocks/")) continue; // block PBR overlay validated in section 7b
	if (path === "textures/textures_list.json") continue; // PBR map registry, validated in section 7b
	assert(allowedTextures.has(path), `unexpected texture override: ${path}`);
}
for (const isolated of ["models", "sounds", "ui", "attachables", "entity"]) {
	assert.equal(existsSync(join(rp, isolated)), false, `must not add ${isolated}/ overrides`);
}

// 8) docs
const inPackReadme = read(join(rp, "README_zh_CN.txt"));
assert(inPackReadme.includes("0.3.13") && inPackReadme.includes("雨"),
	"readme documents the 0.3.13 rain particles");
assert(inPackReadme.includes("未"), "readme stays honest about in-game verification");

// 7) extracted block PBR overlay: texture_set per vanilla block + copied height/MER maps
const blockDir = join(rp, "textures/blocks");
assert(existsSync(blockDir), "block PBR overlay directory missing");
const pbrFiles = [];
(function collect(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) collect(full);
		else pbrFiles.push(full);
	}
})(blockDir);
const setFiles = pbrFiles.filter(file => file.endsWith(".texture_set.json"));
assert(setFiles.length >= 80, `expected >=80 block texture sets, got ${setFiles.length}`);
for (const file of setFiles) {
	const data = json(file)["minecraft:texture_set"];
	assert(data && data.color, `${file}: texture_set color missing`);
	for (const key of ["heightmap", "metalness_emissive_roughness", "metalness_emissive_roughness_subsurface"]) {
		if (!data[key]) continue;
		if (Array.isArray(data[key])) continue; // inline metalness/emissive/roughness (water)
		assert(existsSync(join(dirname(file), `${data[key]}.png`)), `${file}: ${key} map missing (${data[key]}.png)`);
	}
}
// 7c) texture sets may only reference images inside the pack and channel counts must match VV rules
function pngColorType(file) {
	const buffer = readFileSync(file);
	assert(buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${file}: not a PNG`);
	assert.equal(buffer.toString("ascii", 12, 16), "IHDR", `${file}: missing IHDR`);
	return buffer[25];
}
for (const file of setFiles) {
	const data = json(file)["minecraft:texture_set"];
	const dir = dirname(file);
	if (typeof data.color === "string") {
		const colorFile = join(dir, `${data.color}.png`);
		assert(existsSync(colorFile), `${file}: colour image must be inside the pack (${data.color}.png)`);
		assert([2, 6].includes(pngColorType(colorFile)), `${file}: colour must be RGB/RGBA`);
	}
	const expected = {
		heightmap: [0],
		metalness_emissive_roughness: [2, 6],
		metalness_emissive_roughness_subsurface: [6],
	};
	for (const [key, types] of Object.entries(expected)) {
		const ref = data[key];
		if (!ref || Array.isArray(ref)) continue;
		const mapFile = join(dir, `${ref}.png`);
		assert(existsSync(mapFile), `${file}: ${key} image must be inside the pack`);
		assert(types.includes(pngColorType(mapFile)), `${file}: ${key} must be channel type ${types.join("/")}`);
	}
}
const pbrBytes = pbrFiles.reduce((sum, file) => sum + readFileSync(file).length, 0);
assert(pbrBytes < 600 * 1024, `block PBR overlay too large: ${(pbrBytes / 1024).toFixed(0)}KB`);
// 7b) every PBR map referenced by a texture_set must be registered in textures_list.json
const textureList = json(join(rp, "textures/textures_list.json"));
assert(Array.isArray(textureList) && textureList.length > 100, "textures_list.json must list the pack textures");
const listedTextures = new Set(textureList);
for (const file of setFiles) {
	const data = json(file)["minecraft:texture_set"];
	for (const key of ["heightmap", "metalness_emissive_roughness", "metalness_emissive_roughness_subsurface"]) {
		if (!data[key] || Array.isArray(data[key])) continue;
		const ref = "textures/blocks/" + relative(dirname(file) + "/" + data[key]).replace(/\\/g, "/").replace(/^textures\/blocks\//, "").replace(/\.png$/, "");
		assert(listedTextures.has(ref), `texture not registered in textures_list.json: ${ref}`);
	}
}
console.log(`Faded Wasteland Visuals 0.3.13 block PBR overlay: ${setFiles.length} texture sets, ${(pbrBytes / 1024).toFixed(0)}KB.`);

console.log("Faded Wasteland Visuals 0.3.13 validation passed (sky layering, softer haze, clearer water).");
