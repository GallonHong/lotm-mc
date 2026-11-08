# 侦查无人机基础运行
scoreboard players add @a[hasitem={item=jmgs:scout_plane,location=slot.weapon.mainhand,slot=0},rx=-88,scores={choose=0..98}] choose 2
scoreboard players add @a[hasitem={item=jmgs:scout_plane,location=slot.weapon.mainhand,slot=0},rxm=88,scores={choose=2..100}] choose -2
scoreboard players add @a[hasitem={item=jmgs:scout_plane,location=slot.weapon.mainhand,slot=0},scores={choose=1..}] choose -1