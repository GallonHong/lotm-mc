import { traceCover } from './baizhan.js';

// Non-colliding terrestrial vegetation only, including older Bedrock IDs and
// their newer split IDs. Never include minecraft:grass: it is legacy soil.
// Leaves, logs, bamboo, cactus, liquids and unknown/add-on blocks still stop
// flames. The plant blocks are neither removed nor ignited.
const FLAME_PASSABLE_PLANTS = new Set([
 'tallgrass', 'short_grass', 'tall_grass', 'fern', 'large_fern', 'double_plant',
 'short_dry_grass', 'tall_dry_grass', 'deadbush', 'dead_bush',
 'yellow_flower', 'red_flower', 'dandelion', 'poppy', 'blue_orchid', 'allium',
 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip',
 'oxeye_daisy', 'cornflower', 'lily_of_the_valley', 'wither_rose', 'torchflower',
 'sunflower', 'lilac', 'rose_bush', 'peony', 'pitcher_plant', 'pink_petals',
 'open_eyeblossom', 'closed_eyeblossom', 'wildflowers', 'leaf_litter',
 'sapling', 'oak_sapling', 'spruce_sapling', 'birch_sapling', 'jungle_sapling',
 'acacia_sapling', 'dark_oak_sapling', 'cherry_sapling', 'pale_oak_sapling',
 'mangrove_propagule', 'bamboo_sapling',
 'wheat', 'carrots', 'potatoes', 'beetroot', 'beetroots', 'melon_stem',
 'pumpkin_stem', 'torchflower_crop', 'pitcher_crop', 'sweet_berry_bush',
 'reeds', 'sugar_cane', 'vine', 'weeping_vines', 'twisting_vines',
 'brown_mushroom', 'red_mushroom', 'crimson_fungus', 'warped_fungus',
 'crimson_roots', 'warped_roots', 'nether_sprouts', 'nether_wart',
].map(id => `minecraft:${id}`));

/** One policy for flame damage and cosmetics. Stable API, no block writes. */
export function traceFlameCover(dimension, start, direction, maxDistance) {
 return traceCover(dimension, start, direction, maxDistance, 0, FLAME_PASSABLE_PLANTS);
}

/** Each unit lasts 4 ticks: 60 units = 240 ticks (12 seconds at 20 TPS). */
export const FLAMETHROWER = Object.freeze({
 id:'test_gun:flamethrower', ammoId:'test_gun:high_pressure_fuel', visualIndex:30,
 capacity:60, intervalTicks:4, range:10, coneDegrees:50, damage:10, armorPenetration:0.15,
 reloadTicks:60, maxHoldTicks:240, guardTicks:12, maxPending:256,
 heatThreshold:5, heatResetTicks:30, burnTicks:80, burnIntervalTicks:10, burnDamage:1,
});
export function flameContext(entity) {
 try { return JSON.stringify([entity.dimension.id,entity.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||['apoc:downed','apoc:downed_pending','apoc_downed','apoc:true_death'].includes(t)).sort()]); }
 catch { return null; }
}
