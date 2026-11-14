// R6 Siege Bedrock - runtime configuration (persisted in world dynamic properties)
import { world } from "@minecraft/server";
import { DEFAULT_CONFIG } from "./data/registry.js";

export const Config = { ...DEFAULT_CONFIG };

const KEY = "r6:config";

const BOUNDS = {
    teamSize: [1, 5],
    roundsToWin: [1, 7],
    maxRounds: [1, 9],
    prepSeconds: [5, 120],
    actionSeconds: [30, 600],
    bombSeconds: [10, 180],
    plantSeconds: [1, 15],
    defuseSeconds: [1, 20],
    reviveSeconds: [1, 15],
    bleedoutSeconds: [10, 180],
    roundEndSeconds: [1, 20],
};

function clampKey(key, value) {
    const b = BOUNDS[key];
    if (!b) return value;
    return Math.min(b[1], Math.max(b[0], value));
}

export function loadConfig() {
    try {
        const raw = world.getDynamicProperty(KEY);
        if (typeof raw === "string" && raw.length < 4096) {
            const parsed = JSON.parse(raw);
            for (const key of Object.keys(DEFAULT_CONFIG)) {
                if (parsed[key] !== undefined) {
                    const def = DEFAULT_CONFIG[key];
                    if (typeof def === "number") Config[key] = clampKey(key, Number(parsed[key]) || def);
                    else if (typeof def === "boolean") Config[key] = !!parsed[key];
                }
            }
        }
    } catch (e) {
        console.warn(`[R6] config load failed: ${e}`);
    }
    return Config;
}

export function saveConfig() {
    try {
        world.setDynamicProperty(KEY, JSON.stringify(Config));
    } catch (e) {
        console.warn(`[R6] config save failed: ${e}`);
    }
}

export function setConfigValue(key, rawValue) {
    if (!(key in DEFAULT_CONFIG)) return { ok: false, error: `未知配置项 ${key}` };
    const def = DEFAULT_CONFIG[key];
    let value;
    if (typeof def === "number") {
        value = Number(rawValue);
        if (!Number.isFinite(value)) return { ok: false, error: `${key} 需要一个数字` };
        value = clampKey(key, Math.round(value));
    } else if (typeof def === "boolean") {
        value = !/^(0|false|off|no)$/i.test(String(rawValue));
    } else {
        value = rawValue;
    }
    Config[key] = value;
    saveConfig();
    return { ok: true, value };
}

export function resetConfig() {
    Object.assign(Config, DEFAULT_CONFIG);
    saveConfig();
}

export function configText() {
    return Object.entries(Config).map(([k, v]) => `§7${k}=§f${v}`).join("§r  ");
}
