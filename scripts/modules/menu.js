import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { ShopManager } from "./shop.js";
import { LandManager } from "./land.js";
import { LotteryManager } from "./lottery.js";
import { WeaponManager } from "./weapon.js";
import { LotmManager } from "./lotm.js";

/**
 * 主菜单与管理员总控管理器
 */
export class MenuManager {
    /**
     * 打开综合系统主菜单
     * @param {import("@minecraft/server").Player} player 
     */
    static openMainMenu(player) {
        if (!Utils.isValid(player)) return;

        try {
            const balance = EconomyManager.getBalance(player);
            const { chunkX, chunkZ } = Utils.getChunkCoords(player.location);
            const isAdmin = Utils.isAdmin(player);
            const seq = LotmManager.getSequence(player);
            const sp = LotmManager.getSpirituality(player);
            const pathway = LotmManager.getPathway(player);
            const profile = LotmManager.PathwayProfileRegistry.getProfile(pathway, seq);
            const sequenceLabel = seq === 0 ? "普通人" : `序列${seq} · ${profile.sequenceName}`;

            const form = new ActionFormData()
                .title(`§l${Config.system.serverName} §r§8- 主菜单`)
                .body(
                    `§7══════════════════════════════\n` +
                    `§f欢迎回来，§e${player.name} §f！\n` +
                    `§f当前资产: ${Utils.formatCurrency(balance)}\n` +
                    `§f非凡阶位: §d${sequenceLabel} §8| §f灵性: §d${sp}\n` +
                    `§f当前位置: §7[${Math.floor(player.location.x)}, ${Math.floor(player.location.y)}, ${Math.floor(player.location.z)}] §8(区块 ${chunkX}, ${chunkZ})\n` +
                    `§7══════════════════════════════\n` +
                    `§7请选择你要打开的功能：`
                )
                .button("§l§6🏦 个人银行\n§r§8资产查询与玩家转账", "textures/ui/Trade2")
                .button("§l§a🛒 全球商店\n§r§8建材矿物与非凡魔药材料", "textures/ui/MCStore_Gold_large")
                .button("§l§2🛡️ 地皮领地\n§r§8购买防爆防熊专属地皮", "textures/ui/village_hero_effect")
                .button("§l§d🎁 幸运抽奖\n§r§8神秘奖池抽取限定武器", "textures/ui/gift_square")
                .button("§l§5🔮 诡秘非凡秘典\n§r§8超凡体系与序列能力", "textures/items/potion_seer")
                .button("§l§e🏆 财富排行\n§r§8查看服务器富豪排行榜", "textures/ui/achievements");

            if (isAdmin) {
                form.button("§l§c⚙️ 管理员控制台\n§r§8金币调控与非凡物品发放", "textures/ui/op");
            }

            form.button("§l§7✖ 关闭菜单", "textures/ui/cancel");

            Utils.showForm(player, form, (res) => {
                switch (res.selection) {
                    case 0:
                        EconomyManager.openBankUI(player, () => this.openMainMenu(player));
                        break;
                    case 1:
                        ShopManager.openShopCategoryUI(player, () => this.openMainMenu(player));
                        break;
                    case 2:
                        LandManager.openPlotMainUI(player, () => this.openMainMenu(player));
                        break;
                    case 3:
                        LotteryManager.openLotteryMainUI(player, () => this.openMainMenu(player));
                        break;
                    case 4:
                        LotmManager.openAbilityMenu(player);
                        break;
                    case 5:
                        EconomyManager.openLeaderboardUI(player, () => this.openMainMenu(player));
                        break;
                    case 6:
                        if (isAdmin) {
                            this.openAdminPanel(player, () => this.openMainMenu(player));
                        }
                        break;
                }
            });
        } catch (err) {
            console.error("[MenuManager] Error in openMainMenu:", err);
        }
    }

    /**
     * 打开管理员控制台
     * @param {import("@minecraft/server").Player} player 
     * @param {Function} [onBack] 
     */
    static openAdminPanel(player, onBack = null) {
        if (!Utils.isAdmin(player)) {
            Utils.tell(player, "§c你没有权限访问管理员控制台！");
            return;
        }

        const onlinePlayers = world.getAllPlayers();
        const form = new ActionFormData()
            .title("§l§c⚙️ 管理员控制台")
            .body(
                `§7═════════════════════════\n` +
                `§f在线玩家人数: §e${onlinePlayers.length}\n` +
                `§7═════════════════════════\n` +
                `§7请选择管理功能：`
            )
            .button("§l§6💵 玩家金币管理\n§r§8修改/增减指定玩家余额", "textures/ui/Trade2")
            .button("§l§4🗑️ 强制删除当前地皮\n§r§8清除当前区块的领地保护", "textures/ui/trash")
            .button("§l§e📢 发布全服公告\n§r§8向所有玩家广播重要通知", "textures/ui/accessibility_glyph_color")
            .button("§l§a🎁 全服发放福利金币\n§r§8为所有在线玩家发放金币", "textures/ui/gift_square")
            .button("§l§6⚔️ 7大高阶封印物神兵库\n§r§8一键领取原著全部2级/3级封印物", "textures/items/death_knell")
            .button("§l§5🔮 开发者·非凡阶位调试\n§r§8一键升序/满消化/回满灵性", "textures/items/potion_magician")
            .button("§l§e🧪 获取已实现途径测试礼包\n§r§8获取全部魔药及序列7媒介", "textures/items/potion_seer")
            .button("§l§7⬅ 返回上一级", "textures/ui/undo");

        Utils.showForm(player, form, (res) => {
            switch (res.selection) {
                case 0:
                    this.openPlayerMoneyAdmin(player, onBack);
                    break;
                case 1:
                    this.forceDeleteCurrentPlot(player, onBack);
                    break;
                case 2:
                    this.openBroadcastModal(player, onBack);
                    break;
                case 3:
                    this.openGiftAllModal(player, onBack);
                    break;
                case 4:
                    this.openArtifactVaultUI(player, onBack);
                    break;
                case 5:
                    this.openLotmDevPanel(player, onBack);
                    break;
                case 6:
                    // 发放全部 7 途径非凡物资
                    const allPathways = ["seer", "hunter", "warrior", "darkness", "sun", "moon", "assassin", "tyrant"];
                    for (const p of allPathways) {
                        LotmManager.giveFocusKitForPathway(player, p);
                    }
                    LotmManager.giveAllPotionKit(player);
                    Utils.tell(player, "§5§l[物资发放] §a已成功发放当前全部晋升魔药及序列 7 专属媒介与消耗品！");
                    Utils.sound.success(player);
                    if (onBack) onBack();
                    break;
                case 7:
                    if (onBack) onBack();
                    break;
            }
        });
    }

    /**
     * 打开高阶封印物神兵军火库
     */
    static openArtifactVaultUI(player, onBack = null) {
        const form = new ActionFormData()
            .title("§l§6⚔️ 7大高阶封印物神兵库")
            .body("§7请选择你想直接领取的原著高阶封印物：")
            .button("§l§6【2级封印物】丧钟短铳\n§7弱点射击 / 致命一击 / 死鸣反噬", "textures/items/death_knell")
            .button("§l§c【3级封印物】灰烬收割者\n§7斩击破甲 / 范围爆炸 / 引燃反噬", "textures/items/ashen_reaper")
            .button("§l§e【3级封印物】晨曦圣剑\n§7光之风暴 / 真实破防 / 眩目反噬", "textures/items/dawn_greatsword")
            .button("§l§9【3级封印物】静默之针\n§7绝对静音 / 静默立场 / 失语反噬", "textures/items/silent_pointer")
            .button("§l§4【3级封印物】血月刺剑\n§7撕裂流血 / 吸血恢复 / 嗜血反噬", "textures/items/blood_moon_rapier")
            .button("§l§d【3级封印物】镜面裂魂短匕\n§7空间折跃 / 镜像背刺 / 脆弱反噬", "textures/items/mirror_split_dagger")
            .button("§l§f【3级封印物】万象军备匣\n§7兵刃共鸣 / 弹药炼成 / 沉重反噬", "textures/items/arsenal_box")
            .button("§l§a🎁 一键领取全部 7 大封印物", "textures/ui/gift_square")
            .button("§l§7⬅ 返回上级", "textures/ui/undo");

        Utils.showForm(player, form, (res) => {
            const artifacts = [
                "lotm:death_knell",
                "lotm:ashen_reaper",
                "lotm:dawn_greatsword",
                "lotm:silent_pointer",
                "lotm:blood_moon_rapier",
                "lotm:mirror_split_dagger",
                "lotm:arsenal_box"
            ];

            if (res.selection < 7) {
                const id = artifacts[res.selection];
                LotmManager.ArtifactManager.giveArtifact(player, id);
                Utils.sound.success(player);
            } else if (res.selection === 7) {
                for (const id of artifacts) {
                    LotmManager.ArtifactManager.giveArtifact(player, id);
                }
                Utils.tell(player, "§6§l[军火库] §a已成功将 7 大高阶封印物全部发放至你的背包！");
                Utils.sound.rareWin(player);
            }
            if (onBack) onBack();
        });
    }

    /**
     * 开发者非凡阶位与调试通道面板
     */
    static openLotmDevPanel(player, onBack = null) {
        const currSeq = LotmManager.getSequence(player);
        const currDig = LotmManager.getDigestion(player);
        const currSp = LotmManager.getSpirituality(player);

        const form = new ActionFormData()
            .title("§l§5🔮 开发者·非凡阶位调试通道")
            .body(
                `§7══════════════════════════════\n` +
                `§f当前阶位: §e${currSeq === 0 ? "普通人" : "序列 " + currSeq}\n` +
                `§d✧ 当前灵性: §f${currSp}\n` +
                `§a📜 当前消化度: §f${currDig}%\n` +
                `§7══════════════════════════════\n` +
                `§7请选择一键调试操作：`
            )
            .button("§l§5🌟 当前途径设为【序列7】\n§r§8普通人测试时默认占卜家途径", "textures/items/potion_magician")
            .button("§l§c🎭 当前途径设为【序列8】\n§r§8保留当前途径并刷新对应档案", "textures/items/potion_clown")
            .button("§l§9🔮 当前途径设为【序列9】\n§r§8保留当前途径并刷新对应档案", "textures/items/potion_seer")
            .button("§l§a📜 一键拉满当前魔药消化度 (100%)\n§r§8达成安全晋升条件", "textures/items/book_enchanted")
            .button("§l§b⚡ 一键瞬间回满当前灵性值\n§r§8无需等待自动冥想回复", "textures/items/experience_bottle")
            .button("§l§4🔄 重置为【普通人 (序列0)】\n§r§8清除全部非凡属性与位阶", "textures/ui/trash")
            .button("§l§7⬅ 返回管理员菜单", "textures/ui/undo");

        Utils.showForm(player, form, (res) => {
            if (res.canceled) {
                if (onBack) onBack();
                return;
            }

            switch (res.selection) {
                case 0:
                    LotmManager.setSequence(player, 7);
                    Utils.broadcast(`§5§l[开发者调试] §e管理员 §f${player.name} §e已切换当前途径到 §5序列7§e！`);
                    Utils.sound.success(player);
                    break;
                case 1:
                    LotmManager.setSequence(player, 8);
                    Utils.broadcast(`§c§l[开发者调试] §e管理员 §f${player.name} §e已切换当前途径到 §c序列8§e！`);
                    Utils.sound.success(player);
                    break;
                case 2:
                    LotmManager.setSequence(player, 9);
                    Utils.broadcast(`§9§l[开发者调试] §e管理员 §f${player.name} §e已切换当前途径到 §9序列9§e！`);
                    Utils.sound.success(player);
                    break;
                case 3:
                    Utils.setProp(player, "lotm:digestion", 100);
                    Utils.tell(player, "§a§l[调试成功] §e当前序列魔药消化度已成功设为 §a100%§e！");
                    Utils.sound.success(player);
                    break;
                case 4:
                    const maxSp = LotmManager.getMaxSpirituality(player);
                    Utils.setProp(player, "lotm:sp", maxSp);
                    Utils.tell(player, `§b§l[调试成功] §e灵性值已瞬间回满至 §b${maxSp} 点§e！`);
                    Utils.sound.success(player);
                    break;
                case 5:
                    LotmManager.setPathway(player, "none");
                    Utils.tell(player, "§e§l[重置成功] §7你已重置为普通人身份。");
                    Utils.sound.warn(player);
                    break;
                case 6:
                    if (onBack) onBack();
                    return;
            }
            if (onBack) onBack();
        });
    }

    /**
     * 管理员修改指定玩家金币
     */
    static openPlayerMoneyAdmin(player, onBack = null) {
        const onlinePlayers = world.getAllPlayers();
        const playerNames = onlinePlayers.map((p) => p.name);

        const form = new ModalFormData()
            .title("§l§6💵 玩家金币调控")
            .dropdown("选择目标玩家", playerNames)
            .dropdown("操作类型", ["增加金币 (+)", "扣除金币 (-)", "直接设定 (=)"])
            .textField("输入变动金币数值", "例如: 10000");

        Utils.showForm(player, form, (res) => {
            if (res.canceled) {
                if (onBack) onBack();
                return;
            }

            const [pIndex, opIndex, amountStr] = res.formValues;
            const targetPlayer = onlinePlayers[pIndex];
            const amount = parseInt(amountStr);

            if (isNaN(amount) || amount <= 0) {
                Utils.tell(player, "§c请输入有效的数字！");
                if (onBack) onBack();
                return;
            }

            if (!Utils.isValid(targetPlayer)) {
                Utils.tell(player, "§c目标玩家已无效！");
                if (onBack) onBack();
                return;
            }

            if (opIndex === 0) {
                EconomyManager.addBalance(targetPlayer, amount);
                Utils.tell(player, `§a已为玩家 §e${targetPlayer.name} §a增加 ${Utils.formatCurrency(amount)}`);
                Utils.tell(targetPlayer, `§a管理员为你发放了 ${Utils.formatCurrency(amount)}！`);
            } else if (opIndex === 1) {
                EconomyManager.removeBalance(targetPlayer, amount);
                Utils.tell(player, `§a已扣除玩家 §e${targetPlayer.name} §a的 ${Utils.formatCurrency(amount)}`);
            } else if (opIndex === 2) {
                EconomyManager.setBalance(targetPlayer, amount);
                Utils.tell(player, `§a已将玩家 §e${targetPlayer.name} §a的金币设置为 ${Utils.formatCurrency(amount)}`);
            }
            Utils.sound.success(player);
            if (onBack) onBack();
        });
    }

    /**
     * 强制删除当前所处地皮
     */
    static forceDeleteCurrentPlot(player, onBack = null) {
        const { chunkX, chunkZ } = Utils.getChunkCoords(player.location);
        const dimension = player.dimension.id;
        const plot = LandManager.getPlot(dimension, chunkX, chunkZ);

        if (!plot) {
            Utils.tell(player, `§c当前区块 [${chunkX}, ${chunkZ}] 暂无地皮领地！无需删除。`);
            if (onBack) onBack();
            return;
        }

        const form = new MessageFormData()
            .title("§l§4⚠️ 确认强拆地皮")
            .body(`§c确定要强制清除地皮 §e${plot.name} §c吗？\n§f所属玩家: §e${plot.ownerName}\n§f区块坐标: §7[${chunkX}, ${chunkZ}]\n§c此操作不可撤销！`)
            .button1("§l§4确认删除")
            .button2("§l§7取消");

        Utils.showForm(player, form, (res) => {
            if (res.selection === 0) {
                LandManager.deletePlot(dimension, chunkX, chunkZ);
                Utils.tell(player, `§a已成功强行删除该地皮！`);
                Utils.sound.success(player);
            }
            if (onBack) onBack();
        });
    }

    /**
     * 发布全服公告
     */
    static openBroadcastModal(player, onBack = null) {
        const form = new ModalFormData()
            .title("§l§e📢 发布全服公告")
            .textField("公告内容", "输入你要广播的消息...");

        Utils.showForm(player, form, (res) => {
            if (res.canceled) {
                if (onBack) onBack();
                return;
            }
            const [content] = res.formValues;
            if (!content || content.trim().length === 0) {
                Utils.tell(player, "§c公告内容不能为空！");
            } else {
                Utils.broadcast(`§e[管理员 ${player.name}] §f${content}`);
                Utils.sound.success(player);
            }
            if (onBack) onBack();
        });
    }

    /**
     * 全服在线玩家发放福利金币
     */
    static openGiftAllModal(player, onBack = null) {
        const form = new ModalFormData()
            .title("§l§a🎁 全服发放福利金币")
            .textField("每人发放金额", "例如: 5000");

        Utils.showForm(player, form, (res) => {
            if (res.canceled) {
                if (onBack) onBack();
                return;
            }
            const [amountStr] = res.formValues;
            const amount = parseInt(amountStr);
            if (isNaN(amount) || amount <= 0) {
                Utils.tell(player, "§c请输入有效的数字！");
            } else {
                const players = world.getAllPlayers();
                for (const p of players) {
                    if (Utils.isValid(p)) {
                        EconomyManager.addBalance(p, amount);
                        Utils.tell(p, `§6🎉 管理员向全服发放了福利！你获得了 ${Utils.formatCurrency(amount)}！`);
                    }
                }
                Utils.broadcast(`§a管理员 §e${player.name} §a向全服在线玩家发放了每人 ${Utils.formatCurrency(amount)} 的福利礼金！`);
                Utils.sound.success(player);
            }
            if (onBack) onBack();
        });
    }
}
