import { world, system, EquipmentSlot } from "@minecraft/server";
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
import { PlotSafeZone } from "./modules/plot_safe_zone.js";
import { RegionManager } from "./modules/region.js";
import { AuditManager } from "./modules/audit.js";
import { OperationsManager } from "./modules/operations.js";
import { SafeManager } from "./modules/safe.js";
import { ItemCleanupManager } from "./modules/item_cleanup.js";
import { SocialManager } from "./modules/social.js";
import { CombatManager } from "./modules/combat.js";
import { WantedManager } from "./modules/wanted.js";
import { PlayerVendingManager } from "./modules/player_vending.js";

const compassMenuTicks = new Map();

// 自定义物品组件必须在 startup/worldInitialize 阶段订阅，不能延迟到 system.run。
SafeManager.registerEvents();
PlayerVendingManager.registerEvents();
// 注册专属快捷菜单罗盘自定义组件 (支持在空中右键瞬间无缝唤起)
if (world.beforeEvents?.worldInitialize?.subscribe) {
	world.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
		try {
			itemComponentRegistry.registerCustomComponent("sapi:menu_compass_interact", {
				onUse: ({ source: player }) => {
					requestCompassMenu(player);
				}
			});
		} catch (err) {
			console.warn(`[MenuCompass] component registration failed: ${err}`);
		}
	});
}


function isCompass(itemStack, player = null) {
	const isMatch = (id) => id === "sapi:menu_compass" || id === "minecraft:compass" || id === Config.system.menuItem || id === Config.system.fallbackMenuItem;
	if (itemStack && isMatch(itemStack.typeId)) return true;
	if (player && Utils.isValid(player)) {
		try {
			const eq = player.getComponent("minecraft:equippable") || player.getComponent("equippable");
			const held = eq?.getEquipment(EquipmentSlot?.Mainhand || "Mainhand") || eq?.getEquipment("mainhand");
			if (held && isMatch(held.typeId)) return true;
		} catch {}
	}
	return false;
}


function ensurePlayerCompass(player) {
	if (!Config.system.giveMenuItemOnJoin || !Utils.isValid(player)) return;
	const hasCompass = Utils.countItem(player, "sapi:menu_compass") > 0 || Utils.countItem(player, "minecraft:compass") > 0;
	if (hasCompass) return;
	
	const menuItemId = Config.system.menuItem || "minecraft:compass";
	let given = false;
	try {
		given = Utils.giveItem(player, menuItemId, 1, Config.system.menuItemName, [
			"§f右键使用可快速打开服务器综合菜单",
			"§f包含：商店、银行、地皮、抽奖、传送等功能"
		]);
	} catch (err) {
		console.warn(`[MenuCompass] Failed to give ${menuItemId}: ${err}`);
	}
	
	if (!given && menuItemId !== "minecraft:compass") {
		try {
			Utils.giveItem(player, "minecraft:compass", 1, Config.system.menuItemName, [
				"§f右键使用可快速打开服务器综合菜单",
				"§f包含：商店、银行、地皮、抽奖、传送等功能"
			]);
		} catch {}
	}
}

function initServerSystem() {
	console.warn(`[SAPI Server] Initializing ${Config.system.serverName} Server Addon v${Config.system.version}...`);
	try { EconomyManager.getObjective(); } catch (error) { console.warn(`[Economy] ${error}`); }
	CombatManager.registerEvents();
	RegionManager.registerProtectionEvents();
 PlotSafeZone.start();
	LandManager.registerProtectionEvents();
	TeleportManager.registerEvents();
	Integration.startServerHeartbeat();
	ItemCleanupManager.start();
	system.runInterval(() => WantedManager.tickDecay(), 200);

	// 遍历当前已在游戏中的玩家（针对世界重载/重进情况）
	for (const player of world.getAllPlayers()) {
		try {
			ensurePlayerCompass(player);
			EconomyManager.redeemLegacyCoinItems(player);
		} catch (e) {
			console.warn(`[SAPI Server] Player init error for ${player?.name}: ${e}`);
		}
	}
	console.warn("[SAPI Server] Economy, Shop, Safe, Land, Lottery, Market, Social, item cleanup, free Warps/Home/TPA/DeathBack, Regions and Audit initialized.");
}

system.run(initServerSystem);

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
	if (!Utils.isValid(player)) return;
	if (WantedManager.enforceBlacklist(player)) return;
	system.runTimeout(() => Integration.probeDailyEvents(player), 20);
	EconomyManager.getBalance(player);
	SocialManager.initializePlayer(player);
	MarketManager.claimPendingPayout(player, initialSpawn);
	PlayerVendingManager.claimInsuranceCompensation(player, initialSpawn);
	TeleportManager.handlePlayerSpawn(player);
	
	// 自动兑换旧绿宝石折算物资为真金币
	try { EconomyManager.redeemLegacyCoinItems(player); } catch {}

	// 确保玩家持有导航菜单
	ensurePlayerCompass(player);

	if (!initialSpawn) return;
	Utils.tell(player, `§a欢迎来到 ${Config.system.serverName} §a服务器！`);
	Utils.tell(player, "§e手持罗盘右键可打开服务器菜单。");
});

const playerDie = world.afterEvents?.entityDie;
if (playerDie?.subscribe) playerDie.subscribe(event => {
	if (event.deadEntity?.typeId === "minecraft:player") CombatManager.onPlayerDeath(event.deadEntity);
});

const playerLeave = world.afterEvents?.playerLeave;
if (playerLeave && typeof playerLeave.subscribe === "function") {
	playerLeave.subscribe(({ playerId, playerName }) => {
		compassMenuTicks.delete(playerId);
		WantedManager.onPlayerLeave(playerId);
		TeleportManager.cooldowns.delete(playerId);
		if (playerName) SocialManager.onPlayerLeave(playerName);
		for (const [id, request] of TeleportManager.requests) {
			if (request.fromId === playerId || request.toId === playerId) TeleportManager.requests.delete(id);
		}
	});
}

function requestCompassMenu(player) {
	if (!Utils.isValid(player)) return;
	const lastTick = Number(compassMenuTicks.get(player.id) ?? -1000);
	if (system.currentTick - lastTick < 6) return;
	compassMenuTicks.set(player.id, system.currentTick);
	system.runTimeout(() => {
		if (Utils.isValid(player)) {
			ServerMenuManager.openMainMenu(player);
		}
	}, 1);
}

// 1. 空中单点右键 (itemUse)
if (world.afterEvents?.itemUse?.subscribe) {
	world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
		if (isCompass(itemStack, player)) requestCompassMenu(player);
	});
}
if (world.beforeEvents?.itemUse?.subscribe) {
	world.beforeEvents.itemUse.subscribe((event) => {
		if (isCompass(event.itemStack, event.source)) {
			event.cancel = true;
			requestCompassMenu(event.source);
		}
	});
}

// 2. 方块右键 (itemUseOn)
if (world.afterEvents?.itemUseOn?.subscribe) {
	world.afterEvents.itemUseOn.subscribe(({ source: player, itemStack }) => {
		if (isCompass(itemStack, player)) requestCompassMenu(player);
	});
}
if (world.beforeEvents?.itemUseOn?.subscribe) {
	world.beforeEvents.itemUseOn.subscribe((event) => {
		if (isCompass(event.itemStack, event.source)) {
			event.cancel = true;
			requestCompassMenu(event.source);
		}
	});
}

// 3. 拦截方块互动 (playerInteractWithBlock)
const interceptCompassBlock = (event) => {
	const { player, itemStack } = event;
	if (isCompass(itemStack, player)) {
		event.cancel = true;
		requestCompassMenu(player);
	}
};
if (world.beforeEvents?.playerInteractWithBlock?.subscribe) {
	world.beforeEvents.playerInteractWithBlock.subscribe(interceptCompassBlock);
}

// 4. 拦截实体互动 (playerInteractWithEntity)
const interceptCompassEntity = (event) => {
	const { player, itemStack } = event;
	if (isCompass(itemStack, player)) {
		event.cancel = true;
		requestCompassMenu(player);
	}
};
if (world.beforeEvents?.playerInteractWithEntity?.subscribe) {
	world.beforeEvents.playerInteractWithEntity.subscribe(interceptCompassEntity);
}

function handleChat(event) {
 const player = event.sender;
 const message = event.message.trim().toLowerCase();
 const routes = {
  "!menu": () => ServerMenuManager.openMainMenu(player),
  "!cd": () => ServerMenuManager.openMainMenu(player),
  "!caidan": () => ServerMenuManager.openMainMenu(player),
  "!菜单": () => ServerMenuManager.openMainMenu(player),
  "！菜单": () => ServerMenuManager.openMainMenu(player),
  "!compass": () => { ensurePlayerCompass(player); Utils.tell(player, "§a已为您补发导航指南针！"); },
  "!指南针": () => { ensurePlayerCompass(player); Utils.tell(player, "§a已为您补发导航指南针！"); },
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
  "!daily": () => OperationsManager.openPlayerMenu(player),
  "!dungeon": () => SocialManager.openDungeon(player),
  "!签到": () => OperationsManager.openPlayerMenu(player),
  "!redeem": () => OperationsManager.openRedeemModal(player),
  "!兑换码": () => OperationsManager.openRedeemModal(player),
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
 scriptEvents.subscribe(({ id, message, sourceEntity }) => {
  if (id === "sapi:daily_pong") {
   Integration.receiveDailyPong(message);
   return;
  }
  if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;
  const player = sourceEntity;
  // Share the same debounce as native compass events: Apocalypse Life also forwards sapi:open.
  if (["system:menu", "gui:menu", "menu:open", "sapi:open"].includes(id)) requestCompassMenu(player);
  else if (["system:shop", "gui:shop", "shop:open"].includes(id)) ShopManager.openShopCategoryUI(player);
  else if (id === "sapi:shop") ShopManager.openCategoryById(player, message || "all");
  else if (["system:land", "gui:land", "land:open"].includes(id)) LandManager.openPlotMainUI(player);
  else if (["system:lottery", "gui:lottery", "lottery:open"].includes(id)) LotteryManager.openLotteryMainUI(player);
  else if (["system:market", "gui:market", "market:open"].includes(id)) MarketManager.openMainUI(player);
  else if (["system:bank", "gui:bank", "bank:open"].includes(id)) EconomyManager.openBankUI(player);
  else if (["system:warp", "gui:warp", "warp:open"].includes(id)) TeleportManager.openWarpMenu(player);
  else if (["system:spawn", "spawn:teleport"].includes(id)) TeleportManager.teleportToSpawn(player);
  else if (["system:home", "home:open"].includes(id)) TeleportManager.openHomeMenu(player);
  else if (["system:tpa", "tpa:open"].includes(id)) TeleportManager.openTpaMenu(player);
  else if (["system:back", "death:back"].includes(id)) TeleportManager.returnToDeath(player);
  else if (["system:daily", "daily:open", "system:redeem"].includes(id)) OperationsManager.openPlayerMenu(player);
  else if (["system:dungeon", "dungeon:open"].includes(id)) SocialManager.openDungeon(player);
  else if (["system:region", "region:admin"].includes(id)) RegionManager.openAdminMenu(player);
  else if (["system:audit", "audit:admin"].includes(id)) AuditManager.openAdminUI(player);
  else if (id === "system:cleanup") ItemCleanupManager.handleCommand(player, message);
  else if (["system:social", "social:open"].includes(id)) SocialManager.openSocialMenu(player);
  else if (["system:wanted", "wanted:open"].includes(id)) WantedManager.openPlayerMenu(player);
 });
}
