import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { Integration } from "./integration.js";
import { RegionManager } from "./region.js";
import { LandManager } from "./land.js";
import { MarketManager } from "./market.js";
import { WantedManager } from "./wanted.js";
import { AuditManager } from "./audit.js";

const BLOCK_ID = "sapi:player_vending_machine";
const ITEM_ID = "sapi:player_vending_machine_deployer";
const INDEX_KEY = "sapi:vending:index:v1";
const STATE_PREFIX = "sapi:vending:machine:";
const PAYOUT_PREFIX = "sapi:vending:insurance:";

function hash(value) {
    let result = 2166136261;
    for (const char of String(value || "")) {
        result ^= char.charCodeAt(0);
        result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
}

function cleanName(value, fallback) {
    const text = String(value || "").replace(/§./g, "").replace(/[\n\r]/g, " ").replace(/\s+/g, " ").trim();
    return [...(text || fallback)].slice(0, 18).join("");
}

function isAir(block) {
    try { return !!block && (block.isAir || block.isLiquid || block.typeId === "minecraft:air"); }
    catch { return false; }
}

function directionFor(player) {
    const yaw = ((Number(player.getRotation?.().y || 0) % 360) + 360) % 360;
    if (yaw >= 45 && yaw < 135) return "west";
    if (yaw >= 135 && yaw < 225) return "north";
    if (yaw >= 225 && yaw < 315) return "east";
    return "south";
}

export class PlayerVendingManager {
    static openTicks = new Map();

    static settings() { return Config.vending || {}; }

    static index() {
        try {
            const value = JSON.parse(world.getDynamicProperty(INDEX_KEY) || "[]");
            return Array.isArray(value) ? value.filter(id => typeof id === "string") : [];
        } catch { return []; }
    }

    static saveIndex(ids) {
        world.setDynamicProperty(INDEX_KEY, JSON.stringify([...new Set(ids)].slice(-200)));
    }

    static stateKey(id) { return `${STATE_PREFIX}${String(id).replace(/[^a-z0-9_-]/gi, "")}`; }

    static get(id) {
        try {
            const state = JSON.parse(world.getDynamicProperty(this.stateKey(id)) || "null");
            return state?.id === id ? state : null;
        } catch { return null; }
    }

    static save(state) {
        world.setDynamicProperty(this.stateKey(state.id), JSON.stringify(state));
        this.saveIndex([state.id, ...this.index()]);
    }

    static remove(id) {
        try { world.setDynamicProperty(this.stateKey(id), undefined); } catch {}
        this.saveIndex(this.index().filter(value => value !== id));
    }

    static all() { return this.index().map(id => this.get(id)).filter(Boolean); }

    static coordinateId(dimensionId, location) {
        const key = `${dimensionId}:${Math.floor(location.x)}:${Math.floor(location.y)}:${Math.floor(location.z)}`;
        return `vm_${hash(key)}`;
    }

    static lowerBlock(block) {
        if (!block || block.typeId !== BLOCK_ID) return null;
        try { return block.permutation.getState("sapi:part") === "upper" ? block.below() : block; }
        catch { return block; }
    }

    static stateForBlock(block) {
        const lower = this.lowerBlock(block);
        if (!lower) return null;
        return this.get(this.coordinateId(lower.dimension.id, lower.location));
    }

    static registerEvents() {
        try {
            system.beforeEvents.startup.subscribe(event => {
                try {
                    event.itemComponentRegistry.registerCustomComponent("sapi:player_vending_deployer", {
                        onUseOn: interaction => system.run(() => this.deploy(interaction.source, interaction.block))
                    });
                    event.blockComponentRegistry.registerCustomComponent("sapi:player_vending_interact", {
                        onPlayerInteract: interaction => system.run(() => this.interact(interaction.player, interaction.block))
                    });
                } catch (error) { console.warn(`[PlayerVending] component registration failed: ${error}`); }
            });
        } catch (error) { console.warn(`[PlayerVending] startup event unavailable: ${error}`); }

        const interact = world.afterEvents?.playerInteractWithBlock;
        if (interact?.subscribe) interact.subscribe(event => {
            if (event.block?.typeId === BLOCK_ID) system.run(() => this.interact(event.player, event.block));
        });
        const broken = world.afterEvents?.playerBreakBlock;
        if (broken?.subscribe) broken.subscribe(event => this.onBroken(event));
    }

    static ownerCount(name) { return this.all().filter(state => state.ownerName === name).length; }

    static deploy(player, clickedBlock) {
        if (!Utils.isValid(player) || !clickedBlock || Utils.countItem(player, ITEM_ID) < 1) return;
        if (!WantedManager.requireOfficialTrade(player)) return;
        const lower = clickedBlock.above();
        const upper = lower?.above();
        if (!isAir(lower) || !isAir(upper)) return Utils.tell(player, "§c贩卖机需要连续两格空闲空间。");
        if (this.ownerCount(player.name) >= Number(this.settings().maxMachinesPerPlayer || 2)) return Utils.tell(player, "§c你拥有的玩家贩卖机已经达到上限。");
        const plot = LandManager.getPlot(lower.dimension.id, Utils.getChunkCoords(lower.location).chunkX, Utils.getChunkCoords(lower.location).chunkZ);
        if (plot && !LandManager.hasPermission(player, plot)) return Utils.tell(player, "§c不能在其他玩家的领地部署贩卖机。");
        const zone = Integration.resolveCurrentZone(lower.dimension.id, lower.location);
        if (zone.type !== "safe" && !RegionManager.isAllowed(player, lower.location, "allowPlace")) return Utils.tell(player, "§c此管理员保护区禁止部署玩家贩卖机。");
        const cityFee = zone.type === "safe" ? Number(this.settings().cityPlacementFee || 5000) : 0;
        if (!EconomyManager.hasBalance(player, cityFee)) return Utils.tell(player, `§c在主城经营需要 ${Utils.formatCurrency(cityFee)} 许可费。`);
        const id = this.coordinateId(lower.dimension.id, lower.location);
        if (this.get(id)) return Utils.tell(player, "§c这个位置已经登记了另一台贩卖机。");
        const direction = directionFor(player);
        try {
            lower.setPermutation(BlockPermutation.resolve(BLOCK_ID, { "sapi:part": "lower", "minecraft:cardinal_direction": direction }));
            upper.setPermutation(BlockPermutation.resolve(BLOCK_ID, { "sapi:part": "upper", "minecraft:cardinal_direction": direction }));
        } catch (error) {
            try { lower?.setType("minecraft:air"); upper?.setType("minecraft:air"); } catch {}
            return Utils.tell(player, `§c贩卖机生成失败：${error}`);
        }
        const itemRemoved = Utils.removeItem(player, ITEM_ID, 1);
        const feeRemoved = itemRemoved && (cityFee <= 0 || EconomyManager.removeBalance(player, cityFee));
        if (!itemRemoved || !feeRemoved) {
            try { lower.setType("minecraft:air"); upper.setType("minecraft:air"); } catch {}
            if (itemRemoved) Utils.giveItem(player, ITEM_ID, 1);
            return Utils.tell(player, "§c部署事务失败，贩卖机已回滚且不会扣费。");
        }
        const state = {
            id, ownerName: player.name, shopName: `${player.name}的补给站`, dimension: lower.dimension.id,
            location: { x: lower.location.x, y: lower.location.y, z: lower.location.z }, direction,
            listings: [], pendingCoins: 0, insured: false, createdAt: Date.now()
        };
        this.save(state);
        AuditManager.log("vending_place", player, id, `${state.dimension} ${state.location.x},${state.location.y},${state.location.z} cityFee=${cityFee}`);
        Utils.tell(player, `§a玩家贩卖机部署成功${cityFee ? `，已支付 ${Utils.formatCurrency(cityFee)} 主城经营费` : ""}。`);
        this.openRename(player, state, true);
    }

    static interact(player, block) {
        if (!Utils.isValid(player) || block?.typeId !== BLOCK_ID) return;
        const lower = this.lowerBlock(block);
        const state = this.stateForBlock(block);
        if (!state || !lower) return Utils.tell(player, "§c这台贩卖机的数据已经丢失，请联系管理员处理。");
        const key = `${player.id}:${state.id}`;
        const previous = Number(this.openTicks.get(key) ?? -1000);
        if (system.currentTick - previous < 8) return;
        this.openTicks.set(key, system.currentTick);
        if (state.ownerName === player.name || Utils.isAdmin(player)) this.openOwner(player, state);
        else this.openBuyer(player, state);
    }

    static reload(state) { return this.get(state.id); }

    static requirePhysicalAccess(player, state) {
        try {
            if (player.dimension.id !== state.dimension) throw new Error("dimension");
            const distance = Math.hypot(
                player.location.x - (state.location.x + 0.5),
                player.location.y - (state.location.y + 0.5),
                player.location.z - (state.location.z + 0.5)
            );
            if (distance <= 4) return true;
        } catch {}
        Utils.tell(player, "§c请站在贩卖机 4 格内进行实体交易。");
        return false;
    }

    static requireOwnerAccess(player, state) {
        const current = this.reload(state);
        if (!current || (current.ownerName !== player.name && !Utils.isAdmin(player))) return null;
        if (!this.requirePhysicalAccess(player, current)) return null;
        if (!WantedManager.requireOfficialTrade(player)) return null;
        return current;
    }

    static openOwner(player, state) {
        const current = this.requireOwnerAccess(player, state);
        if (!current) return;
        const actions = [];
        const form = new ActionFormData().title(`§l§6${current.shopName}`).body(
            `§0店主：§e${current.ownerName}\n§0商品：§e${current.listings.length}/${this.settings().maxListings || 9}\n` +
            `§0待领取营业额：${Utils.formatCurrency(current.pendingCoins)}\n§0联盟保险：${current.insured ? "§a已投保" : "§8未投保"}`
        );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§a上架背包商品", "textures/ui/plus", () => this.openAddListing(player, current));
        for (const listing of current.listings) add(`§0${MarketManager.getDisplayName(listing)} ×${listing.amount}\n§r§8单价 ${listing.unitPrice}，点击下架`, "textures/items/chest", () => this.confirmRemoveListing(player, current, listing.id));
        add(`§l§6领取营业额\n§r§8${current.pendingCoins} 金币`, "textures/items/gold_ingot", () => this.collect(player, current));
        add("§l§e修改店铺名称\n§r§8费用 1,000 金币", "textures/ui/icon_book_writable", () => this.openRename(player, current, false));
        if (!current.insured) add(`§l§b购买联盟保险\n§r§8${this.settings().insurancePrice || 10000} 金币，赔偿遇袭丢失的库存`, "textures/ui/icon_lock", () => this.buyInsurance(player, current));
        add("§l§c正常回收贩卖机\n§r§8必须清空商品和营业额", "textures/ui/trash", () => this.recover(player, current));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openAddListing(player, state) {
        const current = this.requireOwnerAccess(player, state);
        if (!current) return;
        if (current.listings.length >= Number(this.settings().maxListings || 9)) return Utils.tell(player, "§c商品种类已经达到上限。");
        const container = player.getComponent("inventory")?.container;
        const entries = [];
        for (let slot = 0; slot < (container?.size || 0); slot++) {
            const item = container.getItem(slot);
            if (item && item.typeId !== ITEM_ID) entries.push({ slot, item });
        }
        if (!entries.length) return Utils.tell(player, "§8背包里没有可以上架的商品。");
        const form = new ModalFormData().title("§l上架贩卖机商品")
            .dropdown("选择背包物品", entries.map(entry => `槽位${entry.slot + 1} | ${MarketManager.getDisplayName(entry.item)} ×${entry.item.amount}`))
            .textField("上架数量", "1")
            .textField("每件售价", "100");
        Utils.showForm(player, form, response => {
            if (response.canceled) return this.openOwner(player, current);
            const entry = entries[Number(response.formValues?.[0])];
            const amount = Math.floor(Number(response.formValues?.[1]));
            const unitPrice = Math.floor(Number(response.formValues?.[2]));
            const latestState = this.requireOwnerAccess(player, current);
            const latestItem = entry ? container.getItem(entry.slot) : null;
            if (!latestState || !latestItem || latestItem.typeId !== entry.item.typeId || amount < 1 || amount > latestItem.amount) {
                Utils.tell(player, "§c物品或数量已经发生变化。");
                return this.openOwner(player, latestState || current);
            }
            const unsafe = MarketManager.getUnsafeReason(latestItem);
            if (unsafe) {
                Utils.tell(player, `§c无法上架：${unsafe}。`);
                return this.openOwner(player, latestState);
            }
            if (unitPrice < 1 || unitPrice > Number(this.settings().maxUnitPrice || 100000000)) {
                Utils.tell(player, "§c商品单价无效。");
                return this.openOwner(player, latestState);
            }
            const snapshot = MarketManager.snapshotItem(latestItem);
            if (!MarketManager.removeFromSlot(player, entry.slot, amount, latestItem.typeId)) return Utils.tell(player, "§c物品托管失败，背包未变化。");
            latestState.listings.push({ id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`, ...snapshot, amount, unitPrice });
            this.save(latestState);
            AuditManager.log("vending_list", player, latestState.id, `${snapshot.typeId} x${amount} price=${unitPrice}`);
            Utils.tell(player, "§a商品已经放入贩卖机。");
            this.openOwner(player, latestState);
        });
    }

    static confirmRemoveListing(player, state, listingId) {
        const current = this.requireOwnerAccess(player, state);
        const listing = current?.listings.find(value => value.id === listingId);
        if (!current || !listing) return;
        const form = new MessageFormData().title("§l下架商品").body(`§0下架 ${MarketManager.getDisplayName(listing)} ×${listing.amount}？`).button1("§a下架").button2("§8取消");
        Utils.showForm(player, form, response => {
            const latest = this.requireOwnerAccess(player, current);
            const selected = latest?.listings.find(value => value.id === listingId);
            if (response.selection === 0 && latest && selected) {
                if (MarketManager.giveListingItem(player, selected, selected.amount)) {
                    latest.listings = latest.listings.filter(value => value.id !== listingId);
                    this.save(latest);
                }
            }
            this.openOwner(player, latest || current);
        });
    }

    static openBuyer(player, state) {
        const current = this.reload(state);
        if (!current) return;
        if (!this.requirePhysicalAccess(player, current)) return;
        const actions = [];
        const form = new ActionFormData().title(`§l§6${current.shopName}`).body(`§0店主：§e${current.ownerName}\n§0你的金币：${Utils.formatCurrency(EconomyManager.getBalance(player))}\n§8通缉玩家仍可在其他玩家的实体店购物。`);
        for (const listing of current.listings) {
            form.button(`§0${MarketManager.getDisplayName(listing)} ×${listing.amount}\n§r§e${listing.unitPrice} 金币/件`, "textures/items/chest");
            actions.push(() => this.openPurchase(player, current, listing.id));
        }
        if (!current.listings.length) form.body(`§0店主：§e${current.ownerName}\n§8这台贩卖机暂时没有商品。`);
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openPurchase(player, state, listingId) {
        const current = this.reload(state);
        const listing = current?.listings.find(value => value.id === listingId);
        if (!current || !listing) return Utils.tell(player, "§c商品刚刚已经售完。");
        const form = new ModalFormData().title(`§l购买 ${MarketManager.getDisplayName(listing)}`).slider("购买数量", 1, listing.amount, 1, 1);
        Utils.showForm(player, form, response => {
            if (response.canceled) return this.openBuyer(player, current);
            const latest = this.reload(current);
            if (latest && !this.requirePhysicalAccess(player, latest)) return;
            const selected = latest?.listings.find(value => value.id === listingId);
            const amount = Math.max(1, Math.min(Number(selected?.amount || 0), Math.floor(Number(response.formValues?.[0]) || 1)));
            if (!latest || !selected || amount < 1) return Utils.tell(player, "§c商品已经售完。");
            const total = selected.unitPrice * amount;
            if (!EconomyManager.removeBalance(player, total)) return Utils.tell(player, `§c购买需要 ${Utils.formatCurrency(total)}。`);
            if (!MarketManager.giveListingItem(player, selected, amount)) {
                EconomyManager.addBalance(player, total);
                return Utils.tell(player, "§c物品交付失败，金币已退回。");
            }
            selected.amount -= amount;
            if (selected.amount <= 0) latest.listings = latest.listings.filter(value => value.id !== listingId);
            latest.pendingCoins = Math.max(0, Number(latest.pendingCoins || 0)) + total;
            this.save(latest);
            Integration.recordDailySale(latest.ownerName, total);
            AuditManager.log("vending_sale", player, latest.id, `${selected.typeId} x${amount} total=${total} seller=${latest.ownerName}`);
            Utils.tell(player, `§a购买成功，共支付 ${Utils.formatCurrency(total)}。`);
            Utils.sound.buy(player);
        });
    }

    static collect(player, state) {
        const current = this.requireOwnerAccess(player, state);
        if (!current) return;
        const amount = Math.max(0, Math.floor(Number(current.pendingCoins || 0)));
        if (!amount) return Utils.tell(player, "§8当前没有待领取营业额。");
        current.pendingCoins = 0;
        this.save(current);
        EconomyManager.addBalance(player, amount);
        AuditManager.log("vending_collect", player, current.id, `amount=${amount}`);
        Utils.tell(player, `§a已领取 ${Utils.formatCurrency(amount)}。`);
        Utils.sound.success(player);
    }

    static openRename(player, state, initial = false) {
        const current = initial ? this.reload(state) : this.requireOwnerAccess(player, state);
        if (!current || current.ownerName !== player.name) return;
        const cost = initial ? 0 : 1000;
        const form = new ModalFormData().title(initial ? "§l设置店铺名称" : "§l修改店铺名称").textField(`名称 2～18 字${cost ? `，费用 ${cost} 金币` : ""}`, current.shopName, current.shopName);
        Utils.showForm(player, form, response => {
            if (response.canceled) return;
            const latest = initial ? this.reload(current) : this.requireOwnerAccess(player, current);
            if (!latest) return;
            const name = cleanName(response.formValues?.[0], latest.shopName);
            if ([...name].length < 2) return Utils.tell(player, "§c店铺名称至少需要 2 个字符。");
            if (cost && !EconomyManager.removeBalance(player, cost)) return Utils.tell(player, `§c改名需要 ${Utils.formatCurrency(cost)}。`);
            latest.shopName = name;
            this.save(latest);
            Utils.tell(player, `§a店铺名称已设置为：§e${name}`);
        });
    }

    static buyInsurance(player, state) {
        const current = this.requireOwnerAccess(player, state);
        if (!current || current.insured) return;
        const cost = Number(this.settings().insurancePrice || 10000);
        if (!EconomyManager.removeBalance(player, cost)) return Utils.tell(player, `§c联盟保险需要 ${Utils.formatCurrency(cost)}。`);
        current.insured = true;
        current.insuredAt = Date.now();
        this.save(current);
        AuditManager.log("vending_insure", player, current.id, `cost=${cost} coverage=lost_stock`);
        Utils.tell(player, "§a本机已投保；遭破坏时，随机掉落的 1 件商品由破坏现场保留，其余库存由联盟返还。机器本体与未领取营业额不在保障范围内。");
    }

    static recover(player, state) {
        const current = this.requireOwnerAccess(player, state);
        if (!current || current.ownerName !== player.name) return;
        if (current.listings.length || Number(current.pendingCoins || 0) > 0) return Utils.tell(player, "§c请先下架全部商品并领取营业额。");
        const form = new MessageFormData().title("§l回收玩家贩卖机").body("§0正常回收会返还部署器；已经购买的联盟保险不会返还。").button1("§a回收").button2("§8取消");
        Utils.showForm(player, form, response => {
            if (response.selection !== 0) return this.openOwner(player, current);
            const latest = this.requireOwnerAccess(player, current);
            if (!latest || latest.listings.length || Number(latest.pendingCoins || 0) > 0) return;
            this.clearBlocks(latest);
            this.remove(latest.id);
            Utils.giveItem(player, ITEM_ID, 1);
            AuditManager.log("vending_recover", player, latest.id);
            Utils.tell(player, "§a贩卖机已正常回收。");
        });
    }

    static clearBlocks(state) {
        try {
            const lower = world.getDimension(state.dimension).getBlock(state.location);
            if (lower?.typeId === BLOCK_ID) lower.setType("minecraft:air");
            const upper = world.getDimension(state.dimension).getBlock({ x: state.location.x, y: state.location.y + 1, z: state.location.z });
            if (upper?.typeId === BLOCK_ID) upper.setType("minecraft:air");
        } catch {}
    }

    static payoutKey(name) { return `${PAYOUT_PREFIX}${hash(String(name).toLowerCase())}`; }

    static readInsurance(name) {
        const key = this.payoutKey(name);
        try {
            const saved = JSON.parse(world.getDynamicProperty(key) || "null");
            // v2.11.0 曾使用固定金币赔付；保留旧世界里已经产生的待领赔款。
            if (typeof saved === "number") return { version: 2, legacyCoins: Math.max(0, Math.floor(saved)), claims: [] };
            if (saved && typeof saved === "object") return {
                version: 2,
                legacyCoins: Math.max(0, Math.floor(Number(saved.legacyCoins || 0))),
                claims: Array.isArray(saved.claims) ? saved.claims.slice(-20) : []
            };
        } catch {}
        return { version: 2, legacyCoins: 0, claims: [] };
    }

    static saveInsurance(name, data) {
        const key = this.payoutKey(name);
        const empty = !Number(data.legacyCoins || 0) && !(data.claims || []).length;
        world.setDynamicProperty(key, empty ? undefined : JSON.stringify(data));
    }

    static queueInsuranceItems(name, machineId, listings) {
        const items = (listings || []).filter(listing => Number(listing.amount || 0) > 0).map(listing => ({
            typeId: listing.typeId,
            nameTag: listing.nameTag || "",
            lore: Array.isArray(listing.lore) ? listing.lore.slice(0, 20) : [],
            amount: Math.max(1, Math.floor(Number(listing.amount || 1)))
        }));
        if (!items.length) return 0;
        const data = this.readInsurance(name);
        data.claims.push({ machineId, createdAt: Date.now(), items });
        data.claims = data.claims.slice(-20);
        this.saveInsurance(name, data);
        return items.reduce((sum, item) => sum + item.amount, 0);
    }

    static deliverInsuranceItem(player, listing) {
        const container = player.getComponent("inventory")?.container;
        if (!container) return Math.max(0, Number(listing.amount || 0));
        let remaining = Math.max(0, Math.floor(Number(listing.amount || 0)));
        let stackLimit = 64;
        try { stackLimit = Math.max(1, Number(new ItemStack(listing.typeId, 1).maxAmount) || 1); } catch { return remaining; }
        while (remaining > 0) {
            const amount = Math.min(remaining, stackLimit);
            try {
                const item = new ItemStack(listing.typeId, amount);
                if (listing.nameTag) item.nameTag = listing.nameTag;
                if (listing.lore?.length) item.setLore(listing.lore);
                const leftover = container.addItem(item);
                remaining -= amount;
                if (leftover) {
                    remaining += Number(leftover.amount || amount);
                    break;
                }
            } catch { break; }
        }
        return remaining;
    }

    static claimInsuranceCompensation(player, notify = true) {
        if (!player?.name) return 0;
        const data = this.readInsurance(player.name);
        let delivered = 0;
        if (data.legacyCoins > 0) {
            EconomyManager.addBalance(player, data.legacyCoins);
            if (notify) Utils.tell(player, `§b旧版联盟保险赔款已到账：${Utils.formatCurrency(data.legacyCoins)}。`);
            data.legacyCoins = 0;
        }
        const remainingClaims = [];
        for (const claim of data.claims) {
            const remainingItems = [];
            for (const item of claim.items || []) {
                const before = Math.max(0, Math.floor(Number(item.amount || 0)));
                const remaining = this.deliverInsuranceItem(player, item);
                delivered += before - remaining;
                if (remaining > 0) remainingItems.push({ ...item, amount: remaining });
            }
            if (remainingItems.length) remainingClaims.push({ ...claim, items: remainingItems });
        }
        data.claims = remainingClaims;
        this.saveInsurance(player.name, data);
        if (notify && delivered > 0) Utils.tell(player, `§b联盟保险已返还 ${delivered} 件遇袭丢失的库存物品。`);
        if (notify && remainingClaims.length) Utils.tell(player, "§e背包空间不足，未领取的保险物品已继续保管，腾出空间后重新进入世界即可领取。");
        return delivered;
    }

    static dropRandomProduct(state) {
        if (!state.listings?.length) return { dropped: "none", lostListings: [] };
        const selectedIndex = Math.floor(Math.random() * state.listings.length);
        const listing = state.listings[selectedIndex];
        let dropped = listing.typeId;
        try {
            const item = new ItemStack(listing.typeId, 1);
            if (listing.nameTag) item.nameTag = listing.nameTag;
            if (listing.lore?.length) item.setLore(listing.lore);
            world.getDimension(state.dimension).spawnItem(item, { x: state.location.x + 0.5, y: state.location.y + 0.5, z: state.location.z + 0.5 });
        } catch { dropped = "invalid"; }
        const lostListings = state.listings.map((value, index) => ({
            ...value,
            amount: Math.max(0, Number(value.amount || 0) - (index === selectedIndex && dropped !== "invalid" ? 1 : 0))
        })).filter(value => value.amount > 0);
        return { dropped, lostListings };
    }

    static onBroken(event) {
        const permutation = event.brokenBlockPermutation;
        if (permutation?.type?.id !== BLOCK_ID) return;
        const part = permutation.getState("sapi:part") || "lower";
        const location = { ...event.block.location, y: event.block.location.y - (part === "upper" ? 1 : 0) };
        const id = this.coordinateId(event.block.dimension.id, location);
        const state = this.get(id);
        if (!state) return;
        this.clearBlocks(state);
        const loss = this.dropRandomProduct(state);
        this.remove(state.id);
        const insuredItems = state.insured ? this.queueInsuranceItems(state.ownerName, state.id, loss.lostListings) : 0;
        if (insuredItems > 0) {
            const owner = world.getAllPlayers().find(player => player.name === state.ownerName);
            if (owner) system.run(() => this.claimInsuranceCompensation(owner, true));
        }
        if (event.player) WantedManager.addPoints(event.player, 50, "破坏玩家贩卖机");
        AuditManager.log("vending_break", event.player || "unknown", state.id, `owner=${state.ownerName} drop=${loss.dropped} insuredItems=${insuredItems} coinsLost=${state.pendingCoins} insured=${state.insured}`);
        try { world.sendMessage(`§4[治安通报] §0${event.player?.name || "未知人员"} 破坏了 ${state.ownerName} 的贩卖机，通缉值增加 50。`); } catch {}
    }
}
