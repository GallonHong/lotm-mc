# Apocalypse Boss v1.5.0

独立的末日 Boss 行为包与资源包（全模型独立修复版）。单体导入，不要求同时安装其他 Apocalypse 包；被 Daily Events 副本、摸金都市与 Apocalypse Mobs 调用时自动生效。

## v1.5.0 要点（周常团本）

- 新增周常团本 Boss 实例接入（`scripts/weeklyRaid.js`）：`apoc_boss:weekly_spawn` 生成事件、房间/参战/精确护甲 tag 契约、周本空掉落与关闭原生 AI、带房间校验的脚本追踪；普通召唤仍是 16000/26000 生命 + 10 护甲 + 原掉落，周本实例为斯洛克 20000、莫加苏尔 30000，护甲 0/10/20/40 精确指定。
- 契约细节见 `apocalypse_boss_bp/docs/WEEKLY_RAIDS.md`；房间、队伍、周奖励账本与清场由 Daily Events 0.20.2 负责。

## v1.4.2 要点

- 团战 Boss 血量在 v1.4.1 基础上**减半**：斯洛克 32000 → **16000**、莫加苏尔 52000 → **26000**（护甲保持 10）。

## v1.4.1 要点（团战 Boss 调优）

- 按实测反馈调整：**受击体积**（沙虫沿身体 11 个命中盒，不再只有底部可被命中）、**护甲 40 → 10**、**血量按等效血量补偿**（当时为 32000 / 52000）。

- 新增两个**多人团战 Boss**（美术素材来自参考包 Bosses Rise / Block Factory，AI 由本包重写）：
  - `apoc_boss:sandworm` **斯洛克 · 巨型沙虫**：16000 HP，破土突袭、地震脉冲、尖啸（范围减速），近战撕咬 24；
  - `apoc_boss:abomination` **莫加苏尔**：26000 HP，直接冲锋（撞墙硬直）、重击/横扫、尖啸、陨石雨，半血后进入狂暴与抓取投掷，近战 32。
- 两个 Boss 生成时**强制写入 `apoc:armor:10` + `apoc:armor_source:raid`**（对 Test Guns / SAPI 的伤害清算约 **38% 减伤**）；血量已按等效血量放大，与 40 护甲版本的总击杀时长基本一致。
- 受击体积：沙虫模型是沿本地 z 轴约 60 格长的蛇形身体，除原点碰撞箱外另加 `minecraft:custom_hit_test` 的 11 个命中盒沿身体排布（随实体朝向旋转），不再"只有打底部才掉血"；莫加苏尔也补了躯干/头部命中盒。
- 动画完全复用参考包的 client entity + animation controller（只由实体属性 `bf_bossesrise:state` / `state_id` 驱动），本包脚本负责状态机、伤害、音效与粒子。
- `min_engine_version` 由 1.20.80 提升到 **1.26.10**（`client_sync` 实体属性与参考包资源所需）；脚本模块仍为 `@minecraft/server 1.15.0`。
- 掉落表新增 `loot_tables/raid/{sandworm,abomination}.json`（4 池，Epic 蓝图合计 ≤2%，不含 Legendary）。

## 历史要点（v1.3.4）

- 与全模型修复版资源包同步到 1.3.4（BP/RP 版本、UUID 与依赖一致）。
- 接入厂商「敌对刷怪护甲 v1」：Boss 在生成时按来源写入 `apoc:armor:N` 标签，由 Test Guns / SAPI 的伤害公式读取：
  - 副本 Boss：读取 `apoc:armor_max`（教学 5 → 灾厄/地狱 40），缺省 10；
  - 摸金都市 Boss：0–40 随机；
  - 主世界：法制区 0–10、非法制区 0–20，安全区手动召唤 0–10。
- PvP 隔离区域内的 Boss 不写入护甲；已存在的旧 Boss 不追溯、不重投。
- 护甲是「addon 伤害公式的总护甲值」，不改变装备外观、掉落或原版伤害规则。

## 团战 Boss 的导入与维护

```bash
# 参考包需在 addons/reference/[汉化]Bosses Rise Add-On（只读，勿改）
node addons/development/apocalypse_boss_addon/tools/import_bosses_rise_assets.mjs
```

导入脚本会把模型/贴图/动画/粒子/音效按原相对路径逐字节复制到本包 RP，并重新生成两个实体 JSON；
细节、招式数值与可调参数见 [docs/RAID_BOSSES.md](apocalypse_boss_bp/docs/RAID_BOSSES.md)。

## 安装

导入本目录的 `Apocalypse_Boss_Addon.mcaddon`，在世界行为包与资源包中同时启用。旧版 1.3.x 产物保留在同目录，仅供历史回滚。

## 测试

```bash
node addons/development/apocalypse_boss_addon/tests/test_boss_loot.mjs
node addons/development/apocalypse_boss_addon/tests/test_raid_boss_assets.mjs
```

## 打包

```bash
bash addons/development/apocalypse_boss_addon/build.sh
```

Windows 无 `zip` 时可直接使用下载的官方 `.mcaddon`，或参考 `tools/build_apocalypse_mobs.py` 的 Python 打包方式。
