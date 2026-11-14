// R6 Siege Bedrock - destruction: breaching, sledge hammer, wall reinforcements
// and the destructible wood barricade -> steel frame block chain.
import { world, system, BlockPermutation } from "@minecraft/server";
import { State, ps } from "../state.js";
import { damageDevice } from "../damage.js";
import { BARRIER_BLOCK, FRAME_BLOCK, BARRIER_BLOCK_HP } from "../data/registry.js";
import {
    blockRay, faceNormal, add, mul, sub, vec, dist, norm, actionBar, sound, particle,
    msg, safe, particle as pcl,
} from "../util.js";

const HARD_BLOCKS = new Set([
    "minecraft:bedrock", "minecraft:barrier", "minecraft:command_block",
    "minecraft:chain_command_block", "minecraft:repeating_command_block",
    "minecraft:end_portal", "minecraft:end_portal_frame", "minecraft:obsidian",
    "minecraft:crying_obsidian", "minecraft:reinforced_deepslate", "minecraft:structure_block",
    "minecraft:structure_void", "minecraft:jigsaw", "minecraft:light_block",
    FRAME_BLOCK,
]);

const SOFT_HINTS = [
    "planks", "log", "wood", "glass", "wool", "door", "trapdoor", "fence", "bricks",
    "dirt", "grass_block", "sand", "gravel", "clay", "terracotta", "concrete", "leaves",
    "bamboo", "mud", "snow", "hay", "melon", "pumpkin", "bookshelf", "crafting_table",
    "chest", "barrel", "ladder", "scaffolding", "moss", "dripstone", "calcite", "tuff",
    "copper", "iron_bars", "cobble", "stone", "deepslate", "granite", "diorite", "andesite",
];

export function blockKey(location) {
    return `${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;
}

export function isHardBlock(block) {
    return HARD_BLOCKS.has(block.typeId);
}

export function isBarricadeBlock(block) {
    return block?.typeId === BARRIER_BLOCK;
}

export function isSteelFrameBlock(block) {
    return block?.typeId === FRAME_BLOCK;
}

export function isDestructible(block) {
    if (!block || HARD_BLOCKS.has(block.typeId)) return false;
    const id = block.typeId;
    if (id === "minecraft:air") return false;
    if (id.includes("water") || id.includes("lava")) return false;
    return true;
}

export function isSoftBlock(block) {
    if (block?.typeId === BARRIER_BLOCK) return true;
    if (!isDestructible(block)) return false;
    const id = block.typeId;
    return SOFT_HINTS.some(hint => id.includes(hint));
}

export function isReinforced(location) {
    const set = State.match?.reinforced;
    if (!set) return false;
    return set.has(blockKey(location));
}

export function clearReinforced() {
    if (State.match) State.match.reinforced = new Set();
}

// ---------------------------------------------------------------- barricade -> steel frame
/** remember player-placed barricades so a new round can restore the original blocks */
export function trackBarricadePlacement(location, originalType = "minecraft:air") {
    if (!State.placements) State.placements = new Map();
    State.placements.set(blockKey(location), {
        x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z),
        originalType,
    });
}

function clearBlockDamage(location) {
    if (State.barricadeHp) State.barricadeHp.delete(blockKey(location));
}

export function clearBarricadeDamage() {
    if (State.barricadeHp) State.barricadeHp.clear();
    if (State.placements) State.placements.clear();
}

/** Replace a wooden barricade with the steel beam frame it leaves behind. */
export function turnIntoSteelFrame(dimension, block) {
    try {
        block.setPermutation(BlockPermutation.resolve(FRAME_BLOCK));
        clearBlockDamage(block.location);
        const center = add(block.location, vec(0.5, 0.5, 0.5));
        sound(dimension, "r6.barricade_break", center, 1.0, 1.0);
        for (let i = 0; i < 10; i++) {
            pcl(dimension, "minecraft:basic_smoke_particle",
                add(center, vec((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9,
                    (Math.random() - 0.5) * 0.9)));
        }
        return true;
    } catch (e) {
        console.warn(`[R6] failed to transform barricade: ${e}`);
        return false;
    }
}

/**
 * Bullet damage against a wooden barricade. After BARRIER_BLOCK_HP the plank
 * breaks apart and only the steel frame remains.
 */
export function damageBarricade(dimension, block, amount) {
    if (!isBarricadeBlock(block)) return false;
    if (!State.barricadeHp) State.barricadeHp = new Map();
    const key = blockKey(block.location);
    const hp = (State.barricadeHp.get(key) ?? BARRIER_BLOCK_HP) - amount;
    if (hp <= 0) {
        State.barricadeHp.set(key, 0);
        return turnIntoSteelFrame(dimension, block);
    }
    State.barricadeHp.set(key, hp);
    pcl(dimension, "minecraft:basic_smoke_particle", add(block.location, vec(0.5, 0.5, 0.5)));
    sound(dimension, "r6.barricade_place", add(block.location, vec(0.5, 0.5, 0.5)), 0.6, 1.4);
    return false;
}

/** Place a wooden barricade block; returns false when the spot is not free. */
export function placeBarricade(dimension, location) {
    try {
        const block = dimension.getBlock(location);
        if (!block) return false;
        const original = block.typeId;
        if (isBarricadeBlock(block) || isSteelFrameBlock(block)) return false;
        block.setPermutation(BlockPermutation.resolve(BARRIER_BLOCK));
        trackBarricadePlacement(location, original);
        const center = add(location, vec(0.5, 0.5, 0.5));
        sound(dimension, "r6.barricade_place", center, 0.9, 0.9);
        pcl(dimension, "minecraft:basic_smoke_particle", center);
        return true;
    } catch (e) {
        console.warn(`[R6] failed to place barricade: ${e}`);
        return false;
    }
}

/** Restore every player-placed barricade / frame back to its original block (round reset). */
export function restoreRoundBlocks(dimension) {
    if (!State.placements || State.placements.size === 0) {
        clearBarricadeDamage();
        return;
    }
    const dim = dimension ?? world.getDimension("overworld");
    for (const [key, entry] of [...State.placements.entries()]) {
        try {
            const block = dim.getBlock({ x: entry.x, y: entry.y, z: entry.z });
            if (!block) continue;
            if (block.typeId !== BARRIER_BLOCK && block.typeId !== FRAME_BLOCK) continue;
            if (entry.originalType && entry.originalType !== "minecraft:air") {
                block.setPermutation(BlockPermutation.resolve(entry.originalType));
            } else {
                block.setPermutation(BlockPermutation.resolve("minecraft:air"));
            }
        } catch { }
        State.placements.delete(key);
    }
    clearBarricadeDamage();
}

export function destroyBlock(dimension, location, byPlayer) {
    try {
        const block = dimension.getBlock(location);
        if (!block) return false;
        if (isSteelFrameBlock(block)) return false;
        if (isBarricadeBlock(block)) {
            // wooden barricades never vanish completely: they leave a steel frame
            return turnIntoSteelFrame(dimension, block);
        }
        if (!isDestructible(block)) return false;
        const key = blockKey(location);
        if (State.match?.reinforced?.has(key)) State.match.reinforced.delete(key);
        block.setType("minecraft:air");
        pcl(dimension, "minecraft:basic_smoke_particle", add(location, vec(0.5, 0.5, 0.5)));
        void byPlayer;
        return true;
    } catch {
        return false;
    }
}

/** Thermite / Ash / Fuze style breach: knock a hole in a wall. */
export function breachWall(dimension, point, face, opts = {}) {
    const normal = faceNormal(face);
    let axisA, axisB;
    if (Math.abs(normal.y) > 0.5) {
        axisA = vec(1, 0, 0); axisB = vec(0, 0, 1);
    } else if (Math.abs(normal.x) > 0.5) {
        axisA = vec(0, 0, 1); axisB = vec(0, 1, 0);
    } else {
        axisA = vec(1, 0, 0); axisB = vec(0, 1, 0);
    }
    const base = { x: Math.floor(point.x), y: Math.floor(point.y), z: Math.floor(point.z) };
    const width = opts.width ?? 1;
    const height = opts.height ?? 1;
    let removed = 0;
    for (let d = 0; d <= (opts.depth ?? 1); d++) {
        for (let a = -width; a <= width; a++) {
            for (let b = -height; b <= height; b++) {
                const loc = add(base, add(mul(axisA, a), add(mul(axisB, b), mul(normal, d + 0.5))));
                if (destroyBlock(dimension, { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) })) removed++;
            }
        }
    }
    // blast visuals
    for (let i = 0; i < 12; i++) {
        pcl(dimension, "minecraft:explosion_particle", add(point, vec(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)));
    }
    sound(dimension, "r6.explosion", point, 1.0, 1.0);
    return removed;
}

/** Sledgehammer: smash soft structures in a small cube in front of the player. */
export function sledgeBreak(player) {
    const dimension = player.dimension;
    const origin = player.getHeadLocation();
    const dir = player.getViewDirection();
    const hit = blockRay(dimension, origin, dir, 3.2);
    if (!hit) {
        actionBar(player, "§7前方没有可破坏的结构");
        return false;
    }
    if (isSteelFrameBlock(hit.block)) {
        actionBar(player, "§7钢梁框架无法用破门锤破坏");
        return false;
    }
    let removed = 0;
    const base = hit.block.location;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                const loc = add(base, vec(dx, dy, dz));
                let block;
                try { block = dimension.getBlock(loc); } catch { continue; }
                if (!block || !isSoftBlock(block)) continue;
                if (isReinforced(loc)) continue;
                if (destroyBlock(dimension, loc, player)) removed++;
            }
        }
    }
    // also hit gadgets / shields in front
    try {
        for (const e of dimension.getEntities({ location: hit.point, maxDistance: 2.4, families: ["r6_device"] })) {
            damageDevice(e, 120, player);
        }
    } catch { }
    sound(dimension, "r6.sledge", hit.point, 1.0, 1.0);
    sound(dimension, "r6.barricade_break", hit.point, 0.9, 0.8);
    pcl(dimension, "minecraft:basic_smoke_particle", hit.point);
    actionBar(player, removed > 0 ? `§a破门锤击碎了 ${removed} 个方块` : "§7这里没有可被破门锤破坏的结构");
    return removed > 0;
}

/** Reinforce the block the player is looking at. */
export function reinforceBlock(player) {
    const dimension = player.dimension;
    const hit = blockRay(dimension, player.getHeadLocation(), player.getViewDirection(), 4.5);
    if (!hit || !hit.block) {
        actionBar(player, "§c请对准一面墙/地板使用加固");
        return false;
    }
    const block = hit.block;
    if (!isDestructible(block) || isBarricadeBlock(block)) {
        actionBar(player, "§c这个方块无法加固");
        return false;
    }
    const key = blockKey(block.location);
    State.match.reinforced.add(key);
    sound(dimension, "r6.armor_plate", hit.point, 1.0, 0.9);
    pcl(dimension, "minecraft:basic_smoke_particle", hit.point);
    actionBar(player, `§a已加固 ${block.typeId.replace("minecraft:", "")}`);
    return true;
}

/** Damage all breakable blocks in a radius (used by nitro / explosions). */
export function blastBlocks(dimension, center, radius) {
    let removed = 0;
    const r = Math.ceil(radius);
    for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dz = -r; dz <= r; dz++) {
                const loc = { x: Math.floor(center.x) + dx, y: Math.floor(center.y) + dy, z: Math.floor(center.z) + dz };
                if (dist(center, add(loc, vec(0.5, 0.5, 0.5))) > radius) continue;
                let block;
                try { block = dimension.getBlock(loc); } catch { continue; }
                if (!block || !isDestructible(block)) continue;
                if (isBarricadeBlock(block)) {
                    if (turnIntoSteelFrame(dimension, block)) removed++;
                    continue;
                }
                if (isHardBlock(block)) continue;
                if (destroyBlock(dimension, loc)) removed++;
            }
        }
    }
    return removed;
}
