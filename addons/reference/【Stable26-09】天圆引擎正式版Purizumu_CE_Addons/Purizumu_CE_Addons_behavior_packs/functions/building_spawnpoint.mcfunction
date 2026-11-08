# 建立主城
structure load demo:spawnpoint ~-8 49 ~-8
execute @p ~ ~ ~ tp @s ~ 68 ~
title @a title 已建立主城
tellraw @p {"rawtext":[{"text":"§e您已建立主城。在本建筑物的最底层可以对主城进行扩建。"}]}
playsound jmgs.radio @a ~ ~ ~ 1 1 1