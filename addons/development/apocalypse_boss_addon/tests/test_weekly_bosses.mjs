import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Weekly raid contract (v1.5.1):
//   boss add-on .... weeklyRaid.js tags/props + entity spawn events + scripted pursuit
//   daily events ... rooms / party / ledger / maps (0.20.0)
//   Test Guns / SAPI  weekly room damage attribution
// Node-level checks only; the real Bedrock behaviour still needs an in-game pass.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "../../..");
const bp = join(root, "apocalypse_boss_bp");
const read = path => readFileSync(path, "utf8");
const life = await import(pathToFileURL(join(root, "apocalypse_boss_bp/scripts/weeklyRaid.js")).href);

// 1. Tag contract constants stay stable (they are shared with Daily Events / Guns / SAPI).
assert.equal(life.WEEKLY_BOSS_TAG, "weekly:boss");
assert.equal(life.WEEKLY_PLAYER_TAG, "weekly:participant");
assert.equal(life.WEEKLY_ROOM_PREFIX, "weekly:room:");
assert.equal(life.WEEKLY_ARMOR_PREFIX, "weekly:armor:");
assert.deepEqual([...life.WEEKLY_ROOMS].sort(), ["mogathul", "sirok"]);
assert.deepEqual([...life.WEEKLY_ARMOR_VALUES].sort((a, b) => a - b), [0, 10, 20, 40]);

function mockEntity({ tags = [], properties = {}, health = 1 } = {}) {
	const set = new Set(tags);
	const entity = {
		typeId: "minecraft:player",
		dimension: { id: "overworld" },
		hasTag: tag => set.has(tag),
		getTags: () => [...set],
		addTag: tag => { set.add(tag); return true; },
		removeTag: tag => { set.delete(tag); return true; },
		getProperty: key => properties[key],
		getComponent: () => ({ currentValue: health }),
	};
	return { entity, set };
}
const validEntity = () => true; // script API isValid() returns true for a live entity

// 2. Weekly detection: tag OR synced entity property, never ordinary bosses.
assert.equal(life.isWeeklyBoss({ ...mockEntity().entity, hasTag: () => true }), true);
assert.equal(life.isWeeklyBoss({ ...mockEntity().entity, hasTag: () => false, getProperty: key => key === "apoc_boss:weekly_instance" }), true);
assert.equal(life.isWeeklyBoss({ ...mockEntity().entity, hasTag: () => false, getProperty: () => undefined }), false);

// 3. Room tags must be exactly one valid room.
const { entity: roomed } = mockEntity({ tags: ["weekly:room:sirok"] });
assert.equal(life.weeklyRoom(roomed), "sirok");
assert.equal(life.weeklyRoom(mockEntity({ tags: ["weekly:room:sirok", "weekly:room:mogathul"] }).entity), null, "conflicting rooms must fail closed");
assert.equal(life.weeklyRoom(mockEntity({ tags: ["weekly:room:unknown"] }).entity), null);
assert.equal(life.weeklyRoom(mockEntity().entity), null);

// 4. Exact armor: only 0/10/20/40, conflicting configuration fails to zero.
assert.equal(life.weeklyBossArmor(mockEntity({ tags: ["weekly:armor:20"] }).entity), 20);
assert.equal(life.weeklyBossArmor(mockEntity({ tags: ["weekly:armor:40"] }).entity), 40);
assert.equal(life.weeklyBossArmor(mockEntity({ tags: ["weekly:armor:20", "weekly:armor:40"] }).entity), 0, "conflicting armor must fail closed");
assert.equal(life.weeklyBossArmor(mockEntity({ tags: ["weekly:armor:15"] }).entity), 0);
assert.equal(life.weeklyBossArmor(mockEntity().entity), 0);

// 5. enforceWeeklyArmor removes the ordinary forced armor and writes the weekly one.
{
	const { entity, set } = mockEntity({ tags: ["weekly:boss", "weekly:armor:20", "apoc:armor:10", "apoc:armor_source:raid"] });
	set.add("weekly:armor:20");
	assert.equal(life.enforceWeeklyArmor(entity), 20);
	assert(set.has("apoc:armor:20"), "weekly armor must replace the ordinary armor tag");
	assert.equal(set.has("apoc:armor:10"), false);
	assert(set.has("apoc:armor_source:weekly"));
	assert.equal(life.enforceWeeklyArmor(mockEntity({ tags: ["apoc:armor:10"] }).entity), null, "ordinary bosses are not touched");
}

// 6. Targeting: same room + participant + no PvP flags; everything else is rejected.
{
	const weeklyBoss = { ...mockEntity({ tags: ["weekly:boss", "weekly:room:sirok"] }).entity, isValid: validEntity };
	const participant = { ...mockEntity({ tags: ["weekly:participant", "weekly:room:sirok"] }).entity, isValid: validEntity };
	assert.equal(life.canWeeklyBossTarget(weeklyBoss, participant), true);
	assert.equal(life.canWeeklyBossTarget(weeklyBoss, { ...participant, getTags: () => ["weekly:participant", "weekly:room:mogathul"] }), false);
	assert.equal(life.canWeeklyBossTarget(weeklyBoss, { ...participant, hasTag: tag => tag !== "weekly:participant" }), false);
	assert.equal(life.canWeeklyBossTarget(weeklyBoss, { ...participant, hasTag: tag => tag === "pvp:participant" }), false);
	assert.equal(life.canWeeklyBossTarget(weeklyBoss, { ...participant, getComponent: () => ({ currentValue: 0 }) }), false, "dead players cannot be targeted");
	const ordinaryBoss = { ...mockEntity().entity, isValid: validEntity };
	assert.equal(life.canWeeklyBossTarget(ordinaryBoss, { ...mockEntity().entity, isValid: validEntity }), true, "ordinary bosses keep normal targeting");
}

// 7. Entity JSON contract for both weekly-capable bosses.
for (const [file, room, weeklyHp] of [["sandworm.json", "sirok", 20000], ["abomination.json", "mogathul", 30000]]) {
	const entity = JSON.parse(read(join(bp, "entities", file)))["minecraft:entity"];
	assert.equal(entity.description.properties?.["apoc_boss:weekly_instance"]?.type, "bool", `${file}: weekly_instance property`);
	const spawnEvent = entity.events["apoc_boss:weekly_spawn"];
	assert(spawnEvent, `${file}: weekly_spawn event`);
	assert.equal(spawnEvent.set_property["apoc_boss:weekly_instance"], true);
	assert(spawnEvent.add.component_groups.includes("apoc_boss:weekly_no_loot"));
	assert(spawnEvent.add.component_groups.includes("apoc_boss:weekly_unassigned"));
	assert(spawnEvent.remove.component_groups.includes("apoc_boss:normal_ai"));
	const noLoot = entity.component_groups["apoc_boss:weekly_no_loot"];
	assert.deepEqual(noLoot["minecraft:health"], { value: weeklyHp, max: weeklyHp });
	assert.equal(noLoot["minecraft:loot"].table, "loot_tables/weekly_empty.json");
	assert.equal(noLoot["minecraft:experience_reward"].on_death, "0");
	assert(entity.component_groups[`apoc_boss:weekly_room_${room}`], `${file}: weekly room group`);
	const roomEvent = `apoc_boss:weekly_room_${room}`;
	assert(entity.events[roomEvent], `${file}: weekly room event`);
	// Ordinary spawn stays untouched: normal HP/loot on the base entity.
	assert.equal(entity.components["minecraft:health"]?.max, room === "sirok" ? 16000 : 26000);
	assert.equal(entity.components["minecraft:loot"]?.table, `loot_tables/raid/${room === "sirok" ? "sandworm" : "abomination"}.json`);
}
assert(existsSync(join(bp, "loot_tables/weekly_empty.json")));
assert.equal(JSON.parse(read(join(bp, "loot_tables/weekly_empty.json"))).pools.length, 0);

// 8. Wiring: boss scripts consume the contract, ordinary spawn event is re-emitted.
const bossArmor = read(join(bp, "scripts/bossArmor.js"));
assert.match(bossArmor, /import \{ isWeeklyBoss, enforceWeeklyArmor \} from "\.\/weeklyRaid\.js";/);
assert.match(bossArmor, /if \(isWeeklyBoss\(entity\)\) return enforceWeeklyArmor\(entity\);/);
const raid = read(join(bp, "scripts/raidBosses.js"));
assert.match(raid, /import \{ isLiveEntity, isWeeklyBoss, canWeeklyBossTarget, enforceWeeklyArmor \} from "\.\/weeklyRaid\.js";/);
assert.match(raid, /entity\.triggerEvent\("apoc_boss:normal_spawn"\)/);
assert.match(raid, /function followWeeklyTarget/);
assert.match(raid, /followWeeklyTarget\(entity, entry\)/);
assert(existsSync(join(bp, "docs/WEEKLY_RAIDS.md")));

// 9. Daily Events side: weekly scripts, cleanup maps and menu wiring.
const dailyBp = join(repo, "addons/development/daily_world_events_addon/daily_events_bp");
for (const script of ["config.js", "maps.js", "mapsConfig.js", "manager.js", "menu.js", "rewards.js"]) {
	assert(existsSync(join(dailyBp, "scripts/weekly", script)), `daily weekly script missing: ${script}`);
}
assert(existsSync(join(dailyBp, "structures/weekly/manifest.json")), "weekly structure manifest missing");
assert.equal(readdirSync(join(dailyBp, "structures/weekly/sirok")).filter(name => name.endsWith(".mcstructure")).length, 9);
assert.equal(readdirSync(join(dailyBp, "structures/weekly/mogathul")).filter(name => name.endsWith(".mcstructure")).length, 4);
const dailyMain = read(join(dailyBp, "scripts/main.js"));
assert.match(dailyMain, /import \{ WeeklyRaidManager \} from "\.\/weekly\/manager\.js";/);
assert.match(dailyMain, /import \{ WeeklyMenu \} from "\.\/weekly\/menu\.js";/);
assert.match(dailyMain, /WeeklyRaidManager\.handleBossDeath\(dead\)/);
assert.match(dailyMain, /daily:weekly/);

// 10. Damage consumers: weekly room attribution in Test Guns / SAPI.
const gunsTeamRules = read(join(repo, "addons/development/test_guns_2d_addon/test_guns_bp/scripts/feature/utils/teamRules.js"));
assert.match(gunsTeamRules, /function weeklyBlocksDamage/);
assert.match(gunsTeamRules, /weekly:boss/);
assert.match(gunsTeamRules, /weeklyBlocksDamage\(attacker, target\)/);
// SAPI keeps its own smaller team rules; its weekly room enforcement lives in the
// SAPI modules (match_access / pvp / server_menu / social / integration) below.
assert.match(gunsTeamRules, /weeklyBlocksDamage\(attacker, target\)/);
const sapiBp = join(repo, "addons/development/sapi_server_addon/sapi_server_bp");
for (const file of ["scripts/modules/match_access.js", "scripts/modules/pvp.js", "scripts/modules/server_menu.js", "scripts/modules/social.js", "scripts/modules/integration.js"]) {
	assert.match(read(join(sapiBp, file)), /weekly/, `${file} must know about weekly rooms`);
}

// 11. Release versions of this bundle.
const versions = [
	["apocalypse_boss_addon/apocalypse_boss_bp/manifest.json", [1, 5, 1]],
	["apocalypse_boss_addon/apocalypse_boss_rp/manifest.json", [1, 5, 1]],
	["daily_world_events_addon/daily_events_bp/manifest.json", [0, 20, 3]],
	["daily_world_events_addon/daily_events_rp/manifest.json", [0, 20, 3]],
	["test_guns_2d_addon/test_guns_bp/manifest.json", [3, 16, 20]],
	["test_guns_2d_addon/test_guns_rp/manifest.json", [3, 16, 20]],
	["sapi_server_addon/sapi_server_bp/manifest.json", [2, 15, 3]],
	["sapi_server_addon/sapi_server_rp/manifest.json", [2, 15, 3]],
];
for (const [relative, expected] of versions) {
	const manifest = JSON.parse(readFileSync(join(repo, "addons/development", relative), "utf8"));
	assert.deepEqual(manifest.header.version, expected, `${relative} version`);
}

console.log("Weekly raid boss contract validation passed (boss 1.5.1 / daily 0.20.3 / guns 3.16.20 / sapi 2.15.3).");
