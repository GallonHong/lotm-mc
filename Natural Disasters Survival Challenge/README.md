# Natural Disasters Server Events v2.2.0

适用于 Minecraft Bedrock/BDS 1.21.120+ 的自然灾害事件 Add-on。v2.2.0 改为独立运行核心：自动灾害默认开启，不再让 SAPI 保存的旧开关覆盖运行配置；SAPI 仅提供管理员手动释放和停止入口。指定坐标触发可在没有非安全区玩家时启动，并可在本次事件中绕过安全区保护。

## 灾害类型

- 龙卷风：移动、卷起附近实体；管理员允许地形破坏后可撕裂方块。
- 陨石雨：带预警轨迹的范围爆炸。
- 雷暴：玩家附近的可躲避落雷。

## SAPI 管理

管理员手持服务器罗盘打开：`管理员控制台 → 自然灾害管理`，或使用 `!disaster`。

SAPI 页面仅提供：

- 手动指定灾害、维度、难度；
- 输入 X/Y/Z 定点释放，并可无视安全区；
- 立即停止当前灾害。

高级设置位于行为包 `scripts/config.js`，可修改总开关、自动发生、维度、安全区、地形破坏、时间、默认难度、权重和性能上限。默认自动发生、保护安全区、不破坏方块；自动事件只会选择存在非安全区玩家的已启用维度。

## 独立调试指令

需要管理员权限：

```mcfunction
/scriptevent sando:start
/scriptevent sando:control {"action":"trigger","disasterId":"tornado","dimensionId":"minecraft:overworld","difficulty":2}
/scriptevent sando:control {"action":"stop"}
```

## 安装包

- `Natural_Disasters_Server_Events_BP.mcpack`
- `Natural_Disasters_Server_Events_RP.mcpack`
- `Natural_Disasters_Server_Events_Addon.mcaddon`
