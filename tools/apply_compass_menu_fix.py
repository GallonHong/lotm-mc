# -*- coding: utf-8 -*-
import json, os, sys

sys.stdout.reconfigure(encoding='utf-8')

# 1. Update sapi_server_rp/textures/item_texture.json
it_path = "addons/development/sapi_server_addon/sapi_server_rp/textures/item_texture.json"
with open(it_path, "r", encoding="utf-8") as f:
    it_data = json.load(f)

it_data["texture_data"]["sapi_menu_compass"] = { "textures": "textures/items/compass_item" }
with open(it_path, "w", encoding="utf-8") as f:
    json.dump(it_data, f, indent=2, ensure_ascii=False)
print("Updated sapi_server_rp item_texture.json!")

# 2. Create sapi_server_bp/items/menu_compass.json
menu_item_path = "addons/development/sapi_server_addon/sapi_server_bp/items/menu_compass.json"
menu_item_def = {
    "format_version": "1.21.40",
    "minecraft:item": {
        "description": {
            "identifier": "sapi:menu_compass",
            "menu_category": {
                "category": "equipment"
            }
        },
        "components": {
            "minecraft:display_name": {
                "value": "§r§l§6快捷导航菜单 §f(右键使用)"
            },
            "minecraft:icon": {
                "textures": {
                    "default": "sapi_menu_compass"
                }
            },
            "minecraft:max_stack_size": 1,
            "minecraft:use_modifiers": {
                "use_duration": 32,
                "movement_modifier": 1.0
            },
            "minecraft:custom_components": [
                "sapi:menu_compass_interact"
            ]
        }
    }
}
with open(menu_item_path, "w", encoding="utf-8") as f:
    json.dump(menu_item_def, f, indent=2, ensure_ascii=False)
print("Created sapi:menu_compass item definition!")

# 3. Patch config.js
cfg_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/config.js"
with open(cfg_path, "r", encoding="utf-8") as f:
    cfg_content = f.read()

cfg_content = cfg_content.replace('menuItem: "minecraft:compass",', 'menuItem: "sapi:menu_compass",\n  fallbackMenuItem: "minecraft:compass",')
with open(cfg_path, "w", encoding="utf-8") as f:
    f.write(cfg_content)
print("Updated config.js!")

# 4. Patch sapi_server_bp/scripts/main.js
main_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/main.js"
with open(main_path, "r", encoding="utf-8") as f:
    main_content = f.read()

# Ensure EquipmentSlot is imported
if "EquipmentSlot" not in main_content:
    main_content = main_content.replace('import { world, system } from "@minecraft/server";', 'import { world, system, EquipmentSlot } from "@minecraft/server";')

# Register custom component
comp_reg = '''
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
'''

if "sapi:menu_compass_interact" not in main_content:
    main_content = main_content.replace('PlayerVendingManager.registerEvents();', 'PlayerVendingManager.registerEvents();' + comp_reg)

# Update isCompass to be bulletproof
old_is_compass = '''function isCompass(itemStack, player = null) {
	if (itemStack && itemStack.typeId === Config.system.menuItem) return true;
	if (player && Utils.isValid(player)) {
		try {
			const eq = player.getComponent("minecraft:equippable") || player.getComponent("equippable");
			const held = eq?.getEquipment("Mainhand") || eq?.getEquipment("mainhand");
			if (held && held.typeId === Config.system.menuItem) return true;
		} catch {}
	}
	return false;
}'''

new_is_compass = '''function isCompass(itemStack, player = null) {
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
}'''

main_content = main_content.replace(old_is_compass, new_is_compass)

# Update playerSpawn giveMenuItem logic
old_spawn_give = '''	if (Config.system.giveMenuItemOnJoin && Utils.countItem(player, Config.system.menuItem) === 0) {
		Utils.giveItem(player, Config.system.menuItem, 1, Config.system.menuItemName, ["§f右键打开服务器导航菜单"]);
	}'''

new_spawn_give = '''	if (Config.system.giveMenuItemOnJoin) {
		const hasMenu = Utils.countItem(player, "sapi:menu_compass") > 0 || Utils.countItem(player, "minecraft:compass") > 0;
		if (!hasMenu) {
			Utils.giveItem(player, "sapi:menu_compass", 1, Config.system.menuItemName, ["§f右键打开服务器导航菜单"]);
		}
	}'''

main_content = main_content.replace(old_spawn_give, new_spawn_give)

with open(main_path, "w", encoding="utf-8") as f:
    f.write(main_content)
print("Updated sapi_server_bp main.js successfully!")
