# 电量恢复
scoreboard players add @a[scores={prestige=0..499,mp=..19}] mp 1
scoreboard players add @a[scores={prestige=500..999,mp=..39}] mp 1
scoreboard players add @a[scores={prestige=1000..1499,mp=..88}] mp 2
scoreboard players add @a[scores={prestige=1500..1999,mp=..118}] mp 2
scoreboard players add @a[scores={prestige=2000..,mp=..297}] mp 3
scoreboard players add @a mp 0
execute @a[scores={mp=..19}] ~ ~3 ~ detect ~ ~7 ~ air 0 scoreboard players add @a[scores={mp=..19}] mp 1
execute @a[scores={mp=..19}] ~ ~3 ~ detect ~ ~7 ~ air 0 title @s actionbar §a卫星配电中…

# 低电量负面效果
tellraw @a[scores={mp=..-1}] {"rawtext":[{"text":"§c§l危险！初浔的电源已经过载！请您保持警惕！"}]}
effect @a[scores={mp=..-1}] weakness 10 3 true
effect @a[scores={mp=..-20}] blindness 10 1 true
title @a[scores={mp=..-20}] title §c电源已达到临界值
effect @a[scores={mp=..-25}] wither 10 3 true
effect @a[scores={mp=..-40}] fatal_poison 10 4 true

# 声望效果
effect @a[scores={prestige=300..}] jump_boost 30 0 true
effect @a[scores={prestige=500..699}] strength 30 0 true
effect @a[scores={prestige=700..}] water_breathing 30 0 true
effect @a[scores={prestige=900..}] strength 30 1 true
effect @a[scores={prestige=1100..}] saturation 30 0 true
effect @a[scores={prestige=1300..}] fire_resistance 30 0 true
effect @a[scores={prestige=1500..}] health_boost 30 4 true
effect @a[scores={prestige=2000..}] resistance 30 0 true
execute @a[scores={prestige=1000..}] ~ ~ ~ effect @e[family=simple_car,r=6,c=1] regeneration 5 0 true

# 口渴值相关服务
execute @a[scores={kkz=..100}] ~~~ detect ~~~ water -1 scoreboard players add @s kkz 10
execute @a[scores={kkz=..100}] ~ ~ ~ detect ~ ~ ~ water -1 playsound random.drink @s
effect @a[scores={kkz=90..100}] resistance 20 1 true
effect @a[scores={kkz=..20,playtime=5..}] weakness 20 1 true
kill @a[scores={kkz=..0,playtime=5..}]
execute @a[scores={kkz=..99}] ~ ~ ~ detect ~ ~-3 ~ sand 1 scoreboard players add @s kkz -1
scoreboard objectives setdisplay sidebar
scoreboard objectives setdisplay sidebar kkz descending