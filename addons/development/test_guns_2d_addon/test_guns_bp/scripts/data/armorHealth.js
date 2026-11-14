// Explicit armor IDs and actual wearable slots, pinned to this pack's item definitions.
// Health Boost changes real maximum health in increments of 4 HP, never absorption.
// Civilian clothes, shields, vanilla/foreign equipment and inventory items grant no bonus.
export const ARMOR_HEALTH_CAP = 140;
export const ARMOR_BASE_HEALTH = 20;
export const ARMOR_HEALTH_PROFILES = Object.freeze(Object.fromEntries(Object.entries({
 "test_gun:armor_ala_spc": {
  "slot": "Chest",
  "rarity": "epic",
  "healthBonus": 32,
  "firearmReduction": 0.2
 },
 "test_gun:armor_analyzer": {
  "slot": "Head",
  "rarity": "uncommon",
  "healthBonus": 8
 },
 "test_gun:armor_assault_vest": {
  "slot": "Chest",
  "rarity": "epic",
  "healthBonus": 32,
  "firearmReduction": 0.2
 },
 "test_gun:armor_bdu_woodland_bottom": {
  "slot": "Legs",
  "rarity": "common",
  "healthBonus": 4
 },
 "test_gun:armor_bdu_woodland_top": {
  "slot": "Chest",
  "rarity": "common",
  "healthBonus": 8,
  "firearmReduction": 0.1
 },
 "test_gun:armor_black_ghillie": {
  "slot": "Legs",
  "rarity": "rare",
  "healthBonus": 16
 },
 "test_gun:armor_ca_pvs31": {
  "slot": "Head",
  "rarity": "epic",
  "healthBonus": 16
 },
 "test_gun:armor_ca_pvs31_desert": {
  "slot": "Head",
  "rarity": "epic",
  "healthBonus": 16
 },
 "test_gun:armor_ca_pvs_31_up": {
  "slot": "Head",
  "rarity": "epic",
  "healthBonus": 16
 },
 "test_gun:armor_emr_6b13": {
  "slot": "Chest",
  "rarity": "epic",
  "healthBonus": 32,
  "firearmReduction": 0.22
 },
 "test_gun:armor_epic_ghillie_suit": {
  "slot": "Chest",
  "rarity": "rare",
  "healthBonus": 24,
  "firearmReduction": 0.14
 },
 "test_gun:armor_epic_titan_vest": {
  "slot": "Chest",
  "rarity": "legendary",
  "healthBonus": 40,
  "firearmReduction": 0.26
 },
 "test_gun:armor_fraternity": {
  "slot": "Head",
  "rarity": "common",
  "healthBonus": 4
 },
 "test_gun:armor_gasmask": {
  "slot": "Head",
  "rarity": "uncommon",
  "healthBonus": 8
 },
 "test_gun:armor_goggles_black": {
  "slot": "Feet",
  "rarity": "uncommon",
  "healthBonus": 8
 },
 "test_gun:armor_goggles_red": {
  "slot": "Feet",
  "rarity": "uncommon",
  "healthBonus": 8
 },
 "test_gun:armor_gorka_bottom": {
  "slot": "Legs",
  "rarity": "rare",
  "healthBonus": 16
 },
 "test_gun:armor_hazmat_top": {
  "slot": "Chest",
  "rarity": "common",
  "healthBonus": 8,
  "firearmReduction": 0.1
 },
 "test_gun:armor_helmet_tactical": {
  "slot": "Head",
  "rarity": "epic",
  "healthBonus": 16
 },
 "test_gun:armor_immortal_mask": {
  "slot": "Head",
  "rarity": "epic",
  "healthBonus": 16
 },
 "test_gun:armor_immortal_pants": {
  "slot": "Legs",
  "rarity": "epic",
  "healthBonus": 20
 },
 "test_gun:armor_immortal_vest": {
  "slot": "Chest",
  "rarity": "epic",
  "healthBonus": 32,
  "firearmReduction": 0.18
 },
 "test_gun:armor_jpc_2": {
  "slot": "Chest",
  "rarity": "rare",
  "healthBonus": 24,
  "firearmReduction": 0.16
 },
 "test_gun:armor_jpc_2_desert": {
  "slot": "Chest",
  "rarity": "rare",
  "healthBonus": 24,
  "firearmReduction": 0.16
 },
 "test_gun:armor_killa_6b13": {
  "slot": "Chest",
  "rarity": "legendary",
  "healthBonus": 40,
  "firearmReduction": 0.28
 },
 "test_gun:armor_m50": {
  "slot": "Feet",
  "rarity": "rare",
  "healthBonus": 12
 },
 "test_gun:armor_mch_fc": {
  "slot": "Head",
  "rarity": "epic",
  "healthBonus": 16
 },
 "test_gun:armor_mch_fc_desert": {
  "slot": "Head",
  "rarity": "epic",
  "healthBonus": 16
 },
 "test_gun:armor_mch_fc_up": {
  "slot": "Head",
  "rarity": "epic",
  "healthBonus": 16
 },
 "test_gun:armor_mlt_hg2": {
  "slot": "Chest",
  "rarity": "legendary",
  "healthBonus": 40,
  "firearmReduction": 0.3
 },
 "test_gun:armor_mlt_hg2_desert": {
  "slot": "Chest",
  "rarity": "legendary",
  "healthBonus": 40,
  "firearmReduction": 0.3
 },
 "test_gun:armor_mob_chest": {
  "slot": "Chest",
  "rarity": "legendary",
  "healthBonus": 40,
  "firearmReduction": 0.28
 },
 "test_gun:armor_mob_mask": {
  "slot": "Head",
  "rarity": "legendary",
  "healthBonus": 20
 },
 "test_gun:armor_mob_pants": {
  "slot": "Legs",
  "rarity": "legendary",
  "healthBonus": 24
 },
 "test_gun:armor_night_goggles": {
  "slot": "Head",
  "rarity": "uncommon",
  "healthBonus": 8
 },
 "test_gun:armor_night_vision": {
  "slot": "Head",
  "rarity": "rare",
  "healthBonus": 12
 },
 "test_gun:armor_oak_ghillie": {
  "slot": "Legs",
  "rarity": "uncommon",
  "healthBonus": 12
 },
 "test_gun:armor_oc_amp": {
  "slot": "Head",
  "rarity": "rare",
  "healthBonus": 12
 },
 "test_gun:armor_ocf_gpnvg18": {
  "slot": "Head",
  "rarity": "legendary",
  "healthBonus": 20
 },
 "test_gun:armor_ocf_gpnvg18_desert": {
  "slot": "Head",
  "rarity": "legendary",
  "healthBonus": 20
 },
 "test_gun:armor_ocf_gpnvg18_up": {
  "slot": "Head",
  "rarity": "legendary",
  "healthBonus": 20
 },
 "test_gun:armor_police_vest": {
  "slot": "Chest",
  "rarity": "rare",
  "healthBonus": 24,
  "firearmReduction": 0.16
 },
 "test_gun:armor_tactical_helmet": {
  "slot": "Head",
  "rarity": "epic",
  "healthBonus": 16
 },
 "test_gun:armor_tech": {
  "slot": "Head",
  "rarity": "epic",
  "healthBonus": 16
 },
 "test_gun:armor_titan_chest": {
  "slot": "Chest",
  "rarity": "legendary",
  "healthBonus": 40,
  "firearmReduction": 0.26
 },
 "test_gun:armor_vest_heavy": {
  "slot": "Chest",
  "rarity": "epic",
  "healthBonus": 32,
  "firearmReduction": 0.2
 },
 "test_gun:armor_vest_light": {
  "slot": "Chest",
  "rarity": "common",
  "healthBonus": 8,
  "firearmReduction": 0.1
 },
 "test_gun:armor_wasp_boots": {
  "slot": "Feet",
  "rarity": "rare",
  "healthBonus": 12
 },
 "test_gun:armor_wasp_mask": {
  "slot": "Head",
  "rarity": "rare",
  "healthBonus": 12
 },
 "test_gun:armor_wasp_pants": {
  "slot": "Legs",
  "rarity": "rare",
  "healthBonus": 16
 },
 "test_gun:armor_wasp_rig": {
  "slot": "Chest",
  "rarity": "rare",
  "healthBonus": 24
 }
}).map(([id, profile]) => [id, Object.freeze(profile)])));

export function getArmorHealthProfile(typeId, slot) {
 const profile = ARMOR_HEALTH_PROFILES[typeId];
 return profile?.slot === slot ? profile : undefined;
}

export function getArmorHealthBonus(equippable, slots) {
 let bonus = 0;
 for (const slot of ['Head', 'Chest', 'Legs', 'Feet']) {
  const item = equippable?.getEquipment(slots[slot]);
  const profile = getArmorHealthProfile(item?.typeId, slot);
  if (!profile) continue;
  const durability = item.getComponent?.('minecraft:durability');
  if (durability && durability.damage >= durability.maxDurability) continue;
  bonus += profile.healthBonus;
 }
 return Math.min(ARMOR_HEALTH_CAP - ARMOR_BASE_HEALTH, bonus);
}

export function armorBoostAmplifier(bonus, baseMax) {
 // A foreign base-max override is respected. Never add beyond 100 ourselves.
 const allowed = Math.min(Math.max(0, bonus), Math.max(0, ARMOR_HEALTH_CAP - baseMax));
 return Math.floor(allowed / 4) - 1;
}
