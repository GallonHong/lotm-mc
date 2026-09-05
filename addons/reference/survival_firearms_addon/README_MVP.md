# Survival Firearms 2.5.0

四枪生存 Addon：M1911、AKM、MP5、M870。当前版本采用仓库 `OldAssGunA` 旧 DLC 的二维枪械图标，不打包 3D 模型、attachable 或玩家持枪动作；既有枪械音频继续集中在 `sounds/retained_audio`。

## 射击方式

- M1911、M870：每次按下使用键只发射一发，松开后才能再次射击。
- AKM、MP5：按住使用键连续射击，松开立即停止。
- 电脑版使用右键，手机版使用长按。
- `!reload` 或 `!r` 换弹。

2.5.0 参考 Absolute Guns 3D 的 food item 使用生命周期，同时修正了其“布尔状态 + 后台 tick 连射”在松键事件漏报时可能失控的问题：

- `itemStartUse` 只开始/重置按压会话，`itemStopUse` 与 `itemReleaseUse` 负责冗余清理。
- 行为动画控制器同时检查 `q.is_using_item` 与 `q.main_hand_item_use_duration`。
- 半自动枪每次按压只发送一个射击脉冲；自动枪只有仍按住时才逐次发送脉冲。
- `GunController.onTick()` 不再产生任何子弹。没有新脉冲就不会继续射击，即使漏报松键也不会无限连射。
- 单次长按仍有一弹匣和 60 tick 的双重安全上限。

## 二维视觉资源

- AKM 使用 `OldAssGunA` 的 AK-103 二维贴图。
- MP5 暂用 `OldAssGunA` 的 X13 二维贴图。
- M1911 暂用 `OldAssGunA` 的 DE 二维贴图。
- M870 暂用 `OldAssGunA` 的 M14 二维贴图。
- 详细映射见 `ASSET_SOURCES.md`。后续需要时再单独增加 3D 模型与动作，不影响本版开火逻辑。

## 原版工作台

枪械制造菜单已取消。图纸、零件、弹药和枪械全部使用原版工作台；配方中的每个格子只放一个物品。

### 基础材料

| 产物 | 配方材料 |
|---|---|
| 装订纸束 | 工作台九格全部放纸，9 张纸合成 1 个 |
| 精锻枪管 | 1 铁块 + 1 铜锭 |
| 精密机械零件 ×2 | 2 铁块 + 1 红石粉 + 1 拉杆 |
| 工程聚合物 ×2 | 1 煤炭块 + 1 黏液球 |

需要多份铁的地方直接使用铁块，不要求在同一格堆叠多个铁锭；需要大量纸的图纸统一使用“装订纸束”。

### 图纸与枪械

具体九宫格形状以游戏配方书为准：

- M1911 图纸：装订纸束、2 墨囊、红石粉、铜锭。
- MP5 图纸：装订纸束、3 红石粉、2 铜锭、线。
- M870 图纸：装订纸束、2 铜锭、红石粉、线。
- AKM 图纸：装订纸束、2 红石粉、指南针、铁块。
- 每把枪都由对应图纸、铁块、精锻枪管、精密机械零件及枪托材料在原版工作台合成；图纸会被原版配方正常消耗。

四种弹药也都有原版工作台无序配方。

## 测试与构建

```bash
node survival_firearms_addon/tests/validate_mvp.mjs
bash survival_firearms_addon/build_survival_guns.sh
```

测试菜单只用于开发验证，不再承担枪械制造。构建产物：

- `Survival_Guns_BP.mcpack`
- `Survival_Guns_RP.mcpack`
- `Survival_Guns_Addon.mcaddon`
- `Survival_Guns_MVP_v2.5.0.mcaddon`

## 兼容性说明

本版本通过行为包的 `minecraft:player` 动画入口挂载实时输入探针。若另一个 Addon 也重定义行为包玩家实体，需要把双方的 `scripts.animate` 与 `animations` 映射合并，否则后加载者会覆盖前者。资源包不再覆盖玩家实体。
