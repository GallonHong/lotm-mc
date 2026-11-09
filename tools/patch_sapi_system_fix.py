# -*- coding: utf-8 -*-
import sys, re

sys.stdout.reconfigure(encoding='utf-8')

# 1. Patch utils.js for robust cancellationReason check
utils_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/utils.js"
with open(utils_path, "r", encoding="utf-8") as f:
    u_content = f.read()

old_cancel = '''			const reason = String(res.cancelationReason || "");
			if (reason.includes("UserBusy") && maxRetries > 0) {
				system.runTimeout(() => {
					Utils.showForm(player, form, callback, maxRetries - 1);
				}, 3);
				return;
			}'''

# Replace with regex for any whitespace
u_pattern = r'const reason = String\(res\.cancelationReason \|\| ""\);[\s\S]*?Utils\.showForm\(player, form, callback, maxRetries - 1\);[\s\S]*?return;\s*\}'
new_cancel = '''const reason = String(res.cancelationReason ?? res.cancellationReason ?? "").toLowerCase();
			if ((reason.includes("userbusy") || reason.includes("user_busy") || reason.includes("busy")) && maxRetries > 0) {
				system.runTimeout(() => {
					Utils.showForm(player, form, callback, maxRetries - 1);
				}, 3);
				return;
			}'''

u_content, u_cnt = re.subn(u_pattern, new_cancel, u_content)
if u_cnt > 0:
    with open(utils_path, "w", encoding="utf-8") as f:
        f.write(u_content)
    print("Patched utils.js successfully!")
else:
    print("Warning: regex for utils.js did not match!")

# 2. Patch economy.js to add redeemLegacyCoinItems
econ_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/economy.js"
with open(econ_path, "r", encoding="utf-8") as f:
    e_content = f.read()

if "redeemLegacyCoinItems" not in e_content:
    redeem_fn = '''
	/**
	 * 自动兑换背包中的历史“金币折算物资”绿宝石
	 * @param {import("@minecraft/server").Player} player 
	 * @returns {number} 兑换所得金币总数
	 */
	static redeemLegacyCoinItems(player) {
		if (!player) return 0;
		const inventory = player.getComponent("inventory") || player.getComponent("minecraft:inventory");
		if (!inventory || !inventory.container) return 0;

		const container = inventory.container;
		let totalRefund = 0;
		let redeemedCount = 0;

		for (let i = 0; i < container.size; i++) {
			const item = container.getItem(i);
			if (!item || !item.nameTag) continue;
			const match = item.nameTag.match(/金币折算物资[（\(](\\d+)[）\)]/);
			if (match) {
				const unitValue = parseInt(match[1], 10);
				if (!isNaN(unitValue) && unitValue > 0) {
					const stackValue = unitValue * item.amount;
					totalRefund += stackValue;
					redeemedCount += item.amount;
					container.setItem(i, undefined);
				}
			}
		}

		if (totalRefund > 0) {
			this.addBalance(player, totalRefund);
			Utils.sound.success(player);
			Utils.tell(player, `§a系统已自动将背包中 §b${redeemedCount} §a个【金币折算物资】全额兑换为 §e${totalRefund} §a金币！`);
		}
		return totalRefund;
	}
'''
    # Insert right before the last closing brace
    last_brace_idx = e_content.rfind("}")
    if last_brace_idx != -1:
        e_content = e_content[:last_brace_idx] + redeem_fn + e_content[last_brace_idx:]
        with open(econ_path, "w", encoding="utf-8") as f:
            f.write(e_content)
        print("Added redeemLegacyCoinItems to economy.js successfully!")

# 3. Patch server_menu.js to call redeemLegacyCoinItems
menu_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/server_menu.js"
with open(menu_path, "r", encoding="utf-8") as f:
    m_content = f.read()

if "EconomyManager.redeemLegacyCoinItems(player);" not in m_content:
    m_content = m_content.replace(
        "if (!Utils.isValid(player)) return;\n  const balance = EconomyManager.getBalance(player);",
        "if (!Utils.isValid(player)) return;\n  EconomyManager.redeemLegacyCoinItems(player);\n  const balance = EconomyManager.getBalance(player);"
    )
    with open(menu_path, "w", encoding="utf-8") as f:
        f.write(m_content)
    print("Patched server_menu.js to auto-redeem legacy coin items!")

# 4. Patch main.js in sapi_server_bp for robust compass interaction
main_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/main.js"
with open(main_path, "r", encoding="utf-8") as f:
    main_content = f.read()

# Replace compass intercept section
compass_pattern = r'function requestCompassMenu\(player\) \{[\s\S]*?const entityInteract = world\.beforeEvents\.playerInteractWithEntity;[\s\S]*?if \(entityInteract\?\.subscribe\) entityInteract\.subscribe\(interceptCompass\);'

new_compass_section = '''function isCompass(itemStack, player = null) {
	if (itemStack && itemStack.typeId === Config.system.menuItem) return true;
	if (player && Utils.isValid(player)) {
		try {
			const eq = player.getComponent("minecraft:equippable") || player.getComponent("equippable");
			const held = eq?.getEquipment("Mainhand") || eq?.getEquipment("mainhand");
			if (held && held.typeId === Config.system.menuItem) return true;
		} catch {}
	}
	return false;
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
}'''

main_content, m_cnt = re.subn(compass_pattern, new_compass_section, main_content)
if m_cnt > 0:
    # Also clean gray text in playerSpawn
    main_content = main_content.replace('Utils.tell(player, "§8手持罗盘右键可打开服务器菜单。");', 'Utils.tell(player, "§f手持罗盘右键可打开服务器菜单。");')
    main_content = main_content.replace('["§8右键打开服务器导航菜单"]', '["§f右键打开服务器导航菜单"]')
    # Also add redeemLegacyCoinItems in playerSpawn
    if "EconomyManager.redeemLegacyCoinItems(player);" not in main_content:
        main_content = main_content.replace(
            "EconomyManager.getBalance(player);",
            "EconomyManager.getBalance(player);\n  EconomyManager.redeemLegacyCoinItems(player);"
        )
    with open(main_path, "w", encoding="utf-8") as f:
        f.write(main_content)
    print("Patched main.js for robust compass interaction successfully!")
else:
    print("Warning: regex for main.js did not match!")
