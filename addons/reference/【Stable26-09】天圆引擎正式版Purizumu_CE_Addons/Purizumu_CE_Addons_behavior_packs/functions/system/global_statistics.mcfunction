# 统计信息刷新
scoreboard players reset §b在线玩家§r statistics
scoreboard players reset §e在线管理§r statistics
scoreboard players reset §c全部实体§r statistics
scoreboard players reset §d掉落物品§r statistics
scoreboard players reset 载具资产 statistics
scoreboard players reset 怪物数量 statistics
scoreboard players reset 演员数量 statistics
scoreboard players reset 全网算力 statistics
scoreboard players reset 箭矢数量 statistics
execute @a ~ ~ ~ scoreboard players add §b在线玩家§r statistics 1
execute @a[tag=admin] ~ ~ ~ scoreboard players add §e在线管理§r statistics 1
execute @e ~ ~ ~ scoreboard players add §c全部实体§r statistics 1
execute @e[type=item] ~ ~ ~ scoreboard players add §d掉落物品§r statistics 1
execute @e[type=arrow] ~ ~ ~ scoreboard players add 箭矢数量 statistics 1
execute @e[family=simple_car] ~ ~ ~ scoreboard players add 载具资产 statistics 1
execute @e[family=monster] ~ ~ ~ scoreboard players add 怪物数量 statistics 1
execute @e[family=toy] ~ ~ ~ scoreboard players add 演员数量 statistics 1
execute @e[name="猫猫币挖矿猫",type=cat] ~ ~ ~ scoreboard players add 全网算力 statistics 1
scoreboard players set bug数量 statistics 0