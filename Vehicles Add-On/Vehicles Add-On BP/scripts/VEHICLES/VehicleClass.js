import { system, world, BlockPermutation, ItemStack } from '@minecraft/server';
import * as VC from './VehicleConstants.js';
import { VehicleSpecificFunctions } from './VehicleSpecificFunctions.js';

export class VehicleClass {

	static crackingTimers = new Map(); // Map to track timers for each entity
	static entityTickerSpeeds = new Map(); // Map to track ticker speed per entity

	// Utility function
	static removeTimerForEntity(entityId) {
		if (VehicleClass.crackingTimers.has(entityId)) {
			system.clearJob(VehicleClass.crackingTimers.get(entityId));
			VehicleClass.crackingTimers.delete(entityId);
		}
	}

	static resetCracking(entity) {
		try {
			const entityId = entity.id;

			// If a timer exists for this entity, clear it
			if (VehicleClass.crackingTimers.has(entityId)) {
				system.clearJob(VehicleClass.crackingTimers.get(entityId));
			}

			// Schedule a new timer to reset the cracking property
			const timer = system.runTimeout(() => {
				try {
					const crackingState = entity.getProperty('ab_ve:crack_state');
					if (crackingState > 0) {
						entity.setProperty('ab_ve:crack_state', 0); // Reset to 0
					}
					VehicleClass.crackingTimers.delete(entityId); // Remove timer from the map
				} catch (error) {
				}
			}, 30); // 30 ticks = 1.5 seconds

			// Store the timer job ID in the Map
			VehicleClass.crackingTimers.set(entityId, timer);
		} catch (error) {
		}
	}

	// Update ticker speed and apply effects
	static updateCarsTickerSpeed(entity) {
		try {
			const entityId = entity.id;
			const type = entity.typeId;

			//Needs to be called directly here for it to always work
			if (type === "ab_ve:truck" || type === "ab_ve:harvester" || type === "ab_ve:drill") {
				entity.triggerEvent("ab_ve:fix_inventory_size");
			}

			const ridingComponent = entity.getComponent("minecraft:rideable");
			const riders = ridingComponent.getRiders();

			if (entity.getDynamicProperty('honkCooldown') == undefined) {
				entity.setDynamicProperty('honkCooldown', 0);
			}
			let honkCooldown = entity.getDynamicProperty('honkCooldown'); // Initialize a cooldown counter

			if (riders.length > 0) {

				const isJumping = riders[0].isJumping;
				if (type === "ab_ve:racing_car") {
					VehicleSpecificFunctions.attemptToBoost(entity, riders[0]);
				}
				else if (type === "ab_ve:motorcycle") {
					VehicleSpecificFunctions.tryWheely(entity, riders[0]);
				}
				else if (isJumping && type === "ab_ve:drill") {
					if (honkCooldown <= 0) {
						if (entity.getProperty("ab_ve:active_drill")) {
							riders[0].onScreenDisplay.setActionBar(`§8[§bSpecial§8]§c Drill was deactivated!`);
							riders[0].runCommandAsync(`playsound note.bass @s ~~~ 0.2`);
						} else {
							riders[0].onScreenDisplay.setActionBar(`§8[§bSpecial§8]§a Drill was activated!`);
							riders[0].runCommandAsync(`playsound note.bell @s ~~~ 0.2`);
						}
						entity.triggerEvent("ab_ve:check_drill");
						entity.setDynamicProperty('honkCooldown', 60);
					}
				}
				else if (isJumping && type === "ab_ve:police_car") {
					if (honkCooldown <= 0) {
						entity.runCommandAsync(`playsound ab_ve.police_car.honk @a ^^^2 1 1 0.01`);
						entity.setDynamicProperty('honkCooldown', 5); // Reset the cooldown to 5 ticks
					}
				}
				else if (isJumping && type === "ab_ve:ambulance") {
					if (honkCooldown <= 0) {
						VehicleSpecificFunctions.amublanceAura(entity, riders[0]);
						entity.setDynamicProperty('honkCooldown', 120);
					}
				}
				else if (isJumping && type === "ab_ve:fire_truck") {
					if (honkCooldown <= 0) {
						VehicleSpecificFunctions.fireTruckProjectile(entity, riders[0]);
						entity.setDynamicProperty('honkCooldown', 4);
					}
				}
				else if (isJumping && type === "ab_ve:harvester") {
					if (honkCooldown <= 0) {
						VehicleSpecificFunctions.harvesterLogic(entity, riders[0]);

						entity.setDynamicProperty('honkCooldown', 2);
					}
				}
				else if (isJumping && type === "ab_ve:pathmaker") {
					VehicleSpecificFunctions.createStreet(entity, riders[0]);

				}
				else if (isJumping && type === "ab_ve:bus") {
					entity.runCommandAsync(`playsound ab_ve.bus.honk @a ^^^2 1 1 0.01`);

				}
				else if (isJumping) {
					entity.runCommandAsync(`playsound ab_ve.cars.honk @a ^^^2 1 1 0.01`);
				}
			}

			// Decrement the cooldown counter each tick
			if (honkCooldown > 0) {
				honkCooldown--;
				entity.setDynamicProperty('honkCooldown', honkCooldown);
			}



			// Retrieve levels from entity properties
			const maxSpeedLevel = entity.getProperty('ab_ve:max_speed') || 0;
			const accelerationLevel = entity.getProperty('ab_ve:acceleration') || 0;

			const velocity = entity.getVelocity();
			const viewDirection = entity.getViewDirection(); // Returns a Vector3 representing the forward direction

			// Calculate the dot product of viewDirection and velocity
			const dotProduct = velocity.x * viewDirection.x + velocity.y * viewDirection.y + velocity.z * viewDirection.z;

			// Check if the car is moving forward
			const isMoving = dotProduct > 0.1; // Positive dot product indicates forward motion

			// Get or initialize the current ticker speed
			let tickerSpeed = VehicleClass.entityTickerSpeeds.get(entityId) || 0;

			// Get max speed and acceleration from upgrades
			const maxSpeedEntry = VC.maxSpeedUpgrades[type]?.find(upgrade => upgrade.level === maxSpeedLevel);
			const accelerationEntry = VC.accelerationUpgrades[type]?.find(upgrade => upgrade.level === accelerationLevel);

			if (!maxSpeedEntry || !accelerationEntry) {
				console.warn(`Upgrades not defined for entity type: ${type} at Max Speed level: ${maxSpeedLevel} and Acceleration Level: ${accelerationLevel}`);
				return;
			}

			const maxSpeed = maxSpeedEntry.max_speed;
			const acceleration = accelerationEntry.acceleration;

			// Update ticker speed
			tickerSpeed = isMoving
				? Math.min(tickerSpeed + acceleration, maxSpeed * 200) // Ensure tickerSpeed does not exceed the maximum for its level
				: Math.max(tickerSpeed - 700, 0);

			// Calculate effect level (1 level per 200 tickerSpeed, capped by max_speed)
			const effectLevel = Math.min(Math.floor(tickerSpeed / 200), maxSpeed);

			// Apply speed effect
			VehicleClass.applySpeedEffect(entity, effectLevel);

			// Store updated ticker speed
			VehicleClass.entityTickerSpeeds.set(entityId, tickerSpeed);
			if (isMoving) {
				//console.log(`Entity ID: ${type}, EffectLevel: ${effectLevel}`);
			}

		} catch (error) {
			console.error("Error in updateCarsTickerSpeed:", error);
		}
	}


	// Update ticker speed and apply effects
	static updatePlanesTickerSpeed(entity) {
		try {

			const entityId = entity.id;
			const type = entity.typeId;

			const ridingComponent = entity.getComponent("minecraft:rideable");
			const riders = ridingComponent.getRiders();

			if (entity.getDynamicProperty('honkCooldown') == undefined) {
				entity.setDynamicProperty('honkCooldown', 0);
			}
			let honkCooldown = entity.getDynamicProperty('honkCooldown'); // Initialize a cooldown counter

			if (riders.length > 0) {

				const isJumping = riders[0].isJumping;

				if (isJumping && (type === "ab_ve:private_jet" || type === "ab_ve:common_plane")) {
					if (honkCooldown <= 0) {
						VehicleSpecificFunctions.setOrbitView(entity, riders[0]);

						entity.setDynamicProperty('honkCooldown', 5);
					}
				}
				else if (isJumping && (type === "ab_ve:cargo_helicopter")) {
					if (honkCooldown <= 0) {
						entity.triggerEvent("ab_ve:check_magnet");
						system.runTimeout(() => {
							if (entity.getProperty("ab_ve:magnet")) {
								riders[0].onScreenDisplay.setActionBar(`§8[§bSpecial§8]§a Magnet was activated!`);
								riders[0].runCommandAsync(`playsound note.bell @s ~~~ 0.2`);
							} else {
								riders[0].onScreenDisplay.setActionBar(`§8[§bSpecial§8]§c Magnet was deactivated!`);
								riders[0].runCommandAsync(`playsound note.bass @s ~~~ 0.2`);
							}
						}, 2)
						entity.setDynamicProperty('honkCooldown', 5);
					}
				}
			}

			// Decrement the cooldown counter each tick
			if (honkCooldown > 0) {
				honkCooldown--;
				entity.setDynamicProperty('honkCooldown', honkCooldown);
			}


			// Retrieve levels from entity properties
			const maxSpeedLevel = entity.getProperty('ab_ve:max_speed') || 0;
			const accelerationLevel = entity.getProperty('ab_ve:acceleration') || 0;

			const velocity = entity.getVelocity();
			const viewDirection = entity.getViewDirection(); // Returns a Vector3 representing the forward direction

			// Calculate the dot product of viewDirection and velocity
			const dotProduct = velocity.x * viewDirection.x + velocity.y * viewDirection.y + velocity.z * viewDirection.z;

			// Check if the car is moving forward
			const isMoving = dotProduct > 0.1; // Positive dot product indicates forward motion

			// Get or initialize the current ticker speed
			let tickerSpeed = VehicleClass.entityTickerSpeeds.get(entityId) || 0;

			// Get max speed and acceleration from upgrades
			const maxSpeedEntry = VC.maxSpeedUpgrades[type]?.find(upgrade => upgrade.level === maxSpeedLevel);
			const accelerationEntry = VC.accelerationUpgrades[type]?.find(upgrade => upgrade.level === accelerationLevel);

			if (!maxSpeedEntry || !accelerationEntry) {
				console.warn(`Upgrades not defined for entity type: ${type} at Max Speed level: ${maxSpeedLevel} and Acceleration Level: ${accelerationLevel}`);
				return;
			}

			const maxSpeed = maxSpeedEntry.max_speed;
			const acceleration = accelerationEntry.acceleration;

			// Update ticker speed
			tickerSpeed = isMoving
				? Math.min(tickerSpeed + acceleration, maxSpeed * 200) // Ensure tickerSpeed does not exceed the maximum for its level
				: Math.max(tickerSpeed - 700, 0);

			// Calculate effect level (1 level per 200 tickerSpeed, capped by max_speed)
			const effectLevel = Math.min(Math.floor(tickerSpeed / 200), maxSpeed);

			// Apply speed effect
			VehicleClass.applySpeedEffect(entity, effectLevel);

			// Store updated ticker speed
			VehicleClass.entityTickerSpeeds.set(entityId, tickerSpeed);
			if (isMoving) {
				//console.log(`Entity ID: ${type}, EffectLevel: ${effectLevel}`);
			}

		} catch (error) {
			console.error("Error in updatePlanesTickerSpeed:", error);
		}
	}


	// Update ticker speed and apply effects
	static updateBoatsTickerSpeed(entity) {
		try {
			const entityId = entity.id;
			const type = entity.typeId;

			const ridingComponent = entity.getComponent("minecraft:rideable");
			const riders = ridingComponent.getRiders();

			if (entity.getDynamicProperty('honkCooldown') == undefined) {
				entity.setDynamicProperty('honkCooldown', 0);
			}
			let honkCooldown = entity.getDynamicProperty('honkCooldown'); // Initialize a cooldown counter

			if (riders.length > 0) {
				const isJumping = riders[0].isJumping;
				if (isJumping && type === "ab_ve:fishing_trawler" && entity.isInWater) {

					if (honkCooldown <= 0) {

						VehicleSpecificFunctions.attemptFish(entity, riders[0]);

						entity.setDynamicProperty('honkCooldown', 500);
					}
				}
			}

			// Decrement the cooldown counter each tick
			if (honkCooldown > 0) {
				honkCooldown--;
				entity.setDynamicProperty('honkCooldown', honkCooldown);
				if (honkCooldown == 0) {
					try {
						riders[0].onScreenDisplay.setActionBar(`§8[§bSpecial§8]§a Special is ready to use!`);
						riders[0].runCommandAsync(`playsound note.bell @s ~~~ 0.2`);
					} catch (error) {

					}
				}
			}


			// Retrieve levels from entity properties
			const maxSpeedLevel = entity.getProperty('ab_ve:max_speed') || 0;
			const accelerationLevel = entity.getProperty('ab_ve:acceleration') || 0;

			const velocity = entity.getVelocity();
			const viewDirection = entity.getViewDirection(); // Returns a Vector3 representing the forward direction

			// Calculate the dot product of viewDirection and velocity
			const dotProduct = velocity.x * viewDirection.x + velocity.y * viewDirection.y + velocity.z * viewDirection.z;

			// Check if the car is moving forward
			const isMoving = dotProduct > 0.045; // Positive dot product indicates forward motion

			// Get or initialize the current ticker speed
			let tickerSpeed = VehicleClass.entityTickerSpeeds.get(entityId) || 0;

			// Get max speed and acceleration from upgrades
			const maxSpeedEntry = VC.maxSpeedUpgrades[type]?.find(upgrade => upgrade.level === maxSpeedLevel);
			const accelerationEntry = VC.accelerationUpgrades[type]?.find(upgrade => upgrade.level === accelerationLevel);

			if (!maxSpeedEntry || !accelerationEntry) {
				console.warn(`Upgrades not defined for entity type: ${type} at Max Speed level: ${maxSpeedLevel} and Acceleration Level: ${accelerationLevel}`);
				return;
			}

			const maxSpeed = maxSpeedEntry.max_speed;
			const acceleration = accelerationEntry.acceleration;

			// Update ticker speed
			tickerSpeed = isMoving
				? Math.min(tickerSpeed + acceleration, maxSpeed * 200) // Ensure tickerSpeed does not exceed the maximum for its level
				: Math.max(tickerSpeed - 700, 0);

			// Calculate effect level (1 level per 200 tickerSpeed, capped by max_speed)
			const effectLevel = Math.min(Math.floor(tickerSpeed / 200), maxSpeed);

			entity.setProperty('ab_ve:current_speed', effectLevel);
			entity.triggerEvent("ab_ve:update_speed_group");

			// Store updated ticker speed
			VehicleClass.entityTickerSpeeds.set(entityId, tickerSpeed);
			if (isMoving) {
				//console.log(`Entity ID: ${type}, EffectLevel: ${effectLevel}`);
			}

		} catch (error) {
			console.error("Error in updatePlanesTickerSpeed:", error);
		}
	}

	// Apply speed effect
	static applySpeedEffect(entity, effectLevel) {
		try {
			entity.addEffect("speed", 5, { amplifier: effectLevel, showParticles: false }); // Apply speed effect for 1 second
		} catch (error) {
			console.error("Error applying speed effect:", error);
		}
	}

	// Per-tick function to update all vehicles
	static updateAllVehicles() {

		const dimensions = ["overworld", "nether", "the_end"];
		// Iterate through each dimension
		for (const dimensionName of dimensions) {
			const dimension = world.getDimension(dimensionName);
			if (!dimension) continue;

			// Get all machines in the dimension
			const carTypeIds = VC.vehicles.cars.map(car => car.name);
			const planeTypeIds = VC.vehicles.planes.map(plane => plane.name);
			const boatTypeIds = VC.vehicles.boats.map(boat => boat.name);

			const cars = dimension.getEntities().filter(entity =>
				carTypeIds.includes(entity.typeId)
			);

			const planes = dimension.getEntities().filter(entity =>
				planeTypeIds.includes(entity.typeId)
			);

			const boats = dimension.getEntities().filter(entity =>
				boatTypeIds.includes(entity.typeId)
			);

			// Process each car
			for (const entity of cars) {
				VehicleClass.updateCarsTickerSpeed(entity);
				if (entity.typeId === "ab_ve:drill") {
					VehicleSpecificFunctions.drillPickupItems(entity);
				}
			}
			// Process each plane
			for (const entity of planes) {
				VehicleClass.updatePlanesTickerSpeed(entity);
				if (entity.typeId === "ab_ve:cargo_helicopter") {
					VehicleSpecificFunctions.pullInMagnet(entity);
				}
			}
			// Process each boat
			for (const entity of boats) {
				VehicleClass.updateBoatsTickerSpeed(entity);
			}
		}
	}
}
