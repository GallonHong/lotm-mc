// R6 Siege Bedrock - HUD (action bar / titles / chat broadcast)
import { world, system } from "@minecraft/server";
import { State, ps, matchPlayers } from "./state.js";
import { Config } from "./config.js";
import { actionBar, title, msg, fmtTime, mainhand, aliveHealth } from "./util.js";
import { WEAPONS, GADGETS } from "./data/registry.js";

const BLUE = "§9";
const ORANGE = "§6";
const RED = "§c";
const GREY = "§7";
const WHITE = "§f";
const GREEN = "§a";
const YELLOW = "§e";

export function teamColor(team) {
    return team === "blue" ? BLUE : ORANGE;
}

export function phaseName(match) {
    switch (match?.phase) {
        case "prep": return `${YELLOW}准备阶段`;
        case "action": return `${GREEN}行动阶段`;
        case "planted": return `${RED}炸弹已安放`;
        case "round_end": return `${GREY}回合结束`;
        case "match_end": return `${GREY}对局结束`;
        default: return `${GREY}待机`;
    }
}

export function sideName(ps) {
    return ps?.side === "attacker" ? `${ORANGE}进攻方` : `${BLUE}防守方`;
}

function ammoText(player, st) {
    const item = mainhand(player);
    const id = item?.typeId?.startsWith("r6:") ? item.typeId.slice(3) : null;
    if (!id) return "";
    const weapon = WEAPONS[id];
    if (!weapon) return "";
    if (weapon.shield) return `${GREY}护盾`;
    const ammo = st.ammo[id];
    if (!ammo) return "";
    return `${YELLOW}${ammo.mag}${GREY}/${WHITE}${weapon.mag}`;
}

function gadgetText(st) {
    const gadgetId = st?.gadgetId;
    if (!gadgetId) return "";
    const g = GADGETS[gadgetId];
    if (!g) return "";
    if (g.charges > 0) {
        const left = st.charges?.[gadgetId] ?? 0;
        return `${GREY}${g.name} ${left > 0 ? WHITE + left : RED + "0"}`;
    }
    const cd = (st.cooldowns?.[gadgetId] ?? 0) - system.currentTick;
    return cd > 0
        ? `${GREY}${g.name} ${RED}${Math.ceil(cd / 20)}s`
        : `${GREY}${g.name} ${GREEN}就绪`;
}

export const Hud = {
    update(player) {
        const match = State.match;
        const st = ps(player);
        if (!match || !st) return;
        const parts = [];
        if (st.dead) {
            parts.push(`${RED}已阵亡 ${GREY}| ${WHITE}观战中`);
            actionBar(player, `${GREY}阵亡观战 ${GREY}| ${phaseName(match)} ${GREY}| ${WHITE}${fmtTime(match.timer)}`);
            return;
        }
        const hp = aliveHealth(player);
        if (st.downed) {
            const secs = Math.max(0, Math.ceil(st.downTicks / 20));
            actionBar(player,
                `${RED}倒地 ${GREY}| ${RED}${secs}s ${GREY}后阵亡 ${GREY}| ${WHITE}队友靠近并潜行可救援 ${GREY}| ${phaseName(match)}`);
            return;
        }
        parts.push(phaseName(match));
        if (match.phase === "prep" && st.side === "attacker") {
            parts.push(`${YELLOW}准备中`);
        }
        parts.push(`${WHITE}${fmtTime(match.timer)}`);
        parts.push(`${teamColor(st.team)}${match.score[st.team]}${GREY}:${teamColor(st.side === "attacker" ? match.attackerTeam : otherTeamOf(match, st.team))}${match.score[otherTeamOf(match, st.team)]}`);
        const opName = st.operatorId ? (st.operatorId === "recruit_atk" || st.operatorId === "recruit_def" ? "RECRUIT" : st.operatorId.toUpperCase()) : "未选择";
        parts.push(`${WHITE}${opName}`);
        parts.push(`${RED}HP ${WHITE}${Math.ceil(hp)}`);
        const ammo = ammoText(player, st);
        if (ammo) parts.push(ammo);
        const g = gadgetText(st);
        if (g) parts.push(g);
        if (match.bomb) {
            parts.push(`${RED}BOMB ${WHITE}${fmtTime(match.bomb.tick)}`);
        }
        actionBar(player, parts.join(`${GREY} | `));
    },

    announce(text, subtitle = "") {
        for (const p of matchPlayers()) {
            msg(p, text);
            if (subtitle) actionBar(p, subtitle);
        }
    },

    announceTitle(main, sub = "", opt = {}) {
        for (const p of matchPlayers()) title(p, main, sub, opt);
    },

    roundHeader(match) {
        const atk = `${teamColor(match.attackerTeam)}进攻方`;
        const def = `${teamColor(otherTeam(match.attackerTeam))}防守方`;
        return `${GREY}第 ${WHITE}${match.round}${GREY} 回合 ${GREY}| ${atk} ${GREY}vs ${def}`;
    },

    killFeed(killerName, victimName, headshot = false, downed = false) {
        const icon = headshot ? "§c[爆头]" : downed ? "§e[击倒]" : "§f[击杀]";
        this.announce(`${icon} §f${killerName} §7-> §f${victimName}`, "");
    },
};

function otherTeamOf(match, team) {
    return team === "blue" ? "orange" : "blue";
}
