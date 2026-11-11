# Bosses Rise 复用研究报告

> 目标：把参考包 `addons/reference/[汉化]Bosses Rise Add-On` 里的几个 boss 复用到我们自己的
> `apocalypse_boss_addon`。本报告为只读逆向分析，参考包未做任何修改。
> 研究日期：2026-11-11。数据由实际解析 BP/RP JSON 与脚本 bundle 得到。
>
> **实现状态（v1.4.0）**：已按方案 C 落地 **斯洛克（沙虫）+ 莫加苏尔（憎恶体）** 两个多人团战 Boss，
> 见 `docs/RAID_BOSSES.md` 与 `tools/import_bosses_rise_assets.mjs`。其余 boss 尚未导入。

---

## 0. 结论（先看这 6 条）

1. **7 个 boss 全部是脚本驱动，没有"纯 JSON 可搬"的 boss。** 实体 JSON 里只有血量/移动/索敌/血条/伤害感应，
   招式、阶段、命中判定全在 **3.64 MB 单文件压缩 bundle**（`BP/scripts/bf/bosses_rise/index.js`）里。
2. **美术资产高度自包含**：每个 boss 的模型/贴图/动画/音效/粒子闭包 20–158 个文件、彼此只重叠 0–11 个文件，
   所以"搬资源"很便宜（1.0–2.5 MB/boss），"搬手感"很贵。
3. **最关键的分水岭：烘焙骨骼命中盒表 `gn`（2.35 MB，占脚本 61%）。**
   `dragon / abomination / sandworm / kraken(+触手) / soul_knight` 这 6 个的命中盒/弱点帧数据被烘焙在脚本里，
   自写 AI 几乎不可能还原；**`yeti`（斯科尔）和 `endermage`（泽莉拉）不在该表内，是自写 AI 成本最低的两个。**
4. `min_engine` 要求：BP `1.26.13` / RP `1.26.10`；脚本 `@minecraft/server 2.6.0` + `server-ui 2.0.0`。
   本机游戏版本 **1.26.63**（注册表 `Microsoft.MinecraftUWP_1.26.6301.0`），引擎够新；
   但我们的 boss 包是 `1.20.80` + API `1.15.0`，**不能直接把参考包代码搬进来**。
5. 真正可行的三条路线见 §4；**推荐"方案 B 瘦身独立包"或"方案 C 雪怪试点"**，不要尝试全量合并（脚本 ABI 冲突）。
6. 前置阻断：我们的 boss 包与 `apocalypse_mobs_addon` 存在 **7 个同 identifier 的重复 boss 定义**，
   新增 boss 前必须先定"谁是权威副本"（详见 §6.1）。

---

## 1. 参考包概况（已核对）

| 项 | 值 |
|---|---|
| 作者 / 版本 | Block Factory / pack version 1.0.7（目录名带"汉化"） |
| 规模 | 2256 文件 / 34 MB：BP 475 文件 12.66 MB，RP 1781 文件 21.34 MB |
| BP manifest | `min_engine_version [1,26,13]`，data 模块 + script 模块（entry `scripts/bf/bosses_rise/index.js`） |
| 依赖 | `@minecraft/server 2.6.0`、`@minecraft/server-ui 2.0.0`（**2.x ABI**） |
| RP manifest | `min_engine_version [1,26,10]`、`capabilities:["pbr"]`、与 BP 双向依赖已对齐 |
| 语言 | **只有 `en_US.lang`（399 键），且内容本身就是中文**（"汉化"做法），没有 `zh_CN.lang` |
| JSON 健康度 | 1353 个 JSON 全部可解析（0 失败） |
| 内容构成 | 7 主 boss + 血条/命中盒/门/过场道具/dormant 刷怪锚点 + 13 minion + 19 projectile + 7 奖杯 + 6 套竞技场结构 + 钥匙/航点/装备/团队战斗系统 |

资源分布：RP animations 106 文件/6.48 MB、sounds 249/6.75 MB、textures 624/5.85 MB、models 142/1.0 MB、
particles 484/0.65 MB、animation_controllers 34/0.31 MB；BP script 3.64 MB、structures 38/8.29 MB、blocks 86、items 60、recipes 96。

---

## 2. Boss 名册（HP 已按实体 JSON 核实）

| # | identifier | 中文名 | HP | 竞技场 | 主要机制（来自包内图鉴 + 实体/脚本） |
|---|---|---|---|---|---|
| 1 | `bf_bossesrise:yeti` | **斯科尔（雪怪）** | 300（JSON attack=0，全脚本打） | 雪怪藏身处（结构仅 52 KB） | 2 阶段；重击/砸地/跳跃；投冰、冰刺、低血弹幕；召唤冰锥/冰晶 |
| 2 | `bf_bossesrise:sandworm` | **斯洛克 - 巨型沙虫** | 780（唯一自带 `attack.damage=15`） | 沙虫巢穴（23 KB） | 地下钻行/破土/毒弹/地面喷发/AOE；12 态 `state` enum；18 根骨命中盒 |
| 3 | `bf_bossesrise:endermage` | **泽莉拉（末地法师）** | 105（P1）→ 405（P2 血条"虚空双子"） | 末地竞技场（1.39 MB，与 #5 共用） | 激光持续伤害、弹幕雨传送门、陨石、瞬移、召唤末影学徒；2 阶段（无烘焙骨表） |
| 4 | `bf_bossesrise:kraken`（文件 `kraken_head.json`） | **涅拉基斯（海怪）** | 1024（血条 1000） | 海盗船（1.16 MB，脚本 `placeJigsawStructure` 现场拼船） | 头部+独立触手实体协同；9 根触手骨命中盒；海盗波次；板条箱发射器机制；过场道具 |
| 5 | `bf_bossesrise:abomination` | **莫加苏尔（憎恶体）** | 300 | 末地竞技场（与 #3 组成终局双 boss） | 19 状态机（state_id 0–18）：冲锋/壁撞眩晕/狂暴/陨石/抓取投掷；召唤命中盒/过场道具 |
| 6 | `bf_bossesrise:dragon` | **阿什洛德（炼狱飞龙）** | 1152 | 飞龙塔（2.24 MB，含 12 个道具结构） | 墙壁/地面/飞行 3 阶段；火焰吐息、火球、爪击、尾巴扫击；召唤 4 种龙卫小怪；2 模型 2 渲染控制器 |
| 7 | `bf_bossesrise:soul_knight` | **赫尔瓦（灵魂骑士）** | 1024 | 灵魂地牢（3.42 MB / 21 文件，最重） | 88 条动画/12 动画文件；弱点+护甲层机制；连击、突进、远程斩击波；29.5 秒过场相机；门解锁过场 |

> 注：`end_boss_p2_bar` 的 boss 名是「虚空双子」，推测是终局双 boss 的合并血条（#3+#5），**未实机验证**。

辅助/依赖实体（搬 boss 时按需一起带）：4 个自定义血条实体、`generic_hitbox`/`dragon_hitbox`、
`black_bar` 电影黑边、`dormant_*` 刷怪锚点、`end_boss_door`/`knight_boss_door`、
`kraken_tentacle`、`kraken_cinematic_prop`、`sand_column`、8 个雪怪召唤物、6 个赫尔瓦斩击投射物等。

---

## 3. 脚本耦合：为什么不能"纯 JSON 搬"

`index.js` = 3,812,865 字节 / **1 行**，149 个 ES 模块拼接，自带 `BFLIB` 框架
（PACK_ID 命名空间、iClassRegistry/ProxyConstructor、dynamicProperty 持久化 667 处、
`beforeEvents.startup` + `customCommandRegistry`、HUD/ActionForm、世界设置
`{difficulty, scaling, rollEnabled, customBossbars}`，且**没有 per-boss 开关**）。

**体积构成（关键）**：约 **70.5% 是烘焙数据**，真逻辑只有 ~1.1 MB：

| 数据表 | 大小 | 内容 |
|---|---|---|
| `gn` | 2.35 MB | 6 个 boss 的**逐帧骨骼/定位器数组**（命中盒、触手、尾巴精确碰撞用） |
| `fn` | 220 KB | soul_knight 同类烘焙表 |
| 11 条过场相机轨 | ~155 KB | 8.5–29.5 秒镜头数据 |
| 其余 | ~1.1 MB | AI 状态机、技能、HUD、门/航点/音乐/掉落等 |

**每个 boss 在脚本里都有专属"大脑"**：中央 AI 配置表 `Oo` 按 identifier 分 8 条
（`meleeRange/targetMaxDistance/runMainLoop/hitboxesEnabled/hitboxBones/onlyTargetPlayers`），
另有 per-boss tick 处理器 `Sk`（31 KB）、受伤处理、死亡事件、掉落路径、音乐选曲、门映射等按 typeId 查表。
专属实现约 7–31 KB/个（雪怪 `Qd` 14.3 KB、海怪 `Qp` 7.2 KB、沙虫 `wk`、赫尔瓦 `Wh`、灵魂骑士 `qh`）。

**表现层耦合方式**：脚本写实体 property（`setProperty` 187 处 / `getProperty` 219 处，
主要 `phase`/`is_dying`/`state`/`anim_state`/`state_id`），RP 的 animation_controller 用
`query.property('bf_bossesrise:state_id')` 选动画。**即：没有脚本 = 只有 idle/walk，永远不出招。**

结论：
- ❌ 不能裁剪脚本（单行 3.8 MB，顶层常量表，删任何 boss 都要动 2.35 MB 数据表）；
- ❌ 不能直接搬脚本到我们的包（2.6.0 ABI vs 我们 1.15.0）；
- ✅ 可以"保留整包脚本 + 只保留目标 boss 的资产/结构"（方案 B）；
- ✅ 可以"只搬美术 + 自写 AI"（方案 C），但 6 个带烘焙命中盒的 boss 无法完全还原手感。

---

## 4. 三条可行路线

| 方案 | 做法 | 工作量 | 效果 | 风险 |
|---|---|---|---|---|
| **A 原样共存** | 把参考包原封不动作为独立 addon 装上，我们的包只把它的 identifier 加进 bossPool/事件池 | 0.5 天 | 100% 原版手感（含竞技场/图鉴/装备） | 包体 34 MB；`min_engine 1.26.13`；两套系统各自为政；护甲/掉落入我们的体系只能靠 tag 挂钩 |
| **B 瘦身独立包（推荐候选）** | 保留整包脚本框架，只保留选中 boss 的实体/资产/结构 + 必需公共件（`sound_definitions.json`、`sounds.json`、公共粒子图集、命中盒实体、bossbar、音乐、门） | 1–2 天/包 | ≈原版手感（无法裁剪的部分只是别的 boss） | 仍是 3.64 MB 脚本 + 1.26.13；公共件漏搬会静默失效 |
| **C 美术搬入自家包 + 自写 AI（真正"进我们的包"）** | 搬模型/贴图/动画/AC/粒子/音效，实体 JSON 按 `apoc_boss:` 模板重写，用我们 1.15.0 脚本写状态机 | 2–5 天/boss | 视觉 ≈原版，手感自定（可对齐数值） | 烘焙命中盒/过场/多实体协同难还原；`min_engine` 必须抬高 |

**不要选**：全量合并进 `apocalypse_boss_addon`（同一 BP 无法混用 `@minecraft/server` 1.15 与 2.6；脚本/结构/物品系统会互相污染）。

> 若目标是"让服务器里有这几个 boss 可打"→ A/B 最划算。
> 若目标是"把它们变成 Apocalypse 体系的一部分（护甲、掉落、事件、平衡表）"→ 只有 C 可行，且建议从雪怪开始。

---

## 5. 逐 boss 复用成本（按可落地性排序）

| 顺序 | boss | 资产闭包 | 含结构 | 脚本大脑 | 自写 AI 难度 | 关键坑 |
|---|---|---|---|---|---|---|
| 1 | **斯科尔（yeti）** | 69 文件 / 1.49 MB | +52 KB | `Qd` 14.3 KB，**不在 `gn` 骨表**、`hitboxesEnabled:false` | ★★☆☆☆ | 音效前缀用冒号 `bf_bossesrise:yeti_*`；`attack.damage=0` 全脚本；13 个粒子别名在包内缺失 |
| 2 | **斯洛克（sandworm）** | 40 文件 / 1.05 MB | +23 KB | `wk` AI 类，**在 `gn` 表**（18 根骨） | ★★★☆☆ | 复用 `dragon_hitbox`（牵连）；547 KB 单动画文件；12 态 enum 要自己维护；缺 `sandworm_lock` 贴图 |
| 3 | **泽莉拉（endermage）** | 158 文件 / 2.49 MB | +1.39 MB | 末影共享块，**不在 `gn` 表**、`hitboxesEnabled:false`、无多实体协同、AC 仅 2 态（动画由脚本 `playAnimation` 直接播） | ★★★☆☆ | 47 个 ogg（681 KB）+ 55 粒子；3 个过场 prop 强耦合；4 条动画缺失；激光/弹幕需要射线+传送门实现 |
| 4 | **涅拉基斯（kraken）** | 54 文件 / 2.83 MB | +1.16 MB | `Qp` 7.2 KB，在 `gn` 表 | ★★★★★ | 头+触手+过场 3 实体协同；`placeJigsawStructure` 拼船；8 个粒子别名缺失 |
| 5 | **莫加苏尔（abomination）** | 72 文件 / 2.53 MB | +1.39 MB | 末影共享块（38 KB），在 `gn` 表 | ★★★★☆ | 必须带 `endermage.animation.json`（976 KB，只为一条 `scale_0`）；19 态状态机；与泽莉拉共用竞技场 |
| 6 | **阿什洛德（dragon）** | 72 文件 / 1.37 MB | +2.24 MB | tick 处理器 `Sk` 里 31 KB 飞行状态机，在 `gn` 表 | ★★★★★ | 3 条关键动画缺失（`fly_circle` 等）；2 模型 2 RC 双贴图；4 种龙卫小怪 |
| 7 | **赫尔瓦（soul_knight）** | 143 文件 / 1.92 MB | **+3.42 MB** | Helvar 类 + `fn` 220 KB 烘焙表，在 `gn` 表 | ★★★★★ | 88 条动画/12 文件；20 条动画缺失；弱点/护甲层机制；29.5 s 过场；门解锁 |

纯 JSON 可搬（零脚本依赖，性价比最高）：**7 个奖杯实体/物品 + 3 个装饰 + 他们自带的方块/配方/宝箱掉落表**。
想把"打 boss 的成就感"先做出来，可以先把奖杯/装饰搬过来。

---

## 6. 与 `apocalypse_boss_addon` 集成的硬约束

### 6.1 前置阻断：与 mobs 包的重复 identifier（必须先决策）
- `apocalypse_mobs_addon` 里存在与 boss 包**同 identifier 的 7 个 boss + visual_probe**；
  RP client_entity 8 个文件逐字节相同；`loot_tables/boss/` 同 7 张表。
- 差异：**boss 包 `minecraft:attack.damage` 是 mobs 包的 2 倍**（12/11/14/18/10/9/16 vs 6/5/7/8/5/5/8）。
- 同 identifier 两包并存时后加载者胜 → 表现/数值不确定。**在新增 boss 前先定案**（建议：mobs 包为唯一权威，
  boss 包只保留 siren_head 等独家内容；或维持双份但加同步脚本 + 测试断言）。

### 6.2 版本 / 格式
- 我们的 boss 包 `min_engine [1,20,80]` + `@minecraft/server 1.15.0`。
- 参考包实体 JSON 用 `format_version 1.21.92/1.21.131/1.26.0` + `description.properties` + `client_sync`。
  → 走方案 C 时必须**把本包 `min_engine_version` 抬到 ≥1.21.90**（建议直接 1.26.10+，与仓库其它包一致）。
- ✅ 已证实：`Entity.setProperty/getProperty` 在 `@minecraft/server 1.15.0` 下可用
  （`apocalypse_life_addon`/`apocalypse_mobs_addon` 都在用同版本 API 操作实体属性），
  所以**方案 C 可以继续用 1.15.0，不必升级到 2.6.0**。
- ❌ 不要搬参考包的 JS 代码：其 `applyKnockback` 是 2 参、我们用 4 参；`onScreenDisplay.setHudVisibility`、
  `inputPermissions` 等是 2.x 专属。

### 6.3 命名空间 / 资源命名迁移（方案 C）
`bf_bossesrise:*` → `apoc_boss:*`，需要同步改：实体 identifier、组件组/事件名、`description.properties` 名、
RP client_entity 的 identifier、animation_controller 里的 `query.property(...)`、
`geometry.*`/`animation.*`/`controller.render.*` 名、粒子 id、`sound_definitions.json` 键、
`minecraft:boss.name`、lang 键（`entity.apoc_boss:<name>.name` + 刷怪蛋）。**建议写脚本批量替换 + 引用完整性校验。**

### 6.4 周边必须同步改
- `tests/test_boss_loot.mjs` 硬编码 `loot_tables/boss` 恰好 7 张表、版本 `[1,3,4]`。
- `build.sh` 硬编码 `Apocalypse_Boss_Addon_v1.3.0.mcaddon` 文件名（当前 1.3.4 产物来自外部流水线）。
- BP/RP manifest 版本三处同步 + BP 依赖 RP 的版本号；`README.md`、平衡表 xlsx 需重算。
- 若走方案 A/B，还要把对方 id 加进 `extraction_bp/scripts/config.js` 的 `bossPool`、
  `daily_events` 的 `IntegrationBridge` 映射与 `recognizedBosses`。

### 6.5 版权
参考包作者 Block Factory。仓库规则（AGENTS.md）：第三方基础模型与贴图保持原样。
自用/服务器内没问题；对外发布需取得授权或至少署名。

---

## 7. 已知坑（逆向确认，照搬会中招）

1. **包内本身就有缺失资源**：dragon 3 条动画、endermage 4 条动画、soul_knight 20 条动画、
   `sandworm_lock` 贴图、yeti 13 个粒子别名、kraken 8 个粒子别名… 搬完必须跑引用完整性扫描。
2. **贴图路径有三套命名**（`entity/`、`entities/<boss>/`、`entity/yeti/`），且 render_controller 用
   Molang 三元切多套贴图 → 必须按 client entity 的 `textures` 字典逐条核，不能照目录拷。
3. **音效键两种前缀**：多数 `bf_bossesrise.xxx`（点），yeti 用 `bf_bossesrise:yeti_xxx`（冒号）。
4. `RP/sounds.json` 把全部实体 hurt/death/step 映射为**空字符串**（静音），声音只由脚本 `playSound` 播；
   不搬会听到原版音，搬了但没脚本会全静音。
5. RP 声明 `capabilities:["pbr"]` 但包内没有 PBR 贴图 → 建议删掉该字段。
6. 血条是**独立实体 + 模型 + 相机跟随动画**那一套；我们已有原生 `minecraft:boss` 血条，
   方案 C 直接简化为原生血条。
7. 团队战斗组件组（`team_a_combat`/`team_b_combat`/`free_combat`）——我们不需要，改用 `free_combat`
   或删掉；否则 boss 默认 `cannot_be_attacked` 且不索敌。
8. 全部地图/结构依赖他们的自定义方块（`blocks/` 86 个）；只搬 boss 不搬结构就没法用其竞技场。
9. 包内缺陷会被继承：`helvar_health_ui`/`util` 引用 `textures/null`、`shoulder_entity` 用错几何、
   `knight_boss_door` 缺 3 张贴图。
10. UUID 全部要换，否则与其它包一起加载可能撞车。参考包现有：BP header `04ff3227-ca4b-4044-9294-9d75ed6fab1a`、
    BP data `3c4e8b6f-9e6d-4f9a-8c12-4f2d8a5b6c91`、BP script `f1a9c4e2-0d6b-4c98-9b77-1a6d8c2f4e33`、
    RP `46e0f612-f828-4b99-8ad3-d5eb637bdb56`。若只做独立瘦身包也必须换一套，避免与用户已装的完整版冲突。

---

## 8. 建议落地路线

**Phase 0 — 决策（0.5 天）**
- 回答 §9 的 5 个问题；
- 先解决 §6.1 的 mobs 包重复 identifier。

**Phase 1 — 试点：雪怪（斯科尔）走方案 C（3–5 天）**
- 抬 `min_engine_version`；建 `apoc_boss:skor`（或保留 yeti 名）实体 JSON（含 `description.properties`）；
- 搬 69 个 RP 资产 + 27 个 ogg + 17 粒子，改名到 `apoc_boss` 命名空间；
- 用 1.15.0 脚本写 2 阶段状态机（phase 1/2：重击、跳跃砸地、投冰、冰刺、低血弹幕），
  复用他们的 AC（`yeti.ac.json` 3 个控制器 46 状态）由 `setProperty` 驱动；
- 接入我们的 `apoc:armor` 护甲 tag、掉落表（≥3 pool）、测试、图鉴 lang。
- **产出**：可打的雪怪 + 一套"搬 boss"流程脚本（后续 boss 复用）。

**Phase 2 — 第二个 boss：斯洛克（沙虫，4–6 天）**
- 地上/地下两套状态、破土/毒弹/AOE；复用 `dragon_hitbox` 或改共用 `generic_hitbox`；
- 补齐 `sand_column`/`sandworm_projectile`/`sandworm_projectile_aoe`。

**Phase 3 — 收尾**
- 数值对齐（我们 750–2000 HP，参考 300–1152，建议 ×2.4–2.7；伤害按我们护甲体系折算）；
- `docs/balance/LOTM_MC_Addon_数值平衡总表.xlsx` 重算；README/版本号；打包验证。

> 若选方案 B（瘦身独立包）：按参考包脚本的 8 条 AI 配置表 `Oo` 的键 + `bn` 命中盒表 + `zh` 死亡表 +
> `hh` 掉落表 + `Tk` 门表逐项筛查依赖，保留雪怪/沙虫的实体与 `yeti_hideout`/`sandworm_nest` 结构，
> 公共件（`sound_definitions.json`、`sounds.json`、公共粒子图集、`generic_hitbox`、`boss_music/`、
> `black_bar`、`dormant_*`）必须一起带。预计 1–2 天出一个只含 2 个 boss 的独立包，手感 100% 原版。

---

## 9. 待拍板的问题

1. **目标形态**是哪种？(A) 原样共存最省事；(B) 瘦身独立包，手感原版；(C) 搬进我们的 boss 包、自写 AI（工作量大但统一）。
2. **选哪几个 boss？** 建议先雪怪，再沙虫；若喜欢末地双 boss 再考虑泽莉拉+莫加苏尔。
3. **是否要他们的竞技场 / 奖杯 / 钥匙 / 装备？**（结构 8.29 MB，占参考包 1/4）
4. **数值如何对齐？**（沿用我们 750–2000 HP + 护甲体系，还是保留原版 300–1152？）
5. **mobs 包重复 identifier 怎么处理？**（权威副本归谁）

---

## 附录：三个候选 boss 的精确资产清单

### 雪怪 斯科尔（yeti）— RP 41 文件 / 881 KB，BP 12 文件 / 70 KB
- BP：`entities/boss/yeti.json`、`entities/boss/yeti_health_bar.json`、`animation_controllers/bf/yeti.ac.json`、
  `loot_tables/bf/bossesrise/entities/yeti.json`、`entities/trophies/bf_boss_yeti_trophy*.json`(2)、
  `items/trophies/yeti_trophy.json`、`loot_tables/.../bf_boss_yeti_trophy.json`、
  `structures/bf_bossesrise/yeti_hideout/yeti_hideout.mcstructure`、`worldgen/{structures,structure_sets,template_pools}/yeti_hideout.json`
- RP：`entity/yeti/yeti.entity.json`、`models/entity/yeti/{yeti_phase_1,yeti_phase_2,yeti_ice_death}.geo.json`、
  `animations/bf/bossesrise/{yeti.anim.json,yeti_hit.animation.json}`、`animation_controllers/yeti.ac.json`、
  `render_controllers/yeti.rc.json`、`entity/yeti_health_bar.json`、
  `textures/bf/bossesrise/entity/yeti/*.png`(3)、`textures/bf/bossesrise/items/spawnEgg/yeti.png`、
  `textures/bf/bossesrise/particles/{get_hit_1,get_hit_2}.png`、`textures/bf/bossesrise/particles/yeti/*.png`(9)、
  `particles/bf/bossesrise/yeti/*.particle.json`(15)、`particles/{get_hit_1,get_hit_2}.particle.json`、
  `sounds/bf/bossesrise/yeti/*.ogg`(27)
- 召唤物（BP+RP）：`ice_chunk`、`ice_spikes`、`ice_spikes_danger`、`ice_crystal_3x3`、`danger_ice_crystal_3x3`、
  `ice_block_chunk`、`skor_ice_chunk`、`skor_ice_visual`

### 沙虫 斯洛克（sandworm）— RP 61 文件 / 960 KB，BP 17 文件 / 43 KB
- BP：`entities/boss/{sandworm,sandworm_health_bar}.json`、`entities/projectile/{sandworm_projectile,sandworm_projectile_aoe}.json`、
  `entities/boss/decoration/sand_column.json`（实测在 `entities/boss/decoration/`）、
  `animation_controllers/bf/sandworm.json`、`loot_tables/bf/bossesrise/entities/{sandworm,bf_boss_sandworm_trophy}.json`、
  奖杯 4 文件、`blocks/waypoints/waypoint_sirok.json` + `items/blocks/waypoints/waypoint_sirok.json`（可不要）、
  `structures/bf_bossesrise/sandworm_nest.mcstructure`、`worldgen/*sandworm*` 3 文件
- RP：`entity/sandworm.json`、`entity/sandworm_health_bar.json`、`models/entity/sandworm.geo.json`、
  `animations/sandworm.animation.json`、`animation_controllers/sandworm.json`、`render_controllers/sandworm.rc.json`、
  `textures/bf/bossesrise/entity/sandworm.png`、`textures/bf/bossesrise/particles/sandworm/*.png`(6)、
  `particles/bf/bossesrise/sandworm/*.particle.json`(10)、`sounds/bf/bossesrise/sandworm/*.ogg`(14)、
  `sounds/bf/bossesrise/boss_music/SirokMain.ogg`
- 牵连：复用 `bf_bossesrise:dragon_hitbox`（无客户端实体，纯碰撞）

### 莫加苏尔（abomination）— RP 28 文件 / 768 KB，BP 6 文件 / 13 KB
- BP：`entities/boss/abomination.json`、`loot_tables/bf/bossesrise/entities/abomination.json`、奖杯 4 文件
- RP：`entity/abomination.json`、`models/entity/abomination.geo.json`、`animations/{abomination.animation.json,abomination_hit_overlay.json}`、
  `animation_controllers/abomination.ac.json`、`textures/bf/bossesrise/entity/abomination.png`、
  `textures/bf/bossesrise/bf/items/abomination_spawn_egg.png`、`particles/abomination_*.particle.json`(7+)、
  `sounds/bf/bossesrise/abomination/*.ogg`(20)、**必须带** `animations/endermage.animation.json`（976 KB，只为 `scale_0`）
- 依赖实体：`generic_hitbox`、`end_boss_p2_bar`、`end_boss_door`；结构 `end_arena`（1.39 MB，与泽莉拉共用）
