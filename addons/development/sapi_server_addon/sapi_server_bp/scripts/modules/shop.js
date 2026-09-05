import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { Integration } from "./integration.js";
import { WantedManager } from "./wanted.js";

/**
 * 商店系统管理器
 * 支持分类浏览、批量购买与出售回收
 */
export class ShopManager {
    static dailyStateKey = "sapi:shop:daily:v1";

    static dayKey() {
        const offset = Number(Config.operations.timezoneOffsetMinutes || 0) * 60000;
        return new Date(Date.now() + offset).toISOString().slice(0, 10);
    }

    static getDailyState(player) {
        try {
            const parsed = JSON.parse(player.getDynamicProperty(this.dailyStateKey) || "{}");
            if (parsed.dayKey === this.dayKey()) {
                parsed.vanillaSoldCoins = Math.max(0, Number(parsed.vanillaSoldCoins || 0));
                if (!parsed.purchases || typeof parsed.purchases !== "object") parsed.purchases = {};
                return parsed;
            }
        } catch {}
        return { dayKey: this.dayKey(), vanillaSoldCoins: 0, purchases: {} };
    }

    static saveDailyState(player, state) {
        try { player.setDynamicProperty(this.dailyStateKey, JSON.stringify(state)); } catch {}
    }

    static getVisibleCategories() {
        return Config.shop.categories;
    }

    static openCategoryById(player, categoryId, onBack = null) {
        if (!WantedManager.requireOfficialTrade(player)) return onBack?.();
        const id = String(categoryId || "").trim().toLowerCase();
        if (!id || id === "all") return this.openShopCategoryUI(player, onBack);
        const category = this.getVisibleCategories().find(value => value.id === id);
        if (!category) {
            Utils.tell(player, `§c商店分类 ${id} 不存在或当前未启用。`);
            return this.openShopCategoryUI(player, onBack);
        }
        this.openCategoryUI(player, category, () => this.openShopCategoryUI(player, onBack));
    }

    static openCategoryUI(player, category, onBack = null) {
        if (Array.isArray(category.subcategories) && category.subcategories.length) {
            return this.openSubcategoryUI(player, category, onBack);
        }
        return this.openCategoryItemsUI(player, category, onBack);
    }

    static openSubcategoryUI(player, category, onBack = null) {
        const balance = EconomyManager.getBalance(player);
        const groups = category.subcategories || [];
        const form = new ActionFormData()
            .title(`§l${category.name} · 商品分类`)
            .body(`§8═════════════════════════\n§e当前资产: ${Utils.formatCurrency(balance)}\n§8请选择需要购买或回收的物资类别：`);
        for (const group of groups) form.button(`${group.name}\n§r§8${group.description}`, group.icon);
        form.button("§l§c🔙 返回商场\n§r§8选择其他商人", "textures/ui/cancel");
        Utils.showForm(player, form, res => {
            if (res.selection < groups.length) {
                const group = groups[res.selection];
                this.openCategoryItemsUI(player, group, () => this.openSubcategoryUI(player, category, onBack));
            } else if (onBack) onBack();
        });
    }

    /**
     * 打开商店分类主界面
     * @param {import("@minecraft/server").Player} player 
     * @param {Function} [onBack] 
     */
    static openShopCategoryUI(player, onBack = null) {
        if (!WantedManager.requireOfficialTrade(player)) return onBack?.();
        const balance = EconomyManager.getBalance(player);
        const daily = this.getDailyState(player);
        const form = new ActionFormData()
            .title("§l§6🛒 全球综合商店")
            .body(
                `§8═════════════════════════\n` +
                `§e当前资产: ${Utils.formatCurrency(balance)}\n` +
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
                this.openCategoryUI(player, selectedCat, () => this.openShopCategoryUI(player, onBack));
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
        const daily = this.getDailyState(player);
        const form = new ActionFormData()
            .title(`§l${category.name}`)
            .body(
                `§8═════════════════════════\n` +
                `§e当前资产: ${Utils.formatCurrency(balance)}\n` +
                `§8点击商品即可进入购买或出售界面\n` +
                `§8今日原版物资回收: §e${daily.vanillaSoldCoins}/${Config.shop.vanillaDailySellCap}\n` +
                `§8═════════════════════════`
            );

        const items = category.items;
        for (const item of items) {
            const bought = Number(daily.purchases?.[item.id] || 0);
            const limitText = item.dailyLimit ? ` §8(${bought}/${item.dailyLimit})` : "";
            const buyText = item.buyPrice ? `§a买: §e${item.buyPrice}${limitText}` : "§8不可买";
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
        if (!WantedManager.requireOfficialTrade(player)) return onBack?.();
        const balance = EconomyManager.getBalance(player);
        const bagCount = Utils.countItem(player, item.id);
        const daily = this.getDailyState(player);

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
            .dropdown(`§e你的金币: ${Utils.formatCurrency(balance)}\n§e背包库存: §b${bagCount} §e个\n\n§8请选择交易类型:`, tradeOptions)
            .slider("§e交易数量 (1 - 64):", 1, 64, 1);

        Utils.showForm(player, form, (res) => {
            if (res.canceled) {
                if (onBack) onBack();
                return;
            }

            const [typeIndex, quantity] = res.formValues;
            const selectedText = tradeOptions[typeIndex];
            const isBuy = selectedText.includes("购买");

            let count = Math.floor(quantity);
            if (count <= 0) return;

            if (isBuy) {
                if (!WantedManager.requireOfficialTrade(player)) return;
                if (item.dailyLimit) {
                    const bought = Math.max(0, Number(daily.purchases[item.id] || 0));
                    const remaining = Math.max(0, Number(item.dailyLimit) - bought);
                    if (!remaining) {
                        Utils.tell(player, "§c该商品今日购买次数已经用完。");
                        Utils.sound.fail(player);
                        return;
                    }
                    count = Math.min(count, remaining);
                }
                // 执行购买
                const totalCost = (item.buyPrice || 0) * count;
                if (!EconomyManager.hasBalance(player, totalCost)) {
                    Utils.tell(player, `§c购买失败！你需要 ${Utils.formatCurrency(totalCost)}，但只有 ${Utils.formatCurrency(balance)}。`);
                    Utils.sound.fail(player);
                    return;
                }

                const amount = count * Math.max(1, Number(item.bundleAmount || 1));
                if (!Utils.giveItem(player, item.id, amount)) {
                    Utils.tell(player, "§c物品发放失败，未扣除金币。请确认相关 Addon 已启用。");
                    Utils.sound.fail(player);
                    return;
                }
                EconomyManager.removeBalance(player, totalCost);
                if (item.dailyLimit) {
                    daily.purchases[item.id] = Math.max(0, Number(daily.purchases[item.id] || 0)) + count;
                    this.saveDailyState(player, daily);
                }
                Utils.tell(player, `§a成功购买 §e${item.name} §ax${count}，获得物品 ${amount} 个，花费 ${Utils.formatCurrency(totalCost)}！`);
                Utils.sound.buy(player);
            } else {
                if (!WantedManager.requireOfficialTrade(player)) return;
                if (item.sellGroup === "vanilla") {
                    const cap = Math.max(0, Number(Config.shop.vanillaDailySellCap || 0));
                    const remainingCoins = Math.max(0, cap - Number(daily.vanillaSoldCoins || 0));
                    const maxCount = Math.floor(remainingCoins / Math.max(1, Number(item.sellPrice || 0)));
                    if (maxCount <= 0) {
                        Utils.tell(player, `§e今日原版物资回收额度 ${cap} 金币已用完；NPC 不会收走你的物品。`);
                        return;
                    }
                    if (count > maxCount) {
                        count = maxCount;
                        Utils.tell(player, `§e受今日回收额度限制，本次自动调整为出售 ${count} 个。`);
                    }
                }
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
                if (item.sellGroup === "vanilla") {
                    daily.vanillaSoldCoins = Number(daily.vanillaSoldCoins || 0) + totalEarn;
                    this.saveDailyState(player, daily);
                }
                Integration.recordDailySale(player.name, totalEarn);
                Utils.tell(player, `§a成功出售 §e${item.name} §ax${count}，获得 ${Utils.formatCurrency(totalEarn)}！`);
                Utils.sound.success(player);
            }

            // 交易完成后刷新
            if (onBack) onBack();
        });
    }
}
