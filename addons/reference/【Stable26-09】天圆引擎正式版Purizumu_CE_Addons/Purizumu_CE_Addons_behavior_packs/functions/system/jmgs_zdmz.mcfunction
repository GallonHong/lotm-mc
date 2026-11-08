execute @a[tag=jgfz_scope] ~~~ tp ~~~ facing @e[type=!item,type=!armor_stand,type=!thrown_trident,type=!arrow,type=!area_effect_cloud,type=!minecart,type=!chest_minecart,type=!command_block_minecart,type=!dragon_fireball,type=!egg,type=!snowball,type=!ender_crystal,type=!ender_pearl,type=!evocation_fang,type=!falling_block,type=!fireball,type=!fireworks_rocket,type=!fishing_hook,type=!leash_knot,type=!lightning_bolt,type=!lingering_potion,type=!llama_spit,r=50,rm=0.001,c=1,type=!xp_orb,type=!wither_skull,type=!wither_skull_dangerous]

tag @a[rx=-30] add climb1
tag @a[rx=-30] add climb2
tag @a[rx=-30] add climb3

execute @a ^^^ detect ^^^0.5 air 0 tag @s remove climb1
execute @a ^^^ detect ^0.5^^ air 0 tag @s remove climb2
execute @a ^^^ detect ^-0.5^^ air 0 tag @s remove climb3

effect @a[tag=climb1] levitation 1 2 true
effect @a[tag=climb2] levitation 1 2 true
effect @a[tag=climb3] levitation 1 2 true



gamerule sendCommandFeedback false