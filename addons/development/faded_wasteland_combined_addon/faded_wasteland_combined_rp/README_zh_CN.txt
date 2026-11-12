# 余晖 · 废土光影 0.3.6（固定更暗档 · 雨天粒子）

基座：仓库 0.3.0 + 用户 0.3.1 包 + 0.3.2~0.3.5 迭代；资源包 UUID 不变。
需设备支持并开启「灵动视效 / Vibrant Visuals」；min_engine 1.26.60。
不含《明日之后》任何资产；群系/雾数据来自 Mojang bedrock-samples（见 NOTICE.txt）；
水面/本地光照/软阴影/雨天粒子复用并重调自 Dark Fantasy Visuals（经用户许可）。

## 0.3.6 改动
1. **固定单档**：只保留“更暗 · 阴郁废土”一套配置，不再提供子包选项。
2. **正午再压暗**（只动正午/上午，日落和夜晚不变）：
   - 正午日光 1500 → 900 lux；上午/下午 900 → 550 lux
   - 正午太阳颜色 ×0.90；正午环境光 0.019 → 0.016
   - 正午天空天顶/地平线颜色 ×0.92；白天 rayleigh ×0.90
   - 调色仍为 gain 0.66、offset [-0.022,-0.020,-0.017]、reinhard_luminance + 6450K 白平衡
3. **雨天粒子替换**（参考 Dark Fantasy）：
   - 雨滴溅落粒子 `minecraft:rain_splash_particle`（更细的水花 + 落地涟漪 + 雨雾）
   - 新增 `drp:rain_ripple` 涟漪、`drp:rain_puddle` 水洼、`drp:rain_fog` 地面雨雾、
     `drp:ripple` 水面涟漪、`minecraft:water_splash_particle_manual`
   - 贴图：textures/particle/{rain_fog,rain_puddle,rain_ripple,particles,dot}.png 与
     textures/environment/weather.png

## 包含
- 79 个原版地表生物群系绑定雾/大气/调色/光照/水面；下界/末地/洞穴保留原版。
- 柔和暖阳、冷灰环境补光、灰尘色空气雾（带吸收）、5 套浑水、暖色灯火、软阴影。
- 不替换方块/生物/枪械/物品/UI 贴图（除水面/焦散/雨滴相关），不含脚本，不改玩法数值。

## 安装
1. 删除旧版本包（0.1.x~0.3.5），导入本 0.3.6 并启用。
2. 视频设置选择「灵动视效」；世界资源包列表确认启用的是 0.3.6。
3. 不要与其他光影/天空/雾包叠加；服务器需 Packs 页更新并刷新世界资源包版本。

## 调参
- 正午仍偏亮：继续降 lighting/global.json 中 0/1 键（900）与 0.2/0.8 键（550）。
- 颜色/白平衡：调 color_grading；雾：fogs；水面：water；雨：particles/rain/*。
- 日落/夜晚键（0.25/0.75、0.5）与月亮保持之前状态，不要随意改动以保住夜间辨识度。

## 验证状态
通过：全部 JSON 解析、manifest、固定档数值契约、雾/群系/水面/雨滴引用、贴图范围检查。
未运行：客户端实机导入、GPU 画面、手机帧率、多人叠包兼容；需同地点对照截图校准。

## 参考
- 2018 年早期《明日之后》评测（灰暗古朴废土）：https://m.7xz.com/ng/news/218530.html
- 2026「重生日」美术升级：https://www.11xfx.com/curated-insight/game/lifeafter/2913.html
- 玩家画质批评（避免泛绿/黑乎乎）：https://www.233leyuan.com/post-detail/2068159495514267648
- 官方文档（auto-exposure / tone mapping）：
  https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/lightingcustomization
  https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/colorgradingtonemappingcustomization
