# 机甲技能·驱动
execute @e[family=mecha,scores={gash_1=100}] ~ ~ ~ kill @e[r=6,type=arrow]
execute @e[family=mecha,scores={gash_1=101}] ~ ~ ~ effect @s fire_resistance 10 1
execute @e[family=mecha,scores={gash_1=200}] ~ ~ ~ effect @e[family=monster,r=4] slowness 4 0 true
execute @e[family=mecha,scores={gash_1=201}] ~ ~ ~ effect @s jump_boost 10 1
execute @e[family=mecha,scores={gash_1=300}] ~ ~ ~ effect @s slow_falling 10 0
execute @e[family=mecha,scores={gash_1=301}] ~ ~ ~ effect @e[family=monster,r=4] weakness 5 1 true
execute @e[family=arms,scores={gash_1=2222}] ~ ~ ~ effect @s levitation 3 1 true

# 机甲技能·武装
execute @e[family=mecha,scores={gash_2=100}] ~ ~ ~ damage @e[r=3,c=2,family=monster] 11 entity_attack entity @p
execute @e[family=mecha,scores={gash_2=101}] ~ ~ ~ effect @a[r=4,c=1] strength 10 2 true
execute @e[family=mecha,scores={gash_2=200}] ~ ~ ~ damage @e[r=4,c=3,family=monster] 19 entity_attack entity @p
execute @e[family=mecha,scores={gash_2=201}] ~ ~ ~ effect @a[r=4,c=1] strength 10 4 true
execute @e[family=mecha,scores={gash_2=300}] ~ ~ ~ damage @e[r=6,c=4,family=monster] 21 entity_attack entity @p
execute @e[family=mecha,scores={gash_2=301}] ~ ~ ~ effect @a[r=4,c=1] strength 10 6 true
execute @e[family=arms,scores={gash_2=4444}] ~ ~ ~ damage @e[r=7,family=monster] 25 entity_attack entity @p

# 机甲技能·核心
execute @e[family=mecha,scores={gash_3=100}] ~ ~ ~ effect @s health_boost 10 4 true
execute @e[family=mecha,scores={gash_3=101}] ~ ~ ~ scoreboard players add @a[r=4,c=1,scores={mp=..150}] mp 1
execute @e[family=mecha,scores={gash_3=200}] ~ ~ ~ effect @s resistance 10 0 true
execute @e[family=mecha,scores={gash_3=201}] ~ ~ ~ scoreboard players add @a[r=4,c=1,scores={mp=..150}] mp 2
execute @e[family=mecha,scores={gash_3=300}] ~ ~ ~ effect @s instant_health 1 0 true
execute @e[family=mecha,scores={gash_3=301}] ~ ~ ~ scoreboard players add @a[r=4,c=1,scores={mp=..150}] mp 4
execute @e[family=arms,scores={gash_3=401}] ~ ~ ~ effect @e[family=arms,r=7] resistance 10 0 true
execute @e[family=arms,scores={gash_3=1111}] ~ ~ ~ scoreboard players add @a[r=4,c=1,scores={mp=..40}] mp 10

# 机甲改装粒子效果
execute @e[family=mecha,scores={gash_1=1..}] ~ ~ ~ particle minecraft:dragon_breath_trail ~ ~6 ~
execute @e[family=mecha,scores={gash_2=1..}] ~ ~ ~ particle minecraft:shulker_bullet  ~ ~6.5 ~
execute @e[family=mecha,scores={gash_3=1..}] ~ ~ ~ particle minecraft:rising_border_dust_particle   ~ ~7 ~