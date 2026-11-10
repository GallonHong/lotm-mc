# M79 换弹时间

- 普通装填由 45 ticks（2.25 秒）调整为 23 ticks（1.15 秒）。一半为 22.5 ticks，向上取整至整游戏 tick，因此实际耗时约减半。
- 保留黄蜂携弹胸挂的原有 0.8 系数及取整规则：M79 穿戴后为 18 ticks（0.9 秒）。
- `ReloadManager` 将同一 `totalTicks` 交给 `GunVisuals.reload`；客户端通过归一化进度驱动持枪与装填姿态，无需缩短共享动画资源，也不修改第三方基础模型或贴图。
- 换弹声音仍仅在开始时播放一次 `random.door_open`，不存在需要缩短的延迟音效时点；完成/中断时重置视觉信号。
- 保留 M79 直击伤害 28、溅射伤害 30、单发容量、40mm 弹药、技能配置以及所有其他枪械配置。仅在装填完成时按现有规则扣取弹药。

验证：

```sh
node --experimental-vm-modules tests/validate_m79_reload.mjs
node tests/validate_test_guns.mjs
```

测试执行实际装填、库存、弹量、PvP 保护和动画信号代码，模拟 Bedrock API 与 HUD，覆盖第 23/18 tick 完成、此前不扣弹、完成不重复扣弹、满弹/无弹、创造/PvP 无限弹药、切枪/取消/倒地/换局/参与状态变化、装填中移走备弹及非 M79 时长回归。未运行 Minecraft 客户端实机视觉/声音验收。
