# Hostile spawn armor v1

The hostile-spawn authority writes `apoc:armor:N`, where N is an integer 0–40.
Entity tags persist with the entity and are visible across behavior packs, unlike
behavior-pack-scoped dynamic properties. `apoc:armor_source:<source>` records the
classification. A valid zero is initialized. Reconfiguration, migration between
zones, repeated observers and entity reloads do not reroll initialized values.
Malformed values are ignored. Duplicate valid values are read as their maximum,
never added together. No player or shelter guard is assigned innate armor.

## Sources

- Natural enemies: actual spawn position resolved by existing ZoneRegistry;
  law 0–10, outlaw 0–20, inclusive uniform integers. Existing safety checks and
  suppression remain in force. No new mobs are created by armor initialization.
- Dungeon enemies and bosses: inline initialization in IntegrationBridge after
  DungeonManager supplies each template's explicit armorMax. Teaching 5, normal
  10, advanced 20, hard 30, nightmare 35, calamity 40, inferno 40; all minimums 0.
  Ordinary stages, timed waves, route reinforcements and forced replenishment
  share this path. Dedicated boss spawn failure still does not spawn a substitute.
  `apoc:armor_max:N` allows the delayed generic observer to recognize the source.
- Extraction city: inline 0–40 on ordinary enemies, all horde waves and bosses.
- Existing already-loaded enemies are not scanned or retroactively rebalanced.
  New spawns are the acceptance target. Existing saved armor tags are preserved.

## Timing and ownership

SpawnDirector, dungeon and city controlled spawns initialize armor before their
creation method returns. The existing generic entitySpawn observer remains
deferred to allow foreign spawning scripts to attach source metadata. It snapshots
the birth location before deferring, so movement does not reclassify a spawn.
An unmanaged `/summon` or third-party spawn may have up to one scheduler tick
without armor before this observer runs; no engine-level first-hit guarantee is
claimed for those outside producers. Older dungeon packs without armor metadata
fall back to 0–10; update all five release packs for full difficulty scaling.

## Damage contract

This tag is TOTAL armor in the existing addon damage formula, not extra armor
added on top of randomly equipped gear. The three Guns/SAPI damage adapters read
it before equipment estimation, including for mobs with no equippable component.
Existing equipment visuals, native equipment behavior, equipment durability and
drop tables are unchanged. No wearable items are created by this feature.

Existing armor-aware firearm, managed melee, flamethrower, Baizhan, rail, arc,
grenade, rocket and artillery paths consume it. Existing armor penetration,
damage floors, damage credit and shield logic are unchanged. Native vanilla
attacks/environmental damage, and intentionally armor-bypassing true damage,
wounds/bleeding and reflection still follow their existing rules. In particular,
the recent flamethrower bypass of shield guard/reflection remains intact.

## Validation

Static JSON, JavaScript syntax, relative import and manifest checks; source-to-
archive byte comparisons; 352 natural spawn/contract assertions, 816 damage
cases, 5 dungeon/city suites, and the prior 96 flame/shield scenarios with 92
damage-equality comparisons. These are mocked JavaScript API tests, not Bedrock
engine playtests. Verify in a backed-up Bedrock world before production use.

API references checked:
- https://learn.microsoft.com/en-us/minecraft/creator/priorscriptapi/minecraft/server-1xx/entitytypefamilycomponent
- https://learn.microsoft.com/en-us/minecraft/creator/priorscriptapi/minecraft/server-1xx/entity
