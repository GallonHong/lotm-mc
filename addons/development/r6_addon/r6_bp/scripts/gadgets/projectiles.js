// R6 Siege Bedrock - virtual projectiles (frag / nitro / EMP / gas / breaching round)
import { world, system } from "@minecraft/server";
import { State, ps, playerById } from "../state.js";
import { applyExplosion, hurt, isCombatPhase } from "../damage.js";
import { breachWall, destroyBlock } from "./breach.js";
import { WEAPONS } from "../data/registry.js";
import {
    vec, add, mul, norm, len, dist, soundAt, particle, actionBar, msg, safe, nowTick,
    playerName, blockRay,
} from "../util.js";

const GRAVITY = 0.05;

/** explosion damage that also works outside a match (free test mode) */
function blast(dimension, point, radius, damage, owner, opts = {}) {
    if (State.match) {
        applyExplosion(point, radius, damage, owner, opts);
        return;
    }
    let players = [];
    try { players = dimension.getPlayers({ location: point, maxDistance: radius }); } catch { }
    for (const p of players) {
        if (owner && p.id === owner.id && !opts.selfDamage) continue;
        const d = dist(p.location, point);
        if (d > radius) continue;
        const amount = Math.max(1, damage * (1 - (d / radius) * 0.6) * 2);
        safe(() => p.applyDamage(amount, { cause: "entityAttack", damagingEntity: owner }));
    }
    particle(dimension, "minecraft:explosion_particle", point);
}

function faceFromDir(dir) {
    const ax = Math.abs(dir.x), ay = Math.abs(dir.y), az = Math.abs(dir.z);
    if (ay >= ax && ay >= az) return dir.y >= 0 ? "Up" : "Down";
    if (ax >= az) return dir.x >= 0 ? "East" : "West";
    return dir.z >= 0 ? "South" : "North";
}

const PROJECTILE_SETUP = {
    frag: { speed: 0.85, gravity: true, ttl: 200, radius: 5.0, damage: 11, fuse: 40, bounce: true },
    nitro: { speed: 1.0, gravity: true, ttl: 200, radius: 6.5, damage: 16, fuse: 0, bounce: false },
    emp: { speed: 1.2, gravity: false, ttl: 120, radius: 6.0, damage: 0, fuse: 0, bounce: false },
    gas: { speed: 0.9, gravity: true, ttl: 200, radius: 4.0, damage: 0, fuse: 0, bounce: false },
    ash: { speed: 1.8, gravity: false, ttl: 40, radius: 3.2, damage: 6, fuse: 0, bounce: false },
    breach: { speed: 1.5, gravity: false, ttl: 40, radius: 2.5, damage: 4, fuse: 0, bounce: false },
};

export const Projectiles = {
    spawn(kind, owner, origin, dir, opts = {}) {
        const setup = PROJECTILE_SETUP[kind];
        if (!setup) return undefined;
        const speed = opts.speed ?? setup.speed;
        const proj = {
            id: State.seq++,
            kind,
            ownerId: owner?.id ?? null,
            ownerTeam: ps(owner)?.team ?? null,
            dimension: owner?.dimension ?? world.getDimension("overworld"),
            pos: { ...origin },
            vel: mul(norm(dir), speed),
            gravity: opts.gravity ?? setup.gravity,
            ttl: setup.ttl,
            fuse: setup.fuse > 0 ? -1 : 0, // -1 = armed after first impact
            collided: false,
            setup,
            extra: opts.extra ?? {},
        };
        State.projectiles.push(proj);
        particle(proj.dimension, "minecraft:basic_smoke_particle", proj.pos);
        return proj;
    },

    launch(kind, player, opts = {}) {
        const dir = player.getViewDirection();
        const origin = add(player.getHeadLocation(), mul(dir, 0.6));
        soundAt(player.dimension, "r6.gadget_deploy", player.location, 0.7, 1.1);
        return this.spawn(kind, player, origin, dir, opts);
    },

    tick() {
        if (State.projectiles.length === 0) return;
        const dimension = world.getDimension("overworld");
        for (const proj of [...State.projectiles]) {
            proj.ttl -= 1;
            if (proj.ttl <= 0) {
                this.finish(proj, proj.pos, null);
                continue;
            }
            // ADS interception
            if (this.interceptedByAds(proj)) continue;
            // fuse after impact
            if (proj.fuse > 0) {
                proj.fuse -= 1;
                if (proj.fuse <= 0) this.finish(proj, proj.pos, null);
                continue;
            }
            if (proj.gravity) proj.vel.y -= GRAVITY;
            const stepLen = len(proj.vel);
            const steps = Math.max(1, Math.ceil(stepLen / 0.4));
            let collided = false;
            for (let i = 0; i < steps && !collided; i++) {
                const next = add(proj.pos, mul(proj.vel, 1 / steps));
                let block;
                try { block = dimension.getBlock(next); } catch { block = undefined; }
                const passable = !block || block.typeId === "minecraft:air"
                    || block.typeId.includes("water") || block.typeId === "r6:steel_frame";
                if (passable) {
                    proj.pos = next;
                } else {
                    collided = true;
                    this.onImpact(proj, proj.pos, block);
                }
            }
            if (collided) continue;
            if (proj.pos.y < -64) {
                this.finish(proj, proj.pos, null);
                continue;
            }
            // trail
            if (nowTick() % 2 === 0) {
                particle(proj.dimension, proj.kind === "gas" ? "minecraft:basic_smoke_particle"
                    : "minecraft:basic_flame_particle", proj.pos);
            }
        }
    },

    interceptedByAds(proj) {
        for (const dev of [...State.devices.values()]) {
            if (dev.kind !== "gadget_ads" || dev.disabledUntil > nowTick()) continue;
            if (dev.team && proj.ownerTeam && dev.team === proj.ownerTeam) continue;
            if (!dev.entity?.isValid?.()) continue;
            if (dist(dev.entity.location, proj.pos) > 6.5) continue;
            dev.charges = (dev.charges ?? 0) - 1;
            dev.flashUntil = nowTick() + 8;
            soundAt(proj.dimension, "r6.emp", proj.pos, 0.7, 1.8);
            particle(proj.dimension, "minecraft:electric_spark_particle", proj.pos);
            State.projectiles = State.projectiles.filter(p => p.id !== proj.id);
            if (dev.charges <= 0) {
                State.devices.delete(dev.id);
                safe(() => dev.entity?.kill());
            }
            return true;
        }
        return false;
    },

    onImpact(proj, point, block) {
        proj.collided = true;
        if (proj.kind === "frag") {
            // bounce once, then fuse
            proj.vel = mul(proj.vel, -0.25);
            proj.vel.y = Math.abs(proj.vel.y) * 0.5;
            proj.pos = add(proj.pos, mul(proj.vel, -2));
            proj.fuse = proj.setup.fuse;
            soundAt(proj.dimension, "r6.beep", proj.pos, 0.5, 1.4);
            return;
        }
        void block;
        this.finish(proj, point, block);
    },

    finish(proj, point, block) {
        State.projectiles = State.projectiles.filter(p => p.id !== proj.id);
        const owner = proj.ownerId ? playerById(proj.ownerId) : undefined;
        const setup = proj.setup;
        switch (proj.kind) {
            case "frag":
                blast(proj.dimension, point, setup.radius, setup.damage, owner,
                    { selfDamage: true, cause: "frag" });
                soundAt(proj.dimension, "r6.explosion", point, 1.0, 1.1);
                break;
            case "nitro":
                blast(proj.dimension, point, setup.radius, setup.damage, owner,
                    { selfDamage: true, cause: "nitro" });
                soundAt(proj.dimension, "r6.explosion", point, 1.0, 0.9);
                break;
            case "emp":
                empBurst(proj, point, owner);
                break;
            case "gas":
                State.clouds.push({
                    id: State.seq++,
                    pos: { ...point },
                    dimension: proj.dimension,
                    radius: setup.radius,
                    endTick: nowTick() + 20 * 8,
                    ownerId: proj.ownerId,
                    ownerTeam: proj.ownerTeam,
                    nextDamageTick: nowTick() + 20,
                });
                soundAt(proj.dimension, "r6.gas", point, 1.0, 0.8);
                break;
            case "ash": {
                const face = faceFromDir(proj.vel);
                breachWall(proj.dimension, point, face, { width: 1, height: 1, depth: 1 });
                blast(proj.dimension, point, setup.radius, setup.damage, owner,
                    { cause: "breach" });
                break;
            }
            case "breach": {
                const face = faceFromDir(proj.vel);
                breachWall(proj.dimension, point, face, { width: 1, height: 1, depth: 1 });
                blast(proj.dimension, point, setup.radius, setup.damage, owner,
                    { cause: "breach" });
                break;
            }
            default:
                break;
        }
    },

    tickClouds() {
        if (State.clouds.length === 0) return;
        const tick = nowTick();
        for (const cloud of [...State.clouds]) {
            if (tick >= cloud.endTick) {
                State.clouds = State.clouds.filter(c => c.id !== cloud.id);
                continue;
            }
            if (tick % 4 === 0) {
                for (let i = 0; i < 3; i++) {
                    particle(cloud.dimension ?? world.getDimension("overworld"),
                        "minecraft:basic_smoke_particle",
                        add(cloud.pos, vec((Math.random() - 0.5) * cloud.radius * 1.6,
                            Math.random() * 1.2,
                            (Math.random() - 0.5) * cloud.radius * 1.6)));
                }
            }
            if (tick >= cloud.nextDamageTick) {
                cloud.nextDamageTick = tick + 20;
                const owner = cloud.ownerId ? playerById(cloud.ownerId) : undefined;
                let players = [];
                try {
                    players = (cloud.dimension ?? world.getDimension("overworld"))
                        .getPlayers({ location: cloud.pos, maxDistance: cloud.radius });
                } catch { }
                for (const p of players) {
                    const st = ps(p);
                    if (!st || st.dead || !isCombatPhase()) continue;
                    if (st.team === cloud.ownerTeam) continue;
                    if (dist(p.location, cloud.pos) > cloud.radius) continue;
                    if (State.match) hurt(p, 3, owner, { cause: "gas", teamDamage: false });
                    else safe(() => p.applyDamage(6, { cause: "entityAttack", damagingEntity: owner }));
                    safe(() => p.addEffect("blindness", 60, { amplifier: 1, showParticles: false }));
                    safe(() => p.addEffect("slowness", 60, { amplifier: 1, showParticles: false }));
                }
            }
        }
    },

    clear() {
        State.projectiles = [];
        State.clouds = [];
    },

    /** Breaching round fired by Ash's gadget (uses the visible weld-round behaviour). */
    fireBreachRound(player) {
        const dir = player.getViewDirection();
        const origin = add(player.getHeadLocation(), mul(dir, 0.7));
        return this.spawn("ash", player, origin, dir);
    },
};

function empBurst(proj, point, owner) {    soundAt(proj.dimension, "r6.emp", point, 1.0, 1.6);
    particle(proj.dimension, "minecraft:electric_spark_particle", point);
    for (const dev of [...State.devices.values()]) {
        if (!dev.entity?.isValid?.()) continue;
        if (dev.team === proj.ownerTeam) continue;
        if (dist(dev.entity.location, point) > 6) continue;
        dev.disabledUntil = Math.max(dev.disabledUntil ?? 0, nowTick() + 20 * 10);
        particle(proj.dimension, "minecraft:electric_spark_particle", dev.entity.location);
        dev.onEmp?.(dev, owner);
    }
    if (owner) actionBar(owner, "§bEMP 已瘫痪附近的敌方电子设备");
}
