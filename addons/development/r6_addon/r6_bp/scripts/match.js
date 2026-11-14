// R6 Siege Bedrock - queue, teams, rounds, win conditions & match lifecycle
import { world, system } from "@minecraft/server";
import { State, ps, ensurePS, TAGS, otherTeam, sidePlayers, teamPlayers, matchPlayers } from "./state.js";
import { Config } from "./config.js";
import { Hud } from "./hud.js";
import { Loadout } from "./loadout.js";
import { Dbno, clearCombatEffects } from "./dbno.js";
import { Bomb } from "./bomb.js";
import { Guns } from "./guns/engine.js";
import { Deployables } from "./gadgets/deployables.js";
import { Projectiles } from "./gadgets/projectiles.js";
import { clearReinforced, restoreRoundBlocks } from "./gadgets/breach.js";
import { applyExplosion } from "./damage.js";
import { OPERATORS, WEAPONS } from "./data/registry.js";
import { Setup, defaultMap } from "./setup.js";
import {
    msg, title, actionBar, sound, safe, playerName, dist, nowTick, setFlag, flag, fmtTime,
    clearInventory, healthOf, vec, add, playersNear,
} from "./util.js";

function dimension() {
    return world.getDimension("overworld");
}

function runCmd(command) {
    for (const p of world.getPlayers()) {
        try { p.runCommand(command); return true; } catch { }
    }
    try {
        dimension().runCommandAsync(command);
        return true;
    } catch {
        return false;
    }
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function teamColorName(team) {
    return team === "blue" ? "§9蓝队" : "§6橙队";
}

function spreadPoints(base, count) {
    const points = [];
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / Math.max(1, count);
        points.push({
            x: base.x + Math.cos(angle) * (count > 1 ? 2.2 : 0),
            y: base.y,
            z: base.z + Math.sin(angle) * (count > 1 ? 2.2 : 0),
        });
    }
    return points;
}

function savePlayerState(player) {
    const container = safe(() => player.getComponent("minecraft:inventory")?.container);
    const items = [];
    if (container) {
        for (let i = 0; i < container.size; i++) {
            const item = safe(() => container.getItem(i));
            items.push(item ? (safe(() => item.clone()) ?? item) : undefined);
        }
    }
    return {
        location: { ...player.location },
        dimensionId: safe(() => player.dimension.id) ?? "minecraft:overworld",
        items,
        selectedSlotIndex: safe(() => player.selectedSlotIndex) ?? 0,
        health: safe(() => player.getComponent("minecraft:health")?.currentValue) ?? 20,
        gameMode: safe(() => player.getGameMode?.()) ?? "survival",
    };
}

function restorePlayerState(player, saved) {
    if (!saved) return;
    clearInventory(player);
    const container = safe(() => player.getComponent("minecraft:inventory")?.container);
    if (container) {
        for (let i = 0; i < Math.min(container.size, saved.items.length); i++) {
            safe(() => container.setItem(i, saved.items[i]));
        }
    }
    safe(() => { player.selectedSlotIndex = saved.selectedSlotIndex; });
    const dimension = world.getDimension(saved.dimensionId ?? "minecraft:overworld");
    safe(() => player.teleport(saved.location, { dimension }));
    try {
        const health = player.getComponent("minecraft:health");
        if (health) health.setCurrentValue(Math.min(health.effectiveMax ?? 20, saved.health));
    } catch { }
    safe(() => player.setGameMode(saved.gameMode === "creative" ? "creative" : "survival"));
}

export const Match = {
    inQueue(player) {
        return State.queue.includes(player.id);
    },

    queueJoin(player) {
        if (State.match) {
            msg(player, "§c对局已经开始了");
            return false;
        }
        if (!State.queue.includes(player.id)) {
            State.queue.push(player.id);
            msg(player, `§a已加入匹配队列 §7(${State.queue.length}/${Config.teamSize * 2})`);
            for (const id of State.queue) {
                const p = world.getPlayers().find(x => x.id === id);
                if (p) p.onScreenDisplay?.setActionBar?.(`§a匹配队列 ${State.queue.length}/${Config.teamSize * 2}`);
            }
        }
        this.tryStartFromQueue();
        return true;
    },

    queueLeave(player) {
        State.queue = State.queue.filter(id => id !== player.id);
        msg(player, "§e已离开匹配队列");
        return true;
    },

    clearQueue() {
        State.queue = [];
    },

    tryStartFromQueue() {
        if (State.match) return false;
        const needed = Config.teamSize * 2;
        if (State.queue.length >= needed) {
            const players = [];
            for (const id of State.queue.slice(0, needed)) {
                const p = world.getPlayers().find(x => x.id === id);
                if (p) players.push(p);
            }
            if (players.length >= 2) {
                this.clearQueue();
                this.startMatch(players);
                return true;
            }
        }
        return false;
    },

    /** admin forced start: uses the current queue, or every online player */
    forceStart(admin) {
        if (State.match) {
            msg(admin, "§c已有进行中的对局");
            return false;
        }
        let players = [];
        for (const id of State.queue) {
            const p = world.getPlayers().find(x => x.id === id);
            if (p) players.push(p);
        }
        if (players.length < 2) players = world.getPlayers().slice(0, Config.teamSize * 2);
        if (players.length < 2) {
            msg(admin, "§c至少需要两名玩家才能开始对局");
            return false;
        }
        this.clearQueue();
        return this.startMatch(players);
    },

    startMatch(players) {
        if (State.match) return false;
        Setup.ensure();
        const roster = shuffle(players).slice(0, Config.teamSize * 2);
        if (roster.length < 2) return false;
        const half = Math.floor(roster.length / 2);
        const blue = roster.slice(0, half).map(p => p.id);
        const orange = roster.slice(half, half * 2).map(p => p.id);
        if (blue.length === 0 || orange.length === 0) return false;

        State.map = State.map ?? defaultMap();
        const match = {
            id: Date.now(),
            teams: { blue, orange },
            attackerTeam: Math.random() < 0.5 ? "blue" : "orange",
            round: 0,
            score: { blue: 0, orange: 0 },
            phase: "prep",
            timer: 0,
            bomb: null,
            reinforced: new Set(),
            takenOperators: { blue: new Set(), orange: new Set() },
            pendingRoundEnd: null,
            atkSpawn: null,
            site: null,
            map: State.map,
            started: nowTick(),
            savedPlayers: new Map(),
        };
        State.match = match;
        for (const id of [...blue, ...orange]) {
            const p = world.getPlayers().find(x => x.id === id);
            if (!p) continue;
            match.savedPlayers.set(id, savePlayerState(p));
            const st = ensurePS(p);
            st.team = blue.includes(id) ? "blue" : "orange";
            st.side = null;
            st.kills = 0;
            st.downs = 0;
            st.deaths = 0;
            st.assists = 0;
            st.score = 0;
            st.operatorId = null;
            st.freeMode = false;
            st.alive = true;
            st.dead = false;
            st.downed = false;
            setFlag(p, TAGS.inMatch, true);
            setFlag(p, blue.includes(id) ? TAGS.blue : TAGS.orange, true);
            setFlag(p, blue.includes(id) ? TAGS.orange : TAGS.blue, false);
            safe(() => p.sendMessage("§8§m--------------------------------"));
            safe(() => p.sendMessage(`§6R6 对局开始 §7| 你是 ${teamColorName(st.team)}`));
            safe(() => p.sendMessage("§7回合开始前，右键 §bR6 战术平板 §7选择干员。"));
            safe(() => p.sendMessage("§8§m--------------------------------"));
        }
        runCmd("gamerule keepInventory true");
        runCmd("gamerule showDeathMessages false");
        runCmd("gamerule doImmediateRespawn true");
        runCmd("gamerule naturalregeneration false");
        Hud.announceTitle("§6对局开始", `§7${blue.length} v ${orange.length} §7| 首先赢得 §f${Config.roundsToWin} §7回合`, { stay: 60 });
        this.newRound();
        return true;
    },

    newRound() {
        const match = State.match;
        if (!match) return;
        match.round += 1;
        match.phase = "prep";
        match.timer = Config.prepSeconds * 20;
        match.bomb = null;
        match.pendingRoundEnd = null;
        if (match.round > 1) match.attackerTeam = otherTeam(match.attackerTeam);
        match.takenOperators = { blue: new Set(), orange: new Set() };
        match.reinforced = new Set();

        // clean up previous round
        Guns.cancelAll();
        Deployables.removeAll();
        Projectiles.clear();
        Bomb.reset();
        clearReinforced();
        restoreRoundBlocks(dimension());
        State.channels.clear();

        // pick spawns & bomb site
        match.atkSpawn = Setup.randomSpawn();
        const site = Setup.randomSite();
        match.site = site;

        for (const { player, ps: st } of teamPlayers(match, "blue").concat(teamPlayers(match, "orange"))) {
            st.side = match.attackerTeam === st.team ? "attacker" : "defender";
            st.alive = true;
            st.dead = false;
            st.downed = false;
            st.downTicks = 0;
            st.reviveProgress = 0;
            st.downLocation = null;
            st.plate = 0;
            st.bloom = 0;
            st.respawnPending = false;
            st.gadgetId = null;
            st.killsThisRound = 0;
            setFlag(player, TAGS.dead, false);
            setFlag(player, TAGS.down, false);
            setFlag(player, TAGS.noShoot, false);
            setFlag(player, TAGS.atk, st.side === "attacker");
            setFlag(player, TAGS.def, st.side === "defender");
            this.autoAssignOperator(match, player, st);
            safe(() => player.setGameMode("adventure"));
            Dbno.restorePlayer(player);
            Loadout.grant(player);
        }

        // teleport teams
        const atkList = sidePlayers(match, "attacker");
        const defList = sidePlayers(match, "defender");
        const spawnBase = match.atkSpawn ?? Setup.randomSpawn() ?? { x: 0, y: 64, z: 0 };
        const atkPoints = spreadPoints(spawnBase, atkList.length);
        atkList.forEach((entry, i) => Setup.safeTeleport(entry.player, atkPoints[i]));
        const siteBase = match.site ? { x: match.site.x, y: match.site.y, z: match.site.z } : { x: 0, y: 64, z: 0 };
        const defPoints = spreadPoints(siteBase, defList.length);
        defList.forEach((entry, i) => Setup.safeTeleport(entry.player, defPoints[i]));

        for (const entry of atkList) {
            msg(entry.player, `§e第 ${match.round} 回合 §7| §6进攻方 §7| 在准备阶段结束前不要离开出生点`);
            title(entry.player, `§6第 ${match.round} 回合`, "§e准备阶段 §7| 准备进攻", { stay: 60 });
            sound(entry.player, "r6.ui_click", 0.6, 1.1);
        }
        for (const entry of defList) {
            msg(entry.player, `§e第 ${match.round} 回合 §7| §9防守方 §7| 目标点 §f${match.site?.id ?? "?"} §8(${siteBase.x}, ${siteBase.y}, ${siteBase.z})`);
            title(entry.player, `§6第 ${match.round} 回合`, `§9准备阶段 §7| 防守目标点 ${match.site?.id ?? "?"}`, { stay: 60 });
            sound(entry.player, "r6.ui_click", 0.6, 1.1);
        }
        Hud.announce(`§e第 ${match.round} 回合 §7| ${teamColorName(match.attackerTeam)} 进攻 §7| 比分 §9${match.score.blue}§7:§6${match.score.orange}`, "");
    },

    autoAssignOperator(match, player, st) {
        const pool = OPERATORS.filter(o => o.side === st.side);
        const taken = match.takenOperators[st.team];
        const available = pool.filter(o => !taken.has(o.id));
        const choice = (available.length ? available : pool)[Math.floor(Math.random() * Math.max(1, (available.length ? available : pool).length))];
        if (!choice) return;
        st.operatorId = choice.id;
        st.armor = choice.armor;
        st.speed = choice.speed;
        st.gadgetId = choice.gadget;
        st.charges = st.charges ?? {};
        st.charges[choice.gadget] = (st.charges[choice.gadget] ?? 0);
        taken.add(choice.id);
        safe(() => actionBar(player, `§7本回合干员 §f${choice.name} §7(${choice.cn}) §8- 可右键平板更换`));
    },

    /** returns error string or null; reset loadout so the new gadget is granted */
    chooseOperator(player, operatorId) {
        const match = State.match;
        const st = ps(player);
        if (!match || !st) return "你不在对局中";
        if (match.phase !== "prep") return "只能在准备阶段更换干员";
        const op = OPERATORS.find(o => o.id === operatorId);
        if (!op) return "未知干员";
        if (op.side !== st.side) return "该干员不属于你的阵营";
        const taken = match.takenOperators[st.team];
        if (taken.has(operatorId) && st.operatorId !== operatorId) return "该干员已被队友选择";
        if (st.operatorId) taken.delete(st.operatorId);
        st.operatorId = op.id;
        st.armor = op.armor;
        st.speed = op.speed;
        st.gadgetId = op.gadget;
        taken.add(op.id);
        Loadout.grant(player);
        msg(player, `§a已更换干员为 §f${op.name} §7(${op.cn})`);
        return null;
    },

    tick() {
        const match = State.match;
        if (!match) return;
        if (match.pendingRoundEnd) {
            const { winner, reason } = match.pendingRoundEnd;
            match.pendingRoundEnd = null;
            this.endRound(winner, reason);
            return;
        }
        switch (match.phase) {
            case "prep": {
                match.timer -= 1;
                // keep attackers inside the spawn area during preparation
                const atk = sidePlayers(match, "attacker");
                for (const entry of atk) {
                    if (entry.ps.dead) continue;
                    const base = match.atkSpawn;
                    if (!base) continue;
                    if (dist(entry.player.location, { x: base.x + 0.5, y: base.y, z: base.z + 0.5 }) > 16) {
                        Setup.safeTeleport(entry.player, base);
                        actionBar(entry.player, "§c准备阶段不能离开出生点");
                    }
                }
                if (match.timer <= 0) this.startActionPhase(match);
                break;
            }
            case "action": {
                match.timer -= 1;
                const atkUp = this.sideUp(match, "attacker");
                const defUp = this.sideUp(match, "defender");
                if (!atkUp) this.endRound("defender", "进攻方全员被淘汰");
                else if (!defUp) this.endRound("attacker", "防守方全员被淘汰");
                else if (match.timer <= 0) this.endRound("defender", "时间耗尽");
                break;
            }
            case "planted": {
                const defUp = this.sideUp(match, "defender");
                if (!defUp) {
                    this.endRound("attacker", "防守方全员被淘汰");
                }
                break;
            }
            case "round_end": {
                match.timer -= 1;
                if (match.timer <= 0) {
                    const decided = match.score.blue >= Config.roundsToWin || match.score.orange >= Config.roundsToWin
                        || match.round >= Config.maxRounds;
                    if (decided) this.endMatch();
                    else this.newRound();
                }
                break;
            }
            case "match_end": {
                match.timer -= 1;
                if (match.timer <= 0) this.endMatch(true);
                break;
            }
            default:
                break;
        }
    },

    startActionPhase(match) {
        match.phase = "action";
        match.timer = Config.actionSeconds * 20;
        Hud.announceTitle("§a行动阶段", `§7进攻方安放炸弹 §7| §f${fmtTime(match.timer)}`, { stay: 60 });
        Hud.announce("§a[阶段] 行动阶段开始，进攻方可以离开出生点。", "");
        for (const p of matchPlayers()) sound(p, "r6.ping", 0.8, 1.2);
    },

    sideUp(match, side) {
        for (const entry of sidePlayers(match, side)) {
            if (!entry.ps.dead && !entry.ps.downed) return true;
        }
        return false;
    },

    endRound(winnerSide, reason) {
        const match = State.match;
        if (!match || match.phase === "round_end" || match.phase === "match_end") return;
        const winnerTeam = winnerSide === "attacker" ? match.attackerTeam : otherTeam(match.attackerTeam);
        match.score[winnerTeam] = (match.score[winnerTeam] ?? 0) + 1;
        match.phase = "round_end";
        match.timer = Config.roundEndSeconds * 20;
        Guns.cancelAll();
        State.channels.clear();
        const winnerName = teamColorName(winnerTeam);
        Hud.announceTitle(`${winnerName} §f赢得本回合`, `§7${reason} §7| 比分 §9${match.score.blue}§7:§6${match.score.orange}`, { stay: 70 });
        Hud.announce(`§7[回合结束] ${winnerName} §7获胜 §8(${reason})`, "");
        for (const p of matchPlayers()) {
            sound(p, winnerTeam === ps(p)?.team ? "random.levelup" : "random.break", 0.7, 1.0);
        }
        if (match.score[winnerTeam] >= Config.roundsToWin || match.round >= Config.maxRounds) {
            match.pendingMatchEnd = true;
        }
    },

    endMatch(silent = false) {
        const match = State.match;
        if (!match) return;
        const blue = match.score.blue;
        const orange = match.score.orange;
        const winner = blue === orange ? null : (blue > orange ? "blue" : "orange");
        if (!silent) {
            const text = winner ? `${teamColorName(winner)} §f赢得对局！` : "§7对局平局";
            Hud.announceTitle("§6对局结束", `${text} §7| §9${blue}§7:§6${orange}`, { stay: 80 });
            for (const p of matchPlayers()) {
                msg(p, "§8§m--------------------------------");
                msg(p, text);
                const st = ps(p);
                if (st) msg(p, `§7击杀 §f${st.kills} §7| 击倒 §f${st.downs} §7| 死亡 §f${st.deaths} §7| 助攻 §f${st.assists} §7| 得分 §f${st.score}`);
                msg(p, "§8§m--------------------------------");
            }
        }
        // cleanup
        Bomb.reset();
        Deployables.removeAll();
        Projectiles.clear();
        Guns.cancelAll();
        clearReinforced();
        restoreRoundBlocks(dimension());
        State.channels.clear();
        for (const id of [...match.teams.blue, ...match.teams.orange]) {
            const p = world.getPlayers().find(x => x.id === id);
            if (!p) continue;
            const st = ps(p);
            if (st) {
                st.dead = false;
                st.downed = false;
                st.side = null;
                st.operatorId = null;
            }
            setFlag(p, TAGS.inMatch, false);
            setFlag(p, TAGS.blue, false);
            setFlag(p, TAGS.orange, false);
            setFlag(p, TAGS.atk, false);
            setFlag(p, TAGS.def, false);
            setFlag(p, TAGS.dead, false);
            setFlag(p, TAGS.down, false);
            setFlag(p, TAGS.noShoot, false);
            Dbno.clearCombatEffects(p);
            Dbno.lockInputs(p, false);
            restorePlayerState(p, match.savedPlayers?.get(id));
        }
        State.players.clear();
        State.match = null;
        State.queue = [];
        runCmd("gamerule keepInventory false");
        runCmd("gamerule showDeathMessages true");
        runCmd("gamerule doImmediateRespawn false");
        runCmd("gamerule naturalregeneration true");
    },

    stop(admin) {
        const match = State.match;
        if (!match) {
            msg(admin, "§7当前没有进行中的对局");
            return;
        }
        Hud.announce("§c管理员终止了对局。", "");
        this.endMatch(true);
    },

    status(player) {
        const match = State.match;
        if (!match) {
            msg(player, `§7当前没有对局。队列：§f${State.queue.length}/${Config.teamSize * 2}`);
            return;
        }
        msg(player, `§6第 ${match.round} 回合 §7| 阶段 §f${match.phase} §7| 计时 §f${fmtTime(match.timer)}`);
        msg(player, `§7比分 §9${match.score.blue}§7:§6${match.score.orange} §7| 进攻方 ${teamColorName(match.attackerTeam)} §7| 目标点 §f${match.site?.id ?? "-"}`);
        msg(player, `§7地图 §f${match.map?.name ?? "-"} §7| 出生点 ${match.map?.spawns?.length ?? 0} §7| 炸弹点 ${match.map?.sites?.length ?? 0}`);
    },

    spawnPositionsOk() {
        Setup.ensure();
        return State.map.spawns.length > 0 && State.map.sites.length > 0;
    },
};

export { otherTeam };
