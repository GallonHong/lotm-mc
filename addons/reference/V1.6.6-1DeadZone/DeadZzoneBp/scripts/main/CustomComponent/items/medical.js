import { world, ItemStack } from "@minecraft/server";

world.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent('mcpe:heal', {
		onConsume(e) => {
			const player = e.source
			const item = e.itemStack
			
			if (item?.typeId == "mcpe:adrenaline") {
				player.runCommandAsync(
					'effect @s speed 20 0 false'
				);
				player.runCommandAsync(
					'effect @s absorption 20 0 false'
				);
				player.runCommandAsync(
					'effect @s regeneration 10 0 false'
				);
				player.runCommandAsync(
					'effect @s strength 45 0 false'
				);
			}
			if (item?.typeId == "mcpe:antidote") {
				player.runCommandAsync(
					'effect @s regeneration 10 0 false'
				);
				player.runCommandAsync(
					'scoreboard players add @s overdose 7'
				);
				player.runCommandAsync(
					'scoreboard players remove @s infection 20'
				);
				player.runCommandAsync(
					'event entity @s infected_remove'
				);
			}
			if (item?.typeId == "mcpe:painkiller") {
				player.runCommandAsync(
					'effect @s speed 20 0 false'
				);
				player.runCommandAsync(
					'effect @s absorption 60 0 false'
				);
				player.runCommandAsync(
					'effect @s regeneration 10 0 false'
				);
				player.runCommandAsync(
					'effect @s strength 90 0 false'
				);
				player.runCommandAsync(
					'scoreboard players add @s overdose 2'
				);
			}
			if (item?.typeId == "mcpe:painkiller") {
				player.runCommandAsync(
					'effect @s speed 20 0 false'
				);
				player.runCommandAsync(
					'effect @s absorption 60 0 false'
				);
				player.runCommandAsync(
					'effect @s regeneration 10 0 false'
				);
				player.runCommandAsync(
					'effect @s strength 90 0 false'
				);
				player.runCommandAsync(
					'scoreboard players add @s overdose 2'
				);
			}
			if (item?.typeId == "mcpe:rags") {
				player.runCommandAsync(
					'effect @s regeneration 3 0 false'
				);
				player.runCommandAsync(
					'event entity @s bleeding_remove'
				);
			}
			if (item?.typeId == "mcpe:rags_sterilized") {
				player.runCommandAsync(
					'effect @s regeneration 3 0 false'
				);
				player.runCommandAsync(
					'effect @s hunger 0 225 false'
				);
				player.runCommandAsync(
					'scoreboard players remove @s infection 10'
				);
				player.runCommandAsync(
					'event entity @s bleeding_remove'
				);
			}
			if (item?.typeId == "mcpe:rags_dirty") {
				player.runCommandAsync(
					'effect @s regeneration 3 0 false'
				);
				player.runCommandAsync(
					'scoreboard players add @s infection 5'
				);
				player.runCommandAsync(
					'event entity @s bleeding_remove'
				);
				player.runCommandAsync(
					'event entity @s infected'
				);
			}
			if (item?.typeId == "mcpe:alcoholic_tinture") {
				player.runCommandAsync(
					'effect @s nausea 45 0 false'
				);
				player.runCommandAsync(
					'effect @s strength 30 0 false'
				);
				player.runCommandAsync(
					'scoreboard players add @s thirst 6'
				);
				player.runCommandAsync(
					'scoreboard players add @s stamina 20'
				);
			}
			if (item?.typeId == "mcpe:blood_bag_type_a") {
				player.runCommandAsync(
					'scoreboard players add @s[tag=blood_type_a] blood 125'
				);
			}
			if (item?.typeId == "mcpe:blood_bag_type_ab") {
				player.runCommandAsync(
					'scoreboard players add @s[tag=blood_type_a] blood 125'
				);
				player.runCommandAsync(
					'scoreboard players add @s[tag=blood_type_ab] blood 125'
				);
				player.runCommandAsync(
					'scoreboard players add @s[tag=blood_type_b] blood 125'
				);
				player.runCommandAsync(
					'scoreboard players add @s[tag=blood_type_o] blood 125'
				);
			}
			if (item?.typeId == "mcpe:blood_bag_type_b") {
				player.runCommandAsync(
					'scoreboard players add @s[tag=blood_type_b] blood 125'
				);
			}
			if (item?.typeId == "mcpe:blood_bag_type_o") {
				player.runCommandAsync(
					'scoreboard players add @s[tag=blood_type_o] blood 125'
				);
			}
		}
	});
})
    	