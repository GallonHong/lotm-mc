import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "../../..");
const bp = join(root, "apocalypse_life_bp");
const rp = join(root, "apocalypse_life_rp");
const json = path => JSON.parse(readFileSync(path, "utf8"));
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
});

const bpManifest = json(join(bp, "manifest.json"));
const rpManifest = json(join(rp, "manifest.json"));
assert.deepEqual(bpManifest.header.version, [1, 3, 0]);
assert.deepEqual(rpManifest.header.version, [1, 3, 0]);
assert.equal(bpManifest.header.uuid, "bfab646c-b627-4312-adec-ec8b34af5061", "BP UUID must preserve old worlds");
assert.equal(rpManifest.header.uuid, "f179a256-053b-4d7f-9c03-d92f26ffb083", "RP UUID must preserve old worlds");
assert.ok(bpManifest.header.name.includes("Apocalypse Life"));
assert.ok(rpManifest.header.name.includes("Apocalypse Life"));
assert.ok(bpManifest.dependencies.some(value => value.uuid === rpManifest.header.uuid && value.version.join(".") === "1.3.0"));

const recipe = name => join(bp, "recipes/vehicles", `recipe_blueprint_${name}.json`);
for (const craftable of ["motorcycle", "speedboat"]) assert(existsSync(recipe(craftable)), `${craftable} blueprint must remain craftable`);
for (const shopOnly of ["truck", "ambulance", "helicopter"]) assert.equal(existsSync(recipe(shopOnly)), false, `${shopOnly} blueprint must be shop-only`);

const pianoItemPath = join(bp, "items/piano.json");
const pianoLeftPath = join(bp, "blocks/piano_left.json");
const pianoRightPath = join(bp, "blocks/piano_right.json");
assert.equal(json(pianoItemPath)["minecraft:item"].description.identifier, "xypiano:piano_item");
assert.equal(json(pianoLeftPath)["minecraft:block"].description.identifier, "xypiano:piano_left");
assert.equal(json(pianoRightPath)["minecraft:block"].description.identifier, "xypiano:piano_right");
for (const blockPath of [pianoLeftPath, pianoRightPath]) {
    const block = json(blockPath)["minecraft:block"];
    assert.ok(block.components["minecraft:custom_components"].includes("xypiano:piano_block"));
    assert.equal(block.components["minecraft:loot"], "loot_tables/piano.json");
}

for (const recipePath of walk(join(bp, "recipes")).filter(path => path.endsWith(".json"))) {
    assert.equal(readFileSync(recipePath, "utf8").includes("xypiano:piano_item"), false, `piano must not be craftable: ${recipePath}`);
}

const main = readFileSync(join(bp, "scripts/main.js"), "utf8");
const pianoSystem = readFileSync(join(bp, "scripts/piano/PianoSystem.js"), "utf8");
assert.match(main, /PianoSystem\.init\(\)/);
for (const marker of ["xypiano:placer", "xypiano:piano_block", "openKeyboard", "openMelodyInput", "openSongLibrary", "startQueue", "loadQueueEntry", "连续播放全部", "tickPlayers"]) {
    assert.ok(pianoSystem.includes(marker), `missing piano behavior ${marker}`);
}
assert.equal(pianoSystem.includes("CustomForm"), false, "unstable DDUI must not be imported into Apocalypse Life");
assert.equal(pianoSystem.includes("Observable"), false, "unstable DDUI observables must not be imported");

const songsDir = join(bp, "scripts/piano/songs");
const songIndex = readFileSync(join(songsDir, "index.js"), "utf8");
const songIds = readdirSync(songsDir).filter(name => /^[a-f0-9]+\.js$/.test(name)).map(name => name.slice(0, -3));
assert.equal(songIds.length, 6, "all six embedded MIDI songs must be present");
for (const id of songIds) assert.ok(existsSync(join(songsDir, `${id}.js`)), `missing embedded song ${id}`);
assert.equal(songIndex.includes("import("), false, "stable build must not depend on runtime dynamic import");

const itemTextures = json(join(rp, "textures/item_texture.json")).texture_data;
const terrainTextures = json(join(rp, "textures/terrain_texture.json")).texture_data;
assert.equal(itemTextures["piano:piano_item"].textures, "textures/items/piano_item");
assert.equal(terrainTextures["piano:texture"].textures, "textures/blocks/piano");
assert.ok(existsSync(join(rp, `${itemTextures["piano:piano_item"].textures}.png`)));
assert.ok(existsSync(join(rp, `${terrainTextures["piano:texture"].textures}.png`)));

const attachable = json(join(rp, "attachables/piano.attachable.json"))["minecraft:attachable"].description;
assert.equal(attachable.identifier, "xypiano:piano_item");
assert.equal(attachable.geometry.default, "geometry.piano_item");
for (const geometry of ["piano.geo.json", "piano_left.geo.json", "piano_right.geo.json"]) {
    assert.ok(existsSync(join(rp, "models/blocks", geometry)), `missing piano geometry ${geometry}`);
}
const animations = json(join(rp, "animations/piano.animation.json")).animations;
assert.ok(animations[attachable.animations.hold_first_person]);
assert.ok(animations[attachable.animations.hold_third_person]);

const definitions = json(join(rp, "sounds/sound_definitions.json")).sound_definitions;
const pianoSounds = Object.entries(definitions).filter(([id]) => id.startsWith("piano"));
assert.equal(pianoSounds.length, 90, "all 90 piano sample definitions must be merged");
for (const [id, definition] of pianoSounds) {
    assert.ok(definition.sounds.length, `${id} has no sound file`);
    for (const sound of definition.sounds) {
        const path = typeof sound === "string" ? sound : sound.name;
        assert.ok(existsSync(join(rp, `${path}.ogg`)), `missing sound asset ${path}.ogg`);
    }
}

assert.ok(existsSync(join(repo, "addons/reference/钢琴_原始包_v1.3.0.mcaddon")), "uploaded source piano archive must be preserved");
const build = readFileSync(join(root, "build.sh"), "utf8");
for (const marker of ["apocalypse_life_bp", "apocalypse_life_rp", "Apocalypse_Life_Addon_v1.3.0.mcaddon"]) assert.ok(build.includes(marker));
assert.equal(build.includes("Apocalypse_Vehicles"), false);
console.log("Apocalypse Life v1.3.0 validation passed.");
