import { world, system } from "@minecraft/server";
import { Config } from "./config.js";
import { Utils } from "./utils.js";
import { EconomyManager } from "./modules/economy.js";
import { ShopManager } from "./modules/shop.js";
import { LandManager } from "./modules/land.js";
import { LotteryManager } from "./modules/lottery.js";
import { MenuManager } from "./modules/menu.js";
import { WeaponManager } from "./modules/weapon.js";
import { LotmManager } from "./modules/lotm.js";

/**
 * SAPI 综合系统入口启动脚本
 */
function initSystem() {
    console.warn(`[SAPI System] Initializing ${Config.system.serverName} v${Config.system.version}...`);

    // 1. 初始化经济计分板
    try {
        EconomyManager.getObjective();
    } catch (e) {
        console.warn(`[Economy] Scoreboard init warning: ${e}`);
    }

    // 2. 注册地皮保护事件
    LandManager.registerProtectionEvents();

    // 3. 初始化《诡秘之主》多途径序列 7 非凡系统
    LotmManager.init();

    console.warn(`[SAPI System] All modules (Economy, Shop, Land, Lottery, LOTM) initialized successfully!`);
}

// 启动初始化
system.run(() => {
    initSystem();
});

/**
 * 玩家出生/进入世界事件
 */
world.afterEvents.playerSpawn.subscribe((event) => {
    const { player, initialSpawn } = event;
    if (!Utils.isValid(player)) return;

    // 确保金币初始化
    EconomyManager.getBalance(player);

    // 刷新非凡体质生命上限
    LotmManager.applyHealthProfile(player);

    if (initialSpawn) {
        // 欢迎消息
        Utils.tell(player, `§a欢迎来到 ${Config.system.serverName} §a服务器！`);
        Utils.tell(player, `§7提示：输入 §e!menu §7或手持罗盘右键可随时打开系统菜单。`);
        Utils.tell(player, `§5提示：输入 §d!lotm §5可探索《诡秘之主》多途径超凡秘典！`);

        // 发放快捷菜单道具
        if (Config.system.giveMenuItemOnJoin) {
            const hasCompass = Utils.countItem(player, Config.system.menuItem) > 0;
            if (!hasCompass) {
                Utils.giveItem(
                    player,
                    Config.system.menuItem,
                    1,
                    Config.system.menuItemName,
                    ["§7右键使用可快速打开综合菜单", "§7包含：商店、银行、地皮、抽奖、非凡"]
                );
            }
        }
    }
});

/**
 * 手持物品右键交互事件 (统一能力路由分发)
 */
world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (!Utils.isValid(player) || !itemStack) return;

    const typeId = itemStack.typeId;

    // 1. 快捷菜单罗盘 (右键空气/任意处)
    if (typeId === "minecraft:compass" || typeId === Config.system.menuItem) {
        system.run(() => {
            MenuManager.openMainMenu(player);
        });
        return;
    }

    // 2. 诡秘之主能力路由器分发 (P1 封印物 ➔ P2 媒介 ➔ P3 消耗品)
    system.run(() => {
        LotmManager.handleItemUse(player, itemStack);
    });
});

/**
 * 右键点击方块事件：指南针拦截 / 空手射空气弹 / 媒介施法拦截
 */
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, itemStack } = event;
    if (!Utils.isValid(player)) return;

    // 指南针右键点击方块：拦截并打开主菜单
    if (itemStack && (itemStack.typeId === "minecraft:compass" || itemStack.typeId === Config.system.menuItem)) {
        event.cancel = true;
        system.run(() => {
            MenuManager.openMainMenu(player);
        });
        return;
    }

    // 空手右键方块：按当前途径触发无武器施法
    if (!itemStack) {
        const pathway = LotmManager.getPathway(player);
        if (pathway === "seer") {
            event.cancel = true;
            system.run(() => {
                LotmManager.fireAirBullet(player);
            });
            return;
        } else if (pathway === "hunter") {
            event.cancel = true;
            system.run(() => {
                if (player.isSneaking) LotmManager.PathwayHunter.triggerFlameTide(player, LotmManager);
                else LotmManager.PathwayHunter.fireFlameSpear(player, LotmManager);
            });
            return;
        } else if (pathway === "sun") {
            event.cancel = true;
            system.run(() => {
                if (player.isSneaking) LotmManager.PathwaySun.triggerSunHalo(player, LotmManager);
                else LotmManager.PathwaySun.castHolyLight(player, LotmManager);
            });
            return;
        } else if (pathway === "moon") {
            event.cancel = true;
            system.run(() => {
                if (player.isSneaking) LotmManager.PathwayMoon.triggerDarkWings(player, LotmManager);
                else LotmManager.PathwayMoon.corrosiveClaws(player, LotmManager);
            });
            return;
        } else if (pathway === "assassin") {
            event.cancel = true;
            system.run(() => {
                if (player.isSneaking) LotmManager.PathwayAssassin.performMirrorSubstitute(player, LotmManager);
                else LotmManager.PathwayAssassin.castBlackFlame(player, LotmManager);
            });
            return;
        }
    }

    // 手持非凡媒介/消耗品右键方块：直接触发能力
    if (itemStack && itemStack.typeId && itemStack.typeId.startsWith("lotm:")) {
        event.cancel = true;
        system.run(() => {
            LotmManager.handleItemUse(player, itemStack);
        });
        return;
    }
});

/**
 * 右键点击实体事件：指南针拦截 / 空手施法 / 媒介施法拦截
 */
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, itemStack } = event;
    if (!Utils.isValid(player)) return;

    // 指南针右键点击实体：拦截并打开主菜单
    if (itemStack && (itemStack.typeId === "minecraft:compass" || itemStack.typeId === Config.system.menuItem)) {
        event.cancel = true;
        system.run(() => {
            MenuManager.openMainMenu(player);
        });
        return;
    }

    // 空手右键实体：按当前途径触发无武器施法
    if (!itemStack) {
        const pathway = LotmManager.getPathway(player);
        if (pathway === "seer") {
            event.cancel = true;
            system.run(() => {
                LotmManager.fireAirBullet(player);
            });
            return;
        } else if (pathway === "hunter") {
            event.cancel = true;
            system.run(() => {
                if (player.isSneaking) LotmManager.PathwayHunter.triggerFlameTide(player, LotmManager);
                else LotmManager.PathwayHunter.fireFlameSpear(player, LotmManager);
            });
            return;
        } else if (pathway === "sun") {
            event.cancel = true;
            system.run(() => {
                if (player.isSneaking) LotmManager.PathwaySun.triggerSunHalo(player, LotmManager);
                else LotmManager.PathwaySun.castHolyLight(player, LotmManager);
            });
            return;
        } else if (pathway === "moon") {
            event.cancel = true;
            system.run(() => {
                if (player.isSneaking) LotmManager.PathwayMoon.triggerDarkWings(player, LotmManager);
                else LotmManager.PathwayMoon.corrosiveClaws(player, LotmManager);
            });
            return;
        } else if (pathway === "assassin") {
            event.cancel = true;
            system.run(() => {
                if (player.isSneaking) LotmManager.PathwayAssassin.performMirrorSubstitute(player, LotmManager);
                else LotmManager.PathwayAssassin.castBlackFlame(player, LotmManager);
            });
            return;
        }
    }

    // 手持非凡媒介/消耗品右键实体：直接触发能力
    if (itemStack && itemStack.typeId && itemStack.typeId.startsWith("lotm:")) {
        event.cancel = true;
        system.run(() => {
            LotmManager.handleItemUse(player, itemStack);
        });
        return;
    }
});

/**
 * 玩家受击与伤害事件：记录战斗心跳、触发非凡武器命中被动并拦截触发【纸人替身】
 */
world.afterEvents.entityHurt.subscribe((event) => {
    const { hurtEntity, damage, damageSource } = event;

    // 触发攻击者手持非凡武器命中被动 (余烬、破晓额外伤害、血月吸血)
    const attacker = damageSource && damageSource.damagingEntity;
    if (attacker && attacker.typeId === "minecraft:player" && hurtEntity) {
        LotmManager.handleAttackHit(attacker, hurtEntity);
    }

    if (!hurtEntity || hurtEntity.typeId !== "minecraft:player") return;

    const player = /** @type {import("@minecraft/server").Player} */ (hurtEntity);
    if (!Utils.isValid(player)) return;

    // 记录进入战斗 tick
    LotmManager.playerInCombat.set(player.id, system.currentTick);

    // 检查致命伤害纸人替身
    try {
        const hp = player.getComponent("health");
        if (hp && hp.currentValue <= damage + 2) {
            LotmManager.triggerFatalSubstitute(player);
        }
    } catch {}
});

/**
 * 处理聊天栏快捷指令。
 * chatSend 在部分稳定版 Script API 中不存在，因此订阅必须做能力检测。
 */
function handleChatCommand(event) {
    const { sender: player, message } = event;
    const msg = message.trim().toLowerCase();
    const cancelCommand = () => {
        if ("cancel" in event) event.cancel = true;
    };

    // 菜单指令
    if (msg === "!menu" || msg === "!cd" || msg === "!caidan" || msg === "！菜单" || msg === "!菜单") {
        cancelCommand();
        system.run(() => MenuManager.openMainMenu(player));
        return;
    }

    // 非凡能力与诡秘之主指令
    if (msg === "!lotm" || msg === "!guimi" || msg === "!非凡" || msg === "!途径") {
        cancelCommand();
        system.run(() => LotmManager.openAbilityMenu(player));
        return;
    }

    // 商店指令
    if (msg === "!shop" || msg === "!商店" || msg === "!sd") {
        cancelCommand();
        system.run(() => ShopManager.openShopCategoryUI(player));
        return;
    }

    // 地皮领地指令
    if (msg === "!land" || msg === "!plot" || msg === "!地皮" || msg === "!领地") {
        cancelCommand();
        system.run(() => LandManager.openPlotMainUI(player));
        return;
    }

    // 抽奖指令
    if (msg === "!lottery" || msg === "!choujiang" || msg === "!抽奖" || msg === "!cj") {
        cancelCommand();
        system.run(() => LotteryManager.openLotteryMainUI(player));
        return;
    }

    // 银行与转账指令
    if (msg === "!pay" || msg === "!转账" || msg === "!zz") {
        cancelCommand();
        system.run(() => EconomyManager.openTransferUI(player));
        return;
    }

    if (msg === "!money" || msg === "!balance" || msg === "!金币" || msg === "!qb") {
        cancelCommand();
        system.run(() => EconomyManager.openBankUI(player));
        return;
    }

    // 管理员控制台
    if (msg === "!admin" || msg === "!gm" || msg === "!op") {
        cancelCommand();
        system.run(() => MenuManager.openAdminPanel(player));
        return;
    }

    // ==========================================
    // PRD 9.3 开发者多途径序列 7 指令
    // ==========================================

    // !seq7 <magician|pyro|weapon|nightmare|sun|vampire|witch>
    if (msg.startsWith("!seq7 ") || msg.startsWith("!seq ")) {
        cancelCommand();
        const arg = msg.split(" ")[1];
        const aliasMap = {
            magician: "seer",
            seer: "seer",
            魔术师: "seer",
            占卜家: "seer",
            pyro: "hunter",
            hunter: "hunter",
            纵火家: "hunter",
            猎人: "hunter",
            weapon: "warrior",
            warrior: "warrior",
            武器大师: "warrior",
            战士: "warrior",
            nightmare: "darkness",
            darkness: "darkness",
            梦魇: "darkness",
            不眠者: "darkness",
            sun: "sun",
            太阳神官: "sun",
            太阳: "sun",
            vampire: "moon",
            moon: "moon",
            吸血鬼: "moon",
            药师: "moon",
            witch: "assassin",
            assassin: "assassin",
            女巫: "assassin",
            刺客: "assassin",
            none: "none",
            "0": "none",
            普通人: "none",
        };

        const targetPathway = aliasMap[arg];
        if (targetPathway) {
            system.run(() => {
                LotmManager.setPathway(player, targetPathway);
                LotmManager.giveFocusKit(player);
                const profile = LotmManager.PathwayProfileRegistry.getProfile(targetPathway);
                Utils.broadcast(`§5§l[序列晋升] §e玩家 §f${player.name} §e晋升为 §6${profile.title} §e(血量: ${profile.maxHealth} HP, 灵性: ${profile.maxSpirituality})！`);
                Utils.sound.success(player);
            });
        } else {
            Utils.tell(player, "§c可用序列7途径：magician (魔术师), pyro (纵火家), weapon (武器大师), nightmare (梦魇), sun (太阳神官), vampire (吸血鬼), witch (女巫), none (普通人)");
        }
        return;
    }

    // !artifact give <id>
    if (msg.startsWith("!artifact give ")) {
        cancelCommand();
        const artId = msg.replace("!artifact give ", "").trim();
        const fullId = artId.startsWith("lotm:") ? artId : `lotm:${artId}`;
        system.run(() => {
            if (LotmManager.ArtifactManager.isArtifact(fullId)) {
                Utils.giveItem(player, fullId, 1, `§l§6【非凡封印物】§c${artId}`, ["§7由开发者控制台颁发", "§c注意：具有负面代价与收容要求"]);
                Utils.tell(player, `§a已生成非凡武器【${fullId}】！输入 !artifact inspect 可查看其代价与收容要求。`);
                Utils.sound.success(player);
            } else {
                Utils.tell(player, "§c无效的非凡武器ID！可选: ashen_reaper, dawn_greatsword, silent_pointer, blood_moon_rapier, mirror_split_dagger, arsenal_box, death_knell");
            }
        });
        return;
    }

    // !artifact inspect 查看手持封印物状态
    if (msg === "!artifact inspect" || msg === "!artifact" || msg === "!封印物") {
        cancelCommand();
        system.run(() => {
            LotmManager.ArtifactManager.inspect(player);
        });
        return;
    }

    // !profile 查看当前体质档案
    if (msg === "!profile" || msg === "!属性") {
        cancelCommand();
        system.run(() => {
            const pathway = LotmManager.getPathway(player);
            const profile = LotmManager.PathwayProfileRegistry.getProfile(pathway);
            const sp = LotmManager.getSpirituality(player);
            Utils.tell(
                player,
                `§6═══════【非凡体质档案】═══════\n` +
                `§f途径名称: §e${profile.name} (${profile.sequenceName})\n` +
                `§f最大生命: §c${profile.maxHealth} HP §7(${profile.maxHealth / 2} 颗心)\n` +
                `§f当前灵性: §d${sp} §7/ §e${profile.maxSpirituality} ✧\n` +
                `§f脱战回灵: §a+${profile.regenOutOfCombat}/s §8| §f战斗回灵: §a+${profile.regenInCombat}/s\n` +
                `§6═════════════════════════════`
            );
        });
        return;
    }

    // !givefocus 领取当前途径专属媒介
    if (msg === "!givefocus" || msg === "!媒介") {
        cancelCommand();
        system.run(() => {
            LotmManager.giveFocusKit(player);
            Utils.sound.success(player);
        });
        return;
    }

    // !sp / !灵性 回满灵性
    if (msg === "!sp" || msg === "!灵性") {
        cancelCommand();
        system.run(() => {
            const max = LotmManager.getMaxSpirituality(player);
            Utils.setProp(player, "lotm:sp", max);
            Utils.tell(player, `§b§l[灵性充盈] §e灵性值已瞬间回满至 §b${max} 点§e！`);
            Utils.sound.success(player);
        });
        return;
    }

    // !status list 查看自身状态
    if (msg === "!status list" || msg === "!状态") {
        cancelCommand();
        system.run(() => {
            const statuses = LotmManager.StatusEffectManager.entityStatuses.get(player.id);
            if (!statuses || statuses.size === 0) {
                Utils.tell(player, "§a当前身上没有任何负面或控制非凡状态！");
            } else {
                let text = "§6═══════【当前非凡状态】═══════\n";
                for (const [sName, sData] of statuses.entries()) {
                    const remainSec = Math.max(0, Math.ceil((sData.expiresAtTick - system.currentTick) / 20));
                    text += `§e• ${sName}: §f剩余 ${remainSec} 秒 (强度: ${sData.value})\n`;
                }
                text += "§6════════════════════════════";
                Utils.tell(player, text);
            }
        });
        return;
    }

    // !status clear 清除所有状态
    if (msg === "!status clear" || msg === "!清除状态") {
        cancelCommand();
        system.run(() => {
            LotmManager.StatusEffectManager.clearAllStatuses(player);
            Utils.tell(player, "§a所有非凡状态已全部清除！");
            Utils.sound.success(player);
        });
        return;
    }

    // !combatlog 切换战斗日志
    if (msg === "!combatlog" || msg === "!日志") {
        cancelCommand();
        system.run(() => {
            const cur = LotmManager.ArtifactManager.combatLogEnabled.get(player.id) || false;
            LotmManager.ArtifactManager.combatLogEnabled.set(player.id, !cur);
            Utils.tell(player, `§e[战斗日志] 已${!cur ? "§a开启" : "§c关闭"}详细非凡战斗结算日志！`);
        });
        return;
    }
}

const beforeChatSend = world.beforeEvents.chatSend;
const afterChatSend = world.afterEvents.chatSend;

if (beforeChatSend && typeof beforeChatSend.subscribe === "function") {
    beforeChatSend.subscribe(handleChatCommand);
} else if (afterChatSend && typeof afterChatSend.subscribe === "function") {
    afterChatSend.subscribe(handleChatCommand);
    console.warn("[SAPI System] beforeEvents.chatSend is unavailable; chat shortcuts will be visible to other players.");
} else {
    console.warn("[SAPI System] Chat events are unavailable in this Script API version. Use the compass menu or /scriptevent commands.");
}

/**
 * ScriptEvent 指令唤起监听
 */
system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;

    const player = /** @type {import("@minecraft/server").Player} */ (sourceEntity);

    if (id === "system:menu" || id === "gui:menu" || id === "menu:open") {
        MenuManager.openMainMenu(player);
    } else if (id === "system:lotm" || id === "gui:lotm" || id === "lotm:open") {
        LotmManager.openAbilityMenu(player);
    } else if (id === "system:shop" || id === "gui:shop" || id === "shop:open") {
        ShopManager.openShopCategoryUI(player);
    } else if (id === "system:land" || id === "gui:land" || id === "land:open") {
        LandManager.openPlotMainUI(player);
    } else if (id === "system:lottery" || id === "gui:lottery" || id === "lottery:open") {
        LotteryManager.openLotteryMainUI(player);
    } else if (id === "system:bank" || id === "gui:bank" || id === "bank:open") {
        EconomyManager.openBankUI(player);
    }
});
