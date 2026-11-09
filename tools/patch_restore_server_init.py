# -*- coding: utf-8 -*-
import os, sys

sys.stdout.reconfigure(encoding='utf-8')

# 1. Update utils.js
utils_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/utils.js"
with open(utils_path, "r", encoding="utf-8") as f:
    u = f.read()

u = u.replace(
    'const inventory = player.getComponent("inventory");',
    'const inventory = player.getComponent("minecraft:inventory") || player.getComponent("inventory");'
)
with open(utils_path, "w", encoding="utf-8") as f:
    f.write(u)
print("Updated utils.js inventory component lookup!")

# 2. Update config.js
cfg_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/config.js"
with open(cfg_path, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('menuItem: "sapi:menu_compass",', 'menuItem: "minecraft:compass",')
c = c.replace('fallbackMenuItem: "minecraft:compass",', 'fallbackMenuItem: "sapi:menu_compass",')
with open(cfg_path, "w", encoding="utf-8") as f:
    f.write(c)
print("Updated config.js menuItem!")

# 3. Update main.js
main_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/main.js"
with open(main_path, "r", encoding="utf-8") as f:
    m = f.read()

# Check if initServerSystem is already there
if "initServerSystem" not in m:
    server_init_code = '''
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
'''
    # Insert right before requestCompassMenu
    target = 'function requestCompassMenu(player) {'
    if target in m:
        m = m.replace(target, server_init_code + '\n' + target)
        print("Inserted initServerSystem and playerSpawn into main.js!")
    else:
        print("Warning: target function requestCompassMenu not found!")

# Also add !compass and !指南针 to chat routes
chat_target = '"!menu": () => ServerMenuManager.openMainMenu(player),'
chat_replacement = '''"!menu": () => ServerMenuManager.openMainMenu(player),
  "!cd": () => ServerMenuManager.openMainMenu(player),
  "!caidan": () => ServerMenuManager.openMainMenu(player),
  "!菜单": () => ServerMenuManager.openMainMenu(player),
  "！菜单": () => ServerMenuManager.openMainMenu(player),
  "!compass": () => { ensurePlayerCompass(player); Utils.tell(player, "§a已为您补发导航指南针！"); },
  "!指南针": () => { ensurePlayerCompass(player); Utils.tell(player, "§a已为您补发导航指南针！"); },'''

if '"!compass"' not in m and chat_target in m:
    m = m.replace(chat_target, chat_replacement)
    print("Added chat shortcuts to main.js!")

with open(main_path, "w", encoding="utf-8") as f:
    f.write(m)
print("Updated main.js successfully!")
