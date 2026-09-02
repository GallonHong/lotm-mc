import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { ShopManager } from "./shop.js";
import { LandManager } from "./land.js";
import { LotteryManager } from "./lottery.js";
import { MarketManager } from "./market.js";
import { Integration } from "./integration.js";
import { TeleportManager } from "./teleport.js";
import { RegionManager } from "./region.js";
import { AuditManager } from "./audit.js";
import { OperationsManager } from "./operations.js";

/** 服务器 Add-on 菜单。LOTM 功能只通过跨包事件调用，不直接导入 LOTM 源码。 */
export class ServerMenuManager {
    static openMainMenu(player) {
        if (!Utils.isValid(player)) return;
        const balance = EconomyManager.getBalance(player);
        const { chunkX, chunkZ } = Utils.getChunkCoords(player.location);
        const lotmReady = Integration.isLotmAvailable();
        const dailyReady = Integration.isDailyEventsAvailable();
        const sequence = Utils.getProp(player, "lotm:sequence", 0);
        const spirituality = Utils.getProp(player, "lotm:sp", 0);
        const actions = [];
        const form = new ActionFormData()
            .title(`§l${Config.system.serverName} §r§8- 服务器菜单`)
            .body(
                `§7══════════════════════════════\n` +
                `§f玩家: §e${player.name}\n` +
                `§f资产: ${Utils.formatCurrency(balance)}\n` +
                (lotmReady ? `§f非凡状态: §d${sequence ? `序列 ${sequence}` : "普通人"} §8| §d${spirituality} 灵性\n` : "§8LOTM Pathways 未安装或尚未启动\n") +
                `§f区块: §7[${chunkX}, ${chunkZ}]\n` +
                `§7══════════════════════════════`
            );

        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§b🧭 公共传送点\n§r§8前往主城与公共区域（免费）", "textures/ui/World", () => TeleportManager.openWarpMenu(player, () => this.openMainMenu(player)));
        add("§l§a🏠 个人传送\n§r§8Home、TPA 与死亡返回（免费）", "textures/ui/icon_recipe_nature", () => TeleportManager.openPlayerMenu(player, () => this.openMainMenu(player)));
        add("§l§e🎁 每日福利\n§r§8签到、兑换码与待领取奖励", "textures/ui/gift_square", () => OperationsManager.openPlayerMenu(player, () => this.openMainMenu(player)));
        if (dailyReady) {
            add("§l§6📋 生存联盟委托\n§r§8日常任务、活跃度与世界事件", "textures/ui/achievements", () => Integration.send(player, "daily:menu"));
        }
        add("§l§6🏦 个人银行\n§r§8资产查询与玩家转账", "textures/ui/Trade2", () => EconomyManager.openBankUI(player, () => this.openMainMenu(player)));
        add("§l§a🛒 全球商店\n§r§8基础物资与可选联动商品", "textures/ui/MCStore_Gold_large", () => ShopManager.openShopCategoryUI(player, () => this.openMainMenu(player)));
        add("§l§2🛡️ 地皮领地\n§r§8购买与管理保护区块", "textures/ui/village_hero_effect", () => LandManager.openPlotMainUI(player, () => this.openMainMenu(player)));
        add("§l§d🎁 幸运抽奖\n§r§8按已安装内容动态生成奖池", "textures/ui/gift_square", () => LotteryManager.openLotteryMainUI(player, () => this.openMainMenu(player)));
        add("§l§6🏪 玩家寄卖行\n§r§8自由定价交易，成交收取10%费率", "textures/ui/MCStore_Gold_large", () => MarketManager.openMainUI(player, () => this.openMainMenu(player)));
        if (lotmReady) {
            add("§l§5🔮 诡秘非凡秘典\n§r§8查看途径、序列与能力", "textures/items/potion_seer", () => Integration.send(player, "lotm:open"));
        }
        add("§l§e🏆 财富排行\n§r§8查看服务器富豪排行榜", "textures/ui/achievements", () => EconomyManager.openLeaderboardUI(player, () => this.openMainMenu(player)));
        if (Utils.isAdmin(player)) {
            add("§l§c⚙️ 管理员控制台\n§r§8服务器与联动管理", "textures/ui/op", () => this.openAdminPanel(player, () => this.openMainMenu(player)));
        }
        add("§l§7✖ 关闭菜单", "textures/ui/cancel", () => {});

        Utils.showForm(player, form, (res) => actions[res.selection]?.());
    }

    static openAdminPanel(player, onBack = null) {
        if (!Utils.isAdmin(player)) return;
        const actions = [];
        const form = new ActionFormData()
            .title("§l§c⚙️ 服务器管理员控制台")
            .body(`§f在线玩家: §e${world.getAllPlayers().length}\n§7LOTM 联动: ${Integration.isLotmAvailable() ? "§a已连接" : "§8未连接"}\n§7日常事件联动: ${Integration.isDailyEventsAvailable() ? "§a已连接" : "§8未连接"}`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§b🧭 公共传送点管理", "textures/ui/World", () => TeleportManager.openAdminMenu(player, () => this.openAdminPanel(player, onBack)));
        add("§l§6🏰 主城与保护区管理", "textures/ui/village_hero_effect", () => RegionManager.openAdminMenu(player, () => this.openAdminPanel(player, onBack)));
        add("§l§e📋 管理与审计日志", "textures/ui/achievements", () => AuditManager.openAdminUI(player, () => this.openAdminPanel(player, onBack)));
        add("§l§d🎛 服务器运营管理", "textures/ui/op", () => OperationsManager.openAdminMenu(player, () => this.openAdminPanel(player, onBack)));
        add("§l§6💵 玩家金币管理", "textures/ui/Trade2", () => this.openPlayerMoneyAdmin(player, onBack));
        add("§l§4🗑️ 强制删除当前地皮", "textures/ui/trash", () => this.forceDeleteCurrentPlot(player, onBack));
        add("§l§e📢 发布全服公告", "textures/ui/accessibility_glyph_color", () => this.openBroadcastModal(player, onBack));
        add("§l§a🎁 全服发放福利金币", "textures/ui/gift_square", () => this.openGiftAllModal(player, onBack));
        add("§l§d🎰 自定义奖池与保底", "textures/ui/gift_square", () => LotteryManager.openAdminPoolManager(player, () => this.openAdminPanel(player, onBack)));
        if (Integration.isLotmAvailable()) {
            add("§l§5🔮 LOTM 调试控制台", "textures/items/potion_magician", () => Integration.send(player, "lotm:admin"));
        }
        if (Integration.isDailyEventsAvailable()) {
            add("§l§6📋 日常与事件管理", "textures/ui/achievements", () => Integration.send(player, "daily:admin"));
        }
        add("§l§7⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, (res) => actions[res.selection]?.());
    }

    static openPlayerMoneyAdmin(player, onBack = null) {
        const players = world.getAllPlayers();
        const form = new ModalFormData()
            .title("§l§6💵 玩家金币调控")
            .dropdown("选择玩家", players.map(p => p.name))
            .dropdown("操作", ["增加", "扣除", "设定"])
            .textField("金额", "1000");
        Utils.showForm(player, form, (res) => {
            if (res.canceled) return onBack?.();
            const [playerIndex, operation, rawAmount] = res.formValues;
            const target = players[playerIndex];
            const amount = Math.floor(Number(rawAmount));
            if (!Utils.isValid(target) || !Number.isFinite(amount) || amount < 0) {
                Utils.tell(player, "§c玩家或金额无效。");
            } else {
                if (operation === 0) EconomyManager.addBalance(target, amount);
                else if (operation === 1) EconomyManager.removeBalance(target, amount);
                else EconomyManager.setBalance(target, amount);
                AuditManager.log("admin_money", player, target.name, `${["增加", "扣除", "设定"][operation]} ${amount}`);
            }
            onBack?.();
        });
    }

    static forceDeleteCurrentPlot(player, onBack = null) {
        const { chunkX, chunkZ } = Utils.getChunkCoords(player.location);
        const dimension = player.dimension.id;
        const plot = LandManager.getPlot(dimension, chunkX, chunkZ);
        if (!plot) {
            Utils.tell(player, "§7当前区块没有地皮。");
            return onBack?.();
        }
        const form = new MessageFormData().title("§l§4确认删除地皮").body(`§f${plot.name}\n§7[${chunkX}, ${chunkZ}]`).button1("§4删除").button2("§7取消");
        Utils.showForm(player, form, (res) => {
            if (res.selection === 0) {
                LandManager.deletePlot(dimension, chunkX, chunkZ);
                AuditManager.log("admin_plot_delete", player, plot.ownerName, `${dimension} [${chunkX},${chunkZ}] ${plot.name}`);
            }
            onBack?.();
        });
    }

    static openBroadcastModal(player, onBack = null) {
        const form = new ModalFormData().title("§l§e📢 发布公告").textField("内容", "服务器公告");
        Utils.showForm(player, form, (res) => {
            const content = res.formValues?.[0]?.trim();
            if (content) {
                Utils.broadcast(`§e[管理员 ${player.name}] §f${content}`);
                AuditManager.log("admin_broadcast", player, "all", content);
            }
            onBack?.();
        });
    }

    static openGiftAllModal(player, onBack = null) {
        const form = new ModalFormData().title("§l§a🎁 全服福利").textField("每人金币", "1000");
        Utils.showForm(player, form, (res) => {
            const amount = Math.floor(Number(res.formValues?.[0]));
            if (Number.isFinite(amount) && amount > 0) {
                for (const target of world.getAllPlayers()) EconomyManager.addBalance(target, amount);
                Utils.broadcast(`§a管理员发放了每人 ${Utils.formatCurrency(amount)} 的福利。`);
                AuditManager.log("admin_gift", player, "all", `每人 ${amount}，在线 ${world.getAllPlayers().length} 人`);
            }
            onBack?.();
        });
    }
}
