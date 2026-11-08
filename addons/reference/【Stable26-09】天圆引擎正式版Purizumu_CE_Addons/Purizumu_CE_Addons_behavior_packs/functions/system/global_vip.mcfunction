# VIP连锁挖矿
execute @a[tag=vip] ~ ~ ~ execute @e[r=6,type=item,name=可可豆] ~~~ fill ~6 ~6 ~6 ~-6 ~-6 ~-6 cocoa 0 replace iron_ore
execute @a[tag=vip] ~ ~ ~ execute @e[r=6,type=item,name=可可豆] ~~~ setblock ~~0~ iron_ore
execute @a[tag=vip] ~ ~ ~ execute @e[r=6,type=item,name=可可豆] ~~~ setblock ~~0~ air 0 destroy
execute @a[tag=vip] ~ ~ ~ execute @e[r=6,type=item,name=可可豆] ~~~ kill @s

# VIP连锁砍树
execute @a[tag=vip] ~ ~ ~ execute @e[r=6,type=item,name=橡树原木] ~~~ detect ~~1~ log 0 fill ~1 ~-1 ~1 ~-1 ~15 ~-1 cocoa 0 replace log 0
execute @a[tag=vip] ~ ~ ~ execute @e[r=6,type=item,name=橡树原木] ~~~ execute @e[r=10,type=item,name=可可豆] ~~~ setblock ~~0~ log 0
execute @a[tag=vip] ~ ~ ~ execute @e[r=6,type=item,name=橡树原木] ~~~ execute @e[r=10,type=item,name=可可豆] ~~~ setblock ~~0~ air 0 destroy
execute @a[tag=vip] ~ ~ ~ execute @e[r=6,type=item,name=橡树原木] ~~~ execute @e[r=10,type=item,name=可可豆] ~~~ kill @s