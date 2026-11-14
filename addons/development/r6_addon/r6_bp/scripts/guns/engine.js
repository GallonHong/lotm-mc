// R6 Siege Bedrock - firearm engine
//
// Firing model ported from Test Guns 2D:
//   itemStartUse -> trigger down + immediate shot; interval keeps firing while held
//   itemUse      -> single tap shot
//   stop events  -> trigger up
//   left click   -> reload
// Bullet FX (muzzle flash / tracer / impact) and random spread/sway are ported
// from Test Guns 2D as well (see guns/spread.js and RP particles).
//
// Works inside a match (R6 HP/damage pipeline) and in free mode
// (no match: item durability acts as the magazine, vanilla damage).
import { world, system, EquipmentSlot } from "@minecraft/server";
import { State, ps, TAGS } from "../state.js";
import { isCombatPhase, applyBulletHit, damageDevice } from "../damage.js";
import { WEAPONS, BARRIER_BLOCK } from "../data/registry.js";
import { damageBarricade } from "../gadgets/breach.js";
import { syncAmmoBar } from "../loadout.js";
import {
    mainhand, actionBar, sound, particle, safe, nowTick, add, mul, norm, sub,
    blockRay, rayBoxDistance, raySphereDistance, vec,
} from "../util.js";
import { beginShot, resetSpray, resetAllSpray, sampleSpreadDirection } from "./spread.js";

/** playerId -> trigger/session state */
const sessions = new Map();
const blockedMsgAt = new Map();
/** playerId -> { tick, weaponId }: global fire-rate gate (Test Guns `playerCooldowns`) */
const lastShotAt = new Map();

function shotReady(playerId, w) {
    const last = lastShotAt.get(playerId);
    if (!last || last.weaponId !== w.id) return true;
    return nowTick() - last.tick >= w.interval;
}

// ---------------------------------------------------------------- FX particles
const MUZZLE_MODEL = {
    ar: [0, 2, -12], dmr: [0, 1.6, -15], sniper: [0, 1.5, -17],
    smg: [0, 2, -10], lmg: [0, 2.2, -14], sg: [0, 2, -12],
    pistol: [0, 2, -8],
};

const TRACER = {
    heavy: { id: "r6:heavy_tracer", step: 0.70, maxSteps: 70 },
    pkm: { id: "r6:pkm_tracer", step: 0.75, maxSteps: 55 },
    shotgun: { id: "r6:shotgun_tracer", step: 1.20, maxSteps: 16 },
    vector: { id: "r6:vector_tracer", step: 0.80, maxSteps: 40 },
    bullet: { id: "r6:bullet_tracer", step: 0.75, maxSteps: 55 },
};

function isHeavyGun(w) {
    return w.cat === "sniper" || w.cat === "dmr" || w.cat === "sg";
}

function tracerFor(w) {
    if (w.cat === "sniper" || w.cat === "dmr") return TRACER.heavy;
    if (w.cat === "lmg") return TRACER.pkm;
    if (w.cat === "sg") return TRACER.shotgun;
    if (w.cat === "smg" || w.cat === "pistol") return TRACER.vector;
    return TRACER.bullet;
}

/** World-space approximation of the animated muzzle, clipped against walls. */
function muzzleLocation(player, w) {
    const head = player.getHeadLocation();
    const view = norm(player.getViewDirection());
    if (Math.hypot(view.x, view.y, view.z) < 1e-6) return head;
    const horizontal = Math.hypot(view.x, view.z);
    let right;
    if (horizontal > 1e-6) {
        right = { x: -view.z / horizontal, y: 0, z: view.x / horizontal };
    } else {
        const yaw = (safe(() => player.getRotation?.().y) || 0) * Math.PI / 180;
        right = { x: -Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
    }
    // right x forward points down for Bedrock's +Z south; invert to camera up.
    const up = {
        x: view.y * right.z - view.z * right.y,
        y: view.z * right.x - view.x * right.z,
        z: view.x * right.y - view.y * right.x,
    };
    up.x *= -1; up.y *= -1; up.z *= -1;
    const model = MUZZLE_MODEL[w.cat] ?? MUZZLE_MODEL.ar;
    const lateral = 6 / 16 + model[0] * 0.85 / 16;
    const vertical = (20.393715 - 27.41 + model[1] * 0.85) / 16;
    const reach = (6.886207 - model[2] * 0.85) / 16;
    const desired = {
        x: head.x + right.x * lateral + up.x * vertical + view.x * reach,
        y: head.y + up.y * vertical + view.y * reach,
        z: head.z + right.z * lateral + up.z * vertical + view.z * reach,
    };
    // fail closed: the barrel must have a clear path to its own muzzle
    const segment = norm(sub(desired, head));
    const length = Math.hypot(desired.x - head.x, desired.y - head.y, desired.z - head.z);
    const hit = blockRay(player.dimension, head, segment, Math.max(0.01, length));
    if (!hit) return desired;
    const travel = Math.max(0, hit.distance - 0.04);
    return add(head, mul(segment, travel));
}

function spawnMuzzleFlash(dimension, location, w) {
    particle(dimension, isHeavyGun(w) ? "r6:muzzle_flash_heavy" : "r6:muzzle_flash", location);
}

function drawTracer(dimension, start, end, w) {
    if (!start || !end) return;
    const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
    const totalDist = Math.hypot(dx, dy, dz);
    if (!Number.isFinite(totalDist) || totalDist < 0.1) return;
    const tracer = tracerFor(w);
    const steps = Math.max(2, Math.min(Math.floor(totalDist / tracer.step), tracer.maxSteps));
    for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        particle(dimension, tracer.id, {
            x: start.x + dx * frac,
            y: start.y + dy * frac,
            z: start.z + dz * frac,
        });
    }
}

function blockImpactFx(dimension, point, w) {
    particle(dimension, "r6:bullet_hit_spark", point);
    particle(dimension, "r6:bullet_hit_smoke", point);
    if (w.cat === "sniper" || w.cat === "dmr") {
        particle(dimension, "r6:bullet_hit_heavy_flash", point);
    }
}

// ---------------------------------------------------------------- weapon helpers
export function isWeaponItem(item) {
    return !!item && item.typeId.startsWith("r6:") && !!WEAPONS[item.typeId.slice(3)];
}

function weaponOf(item) {
    return isWeaponItem(item) ? WEAPONS[item.typeId.slice(3)] : undefined;
}

function heldWeapon(player) {
    const item = mainhand(player);
    const w = weaponOf(item);
    return w ? { item, w } : undefined;
}

function tapBlocked(player, text) {
    const last = blockedMsgAt.get(player.id) ?? 0;
    if (nowTick() - last < 30) return;
    blockedMsgAt.set(player.id, nowTick());
    if (text) actionBar(player, text);
}

/** Decide whether this player may shoot right now. */
function fireContext(player) {
    const st = ps(player);
    const match = State.match;
    if (match) {
        const inTeams = match.teams.blue.includes(player.id) || match.teams.orange.includes(player.id);
        if (!st || !inTeams) return { ok: false, reason: "§7你不在本局对战中" };
        if (st.dead || st.downed) return { ok: false };
        if (!isCombatPhase(match)) {
            return { ok: false, reason: match.phase === "prep" ? "§7准备阶段无法开枪" : "§7现在无法开枪" };
        }
        return { ok: true, mode: "match", st };
    }
    // no match at all -> free test mode (creative / sandbox)
    return { ok: true, mode: "free", st: st ?? null };
}

// ---------------------------------------------------------------- ammo
function freeDurability(item) {
    return safe(() => item?.getComponent("minecraft:durability")) ?? null;
}

function freeMagOf(item, w) {
    const durability = freeDurability(item);
    if (!durability) return w.mag;
    const max = durability.maxDurability ?? (w.mag + 1);
    return Math.max(0, Math.min(w.mag, max - 1 - (durability.damage ?? 0)));
}

function sessionAmmo(session, w) {
    if (session.mode === "match") {
        const st = State.players.get(session.playerId);
        const ammo = st?.ammo?.[session.weaponId];
        return ammo ? { mag: ammo.mag, reserve: ammo.reserve } : { mag: 0, reserve: 0 };
    }
    return { mag: session.freeMag ?? w.mag, reserve: Infinity };
}

function consumeAmmo(session, w) {
    if (session.mode === "match") {
        const st = State.players.get(session.playerId);
        const ammo = st?.ammo?.[session.weaponId];
        if (!ammo || ammo.mag <= 0) return false;
        ammo.mag -= 1;
        return true;
    }
    if ((session.freeMag ?? 0) <= 0) return false;
    session.freeMag -= 1;
    return true;
}

function syncFreeDurability(player, session, w) {
    if (session.mode !== "free") return;
    const item = mainhand(player);
    if (!item || item.typeId !== "r6:" + session.weaponId) return;
    const durability = freeDurability(item);
    if (!durability) return;
    const max = durability.maxDurability ?? (w.mag + 1);
    durability.damage = Math.max(0, Math.min(max - 1, max - 1 - (session.freeMag ?? 0)));
    safe(() => player.getComponent("minecraft:equippable")?.setEquipment(EquipmentSlot.Mainhand, item));
}

// ---------------------------------------------------------------- reload
function startReload(player, session, w) {
    if (session.reloadEnd) return;
    const ammo = sessionAmmo(session, w);
    if (ammo.mag >= w.mag) return;
    if (ammo.reserve <= 0) {
        actionBar(player, "§c弹药耗尽");
        sound(player, "r6.dry_fire", 0.7, 1.0);
        return;
    }
    session.reloadEnd = nowTick() + Math.ceil(w.reload * 20);
    session.armed = false;
    actionBar(player, "§e换弹中…");
    sound(player, w.cat === "pistol" ? "r6.reload_pistol_start" : "r6.reload_start", 0.85, 1.0);
}

function completeReload(player, session, w) {
    if (session.mode === "match") {
        const st = State.players.get(session.playerId);
        const ammo = st?.ammo?.[session.weaponId];
        if (ammo) {
            const need = w.mag - ammo.mag;
            const take = Math.min(need, ammo.reserve);
            ammo.mag += take;
            ammo.reserve -= take;
        }
        syncAmmoBar(player, session.weaponId);
    } else {
        session.freeMag = w.mag;
        syncFreeDurability(player, session, w);
    }
    const ammo = sessionAmmo(session, w);
    session.reloadEnd = 0;
    session.armed = !!session.holding && !!w.auto;
    session.nextShotTick = nowTick() + 4;
    sound(player, w.cat === "pistol" ? "r6.reload_pistol_end" : "r6.reload_end", 0.9, 1.0);
    actionBar(player, `§a装填完成 §7${ammo.mag}/${w.mag}`);
}

// ---------------------------------------------------------------- hitscan
function raycastShot(shooter, origin, dir, maxDistance, mode) {
    const dimension = shooter.dimension;
    let blockDistance = maxDistance;
    const blockHit = blockRay(dimension, origin, dir, maxDistance);
    if (blockHit) blockDistance = blockHit.distance;

    let best = null;
    let players = [];
    try { players = world.getPlayers(); } catch { }
    for (const p of players) {
        if (p.id === shooter.id) continue;
        if (mode === "match" && !ps(p)) continue;
        if (p.dimension.id !== dimension.id) continue;
        const loc = p.location;
        const crouch = safe(() => p.isSneaking) ? 1.5 : 1.8;
        const min = { x: loc.x - 0.32, y: loc.y + 0.05, z: loc.z - 0.32 };
        const max = { x: loc.x + 0.32, y: loc.y + crouch, z: loc.z + 0.32 };
        const tBody = rayBoxDistance(origin, dir, min, max);
        const head = p.getHeadLocation();
        const tHead = raySphereDistance(origin, dir, head, 0.33);
        let t = null;
        let headshot = false;
        if (tBody != null) t = tBody;
        if (tHead != null && (t == null || tHead <= tBody + 0.02)) {
            t = tHead;
            headshot = true;
        }
        if (t == null || t > blockDistance) continue;
        if (!best || t < best.distance) {
            best = {
                kind: "player", entity: p, distance: t,
                point: add(origin, mul(dir, t)), headshot,
            };
        }
    }
    let devices = [];
    try {
        devices = dimension.getEntities({
            location: origin,
            maxDistance: Math.max(3, blockDistance),
            families: ["r6_device", "r6_drone"],
        });
    } catch { }
    for (const e of devices) {
        const dev = State.devices.get(e.id);
        if (!dev) continue;
        const loc = e.location;
        const size = dev.size ?? [0.6, 0.6, 0.6];
        const half = Math.max(size[0], size[2]) * 0.5;
        const min = { x: loc.x - half, y: loc.y, z: loc.z - half };
        const max = { x: loc.x + half, y: loc.y + size[1], z: loc.z + half };
        const t = rayBoxDistance(origin, dir, min, max);
        if (t == null || t > blockDistance) continue;
        if (!best || t < best.distance) {
            best = { kind: "device", entity: e, distance: t, point: add(origin, mul(dir, t)), headshot: false };
        }
    }
    if (best) return best;
    if (blockHit) return { kind: "block", hit: blockHit, point: blockHit.point, distance: blockHit.distance };
    return null;
}

function fireShot(player, ctx, session, w) {
    const ammo = sessionAmmo(session, w);
    if (ammo.mag <= 0) {
        if (session.mode === "free") return;
        startReload(player, session, w);
        return;
    }
    consumeAmmo(session, w);
    session.shots += 1;
    session.hbTick = nowTick();
    session.nextShotTick = nowTick() + w.interval;
    lastShotAt.set(player.id, { tick: nowTick(), weaponId: w.id });
    // A tap never becomes a burst; a held trigger stays armed for auto weapons.
    if (!w.auto || !session.holding) session.armed = false;

    const dimension = player.dimension;
    const origin = player.getHeadLocation();
    const baseDir = norm(player.getViewDirection());
    const muzzle = muzzleLocation(player, w);
    const ads = safe(() => player.isSneaking) === true;
    const maxDist = w.cat === "sniper" || w.cat === "dmr" ? 90
        : w.cat === "pistol" ? 40 : w.cat === "sg" ? 24 : 70;
    const profile = beginShot(player, w);

    // muzzle flash + per-weapon gun sound (sound bank copied from source packs)
    spawnMuzzleFlash(dimension, muzzle, w);
    sound(player, w.soundId, 0.85, 0.95 + Math.random() * 0.1);
    safe(() => player.runCommand("camerashake add @s 0.03 0.03 positional"));

    const pellets = Math.max(1, w.pellets ?? 1);
    for (let i = 0; i < pellets; i++) {
        const dir = sampleSpreadDirection(baseDir, profile, pellets > 1);
        const hit = raycastShot(player, origin, dir, maxDist, ctx.mode);
        if (hit) {
            if (hit.kind === "player") {
                if (ctx.mode === "match") {
                    applyBulletHit(player, hit.entity, {
                        weaponId: session.weaponId,
                        distance: hit.distance,
                        headshot: hit.headshot,
                        hitPoint: hit.point,
                    });
                } else {
                    // free mode: vanilla damage so guns can be tested without a match
                    const damage = (w.damage ?? 5) * (hit.headshot ? 2 : 1);
                    safe(() => hit.entity.applyDamage(damage, {
                        cause: "entityAttack", damagingEntity: player,
                    }));
                    sound(player, hit.headshot ? "r6.hit_head" : "r6.hit_flesh", 0.6, 1.0);
                }
                particle(dimension, "r6:bullet_hit_spark", hit.point);
            } else if (hit.kind === "device") {
                damageDevice(hit.entity, (w.damage ?? 5) * 3, player);
                sound(player, "r6.hit_metal", 0.5, 1.2);
                particle(dimension, "r6:bullet_hit_spark", hit.point);
            } else if (hit.kind === "block") {
                const block = hit.hit?.block;
                if (block && block.typeId === BARRIER_BLOCK) {
                    damageBarricade(dimension, block, (w.damage ?? 8) * 2);
                }
                blockImpactFx(dimension, hit.point, w);
            }
            drawTracer(dimension, muzzle, hit.point, w);
        } else {
            drawTracer(dimension, muzzle, add(origin, mul(dir, maxDist)), w);
        }
    }

    if (ctx.st) ctx.st.bloom = Math.min(6, (ctx.st.bloom ?? 0) + (w.recoil ?? 1) * 0.18);
    if (session.mode === "match") {
        if (ammo.mag - 1 <= 0) {
            syncAmmoBar(player, session.weaponId);
            session.armed = false;
        }
    } else {
        syncFreeDurability(player, session, w);
        if ((session.freeMag ?? 0) <= 0) session.armed = false;
    }
    void ads;
}

// ---------------------------------------------------------------- sessions
function createSession(player, kind, ctx, w) {
    const session = {
        playerId: player.id,
        weaponId: w.id,
        slot: player.selectedSlotIndex,
        mode: ctx.mode,
        kind,
        armed: true,
        holding: kind === "start",
        startedTick: nowTick(),
        lastStartTick: nowTick(),
        hbTick: nowTick(),
        nextShotTick: nowTick(),
        reloadEnd: 0,
        shots: 0,
        freeMag: ctx.mode === "free" ? freeMagOf(mainhand(player), w) : undefined,
        maxTicks: 20 * 60 * 10,
        tapExpire: kind === "tap" ? nowTick() + 6 : 0,
    };
    sessions.set(player.id, session);
    return session;
}

/** Event entry point: fire now (itemUse / itemStartUse / itemStartUseOn). */
function eventTrigger(player, item, kind) {
    const w = weaponOf(item) ?? weaponOf(mainhand(player));
    if (!w) return false;
    if (w.shield) return true;
    const ctx = fireContext(player);
    if (!ctx.ok) {
        tapBlocked(player, ctx.reason);
        return true;
    }
    let session = sessions.get(player.id);
    if (session && session.weaponId !== w.id) {
        sessions.delete(player.id);
        session = undefined;
    }
    let shouldAttempt = true;
    if (!session) {
        session = createSession(player, kind, ctx, w);
    } else {
        session.mode = ctx.mode;
        session.slot = player.selectedSlotIndex;
        session.hbTick = nowTick();
        if (kind === "start") {
            const freshPress = nowTick() - (session.lastStartTick ?? 0) > 3;
            session.kind = "start";
            session.holding = true;
            session.lastStartTick = nowTick();
            if (freshPress) session.armed = true;
            // repeated itemStartUse while held: auto weapons may fire via the
            // event path too (the interval is the primary driver); semi-auto
            // only fires on a fresh press.
            shouldAttempt = freshPress || session.shots === 0 || !!w.auto;
        } else {
            // single tap always gets one shot, but never latches a hold
            session.armed = true;
            session.tapExpire = nowTick() + 6;
            shouldAttempt = !session.holding;
        }
    }
    if (!shouldAttempt) return true;
    if (session.reloadEnd > nowTick()) return true;
    if (!shotReady(player.id, w)) return true;
    fireShot(player, ctx, session, w);
    return true;
}

function endSession(player) {
    const session = sessions.get(player.id);
    if (session) {
        sessions.delete(player.id);
        if (session.mode === "match") syncAmmoBar(player, session.weaponId);
        else {
            const w = WEAPONS[session.weaponId];
            if (w) syncFreeDurability(player, session, w);
        }
    }
    resetSpray(player.id);
}

function validate(player, session) {
    const item = mainhand(player);
    if (!item || item.typeId !== "r6:" + session.weaponId) return false;
    if (player.selectedSlotIndex !== session.slot) return false;
    if (nowTick() - session.startedTick > session.maxTicks) return false;
    if (session.mode === "match") {
        const st = ps(player);
        if (!st || st.dead || st.downed) return false;
        if (!isCombatPhase()) return false;
        if (player.hasTag(TAGS.noShoot)) return false;
    }
    return true;
}

export const Guns = {
    /** itemStartUse / itemStartUseOn */
    onStartUse(player, item) {
        return eventTrigger(player, item, "start");
    },

    /** itemUse / itemUseOn - single tap (same wiring as Test Guns) */
    onItemUse(player, item) {
        return eventTrigger(player, item, "tap");
    },

    onStopUse(player) {
        endSession(player);
    },

    /** left click on a block = manual reload */
    tryReload(player) {
        const held = heldWeapon(player);
        if (!held || held.w.shield) return false;
        const ctx = fireContext(player);
        if (!ctx.ok) { tapBlocked(player, ctx.reason); return true; }
        let session = sessions.get(player.id);
        if (!session || session.weaponId !== held.w.id) {
            session = createSession(player, "tap", ctx, held.w);
            session.armed = false;
            session.holding = false;
            session.tapExpire = nowTick() + 40;
        }
        startReload(player, session, held.w);
        return true;
    },

    cancel(player) {
        sessions.delete(player.id);
        lastShotAt.delete(player.id);
        resetSpray(player.id);
    },

    cancelAll() {
        sessions.clear();
        lastShotAt.clear();
        resetAllSpray();
    },

    tick() {
        if (sessions.size === 0) return;
        const tick = nowTick();
        const online = new Map();
        try { for (const p of world.getPlayers()) online.set(p.id, p); } catch { }
        for (const [playerId, session] of [...sessions.entries()]) {
            const player = online.get(playerId);
            if (!player) { sessions.delete(playerId); resetSpray(playerId); continue; }
            if (!validate(player, session)) { sessions.delete(playerId); resetSpray(playerId); continue; }
            const w = WEAPONS[session.weaponId];
            if (!w) { sessions.delete(playerId); continue; }
            // lost stop event watchdog: triggers die if nothing refreshed them
            if (tick - (session.hbTick ?? session.startedTick) > 100) {
                sessions.delete(playerId);
                continue;
            }
            const ctx = fireContext(player);
            if (session.mode === "match") {
                const st = ctx.st;
                if (st && st.bloom > 0) st.bloom = Math.max(0, st.bloom - 0.12);
            }
            if (session.reloadEnd) {
                if (tick >= session.reloadEnd) completeReload(player, session, w);
                continue;
            }
            if (session.tapExpire && tick > session.tapExpire && !session.holding) {
                sessions.delete(playerId);
                resetSpray(playerId);
                continue;
            }
            if (!shotReady(playerId, w)) continue;
            const ammo = sessionAmmo(session, w);
            if (ammo.mag <= 0) {
                if (ammo.reserve <= 0) {
                    actionBar(player, "§c弹药耗尽，切换到副武器");
                    sound(player, "r6.dry_fire", 0.7, 1.0);
                    sessions.delete(playerId);
                    continue;
                }
                startReload(player, session, w);
                continue;
            }
            if (!ctx.ok) {
                if (!session.holding) sessions.delete(playerId);
                continue;
            }
            // auto weapons keep firing while the trigger is held (Test Guns model)
            if (!session.armed) {
                if (session.holding && w.auto && tick - (session.hbTick ?? 0) <= 12) {
                    session.armed = true;
                } else {
                    continue;
                }
            }
            fireShot(player, ctx, session, w);
        }
    },

    /** debug info for /scriptevent r6:debug */
    debugInfo(player) {
        const session = sessions.get(player.id);
        const item = mainhand(player);
        return {
            mainhand: item?.typeId ?? "none",
            selectedSlot: safe(() => player.selectedSlotIndex),
            session: session ? {
                weaponId: session.weaponId, mode: session.mode, kind: session.kind,
                armed: session.armed, holding: session.holding, shots: session.shots,
                reloadEnd: session.reloadEnd, nextShotTick: session.nextShotTick,
                freeMag: session.freeMag,
            } : null,
            inMatch: !!ps(player),
            phase: State.match?.phase ?? "no-match",
            canFire: fireContext(player),
        };
    },
};

export { weaponOf as gunDefinition, sessions as gunSessions };
