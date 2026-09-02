import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";

/**
 * 经济系统管理器
 * 负责计分板货币绑定、余额存取、转账与财富排行
 */
export class EconomyManager {
    /**
     * 获取或初始化绑定的原版计分板对象
     * @returns {import("@minecraft/server").ScoreboardObjective}
     */
    static getObjective() {
        const objName = Config.economy.scoreboardObjective;
        let objective = world.scoreboard.getObjective(objName);
        if (!objective) {
            objective = world.scoreboard.addObjective(objName, Config.economy.currencyName);
        }
        return objective;
    }

    /**
     * 获取玩家当前金币余额
     * @param {import("@minecraft/server").Player} player 
     * @returns {number}
     */
    static getBalance(player) {
        if (!player) return 0;
        const objective = this.getObjective();
        try {
            // getScore 在所有受支持版本均可用；避免依赖部分运行时缺失的 hasParticipant。
            const currentScore = objective.getScore(player);
            if (typeof currentScore === "number") return currentScore;

            const initScore = Config.economy.initialBalance;
            objective.setScore(player, initScore);
            return initScore;
        } catch {
            try {
                const initScore = Config.economy.initialBalance;
                objective.setScore(player, initScore);
                return initScore;
            } catch {
                return 0;
            }
        }
    }

    /**
     * 设置玩家金币余额
     * @param {import("@minecraft/server").Player} player 
     * @param {number} amount 
     */
    static setBalance(player, amount) {
        if (!player) return;
        const objective = this.getObjective();
        const value = Math.max(0, Math.floor(amount));
        objective.setScore(player, value);
    }

    /**
     * 增加玩家金币余额
     * @param {import("@minecraft/server").Player} player 
     * @param {number} amount 
     * @returns {number} 增加后的最新余额
     */
    static addBalance(player, amount) {
        if (!player || amount <= 0) return this.getBalance(player);
        const current = this.getBalance(player);
        const newBalance = current + Math.floor(amount);
        this.setBalance(player, newBalance);
        return newBalance;
    }

    /**
     * 扣除玩家金币余额
     * @param {import("@minecraft/server").Player} player 
     * @param {number} amount 
     * @returns {boolean} 是否扣除成功
     */
    static removeBalance(player, amount) {
        if (!player || amount <= 0) return false;
        const current = this.getBalance(player);
        const val = Math.floor(amount);
        if (current < val) {
            return false;
        }
        this.setBalance(player, current - val);
        return true;
    }

    /**
     * 检查玩家是否有足够的金币
     * @param {import("@minecraft/server").Player} player 
     * @param {number} amount 
     * @returns {boolean}
     */
    static hasBalance(player, amount) {
        return this.getBalance(player) >= Math.floor(amount);
    }

    /**
     * 执行玩家之间的金币转账
     * @param {import("@minecraft/server").Player} fromPlayer 
     * @param {import("@minecraft/server").Player} toPlayer 
     * @param {number} amount 
     * @returns {{ success: boolean, message: string }}
     */
    static transfer(fromPlayer, toPlayer, amount) {
        const val = Math.floor(amount);
        if (val < Config.economy.minTransferAmount) {
            return { success: false, message: `转账金额不能小于 ${Config.economy.minTransferAmount}` };
        }
        if (val > Config.economy.maxTransferAmount) {
            return { success: false, message: `单次转账金额不能超过 ${Config.economy.maxTransferAmount}` };
        }
        if (fromPlayer.id === toPlayer.id) {
            return { success: false, message: "不能向自己转账！" };
        }
        if (!this.hasBalance(fromPlayer, val)) {
            return { success: false, message: "您的金币余额不足！" };
        }

        // 扣除与增加
        const deducted = this.removeBalance(fromPlayer, val);
        if (!deducted) {
            return { success: false, message: "转账扣款失败，请稍后重试！" };
        }
        this.addBalance(toPlayer, val);

        // 提示双方
        Utils.tell(fromPlayer, `§a成功向玩家 §e${toPlayer.name} §a转账 ${Utils.formatCurrency(val)}`);
        Utils.sound.success(fromPlayer);

        Utils.tell(toPlayer, `§e收到来自玩家 §a${fromPlayer.name} §e的转账：${Utils.formatCurrency(val)}`);
        Utils.sound.buy(toPlayer);

        return { success: true, message: "转账成功！" };
    }

    /**
     * 打开个人银行与资产管理界面
     * @param {import("@minecraft/server").Player} player 
     * @param {Function} [onBack] 
     */
    static openBankUI(player, onBack = null) {
        const balance = this.getBalance(player);
        const form = new ActionFormData()
            .title("§l§6🏦 个人银行与资产")
            .body(
                `§7═════════════════════════\n` +
                `§f玩家姓名: §e${player.name}\n` +
                `§f当前资产: ${Utils.formatCurrency(balance)}\n` +
                `§7═════════════════════════\n` +
                `§7请选择你要进行的资金操作：`
            )
            .button("§l§2💸 玩家转账\n§r§8向在线玩家汇款", "textures/ui/Trade2")
            .button("§l§e🏆 财富排行榜\n§r§8查看全服富豪榜单", "textures/ui/achievements");

        if (onBack) {
            form.button("§l§c🔙 返回上级\n§r§8返回主菜单", "textures/ui/cancel");
        }

        Utils.showForm(player, form, (res) => {

            if (res.selection === 0) {
                this.openTransferUI(player, () => this.openBankUI(player, onBack));
            } else if (res.selection === 1) {
                this.openLeaderboardUI(player, () => this.openBankUI(player, onBack));
            } else if (res.selection === 2 && onBack) {
                onBack();
            }
        });
    }

    /**
     * 打开玩家转账输入弹窗
     * @param {import("@minecraft/server").Player} player 
     * @param {Function} [onBack] 
     */
    static openTransferUI(player, onBack = null) {
        const onlinePlayers = world.getAllPlayers().filter(p => p.id !== player.id);

        if (onlinePlayers.length === 0) {
            const form = new MessageFormData()
                .title("§l§c转账提示")
                .body("当前服务器内没有其他在线玩家，无法进行转账！")
                .button1("§l确定")
                .button2("§l返回");

            Utils.showForm(player, form, () => {
                if (onBack) onBack();
            });
            return;
        }

        const playerNames = onlinePlayers.map(p => p.name);
        const balance = this.getBalance(player);

        const form = new ModalFormData()
            .title("§l§2💸 玩家转账")
            .dropdown(`§f选择收款人:\n§7(你的当前余额: ${Utils.formatCurrency(balance)})`, playerNames)
            .textField("§f转账金额:", "请输入转账金币数量 (例如: 100)");

        Utils.showForm(player, form, (res) => {
            if (res.canceled) {
                if (onBack) onBack();
                return;
            }

            const [targetIndex, amountStr] = res.formValues;
            const targetPlayer = onlinePlayers[targetIndex];
            const amount = parseInt(amountStr);

            if (isNaN(amount) || amount <= 0) {
                Utils.tell(player, "§c转账金额必须为有效正整数！");
                Utils.sound.fail(player);
                return;
            }

            if (!Utils.isValid(targetPlayer)) {
                Utils.tell(player, "§c目标玩家已离线或不可用！");
                Utils.sound.fail(player);
                return;
            }

            const result = this.transfer(player, targetPlayer, amount);
            if (!result.success) {
                Utils.tell(player, `§c${result.message}`);
                Utils.sound.fail(player);
            }
        });
    }

    /**
     * 打开全服在线玩家财富排行榜
     * @param {import("@minecraft/server").Player} player 
     * @param {Function} [onBack] 
     */
    static openLeaderboardUI(player, onBack = null) {
        const allPlayers = world.getAllPlayers();
        const playerStats = allPlayers.map(p => ({
            name: p.name,
            balance: this.getBalance(p)
        })).sort((a, b) => b.balance - a.balance);

        let content = "§7═════════ 🏆 财富榜 TOP 10 ═════════\n\n";
        const medals = ["§6🥇 第 1 名", "§7🥈 第 2 名", "§c🥉 第 3 名"];

        playerStats.slice(0, 10).forEach((item, index) => {
            const rankLabel = medals[index] || `§f[第 ${index + 1} 名]`;
            content += `${rankLabel} §e${item.name} §r- ${Utils.formatCurrency(item.balance)}\n`;
        });

        content += `\n§7══════════════════════════════\n`;
        content += `§f你的当前资产: ${Utils.formatCurrency(this.getBalance(player))}`;

        const form = new ActionFormData()
            .title("§l§e🏆 财富排行榜")
            .body(content)
            .button("§l§a确定 / 刷新", "textures/ui/refresh")
            .button("§l§c🔙 返回", "textures/ui/cancel");

        Utils.showForm(player, form, (res) => {
            if (res.selection === 0) {
                this.openLeaderboardUI(player, onBack);
            } else if (res.selection === 1 && onBack) {
                onBack();
            }
        });
    }
}
