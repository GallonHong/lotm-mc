# 素材 / 功能复制对照审计（COPY AUDIT）

> 生成时间：R6 Siege Bedrock **v1.4.0**。本文件回答两个问题：
> 1. 参考实现（MC-R6mod）与本地参考包里的东西，哪些**已经照搬复制**、哪些**适配改造**、哪些**未复制**；
> 2. 音效是否已经全部复制（是：43 个音效 id / 47 个 ogg，见第 3 节映射表）。

---

## 0. 参考对象说明

| 参考 | 位置 | 规模 | 备注 |
|---|---|---|---|
| **USS-Shenzhou/MC-R6mod**（Rainbow6: Minesiege） | GitHub，克隆到本地分析（SSH） | 145 个 `.java`、73 张 `.png`、6 个 `.json`（模型/语言/伤害类型）、**0 个音频文件** | 公开仓库是**框架骨架**：只有 TestGun/TestArmor、比赛状态机、GUI 框架；干员技能、武器数据、皮肤均为 TODO 或注释 |
| 本地 Test Guns 2D | `addons/development/test_guns_2d_addon` | 104 attachable、207 个物品、枪械几何/动画/音效 | 枪械美术与音频主要来源 |
| 本地其它参考包 | `addons/reference/**`（ACE、Apex、DeadZone、Tactical Gear 等）与 `apocalypse_*` | 数千个 ogg/wav | 音效补充来源 |
| R6S 原作 | 玩法设计基准 | — | 22 名干员/武器数据/技能按 R6S 复刻 |

> 结论先说：**MC-R6mod 公开仓库没有任何音频**，所以“音效照搬”只能从本地参考包补齐；
> 已从 8 个本地参考包/工程中挑选 33 个 ogg 复制进 addon（第 3 节）。

---

## 1. MC-R6mod 资源复制清单

| 上游资源 | 数量 | 处理 | 本 addon 位置 |
|---|---|---|---|
| `textures/gui/operator_icon52/*.png` | 15 | **已复制**（12 张用于干员徽章物品，15 张原始全集另存） | `r6_rp/textures/items/badges/`、`r6_rp/textures/ui/r6mod/operator_icons/` |
| `textures/gui/**`（按钮/背景/HUD 条/炸弹点图标/地图场景） | 46 | **已复制（原始保留）** | `r6_rp/textures/ui/r6mod/gui/**` |
| `textures/item/**`（logo、测试盔甲、M16A1 UV、皮肤测试图） | 11 | **已复制（原始保留）** | `r6_rp/textures/ui/r6mod/item/**` |
| `logo128.png` | 1 | **已复制** | `r6_rp/textures/ui/r6mod/logo128.png` |
| `lang/en_us.json` | 1 | **已复制并适配** | 原始文件存 `docs/reference/r6mod_lang_en_us.json`；文案重写进 Server-UI 表单与 HUD |
| `data/r6ms/damage_type/shot.json` | 1 | **已适配**：Java 伤害类型 → 脚本伤害管线 | 原始存 `docs/reference/r6mod_damage_type_shot.json` |
| `models/item/*.json`（Java 物品模型） | 5 | **不适用**：基岩版物品模型体系不同 | —（物品图标为 2D/attachable 体系） |
| `META-INF/*`、`*.mixins.json`、`mods.toml` | — | **不适用**：Forge/NeoForge 元数据 | — |
| `LICENSE` / `LICENSE.FOR_ASSETS` | 2 | **已复制**（CC BY-NC-SA 4.0 合规署名） | `docs/licenses/` |

> GUI 纹理已原样复制进资源包，但 Server-UI 表单无法显示图片，因此当前未挂接到界面；
> 保留用于后续 JSON-UI HUD（见第 5 节“未复制/待办”）。

---

## 2. 本地参考素材复用清单

| 来源 | 已复制内容 | 数量 | 用途 |
|---|---|---|---|
| Test Guns 2D | 18 套武器美术链（attachable + 几何 + 3D 贴图 + 2D 图标 + 持枪动画） | 18 | 33 把武器/护盾的 3D 手持模型 |
| Test Guns 2D | 枪声 ogg | 14 | 每把武器独立枪声 |
| Test Guns 2D | flashbang / artillery_explode1-4 / knife slash & hit | 8 | 闪光、爆炸、近战 |
| Test Guns 2D | 弹道特效粒子定义：枪口焰 ×2、曳光弹 ×5、命中火花/烟尘/重焰 ×3（另有 spark / mf_circle3 / circle_orange 3 张贴图） | 10 粒子 + 3 贴图 | v1.4.0 照搬：枪口焰、曳光弹道、方块/实体命中火花 |
| Test Guns 2D | 随机摆动/后坐力散布公式（`feature/utils/spreadUtils.js` + `feature/recoilManager.js`） | 2 个源文件 | v1.4.0 1:1 移植为 `r6_bp/scripts/guns/spread.js`（连射热度、姿态稳定度、椭圆均匀采样、霰弹锥角） |
| ACE 战斗装备 | scar/glock 换弹 4 件、glock_draw、gun_hit、gun_click、hb_click、lockpick、smoke_attractor、extended_mag_install、mosin_clip_ping | 12 | 换弹、拔枪、命中/爆头、UI、毒气、护甲板、拆弹刻、炸弹蜂鸣 |
| Apex Firearms | dry、hit_flesh、hit_metal、arc_hit | 4 | 空仓、命中反馈、EMP/电击 |
| DeadZone | ping、radio/static | 2 | 扫描/心率 ping、干扰器 |
| Apocalypse Life | healing2、ground_drone_idle | 2 | 激素治疗、无人机 |
| Apocalypse Boss | smash_impact | 1 | 破门锤 |
| Purizumu CE | deploy、alter_deploy | 2 | 护盾展开 / 设备部署 |
| OldAssGunA | step_jump_wood_solid_01 | 1 | 木板路障放置 |
| Ranzie Rise & Survive | woodbreak | 1 | 木板路障破坏 |

**未复制的本地素材（按需可继续搬）：**

| 素材 | 来源 | 未复制原因 |
|---|---|---|
| DeadZone 战术护甲 / 服装 attachable（`armor_*`、`cloth_*`，约 50 件） | test_guns | 干员制服视觉效果；需要新增 8 个可穿戴物品 + 装备槽逻辑，列入 v1.3 |
| Tactical Gear（先进战术装备）夜视仪/头盔/护甲 attachable | `addons/reference/先进战术装备V1.1.3` | 同上，重复度高 |
| Test Guns 3D 枪械动画（`GunVisuals` 临时动画控制器 + attachable 的 `tg3d_*` 变量驱动，含开火/换弹/瞄准动作） | test_guns | 需要 `player.playAnimation(...,{controller,stopExpression})` + 重写 attachable 的 `pre_animation`（原表达式含当前版本不支持的 `??` 指针写法），列入后续 |
| Test Guns 武器皮肤 / flipbook 变体 / 瞄准镜 UI | test_guns | 皮肤系统未移植（见下） |
| R6mod 主菜单/回合准备 3D 地图场景与 JSON-UI 布局 | R6mod（仅 GUI 纹理） | 需完整 JSON-UI 开发；当前用 Server-UI 表单替代 |
| 参考包中的载具/怪物/音乐音频 | 多个参考包 | 与 R6 玩法无关 |

---

## 3. 音效复制映射表（43 个 id / 47 个 ogg）

| 音效 id | 来源 | 用途 |
|---|---|---|
| `r6.<枪械>_shoot` ×14 | Test Guns | 每把枪独立枪声 |
| `r6.flash` | Test Guns flashbang | Blitz 闪光 |
| `r6.explosion` ×4 | Test Guns artillery | 炸弹/炸药/手雷/绊雷 |
| `r6.knife_slash` / `r6.knife_hit` | Test Guns | 近战 |
| `r6.reload_start` / `r6.reload_end` | ACE scar mag out/in | 长枪换弹 |
| `r6.reload_pistol_start` / `r6.reload_pistol_end` | ACE glock mag out/in | 手枪换弹 |
| `r6.dry_fire` | Apex dry | 空仓扣扳机 |
| `r6.weapon_draw` | ACE glock_draw | 拔枪/回合发枪 |
| `r6.hit_flesh` | Apex hit_flesh | 命中身体反馈 |
| `r6.hit_head` | ACE gun_hit | 爆头反馈 |
| `r6.hit_metal` | Apex hit_metal | 命中护盾/设备/墙体 |
| `r6.sledge` | Apocalypse Boss smash_impact | 破门锤 |
| `r6.barricade_place` | OldAssGunA wood step | 放置木板路障 |
| `r6.barricade_break` | Ranzie woodbreak | 路障破坏→钢梁 |
| `r6.gadget_deploy` | Purizumu alter_deploy | 放置/投掷设备 |
| `r6.shield_deploy` | Purizumu deploy | Montagne 展开护盾 |
| `r6.gas` | ACE smoke_attractor | Smoke 毒气 |
| `r6.stim` | Apocalypse Life healing2 | Doc 激素 |
| `r6.ping` | DeadZone ping | 扫描/心率/热成像/回合提示 |
| `r6.emp` | Apex arc_hit | EMP / 电击接线 / ADS 拦截 |
| `r6.jammer` | DeadZone radio static | Mute 干扰器 |
| `r6.beep` | ACE mosin_clip_ping | 炸弹蜂鸣 / 安放提示 |
| `r6.drone` | Apocalypse Life drone idle | 无人机部署 |
| `r6.armor_plate` | ACE extended_mag_install | Rook 护甲包 / 加固墙 |
| `r6.ui_click` | ACE gun_click | 菜单/确认/回合开始 |
| `r6.ui_hover` | ACE hb_click | 预留（表单无 hover 事件） |
| `r6.defuse_tick` | ACE lockpick | 安放/拆除进度声 |

**仍使用原版音效的位置（刻意保留）：**

| 位置 | 原版音效 | 原因 |
|---|---|---|
| 回合胜负提示音 | `random.levelup` / `random.break` | 参考素材中没有合适的胜利/失败音乐，避免用枪声冒充 |
| 兜底 fallback | `random.click` | `util.sound()` 的保底音效 |
| 原版粒子音（如爆炸粒子） | 原版 | 已用 `r6.explosion` 覆盖主要爆炸点 |

---

## 4. 玩法/系统级对照（MC-R6mod → 本 addon）

| MC-R6mod 功能 | 状态 | 本 addon 实现 |
|---|---|---|
| 22 干员枚举 + 攻守阵营 | ✅ 照搬 | 22 干员，甲/速/武器/技能/徽章 |
| 回合制（准备/行动/炸弹/换边/先到 N 胜） | ✅ 照搬 | `match.js` 状态机 + 计时器 |
| 地图配置（出生点 / A-B 炸弹点 / 区域点） | ✅ 适配 | `/scriptevent r6:setup` + 世界动态属性持久化 |
| 主菜单 / 回合准备（选点、选干员、准备就绪） | ✅ 适配 | Server-UI 表单（队列/选干员/管理员/帮助）；GUI 纹理已复制备用 |
| HUD（回合、比分、计时、玩家信息条） | ✅ 适配 | ActionBar HUD + Title 播报 |
| 枪械框架（Trigger/Bolt/弹匣/距离衰减/四肢/爆头） | ✅ 照搬+扩展 | 自动/半自动、换弹、弹药、衰减、爆头即死、霰弹多弹丸 |
| 身体部位命中（head/body/limb，模型盒判定） | ✅ 适配 | 服务端射线 + 头部球体/身体 AABB 判定 |
| 倒地（DBNO）/流血/补枪/救援 | ✅ 照搬 | 倒地计时、补枪淘汰、潜行救援、Doc 激素 |
| 护甲/护盾 | ✅ 照搬+扩展 | 护甲等级伤害模型、Rook 护甲板、可格挡盾 |
| 计分（击倒 75 / 击杀 100） | ✅ 照搬 | 击倒/击杀/助攻/安放/拆除/结算 |
| 干员技能（Java 版为 TODO） | ✅ 自行实现 | 22 个技能全部可玩 + 加固墙 + 投掷物 |
| 可破坏墙体 / 炸弹点方块 | ✅ 新增 | 木质路障 → 钢梁框架自定义方块（v1.1.0） |
| 趴下 / 侧身（Prone/Lean） | ⚠️ 不适用 | 基岩版无法由脚本控制玩家姿势；改为“潜行=瞄准”+移速惩罚 |
| 自定义主菜单 / 3D 地图场景 / 选点界面 | ⚠️ 未复制 | 需要 JSON-UI；GUI 纹理已复制待用 |
| 武器皮肤系统（SkinManager/SkinRegistry） | ⚠️ 未复制 | 参考仓库仅测试皮肤；无完整皮肤美术 |
| 网络同步 / CSSS Voyager / MMR 匹配 | ⚠️ 不适用 | Java 服务端专有；用本地队列/强制开始替代 |
| 服务器赛事统计、玩家数据同步、举报系统 | ⚠️ 未复制 | 需要数据库/HTTP，超出单 addon 范围 |
| 客户端模型上传命中盒（UploadEntityModelPacket） | ⚠️ 适配 | 改为服务端几何近似（球/盒）判定 |
| 食物/生命值客户端代理、无敌帧绕过 | ✅ 适配 | 脚本接管生命值 + 抗性减伤 + 定时器无敌帧绕过 |
| Scoreboard 侧边栏 | ⚠️ 适配 | 原版 scoreboard 侧栏在基岩脚本无稳定假名支持，改 ActionBar |
| 观战 / 淘汰 | ✅ 适配 | spectator 优先，回退隐身+输入锁 |
| 地图材质/方块模型 | ✅ 新增 | 木板路障（full block）+ 钢梁框架（自定义几何、可穿行） |

---

## 5. 当前“未复制/待办”清单（按优先级）

1. **P1｜干员制服**：复制 DeadZone/Test Guns 的 `armor_*`/`cloth_*` attachable，为进攻/防守方各做一套制服（含头盔/背心），并在回合发枪时装备、回合结束还原。（美术链路已确认可复制，需处理 Molang 指针兼容）
2. **P1｜JSON-UI HUD**：用已复制的 R6mod GUI 纹理实现真正的顶部玩家信息条/计时器/比分板，替换 ActionBar 文本 HUD。
3. **P1｜3D 枪械动画**：移植 Test Guns 的 `GunVisuals`（`player.playAnimation` + 临时动画控制器写 `variable.tg3d_*`）与对应 attachable 动画，实现开火/换弹/瞄准的 3D 枪身动作；需同时重写 `pre_animation` 里当前版本不支持的 `??` 指针表达式。
4. **P2｜武器皮肤**：参考仓库皮肤系统不完整，需自建皮肤材质与 UI。
5. **P2｜菜单音效 hover**：`r6.ui_hover` 已入库，等 JSON-UI 或表单 hover 事件可用后挂接。
6. **P3｜更多参考包音效**：如需要可为击杀播报/胜负加入音乐 stingers（参考包内暂无合适素材）。

> 已在 v1.4.0 完成的旧待办：自定义粒子（枪口焰/弹着点/命中）已照搬复制；随机摆动/连射散布已 1:1 移植。

> 若需要继续推进其中任何一项，直接说编号即可。
