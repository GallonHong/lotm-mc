scoreboard objectives add aug dummy
scoreboard objectives add tactile dummy
scoreboard objectives add pitviper dummy
scoreboard objectives add scar dummy
scoreboard objectives add cd dummy
scoreboard objectives add L4gg-armorPoints dummy
scoreboard objectives add barret dummy
scoreboard objectives add hb dummy
scoreboard objectives add hkc dummy
scoreboard objectives add mosin dummy
scoreboard objectives add glock dummy
scoreboard objectives add stamina dummy
scoreboard objectives add colt dummy
event entity @s[tag=!gender] dadi:lanang
tag @s[tag=!gender] add gender
scoreboard players set @a[tag=!bullet] pitviper 0
scoreboard players set @a[tag=!bullet] tactile 0
scoreboard players set @a[tag=!bullet] aug 0
scoreboard players set @a[tag=!bullet] scar 0
scoreboard players set @a[tag=!bullet] hb 0
scoreboard players set @a[tag=!bullet] hkc 0
scoreboard players set @a[tag=!bullet] mosin 0
scoreboard players set @a[tag=!bullet] glock 0
scoreboard players set @a[tag=!bullet] colt 0
give @a[tag=!bullet] bridge:minedollar4 25
give @a[tag=!bullet] bridge:laptop_spawn_egg
loot give @s[tag=!bullet,m=!c] loot s4gshtufgxgj
tag @a[tag=!bullet] add scarnomag
tag @a[tag=!bullet] add hbnomag
tag @a[tag=!bullet] add tactilenomag
tag @a[tag=!bullet] add barretnomag
tag @a[tag=!bullet] add hkcnomag
tag @a[tag=!bullet] add augnomag
tag @a[tag=!bullet] add glocknomag
tag @a[tag=!bullet] add coltnomag
tag @a[tag=!bullet] add bullet
execute as @s[hasitem={item=hengker:barret,location=slot.weapon.mainhand}] run function barret_check
execute as @s[hasitem={item=hengker:tactile,location=slot.weapon.mainhand}] run function tactile_check
execute as @s[hasitem={item=hengker:scar,location=slot.weapon.mainhand}] run function scar_check
execute as @s[hasitem={item=hengker:mosin,location=slot.weapon.mainhand}] run function mosin_check
execute as @s[hasitem={item=hengker:hkc,location=slot.weapon.mainhand}] run function hkc_check
execute as @s[hasitem={item=hengker:hb,location=slot.weapon.mainhand}] run function hb_check
execute as @s[hasitem={item=hengker:glock,location=slot.weapon.mainhand}] run function glock_check
execute as @s[hasitem={item=hengker:colt,location=slot.weapon.mainhand}] run function colt_check