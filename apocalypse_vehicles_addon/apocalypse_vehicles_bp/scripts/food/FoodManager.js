import { world } from "@minecraft/server";

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

export class FoodManager {
    static init() {
        console.warn("[ApocalypseFood] FoodManager initializing...");

        subscribeAfterEvent("itemCompleteUse", (event) => {
            const player = event.source;
            const item = event.itemStack;
            if (!player || !player.isValid() || player.typeId !== "minecraft:player" || !item) return;

            const typeId = item.typeId;
            if (!typeId.startsWith("ab_ve:")) return;

            FoodManager.handleConsumption(player, typeId);
        });
    }

    /**
     * 处理末日食物、饮品与医疗品的食用结算与药效分发
     */
    static handleConsumption(player, typeId) {
        try {
            const health = player.getComponent("minecraft:health");

            switch (typeId) {
                // ==================== 1. 经典罐头食品 ====================
                case "ab_ve:canned_beef_stew":
                    player.onScreenDisplay?.setActionBar?.("§6[罐头] 享用了浓郁牛肉炖肉罐头！饱食度大幅恢复。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.0 });
                    break;

                case "ab_ve:canned_bacon":
                    player.onScreenDisplay?.setActionBar?.("§6[罐头] 享用了咸香培根罐头！饱食度大幅恢复。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.0 });
                    break;

                case "ab_ve:canned_chicken":
                    player.onScreenDisplay?.setActionBar?.("§6[罐头] 享用了鲜嫩鸡肉罐头！§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.0 });
                    break;

                case "ab_ve:canned_tuna":
                    player.onScreenDisplay?.setActionBar?.("§6[罐头] 享用了金枪鱼罐头！§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.0 });
                    break;

                case "ab_ve:canned_tomato":
                    if (health) {
                        health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + 2));
                    }
                    player.onScreenDisplay?.setActionBar?.("§6[罐头] 爽口茄汁番茄！恢复少量生命。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.0 });
                    break;

                case "ab_ve:mre":
                    // 军用自热口粮：生命恢复 I (120s) + 伤害吸收额外黄心 (120s)
                    try {
                        player.addEffect("regeneration", 2400, { amplifier: 0 });
                        player.addEffect("absorption", 2400, { amplifier: 1 });
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§l§c【军用口粮 MRE】体能拉满！获得持续愈合与战术吸收护盾。§r");
                    player.playSound("random.burp", { volume: 1.0, pitch: 1.0 });
                    break;

                case "ab_ve:chocolate_bar":
                    // 高能黑巧：速度 I (20s)
                    try {
                        player.addEffect("speed", 400, { amplifier: 0 });
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§6[食品] 高能黑巧克力！行动步伐轻盈。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.2 });
                    break;

                case "ab_ve:canned_beans":
                    player.onScreenDisplay?.setActionBar?.("§6[罐头] 茄汁烘豆饱腹甘甜！饱食度恢复。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.0 });
                    break;

                case "ab_ve:canned_ham":
                    player.onScreenDisplay?.setActionBar?.("§6[罐头] 厚切午餐肉香气扑鼻！饱食度大幅恢复。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.0 });
                    break;

                case "ab_ve:canned_fruit":
                    if (health) health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + 4));
                    player.onScreenDisplay?.setActionBar?.("§6[罐头] 糖水黄桃水果罐头！清甜解渴并恢复 4 HP。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.1 });
                    break;

                case "ab_ve:canned_sardine":
                    player.onScreenDisplay?.setActionBar?.("§6[罐头] 油浸沙丁鱼罐头！优质蛋白质补充完毕。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.0 });
                    break;

                case "ab_ve:canned_spaghetti":
                    player.onScreenDisplay?.setActionBar?.("§6[罐头] 意式肉酱通心粉！能量充沛。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.0 });
                    break;

                case "ab_ve:ramen_cup":
                    try { player.addEffect("regeneration", 200, { amplifier: 0 }); } catch {}
                    player.onScreenDisplay?.setActionBar?.("§e[食品] 热气腾腾的红烧牛肉泡面！驱散严寒并温和愈合。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.0 });
                    break;

                case "ab_ve:granola_bar":
                    try { player.addEffect("speed", 300, { amplifier: 0 }); } catch {}
                    player.onScreenDisplay?.setActionBar?.("§a[食品] 燕麦坚果能量棒！提供持续体力。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.2 });
                    break;

                case "ab_ve:meat_jerky":
                    try { player.addEffect("strength", 400, { amplifier: 0 }); } catch {}
                    player.onScreenDisplay?.setActionBar?.("§c[食品] 风干黑椒牛肉干！富有嚼劲，获得力量强化。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 0.9 });
                    break;

                case "ab_ve:chip_potato":
                    player.onScreenDisplay?.setActionBar?.("§e[食品] 香脆烘烤薯片！咔哧作响。§r");
                    player.playSound("random.eat", { volume: 0.8, pitch: 1.3 });
                    break;

                case "ab_ve:tactical_sandwich":
                    try {
                        player.addEffect("regeneration", 600, { amplifier: 0 });
                        player.addEffect("resistance", 600, { amplifier: 0 });
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§l§e【战术三明治】大口满足！体能抗性与持续生命恢复。§r");
                    player.playSound("random.burp", { volume: 1.0, pitch: 1.0 });
                    break;

                // ==================== 2. 战术废土饮品 ====================
                case "ab_ve:energy_drink":
                    // 功能饮料：速度 II (30s) + 急迫 I (30s)
                    try {
                        player.addEffect("speed", 600, { amplifier: 1 });
                        player.addEffect("haste", 600, { amplifier: 0 });
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§e[饮品] 战术能量饮料爆发！移速大幅强化，突围就绪！§r");
                    player.playSound("random.drink", { volume: 1.0, pitch: 1.1 });
                    break;

                case "ab_ve:popsi_cola":
                    try {
                        player.removeEffect("weakness");
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§b[饮品] 畅饮冰爽波普可乐！消除了虚弱疲劳。§r");
                    player.playSound("random.drink", { volume: 1.0, pitch: 1.0 });
                    break;

                case "ab_ve:exp_coke":
                    try {
                        player.addEffect("jump_boost", 400, { amplifier: 0 });
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§c[饮品] 畅饮特调可乐！轻盈跳跃提升。§r");
                    player.playSound("random.drink", { volume: 1.0, pitch: 1.0 });
                    break;

                case "ab_ve:vodka":
                    // 伏特加：力量 I (45s) + 抗性提升 I (45s) + 微醺反胃 (6s)
                    try {
                        player.addEffect("strength", 900, { amplifier: 0 });
                        player.addEffect("resistance", 900, { amplifier: 0 });
                        player.addEffect("nausea", 120, { amplifier: 0 });
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§f[饮品] 烈酒入喉！痛觉钝化，防御与近战力量爆发！§r");
                    player.playSound("random.drink", { volume: 1.0, pitch: 0.9 });
                    break;

                case "ab_ve:bottle_water":
                    try {
                        player.removeEffect("nausea");
                    } catch {}
                    if (health) {
                        health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + 2));
                    }
                    player.onScreenDisplay?.setActionBar?.("§b[饮品] 纯净甘冽水源，神清气爽。§r");
                    player.playSound("random.drink", { volume: 1.0, pitch: 1.0 });
                    break;

                // ==================== 3. 战地急救医疗 ====================
                case "ab_ve:bandage":
                    // 止血绷带：恢复 4 点生命 (2 颗心) + 消除中毒
                    if (health) {
                        health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + 4));
                    }
                    try {
                        player.removeEffect("poison");
                        player.removeEffect("fatal_poison");
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§f[医疗] 止血绷带包扎完毕！恢复 4 点生命。§r");
                    player.playSound("armor.equip_leather", { volume: 1.0, pitch: 1.0 });
                    break;

                case "ab_ve:first_aid":
                    // 战术急救包：恢复 12 点生命 (6 颗心) + 生命恢复 I (15s)
                    if (health) {
                        health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + 12));
                    }
                    try {
                        player.addEffect("regeneration", 300, { amplifier: 0 });
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§l§a【急救包 IFAK】全面急救处置！大幅回血并持续自愈。§r");
                    player.playSound("random.levelup", { volume: 0.9, pitch: 1.4 });
                    break;

                case "ab_ve:painkiller":
                    // 止痛药片：2 颗吸收黄心 (90s)
                    try {
                        player.addEffect("absorption", 1800, { amplifier: 0 });
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§e[医疗] 服用止痛药片！获得 2 颗临时伤害吸收护甲心。§r");
                    player.playSound("random.pop", { volume: 0.8, pitch: 1.2 });
                    break;

                case "ab_ve:adrenaline":
                    // 肾上腺素针：清除迟缓与虚弱 + 速度 III (15s) + 急迫 II (15s)
                    try {
                        player.removeEffect("slowness");
                        player.removeEffect("weakness");
                        player.addEffect("speed", 300, { amplifier: 2 });
                        player.addEffect("haste", 300, { amplifier: 1 });
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§l§c【肾上腺素】强心针激发！清除迟缓，极速爆发脱困！§r");
                    player.playSound("random.orb", { volume: 1.2, pitch: 1.6 });
                    break;

                case "ab_ve:antidote":
                    // 解毒血清：清除所有中毒/凋零/反胃 + 30s 抗性提升
                    try {
                        player.removeEffect("poison");
                        player.removeEffect("fatal_poison");
                        player.removeEffect("wither");
                        player.removeEffect("nausea");
                        player.addEffect("resistance", 600, { amplifier: 0 });
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§a[医疗] 广谱血清生效！排清体内所有毒素与负面生化异常。§r");
                    player.playSound("random.drink", { volume: 1.0, pitch: 1.2 });
                    break;

                case "ab_ve:splint":
                    // 骨折应急夹板：消除缓慢致残
                    try {
                        player.removeEffect("slowness");
                    } catch {}
                    player.onScreenDisplay?.setActionBar?.("§6[医疗] 夹板固定肢体！行动受限迟缓已解除。§r");
                    player.playSound("armor.equip_generic", { volume: 0.8, pitch: 0.9 });
                    break;
            }
        } catch (err) {
            console.error(`[ApocalypseFood] Consumption error: ${err}`);
        }
    }
}
