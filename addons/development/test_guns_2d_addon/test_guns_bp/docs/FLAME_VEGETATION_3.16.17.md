# Flamethrower vegetation fix, Guns 3.16.17

Based on the delivered Guns 3.16.16 package. Flamethrower damage and flame
particles now use the same explicit vegetation policy. Grass, tall grass,
ferns, flowers, saplings, crops and selected small terrestrial plants do not
stop the spray. Legacy `tallgrass` / `double_plant` and newer split IDs are
covered, including both halves of double plants.

## Cause and boundaries

The old flame trace used the shared cover helper's `block.isSolid !== false`
condition. `isSolid` is not exposed by the stable 1.x Block API used by this
pack. An absent property therefore made grass count as an occupied cover
cell. No experimental API is required by this fix.

Flame tracing supplies a narrow set of vanilla plant IDs to the existing
voxel traversal. It does not depend on `isSolid`, block tags, or substring
matching. `minecraft:grass` is deliberately excluded because it is a legacy
soil-block ID, not the grass plant. Grass blocks, dirt, stone, wood, leaves,
glass, doors, fences, slabs, bamboo, cactus, liquids, waterlogged plants and
unknown/add-on blocks remain cover. Unavailable chunks still fail closed.
Plants are passed through without being broken or ignited. No native fire,
block mutation, explosion or terrain-write behavior was added.

Only the flamethrower opts into this policy. Other weapons retain the previous
shared trace behavior and penetration limits. Damage values, range, cone,
fuel, durability, shield bypass, armor and protection rules are unchanged.
Guns remains the sole scripted damage authority, standalone or alongside
SAPI 2.14.18+. No SAPI update is required for this particular fix. Earlier
server-dependent SAPI versions remain unsupported, as in Guns 3.16.16.

## Verification

- 454 focused automated cases, including the original missing-`isSolid`
  failure, all 70 allowed IDs, legacy/new grass forms, both plant halves,
  walls behind plants, liquids, unknown blocks and unloaded chunks.
- 2,000 deterministic comparisons of other weapons' shared traces against
  Guns 3.16.16, with identical results.
- Real Guns fire, pulse, damage, heat, burn and visual handlers tested with
  controlled Minecraft API doubles. Coverage includes shield bypass in both
  hands, crouching, protected targets, rejected damage, one fuel/wear charge
  per pulse, no service request and no terrain ignition.
- Complete Guns entrypoint loads with and without simulated SAPI presence:
  70 application modules plus two mocked API modules, startup registration,
  and three empty-world ticks in each case.
- All 705 pack JSON files parse; all 70 JavaScript modules parse and their
  relative imports resolve. Pack versions and resource dependency are
  consistently 3.16.17. Models, textures and sounds are byte-for-byte intact.

These checks run in Node with Minecraft API doubles. They are not a Bedrock
engine, client or multiplayer playtest. In a test world, confirm that the
spray and damage pass through grass and tall grass, stop at a wall behind
them, and never place fire blocks, both standalone and with SAPI 2.14.18+.

API reference checked during diagnosis:
https://learn.microsoft.com/en-us/minecraft/creator/priorscriptapi/minecraft/server-1xx/block?view=minecraft-bedrock-stable
