# 房主身边奖励
execute @a[tag=admin] ~ ~ ~ tell @a[r=30,tag=!admin] 待在房主身边金币+1
execute @a[tag=admin] ~ ~ ~ scoreboard players add @a[r=30,tag=!admin] coin 1

# 精力值上限
scoreboard players set @a[scores={level=0,global_hp=101..}] global_hp 100
scoreboard players set @a[scores={level=2..3,global_hp=201..}] global_hp 200
scoreboard players set @a[scores={level=4..5,global_hp=301..}] global_hp 300

# 刷新数值
scoreboard players add @a audio 0
scoreboard players add @a notice 0
scoreboard players add @a guild 0
scoreboard players add @a task 0
scoreboard players add @a level 0
scoreboard players add @a hair 0
scoreboard players add @a alert 0
scoreboard players add @a temp 0
scoreboard players add @a daily_mark 0
scoreboard players add @a kkz -1
scoreboard players add @a coin 1
scoreboard players add @a playtime 1

# 公会成员奖励与新人呵护
scoreboard players add @a[scores={guild=888}] coin 2
effect @a[scores={guild=12}] health_boost 120 4 true
effect @a[scores={guild=12}] weakness 120 2 true
effect @a[scores={guild=11}] resistance 120 0 true
effect @a[scores={guild=11}] speed 120 0 true
effect @a[scores={guild=11}] jump_boost 120 1 true
effect @a[scores={level=-1..1}] health_boost 70 0 true
effect @a[scores={level=-1..1}] resistance 70 0 true