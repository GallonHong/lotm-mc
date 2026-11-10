// Base damage only. Critical chance/multiplier and offensive armor buffs belong to DamageHandler.
export const SURVIVAL_MELEE = Object.freeze({
  'test_gun:salvage_cleaver': {
    name: '锯齿·拾荒砍刀', sound: 'test_gun.melee_slash', range: 3.2, halfAngle: 60,
    maxTargets: 3, damage: [11, 12, 16], windup: 4, recovery: 7, penetration: 0.20,
    knockback: { x: 0.35, y: 0.10 }, durability: 1100,
    heavy: { damage: 24, windup: 13, recovery: 14, range: 3.5, halfAngle: 85, maxTargets: 4, penetration: 0.30, cooldown: 100, bleed: true }
  },
  'test_gun:breach_hammer': {
    name: '破城·液压重锤', sound: 'random.anvil_land', range: 2.8, halfAngle: 42,
    maxTargets: 2, damage: [19, 25], windup: 8, recovery: 13, penetration: 0.50,
    knockback: { x: 0.75, y: 0.16 }, durability: 1700,
    heavy: { damage: 38, windup: 17, recovery: 21, range: 3.2, halfAngle: 68, maxTargets: 4, penetration: 0.65, cooldown: 160, slow: 35 }
  },
  'test_gun:pulse_spear': {
    name: '流电·战术长矛', sound: 'test_gun.katana_slash', range: 4.5, halfAngle: 16,
    maxTargets: 1, damage: [10, 11, 15], windup: 3, recovery: 8, penetration: 0.35,
    knockback: { x: 0.30, y: 0.08 }, durability: 1250,
    heavy: { damage: 28, windup: 11, recovery: 14, range: 4.8, halfAngle: 22, maxTargets: 2, penetration: 0.45, cooldown: 120, slow: 45 }
  }
});

export function meleeDamageProfile(typeId, spec, damage, penetration = spec.penetration, dot = false) {
  return {
    id: typeId, category: 'melee', disableHeadshot: true, disableCritical: dot,
    fixedArmorPenetration: penetration,
    stats: { damage, damageDropOff: 0, headshotMultiplier: 1, armorPenetration: penetration,
      maxRange: spec.range, knockback: dot ? undefined : spec.knockback }
  };
}
