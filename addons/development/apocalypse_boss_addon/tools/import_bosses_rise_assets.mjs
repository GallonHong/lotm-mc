/**
 * Import two Bosses Rise (Block Factory) raid bosses into Apocalypse Boss.
 *
 * Source add-on is treated as read-only third-party reference: model, texture,
 * animation, particle and sound files are copied byte-for-byte to the same
 * relative paths, and their internal identifiers (geometry.*, animation.*,
 * bf_bossesrise:* particle ids, sound keys) are left untouched.
 *
 * What this script generates:
 *  - RP assets (models/animations/AC/RC/entity textures/particles/sounds)
 *  - RP client entities (source copy, only identifier + spawn egg patched)
 *  - BP behavior entities (source copy, patched for Apocalypse combat contract)
 *  - sound_definitions.json entries for both bosses
 *
 * Usage: node tools/import_bosses_rise_assets.mjs [--source <dir>]
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const addonRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(addonRoot, "../../..");
const defaultSource = join(repoRoot, "addons/reference/[汉化]Bosses Rise Add-On");
const argIndex = process.argv.indexOf("--source");
const sourceRoot = argIndex >= 0 ? resolve(process.argv[argIndex + 1]) : defaultSource;
const bpSrc = join(sourceRoot, "Bosses Rise Add-On BP");
const rpSrc = join(sourceRoot, "Bosses Rise Add-On RP");
const bpDst = join(addonRoot, "apocalypse_boss_bp");
const rpDst = join(addonRoot, "apocalypse_boss_rp");

if (!existsSync(bpSrc)) {
  console.error(`[import] source pack not found: ${bpSrc}`);
  process.exit(1);
}

const copied = [];
const skipped = [];

function copyFrom(srcRoot, dstRoot, relative) {
  const from = join(srcRoot, relative);
  const to = join(dstRoot, relative);
  if (!existsSync(from)) {
    skipped.push(relative);
    return false;
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  copied.push(relative);
  return true;
}

function copyDir(srcRoot, dstRoot, relative) {
  const from = join(srcRoot, relative);
  if (!existsSync(from)) {
    skipped.push(relative);
    return;
  }
  for (const entry of readdirSync(from)) {
    const child = `${relative}/${entry}`;
    if (statSync(join(srcRoot, child)).isDirectory()) copyDir(srcRoot, dstRoot, child);
    else copyFrom(srcRoot, dstRoot, child);
  }
}

/* ---------------------------------------------------------------- RP assets */
const rpFiles = [
  "models/entity/sandworm.geo.json",
  "models/entity/abomination.geo.json",
  "animations/sandworm.animation.json",
  "animations/abomination.animation.json",
  "animations/abomination_hit_overlay.json",
  "animation_controllers/sandworm.json",
  "animation_controllers/abomination.ac.json",
  "render_controllers/sandworm.rc.json",
  "textures/bf/bossesrise/entity/sandworm.png",
  "textures/bf/bossesrise/entity/abomination.png",
];
for (const file of rpFiles) copyFrom(rpSrc, rpDst, file);

copyDir(rpSrc, rpDst, "sounds/bf/bossesrise/sandworm");
copyDir(rpSrc, rpDst, "sounds/bf/bossesrise/abomination");

/* ------------------------------------------------------------- particle deps */
const particleFiles = [
  // abomination (mapped by RP/entity/abomination.json particle_effects + combat use)
  "particles/abomination_circle.particle.json",
  "particles/abomination_golden_aura.particle.json",
  "particles/abomination_impact_dust.particle.json",
  "particles/abomination_impact_dust_small.particle.json",
  "particles/abomination_roar.particle.json",
  "particles/attack.particle.json",
  "particles/charge_run.particle.json",
  "particles/hand_smash.particle.json",
  "particles/rampage_1.particle.json",
  "particles/rampage_2.particle.json",
  "particles/scream_1.particle.json",
  "particles/scream_2.particle.json",
  "particles/smash_1.particle.json",
  "particles/smash_2.particle.json",
  "particles/smash_3.particle.json",
  "particles/spawn_1.particle.json",
  "particles/spawn_2.particle.json",
  "particles/spawn_3.particle.json",
  "particles/walk.particle.json",
  "particles/death_1.particle.json",
  "particles/death_2.particle.json",
  "particles/end_abomination_trophy_light.particle.json",
  "particles/line.particle.json",
  "particles/point.particle.json",
];
// sandworm particle effect ids referenced by RP/entity/sandworm.json + combat use
for (const name of [
  "sand_rock", "sand_rock_path", "sand_rock_path_smoke", "sand_rock_smoke",
  "Sirok_charge_path", "Sirok_dive1", "Sirok_dive2", "Sirok_dive3",
  "Sirok_dust_trail", "Sirok_dust_trail1", "Sirok_earthquake_warning",
  "Sirok_earthquake_zone", "Sirok_lock", "Sirok_roar", "Sirok_roar_short",
  "Sirok_rocks_directional",
  "Sirok_rocks_wide", "Sirok_saliva", "Sirok_saliva_short", "Sirok_vulnerability",
  "earthquake_shockwave_bright", "earthquake_splash", "knockback_hit",
  "poison_aoe", "poison_bubble", "poison_drop", "poison_fog",
]) {
  particleFiles.push(`particles/bf/bossesrise/sandworm/${name}.particle.json`);
}

const seenParticleIds = new Set();
const particleTextures = new Set();
for (const relative of particleFiles) {
  const from = join(rpSrc, relative);
  if (!existsSync(from)) { skipped.push(relative); continue; }
  const text = readFileSync(from, "utf8");
  const idMatch = /"identifier"\s*:\s*"([^"]+)"/.exec(text);
  const id = idMatch ? idMatch[1] : relative;
  if (seenParticleIds.has(id)) { skipped.push(`${relative} (duplicate id ${id})`); continue; }
  seenParticleIds.add(id);
  copyFrom(rpSrc, rpDst, relative);
  for (const [, texture] of text.matchAll(/"texture"\s*:\s*"([^"]+)"/g)) {
    const tex = texture.endsWith(".png") ? texture : `${texture}.png`;
    if (tex.startsWith("textures/") && existsSync(join(rpSrc, tex))) particleTextures.add(tex);
  }
}
for (const texture of particleTextures) copyFrom(rpSrc, rpDst, texture);

/* ------------------------------------------------------- sound_definitions */
const soundSrc = JSON.parse(readFileSync(join(rpSrc, "sounds/sound_definitions.json"), "utf8"));
const soundDstPath = join(rpDst, "sounds/sound_definitions.json");
const soundDst = JSON.parse(readFileSync(soundDstPath, "utf8"));
const wantedSoundKeys = Object.keys(soundSrc.sound_definitions).filter(key =>
  (key.startsWith("bf_bossesrise.abomination") || key.startsWith("bf_bossesrise.sandworm.")) &&
  !/main_music|music_loop/.test(key));
let addedSounds = 0;
for (const key of wantedSoundKeys) {
  if (soundDst.sound_definitions[key]) continue;
  soundDst.sound_definitions[key] = soundSrc.sound_definitions[key];
  addedSounds++;
}
writeFileSync(soundDstPath, `${JSON.stringify(soundDst, null, 1)}\n`);

/* ---------------------------------------------------------- client entities */
function writeClientEntity(relativeSource, relativeTarget, { id, spawnEgg, dropAnimations = [], dropAnimate = [] }) {
  const source = JSON.parse(readFileSync(join(rpSrc, relativeSource), "utf8"));
  const description = source["minecraft:client_entity"].description;
  description.identifier = id;
  if (spawnEgg) description.spawn_egg = spawnEgg;
  for (const key of dropAnimations) delete description.animations?.[key];
  description.scripts.animate = description.scripts.animate.filter(entry =>
    typeof entry === "string" ? !dropAnimate.includes(entry) : true);
  const target = join(rpDst, relativeTarget);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(source, null, 1)}\n`);
}

writeClientEntity("entity/sandworm.json", "entity/sandworm.entity.json", {
  id: "apoc_boss:sandworm",
  spawnEgg: { base_color: "#c9a227", overlay_color: "#5b4324" },
});
writeClientEntity("entity/abomination.json", "entity/abomination.entity.json", {
  id: "apoc_boss:abomination",
  spawnEgg: { base_color: "#3a1f3d", overlay_color: "#94d14f" },
  dropAnimations: ["scale_0"],
  dropAnimate: ["scale_0"],
});

/* ------------------------------------------------------------ BP entities */
const ourTemplate = JSON.parse(readFileSync(join(bpDst, "entities/mutant_zombie.json"), "utf8"))["minecraft:entity"];
const templateComponents = ourTemplate.components;

function standardBehaviors(reachMultiplier, meleePrioritySpeed = 1.2) {
  return {
    "minecraft:behavior.nearest_attackable_target": {
      priority: 1, must_see: false, within_radius: 64.0,
      entity_types: [
        { filters: { test: "is_family", subject: "other", value: "player" }, max_dist: 64 },
        { filters: { test: "is_family", subject: "other", value: "irongolem" }, max_dist: 48 },
      ],
    },
    "minecraft:behavior.hurt_by_target": { priority: 2 },
    "minecraft:behavior.melee_attack": { priority: 3, speed_multiplier: meleePrioritySpeed, track_target: true, reach_multiplier: reachMultiplier },
    "minecraft:behavior.random_stroll": { priority: 7, speed_multiplier: 0.8 },
    "minecraft:behavior.look_at_player": { priority: 8, look_distance: 12 },
    "minecraft:behavior.random_look_around": { priority: 9 },
  };
}

function buildRaidEntity(sourceRelative, config) {
  const sourceFile = JSON.parse(readFileSync(join(bpSrc, sourceRelative), "utf8"));
  const source = sourceFile["minecraft:entity"];
  const properties = source.description.properties ?? {};
  const extra = config.extraComponents ?? {};
  const entity = {
    description: {
      identifier: config.id,
      is_spawnable: true,
      is_summonable: true,
      is_experimental: false,
      ...(Object.keys(properties).length ? { properties } : {}),
    },
    components: {
      "minecraft:is_hidden_when_invisible": {},
      "minecraft:nameable": { always_show: true },
      "minecraft:health": { value: config.hp, max: config.hp },
      "minecraft:boss": { name: config.name, should_darken_sky: config.darkenSky ?? false, hud_range: 64 },
      "minecraft:knockback_resistance": { value: 1.0 },
      "minecraft:collision_box": config.collision,
      "minecraft:movement": { value: config.movement },
      "minecraft:navigation.walk": templateComponents["minecraft:navigation.walk"],
      "minecraft:movement.basic": {},
      "minecraft:jump.static": {},
      "minecraft:can_climb": {},
      "minecraft:attack": { damage: config.attackDamage },
      "minecraft:damage_sensor": templateComponents["minecraft:damage_sensor"],
      "minecraft:experience_reward": { on_death: String(config.xp) },
      "minecraft:loot": { table: config.loot },
      "minecraft:type_family": { family: config.families },
      "minecraft:physics": {},
      "minecraft:pushable": { is_pushable: false, is_pushable_by_piston: false },
      "minecraft:persistent": {},
      "minecraft:follow_range": { value: 64, max: 64 },
      ...extra,
      ...standardBehaviors(config.reachMultiplier ?? 1.6),
    },
  };
  const target = join(bpDst, "entities", config.file);
  writeFileSync(target, `${JSON.stringify({ format_version: sourceFile.format_version ?? "1.21.90", "minecraft:entity": entity }, null, 1)}\n`);
}

buildRaidEntity("entities/boss/sandworm.json", {
  file: "sandworm.json",
  id: "apoc_boss:sandworm",
  name: "斯洛克 · 巨型沙虫",
  hp: 16000,
  attackDamage: 24,
  xp: 3000,
  loot: "loot_tables/raid/sandworm.json",
  movement: 0.3,
  collision: { width: 5.0, height: 5.0 },
  families: ["monster", "boss", "apoc_boss", "sandworm"],
  reachMultiplier: 2.2,
  extraComponents: {
    "minecraft:breathable": {},
    "minecraft:body_rotation_always_follows_head": {},
    "minecraft:scale": { value: 1.0 },
    // The model is a ~60 block long serpent lying along local z (bone pivots z=-30..+31, y≈2).
    // A single collision box only covers the origin, so attacks aimed at the body missed.
    // These hit-test volumes follow the body line and rotate with the entity.
    "minecraft:custom_hit_test": {
      hitboxes: [-30, -24, -18, -12, -6, 0, 6, 12, 18, 24, 30].map((z) => ({ width: 8, height: 8, pivot: [0, 2, z] })),
    },
  },
});

buildRaidEntity("entities/boss/abomination.json", {
  file: "abomination.json",
  id: "apoc_boss:abomination",
  name: "莫加苏尔",
  hp: 26000,
  attackDamage: 32,
  xp: 5000,
  loot: "loot_tables/raid/abomination.json",
  movement: 0.28,
  collision: { width: 7.0, height: 10.0 },
  families: ["monster", "boss", "apoc_boss", "end", "abomination"],
  reachMultiplier: 2.4,
  darkenSky: true,
  extraComponents: {
    // Torso/head coverage above the (floating) collision box baseline.
    "minecraft:custom_hit_test": {
      hitboxes: [
        { width: 9, height: 9, pivot: [0, 5, 0] },
        { width: 7, height: 7, pivot: [0, 11, 0] },
      ],
    },
  },
});

/* --------------------------------------------------------------- report */
console.log(`[import] source: ${sourceRoot}`);
console.log(`[import] copied ${copied.length} files, skipped ${skipped.length}`);
if (skipped.length) console.log(`[import] skipped: ${skipped.join(", ")}`);
console.log(`[import] sound definitions added: ${addedSounds}`);
console.log("[import] done");
