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

// 商品价格与定义表
const VENDING_ITEMS = {
    food: [
        { typeId: "ab_ve:canned_beef_stew", name: "牛肉炖肉罐头", price: 80, count: 1, icon: "textures/items/food/canned_beef_stew" },
        { typeId: "ab_ve:canned_bacon", name: "咸香培根罐头", price: 80, count: 1, icon: "textures/items/food/canned_bacon" },
        { typeId: "ab_ve:canned_chicken", name: "鲜嫩鸡肉罐头", price: 60, count: 1, icon: "textures/items/food/canned_chicken" },
        { typeId: "ab_ve:canned_tuna", name: "金枪鱼罐头", price: 60, count: 1, icon: "textures/items/food/canned_tuna" },
        { typeId: "ab_ve:canned_tomato", name: "茄汁番茄罐头", price: 60, count: 1, icon: "textures/items/food/canned_tomato" },
        { typeId: "ab_ve:mre", name: "MRE军用单兵口粮", price: 250, count: 1, icon: "textures/items/food/mre" },
        { typeId: "ab_ve:chocolate_bar", name: "高能黑巧克力棒", price: 50, count: 1, icon: "textures/items/food/chocolate_bar" }
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

        // 1. 售货机手动摆放联动（自动生成 2 格高的上半部分）
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

        // 2. 售货机破坏联动（上下双格同时销毁并掉落售货机）
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

        // 3. 玩家右键交互售货机唤出 UI 菜单
        subscribeAfterEvent("playerInteractWithBlock", (event) => {
            const { block, player } = event;
            if (!block || block.typeId !== "ab_ve:vending_machine") return;
            if (!player || !player.isValid() || player.typeId !== "minecraft:player") return;

            // 打开售货机主菜单
            system.run(() => {
                VendingMachine.openMainMenu(player);
            });
        });
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

        const money = VendingMachine.getMoney(player);
        const form = new ActionFormData()
            .title("§l§6[ 废土自动售货机 ]§r")
            .body(`§e💰 您的账户钱包: §a${money.toLocaleString()} 金币§r\n§7请选择需要采购的废土物资类型：§r`)
            .button("🍞 便携战术食品\n§8炖肉、培根罐头、MRE口粮§r", "textures/items/food/mre")
            .button("🥤 废土冷热饮品\n§8能量饮料、波普可乐、烈酒§r", "textures/items/drink/energy_drink")
            .button("💉 战地急救医疗\n§8止血绷带、急救包、强心针§r", "textures/items/medic/first_aid");

        form.show(player).then((res) => {
            if (res.canceled) return;

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
            .body(`§e💰 钱包余额: §a${money.toLocaleString()} 金币§r\n§7点击商品即可直接购买：§r`);

        for (const item of items) {
            form.button(`${item.name}\n§6售价: ${item.price} 金币§r`, item.icon);
        }
        form.button("⬅ 返回主菜单", "textures/ui/refresh_light");

        form.show(player).then((res) => {
            if (res.canceled) return;

            // 点击了返回主菜单
            if (res.selection === items.length) {
                VendingMachine.openMainMenu(player);
                return;
            }

            const chosen = items[res.selection];
            if (chosen) {
                VendingMachine.handlePurchase(player, chosen, categoryKey, title);
            }
        });
    }

    /**
     * 处理购买结算与发货
     */
    static handlePurchase(player, item, categoryKey, title) {
        if (!player || !player.isValid()) return;

        const currentMoney = VendingMachine.getMoney(player);
        if (currentMoney < item.price) {
            player.sendMessage(`§c[自动售货机] 购买失败：金币不足！当前余额: §e${currentMoney}§c，需要: §e${item.price}§c。§r`);
            player.playSound("note.bass", { volume: 1.0, pitch: 0.8 });
            return;
        }

        // 扣款
        if (!VendingMachine.deductMoney(player, item.price)) {
            player.sendMessage("§c[自动售货机] 交易失败：扣款异常，请重试。§r");
            return;
        }

        // 发货
        try {
            player.runCommandAsync(`give @s ${item.typeId} ${item.count}`);
            player.playSound("random.orb", { volume: 1.0, pitch: 1.5 });
            player.playSound("random.pop", { volume: 0.8, pitch: 1.8 });
            player.onScreenDisplay?.setActionBar?.(`§a[售货机] 购买成功！获得 ${item.name}，花费 §e${item.price}§a 金币。§r`);
        } catch (e) {
            console.error(`[ApocalypseVending] Give item error: ${e}`);
        }

        // 保持界面顺畅：0.2秒后重新打开菜单，显示最新余额
        system.runTimeout(() => {
            VendingMachine.openCategoryMenu(player, categoryKey, title);
        }, 4);
    }
}
