import { system, world, EquipmentSlot, EntityInitializationCause, ItemStack } from '@minecraft/server';
import { VehicleClass } from './VEHICLES/VehicleClass.js';
import { VehicleMenu } from './VEHICLES/VehicleMenu.js';
import EntitySpawner from './VEHICLES/Events/EntitySpawner.js';
import Menu from './VEHICLES/Events/Menu.js';
import * as VC from './VEHICLES/VehicleConstants.js';

system.runInterval(() => {
    VehicleClass.updateAllVehicles();
}, 1); // Runs every tick (20 times per second)

world.afterEvents.playerSpawn.subscribe((e) => {
    const player = e.player
    if (e.initialSpawn === true && !player.hasTag('ab_ve_spawned')) {
        replaceItem(player, 'ab_ve:menu')
        player.addTag('ab_ve_spawned')
    }
});

function replaceItem(source, itemToReplace) {
    const equipment = source.getComponent('equippable');
    const item = new ItemStack(itemToReplace);
    equipment.setEquipment(EquipmentSlot.Mainhand, item);
}

world.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("ab_ve:entity_spawner", EntitySpawner);
    itemComponentRegistry.registerCustomComponent("ab_ve:menu", Menu);
});

// Script Events
system.afterEvents.scriptEventReceive.subscribe((e) => {
    const { id, sourceEntity } = e;

    if (!sourceEntity) return;

    switch (id) {
        case 'ab_ve:vehicles.crack': {
            const currentCrackState = sourceEntity.getProperty('ab_ve:crack_state');
            sourceEntity.setProperty('ab_ve:crack_state', currentCrackState + 1);

            if (currentCrackState + 1 == 3) {
                VehicleClass.removeTimerForEntity(sourceEntity.id);
                const sourceLoc = sourceEntity.location;
                try {
                    // Drop items and remove entity
                    const inventory = sourceEntity.getComponent("minecraft:inventory")?.container;
                    if (inventory) {
                        // Drop all items in the entity inventory
                        for (let i = 0; i < inventory.size; i++) {
                            const itemStack = inventory.getItem(i);
                            if (itemStack && itemStack.typeId != "minecraft:barrier") {
                                sourceEntity.dimension.spawnItem(itemStack.clone(), sourceEntity.location);
                                inventory.setItem(i, null);
                            }
                        }
                    }
                    // Prepare the spawner item
                    const vehicleType = sourceEntity.typeId; // Get the vehicle's type ID
                    const spawnerItemType = `${vehicleType}_spawner`; // Define the spawner item type

                    // Create the spawner item stack
                    const spawnerItem = new ItemStack(spawnerItemType, 1);

                    // Get the vehicle properties
                    const maxSpeed = sourceEntity.getProperty("ab_ve:max_speed");
                    const acceleration = sourceEntity.getProperty("ab_ve:acceleration");
                    const special = sourceEntity.getProperty("ab_ve:special");
                    // Get the color code from the entity
                    const colorCode = sourceEntity.getProperty("ab_ve:color"); // Assuming 'color_code' holds 0–15
                    const colorInfo = VC.VEHICLE_COLORS[colorCode] || { name: "Default" };// Dynamically build the lore array based on defined properties
                    const lore = [];

                    if (maxSpeed !== undefined) {
                        lore.push(`§eMax Speed: §f${maxSpeed}`);
                    }
                    if (acceleration !== undefined) {
                        lore.push(`§eAcceleration: §f${acceleration}`);
                    }
                    if (special !== undefined) {
                        lore.push(`§eSpecial: §f${special}`);
                    }
                    if (colorInfo.name !== undefined) {
                        lore.push(`§eColor ID: §f${colorCode}`);
                    }

                    // Set the item's lore
                    spawnerItem.setLore(lore);

                    spawnerItem.nameTag = `§f${vehicleType
                        .replace(/^ab_ve:/, '') // Remove the 'ab_ve:' prefix if it exists
                        .split('_') // Split into parts
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
                        .join(' ') // Join the parts with spaces
                        } §7(${colorInfo.name})`;

                    // Spawn the spawner item at the vehicle's location
                    const sourceLoc = sourceEntity.location;
                    sourceEntity.dimension.spawnItem(spawnerItem, sourceLoc);

                    // Trigger the remove event for the vehicle
                    sourceEntity.triggerEvent("ab_ve:remove_car");


                } catch (error) {
                    console.log(error);
                }
            }
            VehicleClass.resetCracking(sourceEntity); // Reset cracking timer
            break;
        }
        case 'ab_ve:vehicles.open_menu': {
            const maxSpeedLevel = sourceEntity.getProperty('ab_ve:max_speed');
            const accelerationLevel = sourceEntity.getProperty('ab_ve:acceleration');
            const specialLevel = sourceEntity.getProperty('ab_ve:special');

            const vehicleType = sourceEntity.typeId; // Assume this exists to determine the vehicle type

            // Helper function to get upgrade info
            const getUpgradeInfo = (level, upgrades) => {
                if (level === undefined || level < 0) return "Not available";

                let currentUpgrade = null;
                let nextUpgrade = null;

                // Loop through upgrades to find the current and next upgrade
                for (const key in upgrades) {
                    const upgrade = upgrades[key];
                    if (upgrade.level === level) {
                        currentUpgrade = upgrade;
                    }
                    if (upgrade.level === level + 1) {
                        nextUpgrade = upgrade;
                    }
                }

                if (!currentUpgrade) return "Invalid level";

                let message = `Level ${currentUpgrade.level}`;
                if (nextUpgrade) {
                    message += `\nUpgrade Cost: §2${nextUpgrade.price} Emerald`;
                } else {
                    message += `\nMax Level Reached`;
                }

                return message;
            };


            // Prepare menu items
            const menuItems = [];

            // Max Speed
            if (maxSpeedLevel !== undefined) {
                const maxSpeedInfo = getUpgradeInfo(maxSpeedLevel, VC.maxSpeedUpgrades[vehicleType]);
                menuItems.push({ text: `§lMax Speed:§r ${maxSpeedInfo}`, action: `upgrade_max_speed` });
            }

            // Acceleration
            if (accelerationLevel !== undefined) {
                const accelerationInfo = getUpgradeInfo(accelerationLevel, VC.accelerationUpgrades[vehicleType]);
                menuItems.push({ text: `§lAcceleration:§r ${accelerationInfo}`, action: `upgrade_acceleration` });
            }

            // Special
            if (specialLevel !== undefined) {
                const specialUpgradesList = VC.specialUpgrades[vehicleType];

                let currentSpecial = null;
                let nextSpecial = null;

                // Loop through the specialUpgradesList to find the current and next special
                for (const key in specialUpgradesList) {
                    const upgrade = specialUpgradesList[key];
                    if (upgrade.level === specialLevel) {
                        currentSpecial = upgrade;
                    }
                    if (upgrade.level === specialLevel + 1) {
                        nextSpecial = upgrade;
                    }
                }

                let specialInfo = `§l${currentSpecial ? currentSpecial.menu_name : "Unknown"}:§r Level ${specialLevel} `;
                if (nextSpecial) {
                    specialInfo += `\nUpgrade Cost: §2${nextSpecial.price} Emerald`;
                } else {
                    specialInfo += `\nMax Level Reached`;
                }

                menuItems.push({ text: `${specialInfo}`, action: `upgrade_special` });
            }


            // Open the menu (pseudo-code, replace with your actual menu opening logic)
            VehicleMenu.openMenu(sourceEntity, menuItems);
            break;
        }

    }
});

// Function to play animation for an entity
function playAnimationForEntity(entity, animation) {
    try {
        if (entity && animation) {
            entity.playAnimation(animation);
        }
    } catch (error) {

    }

}

// Periodic tick event to check if players are riding "ab_ve.car" entities
system.runInterval(() => {
    try {
        for (const player of world.getPlayers()) {
            const ridingEntity = player.getComponent('minecraft:riding')?.entityRidingOn;
            const ridingEntityFamilies = ridingEntity.getComponent("minecraft:type_family");

            if (ridingEntity && ridingEntityFamilies.hasTypeFamily('ab_ve.default_car')) {
                // Play the desired animation for the entity
                playAnimationForEntity(player, 'animation.ab_ve.player.ride_car');
            } else if (ridingEntity && ridingEntityFamilies.hasTypeFamily('ab_ve.racing_car')) {
                // Play the desired animation for the entity
                playAnimationForEntity(player, 'animation.ab_ve.player.ride_racing_car');
            } else if (ridingEntity && ridingEntityFamilies.hasTypeFamily('ab_ve.motorcycle')) {
                // This is getting handled inside the tryWheely function to make it work smoothly
            }
        }
    } catch (error) {
    }
}, 1); // Check every second (20 ticks)
