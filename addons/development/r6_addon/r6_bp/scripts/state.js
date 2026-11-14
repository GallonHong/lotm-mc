// R6 Siege Bedrock - shared mutable state
import { world } from "@minecraft/server";

export const TAGS = {
    inMatch: "r6_in_match",
    blue: "r6_blue",
    orange: "r6_orange",
    atk: "r6_atk",
    def: "r6_def",
    down: "r6_down",
    dead: "r6_dead",
    admin: "r6_admin",
    noShoot: "r6_noshoot",
};

export const State = {
    match: null,
    map: null,
    /** playerId -> PlayerState */
    players: new Map(),
    /** entityId -> DeviceState */
    devices: new Map(),
    /** virtual projectiles */
    projectiles: [],
    /** gas / smoke clouds */
    clouds: [],
    /** playerId -> channel { type, endTick, ... } */
    channels: new Map(),
    /** blockKey -> { x, y, z, originalType } for player-placed barricades */
    placements: new Map(),
    /** blockKey -> accumulated bullet damage on a wooden barricade */
    barricadeHp: new Map(),
    /** queue of player ids */
    queue: [],
    seq: 1,
};

export function nextId() {
    return State.seq++;
}

export function ps(player) {
    if (!player) return undefined;
    return State.players.get(player.id);
}

export function ensurePS(player) {
    let p = State.players.get(player.id);
    if (!p) {
        p = {
            id: player.id,
            name: player.name,
            team: null,
            side: null,
            operatorId: null,
            armor: 2,
            speed: 2,
            plate: 0,
            alive: true,
            downed: false,
            dead: false,
            kills: 0,
            downs: 0,
            deaths: 0,
            assists: 0,
            score: 0,
            ammo: {},
            charges: {},
            cooldowns: {},
            bloom: 0,
            lastDamageTick: -1000,
            lastAttackerId: null,
            downTicks: 0,
            downLocation: null,
            respawnPending: false,
            spawnChoice: -1,
            gadgetLocked: 0,
            killsThisRound: 0,
            freeMode: false,
        };
        State.players.set(player.id, p);
    }
    return p;
}

export function playerById(id) {
    try {
        return world.getPlayers().find(p => p.id === id);
    } catch {
        return undefined;
    }
}

export function matchPlayers() {
    const match = State.match;
    if (!match) return [];
    return world.getPlayers().filter(p => match.teams.blue.includes(p.id) || match.teams.orange.includes(p.id));
}

export function teamOf(ps) {
    return ps?.team ?? null;
}

export function sideOfTeam(match, team) {
    if (!match) return null;
    return match.attackerTeam === team ? "attacker" : "defender";
}

export function isAdmin(player) {
    try {
        if (player.hasTag(TAGS.admin) || player.hasTag("admin")) return true;
    } catch { }
    try {
        if (player.isOp?.()) return true;
    } catch { }
    try {
        return (player.commandPermissionLevel ?? 0) >= 2;
    } catch {
        return false;
    }
}

export function matchOf(player) {
    const match = State.match;
    if (!match || !player) return null;
    return (match.teams.blue.includes(player.id) || match.teams.orange.includes(player.id)) ? match : null;
}

export function teamPlayers(match, team) {
    const out = [];
    for (const id of match.teams[team] ?? []) {
        const p = playerById(id);
        const st = State.players.get(id);
        if (p && st) out.push({ player: p, ps: st });
    }
    return out;
}

export function sidePlayers(match, side) {
    const team = side === "attacker" ? match.attackerTeam : otherTeam(match.attackerTeam);
    return teamPlayers(match, team);
}

export function otherTeam(team) {
    return team === "blue" ? "orange" : "blue";
}
