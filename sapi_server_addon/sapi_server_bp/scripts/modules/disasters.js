import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Utils } from "../utils.js";
import { Integration } from "./integration.js";
import { AuditManager } from "./audit.js";

const SETTINGS_KEY = "sando:settings:v2";
const STATE_KEY = "sando:state:v2";

const DISASTERS = Object.freeze([
    { id: "tornado", name: "龙卷风" },
    { id: "meteors", name: "陨石雨" },
    { id: "flood", name: "特大洪水" },
    { id: "lightning", name: "雷暴" },
    { id: "earthquake", name: "地震" },
]);

const DEFAULTS = Object.freeze({
    enabled: true,
    autoEnabled: false,
    overworldEnabled: true,
    extractionEnabled: true,
    protectSafeZones: true,
    blockDamage: false,
    warningSeconds: 20,
    disasterSeconds: 45,
    cooldownSeconds: 120,
    minIntervalMinutes: 20,
    maxIntervalMinutes: 40,
    difficulty: 2,
    weights: { tornado: 20, meteors: 20, flood: 20, lightning: 20, earthquake: 20 },
});

function parse(raw, fallback) {
    try { return typeof raw === "string" ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function clamp(value, min, max, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
}

function readSettings() {
    const saved = parse(world.getDynamicProperty(SETTINGS_KEY), {});
    return {
        ...DEFAULTS,
        ...(saved && typeof saved === "object" ? saved : {}),
        weights: { ...DEFAULTS.weights, ...(saved?.weights || {}) },
    };
}

function readState() {
    return parse(world.getDynamicProperty(STATE_KEY), { running: false, phase: "idle", nextAutoSeconds: -1 });
}

function saveSettings(player, next, detail) {
    try {
        world.setDynamicProperty(SETTINGS_KEY, JSON.stringify(next));
        Integration.send(player, "sando:control", JSON.stringify({ action: "reload" }));
        AuditManager.log("disaster_settings", player, "natural_disasters", detail);
        Utils.tell(player, "§a自然灾害设置已保存。§8目标 Add-on 会在数秒内同步。");
        return true;
    } catch (error) {
        Utils.tell(player, `§c设置保存失败：${error}`);
        return false;
    }
}

function phaseName(phase) {
    return ({ idle: "空闲", warning: "预警", active: "发生中", cooldown: "冷却" })[phase] || String(phase || "未知");
}

export class DisasterAdminManager {
    static openMain(player, onBack = null) {
        if (!Utils.isAdmin(player)) return;
        const config = readSettings();
        const state = readState();
        const connected = Integration.isNaturalDisastersAvailable();
        const next = Number(state.nextAutoSeconds);
        const actions = [];
        const form = new ActionFormData()
            .title("§l§4🌪 自然灾害管理")
            .body(
                `§0联动状态：${connected ? "§a已连接" : "§c未连接"}\n` +
                `§0系统总开关：${config.enabled ? "§a开启" : "§c关闭"}\n` +
                `§0自动随机：${config.autoEnabled ? "§a开启" : "§8关闭"}\n` +
                `§0当前状态：§e${phaseName(state.phase)}${state.running ? ` §8· §c${state.disasterName || state.disasterId} §8· ${state.dimensionId}` : ""}\n` +
                `§0剩余时间：§e${Math.max(0, Number(state.remaining) || 0)} 秒\n` +
                `§0下次自动事件：§e${next >= 0 ? `${next} 秒` : "未计划"}\n\n` +
                `§8默认保护主城/SAPI 保护区；地形破坏默认关闭。`
            );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§6▶ 手动触发灾害\n§r§8选择类型、维度与难度", "textures/ui/warning_alex", () => this.openTrigger(player, () => this.openMain(player, onBack)));
        add("§l§e⚙ 基础开关与作用范围\n§r§8主世界、摸金都市、安全区、地形破坏", "textures/ui/settings_glyph_color_2x", () => this.openGeneral(player, () => this.openMain(player, onBack)));
        add("§l§b⏱ 时间与难度\n§r§8预警、持续、冷却和随机间隔", "textures/ui/timer", () => this.openTiming(player, () => this.openMain(player, onBack)));
        add("§l§d⚖ 随机权重\n§r§8分别设置五种灾害出现权重", "textures/ui/icon_recipe_nature", () => this.openWeights(player, () => this.openMain(player, onBack)));
        add("§l§c■ 停止当前灾害\n§r§8清理实体、雾效和临时洪水", "textures/ui/cancel", () => this.confirmStop(player, () => this.openMain(player, onBack)));
        add("§l§8↻ 恢复安全默认值\n§r§8关闭自动事件与地形破坏", "textures/ui/refresh_light", () => this.confirmReset(player, () => this.openMain(player, onBack)));
        add("§l§8⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, result => actions[result.selection]?.());
    }

    static openGeneral(player, onBack) {
        const value = readSettings();
        const form = new ModalFormData()
            .title("§l§4自然灾害 · 基础设置")
            .toggle("启用自然灾害系统", value.enabled)
            .toggle("自动随机发生", value.autoEnabled)
            .toggle("允许主世界发生", value.overworldEnabled)
            .toggle("允许摸金都市发生", value.extractionEnabled)
            .toggle("保护主城与安全区", value.protectSafeZones)
            .toggle("允许破坏地形（高风险）", value.blockDamage);
        Utils.showForm(player, form, result => {
            if (result.canceled) return onBack?.();
            const [enabled, autoEnabled, overworldEnabled, extractionEnabled, protectSafeZones, blockDamage] = result.formValues;
            const next = { ...value, enabled, autoEnabled, overworldEnabled, extractionEnabled, protectSafeZones, blockDamage };
            saveSettings(player, next, `enabled=${enabled} auto=${autoEnabled} overworld=${overworldEnabled} extraction=${extractionEnabled} safe=${protectSafeZones} damage=${blockDamage}`);
            onBack?.();
        });
    }

    static openTiming(player, onBack) {
        const value = readSettings();
        const form = new ModalFormData()
            .title("§l§b自然灾害 · 时间与难度")
            .textField("预警秒数（5-300）", "20", String(value.warningSeconds))
            .textField("持续秒数（10-600）", "45", String(value.disasterSeconds))
            .textField("结束冷却秒数（10-3600）", "120", String(value.cooldownSeconds))
            .textField("自动事件最小间隔/分钟（1-1440）", "20", String(value.minIntervalMinutes))
            .textField("自动事件最大间隔/分钟（1-1440）", "40", String(value.maxIntervalMinutes))
            .slider("默认难度（0-10）", 0, 10, 1, value.difficulty);
        Utils.showForm(player, form, result => {
            if (result.canceled) return onBack?.();
            const [warning, duration, cooldown, minInterval, maxInterval, difficulty] = result.formValues;
            const minimum = Math.floor(clamp(minInterval, 1, 1440, value.minIntervalMinutes));
            const next = {
                ...value,
                warningSeconds: Math.floor(clamp(warning, 5, 300, value.warningSeconds)),
                disasterSeconds: Math.floor(clamp(duration, 10, 600, value.disasterSeconds)),
                cooldownSeconds: Math.floor(clamp(cooldown, 10, 3600, value.cooldownSeconds)),
                minIntervalMinutes: minimum,
                maxIntervalMinutes: Math.max(minimum, Math.floor(clamp(maxInterval, 1, 1440, value.maxIntervalMinutes))),
                difficulty: Math.floor(clamp(difficulty, 0, 10, value.difficulty)),
            };
            saveSettings(player, next, `warning=${next.warningSeconds}s duration=${next.disasterSeconds}s cooldown=${next.cooldownSeconds}s interval=${next.minIntervalMinutes}-${next.maxIntervalMinutes}m difficulty=${next.difficulty}`);
            onBack?.();
        });
    }

    static openWeights(player, onBack) {
        const value = readSettings();
        const form = new ModalFormData().title("§l§d自然灾害 · 随机权重");
        for (const entry of DISASTERS) form.textField(`${entry.name} 权重（0-1000）`, "20", String(value.weights[entry.id]));
        Utils.showForm(player, form, result => {
            if (result.canceled) return onBack?.();
            const weights = {};
            DISASTERS.forEach((entry, index) => { weights[entry.id] = Math.floor(clamp(result.formValues[index], 0, 1000, value.weights[entry.id])); });
            saveSettings(player, { ...value, weights }, `weights=${JSON.stringify(weights)}`);
            onBack?.();
        });
    }

    static openTrigger(player, onBack) {
        const value = readSettings();
        const dimensions = [
            { id: player.dimension.id, name: `当前维度（${player.dimension.id}）` },
            { id: "minecraft:overworld", name: "主世界" },
            { id: "apoc_extract:city", name: "摸金都市" },
        ];
        const form = new ModalFormData()
            .title("§l§6手动触发自然灾害")
            .dropdown("灾害类型", ["按权重随机", ...DISASTERS.map(entry => entry.name)])
            .dropdown("目标维度", dimensions.map(entry => entry.name))
            .slider("本次难度（0-10）", 0, 10, 1, value.difficulty);
        Utils.showForm(player, form, result => {
            if (result.canceled) return onBack?.();
            const [disasterIndex, dimensionIndex, difficulty] = result.formValues;
            const disasterId = disasterIndex === 0 ? "" : DISASTERS[disasterIndex - 1]?.id || "";
            const dimensionId = dimensions[dimensionIndex]?.id || player.dimension.id;
            Integration.send(player, "sando:control", JSON.stringify({ action: "trigger", disasterId, dimensionId, difficulty: Math.floor(difficulty) }));
            AuditManager.log("disaster_trigger", player, disasterId || "weighted_random", `${dimensionId} difficulty=${difficulty}`);
            onBack?.();
        });
    }

    static confirmStop(player, onBack) {
        const form = new MessageFormData().title("§l§4停止自然灾害").body("§0将立即结束当前事件，并清理灾害实体、雾效与临时洪水。").button1("§c立即停止").button2("§8取消");
        Utils.showForm(player, form, result => {
            if (result.selection === 0) {
                Integration.send(player, "sando:control", JSON.stringify({ action: "stop" }));
                AuditManager.log("disaster_stop", player, "natural_disasters", "manual stop");
            }
            onBack?.();
        });
    }

    static confirmReset(player, onBack) {
        const form = new MessageFormData().title("§l§4恢复默认设置").body("§0自动灾害与地形破坏将关闭；主世界、摸金都市及安全区保护保持启用。").button1("§c恢复默认").button2("§8取消");
        Utils.showForm(player, form, result => {
            if (result.selection === 0) saveSettings(player, { ...DEFAULTS, weights: { ...DEFAULTS.weights } }, "reset defaults");
            onBack?.();
        });
    }
}
