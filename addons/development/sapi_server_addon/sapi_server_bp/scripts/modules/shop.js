import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { Integration } from "./integration.js";
import { WantedManager } from "./wanted.js";

/**
 * 商店系统管理器
 * 支持分类浏览、批量购买、单项出售与全背包一键回收
 */
export class ShopManager {
	static dailyStateKey = "sapi:shop:daily:v1";

	// Navigation items must never be consumed by official NPC recycling,
	// even if an old/custom merchant configuration still gives them a price.
	static canRecycle(item) {
		const id = item?.id;
		return !!id && !["minecraft:compass", "sapi:menu_compass",
			Config.system?.menuItem, Config.system?.fallbackMenuItem].includes(id)
			&& Number.isFinite(Number(item.sellPrice)) && Number(item.sellPrice) > 0;
	}

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

	/**
	 * 获取指定分类或全部配置中的所有可出售物资
	 * @param {object|Array} [categoryOrItems]
	 * @returns {Array<object>}
	 */
	static getAllSellableItems(categoryOrItems = null) {
		const sellable = [];
		const collect = (list) => {
			if (!Array.isArray(list)) return;
			for (const item of list) {
				if (this.canRecycle(item)) {
					sellable.push(item);
				}
			}
		};

		if (categoryOrItems) {
			if (Array.isArray(categoryOrItems)) {
				collect(categoryOrItems);
			} else if (categoryOrItems.items) {
				collect(categoryOrItems.items);
			} else if (categoryOrItems.subcategories) {
				for (const sub of categoryOrItems.subcategories) {
					collect(sub.items);
				}
			}
		} else {
			for (const cat of this.getVisibleCategories()) {
				if (cat.items) collect(cat.items);
				if (cat.subcategories) {
					for (const sub of cat.subcategories) {
						collect(sub.items);
					}
				}
			}
		}
		return sellable;
	}

	/**
	 * 构建可出售物资映射表 (以最高售价为准去重)
	 * @param {object|Array} [categoryOrItems]
	 * @returns {Map<string, object>}
	 */
	static getSellableMap(categoryOrItems = null) {
		const items = this.getAllSellableItems(categoryOrItems);
		const map = new Map();
		for (const item of items) {
			const existing = map.get(item.id);
			if (!existing || Number(item.sellPrice || 0) > Number(existing.sellPrice || 0)) {
				map.set(item.id, item);
			}
		}
		return map;
	}

	/**
	 * 扫描玩家背包中所有可回收物资
	 * @param {import("@minecraft/server").Player} player
	 * @param {Map<string, object>} sellableMap
	 * @returns {Array<{ def: object, totalAmount: number }>}
	 */
	static scanPlayerRecyclables(player, sellableMap) {
		const inventory = player.getComponent("inventory");
		if (!inventory || !inventory.container) return [];

		const container = inventory.container;
		const foundMap = new Map();

		for (let i = 0; i < container.size; i++) {
			const item = container.getItem(i);
			if (!item) continue;
			const def = sellableMap.get(item.typeId);
			if (!def || !this.canRecycle(def) || def.id !== item.typeId) continue;

			const entry = foundMap.get(item.typeId);
			if (entry) {
				entry.totalAmount += item.amount;
			} else {
				foundMap.set(item.typeId, {
					def: def,
					totalAmount: item.amount
				});
			}
		}

		return Array.from(foundMap.values());
	}

	/**
	 * 打开一键回收确认界面
	 * @param {import("@minecraft/server").Player} player 
	 * @param {object|Array} [categoryOrItems] 
	 * @param {Function} [onBack] 
	 */
	static openRecycleConfirmUI(player, categoryOrItems = null, onBack = null) {
		if (!WantedManager.requireOfficialTrade(player)) return onBack?.();

		const sellableMap = this.getSellableMap(categoryOrItems);
		if (sellableMap.size === 0) {
			Utils.tell(player, "§c当前分类未配置任何可回收物资！");
			Utils.sound.fail(player);
			return onBack?.();
		}

		const scanned = this.scanPlayerRecyclables(player, sellableMap);
		if (scanned.length === 0) {
			Utils.tell(player, "§e背包中暂无可回收的有效物资。");
			Utils.sound.fail(player);
			return onBack?.();
		}

		// 高单价物资优先变现，避免低价物资占满今日原版额度
		scanned.sort((a, b) => Number(b.def.sellPrice || 0) - Number(a.def.sellPrice || 0));

		const daily = this.getDailyState(player);
		const cap = Math.max(0, Number(Config.shop.vanillaDailySellCap || 0));
		let remainingVanillaCap = Math.max(0, cap - Number(daily.vanillaSoldCoins || 0));

		let totalCoins = 0;
		let totalCount = 0;
		let vanillaEarn = 0;
		let heldBackVanillaCount = 0;

		const previewLines = [];

		for (const entry of scanned) {
			let countToSell = entry.totalAmount;
			if (entry.def.sellGroup === "vanilla") {
				if (remainingVanillaCap <= 0) {
					countToSell = 0;
				} else {
					const unitPrice = Math.max(1, Number(entry.def.sellPrice || 0));
					const maxAffordable = Math.floor(remainingVanillaCap / unitPrice);
					countToSell = Math.min(countToSell, maxAffordable);
				}
			}

			entry.sellAmount = countToSell;
			const earned = countToSell * Number(entry.def.sellPrice || 0);
			entry.earnedCoins = earned;

			if (entry.def.sellGroup === "vanilla") {
				vanillaEarn += earned;
				remainingVanillaCap = Math.max(0, remainingVanillaCap - earned);
				if (countToSell < entry.totalAmount) {
					heldBackVanillaCount += (entry.totalAmount - countToSell);
				}
			}

			if (countToSell > 0) {
				totalCoins += earned;
				totalCount += countToSell;
				previewLines.push(`§f• §e${entry.def.name} §f×${countToSell} §6(单价: ${entry.def.sellPrice} -> 共 ${Utils.formatCurrency(earned)})`);
			} else {
				previewLines.push(`§c• §f${entry.def.name} §c×${entry.totalAmount} (原版回收额度已满，保留)`);
			}
		}

		if (totalCount === 0) {
			Utils.tell(player, `§e背包中存在原版物资，但今日原版回收额度 (${cap} 金币) 已达到上限，暂无法回收。`);
			Utils.sound.fail(player);
			return onBack?.();
		}

		let body = `§6═════════════════════════\n` +
		           `§e共扫描到 §b${scanned.length} §e种可回收物资，本次可出售 §b${totalCount} §e件：\n\n` +
		           previewLines.slice(0, 12).join("\n");
		if (previewLines.length > 12) {
			body += `\n§f...以及其余 ${previewLines.length - 12} 种物资`;
		}
		body += `\n\n§6═════════════════════════\n` +
		        `§e预计回收总收益: §6${Utils.formatCurrency(totalCoins)}\n` +
		        `§e今日原版回收: §6${daily.vanillaSoldCoins + vanillaEarn} / ${cap} 金币\n`;
		if (heldBackVanillaCount > 0) {
			body += `§c提示: 因回收限额，有 ${heldBackVanillaCount} 件原版物资将被妥善保留在背包中。\n`;
		}
		body += `§6═════════════════════════\n` +
		        `§f请确认是否立即回收？`;

		const form = new ActionFormData()
			.title("§l§6一键回收确认")
			.body(body)
			.button("§l§a确认回收全部\n§r§f立即清空并变现金币", "textures/ui/MCStore_Gold_large")
			.button("§l§c取消\n§r§f返回上一级界面", "textures/ui/cancel");

		Utils.showForm(player, form, (res) => {
			if (res.canceled || res.selection !== 0) {
				return onBack?.();
			}

			if (!WantedManager.requireOfficialTrade(player)) return;

			// 再次核实并执行背包扣除与收益结算
			const currentDaily = this.getDailyState(player);
			let currentRemainingCap = Math.max(0, cap - Number(currentDaily.vanillaSoldCoins || 0));

			let actualSoldTypes = 0;
			let actualSoldTotal = 0;
			let actualTotalEarn = 0;
			let actualVanillaEarn = 0;

			for (const entry of scanned) {
				if (entry.sellAmount <= 0 || !this.canRecycle(entry.def)) continue;
				const currentInBag = Utils.countItem(player, entry.def.id);
				if (currentInBag <= 0) continue;

				let qty = Math.min(entry.sellAmount, currentInBag);
				if (entry.def.sellGroup === "vanilla") {
					const unitP = Math.max(1, Number(entry.def.sellPrice || 0));
					const maxAffordable = Math.floor(currentRemainingCap / unitP);
					qty = Math.min(qty, maxAffordable);
					if (qty <= 0) continue;
				}

				const removed = Utils.removeItem(player, entry.def.id, qty);
				if (removed) {
					const earned = qty * Number(entry.def.sellPrice || 0);
					actualSoldTypes++;
					actualSoldTotal += qty;
					actualTotalEarn += earned;
					if (entry.def.sellGroup === "vanilla") {
						actualVanillaEarn += earned;
						currentRemainingCap = Math.max(0, currentRemainingCap - earned);
					}
				}
			}

			if (actualTotalEarn > 0) {
				EconomyManager.addBalance(player, actualTotalEarn);
				if (actualVanillaEarn > 0) {
					currentDaily.vanillaSoldCoins = Number(currentDaily.vanillaSoldCoins || 0) + actualVanillaEarn;
					this.saveDailyState(player, currentDaily);
				}
				Integration.recordDailySale(player.name, actualTotalEarn);
				Utils.sound.success(player);
				Utils.tell(player, `§a一键回收完成！成功出售 §b${actualSoldTypes} §a种物资共 §b${actualSoldTotal} §a件，获得 ${Utils.formatCurrency(actualTotalEarn)}§a！`);
				if (heldBackVanillaCount > 0) {
					Utils.tell(player, `§e部分原版物资受今日回收上限限制已保留在背包。`);
				}
			} else {
				Utils.tell(player, "§c未能回收任何物品，请检查背包物品是否发生变动。");
				Utils.sound.fail(player);
			}

			if (onBack) onBack();
		});
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
		const daily = this.getDailyState(player);
		const groups = category.subcategories || [];
		const form = new ActionFormData()
			.title(`§l${category.name} · 商品分类`)
			.body(
				`§6═════════════════════════\n` +
				`§e当前资产: ${Utils.formatCurrency(balance)}\n` +
				`§e今日原版物资回收: §6${daily.vanillaSoldCoins} / ${Config.shop.vanillaDailySellCap} 金币\n` +
				`§6═════════════════════════\n` +
				`§f请选择需要购买或回收的物资类别：`
			);

		// 一键回收当前商人/分类下所有物品
		form.button(`§l§e【一键回收】${category.name}相关物资\n§r§f一键出售背包中所有属于本分类的可回收物`, "textures/ui/MCStore_Gold_large");

		for (const group of groups) {
			form.button(`${group.name}\n§r§f${group.description}`, group.icon);
		}
		form.button("§l§c返回商场\n§r§f选择其他商人", "textures/ui/cancel");

		Utils.showForm(player, form, (res) => {
			if (res.canceled) return;
			if (res.selection === 0) {
				this.openRecycleConfirmUI(player, category, () => this.openSubcategoryUI(player, category, onBack));
				return;
			}
			const groupIndex = res.selection - 1;
			if (groupIndex < groups.length) {
				const group = groups[groupIndex];
				this.openCategoryItemsUI(player, group, () => this.openSubcategoryUI(player, category, onBack));
			} else if (onBack) {
				onBack();
			}
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
			.title("§l§6全球综合商店")
			.body(
				`§6═════════════════════════\n` +
				`§e当前资产: ${Utils.formatCurrency(balance)}\n` +
				`§e今日原版物资回收: §6${daily.vanillaSoldCoins} / ${Config.shop.vanillaDailySellCap} 金币\n` +
				`§6═════════════════════════\n` +
				`§f请选择你要浏览的商品分类，或使用一键回收：`
			);

		// 置顶一键回收全背包物资按钮
		form.button("§l§e【一键回收】全背包可售物资\n§r§f扫描全背包可回收物并一键变现金币", "textures/ui/MCStore_Gold_large");

		const categories = this.getVisibleCategories();
		for (const cat of categories) {
			form.button(`${cat.name}\n§r§f${cat.description}`, cat.icon);
		}

		if (onBack) {
			form.button("§l§c返回上级\n§r§f返回主菜单", "textures/ui/cancel");
		}

		Utils.showForm(player, form, (res) => {
			if (res.canceled) return;
			if (res.selection === 0) {
				this.openRecycleConfirmUI(player, null, () => this.openShopCategoryUI(player, onBack));
				return;
			}
			const catIndex = res.selection - 1;
			if (catIndex < categories.length) {
				const selectedCat = categories[catIndex];
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
				`§6═════════════════════════\n` +
				`§e当前资产: ${Utils.formatCurrency(balance)}\n` +
				`§f点击商品即可进入购买或出售界面\n` +
				`§e今日原版物资回收: §6${daily.vanillaSoldCoins} / ${Config.shop.vanillaDailySellCap} 金币\n` +
				`§6═════════════════════════`
			);

		// 置顶一键回收当前专区物资按钮
		form.button("§l§e【一键回收】当前专区物资\n§r§f一键出售背包中属于当前专区的可回收物", "textures/ui/MCStore_Gold_large");

		const items = category.items;
		for (const item of items) {
			const bought = Number(daily.purchases?.[item.id] || 0);
			const limitText = item.dailyLimit ? ` §6(${bought}/${item.dailyLimit})` : "";
			const buyText = item.buyPrice ? `§a买: §e${item.buyPrice}${limitText}` : "§c不可买";
			const sellText = this.canRecycle(item) ? `§c卖: §e${item.sellPrice}` : "§c不可卖";
			form.button(`${item.name}\n${buyText} §6| ${sellText}`, item.icon);
		}

		form.button("§l§c返回分类\n§r§f选择其他商品专区", "textures/ui/cancel");

		Utils.showForm(player, form, (res) => {
			if (res.canceled) return;
			if (res.selection === 0) {
				this.openRecycleConfirmUI(player, items, () => this.openCategoryItemsUI(player, category, onBack));
				return;
			}
			const itemIndex = res.selection - 1;
			if (itemIndex < items.length) {
				const item = items[itemIndex];
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
		if (this.canRecycle(item)) tradeOptions.push(`§c出售 (单价: ${item.sellPrice} 金币)`);

		if (tradeOptions.length === 0) {
			Utils.tell(player, "§c此物品暂不支持交易！");
			if (onBack) onBack();
			return;
		}

		const form = new ModalFormData()
			.title(`§l交易: ${item.name}`)
			.dropdown(`§e你的金币: ${Utils.formatCurrency(balance)}\n§e背包库存: §b${bagCount} §e个\n\n§f请选择交易类型:`, tradeOptions)
			.slider("§e交易数量 (1 - 64):", 1, 64, 1);

		Utils.showForm(player, form, (res) => {
			if (res.canceled) {
				if (onBack) onBack();
				return;
			}

			const [typeIndex, quantity] = res.formValues;
			const selectedText = tradeOptions[typeIndex];
			if (typeof selectedText !== "string") return;
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
				if (!this.canRecycle(item)) return;
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
