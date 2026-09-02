import { system, ItemStack, world } from '@minecraft/server';
import * as VC from './VehicleConstants.js';


export class VehicleSpecificFunctions {
	static attemptToBoost(vehicle, player) {
		// Ensure the vehicle and player exist
		if (!vehicle || !player) return;

		// Initialize vehicle properties if they don't exist
		if (vehicle.boostTank == undefined) vehicle.boostTank = 100; // Default full tank
		if (!vehicle.boostCooldown == undefined) vehicle.boostCooldown = 0;
		if (!vehicle.isBoosting == undefined) vehicle.isBoosting = false;

		const boostDurationLevel = vehicle.getProperty('ab_ve:special') || 0;
		const boostDurationEntry = VC.specialUpgrades[vehicle.typeId]?.find(upgrade => upgrade.level === boostDurationLevel);

		const boostDuration = boostDurationEntry.special_value;

		const boostDrainPerTick = boostDuration; // Adjust how much boost is drained per tick
		const rechargeRate = 2; // Adjust how much boost recharges per tick when idle
		const maxBoostTank = 100; // Maximum boost tank value

		// Handle boosting logic
		if (player.isJumping && vehicle.boostTank > 0) {
			// Start boosting
			vehicle.isBoosting = true;
			vehicle.boostTank = Math.max(vehicle.boostTank - boostDrainPerTick, 0);

			// Get the vehicle's rotation for forward direction
			const rotation = vehicle.getRotation();
			const yaw = (rotation.y * Math.PI) / 180; // Convert yaw to radians

			// Calculate the forward direction
			const forwardX = -Math.sin(yaw); // Forward direction on X-axis
			const forwardZ = Math.cos(yaw);  // Forward direction on Z-axis
			const upwardStrength = 0.0;      // Slight upward boost
			const horizontalStrength = 1;  // Forward boost strength

			// Apply Impulse for boost effect
			vehicle.applyImpulse({
				x: forwardX * horizontalStrength,
				y: upwardStrength,
				z: forwardZ * horizontalStrength
			});

			vehicle.playAnimation("animation.ab_ve.racing_car.boost");
			// Play particle and sound effects
			player.runCommand(`playsound firework.launch @a ${player.location.x} ${player.location.y} ${player.location.z} 0.15 1.05 0.001`);

		} else if (!player.isJumping && vehicle.boostTank < maxBoostTank) {
			// Recharge the boost tank when not boosting
			vehicle.boostTank = Math.min(vehicle.boostTank + rechargeRate, maxBoostTank);
			vehicle.isBoosting = false;
		}

		// Show boost tank level in the action bar
		player.onScreenDisplay.setActionBar(`§8[§bBoost Tank§8]§e ${vehicle.boostTank}`);

		// Reset boosting state when the tank is empty
		if (vehicle.boostTank <= 0) {
			vehicle.isBoosting = false;
		}
	}

	static tryWheely(vehicle, player) {
		// Ensure the vehicle and player exist
		const isJumping = player.isJumping;
		if (!vehicle || !player) return;

		// Initialize cooldown property if it doesn't exist
		if (vehicle.wheelyCooldown === undefined) {
			vehicle.wheelyCooldown = 0;
		}

		// Reduce cooldown per tick if greater than 0
		if (vehicle.wheelyCooldown > 0) {
			vehicle.wheelyCooldown--;
		}

		if (vehicle.wheelyCooldown === 0) {
			player.playAnimation('animation.ab_ve.player.ride_motorcycle');
		}

		if (isJumping && vehicle.wheelyCooldown === 0) {
			// Get the vehicle's rotation for forward direction
			const rotation = vehicle.getRotation();
			const yaw = (rotation.y * Math.PI) / 180; // Convert yaw to radians

			// Calculate the forward direction
			const forwardX = -Math.sin(yaw); // Forward direction on X-axis
			const forwardZ = Math.cos(yaw);  // Forward direction on Z-axis
			const upwardStrength = 0.0;      // Slight upward boost
			const horizontalStrength = 2;  // Forward boost strength

			// Apply Impulse for boost effect
			vehicle.applyImpulse({
				x: forwardX * horizontalStrength,
				y: upwardStrength,
				z: forwardZ * horizontalStrength
			});

			player.playAnimation("animation.ab_ve.player.wheely_motorcycle");
			vehicle.playAnimation("animation.ab_ve.motorcycle.wheely");
			player.runCommand(`playsound ab_ve.cars.motorcycle_rev @a[r=3]`);

			vehicle.wheelyCooldown = 30;
		}
	}
	static amublanceAura(vehicle, player) {
		// Ensure the vehicle exist
		if (!vehicle) return;


		const specialLevel = vehicle.getProperty('ab_ve:special') || 0;
		const specialEntry = VC.specialUpgrades[vehicle.typeId]?.find(upgrade => upgrade.level === specialLevel);
		const auraRange = specialEntry.range_value;
		const auraAmplifier = specialEntry.amplifier;

		vehicle.runCommand(`effect @e[r=${auraRange}] regeneration 5 ${auraAmplifier} true`);
		vehicle.playAnimation(`animation.ab_ve.ambulance.heal_aura.${specialLevel}`);


		player.onScreenDisplay.setActionBar(`§8[§bSpecial§8]§e Healing Ability used!`);
		player.runCommandAsync(`playsound note.bell @s`);
	}

	static attemptFish(vehicle, player) {
		// Ensure the vehicle exists
		if (!vehicle) return;

		const specialLevel = vehicle.getProperty('ab_ve:special') || 0;
		const specialEntry = VC.specialUpgrades[vehicle.typeId]?.find(upgrade => upgrade.level === specialLevel);
		const amountPossible = specialEntry?.special_value || 1;

		// Function to pick a random item based on weights
		function pickRandomFish(weights) {
			const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
			let random = Math.random() * totalWeight;
			for (const item of weights) {
				if (random < item.weight) {
					return item.name;
				}
				random -= item.weight;
			}
		}

		// Simulate fishing for a random number of fish
		const fishCaught = Math.floor(Math.random() * amountPossible) + 1;
		const fishItems = [];
		for (let i = 0; i < fishCaught; i++) {
			const fish = pickRandomFish(VC.FISH_CATCH_WEIGHTS);
			fishItems.push(fish);
		}
		player.onScreenDisplay.setActionBar(`§8[§bSpecial§8]§e You attempt to catch fish!`);
		vehicle.playAnimation("animation.ab_ve.fishing_trawler.call_net");
		// Timer to drop items over 5 seconds
		fishItems.forEach((fish, index) => {
			system.runTimeout(() => {
				player.runCommandAsync(`give @s ${fish}`);
				player.runCommandAsync(`playsound random.splash @a ~~~ 0.5 1 0.001`);
				if (index === fishItems.length - 1) {
					player.onScreenDisplay.setActionBar(`§8[§bSpecial§8]§a You caught ${fishCaught} fish!`);
					system.runTimeout(() => {
						player.onScreenDisplay.setActionBar(`§8[§bSpecial§8]§c Fishing is now on a 20 second cooldown!`);
					}, 50)
				}
			}, index * 80);
		});



		// Initial sound and feedback
		player.runCommandAsync(`playsound random.splash @a ~~~ 0.8 1 0.001`);
	}




	static fireTruckProjectile(vehicle, player) {
		// Ensure the vehicle exists
		if (!vehicle) return;

		// Get the vehicle's current position
		const vehiclePosition = vehicle.location;
		const yaw = vehicle.getRotation().y; // Get vehicle's yaw rotation

		// Convert yaw angle to radians for calculation
		const yawRadians = (yaw * Math.PI) / 180;

		// Calculate the backward offset (1 block behind the vehicle)
		const offsetX = Math.sin(yawRadians) * 2;
		const offsetZ = -Math.cos(yawRadians) * 2;

		// Spawn the fire truck projectile 2 blocks above the vehicle
		const spawnPosition = {
			x: vehiclePosition.x + offsetX,
			y: vehiclePosition.y + 3, // 2 blocks above the vehicle
			z: vehiclePosition.z + offsetZ
		};

		// Create the fire truck projectile entity at the calculated spawn position
		const projectile = vehicle.dimension.spawnEntity("ab_ve:fire_truck_projectile", spawnPosition);

		const projectileComp = projectile.getComponent('minecraft:projectile');

		// Calculate the direction vector based on the rotation (yaw)
		const velocity = {
			x: parseFloat((player.getViewDirection().x * 1.1).toFixed(3)),
			y: parseFloat(0.3 - (player.getViewDirection().y * -0.5).toFixed(3)),
			z: parseFloat((player.getViewDirection().z * 1.1).toFixed(3))
		};

		player.runCommand(`playsound mob.axolotl.splash @a ${player.location.x} ${player.location.y} ${player.location.z} 0.15 1.05 0.001`);
		// Set the velocity for the projectile in the direction the vehicle is facing
		projectileComp?.shoot(velocity);

	}

	static harvesterLogic(vehicle, player) {
		// Ensure the vehicle exists

		if (!vehicle) return;

		const inventory = vehicle.getComponent("minecraft:inventory").container;
		if (!inventory) return;

		const blockLocation = vehicle.location;

		// Iterate through the 3x3 area below the vehicle
		for (let x = -1; x <= 1; x++) {
			for (let z = -1; z <= 1; z++) {
				const targetLocation = {
					x: blockLocation.x + x,
					y: blockLocation.y - 1,
					z: blockLocation.z + z
				};

				const block = vehicle.dimension.getBlock(targetLocation);

				// Replace dirt or grass with farmland
				if (block?.typeId === "minecraft:dirt" || block?.typeId === "minecraft:grass_block") {
					block.setType("minecraft:farmland");
				}

				// Check if the block is farmland
				if (block?.typeId === "minecraft:farmland") {
					const cropBlock = vehicle.dimension.getBlock({
						x: targetLocation.x,
						y: targetLocation.y + 1,
						z: targetLocation.z
					});

					const cropType = VC.HarvesterBlocks.find(crop => crop.blockType === cropBlock?.typeId);

					if (cropType) {
						const growthStage = cropBlock.permutation.getState("growth");

						// If crop is fully grown, harvest it
						if (growthStage === cropType.maxGrowthStage) {
							cropType.outcomes.forEach(outcome => {

								vehicle.dimension.spawnItem(new ItemStack(outcome.itemType, outcome.quantity), vehicle.location);
							});
							cropBlock.setType("minecraft:air");

							// Replant the seed
							cropBlock.setType(cropType.blockType);
						}
					} else {
						// Plant seeds if no crop is present

						for (let i = 0; i < inventory.size; i++) {
							const item = inventory.getItem(i);

							if (item && VC.HarvesterBlocks.some(crop => crop.seedItem === item.typeId)) {
								const seedType = VC.HarvesterBlocks.find(crop => crop.seedItem === item.typeId);
								if (cropBlock.typeId == "minecraft:air") {
									cropBlock.setType(seedType.blockType);
								}

								// Adjust seed count
								let newAmount = item.amount - 1;
								if (newAmount <= 0) {
									inventory.setItem(i, null);
								} else {
									item.amount = newAmount;
									inventory.setItem(i, item);
								}
								break;
							}
						}
					}
				}
			}
		}
	}

	static drillPickupItems(vehicle) {
		// Ensure the vehicle exist
		if (!vehicle) return;

		// Get the machine's position
		const position = vehicle.location;
		const dimension = vehicle.dimension;

		// Define the search range
		const range = 4;

		// Find nearby items
		const items = dimension.getEntities({
			type: "minecraft:item",
			location: position,
			maxDistance: range,
		});

		// Get the machine's inventory
		const inventory = vehicle.getComponent("minecraft:inventory");
		if (!inventory) return;

		const container = inventory.container;

		for (const itemEntity of items) {
			const itemComponent = itemEntity.getComponent("minecraft:item");
			if (!itemComponent) continue;

			const itemStack = itemComponent.itemStack;
			if (!itemStack) continue;


			if (!VC.DrillPickups.includes(itemStack.typeId)) continue;

			// Track how much of the item remains to be picked up
			let remainingAmount = itemStack.amount;

			// Try to merge with existing stacks
			for (let i = 0; i < container.size; i++) {
				const slot = container.getItem(i);
				if (slot && slot.typeId === itemStack.typeId && slot.amount < slot.maxAmount) {
					const transferAmount = Math.min(remainingAmount, slot.maxAmount - slot.amount);
					slot.amount += transferAmount;
					remainingAmount -= transferAmount;

					container.setItem(i, slot);

					if (remainingAmount <= 0) break;
				}
			}

			// Try to place in an empty slot
			if (remainingAmount > 0) {
				for (let i = 0; i < container.size; i++) {
					const slot = container.getItem(i);
					if (!slot) {
						//set all Components of the new item to all of the components of the old one 
						const newStack = itemStack.clone();
						container.setItem(i, newStack);
						remainingAmount = 0;
						break;
					}
				}
			}

			// If all items were picked up, remove the entity
			if (remainingAmount <= 0) {
				itemEntity.kill();
				vehicle.runCommandAsync('playsound random.pop @a ~~~');
			} else {
				try {

					// Update the item entity with the remaining amount
					//set all Components of the new item to all of the components of the old one
					const updatedStack = itemStack.clone();
					itemEntity.getComponent("minecraft:item").itemStack = updatedStack;
				} catch (error) {

				}
			}
		}
	}

	static setOrbitView(vehicle, player) {
		// Ensure the vehicle and player exist
		if (!vehicle || !player) return;

		// Check if the player already has a tag indicating the camera is set
		if (!player.hasTag("camera_set")) {
			// Set the orbit camera view with the specified offsets
			player.runCommand(`camera @s set minecraft:follow_orbit view_offset -3 1 entity_offset -0 1 -5`);
			// Add a tag to indicate the camera is now set
			player.addTag("camera_set");
		} else {
			player.runCommand(`camera @s clear`)
			player.removeTag("camera_set");
		}
	}

	/**
	 * @description This function is called each tick for a specific vehicle
	 * @param {*} vehicle 
	 */
	static pullInMagnet(vehicle) {
		// Ensure the vehicle exists
		if (!vehicle) return;

		// Ensure the magnet is on
		if (!vehicle.getProperty("ab_ve:magnet")) return;

		// Get the vehicle's position and dimension
		const position = vehicle.location;
		const dimension = vehicle.dimension;

		// Define the search area (3x3x3 around the vehicle)
		const range = 3; // 3x3 range centered on the vehicle
		const entities = dimension.getEntities({
			location: position,
			maxDistance: range,
			excludeTypes: ["minecraft:player"] // Exclude players
		});

		// Iterate through entities and pull them towards the vehicle
		for (const entity of entities) {
			if (!entity || !entity.isValid()) continue;
			entity.addEffect("slow_falling", 1, { showParticles: false })
			// Calculate the direction vector towards the vehicle
			const dx = position.x - entity.location.x;
			const dy = position.y - entity.location.y;
			const dz = position.z - entity.location.z;
			const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

			if (distance > 0) {
				const pullStrength = 0.15; // Adjust pull strength as needed
				entity.applyImpulse({
					x: (dx / distance) * pullStrength,
					y: (dy / distance) * pullStrength,
					z: (dz / distance) * pullStrength
				});
			}
		}
	}

	static createStreet(vehicle, player) {
		// Ensure the vehicle and player exist
		if (!vehicle || !player) return;
	
		// Get the vehicle's position and dimension
		const position = vehicle.location;
		const dimension = vehicle.dimension;
	
		// Get the vehicle's inventory
		const inventory = vehicle.getComponent("minecraft:inventory");
		if (!inventory) return;
	
		const container = inventory.container;
	
		// Define the block types that can be replaced
		const replaceableBlocks = [
			"minecraft:grass_block",
			"minecraft:dirt",
			"minecraft:sand",
			"minecraft:gravel",
			"minecraft:coarse_dirt"
		];
	
		// Calculate the direction vector based on the vehicle's yaw (rotation)
		const yaw = (vehicle.getRotation().y * Math.PI) / 180; // Convert yaw to radians
		const forwardX = -Math.sin(yaw);
		const forwardZ = Math.cos(yaw);
	
		// Define the perpendicular direction for the 3-block-wide line
		const perpX = -forwardZ;
		const perpZ = forwardX;
	
		let placedBlock = false; // Track if any block was placed
	
		// Iterate over the 3-block-wide area behind the vehicle
		for (let offset = -2; offset <= 2; offset++) {
			const targetLocation = {
				x: position.x - forwardX + (perpX * offset), // Behind the vehicle and perpendicular offset
				y: position.y - 1,
				z: position.z - forwardZ + (perpZ * offset)
			};
	
			const block = dimension.getBlock(targetLocation);
	
			// Check if the block is replaceable
			if (block && replaceableBlocks.includes(block.typeId)) {
				// Check the inventory for a block to place
				for (let i = 0; i < container.size; i++) {
					const item = container.getItem(i);
					if (item && item.typeId.startsWith("minecraft:")) {
						
						// Replace the block with the inventory block
						block.setType(item.typeId);
						placedBlock = true; // Mark that a block was placed
	
						// Save the decremented amount separately
						const newAmount = item.amount - 1;
	
						if (newAmount <= 0) {
							container.setItem(i, null); // Remove the item if depleted
						} else {
							const updatedItem = item.clone(); // Clone the item to avoid modifying the original reference
							updatedItem.amount = newAmount;
							container.setItem(i, updatedItem); // Set the updated item back to the container
						}
	
						// Stop searching once a block is placed
						break;
					}
				}
			}
		}
	
		// Check if the inventory is fully empty
		let isInventoryEmpty = true;
		for (let i = 0; i < container.size; i++) {
			if (container.getItem(i)) {
				isInventoryEmpty = false;
				break;
			}
		}
	
		// If the inventory is empty, display a message to the player
		if (!placedBlock && isInventoryEmpty) {
			player.onScreenDisplay.setActionBar("§8[§bSpecial§8]§c Pathmaker inventory is empty!");
		}
	}
	

}
