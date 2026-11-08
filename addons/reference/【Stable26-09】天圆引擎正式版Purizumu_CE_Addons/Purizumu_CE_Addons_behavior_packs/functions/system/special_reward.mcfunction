# 基础奖励
scoreboard players add @p[r=4,scores={notice=10..99,robber=-1,temp=-400}] prestige 10
scoreboard players add @p[r=4,scores={notice=15..18,robber=-1,temp=-400}] prestige 10
scoreboard players add @p[r=4,tag=!delta_map,scores={notice=10..14,robber=-1,temp=-400}] global_hp -10
scoreboard players add @p[r=4,scores={notice=15..99,robber=-1,temp=-400}] global_hp -10
scoreboard players add @p[r=4,scores={notice=11,robber=-1,temp=-400}] coin 15
scoreboard players add @p[r=4,scores={notice=12,robber=-1,temp=-400}] coin 60
scoreboard players add @p[r=4,scores={notice=13,robber=-1,temp=-400}] coin 175
scoreboard players add @p[r=4,scores={notice=14,robber=-1,temp=-400}] coin 25

# 数值还原
effect @p[r=4,scores={notice=10..99,robber=-1,temp=-400}] regeneration 10 4 true 
title @p[r=4,scores={notice=10..99,robber=-1,temp=-400}] title 领取成功
playsound jmgs.notice @p[r=4,scores={notice=10..99,robber=-1,temp=-400}] ~ ~ ~ 0.6 1 0.6
playsound me.me_103 @p[r=4,scores={notice=10..99,robber=-1,temp=-400}] ~ ~ ~ 1 1 1
tellraw @p[r=4,scores={notice=10..99,robber=-1,temp=-400}] {"rawtext":[{"text":"§e您已成功领取任务报酬。报酬为进图费用的一半，另加10声望。"}]}
tellraw @p[r=4,tag=!delta_map,scores={notice=10..14,robber=-1,temp=-400}] {"rawtext":[{"text":"§b已扣除10点精力值。"}]}
tellraw @p[r=4,scores={notice=15..99,robber=-1,temp=-400}] {"rawtext":[{"text":"§b已扣除10点精力值。"}]}
scoreboard players set @p[r=4,scores={notice=10..99,robber=-1,temp=-400}] alert 0
scoreboard players set @p[r=4] choose 0
spawnpoint @p[r=4,scores={notice=10..99,robber=-1,temp=-400}] -842 50 2174
scoreboard players set @p[r=4,scores={notice=10..99,robber=-1,temp=-400}] effect 0
scoreboard players set @p[r=4,scores={notice=10..99,robber=-1,temp=-400}] temp 0
scoreboard players set @p[r=4,scores={notice=10..99,robber=-1,temp=0}] notice 0
scoreboard players set @p[r=4,scores={notice=0,robber=-1,temp=0}] robber 0