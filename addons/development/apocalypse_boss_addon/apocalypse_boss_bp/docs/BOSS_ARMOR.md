# Boss spawn armor fallback

This pack assigns persisted **total addon armor**, uniformly from zero through the
source cap (inclusive), to newly spawned living bosses. A stored zero is valid.
Existing saved entities are not scanned or backfilled. Moving, reloading, and
repeat observers do not reroll an initialized value.

The entity-spawn observer captures birth dimension and position and waits three
ticks. Inline dungeon/city assignments and the updated Mobs pack's one-tick
observer take precedence, in either behavior-pack subscription order. The fallback
recognizes the `apoc_boss` family or `minecraft:boss` component, requires health,
and explicitly excludes `apoc_boss:visual_probe` and players.

Fallback priority:

1. `daily_dungeon_enemy`: use `apoc:armor_max:N` (0–40). Missing/invalid difficulty
   metadata conservatively uses 0–10.
2. `apoc_extract:city` birth dimension or existing extraction source tags: 0–40.
3. Built-in law-zone birth coordinates: 0–10.
4. Other outlaw birth coordinates: 0–20.
5. Safe-zone manual bosses: conservative default 0–10.

The standalone read-only resolver copies the existing Mobs static presets exactly
and treats the world spawn's horizontal radius of 64 blocks as safe. It does not
read Mobs/SAPI dynamic properties: those are behavior-pack scoped. With the updated
Mobs pack installed, its earlier assignment supplies its dynamic-zone result.

PvP exclusions and all existing boss AI, suppression, entity definitions, drops,
and assets remain unchanged. This observer creates/removes no entity and does not
add a generic damage hook or vanilla equipment armor. Effective addon damage
reduction requires armor-aware Guns 3.16.13 and SAPI 2.14.16 (or later compatible
versions); tags alone do not modify native vanilla damage.

Persisted contract: `apoc:armor:N` plus `apoc:armor_source:SOURCE`. The helper is
byte-identical to the Mobs producer helper.
