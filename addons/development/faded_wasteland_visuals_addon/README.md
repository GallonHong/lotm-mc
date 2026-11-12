# 余晖 · 废土光影 (Faded Wasteland Visuals) — 0.3.0 「早期明日之后 · 多档亮度」

独立维护的 **Minecraft 基岩版「灵动视效 / Vibrant Visuals」视觉包** 工作区。
原包来自 `Faded_Wasteland_Visuals_v0.1.0.mcpack`（作者 Gallon Hong / dot；不含《明日之后》任何资产；
群系/雾数据来自 Mojang bedrock-samples v1.26.60.5，授权见包内 `NOTICE.txt`）。
水面 / 本地光照 / 软阴影底层配置复用并重调自 `dark_fantasy_visuals_rp`（经用户许可）。

- 需要支持并开启「灵动视效」的客户端（min_engine 1.26.60）
- **只做光影**：不替换方块/生物/枪械/物品/UI 贴图（仅水面贴图 + 焦散），不含脚本
- 服务器可选资源包；不影响伤害、掉落、刷怪、天气频率

## 0.3.0：多档亮度子包（正午/日落仍过亮的最终方案）

**为什么之前调 lux 不够**：官方文档说明灵动视效有 **auto-exposure（自动曝光）**，会重新平衡光线强度差异
——单独降低太阳 illuminance 时，自动曝光会把它"补回来"，所以画面依旧亮。0.3.0 因此把压暗做在
**自动曝光无法抵消的地方**：

1. **调色（tone mapping 之后）**：`midtones gain` / `offset` 直接乘/加在最终画面上
2. **天空强度 + 大气散射**：压低间接光与天空亮度
3. **雾吸收**：空气雾带吸收，远处不会越看越白
4. **色调映射**：`reinhard_luminance` 做高光压缩

### 可选子包（资源包设置里切换，默认第 1 档）

| 子包 | 正午日光 | 天空强度 | 调色 gain | 说明 |
|---|---|---|---|---|
| **1 偏暗 · 早期废土（推荐/默认）** | 24000 lux | 0.28 | 0.86 | 早期《明日之后》灰暗废土感 |
| 2 标准 · 自然日光 | 42000 lux | 0.40 | 0.92 | 参考图那种自然柔和日光 |
| 3 更暗 · 阴郁废土 | 12000 lux | 0.20 | 0.80 | 明显偏暗、压迫感 |
| **4 诊断档 · 极暗测试** | 3000 lux | 0.10 | 0.55 | **选它如果仍然很亮 → 加载的不是本包 / 其他光影包覆盖** |

子包共享全部 79 群系、67 雾、5 套浑水、本地光照、软阴影、焦散贴图；只有光照/大气/调色三份配置不同。

## 为什么你可能看到旧画面（重要排查）

1. **旧包没删/未重导**：资源包列表里可能同时有 0.1.x/0.2.x 和 0.3.0；确认只启用 **0.3.0**（版本号显示在包名下方）
2. **客户端缓存**：先退出世界→回标题界面，删掉旧版本包条目再重新导入 0.3.0，重进世界
3. **服务器**：服务器世界资源包列表（`world_resource_packs.json`）如果仍指向旧版本，服务器会继续下发旧画面
   - Aternos：Packs 页替换/更新后，确认世界设置中该资源包版本已刷新为 0.3.0；必要时重新上传世界
4. **多个光影包叠加**：dark_fantasy / 其他天空雾包与本包同时启用时，优先级高的会覆盖光照，先全部停用只留本包
5. **灵动视效没开**：视觉配置只在视频设置「灵动视效」下生效（本包无法强制解锁设备）

**诊断步骤**：只启用本包 0.3.0 → 选子包 4「极暗测试」→ 正午看。若仍亮 = 不是本包生效（回到上面 1-5 排查）；
若变很暗 = 生效了，切回子包 1（推荐）或 2 试效果，再告诉我哪档合适。

## 美术方向（早期《明日之后》）

- 柔和暖阳（太阳 #FFF0DC / 日出 #FFC98F）、冷色阴影补光（环境色 #B6C2C4）、自然略低饱和（0.84–0.88）
- 灰尘色空气透视（干燥 #B9AC96 / 雪原 #B2BAC0 / 植被 #9AA595），带吸收；天气雾 #7A7B73
- 暖色人造光（火把 #FF8E42、营火 #FF6B2B、灵魂灯冷青 #3FB6C4）
- 软阴影 + 浑水水面（5 套水按气候绑定 79 群系，焦散/波浪/泥沙参数）
- 参考图目标：**明亮但受控的日光、阴影偏冷、颜色自然、远景空气透视**（不是死白、也不是纯黑）

## 参考资料

- 早期《明日之后》评测（色调古朴、整体灰暗、断壁残垣）：[7xz 2018 评测](https://m.7xz.com/ng/news/218530.html)、[网易 2018 测评](https://www.163.com/game/article/D93F841C003197U4.html)
- 2026「重生日」美术升级（对比参考）：[11xfx 解析](https://www.11xfx.com/curated-insight/game/lifeafter/2913.html)
- 玩家画质批评（避免泛绿/黑乎乎）：[233 评测](https://www.233leyuan.com/post-detail/2068159495514267648)
- 官方文档：[Light Sources](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/lightingcustomization?view=minecraft-bedrock-stable)、[Color Grading & Tone Mapping](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/colorgradingtonemappingcustomization?view=minecraft-bedrock-stable)（auto-exposure / filmic 色调映射说明）
- 亮度白平衡实现对照：`dark_fantasy_visuals_rp`（Reinhard、低天空强度、低环境光、绿灰环境色、深吸收雾、emissive desaturation）

## 构建 / 测试

```bash
bash addons/development/faded_wasteland_visuals_addon/build.sh
# 或
python tools/build_mcpack.py addons/development/faded_wasteland_visuals_addon/faded_wasteland_visuals_rp \
  addons/development/faded_wasteland_visuals_addon/Faded_Wasteland_Visuals_v0.3.0.mcpack

node addons/development/faded_wasteland_visuals_addon/tests/test_visuals.mjs
```

## 目录结构

```
faded_wasteland_visuals_addon/
  faded_wasteland_visuals_rp/
    manifest.json                     # 0.3.0 + 4 个子包
    subpacks/1|2|3|4/
      lighting/global.json
      atmospherics/atmospherics.json
      color_grading/color_grading.json
    biomes/ fogs/ water/ local_lighting/ shadows/ textures/   # 共享资产
    README_zh_CN.txt / NOTICE.txt
  tests/test_visuals.mjs
  build.sh
  Faded_Wasteland_Visuals_v0.3.0.mcpack
```
