import { world, ItemStack } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { AuditManager } from "./audit.js";

const SETTINGS_KEY = "sapi:ops:settings:v1";
const CODES_KEY = "sapi:ops:codes:v1";
const DAILY_KEY = "sapi:ops:daily:v1";
const REDEEMED_KEY = "sapi:ops:redeemed:v1";
const PENDING_KEY = "sapi:ops:pending:v1";
const LEGACY_DAILY_MONEY = Object.freeze([200, 250, 300, 350, 400, 500, 800]);
const INTERIM_DAILY_MONEY = Object.freeze([400, 500, 600, 700, 800, 1000, 1600]);
const TENFOLD_DAILY_MONEY = Object.freeze([4000, 5000, 6000, 7000, 8000, 10000, 16000]);

function sameMoneySchedule(left, right) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => Number(value) === Number(right[index]));
}

/** 每日签到、兑换码和待领取奖励。 */
export class OperationsManager {
    static defaults() {
        return {
            tpaEnabled: Config.operations?.tpaEnabled !== false,
            tpaToEnabled: Config.operations?.tpaToEnabled !== false,
            tpaHereEnabled: Config.operations?.tpaHereEnabled !== false,
            dailyEnabled: Config.operations?.dailyEnabled !== false,
            redeemEnabled: Config.operations?.redeemEnabled !== false,
            timezoneOffsetMinutes: Number(Config.operations?.timezoneOffsetMinutes) || 480,
            dailyRewardRevision: Math.max(1, Number(Config.operations?.dailyRewardRevision) || 1),
            dailyMoney: Array.isArray(Config.operations?.dailyMoney) ? Config.operations.dailyMoney.slice(0, 7) : [2000, 2500, 3000, 3500, 4000, 5000, 8000],
            daySevenItem: Config.operations?.daySevenItem || "minecraft:diamond",
            daySevenAmount: Number(Config.operations?.daySevenAmount) || 1
        };
    }

    static getSettings() {
        try {
            const raw = world.getDynamicProperty(SETTINGS_KEY);
            const saved = typeof raw === "string" ? JSON.parse(raw) : {};
            const defaults = this.defaults();
            const merged = { ...defaults, ...(saved || {}) };
            // 只迁移仍使用旧内置签到表的服务器；管理员自定义数值保持不变。
            if (Number(saved?.dailyRewardRevision || 0) < defaults.dailyRewardRevision) {
                if (!Array.isArray(saved?.dailyMoney) || sameMoneySchedule(saved.dailyMoney, LEGACY_DAILY_MONEY) || sameMoneySchedule(saved.dailyMoney, INTERIM_DAILY_MONEY) || sameMoneySchedule(saved.dailyMoney, TENFOLD_DAILY_MONEY)) {
                    merged.dailyMoney = defaults.dailyMoney.slice();
                }
                merged.dailyRewardRevision = defaults.dailyRewardRevision;
                try { world.setDynamicProperty(SETTINGS_KEY, JSON.stringify(merged)); } catch {}
            }
            if (!Array.isArray(merged.dailyMoney)) merged.dailyMoney = defaults.dailyMoney;
            return merged;
        } catch { return this.defaults(); }
    }

    static saveSettings(settings, actor = "system") {
        try {
            const normalized = { ...this.defaults(), ...settings };
            normalized.timezoneOffsetMinutes = Math.max(-720, Math.min(840, Math.floor(Number(normalized.timezoneOffsetMinutes) || 0)));
            normalized.dailyMoney = normalized.dailyMoney.slice(0, 7).map(value => Math.max(0, Math.floor(Number(value) || 0)));
            while (normalized.dailyMoney.length < 7) normalized.dailyMoney.push(0);
            world.setDynamicProperty(SETTINGS_KEY, JSON.stringify(normalized));
            AuditManager.log("ops_settings", actor, "operations", `TPA=${normalized.tpaEnabled} 签到=${normalized.dailyEnabled} 兑换码=${normalized.redeemEnabled} 时区=${normalized.timezoneOffsetMinutes}`);
            return true;
        } catch (error) {
            console.warn(`[Operations] Failed to save settings: ${error}`);
            return false;
        }
    }

    static getCodes() {
        try {
            const raw = world.getDynamicProperty(CODES_KEY);
            const codes = typeof raw === "string" ? JSON.parse(raw) : [];
            return Array.isArray(codes) ? codes : [];
        } catch { return []; }
    }

    static saveCodes(codes) {
        try {
            const bounded = codes.slice(0, Math.max(1, Math.min(100, Number(Config.operations?.maxCodes) || 50)));
            let encoded = JSON.stringify(bounded);
            while (encoded.length > 30000 && bounded.length > 1) {
                bounded.pop();
                encoded = JSON.stringify(bounded);
            }
            world.setDynamicProperty(CODES_KEY, encoded);
            return true;
        } catch (error) {
            console.warn(`[Operations] Failed to save codes: ${error}`);
            return false;
        }
    }

    static getPlayerJson(player, key, fallback) {
        try {
            const raw = player.getDynamicProperty(key);
            return typeof raw === "string" ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    }

    static setPlayerJson(player, key, value) {
        try {
            player.setDynamicProperty(key, JSON.stringify(value));
            return true;
        } catch { return false; }
    }

    static sanitizeCode(value) {
        return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
    }

    static maskCode(code) {
        const value = this.sanitizeCode(code);
        return value.length <= 4 ? "****" : `${value.slice(0, 2)}***${value.slice(-2)}`;
    }

    static normalizeReward(reward) {
        return {
            money: Math.max(0, Math.floor(Number(reward?.money) || 0)),
            items: Array.isArray(reward?.items) ? reward.items.slice(0, 8).map(item => ({
                id: String(item?.id || "").trim(),
                amount: Math.max(1, Math.min(256, Math.floor(Number(item?.amount) || 1)))
            })).filter(item => item.id) : []
        };
    }

    static validateReward(reward) {
        const normalized = this.normalizeReward(reward);
        if (!normalized.money && normalized.items.length === 0) return false;
        try {
            for (const item of normalized.items) new ItemStack(item.id, 1);
            return true;
        } catch { return false; }
    }

    static rewardText(reward) {
        const normalized = this.normalizeReward(reward);
        const parts = [];
        if (normalized.money) parts.push(`${normalized.money} 金币`);
        for (const item of normalized.items) parts.push(`${item.id} ×${item.amount}`);
        return parts.join(" + ") || "无奖励";
    }

    static grantReward(player, reward) {
        const normalized = this.normalizeReward(reward);
        if (!Utils.isValid(player) || !this.validateReward(normalized)) return false;
        const inventory = player.getComponent("inventory");
        if (!inventory?.container && normalized.items.length) return false;
        let success = true;
        for (const item of normalized.items) if (!Utils.giveItem(player, item.id, item.amount)) success = false;
        if (success && normalized.money) EconomyManager.addBalance(player, normalized.money);
        return success;
    }

    static getPending(player) {
        const pending = this.getPlayerJson(player, PENDING_KEY, []);
        return Array.isArray(pending) ? pending : [];
    }

    static queueReward(player, reward, source) {
        const pending = this.getPending(player);
        pending.push({ id: `reward_${Date.now().toString(36)}`, reward: this.normalizeReward(reward), source: String(source || "奖励").slice(0, 48), time: Date.now() });
        return this.setPlayerJson(player, PENDING_KEY, pending.slice(-20));
    }

    static deliverOrQueue(player, reward, source) {
        if (this.grantReward(player, reward)) return true;
        this.queueReward(player, reward, source);
        Utils.tell(player, "§e奖励暂时无法发放，已存入待领取奖励箱。");
        return false;
    }

    static getDayInfo() {
        const settings = this.getSettings();
        const shifted = Date.now() + settings.timezoneOffsetMinutes * 60000;
        return { day: Math.floor(shifted / 86400000), date: new Date(shifted).toISOString().slice(0, 10), settings };
    }

    static getDailyState(player) {
        const state = this.getPlayerJson(player, DAILY_KEY, {});
        return { lastDay: Number(state.lastDay ?? -1), streak: Number(state.streak || 0), total: Number(state.total || 0), longest: Number(state.longest || 0) };
    }

    static getDailyReward(streak, settings = this.getSettings()) {
        const day = ((Math.max(1, streak) - 1) % 7) + 1;
        const reward = { money: settings.dailyMoney[day - 1] || 0, items: [] };
        if (day === 7 && settings.daySevenItem && settings.daySevenAmount > 0) reward.items.push({ id: settings.daySevenItem, amount: settings.daySevenAmount });
        return { day, reward };
    }

    static claimDaily(player) {
        const { day, date, settings } = this.getDayInfo();
        if (!settings.dailyEnabled) {
            Utils.tell(player, "§8每日签到当前已被管理员关闭。");
            return false;
        }
        const state = this.getDailyState(player);
        if (state.lastDay === day) {
            Utils.tell(player, "§8你今天已经签到过了。");
            return false;
        }
        state.streak = state.lastDay === day - 1 ? state.streak + 1 : 1;
        state.lastDay = day;
        state.total += 1;
        state.longest = Math.max(state.longest, state.streak);
        const { day: cycleDay, reward } = this.getDailyReward(state.streak, settings);
        if (!this.validateReward(reward) || !this.setPlayerJson(player, DAILY_KEY, state)) {
            Utils.tell(player, "§c签到配置或数据无效，请联系管理员。");
            return false;
        }
        this.deliverOrQueue(player, reward, `签到 ${date}`);
        Utils.tell(player, `§a签到成功！连续第 §e${state.streak} §a天（七日周期第 ${cycleDay} 天），获得 §e${this.rewardText(reward)}§a。`);
        AuditManager.log("daily_claim", player, date, `streak=${state.streak} reward=${this.rewardText(reward)}`);
        return true;
    }

    static redeem(player, rawCode) {
        const settings = this.getSettings();
        if (!settings.redeemEnabled) return { success: false, message: "兑换码功能当前已关闭。" };
        const value = this.sanitizeCode(rawCode);
        if (!value) return { success: false, message: "请输入有效兑换码。" };
        const codes = this.getCodes();
        const index = codes.findIndex(code => code.code === value);
        const code = codes[index];
        const now = Date.now();
        if (!code || !code.enabled) return { success: false, message: "兑换码不存在或已停用。" };
        if (code.startsAt && now < code.startsAt) return { success: false, message: "兑换码尚未生效。" };
        if (code.expiresAt && now > code.expiresAt) return { success: false, message: "兑换码已经过期。" };
        if (code.maxUses > 0 && code.used >= code.maxUses) return { success: false, message: "兑换码已达到总使用次数。" };
        if (!this.validateReward(code.reward)) return { success: false, message: "兑换码奖励配置无效，请联系管理员。" };
        const redeemed = this.getPlayerJson(player, REDEEMED_KEY, {});
        const playerUses = Number(redeemed[code.id] || 0);
        if (playerUses >= code.perPlayer) return { success: false, message: "你已经使用过该兑换码。" };

        // 先锁定全服与个人次数，再发奖，避免快速重复点击。
        code.used += 1;
        redeemed[code.id] = playerUses + 1;
        if (!this.saveCodes(codes)) return { success: false, message: "兑换数据保存失败，请稍后重试。" };
        if (!this.setPlayerJson(player, REDEEMED_KEY, redeemed)) {
            code.used = Math.max(0, code.used - 1);
            this.saveCodes(codes);
            return { success: false, message: "个人兑换记录保存失败，请稍后重试。" };
        }
        this.deliverOrQueue(player, code.reward, `兑换码 ${code.name}`);
        AuditManager.log("code_redeem", player, code.name, `${this.maskCode(code.code)} reward=${this.rewardText(code.reward)}`);
        return { success: true, message: `兑换成功：${this.rewardText(code.reward)}` };
    }

    static createCode(admin, data) {
        if (!Utils.isAdmin(admin)) return false;
        const codeValue = this.sanitizeCode(data.code);
        const name = String(data.name || "兑换码奖励").replace(/[\n\r§]/g, "").trim().slice(0, 32);
        const reward = this.normalizeReward(data.reward);
        if (!codeValue || !name || !this.validateReward(reward)) return false;
        const codes = this.getCodes();
        if (codes.some(code => code.code === codeValue) || codes.length >= (Config.operations?.maxCodes || 50)) return false;
        const code = {
            id: `code_${Date.now().toString(36)}`,
            code: codeValue,
            name,
            reward,
            enabled: true,
            maxUses: Math.max(0, Math.floor(Number(data.maxUses) || 0)),
            perPlayer: Math.max(1, Math.min(10, Math.floor(Number(data.perPlayer) || 1))),
            used: 0,
            startsAt: Date.now(),
            expiresAt: Number(data.expiresAt) || 0,
            createdBy: admin.name,
            createdAt: Date.now()
        };
        codes.unshift(code);
        const saved = this.saveCodes(codes);
        if (saved) AuditManager.log("code_create", admin, name, `${this.maskCode(codeValue)} limit=${code.maxUses || "unlimited"}`);
        return saved;
    }

    static openPlayerMenu(player, onBack = null) {
        const { date, settings } = this.getDayInfo();
        const state = this.getDailyState(player);
        const pending = this.getPending(player);
        const actions = [];
        const form = new ActionFormData().title("§l§e🎁 每日福利").body(`§0服务器日期: §e${date}\n§0连续签到: §a${state.streak} 天 §8| 累计 ${state.total} 天\n§0待领取奖励: §e${pending.length}`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add(`§l§a📅 今日签到\n§r§8${settings.dailyEnabled ? "领取七日循环奖励" : "管理员已关闭"}`, "textures/ui/gift_square", () => { this.claimDaily(player); this.openPlayerMenu(player, onBack); });
        add(`§l§6🎟 输入兑换码\n§r§8${settings.redeemEnabled ? "领取服务器活动奖励" : "管理员已关闭"}`, "textures/ui/Trade2", () => this.openRedeemModal(player, onBack));
        add(`§l§b📦 待领取奖励\n§r§8当前 ${pending.length} 项`, "textures/ui/icon_recipe_nature", () => this.openPendingMenu(player, onBack));
        add("§l§8⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openRedeemModal(player, onBack = null) {
        const form = new ModalFormData().title("§l兑换服务器礼包码").textField("兑换码", "例如：WELCOME2026");
        Utils.showForm(player, form, response => {
            if (!response.canceled) {
                const result = this.redeem(player, response.formValues?.[0]);
                Utils.tell(player, result.success ? `§a${result.message}` : `§c${result.message}`);
            }
            this.openPlayerMenu(player, onBack);
        });
    }

    static openPendingMenu(player, onBack = null) {
        const pending = this.getPending(player);
        const actions = [];
        const form = new ActionFormData().title("§l§b📦 待领取奖励").body(pending.length ? "§8点击一项尝试重新领取。" : "§8没有待领取奖励。");
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        for (const entry of pending) add(`§0${entry.source}\n§r§8${this.rewardText(entry.reward)}`, "textures/ui/gift_square", () => {
            if (this.grantReward(player, entry.reward)) {
                this.setPlayerJson(player, PENDING_KEY, this.getPending(player).filter(item => item.id !== entry.id));
                Utils.tell(player, `§a已领取：§e${this.rewardText(entry.reward)}`);
                AuditManager.log("pending_claim", player, entry.source, this.rewardText(entry.reward));
            } else Utils.tell(player, "§c奖励仍无法发放，请联系管理员检查物品配置。");
            this.openPendingMenu(player, onBack);
        });
        add("§l§8⬅ 返回", "textures/ui/undo", () => this.openPlayerMenu(player, onBack));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openAdminMenu(admin, onBack = null) {
        if (!Utils.isAdmin(admin)) return;
        const settings = this.getSettings();
        const actions = [];
        const form = new ActionFormData().title("§l§c🎛 服务器运营管理").body(`§0每日签到: ${settings.dailyEnabled ? "§a开启" : "§c关闭"}\n§0兑换码: ${settings.redeemEnabled ? "§a开启" : "§c关闭"}\n§0兑换码数量: §e${this.getCodes().length}`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§a📅 签到配置", "textures/ui/gift_square", () => this.openDailyAdmin(admin, onBack));
        add("§l§6🎟 兑换码管理", "textures/ui/Trade2", () => this.openCodeAdmin(admin, onBack));
        add("§l§b📦 玩家待领取奖励管理", "textures/ui/icon_recipe_nature", () => this.openPendingAdminSelect(admin, onBack));
        add("§l§8⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(admin, form, response => actions[response.selection]?.());
    }

    static openDailyAdmin(admin, onBack = null) {
        const settings = this.getSettings();
        const form = new ModalFormData().title("§l签到与兑换功能配置")
            .toggle("启用每日签到", settings.dailyEnabled)
            .toggle("启用兑换码", settings.redeemEnabled)
            .textField("服务器时区（UTC 小时，如 8）", "8", String(settings.timezoneOffsetMinutes / 60))
            .textField("第1～7天金币，用英文逗号分隔", "2000,2500,3000,3500,4000,5000,8000", settings.dailyMoney.join(","))
            .textField("第7天额外物品 ID", "minecraft:diamond", settings.daySevenItem)
            .textField("第7天物品数量", "1", String(settings.daySevenAmount));
        Utils.showForm(admin, form, response => {
            if (!response.canceled) {
                const [dailyEnabled, redeemEnabled, timezone, moneyList, itemId, itemAmount] = response.formValues;
                const dailyMoney = String(moneyList).split(",").map(value => Math.max(0, Math.floor(Number(value) || 0))).slice(0, 7);
                const reward = { money: dailyMoney[6] || 0, items: itemId ? [{ id: String(itemId).trim(), amount: Number(itemAmount) || 1 }] : [] };
                if (dailyMoney.length !== 7 || dailyMoney.some(value => value <= 0) || !this.validateReward(reward)) Utils.tell(admin, "§c保存失败：需要填写 7 个正数金币奖励，且第 7 天奖励物品必须有效。");
                else {
                    this.saveSettings({ ...settings, dailyEnabled, redeemEnabled, timezoneOffsetMinutes: Number(timezone) * 60, dailyMoney, daySevenItem: String(itemId).trim(), daySevenAmount: Number(itemAmount) || 1 }, admin);
                    Utils.tell(admin, "§a运营配置已保存。");
                }
            }
            this.openAdminMenu(admin, onBack);
        });
    }

    static openCodeAdmin(admin, onBack = null) {
        const codes = this.getCodes();
        const actions = [];
        const form = new ActionFormData().title("§l§6🎟 兑换码管理").body(`§0当前兑换码: §e${codes.length}/${Config.operations?.maxCodes || 50}`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§a➕ 创建兑换码", "textures/ui/plus", () => this.openCreateCode(admin, onBack));
        for (const code of codes) add(`${code.enabled ? "§a" : "§8"}${code.name}\n§r§8${this.maskCode(code.code)} · ${code.used}/${code.maxUses || "∞"}`, "textures/ui/Trade2", () => this.openCodeActions(admin, code.id, onBack));
        add("§l§8⬅ 返回", "textures/ui/undo", () => this.openAdminMenu(admin, onBack));
        Utils.showForm(admin, form, response => actions[response.selection]?.());
    }

    static openCreateCode(admin, onBack = null) {
        const form = new ModalFormData().title("§l创建兑换码")
            .textField("兑换码（字母/数字/_/-）", "WELCOME2026", "WELCOME2026")
            .textField("活动名称", "新手礼包", "新手礼包")
            .textField("金币奖励", "500", "500")
            .textField("物品 ID（可留空）", "minecraft:diamond", "minecraft:diamond")
            .textField("物品数量", "1", "1")
            .textField("全服总次数（0=不限）", "100", "100")
            .textField("每人次数（1-10）", "1", "1")
            .textField("有效天数（0=永久）", "30", "30");
        Utils.showForm(admin, form, response => {
            if (!response.canceled) {
                const [code, name, money, itemId, amount, maxUses, perPlayer, days] = response.formValues;
                const validDays = Math.max(0, Number(days) || 0);
                const created = this.createCode(admin, {
                    code, name, maxUses, perPlayer,
                    expiresAt: validDays ? Date.now() + validDays * 86400000 : 0,
                    reward: { money, items: itemId ? [{ id: String(itemId).trim(), amount }] : [] }
                });
                Utils.tell(admin, created ? "§a兑换码创建成功。" : "§c创建失败：兑换码重复、奖励无效或数量达到上限。");
            }
            this.openCodeAdmin(admin, onBack);
        });
    }

    static openCodeActions(admin, codeId, onBack = null) {
        const codes = this.getCodes();
        const code = codes.find(entry => entry.id === codeId);
        if (!code) return this.openCodeAdmin(admin, onBack);
        const form = new MessageFormData().title(`§l${code.name}`).body(`§0兑换码: §e${code.code}\n§0状态: ${code.enabled ? "§a启用" : "§c停用"}\n§0奖励: §e${this.rewardText(code.reward)}\n§0使用: §e${code.used}/${code.maxUses || "∞"}\n§0每人: §e${code.perPlayer} 次\n§0到期: §8${code.expiresAt ? new Date(code.expiresAt).toLocaleString("zh-CN") : "永久"}\n\n§8选择切换状态，或进入删除确认。`).button1(code.enabled ? "§c停用" : "§a启用").button2("§4删除…");
        Utils.showForm(admin, form, response => {
            if (response.canceled) return this.openCodeAdmin(admin, onBack);
            if (response.selection === 0) {
                code.enabled = !code.enabled;
                this.saveCodes(codes);
                AuditManager.log("code_toggle", admin, code.name, `${this.maskCode(code.code)} enabled=${code.enabled}`);
                this.openCodeAdmin(admin, onBack);
            } else this.confirmDeleteCode(admin, code, onBack);
        });
    }

    static confirmDeleteCode(admin, code, onBack = null) {
        const form = new MessageFormData().title("§l§c确认删除兑换码").body(`§c删除后无法恢复：${code.name}\n§8建议有玩家使用后优先停用，而不是删除。`).button1("§c确认删除").button2("§8取消");
        Utils.showForm(admin, form, response => {
            if (response.selection === 0) {
                this.saveCodes(this.getCodes().filter(entry => entry.id !== code.id));
                AuditManager.log("code_delete", admin, code.name, this.maskCode(code.code));
                Utils.tell(admin, "§a兑换码已删除。");
            }
            this.openCodeAdmin(admin, onBack);
        });
    }

    static openPendingAdminSelect(admin, onBack = null) {
        const players = world.getAllPlayers();
        const form = new ActionFormData().title("§l§b玩家待领取奖励").body("§8仅能管理当前在线玩家。");
        for (const target of players) form.button(`${target.name}\n§r§8待领取 ${this.getPending(target).length} 项`, "textures/ui/FriendsIcon");
        form.button("§l§8⬅ 返回", "textures/ui/undo");
        Utils.showForm(admin, form, response => {
            const target = players[response.selection];
            if (target) this.openPendingAdminActions(admin, target, onBack);
            else this.openAdminMenu(admin, onBack);
        });
    }

    static openPendingAdminActions(admin, target, onBack = null) {
        if (!Utils.isValid(target)) return this.openPendingAdminSelect(admin, onBack);
        const pending = this.getPending(target);
        const actions = [];
        const details = pending.slice(0, 8).map(entry => `§8- ${entry.source}: ${this.rewardText(entry.reward)}`).join("\n");
        const form = new ActionFormData().title(`§l管理 ${target.name} 的奖励`).body(`§0待领取: §e${pending.length} 项\n${details || "§8无待领取奖励"}`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§a📤 尝试发放全部", "textures/ui/gift_square", () => {
            const failed = [];
            let delivered = 0;
            for (const entry of this.getPending(target)) {
                if (this.grantReward(target, entry.reward)) delivered++;
                else failed.push(entry);
            }
            this.setPlayerJson(target, PENDING_KEY, failed);
            AuditManager.log("pending_admin", admin, target.name, `发放 ${delivered}，剩余 ${failed.length}`);
            Utils.tell(admin, `§a成功发放 ${delivered} 项，仍有 ${failed.length} 项失败。`);
            this.openPendingAdminActions(admin, target, onBack);
        });
        add("§l§c🗑 清空待领取记录", "textures/ui/trash", () => this.confirmClearPending(admin, target, onBack));
        add("§l§8⬅ 返回", "textures/ui/undo", () => this.openPendingAdminSelect(admin, onBack));
        Utils.showForm(admin, form, response => actions[response.selection]?.());
    }

    static confirmClearPending(admin, target, onBack = null) {
        const count = this.getPending(target).length;
        const form = new MessageFormData().title("§l§c清空待领取奖励").body(`§c将删除 ${target.name} 的 ${count} 项待领取奖励，且无法恢复。`).button1("§c确认清空").button2("§8取消");
        Utils.showForm(admin, form, response => {
            if (response.selection === 0) {
                this.setPlayerJson(target, PENDING_KEY, []);
                AuditManager.log("pending_admin", admin, target.name, `清空 ${count} 项`);
            }
            this.openPendingAdminActions(admin, target, onBack);
        });
    }
}
