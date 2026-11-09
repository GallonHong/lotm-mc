# -*- coding: utf-8 -*-
import sys

def patch_main():
    main_path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/main.js"
    with open(main_path, "r", encoding="utf-8") as f:
        text = f.read()

    target1 = 'import { TrainingTarget } from "./furniture/TrainingTarget.js";'
    replacement1 = '''import { TrainingTarget } from "./furniture/TrainingTarget.js";
import { SeasonManager } from "./seasons/SeasonManager.js";
import { TemperatureManager } from "./temperature/TemperatureManager.js";'''

    target2 = 'TrainingTarget.init();'
    replacement2 = '''TrainingTarget.init();

// 初始化末日时令与体温求生系统
SeasonManager.init();
TemperatureManager.init();'''

    target3 = '§7射击后显示单次伤害与 5 秒 DPS'
    replacement3 = '§f射击后显示单次伤害与 5 秒 DPS'

    if target1 not in text:
        print("target1 not found in main.js")
        return False
    if target2 not in text:
        print("target2 not found in main.js")
        return False

    text = text.replace(target1, replacement1, 1)
    text = text.replace(target2, replacement2, 1)
    if target3 in text:
        text = text.replace(target3, replacement3, 1)

    with open(main_path, "w", encoding="utf-8") as f:
        f.write(text)

    print("Successfully patched main.js")
    return True

def patch_server_menu():
    menu_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/server_menu.js"
    with open(menu_path, "r", encoding="utf-8") as f:
        text = f.read()

    target_body = '''        const form = new ActionFormData()
            .title("§l§2幸存者联盟§r")
            .body(
                `👤 §e${player.name}  §6│  💰 §6${Utils.formatCurrency(balance)}  §6│  📍 ${zoneDisplay}\\n` +
                `§6──────────────────────────────\\n` +
                `§e当前区域: ${zoneDisplay}\\n` +
                `§e区块坐标: §f[${chunkX}, ${chunkZ}]   §e维度: §f${player.dimension.id.replace("minecraft:", "")}\\n` +
                `§6──────────────────────────────`
            );'''

    replacement_body = '''        let seasonDisplay = "";
        try {
            seasonDisplay = String(world.getDynamicProperty("apoc:season_display") || "§a🌱 春季 · 第1天");
        } catch {
            seasonDisplay = "§a🌱 春季 · 第1天";
        }

        const form = new ActionFormData()
            .title("§l§2幸存者联盟§r")
            .body(
                `👤 §e${player.name}  §6│  💰 §6${Utils.formatCurrency(balance)}\\n` +
                `📍 ${zoneDisplay}  §6│  时令: ${seasonDisplay}\\n` +
                `§6──────────────────────────────\\n` +
                `§e当前区域: ${zoneDisplay}\\n` +
                `§e时令气象: ${seasonDisplay}\\n` +
                `§e区块坐标: §f[${chunkX}, ${chunkZ}]   §e维度: §f${player.dimension.id.replace("minecraft:", "")}\\n` +
                `§6──────────────────────────────`
            );'''

    if target_body not in text:
        print("target_body not found in server_menu.js")
        return False

    text = text.replace(target_body, replacement_body, 1)

    # In openMoreMenu, also display season:
    target_more = '''        const form = new ActionFormData()
            .title("§l§6📻 便捷终端与更多")
            .body("§f服务器扩展功能、个人载具终端与管理入口");'''

    replacement_more = '''        let seasonDisplay = "";
        try {
            seasonDisplay = String(world.getDynamicProperty("apoc:season_display") || "§a🌱 春季 · 第1天");
        } catch {
            seasonDisplay = "§a🌱 春季 · 第1天";
        }

        const form = new ActionFormData()
            .title("§l§6📻 便捷终端与更多")
            .body(`§e当前时令: ${seasonDisplay}\\n§f服务器扩展功能、个人载具终端与管理入口`);'''

    if target_more in text:
        text = text.replace(target_more, replacement_more, 1)

    with open(menu_path, "w", encoding="utf-8") as f:
        f.write(text)

    print("Successfully patched server_menu.js")
    return True

if __name__ == "__main__":
    ok1 = patch_main()
    ok2 = patch_server_menu()
    if not (ok1 and ok2):
        sys.exit(1)
