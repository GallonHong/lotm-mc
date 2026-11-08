# 战斗模式buff
effect @a[scores={bar=3,prestige=300..,dimension=!1}] jump_boost 30 0 true
effect @a[scores={bar=3,prestige=500..699,notice=0..9}] strength 30 0 true
effect @a[scores={bar=3,prestige=700..}] water_breathing 30 0 true
effect @a[scores={bar=3,prestige=900..,notice=0..9}] strength 30 1 true
effect @a[scores={bar=3,prestige=1100..}] saturation 30 0 true
effect @a[scores={bar=3,prestige=1300..}] fire_resistance 30 0 true
effect @a[scores={bar=3,prestige=1500..,notice=0..9}] health_boost 30 4 true
effect @a[scores={bar=3,prestige=2000..,notice=0..9}] resistance 30 0 true
execute @a[scores={bar=3,prestige=1000..}] ~ ~ ~ effect @e[family=simple_car,r=6,c=1] regeneration 5 1 true
effect @a[scores={bar=3,prestige=3000..}] village_hero 30 0 true
execute @a[scores={bar=3,prestige=3500..,notice=0..9}] ~ ~ ~ effect @s jump_boost 30 1 true