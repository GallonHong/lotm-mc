# 锁定管理员金钱
scoreboard players set @a[scores={level=5}] coin 10000
scoreboard players set @a[scores={level=5}] hair 1000

# 精力值恢复
scoreboard players add * global_hp 1
tell @a[scores={level=0..10,global_hp=..5}] 您的精力值即将消耗殆尽，肝游戏也要注意休息呦~
scoreboard players add @a[scores={level=5,global_hp=..300}] global_hp 5

# 5分钟挂机声望收益
scoreboard players add @a prestige 1