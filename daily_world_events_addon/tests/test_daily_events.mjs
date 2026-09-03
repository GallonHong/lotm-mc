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
assert.deepEqual(manifest.header.version, [0, 11, 0]);
assert.deepEqual(rpManifest.header.version, [0, 11, 0]);
assert.equal(manifest.dependencies.find(value => value.uuid)?.uuid, rpManifest.header.uuid);
assert.equal(manifest.modules.find(value => value.type === "script")?.entry, "scripts/main.js");

const questSource = readFileSync(join(bp, "scripts/daily/dailyQuests.js"), "utf8");
for (const type of ["collect", "kill", "world_event", "craft", "sell"]) assert(questSource.includes(`type: \"${type}\"`));
assert.equal(questSource.includes('type: "repair"'), false, "repair quest must remain removed");
const managerSource = readFileSync(join(bp, "scripts/daily/DailyQuestManager.js"), "utf8");
assert(managerSource.includes("QUEST_POOLS.collect") && managerSource.includes("QUEST_POOLS.random"));
assert(managerSource.includes("system.currentTick") === false, "daily persistence must not derive day identity from ticks");

const eventSource = readFileSync(join(bp, "scripts/events/templates/eventTemplates.js"), "utf8");
for (const id of ["infected_attack", "survivor_rescue", "raider_ambush", "crashed_convoy", "roadblock_clearance", "toxic_outbreak", "mutant_nest", "mercenary_blockade", "fog_man_hunt", "goatman_hunt", "siren_head_hunt", "rebel_invasion"]) assert(eventSource.includes(`${id}:`));
assert(eventSource.includes("outlawWaves") && eventSource.includes('zones: ["outlaw"]'), "law/outlaw event difficulty split missing");
for (const key of ["shrieker", "charger", "hunter", "tyrant"]) assert(eventSource.includes(`mobKey: "${key}"`), `world events missing special infected: ${key}`);
const templatesModule = await import(`file://${join(bp, "scripts/events/templates/eventTemplates.js")}`);
assert.equal(Object.keys(templatesModule.EVENT_TEMPLATES).length, 12, "expected twelve event templates");
for (let index = 0; index < 100; index++) {
  const selected = templatesModule.chooseTemplate(null, "law");
  assert(!["mutant_nest", "mercenary_blockade"].includes(selected), "law zone selected outlaw-only event");
}
for (let index = 0; index < 20; index++) assert.equal(templatesModule.chooseTemplate(null, "safe"), "rebel_invasion", "safe zones may only select rebel invasion");
for (const id of ["fog_man_hunt", "goatman_hunt", "siren_head_hunt"]) assert.equal(templatesModule.EVENT_TEMPLATES[id].mode, "boss", `${id} boss mode missing`);
assert.equal(templatesModule.EVENT_TEMPLATES.rebel_invasion.allowSafeZone, true, "rebel invasion must explicitly allow safe-zone enemies");
const worldEvents = readFileSync(join(bp, "scripts/events/WorldEventManager.js"), "utf8");
assert(worldEvents.includes("EventNodeRegistry") && worldEvents.includes("participantScores"));
assert(worldEvents.includes("eventMaxEntities") && worldEvents.includes("setCooldown"));
assert(worldEvents.includes("zoneType") && worldEvents.includes("outlawRewardId"), "zone-scaled event rewards missing");
assert(worldEvents.includes("disqualifiedPlayerIds") && worldEvents.includes("static onPlayerDeath(player)"), "event death disqualification missing");
assert(worldEvents.includes("instance.disqualifiedPlayerIds.includes(player.id)"), "dead participants must be excluded from scoring and rewards");
for (const marker of ["DailyNewsManager.publishEventStart", "DailyNewsManager.publishEventResult", "template.mode === \"boss\"", "spawnSafeZoneEventMobs", "allowSafeZone", 'state: options.waitForPlayers === true ? "announced"', "arrivalDeadlineTick"]) assert(worldEvents.includes(marker), `missing news/event integration: ${marker}`);
assert(readFileSync(join(bp, "scripts/main.js"), "utf8").includes("WorldEventManager.onPlayerDeath(dead)"), "player deaths must reach WorldEventManager");
const newsPresets = await import(`file://${join(bp, "scripts/events/templates/newsPresets.js")}`);
assert(Object.keys(newsPresets.NEWS_PRESETS).length >= 13, "daily news preset library is too small");
for (const templateId of Object.keys(templatesModule.EVENT_TEMPLATES)) assert(newsPresets.presetsForTemplate(templateId).length > 0, `event template has no news preset: ${templateId}`);
for (const id of ["mass_horde_surface", "fog_man_sighting", "goatman_sighting", "siren_head_sighting", "rebel_city_assault"]) assert(newsPresets.NEWS_PRESETS[id], `missing news preset: ${id}`);
const newsManager = readFileSync(join(bp, "scripts/events/DailyNewsManager.js"), "utf8");
for (const marker of ["newsArchiveKey", "publishEventStart", "publishEventResult", "notifyDailySummary", "listToday", "coordinateText", "联盟每日新闻"]) assert(newsManager.includes(marker), `missing daily news behavior: ${marker}`);

const rewards = readFileSync(join(bp, "scripts/rewards/rewards.js"), "utf8");
const rewardIds = [...rewards.matchAll(/id: \"([^\"]+)\"/g)].map(match => match[1]);
assert(rewardIds.length > 0 && rewardIds.every(id => id.startsWith("minecraft:") || id === "test_gun:blueprint_deagle"), "only the requested tutorial blueprint may use an external item id");
assert(rewards.includes('id: "test_gun:blueprint_deagle"') && rewards.includes("coins: 2000"), "one-time tutorial reward must use the real blue-quality Test Gun blueprint and 2000 coins");
assert(rewards.includes("minecraft:name_tag") && rewards.includes("minecraft:amethyst_shard"));

const integration = readFileSync(join(bp, "scripts/integration/IntegrationBridge.js"), "utf8");
assert(integration.includes("apoc:spawn_requests:v1") === false, "integration key should come from configurable config.js");
assert(integration.includes("enqueueSpawn") && integration.includes("spawnFallback"));
assert(integration.includes("spawnSafeZoneEventMobs") && integration.includes("daily_allow_safe_zone"), "safe-zone invasion spawn bridge missing");
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
assert(files(bp).some(path => path.replace(/\\/g, "/").endsWith("scripts/merchants/merchantConfig.js")));
const dailyMenu = readFileSync(join(bp, "scripts/ui/DailyMenu.js"), "utf8");
assert(dailyMenu.includes("isUserBusy") && dailyMenu.includes("attempt < 8"), "daily forms must retry after native NPC UserBusy");

const rewardManager = readFileSync(join(bp, "scripts/rewards/RewardManager.js"), "utf8");
assert(rewardManager.includes("reserve(player, uniqueId)") && rewardManager.includes("pendingRewardsKey"));
assert(rewardManager.includes("grantBundle(player, bundle, uniqueId"), "dynamic crate rewards must use RewardManager");
const crateManager = readFileSync(join(bp, "scripts/rewards/LootCrateManager.js"), "utf8");
assert.equal(crateManager.includes("event.isFirstEvent === false"), false, "global isFirstEvent gate must not lock other crates");
assert(crateManager.includes("interactionKey") && crateManager.includes("player.id") && crateManager.includes("coordinateKey"), "crate interaction debounce must be scoped to player and coordinate");
assert(crateManager.includes("lootCrateStatePrefix") && crateManager.includes("readyAt"), "crate cooldown must persist across restart");
assert(crateManager.includes("consumeRequiredKey") && crateManager.includes("selectedSlotIndex"), "mythic supply-card gate missing");
assert(crateManager.includes("held?.nameTag") && crateManager.includes("heldName !== requiredName"), "ordinary echo shards must not open mythic crates");
const cratePools = readFileSync(join(bp, "scripts/rewards/lootCratePools.js"), "utf8");
assert(cratePools.includes('"test_gun:blueprint_mgl"') && cratePools.includes('weight: 70'), "70% MGL blueprint reward missing");
assert(cratePools.includes('"test_gun:blueprint_riot_shield"') && cratePools.includes('weight: 30'), "30% riot shield blueprint reward missing");
assert(cratePools.includes('requiredKey: { id: "minecraft:echo_shard"'), "vanilla supply-card placeholder missing");
for (const tier of ["common", "rare", "epic", "legendary", "mythic"]) {
  assert.equal(json(join(bp, `blocks/loot_crate_${tier}.json`))["minecraft:block"].description.identifier, `daily:loot_crate_${tier}`);
  assert(json(join(bp, `blocks/loot_crate_${tier}.json`))["minecraft:block"].components["minecraft:custom_components"].includes("daily:loot_crate_interact"));
}
assert(json(join(rp, "textures/terrain_texture.json")).texture_data.daily_crate_common);
assert(json(join(rp, "textures/terrain_texture.json")).texture_data.daily_crate_mythic);
for (const texture of ["common", "rare", "epic", "legendary", "opened"]) {
  const png = readFileSync(join(rp, `textures/blocks/daily_crate_${texture}.png`));
  assert.equal(png.readUInt32BE(16), 32, `${texture} crate texture width must be 32`);
  assert.equal(png.readUInt32BE(20), 32, `${texture} crate texture height must be 32`);
}

const dungeonTemplates = await import(`file://${join(bp, "scripts/dungeons/dungeonTemplates.js")}`);
const clinic = dungeonTemplates.DUNGEON_TEMPLATES.abandoned_clinic;
assert.deepEqual(clinic.structureSize, { x: 55, y: 25, z: 105 });
assert.equal(clinic.structures.length, 6);
assert.equal(clinic.spawnPoints.length, 10);
assert.equal(clinic.checkpoints.length, 4);
assert.equal(clinic.stages.length, 9);
assert.equal(clinic.stages.filter(stage => stage.type === "checkpoint").length, 4);
assert.deepEqual(Object.keys(dungeonTemplates.DUNGEON_TEMPLATES), ["newcomer_valley", "outpost_defense", "storm_rescue", "convoy_escort", "abandoned_clinic"]);
const tutorial = dungeonTemplates.DUNGEON_TEMPLATES.newcomer_valley;
assert.equal(tutorial.oneTimeReward, true);
assert.equal(tutorial.maxPlayers, 1);
assert.equal(tutorial.rewardId, "dungeon_newcomer_valley");
assert(tutorial.stages.some(stage => stage.loadout?.some(item => item.id === "test_gun:ak74u")), "tutorial common AK74U loadout missing");
assert(tutorial.stages.some(stage => stage.loadout?.some(item => item.id === "test_gun:ammo_rifle")), "tutorial rifle ammo missing");
assert(tutorial.stages.some(stage => stage.vehicleId === "ab_ve:motorcycle"), "tutorial must use the current Apocalypse Vehicles motorcycle id");
for (const type of ["briefing", "eliminate", "checkpoint", "interact", "route", "defend", "disaster"]) assert(tutorial.stages.some(stage => stage.type === type), `tutorial stage type missing: ${type}`);
assert(dungeonTemplates.DUNGEON_TEMPLATES.storm_rescue.stages.some(stage => stage.type === "boss" && stage.groups.some(group => group.mobKey === "tyrant")), "rescue boss missing");
assert(dungeonTemplates.DUNGEON_TEMPLATES.storm_rescue.stages.some(stage => stage.escortEntity === "daily:survivor"), "rescue path escort missing");
assert(dungeonTemplates.DUNGEON_TEMPLATES.convoy_escort.stages.some(stage => stage.vehicleId === "ab_ve:truck"), "vehicle integration missing");
const routeWaveStages = Object.values(dungeonTemplates.DUNGEON_TEMPLATES).flatMap(template => template.stages).filter(stage => stage.type === "route" && stage.routeWaves?.length);
assert(routeWaveStages.length >= 4, "escort routes must include Left 4 Dead-style checkpoint hordes");
assert(routeWaveStages.flatMap(stage => stage.routeWaves).flatMap(wave => wave.groups).reduce((sum, group) => sum + group.count, 0) >= 80, "escort horde volume is too low");
for (const template of Object.values(dungeonTemplates.DUNGEON_TEMPLATES)) {
  const spawnPoints = new Map(template.spawnPoints.map(point => [point.id, point.offset]));
  for (const stage of template.stages.filter(value => value.type === "defend")) {
    assert(stage.defensePoint, `${template.id}/${stage.name} defense center missing`);
    const center = spawnPoints.get(stage.defensePoint);
    for (const group of stage.waves.flatMap(wave => wave.groups)) {
      const point = spawnPoints.get(group.spawnPoint);
      assert(Math.hypot(point.x - center.x, point.z - center.z) <= stage.defenseLeashRadius, `${template.id}/${stage.name} spawn is too far from defense center`);
    }
  }
}
assert(Object.values(dungeonTemplates.DUNGEON_TEMPLATES).slice(0, 4).every(template => template.structures.length >= 13), "new dungeons must be multi-structure maps");
for (const template of Object.values(dungeonTemplates.DUNGEON_TEMPLATES)) {
  for (const component of template.structures) {
    const relative = component.structureId.replace("daily_dungeon:", "");
    const dungeonStructure = readFileSync(join(bp, "structures", "daily_dungeon", `${relative}.mcstructure`));
    assert(dungeonStructure.length > 900, `${template.id}/${component.id} structure is missing or empty`);
    assert.equal(dungeonStructure.includes(Buffer.from("mcpe:")), false, `${template.id}/${component.id} must not depend on Deadzone custom blocks`);
  }
}
assert.equal(dungeonTemplates.DUNGEON_SLOTS.length, 4);
assert(dungeonTemplates.DUNGEON_SLOTS.every(slot => slot.origin.y === 250), "dungeon slots should remain in isolated high-altitude arenas");
const dungeonManager = readFileSync(join(bp, "scripts/dungeons/DungeonManager.js"), "utf8");
for (const marker of ["structure load", "loadStructureSet", "prepareArena", "spawnDungeonMobs", "checkpointReached", "tickDefense", "tickRoute", "tickRouteWaves", "emitObjectiveGuide", "minecraft:totem_particle", "minecraft:basic_flame_particle", "defenseLeashRadius", "tickDisaster", "onBlockInteract", "oneTimeReward", "completionKey", "RewardManager.grant", "minimumContribution", "daily_in_dungeon", "returnLocation"]) {
  assert(dungeonManager.includes(marker), `missing dungeon behavior: ${marker}`);
}
assert.equal(dungeonManager.includes("正在重新部署"), false, "dungeon must use direct confirmed spawning instead of two async retries");
assert(integration.includes("spawnDungeonMobs") && integration.includes("spawnExact"), "direct confirmed dungeon spawning missing");
assert(rewards.includes("dungeon_abandoned_clinic"), "clinic reward is missing");
for (const reward of ["dungeon_newcomer_valley", "dungeon_outpost_defense", "dungeon_storm_rescue", "dungeon_convoy_escort"]) assert(rewards.includes(reward), `missing dungeon reward: ${reward}`);
for (const reward of ["event_fog_man_hunt", "event_goatman_hunt", "event_siren_head_hunt", "event_rebel_invasion"]) assert(rewards.includes(reward), `missing news event reward: ${reward}`);
assert(readFileSync(join(bp, "scripts/ui/DailyMenu.js"), "utf8").includes("进入副本行动"));
const dungeonMenu = readFileSync(join(bp, "scripts/ui/DungeonMenu.js"), "utf8");
assert(dungeonMenu.includes("isUserBusy") && dungeonMenu.includes("result.canceled") && dungeonMenu.includes("attempt < 8"), "dungeon menu must retry UserBusy cancellation results");
assert(dungeonMenu.includes("Object.values(DUNGEON_TEMPLATES)") && dungeonMenu.includes("首次奖励已领·可重玩"), "dungeon menu must list every template and one-time completion state");
assert(readFileSync(join(bp, "scripts/main.js"), "utf8").includes("DungeonManager.tick"));
assert(readFileSync(join(bp, "scripts/main.js"), "utf8").includes("DungeonManager.onBlockInteract"), "dungeon crate interaction must be forwarded from both interaction paths");
const eventNodes = readFileSync(join(bp, "scripts/events/EventNodeRegistry.js"), "utf8");
assert(eventNodes.includes("addAt") && eventNodes.includes("normalizeLocation") && eventNodes.includes("resolveGround"), "manual event coordinates and ground validation missing");
assert(dailyMenu.includes("联盟每日新闻") && dailyMenu.includes("startNewsEvent") && dailyMenu.includes("configureNewsEvent") && dailyMenu.includes("X 坐标") && dailyMenu.includes("Z 坐标"), "daily news/manual coordinate UI missing");

const sapiIntegration = readFileSync(join(repo, "sapi_server_addon/sapi_server_bp/scripts/modules/integration.js"), "utf8");
const sapiMenu = readFileSync(join(repo, "sapi_server_addon/sapi_server_bp/scripts/modules/server_menu.js"), "utf8");
const apocSpawn = readFileSync(join(repo, "apocalypse_mobs_addon/apocalypse_mobs_bp/scripts/spawnDirector.js"), "utf8");
assert(sapiIntegration.includes("recordDailySale") && sapiMenu.includes("daily:menu"), "SAPI bridge missing");
assert(readFileSync(join(bp, "scripts/main.js"), "utf8").includes("__sapi_player__"), "SAPI event sender fallback missing");
assert(apocSpawn.includes("processExternalRequests") && apocSpawn.includes("externalSpawnRequestsKey"), "SpawnDirector bridge missing");
assert(apocSpawn.includes('request.placement === "exact"'), "SpawnDirector fixed dungeon placement missing");

console.log("Survival Daily & World Events validation passed.");
