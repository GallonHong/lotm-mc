# 探测
tellraw @p {"rawtext":[{"text":"§e欢迎使用《棱彩维度®天圆引擎》正式版，让您的世界焕发新生。适合MCBE的1.20.70以上版本，无需假日创造者。此模组会修改您存档的地形、计分板，以及游戏规则。使用前建议备份存档。点击下方按钮构建完整控制台，请确保附近4X4的区块内没建筑物。"}]}
playsound se.se10001 @p ~ ~ ~ 1 1 1
gamerule commandblockoutput false
gamerule sendcommandfeedback false
structure load system:explorate ~-1 24 ~-1
tp @p ~ 28 ~