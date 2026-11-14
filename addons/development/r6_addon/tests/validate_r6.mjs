// R6 Siege Bedrock addon - static validation (run: node tests/validate_r6.mjs)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const BP = path.join(ROOT, "r6_bp");
const RP = path.join(ROOT, "r6_rp");

let errors = [];
let warnings = [];
const fail = msg => errors.push(msg);
const warn = msg => warnings.push(msg);

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

function readJson(p) {
    try {
        return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (e) {
        fail(`JSON parse failed: ${path.relative(ROOT, p)} - ${e.message}`);
        return null;
    }
}

const bpFiles = walk(BP);
const rpFiles = walk(RP);
const allJson = [...bpFiles, ...rpFiles].filter(p => p.endsWith(".json"));

// ---------------------------------------------------------------- manifests
const bpManifest = readJson(path.join(BP, "manifest.json"));
const rpManifest = readJson(path.join(RP, "manifest.json"));
if (!bpManifest || !rpManifest) fail("missing manifests");
else {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(bpManifest.header.uuid)) fail("BP header uuid invalid");
    if (!uuidRe.test(rpManifest.header.uuid)) fail("RP header uuid invalid");
    if (bpManifest.header.uuid === rpManifest.header.uuid) fail("BP/RP header uuids collide");
    const bpDepRp = (bpManifest.dependencies ?? []).find(d => d.uuid === rpManifest.header.uuid);
    if (!bpDepRp) fail("BP does not depend on RP uuid");
    const rpDepBp = (rpManifest.dependencies ?? []).find(d => d.uuid === bpManifest.header.uuid);
    if (!rpDepBp) fail("RP does not depend on BP uuid");
    const scriptModule = (bpManifest.modules ?? []).find(m => m.type === "script");
    if (!scriptModule) fail("BP script module missing");
    else {
        const entryPath = path.join(BP, scriptModule.entry);
        if (!fs.existsSync(entryPath)) fail(`script entry missing: ${scriptModule.entry}`);
    }
    for (const mod of bpManifest.modules ?? []) {
        if (!uuidRe.test(mod.uuid)) fail(`module uuid invalid: ${mod.type}`);
    }
    const deps = bpManifest.dependencies ?? [];
    for (const name of ["@minecraft/server", "@minecraft/server-ui"]) {
        const dep = deps.find(d => d.module_name === name);
        if (!dep) fail(`missing script dependency ${name}`);
    }
    for (const pack of [bpManifest, rpManifest]) {
        if (!pack.header.min_engine_version) fail("missing min_engine_version");
        if (!pack.header.version) fail("missing version");
    }
}

// ---------------------------------------------------------------- items
const itemDir = path.join(BP, "items");
const itemIds = new Map();
for (const file of fs.readdirSync(itemDir)) {
    if (!file.endsWith(".json")) continue;
    const data = readJson(path.join(itemDir, file));
    const desc = data?.["minecraft:item"]?.description;
    if (!desc) { fail(`item missing description: ${file}`); continue; }
    const id = desc.identifier;
    if (!id.startsWith("r6:")) warn(`item outside r6 namespace: ${id}`);
    if (itemIds.has(id)) fail(`duplicate item identifier: ${id}`);
    itemIds.set(id, { file, data });
    const components = data["minecraft:item"].components ?? {};
    const icon = components["minecraft:icon"];
    if (!icon) fail(`item ${id} has no icon`);
    else if (typeof icon === "string" && !icon.startsWith("r6_")) warn(`item ${id} icon key unexpected: ${icon}`);
}

// ---------------------------------------------------------------- item texture atlas
const atlas = readJson(path.join(RP, "textures", "item_texture.json"));
const atlasData = atlas?.texture_data ?? {};
for (const [id, entry] of itemIds) {
    const icon = entry.data["minecraft:item"].components["minecraft:icon"];
    if (typeof icon !== "string") { fail(`item ${id} icon is not a string`); continue; }
    if (!atlasData[icon]) {
        fail(`item ${id} icon '${icon}' missing from item_texture.json`);
        continue;
    }
    const tex = atlasData[icon].textures;
    const texPath = path.join(RP, tex + ".png");
    if (!fs.existsSync(texPath)) fail(`item ${id} texture missing: ${tex}.png`);
}
for (const [key, entry] of Object.entries(atlasData)) {
    const tex = typeof entry.textures === "string" ? entry.textures : null;
    if (!tex) { fail(`item_texture ${key} has unsupported texture format`); continue; }
    if (!fs.existsSync(path.join(RP, tex + ".png"))) fail(`item_texture ${key} -> missing ${tex}.png`);
}

// ---------------------------------------------------------------- geometry + animations
const geoIds = new Set();
for (const p of rpFiles.filter(f => f.endsWith(".geo.json"))) {
    const data = readJson(p);
    for (const geo of data?.["minecraft:geometry"] ?? []) {
        const id = geo.description?.identifier;
        if (!id) fail(`geometry without identifier: ${path.relative(ROOT, p)}`);
        else if (geoIds.has(id)) fail(`duplicate geometry id: ${id}`);
        else geoIds.add(id);
    }
}
const animIds = new Set();
for (const p of rpFiles.filter(f => f.includes(`${path.sep}animations${path.sep}`) && f.endsWith(".json"))) {
    const data = readJson(p);
    for (const key of Object.keys(data?.animations ?? {})) animIds.add(key);
}

// ---------------------------------------------------------------- attachables
const attachDir = path.join(RP, "attachables");
const attachableIds = new Set();
for (const file of fs.readdirSync(attachDir)) {
    if (!file.endsWith(".json")) continue;
    const data = readJson(path.join(attachDir, file));
    const desc = data?.["minecraft:attachable"]?.description;
    if (!desc) { fail(`attachable missing description: ${file}`); continue; }
    if (attachableIds.has(desc.identifier)) fail(`duplicate attachable: ${desc.identifier}`);
    attachableIds.add(desc.identifier);
    if (!itemIds.has(desc.identifier)) fail(`attachable ${desc.identifier} has no matching item`);
    for (const key of Object.keys(desc.textures ?? {})) {
        const tex = desc.textures[key];
        if (tex.startsWith("textures/misc/")) continue;
        if (!fs.existsSync(path.join(RP, tex + ".png"))) fail(`attachable ${file} texture missing: ${tex}`);
    }
    for (const key of Object.keys(desc.geometry ?? {})) {
        const geo = desc.geometry[key];
        if (!geo.startsWith("geometry.")) continue;
        if (!geoIds.has(geo)) fail(`attachable ${file} geometry missing: ${geo}`);
    }
    for (const key of Object.keys(desc.animations ?? {})) {
        const anim = desc.animations[key];
        if (!anim.startsWith("animation.")) continue;
        if (!animIds.has(anim)) fail(`attachable ${file} animation missing: ${anim}`);
    }
}
for (const [id] of itemIds) {
    if (id.startsWith("r6:op_") || id === "r6:tablet" || id === "r6:defuser") continue;
    if (id.startsWith("r6:gadget_")) continue;
    if (!attachableIds.has(id)) warn(`item ${id} has no attachable (2D only)`);
}

// ---------------------------------------------------------------- sounds
const soundDefsPath = path.join(RP, "sounds", "sound_definitions.json");
const soundDefs = readJson(soundDefsPath)?.sound_definitions ?? {};
for (const [id, def] of Object.entries(soundDefs)) {
    const list = Array.isArray(def.sounds) ? def.sounds : [def.sounds];
    for (const entry of list) {
        const name = typeof entry === "string" ? entry : entry?.name;
        if (!name) { fail(`sound ${id} entry without name`); continue; }
        if (!fs.existsSync(path.join(RP, name + ".ogg"))) fail(`sound ${id} file missing: ${name}.ogg`);
    }
}

// ---------------------------------------------------------------- entities
const bpEntityIds = new Set();
for (const file of fs.readdirSync(path.join(BP, "entities"))) {
    if (!file.endsWith(".json")) continue;
    const data = readJson(path.join(BP, "entities", file));
    const id = data?.["minecraft:entity"]?.description?.identifier;
    if (!id) { fail(`entity missing identifier: ${file}`); continue; }
    if (bpEntityIds.has(id)) fail(`duplicate BP entity: ${id}`);
    bpEntityIds.add(id);
}
const rpEntityIds = new Set();
for (const file of fs.readdirSync(path.join(RP, "entity"))) {
    if (!file.endsWith(".json")) continue;
    const data = readJson(path.join(RP, "entity", file));
    const desc = data?.["minecraft:client_entity"]?.description;
    if (!desc) { fail(`client entity missing description: ${file}`); continue; }
    if (rpEntityIds.has(desc.identifier)) fail(`duplicate client entity: ${desc.identifier}`);
    rpEntityIds.add(desc.identifier);
    for (const key of Object.keys(desc.textures ?? {})) {
        const tex = desc.textures[key];
        if (!fs.existsSync(path.join(RP, tex + ".png"))) fail(`client entity ${file} texture missing: ${tex}`);
    }
    for (const key of Object.keys(desc.geometry ?? {})) {
        const geo = desc.geometry[key];
        if (!geoIds.has(geo)) fail(`client entity ${file} geometry missing: ${geo}`);
    }
}
for (const id of bpEntityIds) {
    if (!rpEntityIds.has(id)) fail(`BP entity ${id} has no client entity`);
}

// ---------------------------------------------------------------- custom blocks
const blockDir = path.join(BP, "blocks");
const blockIds = new Set();
const terrain = readJson(path.join(RP, "textures", "terrain_texture.json"));
const terrainData = terrain?.texture_data ?? {};
const blockMaterialTextures = new Set();
if (fs.existsSync(blockDir)) {
    for (const file of fs.readdirSync(blockDir)) {
        if (!file.endsWith(".json")) continue;
        const data = readJson(path.join(blockDir, file));
        const block = data?.["minecraft:block"];
        const id = block?.description?.identifier;
        if (!id) { fail(`block missing identifier: ${file}`); continue; }
        if (blockIds.has(id)) fail(`duplicate block identifier: ${id}`);
        blockIds.add(id);
        if (!id.startsWith("r6:")) warn(`block outside r6 namespace: ${id}`);
        const components = block.components ?? {};
        const geometry = components["minecraft:geometry"];
        if (geometry && typeof geometry === "string" && geometry.startsWith("geometry.")) {
            if (!geoIds.has(geometry)) fail(`block ${id} geometry missing: ${geometry}`);
        }
        const materialInstances = components["minecraft:material_instances"] ?? {};
        for (const [face, mat] of Object.entries(materialInstances)) {
            const textureKey = mat?.texture;
            if (!textureKey) { fail(`block ${id} material ${face} has no texture`); continue; }
            blockMaterialTextures.add(textureKey);
            if (!terrainData[textureKey]) fail(`block ${id} texture key '${textureKey}' missing from terrain_texture.json`);
        }
        if (typeof components["minecraft:collision_box"] === "object") {
            const box = components["minecraft:collision_box"];
            for (const axis of ["origin", "size"]) {
                if (!Array.isArray(box[axis]) || box[axis].length !== 3) {
                    fail(`block ${id} has invalid collision_box.${axis}`);
                }
            }
        }
    }
}
for (const [key, entry] of Object.entries(terrainData)) {
    const tex = typeof entry.textures === "string" ? entry.textures : null;
    if (!tex) { fail(`terrain_texture ${key} has unsupported format`); continue; }
    if (!fs.existsSync(path.join(RP, tex + ".png"))) fail(`terrain_texture ${key} -> missing ${tex}.png`);
}
const registrySourceForBlocks = fs.readFileSync(path.join(BP, "scripts", "data", "registry.js"), "utf8");
for (const constName of ["BARRIER_BLOCK", "FRAME_BLOCK"]) {
    const match = registrySourceForBlocks.match(new RegExp(`export const ${constName} = "([^"]+)"`));
    if (!match) fail(`registry.js missing ${constName}`);
    else if (!blockIds.has(match[1])) fail(`registry.js ${constName} ${match[1]} has no block definition`);
}

// ---------------------------------------------------------------- scripts
const registryPath = path.join(BP, "scripts", "data", "registry.js");
const registrySource = fs.readFileSync(registryPath, "utf8");
const scriptFiles = walk(path.join(BP, "scripts")).filter(f => f.endsWith(".js"));
for (const file of scriptFiles) {
    try {
        execFileSync(process.execPath, ["--check", file], { stdio: "ignore" });
    } catch (e) {
        fail(`JS syntax error: ${path.relative(ROOT, file)} (exit ${e.status ?? "?"})`);
    }
}

function extractConst(name) {
    const re = new RegExp(`export const ${name} = (\\{.*?\\}|\\[.*?\\]);`, "s");
    const m = registrySource.match(re);
    if (!m) return null;
    try {
        return JSON.parse(m[1]);
    } catch {
        return null;
    }
}
const weapons = extractConst("WEAPONS");
const operators = extractConst("OPERATORS");
const gadgets = extractConst("GADGETS");
const devices = extractConst("DEVICES");
if (!weapons) fail("registry.js WEAPONS parse failed");
if (!operators) fail("registry.js OPERATORS parse failed");
if (!gadgets) fail("registry.js GADGETS parse failed");
if (!devices) fail("registry.js DEVICES parse failed");

if (weapons) {
    for (const [id, w] of Object.entries(weapons)) {
        if (!itemIds.has("r6:" + id)) fail(`weapon ${id} has no BP item`);
        if (!w.shield) {
            if (!w.soundId) fail(`weapon ${id} missing soundId`);
            else if (!soundDefs[w.soundId]) fail(`weapon ${id} soundId ${w.soundId} missing from sound_definitions`);
            if (!(w.mag > 0)) fail(`weapon ${id} invalid mag`);
            if (!(w.interval >= 1)) fail(`weapon ${id} invalid interval`);
        }
    }
}
if (operators) {
    if (operators.length !== 22) fail(`expected 22 operators, found ${operators.length}`);
    const attackerCount = operators.filter(o => o.side === "attacker").length;
    const defenderCount = operators.filter(o => o.side === "defender").length;
    if (attackerCount !== 11 || defenderCount !== 11) fail(`operator sides unbalanced: ${attackerCount}/${defenderCount}`);
    for (const op of operators) {
        if (!gadgets?.[op.gadget]) fail(`operator ${op.id} gadget ${op.gadget} missing`);
        else if (!itemIds.has(gadgets[op.gadget].item)) fail(`operator ${op.id} gadget item missing`);
        for (const primary of op.primaries ?? []) {
            if (!weapons?.[primary]) fail(`operator ${op.id} primary ${primary} missing`);
        }
        if (!weapons?.[op.secondary]) fail(`operator ${op.id} secondary ${op.secondary} missing`);
        if (!itemIds.has(op.badge)) fail(`operator ${op.id} badge item missing`);
    }
}
if (gadgets) {
    for (const [id, g] of Object.entries(gadgets)) {
        if (!itemIds.has("r6:" + id)) fail(`gadget ${id} has no BP item`);
        if (!itemIds.has(g.item)) fail(`gadget ${id} item key ${g.item} missing`);
    }
}
if (devices) {
    for (const [kind] of Object.entries(devices)) {
        if (!bpEntityIds.has("r6:" + kind)) fail(`device ${kind} has no BP entity`);
        if (!rpEntityIds.has("r6:" + kind)) fail(`device ${kind} has no client entity`);
    }
}

// required companion items
for (const required of ["r6:tablet", "r6:defuser", "r6:gadget_reinforce", "r6:gadget_barricade"]) {
    if (!itemIds.has(required)) fail(`required item missing: ${required}`);
}

// ---------------------------------------------------------------- source references in scripts
const scriptText = scriptFiles.map(f => fs.readFileSync(f, "utf8")).join("\n");

// bullet FX particle identifiers are referenced as strings by the scripts too
const particleDir = path.join(RP, "particles");
const particleIds = new Set();
const particleTextures = new Set();
if (!fs.existsSync(particleDir)) fail("RP particles/ missing (bullet FX)");
else {
    for (const file of fs.readdirSync(particleDir)) {
        if (!file.endsWith(".json")) continue;
        const data = readJson(path.join(particleDir, file));
        const desc = data?.particle_effect?.description;
        if (!desc?.identifier) { fail(`particle effect without identifier: ${file}`); continue; }
        if (!desc.identifier.startsWith("r6:")) warn(`particle outside r6 namespace: ${desc.identifier}`);
        if (particleIds.has(desc.identifier)) fail(`duplicate particle identifier: ${desc.identifier}`);
        particleIds.add(desc.identifier);
        const collectTextures = node => {
            if (typeof node === "string") {
                if (node.startsWith("textures/particle/")) particleTextures.add(node);
                return;
            }
            if (Array.isArray(node)) { node.forEach(collectTextures); return; }
            if (node && typeof node === "object") Object.values(node).forEach(collectTextures);
        };
        collectTextures(data);
    }
}

const scriptEventIds = new Set(["menu", "join", "leave", "setup", "config", "start", "stop", "status",
    "op", "operator", "reset", "rules", "help", "tablet", "map", "bomb", "debug"]);
const referencedItems = new Set([...scriptText.matchAll(/(["'])r6:([a-z0-9_]+)\1/g)].map(m => "r6:" + m[2]));
for (const ref of referencedItems) {
    const short = ref.slice(3);
    if (itemIds.has(ref) || bpEntityIds.has(ref) || blockIds.has(ref) || particleIds.has(ref)) continue;
    if (scriptEventIds.has(short)) continue;
    if (short.endsWith("_") || short.includes(":")) continue;
    warn(`script references unknown item/entity/block: ${ref}`);
}
// every ported sound id used by the scripts must exist in the sound bank
const referencedSounds = new Set([...scriptText.matchAll(/"(r6\.[a-z0-9_]+)"/g)].map(m => m[1]));
for (const sound of referencedSounds) {
    if (!soundDefs[sound]) fail(`script references missing sound: ${sound}`);
}
// every ported sound definition must point at a real .ogg
for (const [soundId, def] of Object.entries(soundDefs)) {
    if (soundId.startsWith("r6.") && !/(_shoot|reload|dry|hit|flash|explosion|knife|beep|ping|jammer|gas|emp|stim|drone|deploy|ui_click|hover|armor|defuse|barricade|sledge|weapon)/.test(soundId)) {
        warn(`unexpected ported sound id: ${soundId}`);
    }
}

// ---------------------------------------------------------------- bullet FX particles (ported from Test Guns 2D)
if (particleIds.size > 0) {
    for (const tex of particleTextures) {
        // only textures we ship ourselves are checked; vanilla paths (particles atlas) pass through
        if (tex.startsWith("textures/particle/r6/") && !fs.existsSync(path.join(RP, tex + ".png"))) {
            fail(`particle texture missing: ${tex}`);
        }
    }
    const requiredFx = ["r6:bullet_tracer", "r6:heavy_tracer", "r6:shotgun_tracer",
        "r6:vector_tracer", "r6:pkm_tracer", "r6:muzzle_flash", "r6:muzzle_flash_heavy",
        "r6:bullet_hit_spark", "r6:bullet_hit_smoke", "r6:bullet_hit_heavy_flash"];
    for (const id of requiredFx) {
        if (!particleIds.has(id)) fail(`required bullet FX particle missing: ${id}`);
    }
    for (const m of scriptText.matchAll(/(?:spawnParticle|particle)\([^,]+,\s*["'](r6:[a-z0-9_]+)["']/g)) {
        if (!particleIds.has(m[1])) fail(`script references missing particle: ${m[1]}`);
    }
}

// ---------------------------------------------------------------- attribution / audit files
for (const rel of ["docs/licenses/MC-R6mod_LICENSE.txt", "docs/licenses/MC-R6mod_LICENSE.FOR_ASSETS.txt",
    "docs/reference/r6mod_lang_en_us.json", "docs/COPY_AUDIT.md"]) {
    if (!fs.existsSync(path.join(ROOT, rel))) fail(`missing attribution/audit file: ${rel}`);
}
const r6modUiDir = path.join(RP, "textures", "ui", "r6mod");
if (!fs.existsSync(r6modUiDir)) fail("MC-R6mod GUI art was not ported");
else if (walk(r6modUiDir).length < 40) warn(`only ${walk(r6modUiDir).length} MC-R6mod GUI assets ported`);

// ---------------------------------------------------------------- packaging output
const dist = path.join(ROOT, "dist");
if (fs.existsSync(dist)) {
    for (const file of fs.readdirSync(dist)) {
        if (!file.endsWith(".mcpack") && !file.endsWith(".mcaddon") && !file.endsWith(".zip")) continue;
        const header = fs.readFileSync(path.join(dist, file)).subarray(0, 4).toString("binary");
        if (!header.startsWith("PK")) warn(`dist/${file} does not look like a zip archive`);
    }
}

// ---------------------------------------------------------------- pack icons
for (const pack of [BP, RP]) {
    if (!fs.existsSync(path.join(pack, "pack_icon.png"))) fail(`missing pack_icon.png in ${path.basename(pack)}`);
}

// ---------------------------------------------------------------- report
console.log(`R6 addon validation: ${allJson.length} JSON files, ${itemIds.size} items, ${blockIds.size} blocks, ` +
    `${scriptFiles.length} scripts, ${bpEntityIds.size} entities, ${geoIds.size} geometries, ` +
    `${Object.keys(soundDefs).length} sounds, ${particleIds.size} bullet FX particles`);
if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings.slice(0, 40)) console.log("  ! " + w);
    if (warnings.length > 40) console.log(`  ... ${warnings.length - 40} more`);
}
if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    for (const e of errors) console.log("  x " + e);
    process.exit(1);
}
console.log("\nAll checks passed.");
