import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { SocialStore, normalizePlayerName } from "../data/socialStore.js";
import { EconomyManager } from "./economy.js";
import { AuditManager } from "./audit.js";
import { Utils } from "../utils.js";

const BLACKLIST_KEY = "sapi:server:blacklist:v1";

function onlinePlayer(name) {
    const normalized = normalizePlayerName(name);
    return world.getAllPlayers().find(player => normalizePlayerName(player.name) === normalized) || null;
}

function kickPlayer(player) {
    const safeName = String(player?.name || "").replace(/["\\]/g, "");
    if (!safeName) return;
    try { world.getDimension("minecraft:overworld").runCommand(`kick "${safeName}" §c你已被加入服务器黑名单。`); } catch {}
}

export class WantedManager {
    static decayTicks = new Map();

    static points(playerOrName) {
        const name = typeof playerOrName === "string" ? playerOrName : playerOrName?.name;
        return Math.max(0, Math.floor(Number(SocialStore.getProfile(name, true)?.wantedPoints || 0)));
    }

    static label(points) {
        const value = Math.max(0, Math.floor(Number(points) || 0));
        if (value >= 50) return "§4高危通缉";
        if (value >= 20) return "§c通缉";
        if (value >= 10) return "§6嫌疑";
        if (value > 0) return "§e警告";
        return "§a正常";
    }

    static setPoints(playerOrName, amount, reason = "system", actor = "system") {
        const name = typeof playerOrName === "string" ? playerOrName : playerOrName?.name;
        const profile = SocialStore.getProfile(name, true);
        if (!profile) return 0;
        const previous = Math.max(0, Math.floor(Number(profile.wantedPoints || 0)));
        const next = Math.max(0, Math.min(9999, Math.floor(Number(amount) || 0)));
        profile.wantedPoints = next;
        profile.wanted = this.label(next).replace(/§./g, "");
        profile.wantedUpdatedAt = Date.now();
        SocialStore.saveProfile(profile);
        const player = onlinePlayer(profile.name);
        if (player && next !== previous) {
            Utils.tell(player, `${next > previous ? "§c通缉值增加" : "§a通缉值降低"}：§e${previous} → ${next} §8(${reason})`);
        }
        if (next !== previous) AuditManager.log("wanted_change", actor, profile.name, `${previous}->${next} reason=${reason}`);
        return next;
    }

    static addPoints(playerOrName, amount, reason = "违法行为", actor = null) {
        const name = typeof playerOrName === "string" ? playerOrName : playerOrName?.name;
        return this.setPoints(name, this.points(name) + Math.max(0, Math.floor(Number(amount) || 0)), reason, actor || playerOrName || name);
    }

    static isTradeRestricted(player) {
        return !Utils.isAdmin(player) && this.points(player) >= Number(Config.wanted?.tradeRestrictionPoints || 20);
    }

    static requireOfficialTrade(player) {
        if (!this.isTradeRestricted(player)) return true;
        Utils.tell(player, `§c你的通缉值为 §e${this.points(player)}§c，达到 20 后无法使用全球商店或管理自己的贩卖机。你仍可购买其他玩家贩卖机的商品。`);
        Utils.sound.fail(player);
        return false;
    }

    static bailCost(playerOrName) {
        const points = this.points(playerOrName);
        return Math.max(Number(Config.wanted?.minimumBail || 60000), points * Number(Config.wanted?.bailPerPoint || 3000));
    }

    static openPlayerMenu(player, onBack = null) {
        const points = this.points(player);
        const restricted = this.isTradeRestricted(player);
        const cost = this.bailCost(player);
        const form = new MessageFormData().title("§l§c⚖ 通缉与保释").body(
            `§0当前通缉值：§e${points}\n§0状态：${this.label(points)}\n§0商业限制：${restricted ? "§c已限制" : "§a未限制"}\n\n` +
            `§8在线每 10 分钟自动降低 1 点。达到 20 点后不能使用全球商店或管理自己的贩卖机。\n\n` +
            `§0全额保释：${Utils.formatCurrency(cost)}`
        ).button1(points > 0 ? "§a支付保释" : "§8无需保释").button2("§8返回");
        Utils.showForm(player, form, response => {
            if (response.selection === 0 && points > 0) {
                if (!EconomyManager.removeBalance(player, cost)) Utils.tell(player, `§c保释需要 ${Utils.formatCurrency(cost)}。`);
                else {
                    this.setPoints(player, 0, "支付全额保释", player);
                    AuditManager.log("wanted_bail", player, player.name, `cost=${cost}`);
                    Utils.sound.success(player);
                }
            }
            onBack?.();
        });
    }

    static blacklist() {
        try {
            const value = JSON.parse(world.getDynamicProperty(BLACKLIST_KEY) || "[]");
            return Array.isArray(value) ? value.filter(entry => entry?.name) : [];
        } catch { return []; }
    }

    static saveBlacklist(entries) {
        world.setDynamicProperty(BLACKLIST_KEY, JSON.stringify(entries.slice(-200)));
    }

    static isBlacklisted(name) {
        const normalized = normalizePlayerName(name);
        return this.blacklist().some(entry => normalizePlayerName(entry.name) === normalized);
    }

    static addBlacklist(name, actor = "system") {
        if (!name || this.isBlacklisted(name)) return false;
        const entries = this.blacklist();
        entries.push({ name: String(name), actor: typeof actor === "string" ? actor : actor?.name || "system", createdAt: Date.now(), wantedPoints: this.points(name) });
        this.saveBlacklist(entries);
        AuditManager.log("blacklist_add", actor, name, `wanted=${this.points(name)}`);
        const player = onlinePlayer(name);
        if (player) system.run(() => kickPlayer(player));
        return true;
    }

    static removeBlacklist(name, actor = "system") {
        const normalized = normalizePlayerName(name);
        const entries = this.blacklist();
        const next = entries.filter(entry => normalizePlayerName(entry.name) !== normalized);
        if (next.length === entries.length) return false;
        this.saveBlacklist(next);
        AuditManager.log("blacklist_remove", actor, name);
        return true;
    }

    static enforceBlacklist(player) {
        if (!player || !this.isBlacklisted(player.name)) return false;
        system.runTimeout(() => kickPlayer(player), 5);
        return true;
    }

  static tickDecay() {
        const step = 200;
        const threshold = Math.max(1200, Number(Config.wanted?.decayMinutes || 10) * 1200);
        for (const player of world.getAllPlayers()) {
            if (this.points(player) <= 0) continue;
            const accumulated = Number(this.decayTicks.get(player.id) || 0) + step;
            if (accumulated >= threshold) {
                this.decayTicks.set(player.id, accumulated - threshold);
                this.setPoints(player, this.points(player) - 1, "在线自然衰减");
            } else this.decayTicks.set(player.id, accumulated);
  }

    static onPlayerLeave(playerId) {
        if (playerId) this.decayTicks.delete(playerId);
    }
    }

    static openAdminMenu(player, onBack = null) {
        if (!Utils.isAdmin(player)) return;
        const profiles = SocialStore.allProfiles().filter(profile => Number(profile.wantedPoints || 0) > 0)
            .sort((a, b) => Number(b.wantedPoints || 0) - Number(a.wantedPoints || 0));
        const actions = [];
        const form = new ActionFormData().title("§l§4通缉与黑名单管理").body(`§0通缉玩家：§e${profiles.length}\n§0黑名单：§c${this.blacklist().length}`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        const high = profiles.filter(profile => Number(profile.wantedPoints || 0) >= Number(Config.wanted?.blacklistThreshold || 50));
        add(`§l§4一键拉黑高危玩家\n§r§8当前符合 ${high.length} 人（≥${Config.wanted?.blacklistThreshold || 50}）`, "textures/ui/cancel", () => {
            for (const profile of high) this.addBlacklist(profile.name, player);
            Utils.tell(player, `§a已将 ${high.length} 名高危通缉玩家加入黑名单。`);
            this.openAdminMenu(player, onBack);
        });
        for (const profile of profiles.slice(0, 40)) add(`${this.label(profile.wantedPoints)} §0${profile.name}\n§r§8通缉值 ${profile.wantedPoints}`, "textures/ui/warning_alex", () => this.openAdminPlayer(player, profile.name, onBack));
        for (const entry of this.blacklist().slice(-20).reverse()) add(`§4黑名单 §0${entry.name}\n§r§8点击移出`, "textures/ui/minus", () => {
            this.removeBlacklist(entry.name, player);
            this.openAdminMenu(player, onBack);
        });
        add("§l§8返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openAdminPlayer(admin, name, onBack) {
        const points = this.points(name);
        const form = new MessageFormData().title(`§l管理 ${name}`).body(`§0当前通缉值：§e${points}\n§0左侧清零，右侧加入黑名单。`)
            .button1("§a清除通缉").button2("§4加入黑名单");
        Utils.showForm(admin, form, response => {
            if (response.selection === 0) this.setPoints(name, 0, "管理员清除", admin);
            else this.addBlacklist(name, admin);
            this.openAdminMenu(admin, onBack);
        });
    }
}
