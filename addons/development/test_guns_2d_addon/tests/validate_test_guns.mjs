import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bp = join(root, "test_guns_bp");
const rp = join(root, "test_guns_rp");
const json = path => JSON.parse(readFileSync(path, "utf8"));
function files(directory) { return readdirSync(directory).flatMap(name => { const path = join(directory, name); return statSync(path).isDirectory() ? files(path) : [path]; }); }
for (const path of [...files(bp), ...files(rp)].filter(path => path.endsWith(".json"))) assert.doesNotThrow(() => json(path), `invalid JSON: ${path}`);
const bpManifest = json(join(bp, "manifest.json"));
const rpManifest = json(join(rp, "manifest.json"));
assert.deepEqual(bpManifest.header.version, [3, 12, 0]);
assert.deepEqual(rpManifest.header.version, [3, 12, 0]);
assert.deepEqual(bpManifest.dependencies.find(value => value.uuid === rpManifest.header.uuid)?.version, [3, 12, 0]);
assert.equal(json(join(bp, "items/blueprint_usas12.json"))["minecraft:item"].description.identifier, "test_gun:blueprint_usas12");
assert(readFileSync(join(bp, "recipes/recipe_usas12.json"), "utf8").includes("test_gun:blueprint_usas12"));
assert.equal(json(join(bp, "items/blueprint_dbss.json"))["minecraft:item"].description.identifier, "test_gun:blueprint_dbss");
assert.equal(json(join(bp, "items/dbss.json"))["minecraft:item"].description.identifier, "test_gun:dbss");
assert(readFileSync(join(bp, "recipes/recipe_dbss.json"), "utf8").includes("test_gun:blueprint_dbss"));
for (const id of ["ak47_commander", "pkm", "m1014_ward", "flash_shield", "titan_chest", "dbss", "armor_mob_chest", "armor_mob_pants", "armor_mob_mask"]) assert.equal(existsSync(join(bp, "recipes", `recipe_blueprint_${id}.json`)), false, `${id} limited blueprint recipe remains`);
const textureMap = json(join(rp, "textures/item_texture.json"));
assert.equal(textureMap.texture_data.test_gun_ammo_belt_100.textures, "textures/ammo/ammo_belt_100_generated");
const png = readFileSync(join(rp, "textures/ammo/ammo_belt_100_generated.png"));
assert.equal(png.readUInt32BE(16), 32);
assert.equal(png.readUInt32BE(20), 32);
const geometryIds = new Set(files(join(rp, "models/entity"))
  .filter(path => path.endsWith(".json"))
  .flatMap(path => json(path)["minecraft:geometry"] ?? [])
  .map(value => value.description?.identifier)
  .filter(Boolean));
for (const itemPath of files(join(bp, "items")).filter(path => path.endsWith(".json"))) {
  const item = json(itemPath)["minecraft:item"];
  const wearable = item?.components?.["minecraft:wearable"];
  if (!wearable || !wearable.slot?.startsWith("slot.armor.")) continue;
  const id = item.description.identifier;
  const attachablePath = join(rp, "attachables", `${id.split(":")[1]}.json`);
  assert(existsSync(attachablePath), `wearable has no attachable: ${id}`);
  const description = json(attachablePath)["minecraft:attachable"].description;
  assert.equal(description.identifier, id, `attachable id mismatch: ${id}`);
  assert(geometryIds.has(description.geometry.default), `missing wearable geometry ${description.geometry.default}: ${id}`);
  assert(existsSync(join(rp, `${description.textures.default}.png`)), `missing wearable texture ${description.textures.default}: ${id}`);
}
const raycastUtils = await import(new URL("../test_guns_bp/scripts/feature/utils/raycastUtils.js", import.meta.url));
const blockHit = { block: { location: { x: 260, y: 70, z: 276 } }, faceLocation: { x: 0.3, y: 0.7, z: 0 } };
const resolvedHit = raycastUtils.resolveBlockRaycastHit(blockHit, { x: 0, y: 0, z: 1 });
assert.deepEqual(resolvedHit.surface, { x: 260.3, y: 70.7, z: 276 });
assert.equal(resolvedHit.visual.z, 275.97, "block impact particle must be offset outside the surface");
const shootUtils = readFileSync(join(bp, "scripts/feature/utils/shootUtils.js"), "utf8");
const arcEngine = readFileSync(join(bp, "scripts/feature/arcEngine.js"), "utf8");
assert(shootUtils.includes("resolveBlockRaycastHit(blockHit, dir)"));
assert(arcEngine.includes("resolveBlockRaycastHit(blockHit, viewDir)"));
assert.equal(/impactLoc\s*=\s*\{[\s\S]{0,180}blockHit\.faceLocation\.x/.test(shootUtils), false, "local block hit coordinates must never be used as world coordinates");
const teamRules = readFileSync(join(bp, "scripts/feature/utils/teamRules.js"), "utf8");
assert(teamRules.includes("sapi_team_") && teamRules.includes("isProtectedTeammate"), "SAPI team friendly-fire contract missing");
for (const file of ["damageHandler.js", "rocketEngine.js", "grenadeEngine.js", "arcEngine.js", "artilleryEngine.js", "meleeEngine.js", "skillManager.js", "shieldEngine.js"]) {
  assert(readFileSync(join(bp, "scripts/feature", file), "utf8").includes("isProtectedTeammate"), `friendly-fire guard missing: ${file}`);
}
const newArmorIds = [
  "armor_mob_chest", "armor_mob_pants", "armor_mob_mask",
  "armor_night_vision", "armor_wasp_rig", "armor_wasp_pants", "armor_wasp_boots", "armor_wasp_mask",
  "armor_immortal_vest", "armor_immortal_pants", "armor_immortal_mask",
  "armor_analyzer", "armor_tech", "armor_fraternity"
];
const damageHandlerCode = readFileSync(join(bp, "scripts/feature/damageHandler.js"), "utf8");
for (const armorId of newArmorIds) {
  assert(existsSync(join(bp, "items", `${armorId}.json`)), `missing item: ${armorId}`);
  assert(existsSync(join(bp, "items", `blueprint_${armorId}.json`)), `missing blueprint item: blueprint_${armorId}`);
  assert(existsSync(join(bp, "recipes", `recipe_${armorId}.json`)), `missing armor recipe: recipe_${armorId}`);
  const armorRecipe = readFileSync(join(bp, "recipes", `recipe_${armorId}.json`), "utf8");
  assert(armorRecipe.includes(`test_gun:blueprint_${armorId}`), `armor recipe ${armorId} must require blueprint`);
  assert(damageHandlerCode.includes(`${armorId}:`), `ARMOR_PIECE_VALUES missing ${armorId}`);
}
assert(existsSync(join(bp, "items/part_tech_data.json")), "missing part_tech_data");
assert(existsSync(join(bp, "items/part_mech_chip.json")), "missing part_mech_chip");
assert(existsSync(join(bp, "recipes/recipe_part_tech_data.json")), "missing recipe_part_tech_data");
assert(existsSync(join(bp, "recipes/recipe_part_mech_chip.json")), "missing recipe_part_mech_chip");
console.log("Test Guns 2D v3.12.0 validation passed.");
