//code by uncxrafter
import { world, system, MolangVariableMap } from "@minecraft/server";
import { BulletList } from "./list.js"
const OVERWORLD = world.getDimension("overworld")
world.afterEvents.projectileHitBlock.subscribe((e) => {
    const { projectile, location, hitVector, source, dimension } = e
    const { block, face, faceLocation } = e.getBlockHit()
    //console.warn(block.typeId)
    if (!BulletList[projectile.typeId]) return
    const isBlockDestroyed = breakBlocks(block)
    if (isBlockDestroyed) return

    bulletHole(source, projectile, location, block, face)
    bulletSmoke(source, location)
    playSound(dimension, location, block)

})

const breakableBlocks = ["minecraft:glass", "minecraft:glass_pane", "spruce_leaves"]
const metalicBlocks = ["minecraft:iron_block", "minecraft:gold_block", "minecraft:netherite_block"]
function breakBlocks(block) {
    if (breakableBlocks.includes(block.typeId)) {
        const { x, y, z } = block.location
        block.dimension.runCommand(`fill ${x} ${y} ${z} ${x} ${y} ${z} air destroy`)
        return true
    }
}
function bulletHole(source, projectile, location, block, face) {
    const enableBulletHoles = true
    if (!enableBulletHoles) return
    //testSmoke (source, location) 
    let particle = BulletHoleParticles[face]
    const blockFaceVector = BlockFaceVectors[face]
    //console.warn(JSON.stringify(blockFaceVector))
    const particleLocation = {
        x: location.x + blockFaceVector.x,
        y: location.y + blockFaceVector.y,
        z: location.z + blockFaceVector.z
    }
    source.dimension.spawnParticle(particle, particleLocation)
}
const DIRECTION_SCALE = 0.025;

const BlockFaceVectors = {
    Up: { x: 0, y: DIRECTION_SCALE, z: 0 },
    Down: { x: 0, y: -DIRECTION_SCALE, z: 0 },
    North: { x: 0, y: 0, z: -DIRECTION_SCALE },
    South: { x: 0, y: 0, z: DIRECTION_SCALE },
    East: { x: DIRECTION_SCALE, y: 0, z: 0 },
    West: { x: -DIRECTION_SCALE, y: 0, z: 0 }
};

const BulletHoleParticles = {
    Up: "vxg:bullet_hole_y",
    Down: "vxg:bullet_hole_y",
    North: "vxg:bullet_hole_z",
    South: "vxg:bullet_hole_z",
    East: "vxg:bullet_hole_x",
    West: "vxg:bullet_hole_x"
};
function bulletSmoke(source, location) {

    let particle = "test:impact"
    source.dimension.spawnParticle(particle, location)
}

const bulletHitBlockSounds = new Map([
    ["ww.bullet.hit.dirt", [
        "minecraft:dirt",
        "minecraft:coarse_dirt",
        "minecraft:podzol",
        "minecraft:rooted_dirt",
        "minecraft:mud",
        "minecraft:muddy_mangrove_roots",
        "minecraft:grass_block",
        "minecraft:mycelium",
        "minecraft:crimson_nylium",
        "minecraft:warped_nylium"
    ]],
    ["ww.bullet.hit.water", [
        "minecraft:water",
        "minecraft:flowing_water",
        "minecraft:bubble_column",
        "minecraft:kelp",
        "minecraft:seagrass",
        "minecraft:tall_seagrass"
    ]],
    ["ww.bullet.hit.metal", [
        "chiseled_copper",
        "weathered_chiseled_copper",
        "oxidized_chiseled_copper",
        "waxed_weathered_chiseled_copper",
        "waxed_oxidized_chiseled_copper",
        "waxed_chiseled_copper",
        "exposed_chiseled_copper",
        "waxed_exposed_chiseled_copper",
        "copper_block",
        "raw_copper_block",
        "raw_gold_block",
        "raw_iron_block",
        "exposed_copper",
        "cut_copper",
        "exposed_cut_copper",
        "exposed_cut_copper_slab",
        "exposed_cut_copper_stairs",
        "lightning_rod",
        "oxidized_copper",
        "oxidized_cut_copper",
        "oxidized_cut_copper_stairs",
        "polished_deepslate",
        "polished_deepslate_slab",
        "polished_deepslate_stairs",
        "polished_deepslate_wall",
        "waxed_copper_block",
        "waxed_cut_copper",
        "waxed_cut_copper_slab",
        "waxed_cut_copper_stairs",
        "waxed_exposed_copper",
        "waxed_exposed_cut_copper",
        "waxed_exposed_cut_copper_slab",
        "waxed_exposed_cut_copper_stairs",
        "waxed_oxidized_copper",
        "waxed_oxidized_cut_copper",
        "waxed_oxidized_cut_copper_slab",
        "waxed_oxidized_cut_copper_stairs",
        "waxed_weathered_copper",
        "waxed_weathered_cut_copper",
        "waxed_weathered_cut_copper_slab",
        "waxed_weathered_cut_copper_stairs",
        "weathered_copper",
        "weathered_cut_copper",
        "weathered_cut_copper_slab",
        "weathered_cut_copper_stairs",
        "activator_rail",
        "anvil",
        "chipped_anvil",
        "damaged_anvil",
        "blast_furnace",
        "cauldron",
        "diamond_block",
        "grindstone",
        "hopper",
        "iron_bars",
        "iron_block",
        "mob_spawner",
        "netherite_block",
        "rail",
        "iron_door",
        "copper_door",
        "exposed_copper_door",
        "weathered_copper_door",
        "oxidized_copper_door",
        "waxed_copper_door",
        "waxed_exposed_copper_door",
        "waxed_weathered_copper_door",
        "waxed_oxidized_copper_door",
        "heavy_weighted_pressure_plate",
        "light_weighted_pressure_plate",
        "cut_copper_slab",
        "cut_copper_stairs",
        "trial_spawner",
        "vault",
        "heavy_core",
        "copper_bulb",
        "exposed_copper_bulb",
        "weathered_copper_bulb",
        "oxidized_copper_bulb",
        "waxed_copper_bulb",
        "waxed_exposed_copper_bulb",
        "waxed_weathered_copper_bulb",
        "waxed_oxidized_copper_bulb",
        "copper_grate",
        "exposed_copper_grate",
        "weathered_copper_grate",
        "oxidized_copper_grate",
        "waxed_copper_grate",
        "waxed_exposed_copper_grate",
        "waxed_weathered_copper_grate",
        "waxed_oxidized_copper_grate"
    ]],
    ["ww.bullet.hit.wood", [

        "minecraft:oak_planks",
        "minecraft:birch_planks",
        "minecraft:spruce_planks",
        "minecraft:jungle_planks",
        "minecraft:acacia_planks",
        "minecraft:dark_oak_planks",
        "minecraft:mangrove_planks",
        "minecraft:cherry_planks",
        "minecraft:bamboo_planks",
        "minecraft:crimson_planks",
        "minecraft:warped_planks",


        "minecraft:oak_log",
        "minecraft:birch_log",
        "minecraft:spruce_log",
        "minecraft:jungle_log",
        "minecraft:acacia_log",
        "minecraft:dark_oak_log",
        "minecraft:mangrove_log",
        "minecraft:cherry_log",


        "minecraft:stripped_oak_log",
        "minecraft:stripped_birch_log",
        "minecraft:stripped_spruce_log",
        "minecraft:stripped_jungle_log",
        "minecraft:stripped_acacia_log",
        "minecraft:stripped_dark_oak_log",
        "minecraft:stripped_mangrove_log",
        "minecraft:stripped_cherry_log",


        "minecraft:oak_wood",
        "minecraft:birch_wood",
        "minecraft:spruce_wood",
        "minecraft:jungle_wood",
        "minecraft:acacia_wood",
        "minecraft:dark_oak_wood",
        "minecraft:mangrove_wood",
        "minecraft:cherry_wood",


        "minecraft:stripped_oak_wood",
        "minecraft:stripped_birch_wood",
        "minecraft:stripped_spruce_wood",
        "minecraft:stripped_jungle_wood",
        "minecraft:stripped_acacia_wood",
        "minecraft:stripped_dark_oak_wood",
        "minecraft:stripped_mangrove_wood",
        "minecraft:stripped_cherry_wood",

        "minecraft:bookshelf",
        "minecraft:chest",
        "minecraft:trapped_chest",
        "minecraft:barrel",
        "minecraft:lectern",
        "minecraft:cartography_table",
        "minecraft:fletching_table",
        "minecraft:smithing_table",
        "minecraft:loom",
        "minecraft:composter",
        "minecraft:beehive",
        "minecraft:bee_nest",
        "minecraft:daylight_detector",
        "minecraft:note_block",
        "minecraft:jukebox",
        "minecraft:crafting_table",
        "minecraft:ladder",
        "minecraft:scaffolding",
        "minecraft:campfire",
        "minecraft:soul_campfire",
        "minecraft:wooden_button",
        "minecraft:wooden_pressure_plate",
        "minecraft:wooden_door",
        "minecraft:wooden_trapdoor",
        "minecraft:wooden_fence",
        "minecraft:wooden_fence_gate",
        "minecraft:wooden_slab",
        "minecraft:wooden_stairs"
    ]]
]);

function playSound(deminsion, location, block) {
    if (!block) return;

    let sound = null;
    for (const [soundId, blocks] of bulletHitBlockSounds) {
        if (blocks.includes(block.typeId)) {
            sound = soundId;
            break;
        }
    }
    console.warn(sound || "ww.bullet.hit.normal")
    //OVERWORLD.runCommand(`playsound ${sound} @a[r=7] ~ ~ ~  2 1`)

    deminsion.playSound(sound || "ww.bullet.hit.normal", location, { volume: 17 });
}

/*
const WATER_CHECK_INTERVAL = 1; // Check every 1 tick
const BulletQuery = { families: ["projectile"]};

system.runInterval(() => {
    const bullets = OVERWORLD.getEntities(BulletQuery);
    
    for (const bullet of bullets) {
        if (bullet.getDynamicProperty("hitWater")) continue;
        
        const block = bullet.dimension.getBlock(bullet.location);
        if (block && (block.typeId === "minecraft:water" || block.typeId === "minecraft:flowing_water")) {

            console.warn("hit water")
            bullet.setDynamicProperty("hitWater", true);

            const location = bullet.location;
            const sound = "ww.bullet.hit.water"
            OVERWORLD.playSound(sound, location, {volume: 17});

            bullet.dimension.spawnParticle("adn:test", location, {volume: 10});
        }
    }
}, WATER_CHECK_INTERVAL);
*/