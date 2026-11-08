# 公会成员奖励
scoreboard players add @a[scores={guild=888}] coin 2
effect @a[scores={guild=12}] health_boost 120 4 true
effect @a[scores={guild=12}] weakness 120 2 true
effect @a[scores={guild=11}] resistance 120 0 true
effect @a[scores={guild=11}] speed 120 0 true
effect @a[scores={guild=11}] jump_boost 120 1 true

# 钥匙房冷却时间恢复
scoreboard players add @a[scores={choose=-99..-1}] choose 1