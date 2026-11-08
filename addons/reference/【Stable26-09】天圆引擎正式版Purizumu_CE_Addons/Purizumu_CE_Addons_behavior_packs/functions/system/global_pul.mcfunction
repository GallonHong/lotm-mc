# 违禁品
clear @a[scores={level=-1..0}] spawn_egg
clear @a[scores={level=-1..3}] appleenchanted
clear @a[scores={level=-1..3}] tnt
clear @a[scores={level=-1..0}] enchanted_book
clear @a[scores={level=-1..2}] bucket
clear @a[scores={level=-1..3}] bedrock
clear @a[scores={level=-1..3}] piston
clear @a[scores={level=-1..3}] sticky_piston

# 禁用0到1权限副手
replaceitem entity @a[scores={level=0..1}] slot.weapon.offhand 0 air

# 生存常驻服务
execute @a[scores={kkz=..-1}] ~~~scoreboard players set @s kkz 0
execute @a[scores={kkz=101..}] ~~~ scoreboard players add @s kkz -1
execute @e[type=item,name=水瓶] ~~~ scoreboard players add @p[r=1] kkz 15
execute @e[type=item,name=水瓶] ~~~ playsound random.drink @p[r=1]
execute @e[name=水瓶,type=item] ~~~ give @p[r=1] glass_bottle 1
kill @e[name=水瓶,type=item]