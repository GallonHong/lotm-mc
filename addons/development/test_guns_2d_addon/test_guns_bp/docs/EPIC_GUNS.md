# Three epic wasteland firearms

## Balance and operation

All three are new purple epic items. Existing SCAR-H and all 25 earlier firearms remain unchanged. The base single-bullet values follow the current class rule: common x2 for epic, before range falloff, armor, headshots and equipment bonuses.

| Weapon / item ID | Base damage | Magazine / fire interval | Reload | Passive |
| --- | ---: | --- | --- | --- |
| SCAR-H「剥甲者」 / `test_gun:scarh_stripper` | 18 | 20 / 4 ticks (300 RPM) | 48 ticks (2.4 s) | Consecutive accepted hits on one target: 45%, 52%, 59%, 66%, 73%, 80% armor penetration; sixth hit reaches cap. |
| MP5K「接力者」 / `test_gun:mp5k_relay` | 13.5 | 30 / 2 ticks (600 RPM) | 40 ticks (2.0 s) | Each confirmed direct bullet kill restores a uniformly selected 2, 3 or 4 rounds, capped at 30. No inventory ammo is consumed or created. |
| Python「谢幕」 / `test_gun:python_finale` | 9 | 6 / 8 ticks (150 RPM), semi-auto | 52 ticks (2.6 s) | If pre-hit health is at or below 35% of effective maximum, x1.75 damage (15.75 before rounding/falloff/armor). |

SCAR uses `ammo_rifle`; MP5K and Python use the existing `ammo_45acp` gameplay ammunition class. This is ammunition compatibility, not a claim that the historical Python chambers .45 ACP. Python is balanced against the ordinary pistol baseline, not the special heavy-pistol Desert Eagle exception.

SCAR's penetration is applied to the real shared armor formula after the existing SCAR override. It does not bypass chest armor passives, shields or headshot helmets. Unarmored targets take no extra damage from its stacks. Missing, hitting a different target, a rejected/uncertain hit, reloading, changing weapons, death, leaving, changing world/match or a gap over 40 ticks resets the chain. The first hit is always 45%. Six hits against 20 vanilla armor points at zero range, without critical/headshot/equipment modifiers, deal 10.7 / 11.3 / 11.9 / 12.6 / 13.5 / 14.4 damage.

Python reads health before the hit. A shot crossing below 35% is not retroactively boosted. The existing armor formula still applies. Slow cadence, six rounds and low full-health damage keep it a finisher rather than a primary.

## Direct kill and PvP safety

Only the actual hitscan shot creates the one-use passive token. Generic damage handler calls, holding the MP5K at death time, assistance, delayed kill attribution, explosion, fire, bleed and reflected damage cannot independently award rounds. Rejected or throwing damage is never retried.

MP5K requires an accepted direct shot plus immediate positive-to-zero health or a matching engine death event occurring inside that exact damage call. If entity removal makes the death ambiguous, it gives no reward rather than relying on a later last-attacker attribution. This conservative edge case still needs live Bedrock verification.

PvP uses the existing match-specific magazine keys. It never touches survival ammo escrow or backpack inventory. Dead, downed, protected, unready and stunned attackers do not receive passive rewards. Protected enemies, teammates, outsiders and other matches retain the shared damage protection. Downing and finishing an already downed player do not trigger any of the three passives. Confirmed elimination of a live opponent can trigger MP5K if the shooter remains active in the same context. Match/world/held-item changes during damage cancel the reward. All focus state is cleared on the existing PvP lifecycle stop path.

## Blueprint acquisition versus firearm manufacture

Every finished gun still has a crafting-table recipe consuming exactly one of its own blueprints. A non-craftable blueprint does **not** mean the finished weapon cannot be manufactured.

- SCAR blueprint: no recipe produces it. A player-attributed ravager kill outside PvP has a 12% chance to drop one `test_gun:blueprint_scarh_stripper` at the corpse.
- Python blueprint: no recipe produces it. A player-attributed evoker (`minecraft:evocation_illager`) kill outside PvP has a 10% chance to drop one `test_gun:blueprint_python_finale`.
- MP5K blueprint: shapeless recipe consumes one each of blank blueprint, iron ingot, copper ingot, redstone and amethyst shard, producing one blueprint.

These two survival sources are registered in the actual `entityDie` handler and add an item without replacing vanilla loot tables. They need neither Daily Events nor a separate reward pack. Existing chest pools, third-party sources, other blueprint recipes and admin/creative acquisition remain untouched. This checkout contains no authoritative deployed Daily Events loot pool, so no claim is made that external reward boxes already include these new items.

Gun manufacturing:
- SCAR: blueprint + heavy barrel + iron block + two receivers + tungsten bolt + two stocks.
- MP5K: blueprint + barrel + copper ingot + two receivers + iron ingot + redstone + stock.
- Python: blueprint + barrel + tungsten bolt + two receivers + copper ingot + stock.

## Original resources and compatibility

Three original cuboid geometries, 128px worn-metal textures, 64px transparent gun icons with purple quality markers and purple blueprint icons, attachables and part animations were generated from the included original Python source. No new third-party model or texture was imported and no third-party base asset was changed. Existing permitted shared hold/ADS/muzzle animation interfaces and existing gun sounds are reused.

SCAR has a straight 20-round magazine extraction; MP5K has an angled compact magazine extraction. Python has six separately modeled chambers/rounds, 60-degree cylinder indexing, swing-out and ejection animation. All six new gun/blueprint icons project the actual muzzle upper-left at 24 degrees. The side-view preview is deliberately a separate camera.

New visual owner indices are explicit: SCAR 27, MP5K 28, Python 29. Indices 1–25 remain unchanged; 26 is reserved for the separately integrated 百战. The sender uses `visualIndex` when provided, otherwise the existing array index + 1. Both tests reject invalid or duplicate owner indices.

## Verification

Run `node --experimental-vm-modules tests/validate_epic_guns.mjs` and `python tests/test_epic_gun_resources.py`, plus every existing `.mjs` and `test_*.py` suite. Tests execute the actual damage, armor, ammo, team and PvP rules under a mocked Bedrock API. They cover 30 new behavior groups and five original-resource groups, including actual armor progression, normal/PvP ammo isolation, false/uncertain hits, assists, unrelated causes, threshold boundaries, loot hooks and icon direction.

The preview is `tools/previews/epic_guns.png`, generated by `tools/build_epic_gun_assets.py`. It is an offline geometry render, **not** a game screenshot. Live Bedrock import, first/third-person placement, animation playback, server callback timing and multiplayer resource synchronization have not been tested in this environment. No remote push or upload is part of this increment.
