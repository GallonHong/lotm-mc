# 多人团战 Boss：斯洛克 / 莫加苏尔

v1.4.0 从参考包 **Bosses Rise Add-On**（作者 Block Factory，目录 `addons/reference/[汉化]Bosses Rise Add-On`）
引入两个团战 Boss。参考包原样只读；第三方模型/贴图/动画/音效**逐字节保留**，
行为由本包重写（参考包原实现是单文件 3.64 MB 脚本，与本包 `@minecraft/server 1.15.0` 不兼容）。

## 1. 数值与识别

| 实体 | 显示名 | HP | 近战伤害 | 护甲 | 经验 | 掉落表 |
|---|---|---|---|---|---|---|
| `apoc_boss:sandworm` | 斯洛克 · 巨型沙虫 | 16000 | 24 | 强制 `apoc:armor:10` | 3000 | `loot_tables/raid/sandworm.json` |
| `apoc_boss:abomination` | 莫加苏尔 | 26000 | 32 | 强制 `apoc:armor:10` | 5000 | `loot_tables/raid/abomination.json` |

- 两个实体都带 `apoc_boss` family 与原生 `minecraft:boss` 血条，`hud_range = 64`。
- 护甲协议是 `apoc:armor:N`（读取端只认 ≤40）；本代团战 Boss 定在 **10**，默认 25% 穿甲下约 **38% 减伤**。
  v1.4.1 先把血量按等效血量放大（32000/52000），v1.4.2 按实测反馈**再减半**到 16000/26000。
- 生成时由 `scripts/raidBosses.js` 在 `entitySpawn` 同步写标签，早于 `bossArmor.js` 的 3 tick 回退观察者，
  因此不管在安全区、副本还是 `/summon` 出来都是 10 护甲；PvP 隔离区内的 Boss 仍会被 `main.js` 移除。

## 1.1 受击体积（v1.4.1 修复）

沙虫的模型不是"围绕原点的小怪"：它是一条约 **60 格长的蛇形身体**（骨骼 pivot 沿本地 z 轴约 `-30 … +31`，高度 y≈2），
而碰撞箱只有原点 `5×5`，所以实测"只有攻击底部才掉血"。

修复方式（实体 JSON，由导入脚本生成）：

- `minecraft:custom_hit_test`：沿本地 z 轴 `-30 … +30` 每 6 格一个 `8×8` 命中盒（共 11 个，`pivot: [0, 2, z]`），
  命中盒随实体朝向旋转，覆盖整条身体；`custom_hit_test` 正是 Bedrock 给大型实体做命中体积的组件
  （仓库内 `addons/reference/Vehicles Add-On` 就这么用）。
- 碰撞箱适当放大到 `5×5` 用于物理/推挤；莫加苏尔碰撞箱 `7×10`，另加躯干/头部两个命中盒。
- 修改入口在 `tools/import_bosses_rise_assets.mjs` 的 `buildRaidEntity` 配置里（改完重跑导入脚本即可）。

## 2. 招式（`scripts/raidBosses.js`）

### 斯洛克 · 巨型沙虫（`tickSandworm`）

| 招式 | 触发条件 | 表现 | 伤害/效果 |
|---|---|---|---|
| 撕咬 | 近战 AI 触发 | AC 自动播放 bite（`q.is_delayed_attacking`） | 24 近战 |
| 破土突袭 | 距离 > 8 | 钻地（dive 动画）→ 传送到目标脚下 → 破土 | 半径 6.5，26 伤害 + 击飞 |
| 地震脉冲 | 距离 > 8 或近身随机 | roar → earthquake → 6 次脉冲（每 10 tick） | 半径 10，18 伤害/次 + 减速 + 击飞 |
| 尖啸 | 近身随机 / 远距离随机 | screech 动画 + 环形粒子 | 半径 24，10 伤害 + 减速 6s/虚弱 5s |

### 莫加苏尔（`tickAbomination`）

| 招式 | 触发条件 | 表现 | 伤害/效果 |
|---|---|---|---|
| 重击 | 距离 ≤ 4.5 | state 5，砸地 | 半径 8.5，40 伤害 + 强击飞 |
| 横扫 | 距离 ≤ 4.5 / 4.5–16 | state 4 | 半径 7，32 伤害 + 减速 |
| 轻击 | 距离 ≤ 4.5 | state 3 | 半径 5，26 伤害 |
| 冲锋 | 距离 4.5–16 | state 6，每 2 tick 传送 1.6 格；检测到实心方块 → 撞墙硬直（state 7，50 tick） | 接触半径 3.5，30 伤害；硬直结束额外自身暴露 |
| 尖啸 | 距离 > 16 或中距离随机 | state 8 | 半径 20，22 伤害 + 减速/虚弱 |
| 陨石雨 | 距离 > 16 | state 10，6 颗陨石依次落下 | 每颗半径 5，24 伤害 |
| P2 狂暴 | HP < 50% | state 9，每 10 tick 脉冲 | 半径 10，14 伤害 ×7 |
| P2 抓取投掷 | HP < 50% 且近身 | state 12→13→14→15 连段 | 34 抓取 + 28 投掷 + 击飞 |

属性 `bf_bossesrise:*`（`state` / `state_id` / `is_enraged` / `is_charging` / `is_wall_collision` …）
是参考包动画控制器的输入，**不要改名**，否则对应动画失效。

## 3. 素材清单与来源文件

导入脚本：`tools/import_bosses_rise_assets.mjs`（可重复执行，幂等）。

- RP 客户端：`entity/{sandworm,abomination}.entity.json`（复制参考包，仅改 identifier 与刷怪蛋颜色）
- 模型：`models/entity/{sandworm,abomination}.geo.json`
- 动画：`animations/{sandworm.animation,abomination.animation,abomination_hit_overlay}.json`
- 动画控制器：`animation_controllers/{sandworm.json,abomination.ac.json}`
- 渲染控制器：`render_controllers/sandworm.rc.json`（abomination 用原版 `controller.render.default`）
- 贴图：`textures/bf/bossesrise/entity/{sandworm,abomination}.png` + 粒子贴图
- 粒子：`particles/bf/bossesrise/sandworm/*`、`particles/*abomination*`、`particles/{attack,charge_run,hand_smash,rampage_*,scream_*,smash_*,spawn_*,walk,death_1,death_2,line,point}` 等
- 音效：`sounds/bf/bossesrise/{sandworm,abomination}/*.ogg` + `sounds/sound_definitions.json` 内 35 条 `bf_bossesrise.*` 键
- BP 实体：`entities/{sandworm,abomination}.json`（本包契约重写：原生伤害可受、apoc_boss family、boss 血条、loot、玩家索敌）

## 4. 已知上游缺陷（照搬继承，不影响本包脚本）

- 参考包 `sandworm_roar` / `sandworm_roar_short` 粒子引用了包内**不存在的贴图**
  `textures/particles/sandworm/sandworm_lock`；本包脚本未使用这两个粒子。
- 参考包 `abomination` 的 `scale_0` 动画来自 976 KB 的 `endermage.animation.json`，本包已从
  client entity 的 animations/animate 中移除，不需要该文件。

## 5. 可选后续接入

如需把两个 Boss 加入副本/事件池，按现有约定加 ID 即可：

- `apocalypse_extraction_addon/extraction_bp/scripts/config.js` 的 `bossPool`
- `daily_world_events_addon/daily_events_bp/scripts/integration/IntegrationBridge.js` 的 boss 映射
- `apocalypse_mobs_addon` 不需要同步（这两个是全新 identifier，无重复定义）
