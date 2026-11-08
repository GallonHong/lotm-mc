# 特殊失败惩罚·提示
title @a[r=5,scores={notice=10..99}] title §c撤离失败
playsound se.se207 @a[r=5,scores={notice=10..99}]
tellraw @a[r=5,scores={notice=10..99}] {"rawtext":[{"text":"§c您撤离失败了，但是保险箱保住了您的一些物品。再接再厉！"}]}
camera @a[r=5,scores={notice=10..99}] fade time 0 2 2 color 0 0 0

# 特殊失败惩罚·清盔甲
replaceitem entity @a[r=5,scores={prestige=..4999}] slot.armor.legs 0 air 1 0
replaceitem entity @a[r=5] slot.armor.head 0 air 1 0
replaceitem entity @a[r=5] slot.armor.feet 0 air 1 0
replaceitem entity @a[r=5] slot.armor.chest 0 air 1 0

# 特殊失败惩罚·清快捷栏
replaceitem entity @a[r=5,scores={prestige=..1499}] slot.hotbar 0 air 1 0
replaceitem entity @a[r=5,scores={prestige=..2499}] slot.hotbar 1 air 1 0
replaceitem entity @a[r=5] slot.hotbar 2 air 1 0
replaceitem entity @a[r=5] slot.hotbar 3 air 1 0
replaceitem entity @a[r=5] slot.hotbar 4 air 1 0
replaceitem entity @a[r=5] slot.hotbar 5 air 1 0
replaceitem entity @a[r=5] slot.hotbar 6 air 1 0
replaceitem entity @a[r=5] slot.hotbar 7 air 1 0
replaceitem entity @a[r=5] slot.hotbar 8 air 1 0

# 特殊失败惩罚·清背包
replaceitem entity @a[r=5,scores={prestige=..99}] slot.inventory 0 air 1 0
replaceitem entity @a[r=5,scores={prestige=..199}] slot.inventory 1 air 1 0
replaceitem entity @a[r=5,scores={prestige=..399}] slot.inventory 2 air 1 0
replaceitem entity @a[r=5,scores={prestige=..599}] slot.inventory 3 air 1 0
replaceitem entity @a[r=5,scores={prestige=..799}] slot.inventory 4 air 1 0
replaceitem entity @a[r=5,scores={prestige=..999}] slot.inventory 5 air 1 0
replaceitem entity @a[r=5,scores={prestige=..1999}] slot.inventory 6 air 1 0
replaceitem entity @a[r=5,scores={prestige=..2999}] slot.inventory 7 air 1 0
replaceitem entity @a[r=5,scores={prestige=..3999}] slot.inventory 8 air 1 0
replaceitem entity @a[r=5] slot.inventory 9 air 1 0
replaceitem entity @a[r=5] slot.inventory 10 air 1 0
replaceitem entity @a[r=5] slot.inventory 11 air 1 0
replaceitem entity @a[r=5] slot.inventory 12 air 1 0
replaceitem entity @a[r=5] slot.inventory 13 air 1 0
replaceitem entity @a[r=5] slot.inventory 14 air 1 0
replaceitem entity @a[r=5] slot.inventory 15 air 1 0
replaceitem entity @a[r=5] slot.inventory 16 air 1 0
replaceitem entity @a[r=5] slot.inventory 17 air 1 0
replaceitem entity @a[r=5] slot.inventory 18 air 1 0
replaceitem entity @a[r=5] slot.inventory 19 air 1 0
replaceitem entity @a[r=5] slot.inventory 20 air 1 0
replaceitem entity @a[r=5] slot.inventory 21 air 1 0
replaceitem entity @a[r=5] slot.inventory 22 air 1 0
replaceitem entity @a[r=5] slot.inventory 23 air 1 0
replaceitem entity @a[r=5] slot.inventory 24 air 1 0
replaceitem entity @a[r=5] slot.inventory 25 air 1 0
replaceitem entity @a[r=5] slot.inventory 26 air 1 0
replaceitem entity @a[r=5] slot.inventory 27 air 1 0

# 特殊失败惩罚·重置
scoreboard players set @a[r=5] temp 0
scoreboard players set @a[r=5] effect 0
scoreboard players set @a[r=5] alert 0
scoreboard players set @p[r=5] choose -12333
scoreboard players set @a[r=5] robber 0
scoreboard players set @a[r=5] notice 0
execute @e[c=1,type=armor_stand,name="主城传送锚点"] ~ ~ ~ tp @p[scores={choose=-12333}] ~ ~4 ~