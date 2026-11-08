# 移除控制台
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ spreadplayers ~ ~ 0 5 @a[r=100,tag=admin]
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ fill ~ ~37 ~ ~64 ~42 ~64 stone
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ fill ~ ~31 ~ ~64 ~36 ~64 stone
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ fill ~ ~25 ~ ~64 ~30 ~64 stone
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ fill ~ ~19 ~ ~64 ~24 ~64 stone
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ fill ~ ~13 ~ ~64 ~18 ~64 stone
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ fill ~ ~7 ~ ~64 ~12 ~64 stone
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ fill ~ ~ ~ ~64 ~6 ~64 stone
kill @e[name="system_core",type=armor_stand]
kill @e[name="控制台传送锚点",type=armor_stand]
kill @e[name="车库传送锚点",type=armor_stand]
tickingarea remove main_system
playsound se.se10004 @a ~ ~ ~ 1 1 1
tellraw @a {"rawtext":[{"text":"§c管理员已完全移除了控制台组件"}]}