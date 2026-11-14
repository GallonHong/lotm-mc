// R6 Siege Bedrock - deployable gadget entities & their per-tick logic
import { world, system } from "@minecraft/server";
import { State, ps, playerById, TAGS } from "../state.js";
import { DEVICES } from "../data/registry.js";
import { hurt as rawHurt, applyExplosion, damageDevice, isCombatPhase, armorMultiplier } from "../damage.js";
import { breachWall, destroyBlock } from "./breach.js";
import { Hud } from "../hud.js";
import {
    vec, add, sub, mul, norm, len, dist, nowTick, soundAt, particle, actionBar, msg, safe,
    blockRay, faceNormal, playerName, entitiesNear, playerName as pName,
} from "../util.js";

const MAX_DEVICE_AGE = 20 * 60 * 10;

function dimension() {
    return world.getDimension("overworld");
}

function yawFromNormal(normal) {
    return (Math.atan2(normal.x, normal.z) * 180) / Math.PI;
}

export function spawnDevice(kind, location, owner, opts = {}) {
    if (!DEVICES[kind]) return null;
    const dim = owner?.dimension ?? dimension();
    let entity;
    try {
        entity = dim.spawnEntity("r6:" + kind, location);
    } catch (e) {
        console.warn(`[R6] spawn device ${kind} failed: ${e}`);
        return null;
    }
    if (!entity) return null;
    try {
        entity.setRotation?.({ x: 0, y: opts.yaw ?? 0 });
    } catch { }
    const def = DEVICES[kind];
    const maxHp = opts.hp ?? defaultHp(kind);
    const dev = {
        id: entity.id,
        kind,
        entity,
        team: ps(owner)?.team ?? opts.team ?? null,
        ownerId: owner?.id ?? null,
        hp: maxHp,
        maxHp,
        size: def.size,
        charges: opts.charges ?? 0,
        disabledUntil: 0,
        createdAt: nowTick(),
        tick: 0,
        data: opts.data ?? {},
        yaw: opts.yaw ?? 0,
    };
    State.devices.set(entity.id, dev);
    dev.onSpawn?.(dev);
    return dev;
}

function defaultHp(kind) {
    switch (kind) {
        case "gadget_shield": return 260;
        case "gadget_panel": return 320;
        case "gadget_jammer": return 90;
        case "gadget_ads": return 70;
        case "gadget_battery": return 80;
        case "gadget_kapkan": return 50;
        case "gadget_turret": return 150;
        case "gadget_armor_pack": return 120;
        case "gadget_exo": return 40;
        case "gadget_cluster": return 40;
        case "drone": return 40;
        default: return 100;
    }
}

/** Place a gadget on the surface the player is looking at. */
export function placeOnSurface(player, kind, opts = {}) {
    const dim = player.dimension;
    const hit = blockRay(dim, player.getHeadLocation(), player.getViewDirection(), opts.range ?? 5.0);
    if (!hit || !hit.block) {
        actionBar(player, "§c没有找到可放置的表面");
        return null;
    }
    const normal = faceNormal(hit.face);
    let location;
    let yaw;
    if (opts.floor || Math.abs(normal.y) > 0.5) {
        const base = hit.block.location;
        location = add(base, vec(0.5, opts.onTop === false ? 0.05 : 1.0, 0.5));
        yaw = ps(player)?.side === "defender" ? 0 : 180;
    } else {
        location = add(hit.point, mul(normal, 0.3));
        yaw = yawFromNormal(normal);
    }
    if (dist(location, player.location) > 6) {
        actionBar(player, "§c目标位置太远");
        return null;
    }
    const dev = spawnDevice(kind, location, player, { yaw, data: { face: hit.face }, ...opts });
    if (dev) {
        soundAt(dim, "r6.gadget_deploy", location, 0.9, 1.0);
        particle(dim, "minecraft:basic_smoke_particle", location);
        actionBar(player, `§a已部署 ${kindLabel(kind)}`);
    }
    return dev;
}

function kindLabel(kind) {
    return {
        gadget_shield: "可伸缩护盾", gadget_panel: "防弹护甲板", gadget_jammer: "信号干扰器",
        gadget_ads: "主动防御系统", gadget_battery: "电击接线", gadget_kapkan: "入口陷阱",
        gadget_turret: "机枪塔", gadget_armor_pack: "护甲包", gadget_exo: "放热炸药",
        gadget_cluster: "簇式炸药", drone: "无人机",
    }[kind] ?? kind;
}

// ---------------------------------------------------------------- behaviours
function nearestEnemy(dev, radius) {
    let best = null;
    let players = [];
    try {
        players = dev.entity.dimension.getPlayers({ location: dev.entity.location, maxDistance: radius });
    } catch { return null; }
    for (const p of players) {
        if (p.id === dev.ownerId) continue;
        const st = ps(p);
        if (st && (st.dead || st.downed)) continue;
        if (st?.team && dev.team && st.team === dev.team) continue;
        const d = dist(p.location, dev.entity.location);
        if (!best || d < best.distance) best = { player: p, ps: st, distance: d };
    }
    return best;
}

/** damage that works both inside a match (R6 pipeline) and in free mode */
function dealDamage(target, amount, owner, cause) {
    if (!target) return;
    if (State.match && ps(target)) rawHurt(target, amount, owner, { cause });
    else safe(() => target.applyDamage(Math.max(1, amount * 2), {
        cause: "entityAttack", damagingEntity: owner,
    }));
}

function explosionLike(center, radius, amount, owner, opts = {}) {
    const dimension = world.getDimension("overworld");
    if (State.match) {
        applyExplosion(center, radius, amount, owner, opts);
        return;
    }
    let players = [];
    try { players = dimension.getPlayers({ location: center, maxDistance: radius }); } catch { }
    for (const p of players) {
        const d = dist(p.location, center);
        if (d > radius) continue;
        dealDamage(p, amount * (1 - (d / radius) * 0.6), owner, "explosion");
    }
    particle(dimension, "minecraft:explosion_particle", center);
}

function hasLineOfSight(from, to, dimension) {
    try {
        const dir = norm(sub(to, from));
        const d = dist(from, to);
        const hit = dimension.getBlockFromRay(from, dir, {
            maxDistance: Math.max(0.5, d - 0.8), includeLiquidBlocks: false,
            includePassableBlocks: false,
        });
        return !hit;
    } catch {
        return true;
    }
}

const BEHAVIOURS = {
    gadget_shield(dev) {
        dev.onDestroy = () => {
            particle(dev.entity.dimension, "minecraft:basic_smoke_particle", dev.entity.location);
            soundAt(dev.entity.dimension, "r6.hit_metal", dev.entity.location, 1.0, 0.8);
        };
    },
    gadget_panel(dev) {
        dev.onDestroy = () => {
            particle(dev.entity.dimension, "minecraft:basic_smoke_particle", dev.entity.location);
            soundAt(dev.entity.dimension, "r6.barricade_break", dev.entity.location, 1.0, 0.7);
        };
    },
    gadget_jammer(dev) {
        if (dev.tick % 5 !== 0) return;
        const radius = 6;
        let jammed = 0;
        for (const other of [...State.devices.values()]) {
            if (other === dev || !other.entity?.isValid?.()) continue;
            if (other.team === dev.team) continue;
            if (!["gadget_exo", "gadget_cluster", "drone"].includes(other.kind)) continue;
            if (dist(other.entity.location, dev.entity.location) > radius) continue;
            other.disabledUntil = nowTick() + 6;
            soundAt(dev.entity.dimension, "r6.jammer", other.entity.location, 0.6, 1.0);
            jammed++;
        }
        if (dev.tick % 20 === 0) {
            particle(dev.entity.dimension, "minecraft:electric_spark_particle", dev.entity.location);
        }
        void jammed;
    },
    gadget_ads(dev) {
        if (dev.tick % 10 === 0) {
            particle(dev.entity.dimension, "minecraft:endrod", add(dev.entity.location, vec(0, 0.6, 0)));
        }
    },
    gadget_battery(dev) {
        if (dev.tick % 5 === 0) {
            particle(dev.entity.dimension, "minecraft:electric_spark_particle", dev.entity.location);
        }
        if (dev.tick % 20 !== 0) return;
        const enemy = nearestEnemy(dev, 3.5);
        if (!enemy) return;
        const owner = dev.ownerId ? playerById(dev.ownerId) : undefined;
        dealDamage(enemy.player, 2, owner, "shock");
        soundAt(dev.entity.dimension, "r6.emp", enemy.player.location, 0.7, 1.2);
        safe(() => enemy.player.addEffect("slowness", 40, { amplifier: 1, showParticles: false }));
        particle(dev.entity.dimension, "minecraft:electric_spark_particle", enemy.player.location);
    },
    gadget_kapkan(dev) {
        if (dev.disabledUntil > nowTick()) return;
        const enemy = nearestEnemy(dev, 2.4);
        if (!enemy) return;
        const owner = dev.ownerId ? playerById(dev.ownerId) : undefined;
        explosionLike(dev.entity.location, 2.6, 8, owner, { cause: "kapkan" });
        safe(() => enemy.player.addEffect("slowness", 60, { amplifier: 2, showParticles: false }));
        soundAt(dev.entity.dimension, "r6.explosion", dev.entity.location, 1.0, 1.1);
        State.devices.delete(dev.id);
        safe(() => dev.entity.kill());
    },
    gadget_turret(dev) {
        dev.fireCooldown = (dev.fireCooldown ?? 0) - 1;
        if (dev.disabledUntil > nowTick()) return;
        if (dev.fireCooldown > 0) return;
        const enemy = nearestEnemy(dev, 16);
        if (!enemy) return;
        const from = add(dev.entity.location, vec(0, 1.0, 0));
        const to = enemy.player.getHeadLocation();
        if (!hasLineOfSight(from, to, dev.entity.dimension)) return;
        const owner = dev.ownerId ? playerById(dev.ownerId) : undefined;
        dealDamage(enemy.player, 1.8, owner, "turret");
        particle(dev.entity.dimension, "minecraft:basic_flame_particle", to);
        soundAt(dev.entity.dimension, "r6.pkm_shoot", from, 0.7, 1.2);
        dev.fireCooldown = 9;
    },
    gadget_armor_pack(dev) {
        if (dev.tick % 10 !== 0) return;
        let players = [];
        try {
            players = dev.entity.dimension.getPlayers({ location: dev.entity.location, maxDistance: 2.2 });
        } catch { return; }
        for (const p of players) {
            const st = ps(p);
            if (!st || st.dead || st.downed) continue;
            if (st.team !== dev.team) continue;
            if (st.plate >= 1) continue;
            st.plate = 1;
            st.score = (st.score ?? 0) + 10;
            actionBar(p, "§a已拾取护甲板 (+1 护甲等级)");
            soundAt(dev.entity.dimension, "r6.armor_plate", dev.entity.location, 1.0, 1.0);
            Hud.announce(`§b[护甲包] §f${playerName(p)} §7拾取了护甲板`, "");
            State.devices.delete(dev.id);
            safe(() => dev.entity.kill());
            return;
        }
    },
    gadget_exo(dev) {
        dev.data.fuse = dev.data.fuse ?? 50;
        if (dev.disabledUntil > nowTick()) return;
        dev.data.fuse -= 1;
        if (dev.data.fuse > 0) {
            if (dev.tick % 5 === 0) {
                particle(dev.entity.dimension, "minecraft:basic_flame_particle", dev.entity.location);
            }
            return;
        }
        const owner = dev.ownerId ? playerById(dev.ownerId) : undefined;
        const face = dev.data.face ?? "Up";
        breachWall(dev.entity.dimension, dev.entity.location, face, { width: 1, height: 1, depth: 1 });
        explosionLike(dev.entity.location, 2.8, 7, owner, { cause: "exo" });
        soundAt(dev.entity.dimension, "r6.explosion", dev.entity.location, 1.0, 0.9);
        State.devices.delete(dev.id);
        safe(() => dev.entity.kill());
    },
    gadget_cluster(dev) {
        dev.data.fuse = dev.data.fuse ?? 40;
        if (dev.disabledUntil > nowTick()) return;
        dev.data.fuse -= 1;
        if (dev.data.fuse > 0) {
            if (dev.tick % 4 === 0) {
                particle(dev.entity.dimension, "minecraft:basic_flame_particle", dev.entity.location);
            }
            return;
        }
        dev.data.blasts = dev.data.blasts ?? 5;
        dev.data.nextBlast = dev.data.nextBlast ?? 0;
        if (dev.data.nextBlast > 0) {
            dev.data.nextBlast -= 1;
            return;
        }
        if (dev.data.blasts > 0) {
            dev.data.blasts -= 1;
            dev.data.nextBlast = 7;
            const face = dev.data.face ?? "Up";
            const normal = faceNormal(face);
            const target = add(dev.entity.location, mul(normal, 1.2));
            const owner = dev.ownerId ? playerById(dev.ownerId) : undefined;
            explosionLike(target, 2.2, 4, owner, { cause: "cluster" });
            breachWall(dev.entity.dimension, target, face, { width: 0, height: 0, depth: 0 });
            soundAt(dev.entity.dimension, "r6.explosion", target, 0.7, 1.3);
            return;
        }
        State.devices.delete(dev.id);
        safe(() => dev.entity.kill());
    },
    drone(dev) {
        if (dev.ownerId && dev.ownerId !== null) {
            const owner = playerById(dev.ownerId);
            if (owner) {
                const st = ps(owner);
                if (!st || st.dead) {
                    // recall when the owner is gone
                    State.devices.delete(dev.id);
                    safe(() => dev.entity.kill());
                    return;
                }
                if (dev.disabledUntil <= nowTick()) {
                    const target = add(owner.getHeadLocation(),
                        add(mul(owner.getViewDirection(), 2.2), vec(0, 1.4, 0)));
                    const cur = dev.entity.location;
                    const next = {
                        x: cur.x + (target.x - cur.x) * 0.25,
                        y: cur.y + (target.y - cur.y) * 0.25,
                        z: cur.z + (target.z - cur.z) * 0.25,
                    };
                    safe(() => dev.entity.teleport(next, { dimension: owner.dimension }));
                }
            }
        }
        if (dev.tick % 40 === 0) {
            const enemy = nearestEnemy(dev, 8);
            if (enemy) {
                particle(dev.entity.dimension, "minecraft:endrod",
                    add(enemy.player.getHeadLocation(), vec(0, 0.6, 0)));
                const owner = dev.ownerId ? playerById(dev.ownerId) : undefined;
                if (owner) {
                    const d = Math.round(dist(owner.location, enemy.player.location));
                    actionBar(owner, `§b无人机发现敌人 §f${d}m`);
                    soundAt(dev.entity.dimension, "r6.ping", dev.entity.location, 0.6, 1.6);
                }
            } else if (dev.tick % 80 === 0) {
                // zap an enemy gadget nearby
                for (const other of [...State.devices.values()]) {
                    if (other.team === dev.team) continue;
                    if (dist(other.entity.location, dev.entity.location) > 7) continue;
                    other.disabledUntil = nowTick() + 20 * 4;
                    other.hp -= 40;
                    particle(other.entity.dimension, "minecraft:electric_spark_particle", other.entity.location);
                    break;
                }
            }
        }
    },
};

export const Deployables = {
    spawnDevice,
    placeOnSurface,

    tick() {
        if (State.devices.size === 0) return;
        for (const dev of [...State.devices.values()]) {
            if (!dev.entity || !dev.entity.isValid?.()) {
                State.devices.delete(dev.id);
                continue;
            }
            dev.tick += 1;
            if (dev.tick > MAX_DEVICE_AGE) {
                State.devices.delete(dev.id);
                safe(() => dev.entity.kill());
                continue;
            }
            if (dev.onSpawn && !dev.spawnHandled) {
                dev.spawnHandled = true;
                safe(() => dev.onSpawn(dev));
            }
            safe(() => BEHAVIOURS[dev.kind]?.(dev));
        }
    },

    /** attach behaviour hooks right after spawnDevice() */
    initDevice(dev) {
        if (!dev) return;
        const spawn = {
            gadget_shield: () => { },
            gadget_panel: () => { },
            gadget_jammer: () => { },
            gadget_ads: () => { },
            gadget_battery: () => { },
            gadget_kapkan: () => { },
            gadget_turret: () => { },
            gadget_armor_pack: () => { },
            gadget_exo: () => { },
            gadget_cluster: () => { },
            drone: () => { },
        };
        spawn[dev.kind]?.();
        if (BEHAVIOURS[dev.kind]) {
            // initialise defaults on first tick
            dev.onSpawn = undefined;
        }
    },

    removeAll() {
        for (const dev of [...State.devices.values()]) {
            safe(() => dev.entity?.kill());
        }
        State.devices.clear();
    },

    spawnDrone(owner) {
        const st = ps(owner);
        if (!st) return null;
        const origin = add(owner.getHeadLocation(), add(mul(owner.getViewDirection(), 2.0), vec(0, 1.2, 0)));
        const dev = spawnDevice("drone", origin, owner, {});
        return dev;
    },
};
