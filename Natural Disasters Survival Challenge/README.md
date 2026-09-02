# Natural Disasters Server Events v2.1.0

适用于 Minecraft Bedrock/BDS 1.21.120+ 的自然灾害事件 Add-on，与 SAPI Server v2.6.4 通过世界动态属性及 `scriptevent` 双通道联动。v2.1.0 支持管理员从 SAPI 页面输入维度和 X/Y/Z 坐标，将五种灾害定向生成到指定中心；显式坐标触发仅在本次事件中绕过安全区保护，并保留审计记录。

## 灾害类型

- 龙卷风：移动、卷起附近实体；管理员允许地形破坏后可撕裂方块。
- 陨石雨：带预警轨迹的范围爆炸。
- 特大洪水：围绕参与玩家生成并自动恢复的临时水体。
- 雷暴：玩家附近的可躲避落雷。
- 地震：镜头震动；允许地形破坏时产生裂缝。

## SAPI 管理

管理员手持服务器罗盘打开：`管理员控制台 → 自然灾害管理`，或使用 `!disaster`。

可调整：

- 系统总开关和自动随机开关；
- 主世界/摸金都市作用范围；
- 主城与安全区保护；
- 地形破坏；
- 预警、持续、冷却和自动事件间隔；
- 默认难度 0～10；
- 五类灾害的随机权重；
- 手动指定灾害、维度、难度；
- 立即停止和恢复安全默认值。

默认设置不会自动发生灾害，也不会破坏方块。自动事件只会选择存在非安全区玩家的已启用维度。

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
