// R6 Siege Bedrock - bomb site: planting, defusing and detonation
import { world, system } from "@minecraft/server";
import { State, ps, TAGS } from "./state.js";
import { Config } from "./config.js";
import { Setup } from "./setup.js";
import { Hud } from "./hud.js";
import { applyExplosion, isCombatPhase, damageDevice } from "./damage.js";
import { blastBlocks } from "./gadgets/breach.js";
import {
    actionBar, msg, sound, soundAt, particle, title, fmtTime, dist, nowTick, safe, playerName,
    add, vec, mainhand, playerName as pName,
} from "./util.js";

function dimension() {
    return world.getDimension("overworld");
}

function channelOf(player) {
    return State.channels.get(player.id);
}

export const Bomb = {
    reset() {
        const match = State.match;
        if (!match) return;
        if (match.bomb?.entity) safe(() => match.bomb.entity.kill());
        match.bomb = null;
        for (const [id, ch] of [...State.channels.entries()]) {
            if (ch.type === "plant" || ch.type === "defuse") State.channels.delete(id);
        }
    },

    useDefuser(player) {
        const match = State.match;
        const st = ps(player);
        if (!match || !st) {
            actionBar(player, "§7拆弹器仅在对局中可用");
            return true;
        }
        if (st.dead || st.downed) return false;
        if (match.phase === "action" && st.side === "attacker") {
            return this.startPlant(player, st, match);
        }
        if (match.phase === "planted" && st.side === "defender") {
            return this.startDefuse(player, st, match);
        }
        actionBar(player, "§7现在无法使用拆弹器");
        return true;
    },

    startPlant(player, st, match) {
        const near = Setup.nearestSite(player.location, 4.5);
        if (!near) {
            actionBar(player, "§c必须在炸弹点范围内安放炸弹");
            return true;
        }
        if (channelOf(player)) return true;
        State.channels.set(player.id, {
            type: "plant",
            ownerId: player.id,
            startTick: nowTick(),
            endTick: nowTick() + Config.plantSeconds * 20,
            startPos: { ...player.location },
            siteId: near.site.id,
        });
        actionBar(player, `§e正在安放炸弹…`);
        sound(player, "r6.beep", 0.8, 1.2);
        Hud.announce(`§e[炸弹] §f${playerName(player)} §7正在安放炸弹！`, "");
        return true;
    },

    startDefuse(player, st, match) {
        const bomb = match.bomb;
        if (!bomb) return true;
        const bombPos = bomb.pos;
        if (dist(player.location, bombPos) > 3.5) {
            actionBar(player, "§c必须靠近炸弹才能拆除");
            return true;
        }
        if (channelOf(player)) return true;
        State.channels.set(player.id, {
            type: "defuse",
            ownerId: player.id,
            startTick: nowTick(),
            endTick: nowTick() + Config.defuseSeconds * 20,
            startPos: { ...player.location },
        });
        actionBar(player, "§b正在拆除炸弹…");
        sound(player, "r6.ui_click", 0.8, 1.0);
        Hud.announce(`§b[炸弹] §f${playerName(player)} §7正在拆除炸弹！`, "");
        return true;
    },

    tick() {
        const match = State.match;
        if (!match) return;
        this.tickChannels(match);
        if (match.pendingRoundEnd) return;
        if (match.phase === "planted" && match.bomb) {
            const bomb = match.bomb;
            bomb.tick -= 1;
            match.timer = bomb.tick;
            if (bomb.entity && bomb.entity.isValid?.()) {
                const loc = bomb.entity.location;
                if (bomb.tick % 5 === 0) {
                    particle(dimension(), "minecraft:redstone_torch_dust_particle", add(loc, vec(0, 0.7, 0)));
                }
                if (bomb.tick % 20 === 0) {
                    soundAt(dimension(), "r6.beep", loc, 0.7, 1.6);
                    actionBarEvery(`§c炸弹 §f${fmtTime(bomb.tick)} §7| 防守方请尽快拆除`);
                }
                if (bomb.tick <= 200 && bomb.tick % 10 === 0) {
                    soundAt(dimension(), "r6.beep", loc, 1.0, 2.0);
                }
            }
            if (bomb.tick <= 0) this.explode(match);
        }
    },

    tickChannels(match) {
        for (const [playerId, ch] of [...State.channels.entries()]) {
            if (ch.type !== "plant" && ch.type !== "defuse") continue;
            const player = world.getPlayers().find(p => p.id === playerId);
            const st = ps(player);
            if (!player || !st || st.dead || st.downed) {
                State.channels.delete(playerId);
                continue;
            }
            const broke = dist(player.location, ch.startPos) > 2.0
                || (st.lastDamageTick ?? -1000) > ch.startTick
                || (ch.type === "plant" ? match.phase !== "action" : match.phase !== "planted");
            if (broke) {
                State.channels.delete(playerId);
                actionBar(player, "§c操作被打断");
                sound(player, "r6.dry_fire", 0.6, 1.2);
                continue;
            }
            const total = ch.endTick - ch.startTick;
            const done = nowTick() - ch.startTick;
            const pct = Math.max(0, Math.min(100, Math.floor((done / total) * 100)));
            const bars = Math.floor(pct / 10);
            actionBar(player, `${ch.type === "plant" ? "§e" : "§b"}${ch.type === "plant" ? "安放" : "拆除"} ${"§a|".repeat(bars)}${"§8.".repeat(10 - bars)} §f${pct}%`);
                if (nowTick() % 10 === 0) soundAt(dimension(), "r6.defuse_tick", player.location, 0.6, 1.0 + pct / 200);
            if (nowTick() >= ch.endTick) {
                State.channels.delete(playerId);
                if (ch.type === "plant") this.completePlant(match, player, st, ch);
                else this.completeDefuse(match, player, st);
            }
        }
    },

    completePlant(match, player, st, ch) {
        const loc = { x: Math.floor(player.location.x) + 0.5, y: player.location.y, z: Math.floor(player.location.z) + 0.5 };
        let entity;
        try {
            entity = dimension().spawnEntity("r6:bomb", loc);
        } catch (e) {
            console.warn(`[R6] bomb spawn failed: ${e}`);
        }
        match.bomb = {
            siteId: ch.siteId,
            pos: loc,
            tick: Config.bombSeconds * 20,
            entity: entity ?? null,
            planterId: player.id,
        };
        match.phase = "planted";
        match.timer = match.bomb.tick;
        st.score = (st.score ?? 0) + 150;
        soundAt(dimension(), "r6.explosion", loc, 0.7, 1.4);
        Hud.announceTitle("§c炸弹已安放", `§7目标点 §f${ch.siteId} §7| §f${Config.bombSeconds}s §7后引爆`, { stay: 60 });
        Hud.announce(`§c[炸弹] §f${playerName(player)} §c已安放炸弹于 §f${ch.siteId}`, "");
        for (const p of world.getPlayers()) {
            if (ps(p)) safe(() => p.addEffect("resistance", 40, { amplifier: 3, showParticles: false }));
        }
    },

    completeDefuse(match, player, st) {
        st.score = (st.score ?? 0) + 200;
        sound(player, "r6.ui_click", 0.9, 1.2);
        Hud.announce(`§a[炸弹] §f${playerName(player)} §a已拆除炸弹！`, "");
        if (match.bomb?.entity) safe(() => match.bomb.entity.kill());
        match.bomb = null;
        match.pendingRoundEnd = { winner: "defender", reason: "炸弹已拆除" };
    },

    explode(match) {
        const bomb = match.bomb;
        if (!bomb) return;
        const center = bomb.pos;
        applyExplosion(center, 9, 120, undefined, { cause: "bomb", throughWalls: true });
        blastBlocks(dimension(), center, 6);
        for (const dev of [...State.devices.values()]) {
            if (dev.entity && dist(dev.entity.location, center) <= 8) {
                damageDevice(dev.entity, 500, undefined);
            }
        }
        soundAt(dimension(), "r6.explosion", center, 1.2, 0.8);
        Hud.announceTitle("§4炸弹爆炸", "§7进攻方获得本回合胜利", { stay: 60 });
        Hud.announce("§4[炸弹] §c炸弹已爆炸！", "");
        if (bomb.entity) safe(() => bomb.entity.kill());
        match.bomb = null;
        match.pendingRoundEnd = { winner: "attacker", reason: "炸弹爆炸" };
    },
};

function actionBarEvery(text) {
    for (const p of world.getPlayers()) {
        if (ps(p)) actionBar(p, text);
    }
}
