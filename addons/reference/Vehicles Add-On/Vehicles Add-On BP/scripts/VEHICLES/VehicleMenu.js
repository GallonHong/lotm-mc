import { ActionFormData } from "@minecraft/server-ui";
import { system, world, EquipmentSlot, EntityInitializationCause, ItemStack } from '@minecraft/server';
import * as VC from './VehicleConstants.js';

export class VehicleMenu {
	static openMenu(source, menuItems) {
		this.showMainMenu(source, menuItems);
	}

	static showMainMenu(source, menuItems) {
		let player = null;
	
		// Retrieve all players within range
		const players = source.dimension.getEntities({
			type: "minecraft:player",
			location: source.location,
			maxDistance: 5,
			closest: 1,
		});
	
		// Loop through the players to find one holding the wrench
		for (let i = 0; i < players.length; i++) {
			const entity = players[i];
			const inventory = entity.getComponent("minecraft:inventory").container;
			const heldItem = inventory.getItem(entity.selectedSlotIndex);
	
			if (heldItem && heldItem.typeId === "ab_ve:wrench") {
				player = entity;
				break; 
			}
		}
	
		if (!player) {
			return;
		}
	
		const typeID = source.typeId;
		const formattedTypeID = typeID
			.replace(/^ab_ve:/, '')
			.split('_')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');
	
		const menuForm = new ActionFormData()
			.title(`§l${formattedTypeID} Menu`)
			.body("§o§7View your current upgrades, or upgrade them using Emeralds.\n\n");
	
		// Define button images based on upgrade type (excluding special upgrades)
		const buttonImages = {
			"upgrade_max_speed": "textures/asiagobagels/vehicles/ui/top_speed.png",
			"upgrade_acceleration": "textures/asiagobagels/vehicles/ui/acceleration.png",
			"default": "textures/asiagobagels/vehicles/ui/boost.png"
		};
	
		// Dynamically add menu items with correct images
		menuItems.forEach(item => {
			let image = buttonImages[item.action] || buttonImages["default"];
	
			// If it's a special upgrade, fetch the correct icon from `VC.specialUpgrades`
			if (item.action === "upgrade_special" && VC.specialUpgrades[typeID]) {
				const specialUpgrades = VC.specialUpgrades[typeID];
				if (specialUpgrades.length > 0) {
					image = specialUpgrades[0].icon; // Use the icon of the first upgrade
				}
			}
	
			menuForm.button(item.text, image);
		});
	
		menuForm.show(player).then((response) => {
			if (response.canceled) return;
	
			const selectedItem = menuItems[response.selection];
			if (selectedItem && selectedItem.action) {
				this[selectedItem.action](source, player);
			}
		});
	}
	

	static upgrade_max_speed(vehicle, player) {
		const typeID = vehicle.typeId; // Get vehicle type
		const upgrades = VC.maxSpeedUpgrades[typeID];
		const currentLevel = vehicle.getProperty("ab_ve:max_speed");

		if (currentLevel === undefined || currentLevel < 0) {
			player.sendMessage("§cThis vehicle does not support speed upgrades.");
			player.runCommandAsync(`playsound note.bass @s`);
			return;
		}

		let nextUpgrade = null;
		for (let i = 0; i < upgrades.length; i++) {
			if (upgrades[i].level === currentLevel + 1) {
				nextUpgrade = upgrades[i];
				break;
			}
		}

		if (!nextUpgrade) {
			player.sendMessage("§cMax Speed is already at the maximum level.");
			player.runCommandAsync(`playsound note.bell @s`);
			return;
		}

		const emeraldsRequired = nextUpgrade.price;
		const inventory = player.getComponent("minecraft:inventory").container;

		if (!this.hasEnoughEmeralds(inventory, emeraldsRequired)) {
			player.sendMessage("§cYou do not have enough Emeralds to upgrade Max Speed.");
			player.runCommandAsync(`playsound note.bass @s`);
			return;
		}

		this.removeEmeralds(inventory, emeraldsRequired);
		vehicle.setProperty("ab_ve:max_speed", currentLevel + 1);
		player.sendMessage(`§aMax Speed upgraded to Level ${currentLevel + 1}!`);
		player.runCommandAsync(`playsound random.levelup @s`);
	}

	static upgrade_acceleration(vehicle, player) {
		const typeID = vehicle.typeId; // Get vehicle type
		const upgrades = VC.accelerationUpgrades[typeID];
		const currentLevel = vehicle.getProperty("ab_ve:acceleration");

		if (currentLevel === undefined || currentLevel < 0) {
			player.sendMessage("§cThis vehicle does not support acceleration upgrades.");
			player.runCommandAsync(`playsound note.bass @s`);
			return;
		}

		let nextUpgrade = null;
		for (let i = 0; i < upgrades.length; i++) {
			if (upgrades[i].level === currentLevel + 1) {
				nextUpgrade = upgrades[i];
				break;
			}
		}

		if (!nextUpgrade) {
			player.sendMessage("§cAcceleration is already at the maximum level.");
			player.runCommandAsync(`playsound note.bell @s`);
			return;
		}

		const emeraldsRequired = nextUpgrade.price;
		const inventory = player.getComponent("minecraft:inventory").container;

		if (!this.hasEnoughEmeralds(inventory, emeraldsRequired)) {
			player.sendMessage("§cYou do not have enough Emeralds to upgrade Acceleration.");
			player.runCommandAsync(`playsound note.bass @s`);
			return;
		}

		this.removeEmeralds(inventory, emeraldsRequired);
		vehicle.setProperty("ab_ve:acceleration", currentLevel + 1);
		player.sendMessage(`§aAcceleration upgraded to Level ${currentLevel + 1}!`);
		player.runCommandAsync(`playsound random.levelup @s`);
	}

	static upgrade_special(vehicle, player) {
		const typeID = vehicle.typeId; // Get vehicle type
		const upgrades = VC.specialUpgrades[typeID];
		const currentLevel = vehicle.getProperty("ab_ve:special");

		if (currentLevel === undefined || currentLevel < 0) {
			player.sendMessage("§cThis vehicle does not support special upgrades.");
			player.runCommandAsync(`playsound note.bass @s`);
			return;
		}

		let nextUpgrade = null;
		for (let i = 0; i < upgrades.length; i++) {
			if (upgrades[i].level === currentLevel + 1) {
				nextUpgrade = upgrades[i];
				break;
			}
		}

		if (!nextUpgrade) {
			player.sendMessage("§cSpecial is already at the maximum level.");
			player.runCommandAsync(`playsound note.bell @s`);
			return;
		}

		const emeraldsRequired = nextUpgrade.price;
		const inventory = player.getComponent("minecraft:inventory").container;

		if (!this.hasEnoughEmeralds(inventory, emeraldsRequired)) {
			player.sendMessage("§cYou do not have enough Emeralds to upgrade Special.");
			player.runCommandAsync(`playsound note.bass @s`);
			return;
		}

		this.removeEmeralds(inventory, emeraldsRequired);
		vehicle.setProperty("ab_ve:special", currentLevel + 1);
		player.sendMessage(`§aSpecial upgraded to Level ${currentLevel + 1}!`);
		player.runCommandAsync(`playsound random.levelup @s`);
	}
	// Utility function to check if the player has enough emeralds
	static hasEnoughEmeralds(inventory, amount) {
		let emeraldCount = 0;

		for (let i = 0; i < inventory.size; i++) {
			const item = inventory.getItem(i);
			if (item && item.typeId === "minecraft:emerald") {
				emeraldCount += item.amount;
				if (emeraldCount >= amount) {
					return true;
				}
			}
		}

		return false;
	}

	// Utility function to remove emeralds from the player's inventory
	static removeEmeralds(inventory, amount) {
		for (let i = 0; i < inventory.size; i++) {
			const item = inventory.getItem(i);
			if (item != undefined && item.typeId === "minecraft:emerald") {
				const removeCount = Math.min(item.amount, amount);
				amount -= removeCount;

				if (removeCount === item.amount) {
					inventory.setItem(i, null); // Remove the item if all emeralds are consumed
				} else {
					item.amount -= removeCount; // Decrease the count of emeralds
					inventory.setItem(i, item);
				}

				if (amount <= 0) {
					break;
				}
			}
		}
	}

}