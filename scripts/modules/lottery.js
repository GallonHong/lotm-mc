import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { WeaponManager } from "./weapon.js";

/**
 * 抽奖系统管理器
 * 支持权重抽取、单抽/十连抽、欧皇广播与奖池预览
 */
export class LotteryManager {
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

        const pools = Config.lottery.pools;
        for (const pool of pools) {
            form.button(`${pool.name}\n§r§8单抽: ${pool.singleCost} | 十连: ${pool.tenCost}`, pool.icon);
        }

        if (onBack) {
            form.button("§l§c🔙 返回上级\n§r§8返回主菜单", "textures/ui/cancel");
        }

        Utils.showForm(player, form, (res) => {

            if (res.selection < pools.length) {
                const selectedPool = pools[res.selection];
                this.openPoolActionUI(player, selectedPool, () => this.openLotteryMainUI(player, onBack));
            } else if (onBack) {
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
        const form = new ActionFormData()
            .title(`§l${pool.name}`)
            .body(
                `§7═════════════════════════\n` +
                `§f当前资产: ${Utils.formatCurrency(balance)}\n` +
                `§7奖池说明: §f${pool.description}\n` +
                `§7═════════════════════════`
            )
            .button(`§l§a🎯 单抽 1 次\n§r§8消耗 ${pool.singleCost} 金币`, "textures/ui/generic_single_coin")
            .button(`§l§6🌟 十连抽取\n§r§8消耗 ${pool.tenCost} 金币 (特惠)`, "textures/ui/generic_ten_coins")
            .button(`§l§b📜 奖池内容与概率\n§r§8查看全部可抽取物品`, "textures/ui/book_metas_default");

        if (onBack) {
            form.button("§l§c🔙 返回奖池列表\n§r§8选择其他奖池", "textures/ui/cancel");
        }

        Utils.showForm(player, form, (res) => {

            if (res.selection === 0) {
                this.executeDraw(player, pool, 1, () => this.openPoolActionUI(player, pool, onBack));
            } else if (res.selection === 1) {
                this.executeDraw(player, pool, 10, () => this.openPoolActionUI(player, pool, onBack));
            } else if (res.selection === 2) {
                this.openPoolPrizesPreviewUI(player, pool, () => this.openPoolActionUI(player, pool, onBack));
            } else if (onBack) {
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

        // 扣款
        EconomyManager.removeBalance(player, cost);

        // 计算奖品
        const items = pool.items;
        const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);

        const results = [];
        let hasRareOrAbove = false;

        for (let i = 0; i < count; i++) {
            let rnd = Math.random() * totalWeight;
            let chosen = items[0];

            for (const item of items) {
                if (rnd < item.weight) {
                    chosen = item;
                    break;
                }
                rnd -= item.weight;
            }

            results.push(chosen);

            // 发放物品
            if (chosen.isWeapon) {
                WeaponManager.giveGun(player);
            } else {
                Utils.giveItem(player, chosen.id, chosen.amount);
            }

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

        // 播放音效
        if (hasRareOrAbove) {
            Utils.sound.rareWin(player);
        } else {
            Utils.sound.buy(player);
        }

        // 展示抽奖结果视窗
        let resultText = `§7═════════ 抽奖结果 (${count} 连抽) ═════════\n\n`;
        for (let i = 0; i < results.length; i++) {
            const it = results[i];
            const rarityInfo = Config.lottery.rarities[it.rarity] || { name: "普通", color: "§7" };
            resultText += `§f[${i + 1}] [${rarityInfo.color}${rarityInfo.name}§f] ${it.name}\n`;
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
        const totalWeight = pool.items.reduce((sum, it) => sum + it.weight, 0);

        let content = `§7═════════ 奖池概率公示 ═════════\n\n`;
        for (const it of pool.items) {
            const rarityInfo = Config.lottery.rarities[it.rarity] || { name: "普通", color: "§7" };
            const chance = ((it.weight / totalWeight) * 100).toFixed(1);
            content += `[${rarityInfo.color}${rarityInfo.name}§r] ${it.name} §7- 概率: §e${chance}%\n`;
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
}
