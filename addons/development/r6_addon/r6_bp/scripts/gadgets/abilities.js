// R6 Siege Bedrock - operator abilities & gadget usage
import { world, system } from "@minecraft/server";
import { State, ps, playerById, matchPlayers, ensurePS } from "../state.js";
import { GADGETS, WEAPONS } from "../data/registry.js";
import { hurt, isCombatPhase, applyExplosion } from "../damage.js";
import { Projectiles } from "./projectiles.js";
import { Deployables, placeOnSurface, spawnDevice } from "./deployables.js";
import { sledgeBreak, reinforceBlock, placeBarricade } from "./breach.js";
import { Loadout } from "../loadout.js";
import { revivePlayer } from "../dbno.js";
import { Hud } from "../hud.js";
import {
    vec, add, mul, dot, norm, sub, dist, nowTick, actionBar, msg, sound, soundAt, particle,
    safe, playerName, clamp, title, blockRay, faceNormal,
} from "../util.js";

const lastUse = new Map();

/** free mode = no match running, every other player counts as a target */
function isFreeMode() {
    return !State.match;
}

function candidatePlayers(st) {
    return State.match ? matchPlayers() : world.getPlayers().filter(p => p.id !== st.id);
}

function isHostile(st, other, p) {
    if (!p || p.id === st.id) return false;
    if (!other) return true; // free mode / non-participants
    if (other.dead) return false;
    if (st.team && other.team && other.team === st.team) return false;
    return true;
}

function enemyPlayers(st) {
    return candidatePlayers(st).filter(p => isHostile(st, ps(p), p));
}

function inCone(player, target, cosThreshold) {
    const dir = player.getViewDirection();
    const to = norm(sub(target.location, player.location));
    return dot(dir, to) >= cosThreshold;
}

function pingPlayers(player, range, opts = {}) {
    const st = ps(player);
    if (!st) return 0;
    let count = 0;
    for (const p of candidatePlayers(st)) {
        const target = ps(p);
        if (!isHostile(st, target, p)) continue;
        if (target?.dead) continue;
        const d = dist(player.location, p.location);
        if (d > range) continue;
        if (opts.cone && !inCone(player, p, opts.cone)) continue;
        count++;
        const head = p.getHeadLocation();
        particle(p.dimension, "minecraft:endrod", add(head, vec(0, 0.4, 0)));
        particle(p.dimension, "minecraft:colored_flame_particle", p.location);
        // marker column visible from a distance
        for (let i = 1; i <= 2; i++) {
            particle(p.dimension, "minecraft:endrod",
                add(p.location, vec(0, 1.2 + i * 0.45, 0)));
        }
    }
    if (opts.feedback) {
        actionBar(player, count > 0 ? `§b侦测到 ${count} 名敌人` : "§7范围内没有敌人");
        sound(player, "r6.ping", 0.85, count > 0 ? 1.4 : 0.9);
    }
    return count;
}

function pingDevices(player, range) {
    const st = ps(player);
    let count = 0;
    for (const dev of State.devices.values()) {
        if (!dev.entity?.isValid?.()) continue;
        if (st?.team && dev.team && dev.team === st.team) continue;
        if (dev.ownerId === player.id) continue;
        const d = dist(player.location, dev.entity.location);
        if (d > range) continue;
        count++;
        for (let i = 0; i < 3; i++) {
            particle(dev.entity.dimension, "minecraft:endrod",
                add(dev.entity.location, vec(0, 0.4 + i * 0.4, 0)));
        }
    }
    actionBar(player, count > 0 ? `§b扫描到 ${count} 个敌方设备` : "§7附近没有敌方设备");
    sound(player, "r6.ping", 0.85, count > 0 ? 1.3 : 0.9);
    return count;
}

function nearestDownedTeammate(player, st, range) {
    if (!State.match || !st.team) return null;
    let best = null;
    for (const p of matchPlayers()) {
        if (p.id === player.id) continue;
        const other = ps(p);
        if (!other || other.team !== st.team || !other.downed || other.dead) continue;
        const d = dist(player.location, p.location);
        if (d <= range && (!best || d < best.distance)) best = { player: p, ps: other, distance: d };
    }
    return best;
}

function nearestTeammate(player, st, range) {
    if (!State.match || !st.team) return null;
    let best = null;
    for (const p of matchPlayers()) {
        if (p.id === player.id) continue;
        const other = ps(p);
        if (!other || other.team !== st.team || other.dead) continue;
        const d = dist(player.location, p.location);
        if (d <= range && (!best || d < best.distance)) best = { player: p, ps: other, distance: d };
    }
    return best;
}

const HANDLERS = {
    gadget_sledge(player, st) {
        const ok = sledgeBreak(player);
        st.cooldowns.gadget_sledge = nowTick() + 15;
        Loadout.refreshGadgetSlot(player);
        return ok;
    },

    gadget_emp(player) {
        Projectiles.launch("emp", player, { speed: 1.0, gravity: true });
        return true;
    },

    gadget_breach_round(player) {
        Projectiles.fireBreachRound(player);
        sound(player, "r6.m870_shoot", 0.9, 1.2);
        return true;
    },

    gadget_exo(player) {
        const dev = placeOnSurface(player, "gadget_exo", { floor: false });
        if (!dev) return false;
        mathSpawnFx(dev);
        return true;
    },

    gadget_cluster(player) {
        const dev = placeOnSurface(player, "gadget_cluster", { floor: false });
        if (!dev) return false;
        mathSpawnFx(dev);
        return true;
    },

    gadget_drone(player, st) {
        const existing = [...State.devices.values()].find(d => d.kind === "drone" && d.ownerId === player.id);
        if (existing) {
            State.devices.delete(existing.id);
            safe(() => existing.entity?.kill());
            actionBar(player, "§e无人机已回收");
            return true;
        }
        const dev = Deployables.spawnDrone(player);
        if (!dev) return false;
        sound(player, "r6.drone", 0.8, 1.0);
        actionBar(player, "§b无人机已部署");
        return true;
    },

    gadget_extend_shield(player) {
        const dir = player.getViewDirection();
        const loc = add(player.location, add(mul(dir, 1.8), vec(0, 0.1, 0)));
        const st = ps(player);
        const dev = spawnDevice("gadget_shield", loc, player, {
            yaw: (Math.atan2(dir.x, dir.z) * 180) / Math.PI + 180,
        });
        if (!dev) return false;
        sound(player, "r6.shield_deploy", 1.0, 1.0);
        st.cooldowns.gadget_extend_shield = nowTick() + 20;
        Hud.announce("§b[护盾] §7可伸缩护盾已展开", "");
        return true;
    },

    gadget_thermal(player) {
        safe(() => player.addEffect("night_vision", 20 * 8, { amplifier: 0, showParticles: false }));
        const n = pingPlayers(player, 30, { cone: 0.55, feedback: false });
        actionBar(player, n > 0 ? `§c热成像锁定 ${n} 名敌人` : "§7热成像未发现目标");
        sound(player, "r6.ping", 0.9, 1.5);
        return true;
    },

    gadget_flash(player) {
        const flashed = [];
        for (const p of matchPlayers()) {
            const other = ps(p);
            if (!other || other.team === ps(player).team || other.dead) continue;
            if (dist(player.location, p.location) > 8.5) continue;
            if (!inCone(player, p, 0.15)) continue;
            safe(() => p.addEffect("blindness", 60, { amplifier: 1, showParticles: false }));
            safe(() => p.addEffect("slowness", 60, { amplifier: 2, showParticles: false }));
            title(p, "§f§l闪光", "§7你被闪光盾致盲", { stay: 30 });
            flashed.push(p);
        }
        sound(player, "r6.flash", 1.0, 1.0);
        particle(player.dimension, "minecraft:colored_flame_particle", player.getHeadLocation());
        actionBar(player, `§f闪击！§7致盲 ${flashed.length} 名敌人`);
        return true;
    },

    gadget_scanner(player) {
        pingDevices(player, 20);
        return true;
    },

    gadget_frag(player) {
        Projectiles.launch("frag", player);
        return true;
    },

    gadget_gas(player) {
        Projectiles.launch("gas", player);
        return true;
    },

    gadget_jammer(player) {
        const dev = placeOnSurface(player, "gadget_jammer", { floor: true });
        return !!dev;
    },

    gadget_armor_panel(player) {
        const dev = placeOnSurface(player, "gadget_panel", { floor: false });
        return !!dev;
    },

    gadget_cardiac(player) {
        const n = pingPlayers(player, 15, { feedback: true });
        void n;
        return true;
    },

    gadget_stim(player, st) {
        const downed = nearestDownedTeammate(player, st, 3.5);
        if (downed) {
            revivePlayer(downed.player, player, "激素手枪");
            sound(player, "r6.stim", 0.9, 1.6);
            return true;
        }
        const mate = nearestTeammate(player, st, 3.5);
        const target = mate?.player ?? player;
        const targetSt = ps(target);
        const hpComp = safe(() => target.getComponent("minecraft:health"));
        if (hpComp) {
            const max = hpComp.effectiveMax ?? 20;
            if (hpComp.currentValue > max) hpComp.setCurrentValue(max);
            else hpComp.setCurrentValue(Math.min(max, hpComp.currentValue + 8));
        }
        actionBar(player, target.id === player.id ? "§a已对自己使用激素" : `§a${playerName(target)} 已接受激素治疗`);
        particle(target.dimension, "minecraft:heart_particle", target.getHeadLocation());
        sound(player, "r6.stim", 0.8, 1.3);
        void targetSt;
        return true;
    },

    gadget_armor_pack(player) {
        const dev = placeOnSurface(player, "gadget_armor_pack", { floor: true });
        return !!dev;
    },

    gadget_kapkan(player) {
        const dev = placeOnSurface(player, "gadget_kapkan", { floor: false });
        return !!dev;
    },

    gadget_turret(player) {
        const dev = placeOnSurface(player, "gadget_turret", { floor: true });
        return !!dev;
    },

    gadget_ads(player) {
        const dev = placeOnSurface(player, "gadget_ads", { floor: true });
        if (dev) dev.charges = 3;
        return !!dev;
    },

    gadget_battery(player) {
        const dev = placeOnSurface(player, "gadget_battery", { floor: false });
        return !!dev;
    },

    gadget_nitro(player) {
        Projectiles.launch("nitro", player);
        return true;
    },

    gadget_reinforce(player, st) {
        void st; // charge consumption + slot refresh are handled by Abilities.use
        if (!State.match) {
            actionBar(player, "§7加固墙仅在对局中可用");
            return false;
        }
        return reinforceBlock(player);
    },

    gadget_barricade(player, st) {
        void st;
        const dimension = player.dimension;
        const hit = blockRay(dimension, player.getHeadLocation(), player.getViewDirection(), 5.0);
        if (!hit || !hit.block) {
            actionBar(player, "§c请对准要封堵的位置放置木板路障");
            return false;
        }
        const target = add(hit.block.location, faceNormal(hit.face));
        const targetBlock = safe(() => dimension.getBlock(target));
        if (!targetBlock) {
            actionBar(player, "§c目标位置超出世界范围");
            return false;
        }
        if (targetBlock.typeId !== "minecraft:air") {
            actionBar(player, "§c目标位置已被占用");
            return false;
        }
        if (dist({ x: target.x + 0.5, y: target.y + 0.5, z: target.z + 0.5 }, player.location) > 6.5) {
            actionBar(player, "§c目标位置太远");
            return false;
        }
        const ok = placeBarricade(dimension, target);
        if (ok) actionBar(player, "§a已放置木板路障（被摧毁后留下钢梁框架）");
        return ok;
    },
};

function mathSpawnFx(dev) {
    if (!dev) return;
    particle(dev.entity.dimension, "minecraft:basic_smoke_particle", dev.entity.location);
    soundAt(dev.entity.dimension, "r6.gadget_deploy", dev.entity.location, 0.9, 1.1);
}

export const Abilities = {
    /** returns true when the gadget consumed the interaction */
    use(player, item) {
        if (!item) return false;
        const id = item.typeId;
        if (!id.startsWith("r6:")) return false;
        const gadgetId = id.slice(3);
        const def = GADGETS[gadgetId];
        if (!def) return false;

        const match = State.match;
        const inTeams = !!match && (match.teams.blue.includes(player.id) || match.teams.orange.includes(player.id));
        if (match && !inTeams) {
            actionBar(player, "§7你不在本局对战中");
            return true;
        }
        const free = !match;
        let st = ps(player);
        if (!st) {
            // free mode: create a throwaway state so skills can be tested anywhere
            st = ensurePS(player);
        }
        if (free) st.freeMode = true;
        if (st.dead || st.downed) return false;
        if (!free && gadgetId === "gadget_barricade" && st.side !== "defender") {
            actionBar(player, "§c只有防守方可以放置木板路障");
            return true;
        }
        if (match) {
            if (match.phase === "prep" && st.side !== "defender") {
                actionBar(player, "§c准备阶段只有防守方可以部署道具");
                return true;
            }
            if (!isCombatPhase(match) && match.phase !== "prep") return true;
        }
        if (player.hasTag("r6_noshoot")) return true;

        const last = lastUse.get(player.id) ?? 0;
        if (nowTick() - last < 6) return true;

        if (!free) {
            if (Loadout.cooldownRemaining(st, gadgetId) > 0) {
                actionBar(player, `§c技能冷却中 §7${Math.ceil(Loadout.cooldownRemaining(st, gadgetId) / 20)}s`);
                return true;
            }
            if (def.charges > 0 && (st.charges?.[gadgetId] ?? 0) <= 0) {
                actionBar(player, "§c技能已用尽");
                return true;
            }
        }
        const handler = HANDLERS[gadgetId];
        if (!handler) return false;
        lastUse.set(player.id, nowTick());
        const ok = handler(player, st);
        if (ok === false) return true;
        if (!free) {
            if (def.charges > 0) st.charges[gadgetId] = Math.max(0, (st.charges[gadgetId] ?? 0) - 1);
            if (def.cooldown) Loadout.setCooldown(st, gadgetId);
            Loadout.refreshGadgetSlot(player);
        }
        return true;
    },

    /** passive damage bonus helpers exposed for other modules */
    flashAll(player) {
        return HANDLERS.gadget_flash(player);
    },
};

export { enemyPlayers, nearestDownedTeammate, pingPlayers, pingDevices };
