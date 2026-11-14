// R6 Siege Bedrock - shared helpers
import { world, system, ItemStack, EquipmentSlot } from "@minecraft/server";

// ---------------------------------------------------------------- vector math
export const vec = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const mul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const len = a => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
export const dist = (a, b) => len(sub(a, b));
export const norm = a => {
    const l = len(a);
    return l < 1e-6 ? vec(0, 0, 0) : { x: a.x / l, y: a.y / l, z: a.z / l };
};
export const cross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
});
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/** Rotate a direction unit vector inside a cone of `deg` degrees. */
export function applySpread(dir, deg) {
    if (!(deg > 0)) return dir;
    const up = Math.abs(dir.y) > 0.99 ? vec(1, 0, 0) : vec(0, 1, 0);
    const right = norm(cross(dir, up));
    const up2 = cross(right, dir);
    const ang = Math.random() * Math.PI * 2;
    const r = Math.tan((deg * Math.PI) / 180) * Math.sqrt(Math.random());
    return norm(add(dir, add(mul(right, Math.cos(ang) * r), mul(up2, Math.sin(ang) * r))));
}

// ---------------------------------------------------------------- text / feedback
export function msg(player, text) {
    try { player.sendMessage(text); } catch { }
}
export function actionBar(player, text) {
    try { player.onScreenDisplay.setActionBar(text); } catch { }
}
export function title(player, main, sub = "", opt = {}) {
    try {
        player.onScreenDisplay.setTitle(main, {
            subtitle: sub,
            fadeInDuration: opt.fadeIn ?? 10,
            stayDuration: opt.stay ?? 40,
            fadeOutDuration: opt.fadeOut ?? 10,
        });
    } catch { }
}

const SOUND_FALLBACK = "random.click";
export function sound(player, id, volume = 1, pitch = 1) {
    try {
        player.dimension.playSound(id || SOUND_FALLBACK, player.location, { volume, pitch });
    } catch { }
}
export function soundAt(dimension, id, location, volume = 1, pitch = 1) {
    try { dimension.playSound(id || SOUND_FALLBACK, location, { volume, pitch }); } catch { }
}
export function particle(dimension, id, location, molang = undefined) {
    try { dimension.spawnParticle(id, location, molang); } catch { }
}

// ---------------------------------------------------------------- blocks / rays
const FACE_NORMALS = {
    Up: vec(0, 1, 0), Down: vec(0, -1, 0),
    North: vec(0, 0, -1), South: vec(0, 0, 1),
    East: vec(1, 0, 0), West: vec(-1, 0, 0),
};
export const faceNormal = face => FACE_NORMALS[face] ?? vec(0, 1, 0);

/** Ray/AABB intersection distance, or null. */
export function rayBoxDistance(origin, dir, min, max) {
    let tmin = -Infinity, tmax = Infinity;
    for (const axis of ["x", "y", "z"]) {
        const o = origin[axis], d = dir[axis];
        if (Math.abs(d) < 1e-8) {
            if (o < min[axis] || o > max[axis]) return null;
            continue;
        }
        let t1 = (min[axis] - o) / d;
        let t2 = (max[axis] - o) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return null;
    }
    if (tmax < 0) return null;
    return tmin >= 0 ? tmin : tmax;
}

/** Ray/sphere intersection distance (front side), or null. */
export function raySphereDistance(origin, dir, center, radius) {
    const oc = sub(origin, center);
    const b = dot(oc, dir);
    const c = dot(oc, oc) - radius * radius;
    const h = b * b - c;
    if (h < 0) return null;
    const sq = Math.sqrt(h);
    let t = -b - sq;
    if (t < 0) t = -b + sq;
    return t >= 0 ? t : null;
}

export function blockPoint(block, faceLocation) {
    return add(block.location, faceLocation ?? vec(0.5, 0.5, 0.5));
}

/** Block raycast returning { block, face, point, distance } or null.
 *  The R6 steel frame block is see-through / walk-through, so bullets and
 *  placement rays pass straight through it. */
export function blockRay(dimension, origin, dir, maxDistance) {
    let start = origin;
    let remaining = maxDistance;
    for (let attempt = 0; attempt < 4; attempt++) {
        let hit = null;
        try {
            hit = dimension.getBlockFromRay(start, dir, {
                maxDistance: remaining,
                includeLiquidBlocks: false,
                includePassableBlocks: false,
            });
        } catch { return null; }
        if (!hit || !hit.block) return null;
        const loc = hit.block.location;
        const t = rayBoxDistance(start, dir, loc, add(loc, vec(1, 1, 1)));
        if (hit.block.typeId === "r6:steel_frame") {
            const step = (t ?? 0) + 0.03;
            start = add(start, mul(dir, step));
            remaining -= step;
            if (remaining <= 0) return null;
            continue;
        }
        const point = t == null ? add(loc, vec(0.5, 0.5, 0.5)) : add(start, mul(dir, t));
        return {
            block: hit.block,
            face: hit.face,
            point,
            distance: (maxDistance - remaining) + (t ?? 0),
        };
    }
    return null;
}

export const isSolidBlockId = id => {
    if (!id) return false;
    if (id === "minecraft:air") return false;
    if (id.includes("water") || id.includes("lava")) return false;
    if (id.includes("grass") && !id.includes("block")) return false;
    if (id.includes("flower") || id.includes("sapling") || id.includes("torch")) return false;
    if (id.includes("button") || id.includes("lever") || id.includes("rail")) return false;
    if (id.includes("carpet") || id.includes("snow_layer")) return false;
    return true;
};

// ---------------------------------------------------------------- players / items
export function mainhand(player) {
    try {
        return player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand);
    } catch { return undefined; }
}
export function offhand(player) {
    try {
        return player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Offhand);
    } catch { return undefined; }
}
export function setMainhand(player, stack) {
    try {
        player.getComponent("minecraft:equippable")?.setEquipment(EquipmentSlot.Mainhand, stack);
        return true;
    } catch { return false; }
}
export function inventoryContainer(player) {
    try { return player.getComponent("minecraft:inventory")?.container; } catch { return undefined; }
}
export function clearInventory(player) {
    const c = inventoryContainer(player);
    if (!c) return;
    for (let i = 0; i < c.size; i++) {
        try { c.setItem(i, undefined); } catch { }
    }
}
export function giveItem(player, stack) {
    const c = inventoryContainer(player);
    if (!c) return false;
    for (let i = 0; i < c.size; i++) {
        try {
            if (!c.getItem(i)) { c.setItem(i, stack); return true; }
        } catch { }
    }
    return false;
}
export function setSlot(player, slot, stack) {
    const c = inventoryContainer(player);
    if (!c) return;
    try { c.setItem(slot, stack); } catch { }
}
export function itemStack(typeId, amount = 1) {
    try { return new ItemStack(typeId, amount); } catch { return undefined; }
}
export function healthOf(entity) {
    try { return entity.getComponent("minecraft:health"); } catch { return undefined; }
}
export function aliveHealth(entity) {
    const h = healthOf(entity);
    return h ? h.currentValue : 0;
}
export function playerName(player) {
    try { return player.name; } catch { return "?"; }
}
export function playersNear(dimension, location, maxDistance, predicate = () => true) {
    try {
        return dimension.getPlayers({ location, maxDistance }).filter(predicate);
    } catch { return []; }
}
export function entitiesNear(dimension, location, maxDistance, families) {
    try {
        const q = { location, maxDistance };
        if (families) q.families = families;
        return dimension.getEntities(q);
    } catch { return []; }
}
export function nowTick() {
    try { return system.currentTick; } catch { return 0; }
}
export function fmtTime(ticks) {
    const secs = Math.max(0, Math.ceil(ticks / 20));
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}
export function safe(fn, label = "") {
    try {
        return fn();
    } catch (e) {
        try { console.warn(`[R6] ${label}: ${e}`); } catch { }
        return undefined;
    }
}
export function flag(player, tag) {
    try { return player?.hasTag(tag) ?? false; } catch { return false; }
}
export function setFlag(player, tag, value) {
    try {
        if (value) player.addTag(tag);
        else player.removeTag(tag);
    } catch { }
}

export { world, system, EquipmentSlot };
