# R6 Siege Bedrock Add-on（我的六号 · 基岩版）

> 版本 **1.4.0** ｜ 命名空间 `r6` ｜ 引擎下限 **1.21.80** ｜ 脚本 API `@minecraft/server 1.18.0`

把 **Rainbow Six Siege（彩虹六号：围攻）** 的 5v5 拆弹回合制玩法搬进 Minecraft 基岩版：
进攻方/防守方、准备/行动阶段、选干员、R6 数据武器、倒地与救援、炸弹安放与拆除、加固墙、
**木质路障 → 钢梁框架可破坏方块**、全套干员战术道具与 **43 个照搬复制的音效**，
以及管理员地图设置与对局控制。

参考实现为 Java 模组 [USS-Shenzhou/MC-R6mod](https://github.com/USS-Shenzhou/MC-R6mod)
（Rainbow6: Minesiege）。本 addon 按基岩版能力复刻其 **框架与玩法**，美术/音频按仓库约定复用
本地已有 addon 与 MC-R6mod 仓库资源。**逐项复制对照见 [docs/COPY_AUDIT.md](docs/COPY_AUDIT.md)**。

---

## 1. 快速开始

### 安装

1. 双击 `dist/R6_Siege_Addon.mcaddon` 导入（同时安装行为包 + 资源包），或分别导入
   `dist/R6_Siege_BP.mcpack` 与 `dist/R6_Siege_RP.mcpack`。
2. 新建/编辑世界 → 行为包启用 **R6 Siege Bedrock BP**，资源包启用 **R6 Siege Bedrock RP**。
3. 世界设置里建议开启：**允许作弊**（管理员指令与 `/scriptevent` 需要）、**实验性玩法 → 测试版 API**
   （旧版本界面会显示为 "Beta APIs"；脚本模块依赖 `@minecraft/server`）。
4. 进入世界后，管理员先给权限标签：

```mcfunction
/tag @s add r6_admin
```

> 也可以直接给 OP；`r6_admin` 标签用于兼容服务器权限插件。仓库惯用的 `admin` 标签同样有效。

### 最少 2 人快速测试

```mcfunction
# 1. 把队伍规模改成 1v1（默认 5v5）
/scriptevent r6:config teamSize 1

# 2. 两名玩家各自加入队列，满 2 人自动开始
/scriptevent r6:join

# 3. 或者由管理员强制开始（使用在线玩家 / 当前队列）
/scriptevent r6:start
```

### 5v5 正式对局

```mcfunction
/tag @s add r6_admin
/scriptevent r6:setup spawn add ATK-1     # 站在进攻方出生点执行
/scriptevent r6:setup site add A          # 站在 A 点执行
/scriptevent r6:setup site add B          # 站在 B 点执行
/scriptevent r6:setup save                # 持久化地图配置

# 10 名玩家各自：
/scriptevent r6:join
```

没有配置地图时，addon 会按世界出生点自动生成一个「默认训练场」（1 个出生点 + A/B 两个炸弹点），
可直接开打，之后再按上面的指令替换成正式地图。

### 自由测试模式（不需要开对局）

像 Test Guns 一样，**没开对局时也可以直接用枪和技能**，方便创造模式/单人测试：

- 拿着枪右键即可射击（`itemUse`/`itemStartUse` 双事件即时触发，与 Test Guns 的扳机实现一致）；
- 枪械在自由模式用 **物品耐久当弹匣**（打空自动装填、左键点方块手动换弹）；
- 每把枪独立枪声、命中/爆头音效、枪口粒子、Skeleton/设备命中判定全部生效；
- 右键干员技能可直接释放，**无次数与冷却限制**；放置类道具/技能照常生成实体与方块；
- 对局开始后自动切回 R6 规则（准备阶段禁枪、技能有次数/冷却）。

如果右键仍然没有任何反应，执行 `/scriptevent r6:debug`（或平板菜单 → 调试信息）会输出：
事件计数（itemStartUse/itemUse…）、主手物品、当前阶段、能否开火、扳机会话状态，便于定位问题。

### 主菜单

对局中每位玩家背包第 8 格（热键栏 7 号位）会获得 **R6 战术平板**，右键打开主菜单：
加入/离开匹配、**选择干员**、对局状态、帮助、管理员面板。也可以随时执行：

```mcfunction
/scriptevent r6:menu
```

---

## 2. 对局规则

| 阶段 | 默认时长 | 说明 |
|---|---|---|
| 准备阶段 | 20s | 防守方布置技能/加固墙/木板路障；进攻方被限制在出生点 16 格内；双方不能开枪 |
| 行动阶段 | 180s | 进攻方寻找炸弹点并安放炸弹；防守方阻止安放 |
| 炸弹倒计时 | 45s | 炸弹安放后 45 秒引爆，防守方可拆除 |
| 回合结算 | 6s | 展示比分并进入下一回合 |

- **回合胜利条件**
  - 进攻方：炸弹引爆 / 防守方全员被淘汰
  - 防守方：拆除炸弹 / 进攻方全员被淘汰 / 行动阶段时间耗尽
- **换边**：每回合进攻/防守互换；**先赢 4 回合**（`roundsToWin`）获胜，最多 7 回合。
- **倒地与救援**：非爆头致命伤会把玩家打成「倒地」状态（默认 45s 流血），队友靠近并 **潜行** 4 秒可救起；
  激素手枪可瞬间救起。爆头直接淘汰。全队无人站立（全员倒地/阵亡）即被淘汰。
- **淘汰/观战**：真死亡后自动重生为观战视角（基岩版支持 spectator 时使用旁观模式，否则锁定输入 + 隐身）。
- **对局结束**：清空战术背包，恢复玩家入局前的物品、位置、血量与游戏模式。

---

## 3. 操作说明

| 操作 | 说明 |
|---|---|
| **右键（长按）** | 使用主武器射击；自动武器按住连发，半自动/狙击/霰弹每次点击一发 |
| **左键点击方块** | 手动换弹（空仓也会自动换弹） |
| **潜行** | 瞄准（ADS）：降低散布；也是救援倒地队友的姿势 |
| **右键** | 使用干员技能 / 投掷物 / 战术道具 |
| **右键 R6 战术平板** | 打开主菜单（选干员、队列、管理员面板） |
| **靠近队友 / 敌人** | 潜行靠近倒地队友自动救援 |

- 射击时有**枪口焰、曳光弹道、命中火花/烟尘**，连射会逐渐增大**随机摆动**（照搬 Test Guns 2D，详见 6.3）。
- 开局背包固定：`0` 主武器、`1` 副武器、`2` 干员技能、`3` 拆弹器、`4` 加固墙（防守方）、
  `5` 备用主武器（多主武器干员，如 IQ）、`6` 木板路障（防守方，2 个）、`7` 战术平板、`8` 战术匕首。
- 护盾干员（Montagne / Blitz）的主武器是盾：面向子弹方向可格挡伤害，右键切换干员技能（展开护盾 / 闪光）。

---

## 4. 干员一览（22 名，与 MC-R6mod 名单一致）

### 进攻方（11）

| 干员 | 甲/速 | 主武器 | 副武器 | 技能 |
|---|---|---|---|---|
| SLEDGE 大锤 | 3/1 | L85A2 / M590A1 | P226 MK 25 | 破门锤：砸碎轻型结构 |
| THATCHER 撒切尔 | 2/2 | AR33 / M590A1 | P226 MK 25 | EMP 手雷：瘫痪 6 格内敌方电子设备 10s |
| ASH 灰烬 | 1/3 | R4-C / G36C | 5.7 USG | 破门弹：远程炸开墙体/护甲板 |
| THERMITE 铝热剂 | 2/2 | 556 XI / M1014 | M45 MEUSOC | 放热炸药：烧穿加固墙 |
| TWITCH 电击 | 1/3 | F2 / 417 | P9 | 电击无人机：侦查 + 电击敌方设备 |
| MONTAGNE 登山者 | 3/1 | 防暴盾 | P9 | 可伸缩护盾：展开 2.2 格宽掩体 |
| GLAZ 格拉兹 | 2/2 | OTs-03 | PMM | 热成像：标记前方 30 格敌人 |
| FUZE 引信 | 3/1 | AK-12 / 6P41 | PMM | 簇式炸药：墙后连续 5 次爆破 |
| BLITZ 闪电 | 2/2 | 闪光盾 | P12 | 闪光盾闪击：致盲前方 8 格敌人 |
| IQ 艾克 | 1/3 | AUG A2 / 552 Commando / G8A1 | P12 | 电子扫描仪：标记 20 格内敌方设备 |
| RECRUIT 新兵 | 2/2 | L85A2 / R4-C | P226 MK 25 | 破片手雷 |

### 防守方（11）

| 干员 | 甲/速 | 主武器 | 副武器 | 技能 |
|---|---|---|---|---|
| SMOKE 烟尘 | 2/2 | FMG-9 / M590A1 | P226 MK 25 | 毒气罐：8s 毒气云，伤害+致盲 |
| MUTE 静音 | 2/2 | MP5K / M590A1 | P226 MK 25 | 信号干扰器：瘫痪 6 格内进攻方设备 |
| CASTLE 城堡 | 2/2 | UMP45 / M1014 | 5.7 USG | 防弹护甲板：阻挡子弹与通路 |
| PULSE 脉搏 | 1/3 | UMP45 / M1014 | 5.7 USG | 心率传感器：隔墙探测 15 格内敌人 |
| DOC 医生 | 3/1 | MP5 / P90 | P9 | 激素手枪：治疗队友 / 瞬间救起倒地队友（3 发） |
| ROOK 车 | 3/1 | MP5 / P90 | P9 | 护甲包：队友拾取 +1 护甲等级 |
| KAPKAN 卡普坎 | 2/2 | 9x19VSN / SASG-12 | PMM | 入口绊雷：3 个，靠近即爆 |
| TACHANKA 塔昌卡 | 3/1 | 9x19VSN / SASG-12 | PMM | 机枪塔：自动索敌射击 |
| JÄGER 猎人 | 1/3 | 416-C Carbine / M870 | P12 | 主动防御系统：拦截 6 格内投掷物 |
| BANDIT 土匪 | 1/3 | MP7 / M870 | P12 | 电击接线：电击附近进攻方 |
| RECRUIT 新兵 | 2/2 | MP5K / UMP45 | P226 MK 25 | 遥控炸药 |

> 每位防守方额外拥有 **2 块加固墙**（第 5 格）与 **2 个木板路障**（第 7 格）：
> 加固墙让普通破坏无效；木板路障被摧毁后会留下钢梁框架。
> 护甲等级对应 R6S 100/110/120 HP 模型（伤害系数 1 / 0.909 / 0.833），移动速度按 1/2/3 速微调。

---

## 5. 武器数据（R6S 伤害 / 射速 / 弹匣）

伤害为 R6S 面板值，实际扣血按 `R6伤害 × 0.2` 映射到基岩版 20 点生命；距离衰减、四肢 ×0.75、
爆头即死（霰弹爆头 ×1.5）与 R6S 一致。

| 类别 | 武器 |
|---|---|
| 突击步枪 | L85A2 / AR33 / R4-C / G36C / 556 XI / F2 / AK-12 / AUG A2 / 552 Commando / 416-C |
| 精确射手/狙击 | 417 / OTs-03 |
| 冲锋枪 | MP5K / MP5 / FMG-9 / UMP45 / 9x19VSN / MP7 / P90 |
| 轻机枪 | 6P41 / G8A1 |
| 霰弹枪 | M590A1 / M1014 / SASG-12 / M870（8 弹丸） |
| 手枪 | P226 MK 25 / P9 / P12 / PMM / 5.7 USG / M45 MEUSOC |
| 护盾 | 防暴盾 / 闪光盾 |

每名干员在回合开始时获得对应主/副武器、技能、拆弹器、加固墙/木板路障（防守方）、战术平板与匕首；
换弹/弹药储备自动管理（弹匣容量显示在物品耐久条与 HUD 上）。

---

## 6. 可破坏方块、音效与弹道特效

### 6.1 木质路障 → 钢梁框架（v1.1.0 新增）

| 方块 | 标识符 | 特性 |
|---|---|---|
| 木质路障 | `r6:wood_barricade` | 可被子弹累积伤害、破门锤、爆破、爆炸摧毁；占满一格 |
| 钢梁框架 | `r6:steel_frame` | 木质路障被摧毁后自动替换；**无碰撞、可穿行、子弹/投掷物可穿过**，仅作破口视觉残留 |

- 防守方第 7 格（热键栏 6 号位）获得 2 个 **木板路障**，右键对准空位放置（准备阶段即可布置）。
- 破坏方式：子弹约 6~10 发打穿、**Sledge 破门锤**一击、**Ash 破门弹 / Thermite 放热炸药 / Fuze 簇式炸药**
  爆破、手雷/炸药爆炸范围内一并转化。
- 回合开始时，玩家放置过的路障/框架会**自动还原**成原来的方块；地图作者用 `/setblock` 摆的原生路障
  不会被还原，可用于制作固定地图结构。
- 地图制作用法：

```mcfunction
/setblock ~ ~ ~ r6:wood_barricade
/setblock ~ ~ ~ r6:steel_frame
```

### 6.2 音效库（43 个 id / 47 个 ogg，全部从本地参考包复制）

| 分组 | 音效 |
|---|---|
| 武器 | 14 种枪声（每把枪独立）、换弹 ×4、空仓、拔枪、命中身体/爆头/命中金属 |
| 近战/破门 | 匕首挥砍/命中、破门锤、木板路障放置/破坏 |
| 干员技能 | 闪光、毒气、激素、扫描 ping、EMP/电击、干扰器、护盾展开、设备部署、无人机、护甲板 |
| 炸弹/回合 | 炸弹蜂鸣、安放/拆除进度、爆炸 ×4、拆弹完成、回合开始提示 |
| UI | 菜单点击、hover（预留） |

> 来源：Test Guns 2D、ACE 战斗装备、Apex Firearms、DeadZone、Apocalypse Life/Boss、Purizumu CE、
> OldAssGunA、Ranzie Rise & Survive。**逐条来源映射与未复制清单见 [docs/COPY_AUDIT.md](docs/COPY_AUDIT.md)**。
> 回合胜负音乐与兜底音效仍使用原版（参考包内没有合适的胜利/失败音乐）。

### 6.3 弹道特效与随机摆动（v1.4.0，照搬 Test Guns 2D）

粒子定义、贴图与散布公式全部来自本地 `test_guns_2d_addon`，只把命名空间从 `test_gun:` 改成 `r6:`。

**枪口 / 弹道 / 命中特效**

| 效果 | 说明 |
|---|---|
| 枪口焰 | 普通枪械 `r6:muzzle_flash`（圆形焰）；狙击 / 精确射手 / 霰弹使用 `r6:muzzle_flash_heavy`（3 颗旋转重焰） |
| 曳光弹 | 沿枪口→命中点逐段铺粒子：步枪 `r6:bullet_tracer`、狙击/精确射手 `r6:heavy_tracer`、霰弹 `r6:shotgun_tracer`、冲锋枪/手枪 `r6:vector_tracer`、机枪 `r6:pkm_tracer` |
| 方块命中 | 火花 `r6:bullet_hit_spark` + 烟尘 `r6:bullet_hit_smoke`；狙击/精确射手额外 `r6:bullet_hit_heavy_flash` |
| 实体命中 | 火花 + 命中/爆头音效（R6 伤害管线） |
| 枪口位置 | 头部位置 + 视角/右向/上向偏移估算，并做墙体遮挡裁剪，不会穿墙冒火光 |

**随机摆动 / 连射散布**（`r6_bp/scripts/guns/spread.js`，1:1 移植 Test Guns `RecoilManager` + `spreadUtils`）

- 连射热度：12 刻内继续射击 `count+1`（上限 15），停火超过 12 刻重置为 1；
- 角度上限：`pitch = min(18°, recoil × 5.5 × heat × stability)`、`yaw = min(12°, recoil × 2.9 × heat × stability)`，
  `heat = 1 + min(1.2, count × 0.12)`；
- 姿态稳定度：潜行（ADS）×0.55、冲刺 ×1.4、下落/攀爬 ×1.6；
- 采样：瞄准平面内均匀圆盘拉伸为椭圆；霰弹每颗弹丸再叠加基础锥角（`atan(0.075)`，潜行 `atan(0.022)`），
  8 颗弹丸各自随机；
- 差异说明：只做「子弹方向随机摆动」，不修改相机/实体旋转（脚本 API 无受支持的相机后坐力接口），
  视角抖动仅保留原版 `camerashake` 微震。

> 粒子贴图复制在 `textures/particle/r6/`（spark / mf_circle3 / circle_orange）；
> `textures/particle/particles` 是原版图集，不重复打包。

---

## 7. 指令表（`/scriptevent`）

所有指令均以 `/scriptevent r6:<子指令> [参数]` 形式使用。

### 玩家指令

| 指令 | 作用 |
|---|---|
| `r6:menu` | 打开主菜单（同战术平板） |
| `r6:join` / `r6:leave` | 加入 / 离开匹配队列 |
| `r6:op [干员ID]` | 打开干员选择 / 直接选择干员（仅准备阶段，例如 `r6:op ash`） |
| `r6:status` | 查看当前对局状态 |
| `r6:help` | 操作说明 |
| `r6:debug` | 输出枪械/技能诊断信息（右键无反应时用） |

### 管理员指令（需要 `r6_admin` 标签或 OP）

| 指令 | 作用 |
|---|---|
| `r6:start` | 强制开始对局（优先使用队列，否则用在线玩家） |
| `r6:stop` | 终止当前对局并恢复玩家数据 |
| `r6:config <键> <值>` | 修改对局参数（见下表），不带参数则输出当前配置 |
| `r6:reset` | 重置所有配置为默认值 |
| `r6:setup spawn add\|del <名称>` | 玩家当前位置设为进攻方出生点 / 删除出生点 |
| `r6:setup site add\|del <A\|B>` | 玩家当前位置设为炸弹点 / 删除炸弹点 |
| `r6:setup save` / `show` / `clear` / `auto` | 保存 / 查看 / 清空 / 按世界出生点重建地图 |

### 配置项（`r6:config`）

| 键 | 默认 | 说明 |
|---|---|---|
| `teamSize` | 5 | 每队人数 1~5 |
| `roundsToWin` | 4 | 先赢几回合获胜 |
| `maxRounds` | 7 | 最多回合数 |
| `prepSeconds` | 20 | 准备阶段秒数 |
| `actionSeconds` | 180 | 行动阶段秒数 |
| `bombSeconds` | 45 | 炸弹倒计时 |
| `plantSeconds` | 4 | 安放耗时 |
| `defuseSeconds` | 7 | 拆除耗时 |
| `reviveSeconds` | 4 | 救援耗时 |
| `bleedoutSeconds` | 45 | 倒地流血时间 |
| `roundEndSeconds` | 6 | 回合结算展示时间 |
| `friendlyFire` | false | 是否允许子弹友伤（投掷物/爆炸始终可伤队友） |

---

## 8. 与 MC-R6mod 的对照

照搬的核心框架：

| MC-R6mod（Java） | 本 addon（基岩版） |
|---|---|
| 22 名干员枚举 + 攻守阵营 | ✅ 22 名干员，含甲/速、武器、专属技能、图标徽章物品 |
| 回合制：准备/行动/炸弹安放/换边/先到 N 胜 | ✅ 完整回合状态机 + 比分 + 换边 |
| 地图配置：出生点 / A·B 炸弹点 / 区域点 | ✅ `/scriptevent r6:setup` 持久化地图 |
| 主菜单 / 回合准备（选点、选干员、准备就绪） | ✅ Server UI 菜单（队列、选干员、状态、管理员面板、帮助） |
| HUD：回合数、比分、计时、玩家信息条 | ✅ ActionBar HUD + Title 播报 |
| 枪械框架：Trigger/Bolt/弹匣/距离衰减/爆头/四肢 | ✅ 自动/半自动、弹匣与备弹、换弹、距离衰减、爆头即死、四肢减伤、霰弹多弹丸 |
| 身体部位命中（头/身/四肢）判定 | ✅ 头部球体 + 身体 AABB 射线判定 |
| 倒地（DBNO）→ 补枪/流血/救援 | ✅ 倒地、流血计时、补枪淘汰、潜行救援、Doc 激素救援 |
| 护甲/护盾 | ✅ 护甲等级伤害模型、Rook 护甲板、可格挡护盾 |
| 计分：击倒 75 / 击杀 100 | ✅ 击倒/击杀/助攻/安放/拆除计分，结算展示 |
| 干员技能（Java 版为 TODO/框架） | ✅ 22 个技能全部可玩，并补充加固墙、投掷物、爆炸物 |
| 上游美术资源（图标/GUI/Logo） | ✅ 全部复制进资源包（`textures/ui/r6mod/**`），图标已用于干员徽章 |
| 上游音效 | ⚠️ 上游仓库无音频；已从本地参考包复制 43 个音效 id 补齐 |

基岩版适配差异（受平台限制，已尽量用等效机制实现）：

- **趴下/侧身（Prone/Lean）**：基岩版玩家姿势无法由脚本控制，改为「潜行 = 瞄准」与移速/散布惩罚；
- **第一人称 3D 枪模**：复用本地 Test Guns 的枪械几何/贴图/持枪动画，简化了瞄准/换弹/开火动画；
- **自定义 JSON UI 主菜单**：改用 `@minecraft/server-ui` 表单（功能等价，风格不同）；GUI 纹理已复制备用；
- **排行榜/服务器统计/皮肤系统/CSSS 网络同步**：未移植（需要服务器侧数据库与网络模块，或上游仓库本身未实现）；
- **观战**：优先 `spectator`，不支持时锁定输入 + 隐身观战；
- **地图构造**：不自动生成地图，由管理员用 `/scriptevent r6:setup` 标注出生点与炸弹点，
  或用自定义方块 `r6:wood_barricade` / `r6:steel_frame` 手搭 R6 风格结构。

完整逐项审计（已复制 / 已适配 / 未复制 / 待办）见 **[docs/COPY_AUDIT.md](docs/COPY_AUDIT.md)**。

---

## 9. 目录结构

```
r6_addon/
├── r6_bp/                       # 行为包
│   ├── manifest.json
│   ├── items/                   # 81 个自定义物品（武器/技能/平板/拆弹器/路障/徽章）
│   ├── entities/                # 12 个设备实体（炸弹/无人机/护盾/机枪塔/ADS…）
│   ├── blocks/                  # 2 个自定义方块（木质路障 / 钢梁框架）
│   └── scripts/
│       ├── main.js              # 入口：事件订阅 + 主循环
│       ├── config.js            # 持久化配置
│       ├── state.js             # 全局状态 / 玩家状态 / 标签
│       ├── util.js              # 向量、射线（可穿透钢梁）、HUD、声音、物品工具
│       ├── hud.js               # ActionBar/Title/播报
│       ├── setup.js             # 地图配置与安全传送
│       ├── loadout.js           # 干员装备 / 弹药 / 物品工厂 / 路障发放
│       ├── damage.js            # R6 伤害管线（护甲/护盾/爆头/倒地/淘汰）
│       ├── dbno.js              # 倒地、救援、观战
│       ├── bomb.js              # 安放/拆除/引爆
│       ├── match.js             # 队列、回合、比分、对局生命周期
│       ├── menu.js              # Server UI 菜单与指令路由
│       ├── guns/engine.js       # 扳机会话、命中判定、弹药、换弹、枪口/曳光/命中特效
│       ├── guns/spread.js       # 连射热度 + 姿态稳定度 + 椭圆随机散布（照搬 Test Guns）
│       ├── gadgets/abilities.js # 22 个干员技能分发与效果
│       ├── gadgets/deployables.js # 设备实体行为（干扰器/ADS/机枪塔/绊雷…）
│       ├── gadgets/projectiles.js # 投掷物、毒气云、ADS 拦截
│       ├── gadgets/breach.js    # 破门、爆破、加固墙、木板路障→钢梁
│       └── data/registry.js     # 由 tools/gen_data.py 生成的武器/干员/方块数据
├── r6_rp/                       # 资源包
│   ├── attachables/             # 33 个武器/护盾 3D 手持定义
│   ├── models/entity/r6/        # 18 个枪械几何 + 12 个设备几何
│   ├── models/blocks/           # 钢梁框架自定义方块几何
│   ├── animations/              # 持枪/持盾动画（来自本地 Test Guns）
│   ├── entity/                  # 12 个客户端实体
│   ├── textures/blocks/         # 木质路障 / 钢梁框架贴图
│   ├── textures/                # 物品图标 / 武器 3D 贴图 / 干员徽章 / 设备贴图
│   │   └── ui/r6mod/            # 从 MC-R6mod 复制的全部 GUI/图标原始资源
│   ├── sounds/                  # 47 个 ogg：枪声 / r6/ 技能与 UI 音效
│   ├── particles/               # 10 个弹道特效粒子（枪口焰/曳光弹/命中火花烟尘）
│   ├── textures/particle/r6/    # 弹道特效贴图（spark / mf_circle3 / circle_orange）
│   ├── terrain_texture.json     # 自定义方块贴图映射
│   └── item_texture.json
├── docs/
│   ├── COPY_AUDIT.md            # 素材/功能复制对照审计（含未复制清单）
│   ├── licenses/                # MC-R6mod LICENSE / LICENSE.FOR_ASSETS（CC BY-NC-SA 4.0）
│   └── reference/               # 上游 lang / damage_type 原始副本
├── tools/
│   ├── r6data.py                # 单一数据源：武器/干员/技能/设备/方块/素材映射
│   ├── gen_data.py              # 生成 items/entities/blocks/registry/manifest
│   ├── import_assets.py         # 导入本地 addon + 参考包 + MC-R6mod 美术/音效
│   ├── gen_icons.py             # Pillow 程序化生成图标/方块贴图/包图标
│   └── build.py                 # 打包 mcpack / mcaddon
├── tests/
│   ├── validate_r6.mjs          # 静态校验（JSON/引用/UUID/贴图/声音/方块/脚本语法）
│   ├── run_smoke.mjs            # 无头冒烟测试（mock @minecraft/server 跑完整对局）
│   └── mock/                    # 测试用 Minecraft API 模拟层
├── dist/                        # 构建产物
├── build.ps1                    # 一键：生成 → 校验 → 冒烟 → 打包
└── README.md
```

---

## 10. 开发与构建

```powershell
cd addons/development/r6_addon
powershell -ExecutionPolicy Bypass -File build.ps1
```

或分步执行（需要 Python 3 + Node.js）：

```powershell
python tools/gen_data.py        # 生成物品/方块/实体/registry/manifest
python tools/gen_icons.py       # 生成图标、方块贴图与包图标
python tools/import_assets.py   # 导入 Test Guns / 参考包 / MC-R6mod 美术与音效
node tests/validate_r6.mjs      # 静态校验
node tests/run_smoke.mjs        # 无头对局冒烟测试
python tools/build.py           # 打包到 dist/
```

- 所有物品/方块/实体/`scripts/data/registry.js` 都由 `tools/r6data.py` 单一数据源生成，
  改数值/加武器/加干员后重新跑生成器即可。
- `tests/validate_r6.mjs` 校验：JSON 语法、UUID 依赖、物品→图标→贴图链、几何/动画/音效引用、
  方块→terrain_texture→贴图/几何链、实体 BP⇄RP 对应、干员/武器/技能引用完整性、
  脚本音效 id 是否都在音效库中、JS 语法、许可/审计文件是否存在、打包产物。
- `tests/run_smoke.mjs` 使用 mock 的 `@minecraft/server` 在 Node 里实际运行脚本：10 人匹配 →
  准备/行动阶段 → 射击 → 爆头淘汰 → 倒地救援 → 安放/引爆 → 木质路障→钢梁转化 →
  回合/对局结束 → 1v1 与中途退出等 30+ 断言。

### 修改版本号

`tools/r6data.py` 顶部 `PACK_VERSION = [1, 2, 0]`，重新生成/打包即可（BP/RP 版本与依赖自动同步）。

---

## 11. 资源来源与许可

- **代码**：本仓库原创实现（行为包脚本、生成器、测试、构建）。
- **干员图标**（防守方 10 名 + 新兵 2 套共 12 张用于徽章，15 张原始全集另存）与 GUI/Logo 资源：
  来自 [USS-Shenzhou/MC-R6mod](https://github.com/USS-Shenzhou/MC-R6mod)，其美术资源采用
  **CC BY-NC-SA 4.0**（署名-非商业性使用-相同方式共享）授权，本仓库仅作非商业用途使用并在此署名；
  原始许可证文本已复制到 `docs/licenses/`。其余 10 名进攻方图标、技能图标、设备贴图、方块贴图与包图标
  为程序化生成的原创资源。
- **武器 3D 模型/贴图/持枪动画/枪声**：复用本仓库 `addons/development/test_guns_2d_addon` 中的本地素材
  （DeadZone / 原创枪械资源链），按「不修改第三方基础模型与贴图」原则原样复制到本 addon，
  发布包不依赖参考目录或其他 addon。
- **音效**：14 种枪声与闪光/爆炸/近战来自 Test Guns；其余 29 个技能/UI/杂项音效 id
  （33 个 ogg）来自本仓库 `addons/reference/**`（ACE 战斗装备、Apex Firearms、DeadZone、
  Purizumu CE、OldAssGunA、Ranzie Rise & Survive）与 `addons/development/apocalypse_*`
  （Apocalypse Life/Boss）。全部为本地仓库内素材的复制，发布包自包含。
- 逐条来源、数量与未复制项见 [docs/COPY_AUDIT.md](docs/COPY_AUDIT.md)。
- 本项目是**粉丝作品**，非 Ubisoft 官方产品，与 Ubisoft 无关联。《彩虹六号：围攻》商标及内容版权归
  Ubisoft Entertainment 所有。

---

## 12. 游戏内验收清单

导入后建议按以下顺序验证（本仓库无头测试已覆盖逻辑部分）：

- [ ] 世界内 `/scriptevent r6:menu` 能打开主菜单，管理员面板可进入
- [ ] **未开对局时**：拿着枪右键能直接开火（有枪声/枪口粒子），打空自动换弹；右键技能能直接释放
- [ ] `/scriptevent r6:debug` 能显示事件计数与主手物品（右键无反应时先看这里）
- [ ] 1v1 快速测试：双方能看到准备阶段标题、HUD 阶段/计时/比分、被传送到出生点/炸弹点
- [ ] 准备阶段进攻方无法离开出生点；行动阶段可自由移动
- [ ] 右键主武器能射击、有独立枪声与枪口粒子；弹药 HUD 与耐久条减少；空仓自动换弹
- [ ] **长按右键自动武器持续连发**（松开立即停火；半自动/狙击/霰弹每次点击一发）
- [ ] **弹道特效**：枪口有火焰、子弹有曳光弹道、方块命中冒火花与烟尘；狙击为重型曳光 + 重命中焰
- [ ] **随机摆动**：连续射击时弹道散布逐渐变大；潜行（ADS）明显更集中；停止射击后恢复
- [ ] 左键点方块可手动换弹；空仓扣扳机有 dry fire 声
- [ ] 爆头直接淘汰；身体多枪击倒进入倒地状态，队友潜行救援成功
- [ ] 进攻方在炸弹点用拆弹器安放炸弹（4s 进度条），45s 后爆炸并回合结算
- [ ] 防守方在炸弹旁用拆弹器拆除（7s），防守方获胜
- [ ] 全队被淘汰/时间耗尽/炸弹爆炸均能正确判定胜负并换边
- [ ] **防守方第 7 格木板路障**：右键放置木板方块；子弹打约 6~10 发后变成钢梁框架且可穿过
- [ ] **Sledge / Ash / Thermite / 手雷** 命中木质路障后同样变为钢梁框架；回合结束后自动还原
- [ ] 地图里 `/setblock ~ ~ ~ r6:wood_barricade` 可正常放置，钢梁框架不阻挡移动/子弹
- [ ] 干员技能：至少验证 Sledge 破门锤、Thermite 放热炸药、Doc 激素、Rook 护甲包、Kapkan 绊雷、Jäger ADS
- [ ] 音效：换弹/命中/爆头/护盾展开/EMP/干扰器/炸弹蜂鸣/拆弹进度均有声音且来自音效库
- [ ] 防守方加固墙：普通破坏无效、Thermite/Ash 可炸开
- [ ] 先赢 4 回合后对局结束，玩家物品/位置/血量/模式恢复
- [ ] `/scriptevent r6:setup spawn add …` / `site add A|B` / `save` 后重进世界地图配置仍在

## 13. 版本日志

### 1.4.0

- **修复：长按无法连续射击**。按 Test Guns 的扳机模型重做：`itemStartUse` 按下即开火并进入持续扳机状态，
  interval 每刻按射速连发；修复了 `itemUse` 先到时把会话标成 tap、导致自动武器每发后解除 armed 的问题。
- **照搬弹道特效**：10 个粒子定义 + 3 张贴图从 Test Guns 2D 复制（枪口焰 ×2、曳光弹 ×5、命中火花/烟尘/重焰 ×3），
  按枪械类别自动选择效果；枪口位置估算 + 墙体裁剪。
- **照搬随机摆动**：连射热度（12 刻内 +1，上限 15）、姿态稳定度（潜行 0.55 / 冲刺 1.4 / 下落 1.6）、
  pitch ≤18° / yaw ≤12° 椭圆均匀采样、霰弹每弹丸叠加基础锥角 —— 公式 1:1 移植自 `spreadUtils.js`。
- 新增测试：长按连发弹数、粒子生成、散布热度/ADS/方向单位化；静态校验新增弹道粒子链路（10 个 id、贴图、脚本引用）。

### 1.3.0

- **修复：枪械无法发射子弹**。按 Test Guns 的扳机实现重写射击引擎：
  `itemUse` / `itemStartUse` / `itemStartUseOn` 事件**即时开火**（不再只等 interval tick），
  `itemUse` 单点为单发、`itemStartUse` 长按为连发，`itemStopUse`/`itemReleaseUse` 结束扳机；
  左键点方块换弹；枪声/命中音效/枪口粒子/耐久弹匣同步。
- **修复：所有技能右键无法释放**。技能/道具改为**对局无关**：未开对局时自动进入自由测试模式
  （无冷却/无次数限制、可直接放置与释放），对局中才应用 R6 规则（准备阶段限制、次数与冷却）。
  之前“不在对局中”时 `ps(player)` 为空导致直接 return，是右键无反应的根本原因。
- **新增自由测试模式**：无需开对局即可测试全部枪械与 22 个技能；枪械用耐久当弹匣。
- **新增 `/scriptevent r6:debug` 与平板菜单“调试信息”**：输出事件计数、主手物品、阶段、
  能否开火、扳机会话状态，便于在游戏内定位右键问题。
- 新增无头测试：itemUse 单发、自由模式开火/长按连发/耐久弹匣、自由模式全技能释放与设备生成。

### 1.2.0

- **音效照搬复制**：从本地参考包导入 33 个 ogg / 29 个技能、UI 与杂项音效 id，并在脚本中替换全部
  原版占位音效（换弹、空仓、拔枪、命中/爆头、破门锤、路障、部署、护盾、毒气、激素、扫描、
  EMP、干扰器、炸弹蜂鸣、拆弹、无人机、护甲板、UI）；音效库共 43 个 id / 47 个 ogg。
- **补齐 MC-R6mod 剩余可复制资源**：15 张干员图标原始全集、46 张 GUI、11 张物品贴图、Logo、
  LICENSE/LICENSE.FOR_ASSETS、lang 与 damage_type 原始副本；新增 `docs/COPY_AUDIT.md` 逐项审计。
- 校验脚本新增：方块链校验、脚本音效 id 全覆盖校验、许可/审计文件校验。

### 1.1.0

- **新增自定义方块**：`r6:wood_barricade`（木质路障）与 `r6:steel_frame`（钢梁框架）。
  木质路障可被子弹累积伤害/破门锤/爆破/爆炸摧毁，摧毁后自动变成可穿行、子弹可穿透的钢梁框架；
  防守方每回合获得 2 个路障，回合开始自动还原玩家放置的路障/框架。
- 破门链路（Sledge / Ash / Thermite / Fuze / 手雷）全部接入路障→钢梁转化；子弹射线与投掷物
  可穿透钢梁框架；加固墙逻辑不影响自定义方块。

### 1.0.0

- 首个可玩版本：22 干员、33 武器/护盾、22 套技能、5v5 拆弹回合制、DBNO/救援、加固墙、
  投掷物/爆炸物、管理员地图与对局控制、HUD、完整构建与校验工具链。
