with open('addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
import_insert = '''import { DroneClass } from "./drones/DroneClass.js";
import { DroneGarageManager } from "./drones/DroneGarageManager.js";
import { DroneMenu } from "./drones/DroneMenu.js";
'''

if 'import { DroneClass }' not in content:
    content = import_insert + content

# 2. Init
init_insert = '''
// 初始化战术无人机伴飞与火控系统
DroneClass.init();
'''
if 'DroneClass.init()' not in content:
    pos = content.find('DownedRescueManager.init();')
    if pos != -1:
        end_pos = pos + len('DownedRescueManager.init();')
        content = content[:end_pos] + init_insert + content[end_pos:]

# 3. EntitySpawner.onUse
if 'ab_dr:spawner_' not in content:
    target_spawner_use = 'const itemId = item.typeId;\n        const entityType = itemId.replace("_spawner", "");'
    replacement_spawner_use = '''const itemId = item.typeId;
        if (itemId.startsWith("ab_dr:spawner_")) {
            const droneId = itemId.replace("ab_dr:spawner_", "");
            DroneGarageManager.bindDroneFromItem(player, item, droneId);
            return;
        }
        const entityType = itemId.replace("_spawner", "");'''
    content = content.replace(target_spawner_use, replacement_spawner_use)

# 4. EntitySpawner.onUseOn
target_spawner_useon = '''        const itemId = item.typeId;
        const entityType = itemId.replace("_spawner", "");

        if (!entityType.startsWith("ab_ve:")) {'''
replacement_spawner_useon = '''        const itemId = item.typeId;
        if (itemId.startsWith("ab_dr:spawner_")) {
            const droneId = itemId.replace("ab_dr:spawner_", "");
            DroneGarageManager.bindDroneFromItem(player, item, droneId);
            return;
        }
        const entityType = itemId.replace("_spawner", "");

        if (!entityType.startsWith("ab_ve:")) {'''
content = content.replace(target_spawner_useon, replacement_spawner_useon)

# 5. itemUse fallback
target_item_use = '''    if (itemId.endsWith("_spawner") && itemId.startsWith("ab_ve:")) {
        const entityType = itemId.replace("_spawner", "");
        if (allVehicleTypeIds.includes(entityType)) {
            VehicleGarageManager.bindVehicleFromItem(player, item, entityType);
        }
    }'''
replacement_item_use = '''    if (itemId === "ab_dr:drone_controller") {
        const active = DroneClass.getActiveDrone(player.id);
        if (active && active.manualMode) {
            DroneClass.fireManualBullet(player);
        } else {
            DroneMenu.openMainMenu(player);
        }
        return;
    }
    if (itemId.startsWith("ab_dr:spawner_")) {
        const droneId = itemId.replace("ab_dr:spawner_", "");
        DroneGarageManager.bindDroneFromItem(player, item, droneId);
        return;
    }
    if (itemId.endsWith("_spawner") && itemId.startsWith("ab_ve:")) {
        const entityType = itemId.replace("_spawner", "");
        if (allVehicleTypeIds.includes(entityType)) {
            VehicleGarageManager.bindVehicleFromItem(player, item, entityType);
        }
    }'''
content = content.replace(target_item_use, replacement_item_use)

# 6. scriptEventReceive
target_scriptevent = '''        if (event.id === "vehicle:open_garage") {
            let targetPlayer = null;
            if (event.sourceEntity && event.sourceEntity.typeId === "minecraft:player") {
                targetPlayer = event.sourceEntity;
            } else if (event.message && event.message.includes("__sapi_player__=")) {
                try {
                    const match = event.message.match(/__sapi_player__=([^&]+)/);
                    if (match && match[1]) {
                        const name = decodeURIComponent(match[1]);
                        targetPlayer = world.getAllPlayers().find(p => p.name === name);
                    }
                } catch {}
            }
            if (targetPlayer) {
                VehicleGarageManager.openGarageMenu(targetPlayer);
            }
        }'''
replacement_scriptevent = target_scriptevent + '''
        if (event.id === "drone:open_hangar" || event.id === "drone:open_menu") {
            let targetPlayer = null;
            if (event.sourceEntity && event.sourceEntity.typeId === "minecraft:player") {
                targetPlayer = event.sourceEntity;
            } else if (event.message && event.message.includes("__sapi_player__=")) {
                try {
                    const match = event.message.match(/__sapi_player__=([^&]+)/);
                    if (match && match[1]) {
                        const name = decodeURIComponent(match[1]);
                        targetPlayer = world.getAllPlayers().find(p => p.name === name);
                    }
                } catch {}
            }
            if (targetPlayer) {
                DroneMenu.openMainMenu(targetPlayer);
            }
        }'''
content = content.replace(target_scriptevent, replacement_scriptevent)

with open('addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/main.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated main.js successfully!')
