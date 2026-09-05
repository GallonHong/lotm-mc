import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const addonRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rpRoot = join(addonRoot, "test_guns_rp");
const deadzoneRp = resolve(addonRoot, "../../reference/V1.6.6-1DeadZone/DeadZzoneRp");

// Test Guns item id -> original Deadzone attachable. These mappings were verified
// against the already-imported inventory icons by SHA-256, not inferred by display name.
const wearables = {
  armor_helmet_tactical: "armor/tactical_helmet_blavk.json",
  armor_titan_chest: "armor/vest/assault_vest_black.json",
  armor_vest_heavy: "armor/vest/tectical_vest_black.json",
  armor_vest_light: "armor/vest/stab_vest_grey.json",
  armor_assault_vest: "armor/vest/assault_vest_black.json",
  armor_bdu_woodland_bottom: "clothes/lower/acu_woodland_bottom.json",
  armor_bdu_woodland_top: "clothes/top/acu_woodland_top.json",
  armor_epic_ghillie_suit: "clothes/top/ghillie_top.json",
  armor_epic_titan_vest: "armor/vest/assault_vest_black.json",
  armor_gasmask: "armor/gasmask_black.json",
  armor_gorka_bottom: "clothes/lower/gorka_bottom.json",
  armor_hazmat_top: "clothes/top/hazmat_yellow_top.json",
  armor_night_goggles: "armor/night_goggles.json",
  armor_police_vest: "armor/vest/police_vest.json",
  armor_tactical_helmet: "armor/tactical_helmet_blavk.json",
  cloth_beanie_black: "armor/beanie_black.json",
  cloth_boonie_woodland: "armor/boonie_woodland.json",
  cloth_cargo_tan: "clothes/lower/cargo_tan.json",
  cloth_cowboy_brown: "armor/cowboy_hat.json",
  cloth_flannel_red: "clothes/top/flannel_red.json",
  cloth_hawaiian_red: "clothes/top/hawaiian_red.json",
  cloth_hoodie_black: "clothes/top/hoodie_black.json",
  cloth_hunting_vest: "armor/vest/hunting_brown.json",
  cloth_jean_blue: "clothes/lower/jean_blue.json",
  cloth_leather_black: "clothes/top/leather_black.json",
  cloth_overall_blue: "clothes/lower/overall_blue.json",
  cloth_puffer_blue: "clothes/top/puffer_blue.json",
  cloth_shemagh_tan: "armor/shemagh_tan.json",
  cloth_sweater_white: "clothes/top/sweater_white.json",
  cloth_trackpants_black: "clothes/lower/trackpants_black.json",
  cloth_ushanka: "armor/ushanka.json",
  cloth_varsity_red: "clothes/top/varsity_red.json"
};

const geometryOverrides = {
  // Deadzone used the runtime-provided vanilla helmet geometry. Bundling its
  // equivalent local geometry avoids silent model loss on stricter clients.
  armor_tactical_helmet: "geometry.humanoid.armor.helmet_2",
  armor_helmet_tactical: "geometry.humanoid.armor.helmet_2",
  cloth_ushanka: "geometry.humanoid.armor.helmet_2"
};

function copyTree(source, target) {
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(source)) {
    const from = join(source, name);
    const to = join(target, name);
    if (statSync(from).isDirectory()) copyTree(from, to);
    else copyFileSync(from, to);
  }
}

mkdirSync(join(rpRoot, "attachables"), { recursive: true });
mkdirSync(join(rpRoot, "textures/models/deadzone"), { recursive: true });
copyTree(join(deadzoneRp, "models/entity/armor"), join(rpRoot, "models/entity/deadzone/armor"));
copyTree(join(deadzoneRp, "models/entity/clothing"), join(rpRoot, "models/entity/deadzone/clothing"));
copyFileSync(
  join(deadzoneRp, "textures/items/armor/stab_vest_gray.png"),
  join(rpRoot, "textures/armor/armor_vest_light_dz.png")
);

for (const [itemName, sourceRelative] of Object.entries(wearables)) {
  const sourcePath = join(deadzoneRp, "attachables", sourceRelative);
  const attachable = JSON.parse(readFileSync(sourcePath, "utf8"));
  const description = attachable["minecraft:attachable"].description;
  const sourceTexture = description.textures.default;
  const sourcePng = join(deadzoneRp, `${sourceTexture}.png`);
  const targetTexture = `textures/models/deadzone/${itemName}`;

  description.identifier = `test_gun:${itemName}`;
  description.textures.default = targetTexture;
  if (geometryOverrides[itemName]) description.geometry.default = geometryOverrides[itemName];
  copyFileSync(sourcePng, join(rpRoot, `${targetTexture}.png`));
  writeFileSync(
    join(rpRoot, "attachables", `${itemName}.json`),
    `${JSON.stringify(attachable, null, 2)}\n`,
    "utf8"
  );
}

console.log(`Imported ${Object.keys(wearables).length} Deadzone wearable render chains.`);
