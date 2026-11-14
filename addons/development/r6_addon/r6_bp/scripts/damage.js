// R6 Siege Bedrock - damage pipeline (R6S health/armor model, DBNO, elimination)
import { world, system } from "@minecraft/server";
import { State, ps, TAGS, matchPlayers } from "./state.js";
import { Config } from "./config.js";
import { Hud } from "./hud.js";
import {
    mainhand, healthOf, actionBar, sound, particle, particle as _p, msg,
    setFlag, flag, dist, vec, dot, norm, sub, playerName, safe,
} from "./util.js";
import { WEAPONS } from "./data/registry.js";

const AMMO_TO_R6 = 5; // 1 Bedrock HP = 5 R6S HP (100/20)

export function isCombatPhase(match = State.match) {
    return !!match && (match.phase === "action" || match.phase === "planted");
}

export function sameTeam(a, b) {
    const sa = ps(a), sb = ps(b);
    return !!sa && !!sb && sa.team && sa.team === sb.team;
}

function armorLevel(st) {
    if (!st) return 1;
    return Math.min(3, (st.armor ?? 1) + (st.plate ?? 0));
}

export function armorMultiplier(st) {
    const level = armorLevel(st);
    if (level >= 3) return 1 / 1.2;
    if (level === 2) return 1 / 1.1;
    return 1;
}

function r6hp(entity) {
    const h = healthOf(entity);
    return h ? h.currentValue : 0;
}

function setHealth(entity, value) {
    const h = healthOf(entity);
    if (h) safe(() => h.setCurrentValue(Math.max(0, value)));
}

function shieldBlocks(victim, attacker) {
    const item = mainhand(victim);
    if (!item || !item.typeId.startsWith("r6:shield_")) return false;
    if (!attacker) return true;
    try {
        const toAttacker = norm(sub(attacker.location, victim.location));
        const facing = dot(victim.getViewDirection(), toAttacker);
        return facing > 0.25;
    } catch {
        return true;
    }
}

function creditDown(attacker, victim, st) {
    const ast = ps(attacker);
    if (ast && ast.team !== st.team) {
        ast.downs = (ast.downs ?? 0) + 1;
        ast.score = (ast.score ?? 0) + 75;
        ast.killsThisRound = (ast.killsThisRound ?? 0) + 1;
    }
}

function creditKill(attacker, victim, st) {
    const ast = ps(attacker);
    if (ast && ast.team !== st.team) {
        ast.kills = (ast.kills ?? 0) + 1;
        ast.score = (ast.score ?? 0) + 100;
    }
}

export function downPlayer(victim, attacker, cause = "gun") {
    const st = ps(victim);
    if (!st) return;
    if (st.dead) return;
    if (st.downed) {
        killPlayer(victim, attacker, cause);
        return;
    }
    st.downed = true;
    st.downTicks = Config.bleedoutSeconds * 20;
    st.downLocation = { ...victim.location };
    st.reviveProgress = 0;
    st.dead = false;
    setHealth(victim, 6);
    setFlag(victim, TAGS.down, true);
    setFlag(victim, TAGS.noShoot, true);
    safe(() => victim.removeEffect("speed"));
    safe(() => victim.addEffect("slowness", 20 * 600, { amplifier: 5, showParticles: false }));
    safe(() => victim.addEffect("weakness", 20 * 600, { amplifier: 9, showParticles: false }));
    State.channels.delete(victim.id);
    creditDown(attacker, victim, st);
    Hud.killFeed(playerName(attacker), playerName(victim), false, true);
    actionBar(victim, "§c你已倒地！§7等待队友救援，或按潜行爬行。");
    sound(victim, "r6.hit_flesh", 0.9, 0.7);
    // let the victim know how long they have
    safe(() => world.getDimension("overworld").spawnParticle("minecraft:critical_hit_emitter", victim.location));
    void cause;
}

export function killPlayer(victim, attacker, opts = {}) {
    const st = ps(victim);
    if (!st || st.dead) return;
    st.dead = true;
    st.downed = false;
    st.deaths = (st.deaths ?? 0) + 1;
    st.downLocation = null;
    creditKill(attacker, victim, st);
    setFlag(victim, TAGS.dead, true);
    setFlag(victim, TAGS.noShoot, true);
    setFlag(victim, TAGS.down, false);
    State.channels.delete(victim.id);
    for (const eff of ["slowness", "weakness", "blindness", "night_vision", "speed"]) {
        safe(() => victim.removeEffect(eff));
    }
    Hud.killFeed(playerName(attacker), playerName(victim), !!opts.headshot, false);
    sound(victim, "r6.explosion", 0.5, 1.6);
    safe(() => victim.kill());
    void opts.cause;
}

export function eliminate(victim, reason = "环境") {
    const st = ps(victim);
    if (!st || st.dead) return;
    st.dead = true;
    st.downed = false;
    st.deaths = (st.deaths ?? 0) + 1;
    setFlag(victim, TAGS.dead, true);
    setFlag(victim, TAGS.noShoot, true);
    setFlag(victim, TAGS.down, false);
    State.channels.delete(victim.id);
    Hud.announce(`§7${reason}§7: §f${playerName(victim)} §7已淘汰`, "");
    safe(() => victim.kill());
}

/**
 * Generic hurt entry used by bullets, melee and explosions.
 * opts: { headshot, hsMultiplier, teamDamage, selfDamage, cause, ignoreShield }
 */
export function hurt(victim, amount, attacker, opts = {}) {
    if (!victim || victim.typeId !== "minecraft:player") {
        if (victim && attacker) {
            safe(() => victim.applyDamage(amount * 4, { cause: "entityAttack", damagingEntity: attacker }));
        }
        return;
    }
    const st = ps(victim);
    const match = State.match;
    if (!match || !st || !isCombatPhase(match) || st.dead) return;
    if (attacker && attacker.id === victim.id && !opts.selfDamage) return;
    if (attacker && sameTeam(attacker, victim) && !opts.teamDamage) return;

    if (st.downed) {
        killPlayer(victim, attacker, { cause: "finish" });
        return;
    }

    let damage = amount;
    let headshot = !!opts.headshot;
    if (!opts.ignoreShield && shieldBlocks(victim, attacker)) {
        damage *= 0.12;
        headshot = false;
        actionBar(victim, "§b护盾格挡");
    }
    damage *= armorMultiplier(st);

    if (headshot && typeof opts.hsMultiplier === "number") {
        damage *= opts.hsMultiplier;
        headshot = false;
    }

    st.lastDamageTick = system.currentTick;
    st.lastAttackerId = attacker?.id ?? null;

    const hp = r6hp(victim);
    const r6damage = Math.round(damage * AMMO_TO_R6);
    if (headshot) {
        killPlayer(victim, attacker, { headshot: true, cause: opts.cause ?? "gun" });
        return;
    }
    if (hp - damage <= 0.01) {
        downPlayer(victim, attacker, opts.cause ?? "gun");
        return;
    }
    setHealth(victim, hp - damage);
    try {
        actionBar(victim, `§c-${r6damage} §7HP ${Math.ceil((hp - damage) * AMMO_TO_R6)}`);
    } catch { }
    if (attacker) {
        const ast = ps(attacker);
        if (ast) ast.hitsThisRound = (ast.hitsThisRound ?? 0) + 1;
    }
}

export function applyBulletHit(shooter, victim, opts = {}) {
    if (!shooter || !victim) return;
    const weapon = WEAPONS[opts.weaponId];
    if (!weapon) return;
    let damage = weapon.damage;
    if (Number.isFinite(opts.distance)) {
        const [near, far, floor] = weapon.decay;
        if (opts.distance <= near) {
            /* full */
        } else if (opts.distance >= far) {
            damage *= floor;
        } else {
            damage *= 1 - (1 - floor) * ((opts.distance - near) / (far - near));
        }
    }
    const headshot = !!opts.headshot && weapon.hs === "instant";
    const hsMultiplier = typeof weapon.hs === "number" ? weapon.hs : undefined;
    if (hsMultiplier && opts.headshot) damage *= hsMultiplier;
    if (opts.headshot) {
        particle(victim.dimension, "minecraft:critical_hit_emitter", victim.getHeadLocation?.() ?? victim.location);
    }
    hurt(victim, damage, shooter, {
        headshot: headshot,
        cause: "gun",
    });
    sound(shooter, headshot ? "r6.hit_head" : "r6.hit_flesh", 0.5, headshot ? 1.0 : 1.1);
    if (!headshot && weapon.damage < 0.1) return;
    // hit feedback
    try {
        victim.dimension.spawnParticle("minecraft:basic_smoke_particle", opts.hitPoint ?? victim.location);
    } catch { }
}

export function applyMeleeHit(attacker, victim, opts = {}) {
    const damage = opts.damage ?? 11; // ~55 R6 HP
    hurt(victim, damage, attacker, { cause: "melee", headshot: false });
}

/** Area damage. Returns number of players hit. */
export function applyExplosion(center, radius, maxDamage, attacker, opts = {}) {
    const dimension = opts.dimension ?? world.getDimension("overworld");
    let hits = 0;
    let players = [];
    try {
        players = dimension.getPlayers({ location: center, maxDistance: radius });
    } catch { }
    for (const p of players) {
        const st = ps(p);
        if (!st || st.dead || !isCombatPhase()) continue;
        const d = dist(center, p.location);
        if (d > radius) continue;
        const falloff = 1 - (d / radius) * 0.65;
        let access = 1;
        if (!opts.throughWalls) {
            try {
                const dir = norm(sub(p.location, center));
                const hit = dimension.getBlockFromRay(center, dir, {
                    maxDistance: Math.max(1, d - 0.5), includeLiquidBlocks: false,
                    includePassableBlocks: false,
                });
                if (hit && hit.block && hit.block.typeId !== "minecraft:air") access = 0.35;
            } catch { }
        }
        hurt(p, maxDamage * falloff * access, attacker, {
            cause: opts.cause ?? "explosion",
            teamDamage: true,
            selfDamage: !!opts.selfDamage,
        });
        hits++;
    }
    // devices
    for (const dev of [...State.devices.values()]) {
        if (!dev.entity || !dev.entity.isValid?.()) {
            State.devices.delete(dev.id);
            continue;
        }
        const d = dist(center, dev.entity.location);
        if (d > radius) continue;
        damageDevice(dev.entity, (maxDamage * 5) * (1 - (d / radius) * 0.6), attacker);
    }
    particle(dimension, "minecraft:explosion_particle", center);
    particle(dimension, "minecraft:basic_smoke_particle", { x: center.x, y: center.y + 1, z: center.z });
    return hits;
}

export function damageDevice(entity, amount, attacker) {
    const dev = State.devices.get(entity.id);
    if (!dev) {
        safe(() => entity.kill());
        return;
    }
    dev.hp -= amount;
    try {
        entity.dimension.spawnParticle("minecraft:electric_spark_particle", entity.location);
    } catch { }
    if (dev.hp <= 0) {
        safe(() => entity.kill());
        State.devices.delete(entity.id);
        safe(() => dev.onDestroy?.(dev, attacker));
        sound(attacker, "r6.hit_metal", 0.7, 1.0);
    } else {
        safe(() => dev.onHit?.(dev, amount, attacker));
    }
}

export function applyEnvironmentalDamage(victim, amount, source) {
    const st = ps(victim);
    if (!st || st.dead || !isCombatPhase()) return;
    if (st.downed) {
        killPlayer(victim, source, { cause: "environment" });
        return;
    }
    const hp = r6hp(victim);
    if (hp - amount <= 0) downPlayer(victim, source, "environment");
    else setHealth(victim, hp - amount);
}

export function playerState(player) {
    return ps(player);
}

export function announceDamageNumbers() {
    // reserved for future floating damage support
}

export { r6hp, setHealth, AMMO_TO_R6, playerName, flag, msg, vec, matchPlayers };
