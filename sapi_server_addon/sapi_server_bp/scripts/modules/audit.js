import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";

const AUDIT_KEY = "sapi:server:audit:v1";

/** 服务器管理审计日志。只记录操作元数据，不保存聊天或背包内容。 */
export class AuditManager {
    static getLogs() {
        try {
            const raw = world.getDynamicProperty(AUDIT_KEY);
            const logs = typeof raw === "string" ? JSON.parse(raw) : [];
            return Array.isArray(logs) ? logs : [];
        } catch (error) {
            console.warn(`[Audit] Failed to read logs: ${error}`);
            return [];
        }
    }

    static saveLogs(logs) {
        try {
            const limit = Math.max(20, Math.min(500, Number(Config.audit?.maxEntries) || 200));
            const bounded = logs.slice(0, limit);
            let encoded = JSON.stringify(bounded);
            while (encoded.length > 30000 && bounded.length > 1) {
                bounded.pop();
                encoded = JSON.stringify(bounded);
            }
            world.setDynamicProperty(AUDIT_KEY, encoded);
            return true;
        } catch (error) {
            console.warn(`[Audit] Failed to save logs: ${error}`);
            return false;
        }
    }

    static log(type, actor, target = "", detail = "") {
        const actorName = typeof actor === "string" ? actor : actor?.name || "system";
        const entry = {
            id: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            time: Date.now(),
            type: String(type || "unknown").slice(0, 32),
            actor: String(actorName).slice(0, 32),
            target: String(target || "").slice(0, 48),
            detail: String(detail || "").replace(/[\n\r]/g, " ").slice(0, 160)
        };
        const logs = this.getLogs();
        logs.unshift(entry);
        this.saveLogs(logs);
        console.warn(`[Audit] ${entry.type} actor=${entry.actor} target=${entry.target} detail=${entry.detail}`);
        return entry;
    }

    static label(type) {
        const labels = {
            warp_create: "创建传送点", warp_delete: "删除传送点", spawn_set: "设置主城",
            warp_use: "公共传送", home_set: "设置 Home", home_delete: "删除 Home", home_use: "使用 Home",
            tpa_request: "发起 TPA", tpa_accept: "接受 TPA", tpa_reject: "拒绝 TPA", tpa_cancel: "取消 TPA", tpa_expire: "TPA 过期",
            death_record: "记录死亡点", death_back: "死亡返回", admin_clear: "管理员清理",
            region_create: "创建保护区", region_delete: "删除保护区", land_claim: "认领地皮", land_sell: "出售地皮",
            admin_money: "管理金币", admin_plot_delete: "强删地皮", admin_broadcast: "发布公告", admin_gift: "全服福利",
            ops_settings: "运营设置", daily_claim: "每日签到", code_create: "创建兑换码", code_toggle: "切换兑换码",
            code_delete: "删除兑换码", code_redeem: "兑换礼包码", pending_claim: "领取暂存奖励", pending_admin: "管理暂存奖励",
            tpa_receive: "TPA 接收设置", tpa_admin: "TPA 管理设置"
        };
        return labels[type] || type;
    }

    static formatTime(timestamp) {
        try { return new Date(timestamp).toLocaleString("zh-CN", { hour12: false }); }
        catch { return String(timestamp); }
    }

    static openAdminUI(player, onBack = null, filter = "") {
        if (!Utils.isAdmin(player)) return;
        const needle = String(filter || "").trim().toLowerCase();
        const logs = this.getLogs().filter(entry => !needle ||
            [entry.type, entry.actor, entry.target, entry.detail, this.label(entry.type)].some(value => String(value || "").toLowerCase().includes(needle))
        ).slice(0, 30);
        const actions = [];
        const form = new ActionFormData().title("§l§c📋 服务器审计").body(
            `§f总记录: §e${this.getLogs().length}§f 条\n§f当前筛选: §7${needle || "无"}\n§8仅显示最近 30 条匹配记录`
        );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§b🔎 搜索日志", "textures/ui/magnifyingGlass", () => this.openFilterModal(player, onBack));
        add("§l§7✖ 清除筛选", "textures/ui/cancel", () => this.openAdminUI(player, onBack));
        for (const entry of logs) {
            add(`§f${this.label(entry.type)} §8| §e${entry.actor}\n§r§7${this.formatTime(entry.time)}`, "textures/ui/achievements", () => this.openEntry(player, entry, onBack, needle));
        }
        add("§l§6📤 输出到内容日志", "textures/ui/op", () => {
            console.warn(`[Audit Export] ${JSON.stringify(this.getLogs())}`);
            Utils.tell(player, "§a审计日志已输出到 Minecraft 内容日志。注意日志可能包含玩家名和坐标。");
            this.openAdminUI(player, onBack, needle);
        });
        add("§l§c🗑️ 清空审计日志", "textures/ui/trash", () => this.confirmClear(player, onBack));
        add("§l§7⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openFilterModal(player, onBack = null) {
        const form = new ModalFormData().title("§l搜索审计日志").textField("类型、玩家名或详情", "例如：TPA / Steve / Home");
        Utils.showForm(player, form, response => {
            const filter = response.formValues?.[0] || "";
            this.openAdminUI(player, onBack, filter);
        });
    }

    static openEntry(player, entry, onBack, filter) {
        const form = new MessageFormData().title(`§l${this.label(entry.type)}`).body(
            `§f时间: §7${this.formatTime(entry.time)}\n§f操作者: §e${entry.actor}\n§f目标: §b${entry.target || "无"}\n§f详情: §7${entry.detail || "无"}\n§8ID: ${entry.id}`
        ).button1("§7返回日志").button2("§7关闭");
        Utils.showForm(player, form, response => {
            if (response.selection === 0) this.openAdminUI(player, onBack, filter);
        });
    }

    static confirmClear(player, onBack = null) {
        const form = new MessageFormData().title("§l§c清空审计日志").body("§c此操作不可撤销。确定清空全部服务器审计记录？").button1("§c确认清空").button2("§7取消");
        Utils.showForm(player, form, response => {
            if (response.selection === 0) {
                this.saveLogs([]);
                this.log("admin_clear", player, "audit", "清空全部审计日志");
                Utils.tell(player, "§a审计日志已清空，并保留了本次清空操作记录。");
            }
            this.openAdminUI(player, onBack);
        });
    }
}
