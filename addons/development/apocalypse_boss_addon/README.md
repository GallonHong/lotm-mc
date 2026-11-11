# Apocalypse Boss v1.3.4

独立的末日 Boss 行为包与资源包（全模型独立修复版）。单体导入，不要求同时安装其他 Apocalypse 包；被 Daily Events 副本、摸金都市与 Apocalypse Mobs 调用时自动生效。

## v1.3.4 要点

- 与全模型修复版资源包同步到 1.3.4（BP/RP 版本、UUID 与依赖一致）。
- 接入厂商「敌对刷怪护甲 v1」：Boss 在生成时按来源写入 `apoc:armor:N` 标签，由 Test Guns / SAPI 的伤害公式读取：
  - 副本 Boss：读取 `apoc:armor_max`（教学 5 → 灾厄/地狱 40），缺省 10；
  - 摸金都市 Boss：0–40 随机；
  - 主世界：法制区 0–10、非法制区 0–20，安全区手动召唤 0–10。
- PvP 隔离区域内的 Boss 不写入护甲；已存在的旧 Boss 不追溯、不重投。
- 护甲是「addon 伤害公式的总护甲值」，不改变装备外观、掉落或原版伤害规则。

## 安装

导入本目录的 `Apocalypse_Boss_Addon.mcaddon`，在世界行为包与资源包中同时启用。旧版 1.3.x 产物保留在同目录，仅供历史回滚。

## 打包

```bash
bash addons/development/apocalypse_boss_addon/build.sh
```

Windows 无 `zip` 时可直接使用下载的官方 `.mcaddon`，或参考 `tools/build_apocalypse_mobs.py` 的 Python 打包方式。
