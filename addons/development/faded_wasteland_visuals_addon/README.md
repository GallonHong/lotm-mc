# 余晖 · 废土光影 (Faded Wasteland Visuals) — 0.3.9 「天空层次 · 薄雾清水」

基座：仓库 0.3.0 + 用户提供的 0.3.1 + 0.3.2~0.3.6 迭代；资源包 UUID 不变。

**0.3.9**：在 0.3.7/0.3.8 基础上在 0.3.6 基础上微调晴天天空（自然灰蓝）、天空分区/高光阈值 1.8、gain 0.63、中间调饱和度 0.80、高光饱和度 0.82；晴天距离雾起点 72%→78%，天气雾 30–80%、体积密度 0.012→0.0105；水体颗粒/波浪下调、焦散 power 统一为 1。
原包来源 `Faded_Wasteland_Visuals_v0.1.0.mcpack`（作者 Gallon Hong / dot；不含《明日之后》资产）；
群系/雾数据来自 Mojang bedrock-samples（见包内 `NOTICE.txt`）；水面 / 本地光照 / 软阴影 / 雨天粒子
复用并重调自 `dark_fantasy_visuals_rp`（经用户许可）。

- 需要支持并开启「灵动视效」的客户端（min_engine 1.26.60）
- **只做光影**：不替换方块/生物/枪械/物品/UI 贴图（仅水面/焦散/雨滴相关），不含脚本
- 服务器可选资源包；不影响伤害、掉落、刷怪、天气频率

## 0.3.6 改动（0.3.7 保留光照与雨系统）

1. **固定单档**：只保留「更暗 · 阴郁废土」一套配置，删除全部子包选项（资源包设置里不再有档位可选）
2. **正午再压暗**（日落/夜晚不变）：
   | 项 | 0.3.5 | 0.3.6 |
   |---|---|---|
   | 正午日光 0/1 键 | 1500 lux | **900 lux** |
   | 上午/下午 0.2/0.8 键 | 900 lux | **550 lux** |
   | 正午太阳颜色 | #FFF0DC | **#E6D8C6**（×0.9） |
   | 正午环境光 | 0.019 | **0.016** |
   | 正午天顶色 | [40,52,72] | **[37,48,66]** |
   | 正午地平线色 | [82,85,87] | **[75,78,80]** |
   | 白天 rayleigh | 1.43 | **1.287** |
   | 调色 gain / 白平衡 | 0.66 / 6450K | 不变 |
3. **雨天粒子替换**（参考 Dark Fantasy）：
   - `minecraft:rain_splash_particle`：更细的水花 + 落地涟漪 + 雨雾
   - 新增 `drp:rain_ripple`（涟漪）、`drp:rain_puddle`（水洼）、`drp:rain_fog`（地面雨雾）、
     `drp:ripple`（水面涟漪）、`minecraft:water_splash_particle_manual`
   - 贴图：`textures/particle/{rain_fog,rain_puddle,rain_ripple,particles,dot}.png`、
     `textures/environment/weather.png`

## 包含

- 79 个原版地表生物群系绑定雾/大气/调色/光照/水面；下界/末地/洞穴保留原版。
- 柔和暖阳、冷灰环境补光、灰尘色带吸收空气雾、5 套浑水、暖色灯火、软阴影、雨滴/涟漪/雨雾粒子。
- 夜晚/月亮/日落关键帧保持之前状态。

## 构建 / 测试

```bash
bash addons/development/faded_wasteland_visuals_addon/build.sh
node addons/development/faded_wasteland_visuals_addon/tests/test_visuals.mjs
```

## 安装 / 排查

1. 删除旧版本包（0.1.x~0.3.5），只导入 **0.3.9**（UUID 相同会替换）
2. 视频设置选择「灵动视效」；世界资源包列表确认启用的是 0.3.9；不行取消重勾
3. 不要与其他光影/天空/雾包叠加；服务器在 Packs 页更新并刷新世界资源包版本
4. 正午仍偏亮：改 `lighting/global.json` 的 0/1 键（900）与 0.2/0.8 键（550）；不要动 0.25/0.5 键以免影响日落/夜晚

## 参考资料

- 早期《明日之后》评测：[7xz 2018](https://m.7xz.com/ng/news/218530.html)、[网易 2018](https://www.163.com/game/article/D93F841C003197U4.html)
- 2026「重生日」美术升级：[11xfx 解析](https://www.11xfx.com/curated-insight/game/lifeafter/2913.html)
- 玩家画质批评（避免泛绿/黑乎乎）：[233 评测](https://www.233leyuan.com/post-detail/2068159495514267648)
- 官方文档（auto-exposure / tone mapping）：[Light Sources](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/lightingcustomization?view=minecraft-bedrock-stable)、[Color Grading & Tone Mapping](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/colorgradingtonemappingcustomization?view=minecraft-bedrock-stable)

## 目录结构

```
faded_wasteland_visuals_addon/
  faded_wasteland_visuals_rp/
    manifest.json                     # 0.3.9（单档，无 subpacks）
    lighting/ atmospherics/ color_grading/   # 固定更暗档配置
    particles/rain_splash_particle.particle.json + particles/rain/*   # 雨天粒子
    biomes/ fogs/ water/ local_lighting/ shadows/ textures/           # 共享资产
    README_zh_CN.txt / NOTICE.txt
  tests/test_visuals.mjs
  build.sh
  Faded_Wasteland_Visuals_v0.3.9.mcpack
```
