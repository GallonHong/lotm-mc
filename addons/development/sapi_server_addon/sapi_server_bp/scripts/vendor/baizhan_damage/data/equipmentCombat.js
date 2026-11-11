// Explicit allowlist: no display-name parsing or substring bonuses for foreign items.
// Rarity is pinned to the item definitions. Existing tactical passives remain in DamageHandler.
export const EQUIPMENT_CRIT_BY_RARITY = Object.freeze({ common: 0.02, uncommon: 0.03, rare: 0.04, epic: 0.05, legendary: 0.06 });
export const EQUIPMENT_COMBAT = Object.freeze(Object.fromEntries(Object.entries({
 "test_gun:armor_fraternity": {
  "slot": "Head",
  "rarity": "common"
 },
 "test_gun:armor_bdu_woodland_top": {
  "slot": "Chest",
  "rarity": "common"
 },
 "test_gun:armor_bdu_woodland_bottom": {
  "slot": "Legs",
  "rarity": "common"
 },
 "test_gun:armor_hazmat_top": {
  "slot": "Chest",
  "rarity": "common"
 },
 "test_gun:armor_vest_light": {
  "slot": "Chest",
  "rarity": "common"
 },
 "test_gun:armor_gasmask": {
  "slot": "Head",
  "rarity": "uncommon"
 },
 "test_gun:armor_night_goggles": {
  "slot": "Head",
  "rarity": "uncommon"
 },
 "test_gun:armor_night_vision": {
  "slot": "Head",
  "rarity": "rare"
 },
 "test_gun:armor_gorka_bottom": {
  "slot": "Legs",
  "rarity": "rare"
 },
 "test_gun:armor_wasp_pants": {
  "slot": "Legs",
  "rarity": "rare"
 },
 "test_gun:armor_wasp_boots": {
  "slot": "Feet",
  "rarity": "rare"
 },
 "test_gun:armor_immortal_pants": {
  "slot": "Legs",
  "rarity": "epic"
 },
 "test_gun:armor_mlt_hg2": {
  "slot": "Chest",
  "rarity": "legendary"
 },
 "test_gun:armor_mlt_hg2_desert": {
  "slot": "Chest",
  "rarity": "legendary"
 },
 "test_gun:armor_titan_chest": {
  "slot": "Chest",
  "rarity": "legendary"
 },
 "test_gun:armor_epic_titan_vest": {
  "slot": "Chest",
  "rarity": "legendary"
 },
 "test_gun:armor_mob_chest": {
  "slot": "Chest",
  "rarity": "legendary"
 },
 "test_gun:armor_mob_mask": {
  "slot": "Head",
  "rarity": "legendary"
 },
 "test_gun:armor_mob_pants": {
  "slot": "Legs",
  "rarity": "legendary"
 },
 "test_gun:cloth_beanie_black": {
  "slot": "Head",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.01
 },
 "test_gun:cloth_boonie_woodland": {
  "slot": "Head",
  "rarity": "civilian",
  "critBonus": 0.02,
  "damageBonus": 0.01
 },
 "test_gun:cloth_cowboy_brown": {
  "slot": "Head",
  "rarity": "civilian",
  "critBonus": 0.02,
  "damageBonus": 0.01
 },
 "test_gun:cloth_shemagh_tan": {
  "slot": "Head",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.01
 },
 "test_gun:cloth_ushanka": {
  "slot": "Head",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.01
 },
 "test_gun:cloth_cargo_tan": {
  "slot": "Legs",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.02
 },
 "test_gun:cloth_jean_blue": {
  "slot": "Legs",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.01
 },
 "test_gun:cloth_overall_blue": {
  "slot": "Legs",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.02
 },
 "test_gun:cloth_trackpants_black": {
  "slot": "Legs",
  "rarity": "civilian",
  "critBonus": 0.02,
  "damageBonus": 0.01
 },
 "test_gun:cloth_flannel_red": {
  "slot": "Chest",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.02
 },
 "test_gun:cloth_hawaiian_red": {
  "slot": "Chest",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.01
 },
 "test_gun:cloth_hoodie_black": {
  "slot": "Chest",
  "rarity": "civilian",
  "critBonus": 0.02,
  "damageBonus": 0.02
 },
 "test_gun:cloth_hunting_vest": {
  "slot": "Chest",
  "rarity": "civilian",
  "critBonus": 0.02,
  "damageBonus": 0.03
 },
 "test_gun:cloth_leather_black": {
  "slot": "Chest",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.03
 },
 "test_gun:cloth_puffer_blue": {
  "slot": "Chest",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.01
 },
 "test_gun:cloth_sweater_white": {
  "slot": "Chest",
  "rarity": "civilian",
  "critBonus": 0.01,
  "damageBonus": 0.01
 },
 "test_gun:cloth_varsity_red": {
  "slot": "Chest",
  "rarity": "civilian",
  "critBonus": 0.02,
  "damageBonus": 0.02
 }
}).map(([id, profile]) => [id, Object.freeze(profile)])));

export function getEquipmentProfile(typeId, slot) {
 const profile = EQUIPMENT_COMBAT[typeId];
 return profile && profile.slot === slot ? profile : undefined;
}

// Read the actual slots on every hit; no timers, retained buffs, inventory or offhand stacking.
export function getEquipmentCombatBonuses(equippable, slots) {
 let critBonus = 0, damageBonus = 0;
 for (const name of ['Head', 'Chest', 'Legs', 'Feet']) {
  const profile = getEquipmentProfile(equippable?.getEquipment(slots[name])?.typeId, name);
  if (!profile) continue;
  critBonus += profile.critBonus ?? EQUIPMENT_CRIT_BY_RARITY[profile.rarity] ?? 0;
  damageBonus += profile.damageBonus ?? 0;
 }
 return { critBonus, damageBonus };
}
