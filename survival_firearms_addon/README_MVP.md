# Survival Firearms 2.0.1

四枪生存 Addon：M1911、AKM、MP5、M870。2.0.0 起已移除 DeadZone 的模型、纹理、图标、玩家动作和动画控制器；按项目决定，仅保留既有枪械音频并集中到 `sounds/retained_audio`。

## 射击方式

- M1911、M870：每次按下使用键只发射一发，松开后才能再次射击。
- AKM、MP5：按住使用键连续射击，松开立即停止。
- 电脑版使用右键，手机版使用长按。
- `!reload` 或 `!r` 换弹。

行为包动画控制器直接读取明确的使用状态 `q.is_using_item`，松开使用键立即退出开火状态。JavaScript 不保存持续开火开关，也不依赖可能缺失的 `itemStopUse`。服务端还设置了“换弹后必须松开再按”的防失控锁：即使客户端错误地持续报告使用状态，也不会在换弹结束后自行继续开火。`survival:fire` 只是一发请求，服务端仍会检查主手枪械、换弹状态、射速、弹药、耐久、射线和伤害。

## 原创视觉资源

- `survival_guns_rp/models/entity/survival_firearms.geo.json`：四把枪的原创低多边形方块模型。
- `survival_guns_rp/textures/entity/survival/`：原创模型配色纹理。
- `survival_guns_rp/textures/items/{m1911,akm,mp5,m870}.png`：全新像素图标。
- `survival_guns_rp/animations/survival_static_hold.animation.json`：只负责把原创模型绑定到手部，不包含 DeadZone 动作。

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
- `Survival_Guns_MVP_v2.0.1.mcaddon`

## 兼容性说明

本版本通过行为包的 `minecraft:player` 动画入口挂载实时射击状态机。若另一个 Addon 也重定义行为包玩家实体，需要把双方的 `scripts.animate` 与 `animations` 映射合并，否则后加载者会覆盖前者。
