import { world, system } from "@minecraft/server";
import { Config } from "./config.js";
import { Utils } from "./utils.js";
import { EconomyManager } from "./modules/economy.js";
import { ShopManager } from "./modules/shop.js";
import { LandManager } from "./modules/land.js";
import { LotteryManager } from "./modules/lottery.js";
import { MarketManager } from "./modules/market.js";
import { ServerMenuManager } from "./modules/server_menu.js";
import { Integration } from "./modules/integration.js";
import { TeleportManager } from "./modules/teleport.js";
import { RegionManager } from "./modules/region.js";
import { AuditManager } from "./modules/audit.js";

function initServerSystem() {
    console.warn(`[SAPI Server] Initializing ${Config.system.serverName} Server Addon v${Config.system.version}...`);
    try { EconomyManager.getObjective(); } catch (error) { console.warn(`[Economy] ${error}`); }
    RegionManager.registerProtectionEvents();
    LandManager.registerProtectionEvents();
    TeleportManager.registerEvents();
    Integration.startServerHeartbeat();
    console.warn("[SAPI Server] Economy, Shop, Land, Lottery, Market, free Warps/Home/TPA/DeathBack, Regions and Audit initialized.");
}

system.run(initServerSystem);

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!Utils.isValid(player)) return;
    EconomyManager.getBalance(player);
    MarketManager.claimPendingPayout(player, initialSpawn);
    TeleportManager.handlePlayerSpawn(player);
    if (!initialSpawn) return;
    Utils.tell(player, `§a欢迎来到 ${Config.system.serverName} §a服务器！`);
    Utils.tell(player, "§7手持罗盘右键可打开服务器菜单。");
    if (Config.system.giveMenuItemOnJoin && Utils.countItem(player, Config.system.menuItem) === 0) {
        Utils.giveItem(player, Config.system.menuItem, 1, Config.system.menuItemName, ["§7右键打开服务器导航菜单"]);
    }
});

const playerLeave = world.afterEvents?.playerLeave;
if (playerLeave && typeof playerLeave.subscribe === "function") {
    playerLeave.subscribe(({ playerId }) => {
        TeleportManager.cooldowns.delete(playerId);
        for (const [id, request] of TeleportManager.requests) {
            if (request.fromId === playerId || request.toId === playerId) TeleportManager.requests.delete(id);
        }
    });
}

world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
    if (!Utils.isValid(player) || !itemStack) return;
    if (itemStack.typeId === Config.system.menuItem) system.run(() => ServerMenuManager.openMainMenu(player));
});

const interceptCompass = (event) => {
    const { player, itemStack } = event;
    if (!Utils.isValid(player) || itemStack?.typeId !== Config.system.menuItem) return;
    event.cancel = true;
    system.run(() => ServerMenuManager.openMainMenu(player));
};

const blockInteract = world.beforeEvents.playerInteractWithBlock;
if (blockInteract?.subscribe) blockInteract.subscribe(interceptCompass);
const entityInteract = world.beforeEvents.playerInteractWithEntity;
if (entityInteract?.subscribe) entityInteract.subscribe(interceptCompass);

function handleChat(event) {
    const player = event.sender;
    const message = event.message.trim().toLowerCase();
    const routes = {
        "!menu": () => ServerMenuManager.openMainMenu(player),
        "!shop": () => ShopManager.openShopCategoryUI(player),
        "!land": () => LandManager.openPlotMainUI(player),
        "!lottery": () => LotteryManager.openLotteryMainUI(player),
        "!market": () => MarketManager.openMainUI(player),
        "!ah": () => MarketManager.openMainUI(player),
        "!寄卖": () => MarketManager.openMainUI(player),
        "!pay": () => EconomyManager.openTransferUI(player),
        "!money": () => EconomyManager.openBankUI(player),
        "!warp": () => TeleportManager.openWarpMenu(player),
        "!warps": () => TeleportManager.openWarpMenu(player),
        "!传送": () => TeleportManager.openWarpMenu(player),
        "!spawn": () => TeleportManager.teleportToSpawn(player),
        "!主城": () => TeleportManager.teleportToSpawn(player),
        "!home": () => TeleportManager.openHomeMenu(player),
        "!tpa": () => TeleportManager.openTpaMenu(player),
        "!back": () => TeleportManager.returnToDeath(player),
        "!返回": () => TeleportManager.returnToDeath(player),
        "!region": () => RegionManager.openAdminMenu(player),
        "!audit": () => AuditManager.openAdminUI(player),
        "!admin": () => ServerMenuManager.openAdminPanel(player),
    };
    const route = routes[message];
    if (!route) return;
    if ("cancel" in event) event.cancel = true;
    system.run(route);
}

const beforeChat = world.beforeEvents.chatSend;
const afterChat = world.afterEvents.chatSend;
if (beforeChat?.subscribe) beforeChat.subscribe(handleChat);
else if (afterChat?.subscribe) afterChat.subscribe(handleChat);

const scriptEvents = system.afterEvents.scriptEventReceive;
if (scriptEvents?.subscribe) {
    scriptEvents.subscribe(({ id, sourceEntity }) => {
        if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;
        const player = sourceEntity;
        if (["system:menu", "gui:menu", "menu:open", "sapi:open"].includes(id)) ServerMenuManager.openMainMenu(player);
        else if (["system:shop", "gui:shop", "shop:open"].includes(id)) ShopManager.openShopCategoryUI(player);
        else if (["system:land", "gui:land", "land:open"].includes(id)) LandManager.openPlotMainUI(player);
        else if (["system:lottery", "gui:lottery", "lottery:open"].includes(id)) LotteryManager.openLotteryMainUI(player);
        else if (["system:market", "gui:market", "market:open"].includes(id)) MarketManager.openMainUI(player);
        else if (["system:bank", "gui:bank", "bank:open"].includes(id)) EconomyManager.openBankUI(player);
        else if (["system:warp", "gui:warp", "warp:open"].includes(id)) TeleportManager.openWarpMenu(player);
        else if (["system:spawn", "spawn:teleport"].includes(id)) TeleportManager.teleportToSpawn(player);
        else if (["system:home", "home:open"].includes(id)) TeleportManager.openHomeMenu(player);
        else if (["system:tpa", "tpa:open"].includes(id)) TeleportManager.openTpaMenu(player);
        else if (["system:back", "death:back"].includes(id)) TeleportManager.returnToDeath(player);
        else if (["system:region", "region:admin"].includes(id)) RegionManager.openAdminMenu(player);
        else if (["system:audit", "audit:admin"].includes(id)) AuditManager.openAdminUI(player);
    });
}
