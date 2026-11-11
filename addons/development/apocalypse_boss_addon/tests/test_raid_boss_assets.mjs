import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "apocalypse_boss_bp");
const rp = join(root, "apocalypse_boss_rp");
const readJson = path => JSON.parse(readFileSync(path, "utf8"));
const listJson = directory => readdirSync(directory).filter(name => name.endsWith(".json"));

/* ---------------------------------------------------------------- manifests */
const bpManifest = readJson(join(bp, "manifest.json"));
const rpManifest = readJson(join(rp, "manifest.json"));
assert.deepEqual(bpManifest.header.min_engine_version, [1, 26, 10]);
// Entity properties with client_sync (used by the imported animation controllers)
// need an engine that supports them; this must stay >= 1.21.90.
assert(bpManifest.header.min_engine_version[0] > 1 || bpManifest.header.min_engine_version[1] >= 21);

/* --------------------------------------------------- imported boss contract */
const RAID_IDS = ["apoc_boss:sandworm", "apoc_boss:abomination"];
const RAID_HP = { "apoc_boss:sandworm": 16000, "apoc_boss:abomination": 26000 };
const RAID_LOOT = { "apoc_boss:sandworm": "loot_tables/raid/sandworm.json", "apoc_boss:abomination": "loot_tables/raid/abomination.json" };

const behaviorEntities = new Map();
for (const name of listJson(join(bp, "entities"))) {
  const source = readJson(join(bp, "entities", name));
  const identifier = source["minecraft:entity"]?.description?.identifier;
  if (identifier) behaviorEntities.set(identifier, source["minecraft:entity"]);
}

for (const id of RAID_IDS) {
  const entity = behaviorEntities.get(id);
  assert(entity, `behavior entity missing: ${id}`);
  assert.equal(entity.components["minecraft:health"]?.max, RAID_HP[id], `${id} raid HP`);
  assert.equal(entity.components["minecraft:loot"]?.table, RAID_LOOT[id], `${id} loot table`);
  assert(existsSync(join(bp, RAID_LOOT[id])), `${id} loot table file missing`);
  assert(entity.components["minecraft:type_family"]?.family?.includes("apoc_boss"), `${id} apoc_boss family`);
  assert(entity.components["minecraft:boss"], `${id} boss bar`);
  // Raid bosses must stay damageable: no blanket "deals_damage: no" sensor.
  const sensor = JSON.stringify(entity.components["minecraft:damage_sensor"] ?? {});
  assert.equal(sensor.includes('"cause":"all","deals_damage":"no"'), false, `${id} must be damageable`);
  // Raid armor rating is applied by script; the reader caps at 40.
  assert(entity.description.properties?.["bf_bossesrise:state_id"] !== undefined || entity.description.properties?.["bf_bossesrise:state"] !== undefined, `${id} animation properties`);
}

// The sandworm body is a ~60 block long serpent offset from the entity origin;
// its hit test volumes must follow the body, not just the origin collision box.
const sandwormEntity = behaviorEntities.get("apoc_boss:sandworm");
const sandwormHitboxes = sandwormEntity.components["minecraft:custom_hit_test"]?.hitboxes ?? [];
assert(sandwormHitboxes.length >= 10, "sandworm needs body-length custom hit test volumes");
assert(sandwormHitboxes.some(box => (box.pivot?.[2] ?? 0) <= -24) && sandwormHitboxes.some(box => (box.pivot?.[2] ?? 0) >= 24), "sandworm hitboxes must span the body");
const abominationHitboxes = behaviorEntities.get("apoc_boss:abomination").components["minecraft:custom_hit_test"]?.hitboxes ?? [];
assert(abominationHitboxes.length >= 1, "abomination needs upper-body hit test volumes");

/* -------------------------------------------------- RP client / asset closure */
const allText = directory => listJson(directory).map(name => readFileSync(join(rp, directory, name), "utf8"));
const animations = new Map();
for (const directory of ["animations", "animations/bf/bossesrise", "animations/apoc", "animations/apoc_original"]) {
  const path = join(rp, directory);
  if (!existsSync(path)) continue;
  for (const name of listJson(path)) {
    const source = readJson(join(path, name));
    for (const key of Object.keys(source.animations ?? {})) animations.set(key, name);
  }
}
const geometries = new Set();
for (const candidate of ["models/entity", "models/entity/sandworm"]) {
  const directory = join(rp, candidate);
  if (!existsSync(directory)) continue;
  for (const name of listJson(directory)) {
    const source = readJson(join(directory, name));
    for (const geometry of source["minecraft:geometry"] ?? []) if (geometry.description?.identifier) geometries.add(geometry.description.identifier);
  }
}
const particles = new Set();
for (const candidate of ["particles", "particles/bf/bossesrise/sandworm"]) {
  const directory = join(rp, candidate);
  if (!existsSync(directory)) continue;
  for (const name of listJson(directory)) {
    const match = /"identifier"\s*:\s*"([^"]+)"/.exec(readFileSync(join(directory, name), "utf8"));
    if (match) particles.add(match[1]);
  }
}
const renderControllers = new Set();
for (const name of listJson(join(rp, "render_controllers"))) {
  const source = readJson(join(rp, "render_controllers", name));
  for (const key of Object.keys(source.render_controllers ?? {})) renderControllers.add(key);
}
const animationControllers = new Set();
for (const candidate of ["animation_controllers", "animation_controllers/bf"]) {
  const directory = join(rp, candidate);
  if (!existsSync(directory)) continue;
  for (const name of listJson(directory)) {
    const source = readJson(join(directory, name));
    for (const key of Object.keys(source.animation_controllers ?? {})) animationControllers.add(key);
  }
}

const soundDefinitions = readJson(join(rp, "sounds/sound_definitions.json")).sound_definitions;

const clientEntities = new Map();
for (const directory of ["entity", "entity/sandworm"]) {
  const path = join(rp, directory);
  if (!existsSync(path)) continue;
  for (const name of listJson(path)) {
    const source = readJson(join(path, name));
    const description = source["minecraft:client_entity"]?.description;
    if (description?.identifier) clientEntities.set(description.identifier, description);
  }
}

for (const id of RAID_IDS) {
  const description = clientEntities.get(id);
  assert(description, `client entity missing: ${id}`);
  assert(description.spawn_egg, `${id} spawn egg`);
  for (const [slot, geometry] of Object.entries(description.geometry ?? {})) {
    assert(geometries.has(geometry), `${id} ${slot} geometry missing: ${geometry}`);
  }
  for (const [slot, texture] of Object.entries(description.textures ?? {})) {
    assert(existsSync(join(rp, `${texture}.png`)), `${id} ${slot} texture missing: ${texture}.png`);
  }
  for (const renderController of description.render_controllers ?? []) {
    if (typeof renderController !== "string") continue;
    assert(renderControllers.has(renderController) || renderController.startsWith("controller.render.default"), `${id} render controller missing: ${renderController}`);
  }
  for (const [slot, animation] of Object.entries(description.animations ?? {})) {
    if (animation.startsWith("controller.")) {
      assert(animationControllers.has(animation), `${id} ${slot} controller missing: ${animation}`);
      continue;
    }
    assert(animations.has(animation), `${id} ${slot} animation missing: ${animation}`);
  }
  for (const [slot, sound] of Object.entries(description.sound_effects ?? {})) {
    assert(soundDefinitions[sound], `${id} ${slot} sound definition missing: ${sound}`);
  }
  for (const [slot, particle] of Object.entries(description.particle_effects ?? {})) {
    assert(particles.has(particle), `${id} ${slot} particle missing: ${particle}`);
  }
}

/* --------------------------------------------------------- sound file paths */
for (const [key, definition] of Object.entries(soundDefinitions)) {
  if (!key.startsWith("bf_bossesrise.")) continue;
  for (const sound of definition.sounds ?? []) {
    const path = typeof sound === "string" ? sound : sound.name;
    if (!path) continue;
    const full = join(rp, `${path}.ogg`);
    assert(existsSync(full), `sound file missing for ${key}: ${path}.ogg`);
  }
}

console.log(`Raid boss asset validation passed (${RAID_IDS.length} bosses, ${animations.size} animations, ${geometries.size} geometries, ${particles.size} particles).`);
