# 扭蛋
tellraw @p {"rawtext":[{"text":"§d您成功的使用扭蛋券进行了一次扭蛋！已为您生成奖品！"}]}
particle minecraft:water_evaporation_bucket_emitter ~ ~0.5 ~
loot spawn ~ ~2 ~ loot "jmgs/delta_egg"
playsound block.turtle_egg.break @p ~ ~1 ~ 0.9 1 0.9
tellraw @p {"rawtext":[{"text":"§f您获得了:"},{"selector":"@e[x=~,y=~2,z=~,r=3,type=item]"}]}
tp @e[x=~,y=~2,z=~,r=3,type=item] @p
title @p title 恭喜您中奖了！