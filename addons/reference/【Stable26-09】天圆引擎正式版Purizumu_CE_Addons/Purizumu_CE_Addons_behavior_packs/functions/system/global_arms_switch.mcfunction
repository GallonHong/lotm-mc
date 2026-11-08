# 变身器·战斗模式
tellraw @a[hasitem={item=jmgs:arms_switch,location=slot.weapon.mainhand,slot=0},scores={bar=0..2},rx=-88] {"rawtext":[{"text":"§d您已通过变身器进入【战斗模式】"}]}
execute @a[hasitem={item=jmgs:arms_switch,location=slot.weapon.mainhand,slot=0},scores={bar=0..2},rx=-88] ~ ~ ~ particle minecraft:totem_particle ~ ~2 ~
execute @a[hasitem={item=jmgs:arms_switch,location=slot.weapon.mainhand,slot=0},scores={bar=0..2},rx=-88] ~ ~ ~ playsound se.se108 @s ~ ~ ~ 1 1 1
scoreboard players set @a[hasitem={item=jmgs:arms_switch,location=slot.weapon.mainhand,slot=0},scores={bar=0..2},rx=-88] bar 3
tellraw @a[hasitem={item=jmgs:arms_switch,location=slot.weapon.mainhand,slot=0},scores={bar=3},rxm=88] {"rawtext":[{"text":"§c您已通过变身器退出【战斗模式】"}]}
execute @a[hasitem={item=jmgs:arms_switch,location=slot.weapon.mainhand,slot=0},scores={bar=3},rxm=88] ~ ~ ~ playsound se.se109 @s ~ ~ ~ 1 1 1
scoreboard players set @a[hasitem={item=jmgs:arms_switch,location=slot.weapon.mainhand,slot=0},scores={bar=3},rxm=88] bar 2