// R6 Siege Bedrock - entry point & event wiring
import { world, system } from "@minecraft/server";
import { loadConfig } from "./config.js";
import { State, ps, TAGS, matchPlayers } from "./state.js";
import { Match } from "./match.js";
import { Bomb } from "./bomb.js";
import { Dbno } from "./dbno.js";
import { Hud } from "./hud.js";
import { Guns, isWeaponItem } from "./guns/engine.js";
import { Deployables } from "./gadgets/deployables.js";
import { Projectiles } from "./gadgets/projectiles.js";
import { Abilities } from "./gadgets/abilities.js";
import { handleScriptEvent, Menu } from "./menu.js";
import { Setup } from "./setup.js";
import { applyMeleeHit, isCombatPhase } from "./damage.js";
import { mainhand, safe, nowTick, setFlag } from "./util.js";

const lastRoute = new Map();

// lightweight counters so /scriptevent r6:debug can prove events are arriving
State.debug = {
    startedAt: nowTick(),
    itemStartUse: 0,
    itemUse: 0,
    itemUseOn: 0,
    itemStartUseOn: 0,
    itemStopUse: 0,
    scriptsReady: false,
    subscribeErrors: [],
};

function subscribe(signal, handler, label) {
    if (!signal || typeof signal.subscribe !== "function") {
        console.warn(`[R6] event unavailable: ${label}`);
        State.debug.subscribeErrors.push(label);
        return false;
    }
    try {
        signal.subscribe(handler);
        return true;
    } catch (e) {
        console.warn(`[R6] subscribe ${label} failed: ${e}`);
        State.debug.subscribeErrors.push(`${label}: ${e}`);
        return false;
    }
}

/**
 * Single routing point for item usage.
 * kind: "start" for itemStartUse*, "tap" for itemUse*.
 * Items must remain usable outside of a match (free test mode) like Test Guns.
 */
function routeItemUse(player, item, kind) {
    if (!player) return;
    const held = item ?? mainhand(player);
    if (!held) return;
    const guid = `${player.id}:${held.typeId}:${kind === "start" ? "s" : "t"}`;
    const last = lastRoute.get(guid) ?? 0;
    if (nowTick() - last < 2) return;
    lastRoute.set(guid, nowTick());

    const id = held.typeId;
    if (isWeaponItem(held)) {
        if (kind === "start") Guns.onStartUse(player, held);
        else Guns.onItemUse(player, held);
        return;
    }
    if (id === "r6:defuser") {
        Bomb.useDefuser(player);
        return;
    }
    if (id === "r6:tablet") {
        system.run(() => Menu.openMain(player));
        return;
    }
    // gadgets / skills: usable both in a match and in free mode
    Abilities.use(player, held);
}

function cleanupWorld() {
    try {
        for (const e of world.getDimension("overworld").getEntities({ families: ["r6_target"] })) {
            safe(() => e.kill());
        }
    } catch { }
    for (const p of world.getPlayers()) {
        for (const tag of [TAGS.inMatch, TAGS.blue, TAGS.orange, TAGS.atk, TAGS.def,
            TAGS.down, TAGS.dead, TAGS.noShoot]) {
            setFlag(p, tag, false);
        }
        safe(() => Dbno.lockInputs?.(p, false));
    }
}

function init() {
    // ---- event wiring first: item behaviour must not depend on config/map loading ----
    const events = world.afterEvents;
    subscribe(events?.itemStartUse, ev => {
        State.debug.itemStartUse += 1;
        try { routeItemUse(ev.source, ev.itemStack, "start"); } catch (e) { console.warn(`[R6] itemStartUse: ${e}`); }
    }, "itemStartUse");
    subscribe(events?.itemStartUseOn, ev => {
        State.debug.itemStartUseOn += 1;
        try { routeItemUse(ev.source, ev.itemStack, "start"); } catch (e) { console.warn(`[R6] itemStartUseOn: ${e}`); }
    }, "itemStartUseOn");
    subscribe(events?.itemUse, ev => {
        State.debug.itemUse += 1;
        try { routeItemUse(ev.source, ev.itemStack, "tap"); } catch (e) { console.warn(`[R6] itemUse: ${e}`); }
    }, "itemUse");
    subscribe(events?.itemUseOn, ev => {
        State.debug.itemUseOn += 1;
        try { routeItemUse(ev.source, ev.itemStack, "tap"); } catch (e) { console.warn(`[R6] itemUseOn: ${e}`); }
    }, "itemUseOn");

    const stop = ev => {
        try {
            const player = ev.source || ev.player;
            if (player) Guns.onStopUse(player);
        } catch { }
    };
    subscribe(events?.itemStopUse, ev => { State.debug.itemStopUse += 1; stop(ev); }, "itemStopUse");
    subscribe(events?.itemReleaseUse, stop, "itemReleaseUse");
    subscribe(events?.itemStopUseOn, stop, "itemStopUseOn");

    subscribe(events?.entityHitBlock, ev => {
        try {
            const player = ev.damagingEntity;
            if (!player || player.typeId !== "minecraft:player") return;
            const item = mainhand(player);
            if (isWeaponItem(item)) Guns.tryReload(player);
        } catch { }
    }, "entityHitBlock");

    subscribe(events?.entityHitEntity, ev => {
        try {
            const attacker = ev.damagingEntity;
            const victim = ev.hitEntity;
            if (!attacker || !victim || attacker.typeId !== "minecraft:player") return;
            const item = mainhand(attacker);
            if (!item || item.typeId !== "minecraft:diamond_sword") return;
            if (State.match) {
                if (!isCombatPhase()) return;
                if (!ps(victim) || !ps(attacker)) return;
                applyMeleeHit(attacker, victim, { damage: 9.6 });
            } else {
                safe(() => victim.applyDamage(10, { cause: "entityAttack", damagingEntity: attacker }));
            }
        } catch { }
    }, "entityHitEntity");

    subscribe(events?.entityDie, ev => {
        try {
            Dbno.onEntityDie(ev.deadEntity, ev.damageSource);
        } catch (e) { console.warn(`[R6] entityDie: ${e}`); }
    }, "entityDie");

    subscribe(events?.entityHurt, ev => {
        try {
            Dbno.onEntityHurt(ev.hurtEntity, ev.damageSource, ev.damage);
        } catch { }
    }, "entityHurt");

    subscribe(events?.playerSpawn, ev => {
        try {
            Dbno.onPlayerSpawn(ev.player);
        } catch { }
    }, "playerSpawn");

    subscribe(events?.playerLeave, ev => {
        try {
            const st = ps(ev.player);
            if (st) {
                st.dead = true;
                st.downed = false;
                st.alive = false;
            }
            State.queue = State.queue.filter(id => id !== ev.playerId);
            Guns.cancel(ev.player);
            State.channels.delete(ev.playerId);
        } catch { }
    }, "playerLeave");

    subscribe(system.afterEvents?.scriptEventReceive, ev => {
        try {
            if (ev.id && ev.id.startsWith("r6:")) handleScriptEvent(ev);
        } catch (e) { console.warn(`[R6] scriptevent: ${e}`); }
    }, "scriptEventReceive");

    // ---- persistent data / cleanup (never allowed to abort event wiring) ----
    try { loadConfig(); } catch (e) { console.warn(`[R6] loadConfig: ${e}`); }
    try { Setup.load(); Setup.ensure(); } catch (e) { console.warn(`[R6] map setup: ${e}`); }
    try { cleanupWorld(); } catch (e) { console.warn(`[R6] cleanup: ${e}`); }
    State.debug.scriptsReady = true;
    console.warn(`[R6] Siege Bedrock ready v${State.debug.startedAt >= 0 ? "1.3.0" : "?"} ` +
        `(map: ${State.map?.name ?? "-"})`);

    system.runInterval(() => safe(() => Match.tick(), "match.tick"), 1);
    system.runInterval(() => safe(() => Dbno.tick(), "dbno.tick"), 1);
    system.runInterval(() => safe(() => Bomb.tick(), "bomb.tick"), 1);
    system.runInterval(() => safe(() => Guns.tick(), "guns.tick"), 1);
    system.runInterval(() => safe(() => Deployables.tick(), "devices.tick"), 2);
    system.runInterval(() => safe(() => Projectiles.tick(), "projectiles.tick"), 1);
    system.runInterval(() => safe(() => Projectiles.tickClouds(), "clouds.tick"), 1);
    system.runInterval(() => {
        if (!State.match) return;
        for (const p of matchPlayers()) safe(() => Hud.update(p));
    }, 5);
    system.runInterval(() => {
        if (!State.match) safe(() => Match.tryStartFromQueue(), "queue.tick");
        const online = new Set(world.getPlayers().map(p => p.id));
        if (!State.match) {
            for (const id of [...State.players.keys()]) {
                if (!online.has(id)) State.players.delete(id);
            }
        }
        for (const [id, dev] of [...State.devices.entries()]) {
            if (!dev.entity || !dev.entity.isValid?.()) State.devices.delete(id);
        }
        for (const key of [...lastRoute.keys()]) {
            if (!online.has(key.split(":")[0])) lastRoute.delete(key);
        }
    }, 40);
}

init();

export { routeItemUse };
