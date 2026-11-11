# Tactical shield rules, 3.16.12

Both custom shields use the same incoming scripted-hit rule:

- Ordinary holding: subtract 10 HP, then reduce the excess by 60%.
- Sneaking: subtract 15 HP, then reduce the excess by 75%.
- Damage at or below the threshold is completely blocked, with no minimum 1-HP leak.
- 1 HP is half a vanilla heart. Examples before defender armor: a 20-HP hit becomes 4 / 1.25 HP, 30 becomes 8 / 3.75, 50 becomes 16 / 8.75, and 100 becomes 36 / 21.25 (ordinary / sneaking).

The threshold applies after attacker bonuses, critical/headshot damage and weapon offensive multipliers, but before defender chest passives and the armor curve. Only fresh frontal hits qualify. Mainhand and offhand both work, but dual-wielding shields never stacks two reductions. A nearly vertical view no longer accidentally grants rear protection. Unknown items whose names contain “shield” are not automatically registered.

## Damage, durability and effects

For attacks that can be blocked, a complete block causes no target damage call and no attacker lifesteal, fire/bleed application, weapon slow, rail hit effects or successful damage-hit passive. Custom shield durability is still consumed based on the absorbed hit. Armor is not worn by a full block. Unbreaking and normal shield breakage remain supported. A partially penetrating hit commits wear only if the native damage call accepts it.

Riot-shield direct ranged reflection is 50% of the actual incoming hit, after attacker bonuses and critical/headshot/weapon multipliers but before shield subtraction, shield percentage reduction and defender chest/armor mitigation. Full blocks still reflect. Fractional reflection stays exactly 50%, with no artificial minimum or integer rounding. Shield flash ability and cooldown are unchanged. Managed melee and perfect parries do not gain a new reflection effect.

## Flamethrower

Flamethrower direct pulses and their existing burn ticks ignore every registered shield's fixed threshold and percentage guard. Neither custom shield nor the vanilla shield reflects a flamethrower hit or consumes shield durability for it. Holding or raising a shield does not stop flame heat buildup or ignition.

This bypass is specific to the flamethrower. Armor/chest mitigation, 15% armor penetration, the special-weapon floor, fractional damage, accepted-hit checks and combat protection rules are unchanged. For flamethrower damage only, registered shields also contribute no armor points. Actual worn armor keeps its existing mitigation; other weapons keep the original armor estimate. Existing burns are neither cleared nor newly extended just because a shield is equipped. Fuel, cadence, damage, critical rolls, burn duration and heat thresholds are unchanged.

Other weapons retain the 10/15 threshold and 60%/75% excess reduction. Baizhan piercing and mounted cover traversal are unchanged.

## Melee and native limitations

The scripted attacks and skills handled by LocalMeleeTechniques / CombatTechniques use the custom shield rule only once. Perfect parry, poise and guard break remain active; perfect custom-shield parries now use the zero-damage/wear path. Existing sword-only and vanilla-shield technique guards keep their previous 75% reduction. Existing wounds do not become new blockable strikes.

Ordinary left-click attacks, including the three newer melee weapons, remain native Minecraft damage. API 1.15 does not offer reliable cancellable native before-hurt handling, so this release does not claim universal custom-shield blocking of native left-click, mob melee or other add-ons' damage. No after-the-fact health refund or global damage interception was added. Vanilla native shield blocking remains native.

The fixed threshold is per resolved hit. Shotgun pellets are separate hits, so low-damage pellets are strongly countered. This is deliberate per-hit threshold behavior, not a whole-shell aggregation.

## Verification for this change

- 96 controlled JavaScript integration cases, including 92 damage-equality comparisons, cover standalone flame engine sessions, authoritative SAPI flame requests, heat/burn, custom and vanilla shields, both hands, standing/sneaking, attacker bonuses/criticals, actual worn armor, protection and rejected damage.
- Holding a shield versus no shield gives equal flame damage under the same worn armor. Flame never reflects or wears the shield.
- Existing mounted Baizhan normal/piercing damage and shield wear match the recorded prior-release outputs; six geometry checks preserve mounted two-cell traversal and blocking beyond the limit.
- JSON, JavaScript syntax, relative imports, manifest dependencies and archive consistency are checked for the packaged output.
- These are static/controlled checks. Real Bedrock gameplay, multiplayer timing and rendering have not been tested in this environment.
