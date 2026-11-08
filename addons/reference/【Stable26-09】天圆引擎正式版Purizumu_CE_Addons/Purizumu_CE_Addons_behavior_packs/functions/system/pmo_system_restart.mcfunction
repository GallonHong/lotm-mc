# 重启控制台
tp @e[family=monster] ~ -100 ~
kill @e[type=pig,r=100]
kill @e[type=cat,r=150,name="猫猫币挖矿猫"]
tellraw @p {"rawtext":[{"text":"§c§l控制台已安全停机，系统将在数秒之后重启……"}]}
playsound se.se10002 @a[scores={playtime=3..}] ~ ~ ~ 1 1 1
time set 1000

# 重启成功
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ summon pig 计时器40 ~20 26 ~23
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ summon pig 计时器1 ~50 26 ~23
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ summon pig 计时器20 ~50 26 ~53
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ summon pig 计时器5 ~20 26 ~53
execute @e[name="system_core",type=armor_stand,c=1] ~ ~ ~ summon pig 计时器24 ~12 28 ~29