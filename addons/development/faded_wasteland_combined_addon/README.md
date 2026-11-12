# 余晖 · 废土光影 + 音乐 0.4.0（合并包）

把 `faded_wasteland_visuals_addon`（光影 0.3.6）与 `faded_wasteland_music_addon`（音乐 1.0.0）
合并成**一个资源包**，只需要安装这一个 mcpack。

- 需要支持并开启「灵动视效」的客户端（min_engine 1.26.60）
- 纯资源包：不含脚本，不改玩法数值
- 资源包 UUID 沿用光影包（导入会替换旧的光影包）

## 内容

**光影（固定单档，无子包选项）**
- 更暗 · 阴郁废土档：正午 900 lux、上午/下午 550 lux、日落 540 lux、夜晚 0.6
- 调色：reinhard_luminance + 6450K 白平衡、gain 0.66、冷暗部/暖高光、低饱和
- 灰尘色带吸收空气雾（67 个）、5 套浑水水面、暖色灯火、软阴影
- **雨天粒子**：水花 + 落地涟漪 + 水洼 + 雨雾（参考 Dark Fantasy 雨系统）、雨幕纹理
- 79 个原版地表群系绑定；不替换方块/生物/枪械/物品/UI 贴图（仅水面/焦散/雨滴相关）

**音乐（替换原版 BGM）**
| 原版槽位 | 曲目 |
|---|---|
| `music.game`（主世界随机） | 营地野外配乐、氛围音乐1、居住区夜晚音乐、营地中心配乐 |
| `music.menu`（主菜单） | 营地中心配乐 |

## 构建

```bash
bash addons/development/faded_wasteland_combined_addon/build.sh
node addons/development/faded_wasteland_combined_addon/tests/test_combined.mjs
```

构建流程：`tools/merge_visual_music.py` 把两个源包合并到 `faded_wasteland_combined_rp/`，
再调用 `tools/build_mcpack.py` 打包成 `Faded_Wasteland_Visuals_Music_v0.4.0.mcpack`。

## 安装

1. **删除**旧的 `Faded_Wasteland_Visuals_*` 光影包和 `Faded_Wasteland_Music_*` 独立音乐包
   （避免两套 `music.game` 定义冲突）
2. 导入 `Faded_Wasteland_Visuals_Music_v0.4.0.mcpack` 并启用
3. 视频设置开「灵动视效」；世界设置→资源包确认启用的是 0.4.0
4. 不要与其他光影/天空/雾包叠加；服务器在 Packs 页更新并刷新世界资源包版本

## 说明

- 原版 BGM 按随机间隔播放，4 首不会连续播放；按地点/时间切歌需要行为包脚本（本包不含）
- 音频为游戏内/DLC 提取素材，仅供私人服务器/世界使用，请勿公开分发
