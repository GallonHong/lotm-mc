# 没电了
tellraw @a[scores={mp=..-1}] {"rawtext":[{"text":"§c§l危险！电源已经过载！请您保持警惕！"}]}
effect @a[scores={mp=..-1}] weakness 10 3 true
effect @a[scores={mp=..-20}] blindness 10 1 true
title @a[scores={mp=..-20}] title §c电源已达到临界值
effect @a[scores={mp=..-25}] wither 10 3 true
effect @a[scores={mp=..-40}] fatal_poison 10 4 true
kill @a[scores={mp=..-50}]
scoreboard players set @a[scores={mp=..-50}] mp -49

# 充电
scoreboard players add @a mp 0
scoreboard players add @a[scores={mp=..39}] mp 1
scoreboard players add @a[scores={prestige=500..,mp=..69}] mp 1
scoreboard players add @a[scores={prestige=1000..,mp=..99}] mp 1
scoreboard players add @a[scores={prestige=1500..,mp=..149}] mp 1
scoreboard players add @a[scores={prestige=2000..,mp=..299}] mp 1
execute @a[scores={mp=..120}] ~ ~ ~ detect ~ ~-1 ~ redstone_block 0 title @s actionbar §c 红石极速充电中…
execute @a[scores={mp=..90}] ~ ~ ~ detect ~ ~-1 ~ redstone_block 0 scoreboard players add @s mp 20
scoreboard players add @a[scores={prestige=5000..,mp=..499}] mp 1
scoreboard players add @a[scores={prestige=3500..,mp=..399}] mp 1
scoreboard players add @a[tag=normal,scores={bar=3,mp=..398}] mp 2
execute @a[scores={mp=..19}] ~ ~3 ~ detect ~ ~7 ~ air 0 scoreboard players add @s mp 1
execute @a[scores={mp=..19}] ~ ~3 ~ detect ~ ~7 ~ air 0 title @s actionbar §a卫星配电中…

# 飞机耗电
execute @e[family=plane] ~ ~ ~ scoreboard players add @p[r=2,scores={bar=3,mp=1..}] mp -1