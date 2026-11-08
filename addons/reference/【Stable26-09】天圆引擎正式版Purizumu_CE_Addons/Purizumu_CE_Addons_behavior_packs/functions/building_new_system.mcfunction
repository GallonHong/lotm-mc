# 重建变量
scoreboard objectives add alert dummy §9警戒值
scoreboard objectives add arms1 dummy 副武器
scoreboard objectives add arms2 dummy 主武器
scoreboard objectives add arms3 dummy 机载武器
scoreboard objectives add audio dummy 声音频道
scoreboard objectives add bar dummy 状态栏
scoreboard objectives add cafe_exp dummy 月卡剩余天数
scoreboard objectives add choose dummy 选择
scoreboard objectives add coin dummy §6金币
scoreboard objectives add daily_mark dummy 签到
scoreboard objectives add effect dummy 特效
scoreboard objectives add gash_1 dummy 标配补给已垫抽数
scoreboard objectives add gash_2 dummy 高阶补给已垫抽数
scoreboard objectives add gash_3 dummy 友情补给已垫抽数
scoreboard objectives add gash_4 dummy 猫毛补给已垫抽数
scoreboard objectives add global_hp dummy 精力值
scoreboard objectives add grow_fund dummy 等级礼包
scoreboard objectives add guild dummy §1公会号
scoreboard objectives add hair dummy §d猫毛
scoreboard objectives add level dummy §c权限等级
scoreboard objectives add love dummy 好感度
scoreboard objectives add mark_count dummy 累计签到天数
scoreboard objectives add mp dummy 能量度
scoreboard objectives add notice dummy 通知
scoreboard objectives add playtime dummy §b在线时间
scoreboard objectives add prestige dummy §a声望
scoreboard objectives add robber dummy 通缉
scoreboard objectives add task dummy 任务进度
scoreboard objectives add temp dummy 校验值
scoreboard objectives add statistics dummy 统计信息
scoreboard objectives add uid dummy §bUID

# 获取权限
function toolbox/pmo_player_apex

# 建立控制台
structure load system:core ~-47 0 ~-38
fill ~-47 1 ~-38 ~-47 2 ~-38 air
tickingarea add ~-50 ~ ~-40 ~20 ~ ~30 main_system
summon armor_stand system_core ~-47 1 ~-38
summon armor_stand 控制台传送锚点 ~-3 ~ ~
summon armor_stand 车库传送锚点 ~-3 ~8 ~18

# 重启控制台
function system/pmo_system_restart