import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { Integration } from "./integration.js";

/**
 * 商店系统管理器
 * 支持分类浏览、批量购买与出售回收
 */
export class ShopManager {
    static getVisibleCategories() {
        return Config.shop.categories.filter(category =>
            !["lotm", "sealed_artifacts"].includes(category.id) || Integration.isLotmAvailable()
        );
    }

    static openCategoryById(player, categoryId, onBack = null) {
        const id = String(categoryId || "").trim().toLowerCase();
        if (!id || id === "all") return this.openShopCategoryUI(player, onBack);
        const category = this.getVisibleCategories().find(value => value.id === id);
        if (!category) {
            Utils.tell(player, `§c商店分类 ${id} 不存在或当前未启用。`);
            return this.openShopCategoryUI(player, onBack);
        }
        this.openCategoryItemsUI(player, category, () => this.openShopCategoryUI(player, onBack));
    }

    /**
     * 打开商店分类主界面
     * @param {import("@minecraft/server").Player} player 
     * @param {Function} [onBack] 
     */
    static openShopCategoryUI(player, onBack = null) {
        const balance = EconomyManager.getBalance(player);
        const form = new ActionFormData()
            .title("§l§6🛒 全球综合商店")
            .body(
                `§8═════════════════════════\n` +
                `§0当前资产: ${Utils.formatCurrency(balance)}\n` +
                `§8═════════════════════════\n` +
                `§8请选择你要浏览的商品分类：`
            );

        // 非凡商品由服务器经济包定价，但只有 LOTM 包在线时才展示，避免无效物品标识符。
        const categories = this.getVisibleCategories();
        for (const cat of categories) {
            form.button(`${cat.name}\n§r§8${cat.description}`, cat.icon);
        }

        if (onBack) {
            form.button("§l§c🔙 返回上级\n§r§8返回主菜单", "textures/ui/cancel");
        }

        Utils.showForm(player, form, (res) => {

            if (res.selection < categories.length) {
                const selectedCat = categories[res.selection];
                this.openCategoryItemsUI(player, selectedCat, () => this.openShopCategoryUI(player, onBack));
            } else if (onBack) {
                onBack();
            }
        });
    }

    /**
     * 打开特定分类下的商品列表
     * @param {import("@minecraft/server").Player} player 
     * @param {object} category 
     * @param {Function} [onBack] 
     */
    static openCategoryItemsUI(player, category, onBack = null) {
        const balance = EconomyManager.getBalance(player);
        const form = new ActionFormData()
            .title(`§l${category.name}`)
            .body(
                `§8═════════════════════════\n` +
                `§0当前资产: ${Utils.formatCurrency(balance)}\n` +
                `§8点击商品即可进入购买或出售界面\n` +
                `§8═════════════════════════`
            );

        const items = category.items;
        for (const item of items) {
            const buyText = item.buyPrice ? `§a买: §e${item.buyPrice}` : "§8不可买";
            const sellText = item.sellPrice ? `§c卖: §e${item.sellPrice}` : "§8不可卖";
            form.button(`${item.name}\n${buyText} §8| ${sellText}`, item.icon);
        }

        form.button("§l§c🔙 返回分类\n§r§8选择其他商品专区", "textures/ui/cancel");

        Utils.showForm(player, form, (res) => {

            if (res.selection < items.length) {
                const item = items[res.selection];
                this.openItemTradeUI(player, item, () => this.openCategoryItemsUI(player, category, onBack));
            } else if (onBack) {
                onBack();
            }
        });
    }

    /**
     * 打开单个商品的买卖交互弹窗
     * @param {import("@minecraft/server").Player} player 
     * @param {object} item 
     * @param {Function} [onBack] 
     */
    static openItemTradeUI(player, item, onBack = null) {
        if (item.id.startsWith("lotm:") && !Integration.isLotmAvailable()) {
            Utils.tell(player, "§cLOTM Pathways 当前未连接，非凡商品交易已暂停。");
            if (onBack) onBack();
            return;
        }
        const balance = EconomyManager.getBalance(player);
        const bagCount = Utils.countItem(player, item.id);

        const tradeOptions = [];
        if (item.buyPrice) tradeOptions.push(`§a购买 (单价: ${item.buyPrice} 金币)`);
        if (item.sellPrice) tradeOptions.push(`§c出售 (单价: ${item.sellPrice} 金币)`);

        if (tradeOptions.length === 0) {
            Utils.tell(player, "§c此物品暂不支持交易！");
            if (onBack) onBack();
            return;
        }

        const form = new ModalFormData()
            .title(`§l交易: ${item.name}`)
            .dropdown(`§0你的金币: ${Utils.formatCurrency(balance)}\n§0背包库存: §b${bagCount} §0个\n\n§8请选择交易类型:`, tradeOptions)
            .slider("§0交易数量 (1 - 64):", 1, 64, 1);

        Utils.showForm(player, form, (res) => {
            if (res.canceled) {
                if (onBack) onBack();
                return;
            }

            const [typeIndex, quantity] = res.formValues;
            const selectedText = tradeOptions[typeIndex];
            const isBuy = selectedText.includes("购买");

            const count = Math.floor(quantity);
            if (count <= 0) return;

            if (isBuy) {
                // 执行购买
                const totalCost = (item.buyPrice || 0) * count;
                if (!EconomyManager.hasBalance(player, totalCost)) {
                    Utils.tell(player, `§c购买失败！你需要 ${Utils.formatCurrency(totalCost)}，但只有 ${Utils.formatCurrency(balance)}。`);
                    Utils.sound.fail(player);
                    return;
                }

                EconomyManager.removeBalance(player, totalCost);
                Utils.giveItem(player, item.id, count);
                Utils.tell(player, `§a成功购买 §e${item.name} §ax${count}，花费 ${Utils.formatCurrency(totalCost)}！`);
                Utils.sound.buy(player);
            } else {
                // 执行出售
                const actualInBag = Utils.countItem(player, item.id);
                if (actualInBag < count) {
                    Utils.tell(player, `§c出售失败！你背包中只有 §e${actualInBag} §c个 ${item.name}，不足以出售 §e${count} §c个。`);
                    Utils.sound.fail(player);
                    return;
                }

                const totalEarn = (item.sellPrice || 0) * count;
                const removed = Utils.removeItem(player, item.id, count);
                if (!removed) {
                    Utils.tell(player, "§c扣除背包物品失败，请重试！");
                    Utils.sound.fail(player);
                    return;
                }

                EconomyManager.addBalance(player, totalEarn);
                Integration.recordDailySale(player.name, totalEarn);
                Utils.tell(player, `§a成功出售 §e${item.name} §ax${count}，获得 ${Utils.formatCurrency(totalEarn)}！`);
                Utils.sound.success(player);
            }

            // 交易完成后刷新
            if (onBack) onBack();
        });
    }
}
