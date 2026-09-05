import { world, BlockPermutation, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

/**
 * 健壮的事件订阅方法
 */
function subscribeAfterEvent(eventName, handler) {
    try {
        const events = world.afterEvents;
        const signal = events ? events[eventName] : undefined;
        if (!signal || typeof signal.subscribe !== "function") return false;
        signal.subscribe(handler);
        return true;
    } catch {
        return false;
    }
}

// 扩展全量末日食品与价格表
const VENDING_ITEMS = {
    food: [
        { typeId: "ab_ve:canned_beef_stew", name: "牛肉炖肉罐头", price: 80, count: 1, icon: "textures/items/food/canned_beef_stew" },
        { typeId: "ab_ve:canned_bacon", name: "咸香培根罐头", price: 80, count: 1, icon: "textures/items/food/canned_bacon" },
        { typeId: "ab_ve:canned_chicken", name: "鲜嫩鸡肉罐头", price: 60, count: 1, icon: "textures/items/food/canned_chicken" },
        { typeId: "ab_ve:canned_tuna", name: "金枪鱼罐头", price: 60, count: 1, icon: "textures/items/food/canned_tuna" },
        { typeId: "ab_ve:canned_tomato", name: "茄汁番茄罐头", price: 60, count: 1, icon: "textures/items/food/canned_tomato" },
        { typeId: "ab_ve:canned_ham", name: "精选午餐肉罐头", price: 75, count: 1, icon: "textures/items/food/canned_ham" },
        { typeId: "ab_ve:canned_beans", name: "茄汁烘豆罐头", price: 60, count: 1, icon: "textures/items/food/canned_beans" },
        { typeId: "ab_ve:canned_fruit", name: "糖水什锦水果罐头", price: 50, count: 1, icon: "textures/items/food/canned_fruit" },
        { typeId: "ab_ve:canned_sardine", name: "油浸沙丁鱼罐头", price: 65, count: 1, icon: "textures/items/food/canned_sardine" },
        { typeId: "ab_ve:canned_spaghetti", name: "意式肉酱通心粉", price: 70, count: 1, icon: "textures/items/food/canned_spaghetti" },
        { typeId: "ab_ve:ramen_cup", name: "红烧牛肉桶装泡面", price: 55, count: 1, icon: "textures/items/food/ramen_cup" },
        { typeId: "ab_ve:meat_jerky", name: "风干黑椒牛肉干", price: 85, count: 1, icon: "textures/items/food/meat_jerky" },
        { typeId: "ab_ve:tactical_sandwich", name: "真空战术三明治", price: 120, count: 1, icon: "textures/items/food/tactical_sandwich" },
        { typeId: "ab_ve:chocolate_bar", name: "高能黑巧克力棒", price: 50, count: 1, icon: "textures/items/food/chocolate_bar" },
        { typeId: "ab_ve:granola_bar", name: "高能燕麦坚果棒", price: 40, count: 1, icon: "textures/items/food/granola_bar" },
        { typeId: "ab_ve:chip_potato", name: "香脆烧烤味薯片", price: 35, count: 1, icon: "textures/items/food/chip_potato" },
        { typeId: "ab_ve:mre", name: "MRE军用单兵口粮", price: 250, count: 1, icon: "textures/items/food/mre" }
    ],
    drink: [
        { typeId: "ab_ve:energy_drink", name: "战术能量饮料", price: 100, count: 1, icon: "textures/items/drink/energy_drink" },
        { typeId: "ab_ve:popsi_cola", name: "冰爽波普可乐", price: 40, count: 1, icon: "textures/items/drink/popsi_cola" },
        { typeId: "ab_ve:exp_coke", name: "特调经典可乐", price: 40, count: 1, icon: "textures/items/drink/exp_coke" },
        { typeId: "ab_ve:vodka", name: "伏特加烈酒", price: 120, count: 1, icon: "textures/items/drink/vodka" },
        { typeId: "ab_ve:bottle_water", name: "纯净瓶装水", price: 20, count: 1, icon: "textures/items/drink/bottle_water" }
    ],
    medic: [
        { typeId: "ab_ve:bandage", name: "无菌止血绷带", price: 50, count: 1, icon: "textures/items/medic/bandage" },
        { typeId: "ab_ve:first_aid", name: "战术急救包 IFAK", price: 300, count: 1, icon: "textures/items/medic/first_aid" },
        { typeId: "ab_ve:painkiller", name: "战术止痛药片", price: 100, count: 1, icon: "textures/items/medic/painkiller" },
        { typeId: "ab_ve:adrenaline", name: "肾上腺素自注射针", price: 450, count: 1, icon: "textures/items/medic/adrenaline" },
        { typeId: "ab_ve:antidote", name: "广谱解毒血清", price: 180, count: 1, icon: "textures/items/medic/antidote" },
        { typeId: "ab_ve:splint", name: "骨折应急夹板", price: 80, count: 1, icon: "textures/items/medic/splint" }
    ]
};

export class VendingMachine {
    static init() {
        console.warn("[ApocalypseVending] VendingMachine initializing...");

        // 1. 售货机自定义方块组件（防止玩家手持物品时事件被吃掉）
        try {
            world.beforeEvents.worldInitialize.subscribe((event) => {
                event.blockComponentRegistry.registerCustomComponent(
                    "ab_ve:vending_interact",
                    {
                        onPlayerInteract(e) {
                            const player = e.player;
                            if (!player || !player.isValid()) return;
                            system.run(() => {
                                VendingMachine.openMainMenu(player);
                            });
                        }
                    }
                );
            });
        } catch {}

        // 2. 售货机手动摆放联动（自动生成 2 格高的上半部分）
        subscribeAfterEvent("playerPlaceBlock", (event) => {
            const { block, player } = event;
            if (!block || block.typeId !== "ab_ve:vending_machine") return;

            try {
                const above = block.above();
                if (above && (above.isAir || above.isLiquid)) {
                    const dir = block.permutation.getState("minecraft:cardinal_direction") || "north";
                    above.setPermutation(
                        BlockPermutation.resolve("ab_ve:vending_machine", {
                            "block:part": "upper",
                            "minecraft:cardinal_direction": dir
                        })
                    );
                }
            } catch (e) {
                console.error(`[ApocalypseVending] Place upper block error: ${e}`);
            }
        });

        // 3. 售货机破坏联动（上下双格同时销毁并掉落售货机）
        subscribeAfterEvent("playerBreakBlock", (event) => {
            const { block, brokenBlockPermutation } = event;
            if (!brokenBlockPermutation || brokenBlockPermutation.type.id !== "ab_ve:vending_machine") return;

            try {
                const part = brokenBlockPermutation.getState("block:part");
                if (part === "lower") {
                    const above = block.above();
                    if (above && above.typeId === "ab_ve:vending_machine") {
                        above.setType("minecraft:air");
                    }
                } else if (part === "upper") {
                    const below = block.below();
                    if (below && below.typeId === "ab_ve:vending_machine") {
                        below.setType("minecraft:air");
                    }
                }
            } catch (e) {
                console.error(`[ApocalypseVending] Break sync error: ${e}`);
            }
        });

        // 4. 双重保障：玩家右键交互售货机唤出 UI 菜单
        subscribeAfterEvent("playerInteractWithBlock", (event) => {
            const { block, player } = event;
            if (!block || block.typeId !== "ab_ve:vending_machine") return;
            if (!player || !player.isValid() || player.typeId !== "minecraft:player") return;

            system.run(() => {
                VendingMachine.openMainMenu(player);
            });
        });
    }

    static lastOpenTick = new Map();

    /**
     * 解决客户端 UserBusy 延迟弹窗与界面争抢的安全调用
     */
    static showFormSafe(player, form, onSelect, retries = 5) {
        if (!player || !player.isValid()) return;
        system.runTimeout(() => {
            if (!player || !player.isValid()) return;
            form.show(player).then((res) => {
                if (res.canceled) {
                    const reason = String(res.cancelationReason || "").toLowerCase();
                    if ((reason.includes("userbusy") || reason.includes("user busy")) && retries > 0) {
                        system.runTimeout(() => {
                            VendingMachine.showFormSafe(player, form, onSelect, retries - 1);
                        }, 3);
                    }
                    return;
                }
                // 关键点：在独立 tick 步进中触发后续界面，杜绝上一级界面关闭动画导致的点击丢失与 UserBusy
                system.runTimeout(() => {
                    if (player && player.isValid()) {
                        onSelect(res);
                    }
                }, 1);
            }).catch(() => {});
        }, 1);
    }

    /**
     * 获取玩家 SAPI money 计分板余额
     */
    static getMoney(player) {
        try {
            const objective = world.scoreboard.getObjective("money");
            if (!objective || !player.scoreboardIdentity) return 0;
            const score = objective.getScore(player.scoreboardIdentity);
            return typeof score === "number" ? score : 0;
        } catch {
            return 0;
        }
    }

    /**
     * 扣除玩家 SAPI money 金币
     */
    static deductMoney(player, amount) {
        try {
            const objective = world.scoreboard.getObjective("money");
            if (!objective || !player.scoreboardIdentity) return false;
            const current = VendingMachine.getMoney(player);
            if (current < amount) return false;
            objective.setScore(player.scoreboardIdentity, current - amount);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 自动售货机主分类菜单
     */
    static openMainMenu(player) {
        if (!player || !player.isValid()) return;

        // 8 刻防重入去抖，彻底防止同一交互被方块组件与通用交互双重唤出
        const last = VendingMachine.lastOpenTick.get(player.id) || 0;
        if (system.currentTick - last < 8) return;
        VendingMachine.lastOpenTick.set(player.id, system.currentTick);

        const money = VendingMachine.getMoney(player);
        const form = new ActionFormData()
            .title("§l§6[ 废土自动售货机 ]§r")
            .body(`§e💰 您的账户钱包: §a${money.toLocaleString()} 金币§r\n§7全息感应已激活，请选择采购物资类别：§r`)
            .button("🍞 便携战术食品 (17种)\n§8罐头、泡面、牛肉干、MRE口粮§r", "textures/items/food/mre")
            .button("🥤 废土冷热饮品 (5种)\n§8能量饮料、波普可乐、烈酒§r", "textures/items/drink/energy_drink")
            .button("💉 战地急救医疗 (6种)\n§8止血绷带、急救包、强心针§r", "textures/items/medic/first_aid");

        VendingMachine.showFormSafe(player, form, (res) => {
            if (res.selection === 0) {
                VendingMachine.openCategoryMenu(player, "food", "🍞 便携战术食品");
            } else if (res.selection === 1) {
                VendingMachine.openCategoryMenu(player, "drink", "🥤 废土冷热饮品");
            } else if (res.selection === 2) {
                VendingMachine.openCategoryMenu(player, "medic", "💉 战地急救医疗");
            }
        });
    }

    /**
     * 打开具体商品分类菜单
     */
    static openCategoryMenu(player, categoryKey, title) {
        if (!player || !player.isValid()) return;

        const items = VENDING_ITEMS[categoryKey] || [];
        const money = VendingMachine.getMoney(player);

        const form = new ActionFormData()
            .title(`§l§6${title}§r`)
            .body(`§e💰 账户余额: §a${money.toLocaleString()} 金币§r\n§7点击对应物资即可直接完成购买与出货：§r`);

        items.forEach((item) => {
            form.button(`${item.name}\n§e${item.price} 金币§r`, item.icon);
        });
        form.button("§c⬅ 返回分类主页§r");

        VendingMachine.showFormSafe(player, form, (res) => {
            if (res.selection === items.length) {
                VendingMachine.openMainMenu(player);
                return;
            }
            const selected = items[res.selection];
            if (!selected) return;

            VendingMachine.openPurchaseConfirm(player, selected, categoryKey, title);
        });
    }

    /**
     * 购买确认与出货交付窗口
     */
    static openPurchaseConfirm(player, item, categoryKey, parentTitle) {
        if (!player || !player.isValid()) return;

        const currentMoney = VendingMachine.getMoney(player);
        const canAfford = currentMoney >= item.price;

        const form = new ActionFormData()
            .title(`§l§2采购物资: ${item.name}§r`)
            .body(
                `§7══════════════════════════════§r\n` +
                `§f商品单价: §e${item.price} 金币§r\n` +
                `§f当前钱包: §a${currentMoney.toLocaleString()} 金币§r\n` +
                `§f出货数量: §b×${item.count} 件§r\n` +
                (canAfford ? `§a✔ 余额充裕，点击下方按钮确认付款。§r` : `§c✘ 资金不足！还差 ${item.price - currentMoney} 金币。§r`) +
                `\n§7══════════════════════════════§r`
            )
            .button(canAfford ? "§l§2确认付款出货§r" : "§7余额不足§r", item.icon)
            .button("§c返回上一页§r");

        VendingMachine.showFormSafe(player, form, (res) => {
            if (res.selection === 0 && canAfford) {
                // 扣除金额
                if (VendingMachine.deductMoney(player, item.price)) {
                    // 发放物品到玩家背包或脚下
                    try {
                        const remaining = currentMoney - item.price;
                        player.runCommandAsync(`give @s ${item.typeId} ${item.count}`);
                        player.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.4");
                        player.runCommandAsync("playsound random.pop @s ~~~ 1.0 1.2");
                        player.sendMessage(`§a[售货机] 采购成功！获得 ${item.name} ×${item.count}，剩余钱包: §e${remaining.toLocaleString()} 金币§a。`);
                    } catch (e) {
                        player.sendMessage(`§c[售货机] 出货异常，请联系管理员。`);
                    }
                } else {
                    player.sendMessage(`§c[售货机] 扣款失败，请稍后再试。`);
                }
            } else if (res.selection === 1 || (res.selection === 0 && !canAfford)) {
                VendingMachine.openCategoryMenu(player, categoryKey, parentTitle);
            }
        });
    }
}
