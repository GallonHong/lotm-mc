# 跨维度服务
scoreboard players set @a dimension 1
execute @a[scores={level=0..}] ~ ~ ~ detect ~ 255 ~ air 0 scoreboard players set @s dimension 0
effect @a[scores={dimension=1}] slow_falling 16 0 true
effect @a[scores={dimension=1}] jump_boost 16 1 true