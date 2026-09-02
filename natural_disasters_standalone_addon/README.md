# Natural Disasters Standalone v1.1.0

完全独立的自然灾害 Addon，不依赖 SAPI Server、摸金都市、怪物或枪械 Addon。v1.1.0 删除洪水与地震，只保留龙卷风、陨石雨和雷暴。

管理员可在原版工作台合成 `sando_standalone:disaster_controller`，或输入：

```mcfunction
/give @s sando_standalone:disaster_controller
```

手持控制器右键/长按打开灾害菜单，可选择灾害、停止灾害、开启或关闭自动灾害。默认自动灾害开启，间隔 20～40 分钟；默认不筛除出生点安全区，控制器使用者只要位于主世界即可启动。默认不破坏方块。

这是原联动版的替代包。建议两版只启用一个，避免玩家同时收到两套灾害提示。
