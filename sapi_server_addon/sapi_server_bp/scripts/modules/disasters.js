import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Utils } from "../utils.js";
import { Integration } from "./integration.js";
import { AuditManager } from "./audit.js";

const SETTINGS_KEY = "sando:settings:v3";
const STATE_KEY = "sando:state:v2";

const DISASTERS = Object.freeze([
    { id: "tornado", name: "龙卷风" },
    { id: "meteors", name: "陨石雨" },
    { id: "lightning", name: "雷暴" },
]);

const DEFAULTS = Object.freeze({
    enabled: true,
    autoEnabled: true,
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
    weights: { tornado: 20, meteors: 20, lightning: 20 },
});

function parse(raw, fallback) {
    try { return typeof raw === "string" ? JSON.parse(raw) : fallback; } catch { return fallback; }
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
                `§0联动状态：${connected ? "§a已连接" : "§6初始化中或未启用 §8（进入世界后等待约10秒）"}\n` +
                `§0系统总开关：${config.enabled ? "§a开启" : "§c关闭"}\n` +
                `§0自动随机：${config.autoEnabled ? "§a开启" : "§8关闭"}\n` +
                `§0当前状态：§e${phaseName(state.phase)}${state.running ? ` §8· §c${state.disasterName || state.disasterId} §8· ${state.dimensionId}` : ""}\n` +
                `§0剩余时间：§e${Math.max(0, Number(state.remaining) || 0)} 秒\n` +
                `§0下次自动事件：§e${next >= 0 ? `${next} 秒` : "未计划"}\n\n` +
                `§8自动灾害默认开启。间隔、权重、安全区与地形破坏等高级参数请在灾害 Add-on 的 scripts/config.js 修改。`
            );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§6▶ 手动触发灾害\n§r§8可指定坐标并无视安全区", "textures/ui/warning_alex", () => this.openTrigger(player, () => this.openMain(player, onBack)));
        add("§l§c■ 停止当前灾害\n§r§8清理灾害实体与雾效", "textures/ui/cancel", () => this.confirmStop(player, () => this.openMain(player, onBack)));
        add("§l§8⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, result => actions[result.selection]?.());
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
            .slider("本次难度（0-10）", 0, 10, 1, value.difficulty)
            .toggle("指定坐标触发（无视安全区）", true)
            .textField("X 坐标", "例如 2438", String(Math.floor(player.location.x)))
            .textField("Y 坐标", "例如 64", String(Math.floor(player.location.y)))
            .textField("Z 坐标", "例如 2024", String(Math.floor(player.location.z)));
        Utils.showForm(player, form, result => {
            if (result.canceled) return onBack?.();
            const [disasterIndex, dimensionIndex, difficulty, useCoordinates, rawX, rawY, rawZ] = result.formValues;
            const disasterId = disasterIndex === 0 ? "" : DISASTERS[disasterIndex - 1]?.id || "";
            const dimensionId = dimensions[dimensionIndex]?.id || player.dimension.id;
            const coordinates = { x: Number(rawX), y: Number(rawY), z: Number(rawZ) };
            if (useCoordinates && !Object.values(coordinates).every(Number.isFinite)) {
                Utils.tell(player, "§c坐标必须是有效数字，灾害未触发。");
                return this.openTrigger(player, onBack);
            }
            const payload = { action: "trigger", disasterId, dimensionId, difficulty: Math.floor(difficulty) };
            if (useCoordinates) {
                payload.origin = coordinates;
                payload.bypassSafeZone = true;
            }
            Integration.sendNaturalDisasterControl(player, payload);
            AuditManager.log("disaster_trigger", player, disasterId || "weighted_random", `${dimensionId} difficulty=${difficulty}${useCoordinates ? ` origin=${coordinates.x},${coordinates.y},${coordinates.z} bypassSafeZone=true` : ""}`);
            Utils.tell(player, useCoordinates
                ? `§a已提交坐标灾害：§e${coordinates.x}, ${coordinates.y}, ${coordinates.z}§a；本次无视安全区。`
                : "§a已提交自然灾害触发请求。");
            onBack?.();
        });
    }

    static confirmStop(player, onBack) {
        const form = new MessageFormData().title("§l§4停止自然灾害").body("§0将立即结束当前事件，并清理灾害实体与雾效。").button1("§c立即停止").button2("§8取消");
        Utils.showForm(player, form, result => {
            if (result.selection === 0) {
                Integration.sendNaturalDisasterControl(player, { action: "stop" });
                AuditManager.log("disaster_stop", player, "natural_disasters", "manual stop");
            }
            onBack?.();
        });
    }
}
