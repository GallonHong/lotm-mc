import { world, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { Integration } from "./integration.js";

const INDEX_KEY = "sapi:market:index:v1";
const LISTING_PREFIX = "sapi_market_listing_";
const PAYOUT_PREFIX = "sapi_market_payout_";

/** 玩家寄卖行：物品先从背包扣除并写入世界托管，成交后收取 10% 手续费。 */
export class MarketManager {
    static get feeRate() {
        return Number(Config.market?.feeRate ?? 0.1);
    }

    static getIndex() {
        try {
            const raw = world.getDynamicProperty(INDEX_KEY);
            const ids = typeof raw === "string" ? JSON.parse(raw) : [];
            return Array.isArray(ids) ? ids.filter(id => typeof id === "string") : [];
        } catch {
            return [];
        }
    }

    static saveIndex(ids) {
        world.setDynamicProperty(INDEX_KEY, JSON.stringify([...new Set(ids)].slice(0, Config.market?.maxListings ?? 200)));
    }

    static listingKey(id) {
        return `${LISTING_PREFIX}${id}`;
    }

    static getListing(id) {
        try {
            const raw = world.getDynamicProperty(this.listingKey(id));
            if (typeof raw !== "string") return null;
            const listing = JSON.parse(raw);
            return listing?.id === id ? listing : null;
        } catch {
            return null;
        }
    }

    static saveListing(listing) {
        world.setDynamicProperty(this.listingKey(listing.id), JSON.stringify(listing));
    }

    static deleteListing(id) {
        try { world.setDynamicProperty(this.listingKey(id), undefined); } catch {}
        this.saveIndex(this.getIndex().filter(listingId => listingId !== id));
    }

    static getListings() {
        const valid = [];
        const staleIds = [];
        for (const id of this.getIndex()) {
            const listing = this.getListing(id);
            if (listing && listing.amount > 0) valid.push(listing);
            else staleIds.push(id);
        }
        if (staleIds.length) this.saveIndex(valid.map(listing => listing.id));
        return valid.sort((a, b) => b.createdAt - a.createdAt);
    }

    static makeId() {
        return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    static hashName(name) {
        let hash = 2166136261;
        for (const char of String(name).toLowerCase()) {
            hash ^= char.charCodeAt(0);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    static payoutKey(playerName) {
        return `${PAYOUT_PREFIX}${this.hashName(playerName)}`;
    }

    static getPendingPayout(playerName) {
        try {
            const raw = world.getDynamicProperty(this.payoutKey(playerName));
            if (typeof raw !== "string") return 0;
            const data = JSON.parse(raw);
            return data?.sellerName === playerName ? Math.max(0, Math.floor(data.amount || 0)) : 0;
        } catch {
            return 0;
        }
    }

    static queuePayout(playerName, amount) {
        const value = Math.max(0, Math.floor(amount));
        if (!value) return;
        const next = this.getPendingPayout(playerName) + value;
        world.setDynamicProperty(this.payoutKey(playerName), JSON.stringify({ sellerName: playerName, amount: next }));
    }

    static claimPendingPayout(player, notify = true) {
        const amount = this.getPendingPayout(player.name);
        if (!amount) return 0;
        EconomyManager.addBalance(player, amount);
        world.setDynamicProperty(this.payoutKey(player.name), undefined);
        if (notify) {
            Utils.tell(player, `§a寄卖行离线成交款已到账：${Utils.formatCurrency(amount)} §8（已扣除10%手续费）。`);
            Utils.sound.success(player);
        }
        return amount;
    }

    static getDisplayName(itemOrListing) {
        return itemOrListing.listingName || itemOrListing.nameTag || itemOrListing.displayName || itemOrListing.typeId;
    }

    static getOriginalDisplayName(itemOrListing) {
        return itemOrListing.nameTag || itemOrListing.displayName || itemOrListing.typeId;
    }

    static sanitizeListingName(value) {
        const maxLength = Math.max(1, Math.floor(Config.market?.maxListingNameLength ?? 32));
        const cleaned = String(value ?? "")
            .replace(/§./g, "")
            .replace(/[\u0000-\u001f\u007f]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return [...cleaned].slice(0, maxLength).join("");
    }

    static isItemAvailable(typeId) {
        try {
            new ItemStack(typeId, 1);
            return true;
        } catch {
            return false;
        }
    }

    static getUnsafeReason(item) {
        try {
            if ((item.getDynamicPropertyIds?.() || []).length > 0) return "带自定义动态数据的物品暂不支持寄卖";
        } catch {}
        try {
            if ((item.getCanDestroy?.() || []).length > 0 || (item.getCanPlaceOn?.() || []).length > 0) {
                return "带冒险模式放置或破坏规则的物品暂不支持寄卖";
            }
        } catch {}
        try {
            const durability = item.getComponent("minecraft:durability") || item.getComponent("durability");
            const damage = Math.max(0, Number(durability?.damage || 0));
            if (durability && (!Number.isFinite(damage) || damage > 0)) {
                return "该武器已有耐久损耗；仅允许上架耐久未损耗、尚未使用的武器";
            }
        } catch {}
        try {
            const enchantable = item.getComponent("minecraft:enchantable") || item.getComponent("enchantable");
            const enchantments = enchantable?.getEnchantments?.() || [];
            if (enchantments.length > 0) return "附魔物品暂不支持寄卖，以免损失附魔数据";
        } catch {}
        return null;
    }

    static snapshotItem(item) {
        let lore = [];
        try { lore = item.getLore?.() || []; } catch {}
        return {
            typeId: item.typeId,
            nameTag: String(item.nameTag || "").slice(0, 120),
            lore: lore.slice(0, 20).map(line => String(line).slice(0, 240)),
            pristineDurability: (() => {
                try {
                    const durability = item.getComponent("minecraft:durability") || item.getComponent("durability");
                    return Boolean(durability) && Number(durability.damage || 0) === 0;
                } catch {
                    return false;
                }
            })(),
        };
    }

    static giveListingItem(player, listing, amount) {
        return Utils.giveItem(player, listing.typeId, amount, listing.nameTag || null, listing.lore || null);
    }

    static removeFromSlot(player, slot, amount, expectedTypeId) {
        try {
            const container = player.getComponent("inventory")?.container;
            const item = container?.getItem(slot);
            if (!container || !item || item.typeId !== expectedTypeId || item.amount < amount) return false;
            if (item.amount === amount) container.setItem(slot, undefined);
            else {
                item.amount -= amount;
                container.setItem(slot, item);
            }
            return true;
        } catch {
            return false;
        }
    }

    static openMainUI(player, onBack = null) {
        this.claimPendingPayout(player, true);
        const listings = this.getListings();
        const mine = listings.filter(listing => listing.sellerName === player.name).length;
        const form = new ActionFormData()
            .title("§l§6🏪 玩家交易寄卖行")
            .body(
                `§0在售商品: §e${listings.length}\n` +
                `§0我的寄卖: §b${mine} §8/ ${Config.market?.maxListingsPerPlayer ?? 10}\n` +
                `§0成交手续费: §c${Math.round(this.feeRate * 100)}%\n` +
                `§8卖家实收成交价的 ${Math.round((1 - this.feeRate) * 100)}%，离线成交款上线自动到账。`
            )
            .button("§l§a🛒 浏览寄卖商品\n§r§8购买其他玩家上架的物品", "textures/ui/MCStore_Gold_large")
            .button("§l§e📦 上架背包物品\n§r§8选择物品、数量与单价", "textures/items/chest_minecart")
            .button("§l§b📋 我的寄卖\n§r§8查看或撤回尚未售出的商品", "textures/items/book_writable");
        if (onBack) form.button("§l§8⬅ 返回服务器菜单", "textures/ui/undo");
        Utils.showForm(player, form, (res) => {
            if (res.selection === 0) this.openBrowseUI(player, () => this.openMainUI(player, onBack));
            else if (res.selection === 1) this.openCreateListingUI(player, () => this.openMainUI(player, onBack));
            else if (res.selection === 2) this.openMyListingsUI(player, () => this.openMainUI(player, onBack));
            else if (res.selection === 3) onBack?.();
        });
    }

    static openCreateListingUI(player, onBack = null) {
        const myCount = this.getListings().filter(listing => listing.sellerName === player.name).length;
        if (myCount >= (Config.market?.maxListingsPerPlayer ?? 10)) {
            Utils.tell(player, "§c你的寄卖数量已达上限，请先撤回或等待成交。");
            return onBack?.();
        }
        if (this.getIndex().length >= (Config.market?.maxListings ?? 200)) {
            Utils.tell(player, "§c寄卖行已达到全服容量上限。");
            return onBack?.();
        }

        const container = player.getComponent("inventory")?.container;
        if (!container) return onBack?.();
        const entries = [];
        for (let slot = 0; slot < container.size; slot++) {
            const item = container.getItem(slot);
            if (item) entries.push({ slot, item });
        }
        if (!entries.length) {
            Utils.tell(player, "§8背包中没有可上架物品。");
            return onBack?.();
        }

        const form = new ModalFormData()
            .title("§l§e📦 上架寄卖商品")
            .dropdown("选择背包物品", entries.map(({ slot, item }) => `槽位${slot + 1} | ${this.getDisplayName(item)} x${item.amount}`))
            .textField(`寄卖名称（可选，最多 ${Config.market?.maxListingNameLength ?? 32} 字）`, "例如：新手满耐久步枪")
            .slider("上架数量", 1, 64, 1)
            .textField("每件单价（金币）", "例如：100");
        Utils.showForm(player, form, (res) => {
            if (res.canceled) return onBack?.();
            const [entryIndex, rawListingName, rawAmount, rawPrice] = res.formValues;
            const entry = entries[entryIndex];
            if (!entry) {
                Utils.tell(player, "§c物品选择无效。");
                return onBack?.();
            }
            const latest = container.getItem(entry.slot);
            const listingName = this.sanitizeListingName(rawListingName);
            const amount = Math.floor(Number(rawAmount));
            const unitPrice = Math.floor(Number(rawPrice));
            if (!entry || !latest || latest.typeId !== entry.item.typeId) {
                Utils.tell(player, "§c背包物品已经变化，请重新选择。");
                return onBack?.();
            }
            const unsafeReason = this.getUnsafeReason(latest);
            if (unsafeReason) {
                Utils.tell(player, `§c无法上架：${unsafeReason}。`);
                return onBack?.();
            }
            if (!Number.isFinite(amount) || amount < 1 || amount > latest.amount || amount > 64) {
                Utils.tell(player, "§c上架数量无效或超过该槽位数量。");
                return onBack?.();
            }
            const maxPrice = Config.market?.maxUnitPrice ?? 100000000;
            if (!Number.isFinite(unitPrice) || unitPrice < 1 || unitPrice > maxPrice) {
                Utils.tell(player, `§c单价必须在 1–${maxPrice} 金币之间。`);
                return onBack?.();
            }
            const latestListings = this.getListings();
            if (
                latestListings.length >= (Config.market?.maxListings ?? 200) ||
                latestListings.filter(listing => listing.sellerName === player.name).length >= (Config.market?.maxListingsPerPlayer ?? 10)
            ) {
                Utils.tell(player, "§c寄卖容量刚刚达到上限，请稍后重试。");
                return onBack?.();
            }
            const snapshot = this.snapshotItem(latest);
            if (!this.removeFromSlot(player, entry.slot, amount, latest.typeId)) {
                Utils.tell(player, "§c物品托管失败，背包未发生变化。");
                return onBack?.();
            }
            const id = this.makeId();
            const listing = {
                id,
                sellerName: player.name,
                typeId: snapshot.typeId,
                nameTag: snapshot.nameTag,
                listingName,
                lore: snapshot.lore,
                pristineDurability: snapshot.pristineDurability,
                amount,
                unitPrice,
                createdAt: Date.now(),
            };
            try {
                this.saveListing(listing);
                this.saveIndex([id, ...this.getIndex()]);
                Utils.tell(player, `§a已上架 ${this.getDisplayName(listing)} x${amount}，单价 ${Utils.formatCurrency(unitPrice)}。`);
                Utils.sound.success(player);
            } catch (error) {
                this.giveListingItem(player, listing, amount);
                try { world.setDynamicProperty(this.listingKey(id), undefined); } catch {}
                Utils.tell(player, `§c寄卖数据保存失败，物品已退回：${error}`);
            }
            onBack?.();
        });
    }

    static openBrowseUI(player, onBack = null, page = 0) {
        const listings = this.getListings().filter(listing => listing.sellerName !== player.name && this.isItemAvailable(listing.typeId));
        const pageSize = 20;
        const pageCount = Math.max(1, Math.ceil(listings.length / pageSize));
        const currentPage = Math.max(0, Math.min(page, pageCount - 1));
        const pageItems = listings.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
        const actions = [];
        const form = new ActionFormData()
            .title(`§l§6🏪 寄卖商品 ${currentPage + 1}/${pageCount}`)
            .body(pageItems.length ? "§8选择商品查看并购买。成交后系统扣除卖家10%手续费。" : "§8当前没有其他玩家的寄卖商品。");
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        for (const listing of pageItems) {
            const originalName = this.getOriginalDisplayName(listing);
            const customLabel = listing.listingName ? `§8实际: ${originalName} | ` : "";
            add(
                `§0${this.getDisplayName(listing)} x${listing.amount}\n${customLabel}§e${listing.unitPrice}/件 §8| ${listing.sellerName}`,
                "textures/items/emerald",
                () => this.openBuyUI(player, listing.id, () => this.openBrowseUI(player, onBack, currentPage))
            );
        }
        if (currentPage > 0) add("§l§b⬅ 上一页", "textures/ui/undo", () => this.openBrowseUI(player, onBack, currentPage - 1));
        if (currentPage + 1 < pageCount) add("§l§b下一页 ➡", "textures/ui/refresh", () => this.openBrowseUI(player, onBack, currentPage + 1));
        add("§l§8⬅ 返回寄卖行", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, (res) => actions[res.selection]?.());
    }

    static openBuyUI(player, listingId, onBack = null) {
        const listing = this.getListing(listingId);
        if (!listing || listing.amount < 1) {
            Utils.tell(player, "§c该商品已售出或被撤回。");
            return onBack?.();
        }
        if (!this.isItemAvailable(listing.typeId)) {
            Utils.tell(player, "§c提供该物品的 Add-on 当前未启用，商品已暂时冻结且不会丢失。");
            return onBack?.();
        }
        const originalName = this.getOriginalDisplayName(listing);
        const identity = listing.listingName
            ? `实际物品：${originalName} (${listing.typeId})`
            : `物品标识：${listing.typeId}`;
        const form = new ModalFormData()
            .title(`§l购买 ${this.getDisplayName(listing)}`)
            .slider(`${identity}\n库存 ${listing.amount} | 单价 ${listing.unitPrice} 金币`, 1, Math.min(64, listing.amount), 1);
        Utils.showForm(player, form, (res) => {
            if (res.canceled) return onBack?.();
            const quantity = Math.floor(Number(res.formValues?.[0]));
            const latest = this.getListing(listingId);
            if (!latest || latest.sellerName === player.name || quantity < 1 || latest.amount < quantity) {
                Utils.tell(player, "§c商品状态已经变化，请刷新寄卖行。");
                return onBack?.();
            }
            const total = latest.unitPrice * quantity;
            if (!EconomyManager.removeBalance(player, total)) {
                Utils.tell(player, `§c金币不足，需要 ${Utils.formatCurrency(total)}。`);
                return onBack?.();
            }

            latest.amount -= quantity;
            if (latest.amount <= 0) this.deleteListing(latest.id);
            else this.saveListing(latest);
            this.giveListingItem(player, latest, quantity);

            const fee = Math.floor(total * this.feeRate);
            const sellerIncome = Math.max(0, total - fee);
            Integration.recordDailySale(latest.sellerName, total);
            const onlineSeller = world.getAllPlayers().find(target => target.name === latest.sellerName);
            if (onlineSeller) {
                EconomyManager.addBalance(onlineSeller, sellerIncome);
                Utils.tell(onlineSeller, `§a寄卖成交：${this.getDisplayName(latest)} x${quantity}，实收 ${Utils.formatCurrency(sellerIncome)}，手续费 ${Utils.formatCurrency(fee)}。`);
            } else {
                this.queuePayout(latest.sellerName, sellerIncome);
            }
            Utils.tell(player, `§a购买成功：${this.getDisplayName(latest)} x${quantity}，支付 ${Utils.formatCurrency(total)}。`);
            Utils.sound.buy(player);
            onBack?.();
        });
    }

    static openMyListingsUI(player, onBack = null) {
        const listings = this.getListings().filter(listing => listing.sellerName === player.name);
        const actions = [];
        const form = new ActionFormData().title("§l§b📋 我的寄卖").body(listings.length ? "§8选择商品可撤回剩余库存。" : "§8当前没有寄卖商品。");
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        for (const listing of listings.slice(0, Config.market?.maxListingsPerPlayer ?? 10)) {
            add(
                `§0${this.getDisplayName(listing)} x${listing.amount}\n§e${listing.unitPrice}/件 §8| 点击撤回`,
                "textures/items/emerald",
                () => this.openCancelListingUI(player, listing.id, () => this.openMyListingsUI(player, onBack))
            );
        }
        add("§l§8⬅ 返回寄卖行", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, (res) => actions[res.selection]?.());
    }

    static openCancelListingUI(player, listingId, onBack = null) {
        const listing = this.getListing(listingId);
        if (!listing || listing.sellerName !== player.name) return onBack?.();
        if (!this.isItemAvailable(listing.typeId)) {
            Utils.tell(player, "§c提供该物品的 Add-on 当前未启用。重新启用后即可安全撤回，托管记录不会丢失。");
            return onBack?.();
        }
        const form = new MessageFormData()
            .title("§l§c撤回寄卖商品")
            .body(`§0${this.getDisplayName(listing)} x${listing.amount}\n§8撤回不收取手续费。`)
            .button1("§a确认撤回")
            .button2("§8取消");
        Utils.showForm(player, form, (res) => {
            if (res.selection === 0) {
                const latest = this.getListing(listingId);
                if (latest?.sellerName === player.name) {
                    this.deleteListing(listingId);
                    this.giveListingItem(player, latest, latest.amount);
                    Utils.tell(player, "§a商品已撤回并退回背包。");
                }
            }
            onBack?.();
        });
    }
}
