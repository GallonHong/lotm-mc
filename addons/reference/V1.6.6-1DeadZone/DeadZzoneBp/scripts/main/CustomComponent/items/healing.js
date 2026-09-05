import { world, ItemStack } from "@minecraft/server";

world.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent('mcpe:splint', {
		onConsume(e) => {
			const player = e.source
			const item = e.itemStack
			
			if (item?.typeId == "mcpe:splint") {
				player.runCommandAsync(
					'effect @s slowness 0 225 false'
				);
				player.runCommandAsync(
					'effect @s absorption 20 0 false'
				);
				player.runCommandAsync(
					'event entity @s broken_bone_remove'
				);
				player.runCommandAsync(
					'event entity @s remove_damage_sensor'
				);
			}
			if (item?.typeId == "mcpe:morphine") {
				player.runCommandAsync(
					'effect @s slowness 0 225 false'
				);
				player.runCommandAsync(
					'effect @s absorption 20 0 false'
				);
				player.runCommandAsync(
					'scoreboard players add @s overdose 4'
				);
				player.runCommandAsync(
					'event entity @s broken_bone_remove'
				);
				player.runCommandAsync(
					'event entity @s remove_damage_sensor'
				);
			}
		}
	});
})
    	