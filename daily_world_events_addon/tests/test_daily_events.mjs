import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "daily_events_bp");
const rp = join(root, "daily_events_rp");
const repo = resolve(root, "..");

function files(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function json(path) { return JSON.parse(readFileSync(path, "utf8")); }

for (const path of [...files(bp), ...files(rp)].filter(path => path.endsWith(".json"))) {
  assert.doesNotThrow(() => json(path), `invalid JSON: ${path}`);
}

for (const path of files(join(bp, "scripts")).filter(path => extname(path) === ".js")) {
  const source = readFileSync(path, "utf8");
  for (const match of source.matchAll(/from\s+"(\.[^"]+)"/g)) {
    assert(statSync(resolve(dirname(path), match[1])).isFile(), `missing relative import ${match[1]} from ${path}`);
  }
}

const manifest = json(join(bp, "manifest.json"));
const rpManifest = json(join(rp, "manifest.json"));
assert.deepEqual(manifest.header.version, [0, 4, 0]);
assert.deepEqual(rpManifest.header.version, [0, 4, 0]);
assert.equal(manifest.dependencies.find(value => value.uuid)?.uuid, rpManifest.header.uuid);
assert.equal(manifest.modules.find(value => value.type === "script")?.entry, "scripts/main.js");

const questSource = readFileSync(join(bp, "scripts/daily/dailyQuests.js"), "utf8");
for (const type of ["collect", "kill", "world_event", "craft", "sell"]) assert(questSource.includes(`type: \"${type}\"`));
assert.equal(questSource.includes('type: "repair"'), false, "repair quest must remain removed");
const managerSource = readFileSync(join(bp, "scripts/daily/DailyQuestManager.js"), "utf8");
assert(managerSource.includes("QUEST_POOLS.collect") && managerSource.includes("QUEST_POOLS.random"));
assert(managerSource.includes("system.currentTick") === false, "daily persistence must not derive day identity from ticks");

const eventSource = readFileSync(join(bp, "scripts/events/templates/eventTemplates.js"), "utf8");
for (const id of ["infected_attack", "survivor_rescue", "raider_ambush", "crashed_convoy", "roadblock_clearance", "toxic_outbreak", "mutant_nest", "mercenary_blockade"]) assert(eventSource.includes(`${id}:`));
assert(eventSource.includes("outlawWaves") && eventSource.includes('zones: ["outlaw"]'), "law/outlaw event difficulty split missing");
const templatesModule = await import(`file://${join(bp, "scripts/events/templates/eventTemplates.js")}`);
assert.equal(Object.keys(templatesModule.EVENT_TEMPLATES).length, 8, "expected eight event templates");
for (let index = 0; index < 100; index++) {
  const selected = templatesModule.chooseTemplate(null, "law");
  assert(!["mutant_nest", "mercenary_blockade"].includes(selected), "law zone selected outlaw-only event");
}
const worldEvents = readFileSync(join(bp, "scripts/events/WorldEventManager.js"), "utf8");
assert(worldEvents.includes("EventNodeRegistry") && worldEvents.includes("participantScores"));
assert(worldEvents.includes("eventMaxEntities") && worldEvents.includes("setCooldown"));
assert(worldEvents.includes("zoneType") && worldEvents.includes("outlawRewardId"), "zone-scaled event rewards missing");

const rewards = readFileSync(join(bp, "scripts/rewards/rewards.js"), "utf8");
const rewardIds = [...rewards.matchAll(/id: \"([^\"]+)\"/g)].map(match => match[1]);
assert(rewardIds.length > 0 && rewardIds.every(id => id.startsWith("minecraft:")), "MVP rewards must use vanilla items only");
assert(rewards.includes("minecraft:name_tag") && rewards.includes("minecraft:amethyst_shard"));

const integration = readFileSync(join(bp, "scripts/integration/IntegrationBridge.js"), "utf8");
assert(integration.includes("apoc:spawn_requests:v1") === false, "integration key should come from configurable config.js");
assert(integration.includes("enqueueSpawn") && integration.includes("spawnFallback"));
assert(integration.includes("resolveZone") && integration.includes('"outlaw"'), "zone resolver missing");
for (const marker of ["安全区 1", "法制区 1", "非法制荒原"]) assert(integration.includes(marker), `missing Apocalypse preset/default zone: ${marker}`);

const commissionerDialogue = json(join(bp, "dialogue/commissioner_dialogue.json"));
const merchantDialogue = json(join(bp, "dialogue/merchant_dialogues.json"));
assert.equal(commissionerDialogue["minecraft:npc_dialogue"].scenes[0].buttons.some(button => button.name.includes("维修")), false);
for (const button of commissionerDialogue["minecraft:npc_dialogue"].scenes[0].buttons) {
  assert.equal(button.commands[0], "/dialogue close @initiator", `NPC button must close dialogue first: ${button.name}`);
  assert(button.commands.some(command => command.includes("scriptevent daily:")), `NPC button is missing daily scriptevent: ${button.name}`);
}
assert.equal(merchantDialogue["minecraft:npc_dialogue"].scenes.length, 4);
assert(files(bp).some(path => path.endsWith("scripts/merchants/merchantConfig.js")));
const dailyMenu = readFileSync(join(bp, "scripts/ui/DailyMenu.js"), "utf8");
assert(dailyMenu.includes("isUserBusy") && dailyMenu.includes("attempt < 8"), "daily forms must retry after native NPC UserBusy");

const rewardManager = readFileSync(join(bp, "scripts/rewards/RewardManager.js"), "utf8");
assert(rewardManager.includes("reserve(player, uniqueId)") && rewardManager.includes("pendingRewardsKey"));

const dungeonStructure = readFileSync(join(bp, "structures/daily_dungeon/abandoned_clinic.mcstructure"));
assert(dungeonStructure.length > 1000, "clinic dungeon structure is missing or empty");
assert.equal(dungeonStructure.includes(Buffer.from("mcpe:")), false, "clinic dungeon must not depend on Deadzone custom blocks");
const dungeonTemplates = await import(`file://${join(bp, "scripts/dungeons/dungeonTemplates.js")}`);
const clinic = dungeonTemplates.DUNGEON_TEMPLATES.abandoned_clinic;
assert.deepEqual(clinic.structureSize, { x: 18, y: 10, z: 15 });
assert.equal(clinic.spawnPoints.length, 3);
assert.equal(clinic.stages.length, 3);
assert.equal(dungeonTemplates.DUNGEON_SLOTS.length, 2);
assert(dungeonTemplates.DUNGEON_SLOTS.every(slot => slot.origin.y === 250), "dungeon slots should remain in isolated high-altitude arenas");
const dungeonManager = readFileSync(join(bp, "scripts/dungeons/DungeonManager.js"), "utf8");
for (const marker of ["structure load", "RewardManager.grant", "minimumContribution", "daily_in_dungeon", "returnLocation"]) {
  assert(dungeonManager.includes(marker), `missing dungeon behavior: ${marker}`);
}
assert(rewards.includes("dungeon_abandoned_clinic"), "clinic reward is missing");
assert(readFileSync(join(bp, "scripts/ui/DailyMenu.js"), "utf8").includes("进入副本行动"));
assert(readFileSync(join(bp, "scripts/main.js"), "utf8").includes("DungeonManager.tick"));

const sapiIntegration = readFileSync(join(repo, "sapi_server_addon/sapi_server_bp/scripts/modules/integration.js"), "utf8");
const sapiMenu = readFileSync(join(repo, "sapi_server_addon/sapi_server_bp/scripts/modules/server_menu.js"), "utf8");
const apocSpawn = readFileSync(join(repo, "apocalypse_mobs_addon/apocalypse_mobs_bp/scripts/spawnDirector.js"), "utf8");
assert(sapiIntegration.includes("recordDailySale") && sapiMenu.includes("daily:menu"), "SAPI bridge missing");
assert(apocSpawn.includes("processExternalRequests") && apocSpawn.includes("externalSpawnRequestsKey"), "SpawnDirector bridge missing");

console.log("Survival Daily & World Events validation passed.");
