# 钓鱼执法
msg @a[scores={level=0..2,notice=0}] 你好！我唰了1组砖石块！要不要分你一点？来生存1区找我！
msg @a[scores={level=3,notice=0}] 我看服主不爽很久了，我们一起搞点事情吧！我唰人一箱TNT，一起把生存区炸了！

# 幸运儿
scoreboard players set @r[scores={level=0..4}] choose 2333
scoreboard players add @a[scores={choose=2333}] coin 100
tell @a[scores={notice=0..2,choose=!2333}] §l恭喜用户 @a[scores={choose=2333}] 被系统随机抽取为幸运儿100金币已到账！
scoreboard players add @a[scores={choose=2333}] temp 0
scoreboard players reset @a[scores={choose=2333}] choose