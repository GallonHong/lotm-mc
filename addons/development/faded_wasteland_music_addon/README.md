# 余晖 · 废土音乐包 (Faded Wasteland Music) — 1.0.0

把原版背景音乐替换为《明日之后》风格的 4 首 BGM（用户提供的音频文件转换而来）。
纯资源包：不含脚本、不改玩法数值，可单独启用，也可和 `faded_wasteland_visuals_addon`（光影包）一起启用。

## 曲目映射

| 原版音乐槽位 | 使用曲目 | 文件 |
|---|---|---|
| `music.game`（主世界背景音乐） | 营地野外配乐、氛围音乐1、居住区夜晚音乐、营地中心配乐（随机播放） | `sounds/music/faded_wasteland/*.ogg` |
| `music.menu`（主菜单音乐） | 营地中心配乐 | `camp_center.ogg` |

原版共约 10 余首主世界曲目，这里整体替换为上面 4 首，游戏仍按原版逻辑随机播放（约数分钟一次），
所以不会连续不停播放；若想要"按地点/时间切歌"（主城/夜晚/周本），需要额外行为包脚本，本包不含。

## 源文件与格式

- 源：用户提供的 4 个网易云音乐压缩包（`.mp3` + cover + lrc）
- 已用 ffmpeg 转为 **OGG Vorbis 44.1kHz 立体声 ~128kbps**（Bedrock 资源包只识别 ogg/fsb）
- 时长：1:16 / 0:49 / 1:58 / 1:29

## 安装

1. 导入 `Faded_Wasteland_Music_v1.0.0.mcpack` 并在资源包列表启用（放在其他资源包上方）
2. 主世界随机播放这 4 首，主菜单为营地中心配乐
3. 想恢复原版：停用本资源包即可

## 版权说明

音频由用户从游戏内/DLC 提取提供，仅供其私人服务器/世界使用；**不要公开分发本资源包或其音频**
（除非已获得版权方授权）。本仓库只保留转换/打包脚本与配置，是否提交音频由仓库所有者决定。

## 构建 / 测试

```bash
bash addons/development/faded_wasteland_music_addon/build.sh
node addons/development/faded_wasteland_music_addon/tests/test_music.mjs
```

## 目录结构

```
faded_wasteland_music_addon/
  faded_wasteland_music_rp/
    manifest.json
    sounds/sound_definitions.json
    sounds/music/faded_wasteland/{camp_wild,ambience_1,residential_night,camp_center}.ogg
  tests/test_music.mjs
  build.sh
  Faded_Wasteland_Music_v1.0.0.mcpack
```
