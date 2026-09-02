import { world, ItemStack } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { Integration } from "./integration.js";

const CUSTOM_POOLS_KEY = "sapi:lottery:custom_pools:v1";
const PLAYER_PITY_KEY = "sapi:lottery:pity:v1";
const RARITY_IDS = ["common", "rare", "epic", "legendary", "mythic"];

/**
 * 抽奖系统管理器
 * 支持权重抽取、单抽/十连抽、欧皇广播与奖池预览
 */
export class LotteryManager {
    static getCustomPools() {
        try {
            const raw = world.getDynamicProperty(CUSTOM_POOLS_KEY);
            const pools = typeof raw === "string" ? JSON.parse(raw) : [];
            return Array.isArray(pools) ? pools.filter(pool => pool?.id?.startsWith("custom_")) : [];
        } catch {
            return [];
        }
    }

    static saveCustomPools(pools) {
        const normalized = pools.slice(0, 20);
        const raw = JSON.stringify(normalized);
        if (raw.length > 28000) throw new Error("自定义奖池数据超过世界存储上限");
        world.setDynamicProperty(CUSTOM_POOLS_KEY, raw);
    }

    static getPools() {
        const builtIn = Config.lottery.pools.map(pool => ({ ...pool, builtIn: true }));
        const custom = this.getCustomPools().filter(pool => pool.enabled !== false && Array.isArray(pool.items) && pool.items.length > 0);
        return [...builtIn, ...custom];
    }

    static getPityMap(player) {
        try {
            const raw = player.getDynamicProperty(PLAYER_PITY_KEY);
            const data = typeof raw === "string" ? JSON.parse(raw) : {};
            return data && typeof data === "object" ? data : {};
        } catch {
            return {};
        }
    }

    static savePityMap(player, data) {
        try { player.setDynamicProperty(PLAYER_PITY_KEY, JSON.stringify(data)); } catch {}
    }

    static getPityStatus(player, pool) {
        const threshold = Math.max(0, Math.floor(pool.pityThreshold || 0));
        if (!threshold || !pool.pityPrizeKey) return null;
        const current = Math.max(0, Math.floor(this.getPityMap(player)[pool.id] || 0));
        return { current, threshold, remaining: Math.max(1, threshold - current) };
    }

    static prizeKey(pool, item, index) {
        return item.key || `${pool.id}_prize_${index}`;
    }

    static getEligibleItems(pool) {
        return pool.items
            .map((item, index) => ({ ...item, key: this.prizeKey(pool, item, index) }))
            .filter(item => (!item.id.startsWith("lotm:") || Integration.isLotmAvailable()) && this.getMaxStack(item.id) > 0);
    }

    /**
     * 打开抽奖大厅（奖池列表）
     * @param {import("@minecraft/server").Player} player 
     * @param {Function} [onBack] 
     */
    static openLotteryMainUI(player, onBack = null) {
        const balance = EconomyManager.getBalance(player);
        const form = new ActionFormData()
            .title("§l§d🎁 幸运抽奖大厅")
            .body(
                `§7═════════════════════════\n` +
                `§f当前资产: ${Utils.formatCurrency(balance)}\n` +
                `§7选择你感兴趣的神秘奖池，测测今日欧气！\n` +
                `§7═════════════════════════`
            );

        const pools = this.getPools();
        for (const pool of pools) {
            form.button(`${pool.name}\n§r§8单抽: ${pool.singleCost} | 十连: ${pool.tenCost}`, pool.icon);
        }

        if (onBack) {
            form.button("§l§c🔙 返回上级\n§r§8返回主菜单", "textures/ui/cancel");
        }

        Utils.showForm(player, form, (res) => {
            if (res.canceled) return;
            if (res.selection < pools.length) {
                const selectedPool = pools[res.selection];
                this.openPoolActionUI(player, selectedPool, () => this.openLotteryMainUI(player, onBack));
            } else if (res.selection === pools.length && onBack) {
                onBack();
            }
        });
    }

    /**
     * 打开特定奖池的抽奖界面
     * @param {import("@minecraft/server").Player} player 
     * @param {object} pool 
     * @param {Function} [onBack] 
     */
    static openPoolActionUI(player, pool, onBack = null) {
        const balance = EconomyManager.getBalance(player);
        const pity = this.getPityStatus(player, pool);
        const form = new ActionFormData()
            .title(`§l${pool.name}`)
            .body(
                `§7═════════════════════════\n` +
                `§f当前资产: ${Utils.formatCurrency(balance)}\n` +
                `§7奖池说明: §f${pool.description}\n` +
                (pity ? `§f保底进度: §d${pity.current}/${pity.threshold} §7（再抽 ${pity.remaining} 次必出指定奖品）\n` : "§8该奖池未启用保底\n") +
                `§7═════════════════════════`
            )
            .button(`§l§a🎯 单抽 1 次\n§r§8消耗 ${pool.singleCost} 金币`, "textures/ui/generic_single_coin")
            .button(`§l§6🌟 十连抽取\n§r§8消耗 ${pool.tenCost} 金币 (特惠)`, "textures/ui/generic_ten_coins")
            .button(`§l§b📜 奖池内容与概率\n§r§8查看全部可抽取物品`, "textures/ui/book_metas_default");

        if (onBack) {
            form.button("§l§c🔙 返回奖池列表\n§r§8选择其他奖池", "textures/ui/cancel");
        }

        Utils.showForm(player, form, (res) => {
            if (res.canceled) return;
            if (res.selection === 0) {
                this.executeDraw(player, pool, 1, () => this.openPoolActionUI(player, pool, onBack));
            } else if (res.selection === 1) {
                this.executeDraw(player, pool, 10, () => this.openPoolActionUI(player, pool, onBack));
            } else if (res.selection === 2) {
                this.openPoolPrizesPreviewUI(player, pool, () => this.openPoolActionUI(player, pool, onBack));
            } else if (res.selection === 3 && onBack) {
                onBack();
            }
        });
    }

    /**
     * 执行抽奖逻辑
     * @param {import("@minecraft/server").Player} player 
     * @param {object} pool 
     * @param {number} count 抽取次数 (1 或 10)
     * @param {Function} [onComplete] 
     */
    static executeDraw(player, pool, count = 1, onComplete = null) {
        const cost = count === 1 ? pool.singleCost : pool.tenCost;

        if (!EconomyManager.hasBalance(player, cost)) {
            Utils.tell(player, `§c金币不足！抽奖需要 ${Utils.formatCurrency(cost)}。`);
            Utils.sound.fail(player);
            if (onComplete) onComplete();
            return;
        }

        // 计算奖品
        const items = this.getEligibleItems(pool);
        if (items.length === 0) {
            Utils.tell(player, "§c当前奖池没有可用奖品，未扣除金币。");
            if (onComplete) onComplete();
            return;
        }
        const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);

        // 确认存在可用奖品后再扣款。
        EconomyManager.removeBalance(player, cost);

        const results = [];
        let hasRareOrAbove = false;
        const pityMap = this.getPityMap(player);
        let pityCount = Math.max(0, Math.floor(pityMap[pool.id] || 0));
        const pityThreshold = Math.max(0, Math.floor(pool.pityThreshold || 0));
        const pityPrize = pityThreshold > 0 ? items.find(item => item.key === pool.pityPrizeKey) : null;

        for (let i = 0; i < count; i++) {
            const forcedPity = !!pityPrize && pityCount + 1 >= pityThreshold;
            let chosen = pityPrize;
            if (!forcedPity) {
                let rnd = Math.random() * totalWeight;
                chosen = items[0];
                for (const item of items) {
                    if (rnd < item.weight) {
                        chosen = item;
                        break;
                    }
                    rnd -= item.weight;
                }
            }

            if (pityPrize && chosen.key === pityPrize.key) pityCount = 0;
            else if (pityPrize) pityCount += 1;
            results.push({ item: chosen, forcedPity });

            // 发放物品
            Utils.giveItem(player, chosen.id, chosen.amount);

            // 稀有度判断与全服广播
            const rarityInfo = Config.lottery.rarities[chosen.rarity] || { name: "普通", broadcast: false };
            if (rarityInfo.broadcast) {
                hasRareOrAbove = true;
                if (chosen.rarity === "mythic") {
                    Utils.broadcast(`§l§6[🔥 神话欧皇降临 🔥] §e玩家 §b${player.name} §e一发入魂抽中了限定神话武器：${chosen.name} §e！！！`);
                } else {
                    Utils.broadcast(`§e🎉 玩家 §b${player.name} §e在【${pool.name}】中欧气爆发，抽中了 ${rarityInfo.name} §e奖品：${chosen.name}！`);
                }
            }
        }
        if (pityPrize) {
            pityMap[pool.id] = pityCount;
            this.savePityMap(player, pityMap);
        }

        // 播放音效
        if (hasRareOrAbove) {
            Utils.sound.rareWin(player);
        } else {
            Utils.sound.buy(player);
        }

        // 展示抽奖结果视窗
        let resultText = `§7═════════ 抽奖结果 (${count} 连抽) ═════════\n\n`;
        for (let i = 0; i < results.length; i++) {
            const { item: it, forcedPity } = results[i];
            const rarityInfo = Config.lottery.rarities[it.rarity] || { name: "普通", color: "§7" };
            resultText += `§f[${i + 1}] [${rarityInfo.color}${rarityInfo.name}§f] ${it.name}${forcedPity ? " §d【保底】" : ""}\n`;
        }
        resultText += `\n§7═══════════════════════════════════\n`;
        resultText += `§a已自动将获得的物品发放至你的背包！`;

        const form = new ActionFormData()
            .title("§l§6🎁 抽奖结果揭晓！")
            .body(resultText)
            .button("§l§a再来一次", "textures/ui/refresh")
            .button("§l§e返回奖池", "textures/ui/cancel");

        Utils.showForm(player, form, (res) => {
            if (res.selection === 0) {
                this.executeDraw(player, pool, count, onComplete);
            } else if (onComplete) {
                onComplete();
            }
        });
    }

    /**
     * 查看奖池全部可抽取物品与概率公示
     * @param {import("@minecraft/server").Player} player 
     * @param {object} pool 
     * @param {Function} [onBack] 
     */
    static openPoolPrizesPreviewUI(player, pool, onBack = null) {
        const eligibleItems = this.getEligibleItems(pool);
        const totalWeight = eligibleItems.reduce((sum, it) => sum + it.weight, 0);

        let content = `§7═════════ 奖池概率公示 ═════════\n\n`;
        for (const it of eligibleItems) {
            const rarityInfo = Config.lottery.rarities[it.rarity] || { name: "普通", color: "§7" };
            const chance = totalWeight > 0 ? ((it.weight / totalWeight) * 100).toFixed(1) : "0.0";
            content += `[${rarityInfo.color}${rarityInfo.name}§r] ${it.name} §7- 概率: §e${chance}%\n`;
        }
        if (!eligibleItems.length) content += "§8当前没有可用奖品。\n";
        const pityPrize = eligibleItems.find(item => item.key === pool.pityPrizeKey);
        if (pityPrize && pool.pityThreshold > 0) {
            content += `\n§d保底规则：若前 ${Math.max(0, pool.pityThreshold - 1)} 抽未获得 ${pityPrize.name}，第 ${pool.pityThreshold} 抽必定获得。\n`;
        }
        content += `\n§7══════════════════════════════`;

        const form = new ActionFormData()
            .title(`§l奖池概率: ${pool.name}`)
            .body(content)
            .button("§l§a确定并返回", "textures/ui/confirm");

        Utils.showForm(player, form, () => {
            if (onBack) onBack();
        });
    }

    static cleanText(value, fallback, maxLength = 80) {
        const text = String(value ?? "").trim();
        return (text || fallback).slice(0, maxLength);
    }

    static number(value, fallback, min, max) {
        const parsed = Math.floor(Number(value));
        return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
    }

    static getMaxStack(itemId) {
        try {
            const sample = new ItemStack(itemId, 1);
            return Math.max(1, Math.floor(sample.maxAmount || 64));
        } catch {
            return 0;
        }
    }

    static mutateCustomPool(poolId, mutator) {
        const pools = this.getCustomPools();
        const index = pools.findIndex(pool => pool.id === poolId);
        if (index < 0) return null;
        const clone = JSON.parse(JSON.stringify(pools[index]));
        mutator(clone);
        pools[index] = clone;
        this.saveCustomPools(pools);
        return clone;
    }

    static openAdminPoolManager(player, onBack = null) {
        if (!Utils.isAdmin(player)) {
            Utils.tell(player, "§c需要管理员权限。");
            return;
        }
        const pools = this.getCustomPools();
        const actions = [];
        const form = new ActionFormData()
            .title("§l§d🎰 自定义奖池管理")
            .body(`§f自定义奖池: §e${pools.length}/20\n§7内置奖池保持只读；自定义奖池可独立设置奖品、权重、价格与指定奖品保底。`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        for (const pool of pools) {
            const pity = pool.pityThreshold > 0 && pool.pityPrizeKey ? `保底${pool.pityThreshold}抽` : "无保底";
            add(
                `${pool.enabled === false ? "§8" : "§d"}${pool.name}\n§r§8${pool.items?.length || 0}奖品 | ${pity} | ${pool.enabled === false ? "已停用" : "已发布"}`,
                pool.icon || "textures/ui/gift_square",
                () => this.openCustomPoolEditor(player, pool.id, () => this.openAdminPoolManager(player, onBack))
            );
        }
        if (pools.length < 20) add("§l§a＋ 创建自定义奖池", "textures/ui/gift_square", () => this.openCreatePoolUI(player, () => this.openAdminPoolManager(player, onBack)));
        add("§l§7⬅ 返回管理员菜单", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, (res) => actions[res.selection]?.());
    }

    static openCreatePoolUI(player, onBack = null) {
        const form = new ModalFormData()
            .title("§l§a创建自定义奖池")
            .textField("奖池名称", "例如：周末限定池")
            .textField("奖池说明", "输入展示给玩家的说明")
            .textField("按钮图标路径", "textures/ui/gift_square", "textures/ui/gift_square")
            .textField("单抽价格", "200")
            .textField("十连价格", "1800");
        Utils.showForm(player, form, (res) => {
            if (res.canceled) return onBack?.();
            const [name, description, icon, singleCost, tenCost] = res.formValues;
            const pools = this.getCustomPools();
            if (pools.length >= 20) return onBack?.();
            const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
            pools.push({
                id,
                name: this.cleanText(name, "自定义奖池", 50),
                description: this.cleanText(description, "管理员自定义奖池", 200),
                icon: this.cleanText(icon, "textures/ui/gift_square", 120),
                singleCost: this.number(singleCost, 200, 0, 100000000),
                tenCost: this.number(tenCost, 1800, 0, 1000000000),
                enabled: false,
                pityThreshold: 0,
                pityPrizeKey: null,
                items: [],
            });
            try {
                this.saveCustomPools(pools);
                Utils.tell(player, "§a奖池已创建。添加奖品并启用后才会向玩家展示。");
                this.openCustomPoolEditor(player, id, onBack);
            } catch (error) {
                Utils.tell(player, `§c创建失败：${error}`);
                onBack?.();
            }
        });
    }

    static openCustomPoolEditor(player, poolId, onBack = null) {
        const pool = this.getCustomPools().find(entry => entry.id === poolId);
        if (!pool) return onBack?.();
        const pityPrize = pool.items?.find(item => item.key === pool.pityPrizeKey);
        const actions = [];
        const form = new ActionFormData()
            .title(`§l§d${pool.name}`)
            .body(
                `§f状态: ${pool.enabled === false ? "§8未发布" : "§a已发布"}\n` +
                `§f价格: §e${pool.singleCost} / ${pool.tenCost}\n` +
                `§f奖品: §b${pool.items?.length || 0}/40\n` +
                `§f保底: ${pityPrize && pool.pityThreshold > 0 ? `§d${pool.pityThreshold}抽必出 ${pityPrize.name}` : "§8未启用"}`
            );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§e✏ 编辑名称、说明与价格", "textures/items/book_writable", () => this.openEditPoolBasicsUI(player, poolId, () => this.openCustomPoolEditor(player, poolId, onBack)));
        add("§l§a＋ 添加奖品", "textures/ui/gift_square", () => this.openAddPrizeUI(player, poolId, () => this.openCustomPoolEditor(player, poolId, onBack)));
        add("§l§b📦 管理现有奖品", "textures/items/chest_minecart", () => this.openPrizeListUI(player, poolId, () => this.openCustomPoolEditor(player, poolId, onBack)));
        add("§l§d🎯 配置指定奖品保底", "textures/ui/gift_square", () => this.openPityConfigUI(player, poolId, () => this.openCustomPoolEditor(player, poolId, onBack)));
        add(pool.enabled === false ? "§l§a✅ 发布奖池" : "§l§8⏸ 停用奖池", "textures/ui/confirm", () => {
            if (!pool.items?.length && pool.enabled === false) {
                Utils.tell(player, "§c至少添加一个奖品后才能发布。");
            } else {
                this.mutateCustomPool(poolId, current => { current.enabled = current.enabled === false; });
            }
            this.openCustomPoolEditor(player, poolId, onBack);
        });
        add("§l§4🗑 删除奖池", "textures/ui/trash", () => this.openDeletePoolUI(player, poolId, onBack));
        add("§l§7⬅ 返回奖池列表", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, (res) => actions[res.selection]?.());
    }

    static openEditPoolBasicsUI(player, poolId, onBack = null) {
        const pool = this.getCustomPools().find(entry => entry.id === poolId);
        if (!pool) return onBack?.();
        const form = new ModalFormData()
            .title("§l编辑奖池基础信息")
            .textField("奖池名称", "名称", pool.name)
            .textField("奖池说明", "说明", pool.description)
            .textField("按钮图标路径", "textures/ui/gift_square", pool.icon)
            .textField("单抽价格", "200", String(pool.singleCost))
            .textField("十连价格", "1800", String(pool.tenCost));
        Utils.showForm(player, form, (res) => {
            if (!res.canceled) {
                const [name, description, icon, singleCost, tenCost] = res.formValues;
                try {
                    this.mutateCustomPool(poolId, current => {
                        current.name = this.cleanText(name, current.name, 50);
                        current.description = this.cleanText(description, current.description, 200);
                        current.icon = this.cleanText(icon, current.icon, 120);
                        current.singleCost = this.number(singleCost, current.singleCost, 0, 100000000);
                        current.tenCost = this.number(tenCost, current.tenCost, 0, 1000000000);
                    });
                } catch (error) { Utils.tell(player, `§c保存失败：${error}`); }
            }
            onBack?.();
        });
    }

    static openAddPrizeUI(player, poolId, onBack = null) {
        const pool = this.getCustomPools().find(entry => entry.id === poolId);
        if (!pool || (pool.items?.length || 0) >= 40) {
            Utils.tell(player, "§c奖品数量已达上限或奖池不存在。");
            return onBack?.();
        }
        const form = new ModalFormData()
            .title("§l§a添加奖品")
            .textField("物品标识符", "minecraft:diamond")
            .textField("显示名称", "钻石 x1")
            .textField("发放数量（1–64）", "1")
            .textField("抽取权重（正整数）", "10")
            .dropdown("稀有度", ["普通", "稀有", "史诗", "传说", "神话"]);
        Utils.showForm(player, form, (res) => {
            if (res.canceled) return onBack?.();
            const [itemId, displayName, amount, weight, rarityIndex] = res.formValues;
            const normalizedId = String(itemId || "").trim().toLowerCase();
            if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(normalizedId)) {
                Utils.tell(player, "§c物品标识符格式无效，应类似 minecraft:diamond。");
                return onBack?.();
            }
            const maxStack = this.getMaxStack(normalizedId);
            if (!maxStack) {
                Utils.tell(player, "§c当前世界没有注册该物品。请检查标识符或先启用提供该物品的 Add-on。");
                return onBack?.();
            }
            try {
                this.mutateCustomPool(poolId, current => {
                    current.items ||= [];
                    current.items.push({
                        key: `prize_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
                        id: normalizedId,
                        name: this.cleanText(displayName, normalizedId, 80),
                        amount: this.number(amount, 1, 1, maxStack),
                        weight: this.number(weight, 10, 1, 1000000),
                        rarity: RARITY_IDS[this.number(rarityIndex, 0, 0, 4)],
                    });
                });
            } catch (error) { Utils.tell(player, `§c保存失败：${error}`); }
            onBack?.();
        });
    }

    static openPrizeListUI(player, poolId, onBack = null) {
        const pool = this.getCustomPools().find(entry => entry.id === poolId);
        if (!pool) return onBack?.();
        const actions = [];
        const form = new ActionFormData().title("§l§b📦 奖品管理").body(pool.items?.length ? "§7选择奖品进行编辑或删除。" : "§7尚未添加奖品。");
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        for (const prize of pool.items || []) {
            add(`${prize.name}\n§r§8${prize.id} x${prize.amount} | 权重${prize.weight}`, "textures/items/emerald", () => this.openPrizeEditorUI(player, poolId, prize.key, () => this.openPrizeListUI(player, poolId, onBack)));
        }
        add("§l§7⬅ 返回奖池编辑", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, (res) => actions[res.selection]?.());
    }

    static openPrizeEditorUI(player, poolId, prizeKey, onBack = null) {
        const pool = this.getCustomPools().find(entry => entry.id === poolId);
        const prize = pool?.items?.find(item => item.key === prizeKey);
        if (!prize) return onBack?.();
        const form = new ActionFormData()
            .title(`§l${prize.name}`)
            .body(`§fID: §7${prize.id}\n§f数量: §e${prize.amount}\n§f权重: §e${prize.weight}\n§f稀有度: §d${prize.rarity}`)
            .button("§l§e✏ 编辑奖品", "textures/items/book_writable")
            .button("§l§4🗑 删除奖品", "textures/ui/trash")
            .button("§l§7⬅ 返回", "textures/ui/undo");
        Utils.showForm(player, form, (res) => {
            if (res.selection === 0) this.openEditPrizeUI(player, poolId, prizeKey, onBack);
            else if (res.selection === 1) {
                try {
                    this.mutateCustomPool(poolId, current => {
                        current.items = current.items.filter(item => item.key !== prizeKey);
                        if (current.pityPrizeKey === prizeKey) {
                            current.pityPrizeKey = null;
                            current.pityThreshold = 0;
                        }
                    });
                } catch (error) { Utils.tell(player, `§c删除失败：${error}`); }
                onBack?.();
            } else onBack?.();
        });
    }

    static openEditPrizeUI(player, poolId, prizeKey, onBack = null) {
        const pool = this.getCustomPools().find(entry => entry.id === poolId);
        const prize = pool?.items?.find(item => item.key === prizeKey);
        if (!prize) return onBack?.();
        const form = new ModalFormData()
            .title("§l编辑奖品")
            .textField("物品标识符", "minecraft:diamond", prize.id)
            .textField("显示名称", "奖品名称", prize.name)
            .textField("发放数量", "1", String(prize.amount))
            .textField("抽取权重", "10", String(prize.weight))
            .dropdown("稀有度", ["普通", "稀有", "史诗", "传说", "神话"], RARITY_IDS.indexOf(prize.rarity));
        Utils.showForm(player, form, (res) => {
            if (!res.canceled) {
                const [itemId, displayName, amount, weight, rarityIndex] = res.formValues;
                const normalizedId = String(itemId || "").trim().toLowerCase();
                const maxStack = this.getMaxStack(normalizedId);
                if (/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(normalizedId) && maxStack) {
                    try {
                        this.mutateCustomPool(poolId, current => {
                            const target = current.items.find(item => item.key === prizeKey);
                            if (!target) return;
                            target.id = normalizedId;
                            target.name = this.cleanText(displayName, normalizedId, 80);
                            target.amount = this.number(amount, target.amount, 1, maxStack);
                            target.weight = this.number(weight, target.weight, 1, 1000000);
                            target.rarity = RARITY_IDS[this.number(rarityIndex, 0, 0, 4)];
                        });
                    } catch (error) { Utils.tell(player, `§c保存失败：${error}`); }
                } else Utils.tell(player, "§c物品标识符格式无效，或当前世界没有注册该物品。");
            }
            onBack?.();
        });
    }

    static openPityConfigUI(player, poolId, onBack = null) {
        const pool = this.getCustomPools().find(entry => entry.id === poolId);
        if (!pool?.items?.length) {
            Utils.tell(player, "§c请先添加奖品。");
            return onBack?.();
        }
        const options = ["禁用保底", ...pool.items.map(item => item.name)];
        const currentIndex = Math.max(0, pool.items.findIndex(item => item.key === pool.pityPrizeKey) + 1);
        const form = new ModalFormData()
            .title("§l§d配置指定奖品保底")
            .dropdown("保底奖品", options, currentIndex)
            .textField("触发抽数（1–10000）", "例如：80", String(pool.pityThreshold || 80));
        Utils.showForm(player, form, (res) => {
            if (!res.canceled) {
                const [selectedIndex, threshold] = res.formValues;
                try {
                    this.mutateCustomPool(poolId, current => {
                        if (selectedIndex === 0) {
                            current.pityPrizeKey = null;
                            current.pityThreshold = 0;
                        } else {
                            current.pityPrizeKey = current.items[selectedIndex - 1]?.key || null;
                            current.pityThreshold = this.number(threshold, 80, 1, 10000);
                        }
                    });
                } catch (error) { Utils.tell(player, `§c保存失败：${error}`); }
            }
            onBack?.();
        });
    }

    static openDeletePoolUI(player, poolId, onBack = null) {
        const pool = this.getCustomPools().find(entry => entry.id === poolId);
        if (!pool) return onBack?.();
        const form = new MessageFormData()
            .title("§l§4删除自定义奖池")
            .body(`§c确定永久删除【${pool.name}】吗？玩家在该奖池的保底计数将不再使用。`)
            .button1("§4确认删除")
            .button2("§7取消");
        Utils.showForm(player, form, (res) => {
            if (res.selection === 0) {
                try { this.saveCustomPools(this.getCustomPools().filter(entry => entry.id !== poolId)); }
                catch (error) { Utils.tell(player, `§c删除失败：${error}`); }
            }
            onBack?.();
        });
    }
}
