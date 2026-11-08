# 载具服务卡基础运行
scoreboard players add @a[hasitem={item=jmgs:card_car,location=slot.weapon.mainhand,slot=0},rx=-88,scores={choose=0..98}] choose 2
scoreboard players add @a[hasitem={item=jmgs:card_car,location=slot.weapon.mainhand,slot=0},rxm=88,scores={choose=0..98}] choose 2
tellraw @a[hasitem={item=jmgs:card_car,location=slot.weapon.mainhand,slot=0},scores={choose=40},rx=-88] {"rawtext":[{"text":"§b您已通过个人载具服务卡召唤了您专属的精美载具。"}]}
tellraw @a[hasitem={item=jmgs:card_car,location=slot.weapon.mainhand,slot=0},scores={choose=40},rxm=88] {"rawtext":[{"text":"§b您已通过个人载具服务卡将您的个人专属载具送回了存放空间。"}]}
scoreboard players add @a[hasitem={item=jmgs:card_car,location=slot.weapon.mainhand,slot=0},scores={choose=1..}] choose -1

# 召唤载具
execute @p[hasitem={item=jmgs:card_car,location=slot.weapon.mainhand,slot=0},scores={choose=40},rx=-88] ~ ~ ~ scoreboard players operation @e[family=simple_car,scores={uid=1..}] guild = @p[hasitem={item=jmgs:card_car,location=slot.weapon.mainhand,slot=0},scores={choose=40},rx=-88] uid
execute @p[hasitem={item=jmgs:card_car,location=slot.weapon.mainhand,slot=0},scores={choose=40},rx=-88] ~ ~ ~ execute @e[family=simple_car,scores={guild=1..,uid=1..}] ~ ~ ~ scoreboard players operation @s guild -= @s uid
execute @e[name="车库传送锚点",type=armor_stand,c=1] ~ ~ ~ tp @e[family=simple_car,c=1,r=5000,scores={guild=0}] @p[hasitem={item=jmgs:card_car,location=slot.weapon.mainhand,slot=0},scores={choose=40},rx=-88]

# 送回载具
execute @a[hasitem={item=jmgs:card_car,location=slot.weapon.mainhand,slot=0},scores={choose=40},rxm=88] ~ ~ ~ tp @e[family=simple_car,c=1,r=10,scores={uid=1..}] @e[type=armor_stand,name="车库传送锚点"]
