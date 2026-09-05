import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { AuditManager } from "./audit.js";

const SETTINGS_KEY = "sapi:item_cleanup:v1";
const DIMENSIONS = Object.freeze(["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]);

/** 全服掉落物定时清理。按运营要求不设置死亡掉落或稀有物品豁免。 */
export class ItemCleanupManager {
    static runId = null;
    static nextCleanupTick = 0;
    static warned = new Set();

    static defaults() {
        return {
            enabled: Config.itemCleanup?.enabled !== false,
            intervalMinutes: Math.max(1, Math.floor(Number(Config.itemCleanup?.intervalMinutes) || 10)),
            warningSeconds: Array.isArray(Config.itemCleanup?.warningSeconds)
                ? Config.itemCleanup.warningSeconds.map(Number).filter(value => value > 0)
                : [60, 30, 10],
        };
    }

    static getSettings() {
        const defaults = this.defaults();
        try {
            const raw = world.getDynamicProperty(SETTINGS_KEY);
            const saved = typeof raw === "string" ? JSON.parse(raw) : {};
            return {
                ...defaults,
                ...saved,
                enabled: saved?.enabled !== undefined ? Boolean(saved.enabled) : defaults.enabled,
                intervalMinutes: Math.max(1, Math.min(120, Math.floor(Number(saved?.intervalMinutes) || defaults.intervalMinutes))),
                warningSeconds: defaults.warningSeconds,
            };
        } catch {
            return defaults;
        }
    }

    static saveSettings(settings, actor = "system") {
        const normalized = {
            enabled: Boolean(settings.enabled),
            intervalMinutes: Math.max(1, Math.min(120, Math.floor(Number(settings.intervalMinutes) || 10))),
        };
        try { world.setDynamicProperty(SETTINGS_KEY, JSON.stringify(normalized)); }
        catch (error) { console.warn(`[ItemCleanup] Failed to save settings: ${error}`); }
        this.scheduleFromNow(normalized);
        AuditManager.log("item_cleanup_settings", actor, "global", `enabled=${normalized.enabled} interval=${normalized.intervalMinutes}m`);
        return normalized;
    }

    static start() {
        if (this.runId !== null) return;
        this.scheduleFromNow(this.getSettings());
        this.runId = system.runInterval(() => this.tick(), 20);
        console.warn("[ItemCleanup] Global dropped-item cleanup initialized.");
    }

    static scheduleFromNow(settings = this.getSettings()) {
        this.warned.clear();
        this.nextCleanupTick = settings.enabled
            ? system.currentTick + settings.intervalMinutes * 60 * 20
            : 0;
    }

    static remainingSeconds() {
        if (!this.nextCleanupTick) return 0;
        return Math.max(0, Math.ceil((this.nextCleanupTick - system.currentTick) / 20));
    }

    static tick() {
        const settings = this.getSettings();
        if (!settings.enabled) {
            this.nextCleanupTick = 0;
            this.warned.clear();
            return;
        }
        if (!this.nextCleanupTick) this.scheduleFromNow(settings);
        const remaining = this.remainingSeconds();
        for (const warning of [...settings.warningSeconds].sort((a, b) => b - a)) {
            if (remaining <= warning && remaining > 0 && !this.warned.has(warning)) {
                this.warned.add(warning);
                Utils.broadcast(`§e地面掉落物将在 §c${warning} §e秒后全部清理，请立即拾取。`);
            }
        }
        if (remaining <= 0) this.cleanup("system", true);
    }

    static cleanup(actor = "system", announce = true) {
        let total = 0;
        const dimensionCounts = [];
        for (const dimensionId of DIMENSIONS) {
            let count = 0;
            try {
                const dimension = world.getDimension(dimensionId);
                for (const entity of dimension.getEntities({ type: "minecraft:item" })) {
                    try { entity.remove(); count += 1; } catch {}
                }
            } catch (error) {
                console.warn(`[ItemCleanup] Failed in ${dimensionId}: ${error}`);
            }
            total += count;
            dimensionCounts.push(`${dimensionId.replace("minecraft:", "")}=${count}`);
        }
        this.scheduleFromNow(this.getSettings());
        if (announce) Utils.broadcast(`§a地面掉落物清理完成，共清除 §e${total} §a个掉落实体。`);
        AuditManager.log("item_cleanup", actor, "all_dimensions", `count=${total} ${dimensionCounts.join(" ")}`);
        return total;
    }

    static statusText() {
        const settings = this.getSettings();
        const remaining = this.remainingSeconds();
        const countdown = settings.enabled
            ? `${Math.floor(remaining / 60)}分${remaining % 60}秒`
            : "已停用";
        return `§0自动清理：${settings.enabled ? "§a开启" : "§c关闭"}\n§0清理周期：§e${settings.intervalMinutes} 分钟\n§0下次清理：§e${countdown}\n§c清理范围包含玩家死亡掉落和所有 Addon 物品。`;
    }

    static openAdminMenu(admin, onBack = null) {
        if (!Utils.isAdmin(admin)) return Utils.tell(admin, "§c只有管理员可以管理掉落物清理。");
        const settings = this.getSettings();
        const actions = [];
        const form = new ActionFormData().title("§l§c🧹 掉落物清理管理").body(this.statusText());
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add(settings.enabled ? "§l§c关闭自动清理" : "§l§a开启自动清理", "textures/ui/refresh_light", () => {
            this.saveSettings({ ...settings, enabled: !settings.enabled }, admin);
            Utils.tell(admin, `§a自动掉落物清理已${settings.enabled ? "关闭" : "开启"}。`);
            this.openAdminMenu(admin, onBack);
        });
        add("§l§6修改清理周期\n§r§8允许 1～120 分钟", "textures/ui/gear", () => this.openIntervalSettings(admin, onBack));
        add("§l§4立即清理全部掉落物\n§r§8包括死亡物品和稀有物品", "textures/ui/trash", () => this.confirmImmediateCleanup(admin, onBack));
        add("§l§b重置十分钟倒计时", "textures/ui/refresh_light", () => {
            this.scheduleFromNow(settings);
            AuditManager.log("item_cleanup_settings", admin, "timer", "reset countdown");
            Utils.tell(admin, "§a掉落物清理倒计时已重新开始。");
            this.openAdminMenu(admin, onBack);
        });
        add("§l§8返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(admin, form, response => actions[response.selection]?.());
    }

    static openIntervalSettings(admin, onBack = null) {
        const settings = this.getSettings();
        const form = new ModalFormData().title("§l掉落物清理周期")
            .slider("自动清理间隔（分钟）", 1, 120, 1, settings.intervalMinutes);
        Utils.showForm(admin, form, response => {
            if (!response.canceled) {
                const intervalMinutes = Number(response.formValues?.[0]) || settings.intervalMinutes;
                this.saveSettings({ ...settings, intervalMinutes }, admin);
                Utils.tell(admin, `§a清理周期已设为 §e${intervalMinutes} §a分钟，并重新开始倒计时。`);
            }
            this.openAdminMenu(admin, onBack);
        });
    }

    static confirmImmediateCleanup(admin, onBack = null) {
        const form = new MessageFormData().title("§l§4立即清理全部掉落物")
            .body("§c此操作会删除已加载区域内的全部地面物品，包括玩家死亡掉落、蓝图、武器和任务奖励，无法恢复。确定继续？")
            .button1("§4确认全部清理")
            .button2("§8取消");
        Utils.showForm(admin, form, response => {
            if (response.selection === 0) {
                const count = this.cleanup(admin, true);
                Utils.tell(admin, `§a管理员立即清理完成，共删除 §e${count} §a个掉落实体。`);
            }
            this.openAdminMenu(admin, onBack);
        });
    }

    static handleCommand(admin, rawMessage = "", onBack = null) {
        if (!Utils.isAdmin(admin)) return Utils.tell(admin, "§c只有管理员可以管理掉落物清理。");
        const message = String(rawMessage || "").trim().toLowerCase();
        if (!message || message === "menu") return this.openAdminMenu(admin, onBack);
        const settings = this.getSettings();
        if (message === "now") return this.confirmImmediateCleanup(admin, onBack);
        if (message === "on" || message === "off") {
            const enabled = message === "on";
            this.saveSettings({ ...settings, enabled }, admin);
            return Utils.tell(admin, `§a自动掉落物清理已${enabled ? "开启" : "关闭"}。`);
        }
        if (message === "status") return Utils.tell(admin, this.statusText());
        if (message.startsWith("interval ")) {
            const intervalMinutes = Math.floor(Number(message.slice(9).trim()));
            if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 120) {
                return Utils.tell(admin, "§c周期必须是 1～120 分钟的整数。");
            }
            this.saveSettings({ ...settings, intervalMinutes }, admin);
            return Utils.tell(admin, `§a清理周期已设为 §e${intervalMinutes} §a分钟。`);
        }
        Utils.tell(admin, "§e用法：/scriptevent system:cleanup [menu|status|on|off|now|interval 分钟]");
    }
}
