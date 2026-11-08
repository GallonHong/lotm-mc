# UID分配
scoreboard players add @a uid 0
execute @p[scores={uid=0}] ~ ~ ~ scoreboard players add 注册人数 statistics 1
scoreboard players set @p[scores={uid=0}] guild 2000
scoreboard players set @p[scores={uid=0}] bar 2
scoreboard players set @p[scores={uid=0}] coin 700
scoreboard players set @p[scores={uid=0}] hair 60
scoreboard players set @p[scores={uid=0}] robber 0
scoreboard players set @p[scores={uid=0}] task 101
playsound se.se10003 @p[tag=!admin,scores={uid=0}] ~ ~ ~ 1 1 1
execute @p[scores={uid=0}] ~~~ tellraw @s {"rawtext":[{"text":"<server>您已被分配UID：§d "},{"score":{"name":"注册人数","objective":"statistics"}},{"text":" §r，并自动完成了注册，初始资产：公会号2020、金币700、猫毛60、完整状态栏，已发放！§a注意：为了确保不遮挡视野，底部状态栏要低头才会显示。"}]}
scoreboard players operation @p[scores={uid=0}] uid = 注册人数 statistics