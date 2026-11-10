# MGL 换弹时间

- 普通装填由 70 ticks（3.5 秒）缩短为 35 ticks（1.75 秒），精确减半。
- 保留黄蜂携弹胸挂的 0.8 系数及原取整规则：56 ticks（2.8 秒）→28 ticks（1.4 秒）。
- 仅修改 MGL 的 `reloadTime`。直击 84、溅射 90、六发弹仓、40mm 弹药、饱和轰炸技能及其他枪械配置全部保留；M79 仍为 23 ticks / 胸挂 18 ticks。
- 实际装填和 `GunVisuals.reload` 使用同一 `totalTicks`；MGL 挂件按归一化进度驱动共享装填姿态，没有单独弹仓装填计时或延迟音效。唯一装填音效 `random.door_open` 在开始时播放一次。弹量与备弹仅在装填完成时更新，完成或中断重置视觉信号。无需修改共享动画、第三方模型或贴图。

验证命令：

```sh
node --experimental-vm-modules tests/validate_mgl_reload.mjs
node --experimental-vm-modules tests/validate_m79_reload.mjs
node --experimental-vm-modules tests/validate_gun_balance.mjs
node tests/validate_test_guns.mjs
```

MGL 专项测试运行实际装填、库存、弹量、PvP 保护及动画信号代码，模拟 Bedrock API/HUD。覆盖第 35/28 tick 完成、此前不扣弹、完成不重复扣弹、部分弹仓/备弹不足、满弹/无弹、创造/PvP 无限备弹、切枪/取消/倒地/换局/参与状态变化、装填中移走备弹及其他枪时长回归。枪表基线仅对 M79/MGL 精确半时长增加例外，保留既有伤害例外，其余字段仍逐一比对。未运行 Minecraft 客户端，实际视觉和声音体验仍需实机验收。
