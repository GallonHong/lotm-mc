import { system, world, ItemStack, Entity, ItemLockMode } from '@minecraft/server';

const EntitySpawner = {
    onUseOn(event) {
        // Ensure the event source is a player
        const player = event.source;
        const block = event.block;
        const item = event.itemStack;


        if (!player || player.typeId !== 'minecraft:player' || !item) {
            return;
        }

        // Extract entity type from the item's ID
        const itemId = item.typeId; // e.g., "ab_ve:common_car_spawner"
        const entityType = itemId.replace("_spawner", ""); // e.g., "ab_ve:common_car"

        // Ensure it's a valid entity type
        if (!entityType.startsWith("ab_ve:")) {
            player.sendMessage("§cInvalid spawner item.");
            return;
        }

        // Extract properties from item lore
        const lore = item.getLore();
        const properties = {};
        lore.forEach(line => {
            if (line.startsWith("§eMax Speed: §f")) {
                properties["ab_ve:max_speed"] = parseInt(line.replace("§eMax Speed: §f", ""), 10);
            } else if (line.startsWith("§eAcceleration: §f")) {
                properties["ab_ve:acceleration"] = parseInt(line.replace("§eAcceleration: §f", ""), 10);
            } else if (line.startsWith("§eSpecial: §f")) {
                properties["ab_ve:special"] = parseInt(line.replace("§eSpecial: §f", ""), 10);
            } else if (line.startsWith("§eColor ID: §f")) {
                properties["ab_ve:color"] = parseInt(line.replace("§eColor ID: §f", ""), 10);
            }
        });
        // Spawn the entity at the target block's location
        const location = {
            x: block.x + 0.5,
            y: block.y + 1,
            z: block.z + 0.5
        };

        const spawnedEntity = world.getDimension(player.dimension.id).spawnEntity(entityType, location);

        spawnedEntity.setRotation(player.getRotation());

        // Set the entity properties
        for (const [key, value] of Object.entries(properties)) {
            try {
                spawnedEntity.setProperty(key, value);
            } catch (error) {
                
            }
        }
        // Remove the item from the player's hand
        const equipment = player.getComponent("minecraft:equippable");
        equipment.setEquipment("Mainhand", null)

    }
};

export default EntitySpawner;
