# 月卡扣除天数
scoreboard players add * cafe_exp -1

# 重置签到
tellraw @a {"rawtext":[{"text":"已重置24小时计时器"}]}
scoreboard objectives remove daily_mark
scoreboard objectives add daily_mark dummy 签到
title @a[x=1000,y=0,z=1000,dx=2000,dy=256,dz=2000] title 今天的签到开始了
execute @a ~ ~ ~ playsound note.harp @p ~ ~ ~ 10 0.79 10

# 重置警戒值
scoreboard objectives remove alert
scoreboard objectives add alert dummy §9警戒值