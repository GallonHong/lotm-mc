# mp3基础运行
tellraw @a[hasitem={item=jmgs:mp3,location=slot.weapon.mainhand,slot=0},rx=-88] {"rawtext":[{"text":"§b正在随机播放内置音乐包内的曲目。"}]}
tellraw @a[hasitem={item=jmgs:mp3,location=slot.weapon.mainhand,slot=0},rxm=88] {"rawtext":[{"text":"§7已静音音乐播放器的声音。"}]}
execute @a[hasitem={item=jmgs:mp3,location=slot.weapon.mainhand,slot=0},rx=-88] ~ ~ ~ stopsound @s mp3_music
execute @a[hasitem={item=jmgs:mp3,location=slot.weapon.mainhand,slot=0},rx=-88] ~ ~ ~ playsound mp3_music @s ~ ~ ~ 1 1 1
execute @a[hasitem={item=jmgs:mp3,location=slot.weapon.mainhand,slot=0},rxm=88] ~ ~ ~ stopsound @s mp3_music
execute @a[hasitem={item=jmgs:mp3,location=slot.weapon.mainhand,slot=0},rx=-88] ~ ~ ~ tp @s ~ ~ ~ facing ~ ~ ~-10
execute @a[hasitem={item=jmgs:mp3,location=slot.weapon.mainhand,slot=0},rxm=88] ~ ~ ~ tp @s ~ ~ ~ facing ~ ~ ~10
