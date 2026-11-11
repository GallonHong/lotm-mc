import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Drone chassis-armor / blast-protection contract:
//   design source ......... DroneConstants.js (this add-on)
//   damage-side data ...... Test Guns scripts/data/droneArmor.js
//   mirrored copy ......... SAPI vendor/baizhan_damage/data/droneArmor.js
// The two damage-side copies must stay byte-identical; Test Guns and SAPI must
// resolve the same tier values, and every garage drone must be covered.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "../../..");
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");

const life = await import(new URL("../apocalypse_life_bp/scripts/drones/DroneConstants.js", import.meta.url));
const gunsDataPath = join(repo, "addons", "development", "test_guns_2d_addon", "test_guns_bp", "scripts", "data", "droneArmor.js");
const sapiDataPath = join(repo, "addons", "development", "sapi_server_addon", "sapi_server_bp", "scripts", "vendor", "baizhan_damage", "data", "droneArmor.js");
const gunsData = await import(pathToFileURL(gunsDataPath).href);
const sapiData = await import(pathToFileURL(sapiDataPath).href);

// 1. Tier tables must be identical everywhere.
assert.deepEqual(life.DRONE_ARMOR_BY_TIER, { COMMON: 10, RARE: 10, EPIC: 18, LEGENDARY: 25 }, "chassis armor tiers changed unexpectedly");
assert.deepEqual(life.DRONE_BLAST_REDUCTION_BY_TIER, { COMMON: 0.45, RARE: 0.55, EPIC: 0.65, LEGENDARY: 0.75 }, "blast reduction tiers changed unexpectedly");
assert.deepEqual(gunsData.DRONE_ARMOR_BY_TIER, life.DRONE_ARMOR_BY_TIER, "Test Guns armor tiers drifted from Life");
assert.deepEqual(sapiData.DRONE_ARMOR_BY_TIER, life.DRONE_ARMOR_BY_TIER, "SAPI armor tiers drifted from Life");
assert.deepEqual(gunsData.DRONE_BLAST_REDUCTION_BY_TIER, life.DRONE_BLAST_REDUCTION_BY_TIER, "Test Guns blast tiers drifted from Life");
assert.deepEqual(sapiData.DRONE_BLAST_REDUCTION_BY_TIER, life.DRONE_BLAST_REDUCTION_BY_TIER, "SAPI blast tiers drifted from Life");
assert.equal(readFileSync(gunsDataPath, "utf8"), readFileSync(sapiDataPath, "utf8"), "droneArmor.js mirrors must stay byte-identical");
assert.deepEqual(gunsData.DRONE_TIER_BY_ENTITY, sapiData.DRONE_TIER_BY_ENTITY, "drone tier/entity mapping must match");

// 2. Every garage drone is registered once with the tier-derived values.
const registry = life.DRONE_REGISTRY;
const tierKeyOf = config => Object.entries(life.DRONE_TIERS).find(([, value]) => value === config.tier)?.[0];
for (const [droneId, config] of Object.entries(registry)) {
	const tierKey = tierKeyOf(config);
	assert.ok(tierKey, `${droneId}: unknown tier object`);
	assert.equal(config.armor, life.DRONE_ARMOR_BY_TIER[tierKey], `${droneId}: armor must follow its tier`);
	assert.equal(config.blastReduction, life.DRONE_BLAST_REDUCTION_BY_TIER[tierKey], `${droneId}: blast reduction must follow its tier`);
	assert.equal(gunsData.DRONE_TIER_BY_ENTITY[config.entityType], tierKey, `${droneId}: Test Guns tier mapping missing or wrong`);
	assert.equal(sapiData.DRONE_TIER_BY_ENTITY[config.entityType], tierKey, `${droneId}: SAPI tier mapping missing or wrong`);
	assert.equal(gunsData.intrinsicArmorPoints(config.entityType), config.armor, `${droneId}: Test Guns armor resolver mismatch`);
	assert.equal(sapiData.intrinsicArmorPoints(config.entityType), config.armor, `${droneId}: SAPI armor resolver mismatch`);
	assert.equal(gunsData.intrinsicBlastReduction(config.entityType), config.blastReduction, `${droneId}: Test Guns blast resolver mismatch`);
	assert.equal(sapiData.intrinsicBlastReduction(config.entityType), config.blastReduction, `${droneId}: SAPI blast resolver mismatch`);
	assert.equal(gunsData.DRONE_ARMOR_POINTS[config.entityType], config.armor, `${droneId}: armor point table mismatch`);
}
assert.equal(Object.keys(gunsData.DRONE_TIER_BY_ENTITY).length, Object.keys(registry).length, "only garage drones may be registered");
assert.equal(gunsData.intrinsicArmorPoints("minecraft:zombie"), 0, "non-drone entities must not gain chassis armor");
assert.equal(gunsData.intrinsicBlastReduction("minecraft:zombie"), 0, "non-drone entities must not gain blast protection");
assert.equal(gunsData.intrinsicArmorPoints("makercamp_dr:ground_drone"), 0, "non-garage drone types must stay unarmored");

// 3. Damage-side wiring: intrinsic armor in all three handlers, blast reduction
//    in the armor engine and at both authoritative/local splash sites.
const gunsHandler = readFileSync(join(repo, "addons", "development", "test_guns_2d_addon", "test_guns_bp", "scripts", "feature", "damageHandler.js"), "utf8");
const sapiHandler = readFileSync(join(repo, "addons", "development", "sapi_server_addon", "sapi_server_bp", "scripts", "vendor", "baizhan_damage", "feature", "damageHandler.js"), "utf8");
const sapiMeleeHandler = readFileSync(join(repo, "addons", "development", "sapi_server_addon", "sapi_server_bp", "scripts", "vendor", "melee_damageHandler.js"), "utf8");
assert.equal(gunsHandler, sapiHandler, "Test Guns / SAPI damageHandler mirrors must stay byte-identical");
for (const [name, source] of [["Test Guns", gunsHandler], ["SAPI", sapiHandler], ["SAPI melee", sapiMeleeHandler]]) {
	assert.match(source, /import \{ intrinsicArmorPoints \} from '[^']*droneArmor\.js';/, `${name} handler must import drone armor`);
	assert.match(source, /const intrinsic = intrinsicArmorPoints\(entity\.typeId\);\s*\n\s*if \(intrinsic > 0\) return intrinsic;/, `${name} handler must resolve intrinsic armor before equipment scan`);
}

const gunsArmorEngine = readFileSync(join(repo, "addons", "development", "test_guns_2d_addon", "test_guns_bp", "scripts", "feature", "armorEngine.js"), "utf8");
const sapiArmorEngine = readFileSync(join(repo, "addons", "development", "sapi_server_addon", "sapi_server_bp", "scripts", "vendor", "baizhan_damage", "feature", "armorEngine.js"), "utf8");
assert.equal(gunsArmorEngine, sapiArmorEngine, "Test Guns / SAPI armorEngine mirrors must stay byte-identical");
assert.match(gunsArmorEngine, /const intrinsic = intrinsicBlastReduction\(entity\.typeId\);\s*\n\s*if \(intrinsic > 0\) return intrinsic;/, "armorEngine must resolve intrinsic blast protection");

const splashSites = [
	["Test Guns baizhan splash", join(repo, "addons", "development", "test_guns_2d_addon", "test_guns_bp", "scripts", "feature", "baizhanEngine.js"), /shot\.kind==='splash'\?1-intrinsicBlastReduction\(target\.typeId\):1/],
	["SAPI baizhan splash", join(repo, "addons", "development", "sapi_server_addon", "sapi_server_bp", "scripts", "modules", "baizhan_permission.js"), /packet\.kind==='splash'\?1-intrinsicBlastReduction\(target\.typeId\):1/],
	["Test Guns rail splash", join(repo, "addons", "development", "test_guns_2d_addon", "test_guns_bp", "scripts", "feature", "railLocal.js"), /railSplashDamage\(w\.profile,geometry\.distance\)\*\(1-intrinsicBlastReduction\(t\.typeId\)\)/],
	["SAPI rail splash", join(repo, "addons", "development", "sapi_server_addon", "sapi_server_bp", "scripts", "modules", "rail_impact.js"), /railSplashDamage\(s\.profile,geometry\.distance\)\*\(1-intrinsicBlastReduction\(target\.typeId\)\)/]
];
for (const [name, path, pattern] of splashSites) {
	const source = readFileSync(path, "utf8");
	assert.match(source, /import \{ intrinsicBlastReduction \} from '[^']*droneArmor\.js';/, `${name}: missing blast import`);
	assert.match(source, pattern, `${name}: splash damage must apply drone blast reduction`);
}

// 4. Player-facing garage page shows both values.
const droneMenu = read("apocalypse_life_bp/scripts/drones/DroneMenu.js");
assert.match(droneMenu, /conf\.armor/, "garage must show chassis armor");
assert.match(droneMenu, /conf\.blastReduction/, "garage must show blast reduction");

console.log("Drone chassis armor / blast protection contract validation passed.");
