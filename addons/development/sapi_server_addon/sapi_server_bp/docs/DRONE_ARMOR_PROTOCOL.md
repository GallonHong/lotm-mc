# Drone chassis armor / blast protection (SAPI side)

SAPI mirrors the Test Guns damage contract; the canonical description lives in
`addons/development/test_guns_2d_addon/test_guns_bp/docs/DRONE_ARMOR.md`.

## SAPI-specific points

- `scripts/vendor/baizhan_damage/data/droneArmor.js` is the byte-identical mirror of
  Test Guns `scripts/data/droneArmor.js`; `source_hashes.json` records its hash.
- `scripts/vendor/baizhan_damage/feature/damageHandler.js` and
  `scripts/vendor/melee_damageHandler.js` resolve `intrinsicArmorPoints(entity.typeId)`
  before the equipment scan, so authoritative gun / flamethrower / rail / Baizhan
  damage and managed melee all share the same chassis armor.
- `scripts/vendor/baizhan_damage/feature/armorEngine.js` resolves
  `intrinsicBlastReduction(entity.typeId)` in `getBlastReduction()`; it is kept
  byte-identical with the Test Guns copy.
- Authoritative Baizhan splash (`modules/baizhan_permission.js`) and rail splash
  (`modules/rail_impact.js`) multiply their splash amount by
  `(1 - intrinsicBlastReduction(target.typeId))`, because those victims go straight
  through `DamageHandler.handleHit` and never pass the local explosion engines.
- Direct hits, burn ticks and the sonic skill are not reduced by the blast factor.

## Verification

```
node addons/development/apocalypse_life_addon/tests/test_drone_armor.mjs
```

The test pins both mirrors byte-for-byte, the tier values, full garage-drone
coverage, all three armor resolutions and all four splash sites. It also proves
`source_hashes.json` covered files are identical where required by the mirror rule.
