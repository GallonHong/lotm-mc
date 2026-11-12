import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Drone combat buff contract:
//   design source ...... Apocalypse Life DroneConstants.js (skills[].combatBuff)
//   producer ........... Apocalypse Life DroneClass.js (player tags)
//   consumers .......... Test Guns damageHandler.js, SAPI baizhan/melee damage handlers
//   mirrored contract .. droneCombatBuff.js (byte-identical in all three packs)

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "../../..");
const read = path => readFileSync(path, "utf8");
const lifeContractPath = join(root, "apocalypse_life_bp/scripts/drones/droneCombatBuff.js");
const gunsContractPath = join(repo, "addons/development/test_guns_2d_addon/test_guns_bp/scripts/feature/utils/droneCombatBuff.js");
const sapiContractPath = join(repo, "addons/development/sapi_server_addon/sapi_server_bp/scripts/vendor/baizhan_damage/feature/utils/droneCombatBuff.js");

// 1. Contract modules must stay byte-identical.
const lifeContractSource = read(lifeContractPath);
assert.equal(lifeContractSource, read(gunsContractPath), "Test Guns droneCombatBuff.js drifted from Life");
assert.equal(lifeContractSource, read(sapiContractPath), "SAPI droneCombatBuff.js drifted from Life");
const contract = await import(pathToFileURL(lifeContractPath).href);

// 2. Tag parser contract: valid tags, malformed tags, cap and no stacking.
assert.deepEqual(contract.parseDroneCombatBuffTags([]), { damagePct: 0, critPct: 0, damage: 0, critRate: 0 });
assert.deepEqual(contract.parseDroneCombatBuffTags(undefined), { damagePct: 0, critPct: 0, damage: 0, critRate: 0 });
assert.deepEqual(
	contract.parseDroneCombatBuffTags(["pvp:participant", "ab_dr:dmg:20:123", "ab_dr:crit:35:123"]),
	{ damagePct: 20, critPct: 35, damage: 0.2, critRate: 0.35 }
);
assert.deepEqual(
	contract.parseDroneCombatBuffTags(["ab_dr:dmg:20:1", "ab_dr:dmg:35:2"]).damagePct,
	35,
	"buffs must take the highest value, never stack"
);
const malformed = contract.parseDroneCombatBuffTags(["ab_dr:dmg::1", "ab_dr:dmg:abc:1", "ab_dr:crit:-5:1", "ab_dr:crit:999:1"]);
assert.equal(malformed.damagePct, 0, "malformed damage tags must be ignored");
assert.equal(malformed.critPct, 100, "crit percent must clamp to 100");
assert.equal(contract.buildDroneBuffTag("damage", 20, "abc"), "ab_dr:dmg:20:abc");
assert.equal(contract.buildDroneBuffTag("crit", 999, "abc"), "ab_dr:crit:100:abc");

// 3. Design values: only the support drones may carry combatBuff, with the documented numbers.
const life = await import(pathToFileURL(join(root, "apocalypse_life_bp/scripts/drones/DroneConstants.js")).href);
const skill = (droneId, skillId) => {
	const found = life.DRONE_REGISTRY[droneId]?.skills?.find(entry => entry.id === skillId);
	assert.ok(found, `${droneId}.${skillId} missing`);
	return found;
};
const adrenaline = skill("guardian_angel", "adrenaline_shot");
assert.deepEqual(adrenaline.combatBuff, { damagePct: 20, critPct: 0 }, "guardian buff: damage only");
assert.equal(adrenaline.durationTicks, 160, "guardian buff lasts 8s");
const gale = skill("gale", "gale_buff");
assert.deepEqual(gale.combatBuff, { damagePct: 20, critPct: 20 }, "gale buff: damage + crit rate");
assert.equal(gale.durationTicks, 160, "gale buff lasts 8s");
const abyssal = skill("abyssal", "abyssal_matrix");
assert.deepEqual(abyssal.combatBuff, { damagePct: 35, critPct: 35 }, "abyssal buff: damage + crit rate");
assert.equal(abyssal.durationTicks, 200, "abyssal buff lasts 10s");
for (const [name, entry] of [["adrenaline", adrenaline], ["gale", gale], ["abyssal", abyssal]]) {
	assert.match(entry.desc, /伤害/, `${name} desc must document the damage buff`);
}
assert.match(gale.desc, /暴击率/, "gale desc must document the crit rate buff");
assert.match(abyssal.desc, /暴击率/, "abyssal desc must document the crit rate buff");
for (const [droneId, config] of Object.entries(life.DRONE_REGISTRY)) {
	for (const entry of config.skills ?? []) {
		if (entry.combatBuff) continue;
		assert.ok(!/combatBuff/.test(JSON.stringify(entry)), `${droneId}.${entry.id}: unexpected combatBuff`);
	}
}

// 4. Producer wiring: DroneClass writes/cleans tags and relaxes the PvP / weekly trigger threshold.
const droneClass = read(join(root, "apocalypse_life_bp/scripts/drones/DroneClass.js"));
assert.match(droneClass, /import \{ buildDroneBuffTag, clearDroneCombatBuffs \} from "\.\/droneCombatBuff\.js";/);
assert.match(droneClass, /if \(skill\.combatBuff\) this\.applyDroneCombatBuff\(player, skill\.combatBuff, skill\.durationTicks \|\| 160\);/);
assert.match(droneClass, /const requiredTargets = participant\(player\) \|\| weeklyParticipant\(player\) \? 1 : 2;/, "PvP and weekly raids must trigger with a single hostile target");
assert.match(droneClass, /weeklyParticipant/, "weekly raid participants must be recognised by the buff trigger");
assert.match(droneClass, /for \(const player of world\.getAllPlayers\(\)\) clearDroneCombatBuffs\(player\);/, "stale buff tags must be cleared on world load");
assert.match(droneClass, /player\.addTag\(tag\);\s*\n\s*applied\.push\(tag\);/);
assert.match(droneClass, /system\.runTimeout\(\(\) => \{[\s\S]*?player\.removeTag\(tag\);/, "buff tags must expire with the producer timer");

// 5. Consumer wiring: all three authoritative handlers read the tags before the crit clamp.
const gunsHandler = read(join(repo, "addons/development/test_guns_2d_addon/test_guns_bp/scripts/feature/damageHandler.js"));
const sapiHandler = read(join(repo, "addons/development/sapi_server_addon/sapi_server_bp/scripts/vendor/baizhan_damage/feature/damageHandler.js"));
const sapiMeleeHandler = read(join(repo, "addons/development/sapi_server_addon/sapi_server_bp/scripts/vendor/melee_damageHandler.js"));
assert.equal(gunsHandler, sapiHandler, "Test Guns / SAPI damageHandler mirrors must stay byte-identical");
const insertion = /const droneBuff = readDroneCombatBuff\(shooter\);\s*\n\s*critRate \+= droneBuff\.critRate;\s*\n\s*dmgMultiplier \+= droneBuff\.damage;/;
const clamp = /critRate = Math\.max\(0, Math\.min\(1, critRate\)\);/;
for (const [name, source] of [["Test Guns", gunsHandler], ["SAPI baizhan", sapiHandler], ["SAPI melee", sapiMeleeHandler]]) {
	assert.match(source, /import \{ readDroneCombatBuff \} from '[^']*droneCombatBuff\.js';/, `${name}: missing contract import`);
	assert.match(source, insertion, `${name}: drone buff must feed critRate and dmgMultiplier`);
	const injectionIndex = source.search(insertion);
	const clampIndex = source.search(clamp);
	assert.ok(injectionIndex > 0 && clampIndex > injectionIndex, `${name}: drone buff must be applied before the crit clamp`);
}

// 6. Documentation copies must stay identical.
const lifeDoc = read(join(root, "apocalypse_life_bp/docs/DRONE_COMBAT_BUFF.md"));
assert.equal(lifeDoc, read(join(repo, "addons/development/test_guns_2d_addon/test_guns_bp/docs/DRONE_COMBAT_BUFF.md")), "Test Guns doc copy drifted");
assert.equal(lifeDoc, read(join(repo, "addons/development/sapi_server_addon/sapi_server_bp/docs/DRONE_COMBAT_BUFF.md")), "SAPI doc copy drifted");

console.log("Drone combat buff (damage / crit rate) contract validation passed.");
