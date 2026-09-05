import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "story_bp");
const repo = resolve(root, "..");

function files(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

for (const path of files(bp).filter(path => path.endsWith(".json"))) {
  assert.doesNotThrow(() => JSON.parse(readFileSync(path, "utf8")), `invalid JSON: ${path}`);
}

for (const path of files(join(bp, "scripts")).filter(path => extname(path) === ".js")) {
  const source = readFileSync(path, "utf8");
  for (const match of source.matchAll(/from\s+"(\.[^"]+)"/g)) {
    assert(statSync(resolve(dirname(path), match[1])).isFile(), `missing relative import ${match[1]} from ${path}`);
  }
}

const manifest = JSON.parse(readFileSync(join(bp, "manifest.json"), "utf8"));
assert.deepEqual(manifest.header.version, [0, 1, 0]);
assert.equal(manifest.modules.find(value => value.type === "script")?.entry, "scripts/main.js");
assert(manifest.modules.some(value => value.type === "data"), "story behavior pack data module missing");
assert.equal(manifest.dependencies.some(value => value.uuid), false, "story must not hard-depend on SAPI or Daily pack UUIDs");

const manager = readFileSync(join(bp, "scripts/StoryManager.js"), "utf8");
for (const marker of ["not_started", "rendezvous", "ready_dungeon", "in_dungeon", "complete", "daily:dungeon_start", "dailyHeartbeatKey", "setEntryHere", "objectiveReminderTicks", "minecraft:totem_particle"]) {
  assert(manager.includes(marker), `missing story behavior marker: ${marker}`);
}
assert.equal(manager.includes("onScreenDisplay.setActionBar"), false, "story must not occupy the Test Gun action bar");

const storyMain = readFileSync(join(bp, "scripts/main.js"), "utf8");
for (const command of ["story:menu", "story:start", "story:status", "story:reset", "story:set_entry", "story:dungeon_complete"]) {
  assert(storyMain.includes(command), `missing story command: ${command}`);
}

const dailyMain = readFileSync(join(repo, "daily_world_events_addon/daily_events_bp/scripts/main.js"), "utf8");
const dungeonManager = readFileSync(join(repo, "daily_world_events_addon/daily_events_bp/scripts/dungeons/DungeonManager.js"), "utf8");
assert(dailyMain.includes('id === "daily:dungeon_start"') && dailyMain.includes("DungeonManager.start(player, templateId)"), "Daily direct dungeon bridge missing");
assert(dungeonManager.includes("scriptevent story:dungeon_complete"), "Daily completion notification missing");

console.log("Apocalypse Story MVP validation passed.");
