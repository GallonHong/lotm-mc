// R6 Siege Bedrock - map definition & admin setup helpers
import { world } from "@minecraft/server";
import { State } from "./state.js";
import { msg, actionBar, safe, vec, sound } from "./util.js";

const MAP_KEY = "r6:map";

function dimension() {
    return world.getDimension("overworld");
}

function readSpawn() {
    try {
        return world.getDefaultSpawnLocation() ?? { x: 0, y: 64, z: 0 };
    } catch {
        const p = world.getPlayers()[0];
        return p ? p.location : { x: 0, y: 64, z: 0 };
    }
}

export function defaultMap() {
    const s = readSpawn();
    return {
        name: "默认训练场",
        spawns: [
            { name: "ATK-1", x: Math.round(s.x), y: Math.round(s.y) + 1, z: Math.round(s.z) + 24 },
        ],
        sites: [
            { id: "A", x: Math.round(s.x) + 24, y: Math.round(s.y) + 1, z: Math.round(s.z) },
            { id: "B", x: Math.round(s.x) - 24, y: Math.round(s.y) + 1, z: Math.round(s.z) },
        ],
    };
}

export const Setup = {
    load() {
        try {
            const raw = world.getDynamicProperty(MAP_KEY);
            if (typeof raw === "string" && raw.length > 2 && raw.length < 65536) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.sites) && Array.isArray(parsed.spawns)) {
                    State.map = parsed;
                    return parsed;
                }
            }
        } catch (e) {
            console.warn(`[R6] map load failed: ${e}`);
        }
        State.map = null;
        return null;
    },

    ensure() {
        if (!State.map) {
            if (!this.load()) {
                State.map = defaultMap();
                this.save();
            }
        }
        if (State.map.spawns.length === 0) State.map.spawns.push(...defaultMap().spawns);
        if (State.map.sites.length === 0) State.map.sites.push(...defaultMap().sites);
        return State.map;
    },

    save() {
        try {
            world.setDynamicProperty(MAP_KEY, JSON.stringify(State.map ?? defaultMap()));
        } catch (e) {
            console.warn(`[R6] map save failed: ${e}`);
        }
    },

    playerPos(player) {
        const l = player.location;
        return { x: Math.round(l.x), y: Math.round(l.y), z: Math.round(l.z) };
    },

    addSpawn(player, name) {
        this.ensure();
        const pos = this.playerPos(player);
        const existing = State.map.spawns.find(s => s.name === name);
        if (existing) {
            existing.x = pos.x; existing.y = pos.y; existing.z = pos.z;
        } else {
            State.map.spawns.push({ name, ...pos });
        }
        this.save();
        return `§a进攻方出生点 ${name} 已${existing ? "更新" : "添加"} @ ${pos.x} ${pos.y} ${pos.z}`;
    },

    delSpawn(name) {
        this.ensure();
        const before = State.map.spawns.length;
        State.map.spawns = State.map.spawns.filter(s => s.name !== name);
        this.save();
        return before === State.map.spawns.length
            ? `§c没有找到出生点 ${name}` : `§e已删除出生点 ${name}`;
    },

    addSite(player, id) {
        this.ensure();
        const pos = this.playerPos(player);
        const siteId = String(id || "A").toUpperCase();
        const existing = State.map.sites.find(s => s.id === siteId);
        if (existing) {
            existing.x = pos.x; existing.y = pos.y; existing.z = pos.z;
        } else {
            State.map.sites.push({ id: siteId, ...pos });
        }
        this.save();
        return `§a炸弹点 ${siteId} 已${existing ? "更新" : "添加"} @ ${pos.x} ${pos.y} ${pos.z}`;
    },

    delSite(id) {
        this.ensure();
        const siteId = String(id || "").toUpperCase();
        const before = State.map.sites.length;
        State.map.sites = State.map.sites.filter(s => s.id !== siteId);
        this.save();
        return before === State.map.sites.length
            ? `§c没有找到炸弹点 ${siteId}` : `§e已删除炸弹点 ${siteId}`;
    },

    clear() {
        State.map = { name: "未命名地图", spawns: [], sites: [] };
        this.save();
        return "§e地图配置已清空，请重新设置出生点与炸弹点。";
    },

    auto(player) {
        State.map = defaultMap();
        this.save();
        return `§a已按世界出生点生成默认地图：${State.map.spawns.length} 个出生点 / ${State.map.sites.length} 个炸弹点`;
    },

    show(player) {
        this.ensure();
        const map = State.map;
        msg(player, "§6===== R6 地图配置 =====");
        msg(player, `§7名称：§f${map.name ?? "未命名"}`);
        msg(player, "§b进攻方出生点：");
        for (const s of map.spawns) msg(player, `  §7- §f${s.name} §8(${s.x}, ${s.y}, ${s.z})`);
        msg(player, "§b炸弹点：");
        for (const s of map.sites) msg(player, `  §7- §f${s.id} §8(${s.x}, ${s.y}, ${s.z})`);
        msg(player, "§7提示：站在目标位置后运行 /scriptevent r6:setup spawn add <名称> 或 site add A/B");
    },

    siteById(id) {
        return this.ensure().sites.find(s => s.id === String(id).toUpperCase());
    },

    randomSite() {
        const sites = this.ensure().sites;
        return sites.length ? sites[Math.floor(Math.random() * sites.length)] : undefined;
    },

    randomSpawn() {
        const spawns = this.ensure().spawns;
        return spawns.length ? spawns[Math.floor(Math.random() * spawns.length)] : undefined;
    },

    nearestSite(location, maxDistance = 4) {
        let best = null;
        for (const s of this.ensure().sites) {
            const dx = s.x + 0.5 - location.x;
            const dy = s.y - location.y;
            const dz = s.z + 0.5 - location.z;
            const d = Math.hypot(dx, dy, dz);
            if (d <= maxDistance && (!best || d < best.distance)) best = { site: s, distance: d };
        }
        return best;
    },

    safeTeleport(player, position, options = {}) {
        try {
            player.teleport({
                x: position.x + 0.5,
                y: Math.max(-60, position.y),
                z: position.z + 0.5,
            }, { dimension: dimension() });
        } catch (e) {
            console.warn(`[R6] teleport failed: ${e}`);
        }
        safe(() => player.addEffect("slow_falling", 120, { amplifier: 0, showParticles: false }));
        if (options.effects !== false) {
            safe(() => player.removeEffect("blindness"));
        }
    },

    spectatorPoint(match) {
        const map = this.ensure();
        const site = map.sites[0] ?? { x: 0, y: 80, z: 0 };
        return vec(site.x, site.y + 30, site.z);
    },
};

export function setupEventHandler(event) {
    // called from main.js scriptevent router for id "r6:setup"
    const player = event.sourceEntity;
    if (!player) return;
    const parts = String(event.message || "").trim().split(/\s+/).filter(Boolean);
    const sub = (parts[0] || "show").toLowerCase();
    let out;
    switch (sub) {
        case "spawn": {
            const mode = (parts[1] || "add").toLowerCase();
            const name = parts[2] || `ATK-${(State.map?.spawns.length ?? 0) + 1}`;
            out = mode === "del" || mode === "remove"
                ? Setup.delSpawn(name)
                : Setup.addSpawn(player, name);
            break;
        }
        case "site": {
            const mode = (parts[1] || "add").toLowerCase();
            const id = parts[2] || "A";
            out = mode === "del" || mode === "remove"
                ? Setup.delSite(id)
                : Setup.addSite(player, id);
            break;
        }
        case "auto":
            out = Setup.auto(player);
            break;
        case "clear":
            out = Setup.clear();
            break;
        case "save":
            Setup.save();
            out = "§a地图配置已保存。";
            break;
        default:
            Setup.show(player);
            return;
    }
    if (out) {
        sound(player, "r6.ui_click", 0.6, 1.0);
        msg(player, out);
        actionBar(player, out);
    }
}
