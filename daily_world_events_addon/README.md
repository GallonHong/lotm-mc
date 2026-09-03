# Survival Daily & World Events Addon

独立的 Minecraft Bedrock 每日日常、动态事件与多副本 Addon。v0.14.1 取消副本创建前的心跳硬阻断，Boss 在对应阶段直接尝试生成；刷怪笼替换也改为 Script API 逐块设置，不再依赖 `fill` 命令。v0.14.0 新增无品质“废墟物资箱”。v0.13.0 接入单金币经济、四类固定日常、分难度副本收益递减、正式神话补给密钥与 Epic 蓝图掉落。每日新闻管理入口仍位于 Daily 管理菜单首项，并可由 SAPI 管理员控制台通过 `daily:news_admin` 直达。

## 可复用物资箱

- `daily:loot_crate_scavenger`：无品质废墟物资箱，30 分钟刷新；每次获得 1–1000 金币和 2–4 组随机物品。金币中位数为 150，金额越高越罕见；物品权重中至少 40% 为 Addon 食品、饮料、医疗用品、子弹、枪械半成品和载具零件，并保留极低概率 Epic 图纸与神话补给密钥；
- `daily:loot_crate_common`：15 分钟刷新；
- `daily:loot_crate_rare`：30 分钟刷新；
- `daily:loot_crate_epic`：60 分钟刷新；
- `daily:loot_crate_legendary`：120 分钟刷新；
- `daily:loot_crate_mythic`：240 分钟刷新，必须手持“神话补给卡”开启。

神话箱需要正式物品 `daily:mythic_supply_key`（神话补给密钥）。该物品没有任何合成配方，只能从 SAPI 的 Epic/Legendary 金币奖池，以及 Epic、Legendary 物资箱的额外掉落中获得；神话箱自身还有 15% 概率返还密钥。旧版已发放并命名为“神话补给卡（MVP）”的回响碎片仍可兼容使用。神话箱固定随机开出一张限定 Epic 蓝图，不会产出 Legendary 蓝图。

奖池、钥匙和刷新时间集中在 `scripts/rewards/lootCratePools.js`。World Event、摸金都市与主世界地图均可直接放置这些方块；交互按“玩家 + 箱子坐标”独立去重，已开启箱子在附近有玩家时不会突然复原。

主世界刷怪笼替换由 `scripts/rewards/SpawnerReplacementManager.js` 执行。系统只处理玩家附近已加载的主世界区块，每 tick 最多检查 1024 个方块，通过 `BlockPermutation` 直接替换 `mob_spawner`/`monster_spawner`；刷怪笼内部配置的僵尸、蜘蛛等实体类型不会影响识别。系统不会一次遍历全地图或强制加载区块，玩家继续探索时，新遇到的遗迹、地牢和矿井刷怪笼也会被替换。

管理员站在刷怪笼附近输入 `/scriptevent daily:crate scan`，可强制把周围 3×3 区块重新加入扫描队列；请保持这些区块加载约一分钟。测试发放物资箱使用 `/scriptevent daily:crate give`，不提供 `!crate`/`!box` 聊天命令。

## 联动关系

- **SAPI Server**：服务器主菜单自动出现“生存联盟委托”；奖励写入 `money`；商店回收与玩家寄卖成交额自动推进出售任务；商人 NPC 可直接打开指定 SAPI 商店分类。
- **Apocalypse Mobs**：事件刷怪通过 `apoc:spawn_requests:v1` 请求队列交给原有 `SpawnDirector`；本包不会复制怪物伤害或 AI 配置。主城入侵时，只有同时带 `daily_event_entity` 和 `daily_allow_safe_zone` 的事件敌人可暂时留在安全区，普通敌人仍会被清理。
- **Test Guns**：枪械造成的伤害会进入击杀参与判定；制造武器、制造弹药和获得枪械半成品可推进综合日常。
- 普通事件和普通副本敌人在联动 Addon 缺失时仍可回退原版实体、绿宝石和原版材料；Boss 副本不会使用原版怪物冒充 Boss，必须启用 Apocalypse Boss BP/RP。

## 每日日常

每名玩家每天固定生成四项，退出、死亡、服务器重启不会重新随机：

1. 采集任务；
2. 击杀任务；
3. 完成一次动态事件；
4. 副本、制造弹药、制造武器、获得半成品、开箱或击杀 Boss 中的随机综合任务。

采集按接取任务后背包中新获得的目标物品计数，已有库存不会立即完成任务。击杀采用“30 格内且最近 15 秒参与伤害”的共享归属，不要求最后一击。四项奖励依次为 800、900、1,100、1,200 金币，全部完成额外奖励 2,000 金币，每日合计 6,000。

## 副本经济

Normal / Hard / Nightmare 首次完成分别奖励 2,000 / 3,500 / 5,000 金币，重复完成分别奖励 1,200 / 2,000 / 2,500。每日前两次奖励 100%，第 3–4 次 75%，第 5 次起 50%；Hard 与 Nightmare 另有 0.5% / 1.5% Epic 蓝图概率。

## 动态事件

### 联盟每日新闻

每个真实动态事件启动后都会先写入新闻档案，再向全服发布标题、地点名称和完整坐标；事件完成、失败或超时后自动发布战报。玩家可在每日委托菜单的“联盟每日新闻”查看最近 30 条记录，或使用 `/scriptevent daily:news`、`!news`。

内置 14 套可复用报道预设，包括两种尸潮、雾中人、山羊人、警笛头、两种叛军入侵、运输车求救、幸存者求救、毒雾污染、公路感染者、武装路障、变异体巢穴和雇佣兵封锁。新闻文案与战斗模板分离，同一事件可以随机使用不同报道。

管理员菜单的“发布新闻并启动事件”支持选择预设后填写：

- 新闻地点名称；
- 主世界、下界或末地；
- X、Y、Z 坐标。

系统会临时加载目标区块，在填写的 Y 上下 24 格内寻找实体地面；找不到安全落点时不会发布新闻或生成事件。新闻发布后给予全服 2 分钟抵达时间，首名玩家进入事件半径才正式生成敌人，避免远距离事件在无人到场时空跑。“创建人工事件节点”也支持手动填写维度和坐标。

### 事件类型

事件可以由管理员人工建立的节点触发，也可以从新闻管理菜单按手填坐标立即发布：

- 感染者围攻：三波感染者；
- 幸存者救援：幸存者死亡则失败；
- 掠夺者伏击：4 名持枪掠夺者；
- 坠毁运输车：法制区防守 90 秒，非法制区防守 120 秒；
- 公路路障清理：清除道路上的疾行、远程和变异感染者；
- 毒液感染爆发：以远程毒液感染者为核心的混合敌群；
- 变异体巢穴：仅非法制区出现的三波高阶感染者；
- 武装封锁线：仅非法制区出现的两波持枪掠夺者与重型单位。
- 雾中人、山羊人、警笛头调查：生成 Apocalypse Mobs 中对应的真实都市传说 Boss；缺少对应实体时不会发布空新闻；
- 叛军进攻主城：仅安全区可启动，四波叛军和重型单位进攻主城防线。

事件会读取 Apocalypse Mobs 的区域注册表自动判定难度：

- **法制区**：T1–T3 为主，波次数量较低，提供常规奖励；
- **非法制区**：增加疾行、毒液、变异、重型和持枪 NPC，部分事件增加波数与防守时间，并提供约 1.5–2 倍金币和更高价值材料；
- **安全区**：只允许显式配置的“叛军进攻主城”，继续拒绝其他动态事件和普通自然刷怪。

区域判定与 Apocalypse Mobs 当前规则一致：内置坐标和管理员区域优先；未被划入安全区或法制区的地点默认为非法制荒原。

旧版“全部四类随机”节点会自动扩展到新的十二类事件池，不需要管理员重新放置节点。管理员仍可把单个节点限制为指定事件。

事件实体统一带 `daily_event_entity` 和实例 tag。节点完成或失败后进入独立冷却；重启时清理旧事件实体，不恢复错误的 ACTIVE 状态。

## 多副本系统

| 副本 | 类型 | Structure 数 | 主要流程 |
|---|---|---:|---|
| 曙光谷·第一次撤离 | 单人教程 | 14 | 蓝图 → 普通 AK74U → 射击 → 箱子 → 载具 → 最低尸潮 → 雷暴 → 摸金撤离 |
| 灰港防线·最后一夜 | 防守 | 13 | 启动中继器 → 多方向尸潮 → 重型单位 → 撤离 |
| 黑雨医院·营救计划 | 路径营救 | 15 | 清理医院 → 找到医生 → 分段护送 → 掠夺者伏击 → 雷暴 → 暴君 Boss |
| 断桥公路·车队护送 | 载具护送 | 14 | 补给车发车 → 公路节点 → 武装路障 → 工业区卸货防守 |
| 废弃医院·封锁小镇 | 清剿 | 6 | 诊所、街道、警局、市场、车库九阶段清剿 |
| 白雾医院·无面病区 | Boss | 13 | 医院肃清 → 雾中人 → 地下病区 → 变异僵尸 |
| 赤角工厂·猎杀之夜 | Boss | 13 | 外围巢穴 → 山羊人 → 炼钢厂 → 变异铁傀儡 |
| 失声城区·最后广播 | Boss | 14 | 恢复广播 → 变异骷髅 → 诱导信号 → 警笛头 |
| 沉没泵站·深水回声 | Boss | 13 | 排水调查 → 变异溺尸 → 水塔追踪 → 变异投掷者 |
| 黑箱实验场·终极样本 | Boss 连战 | 14 | 隔离突破 → 变异末影人 → 反应堆防守 → 召唤母体 |

新副本优先复用仓库里的 DeadZone 与 RandS Overgrown Cities `.mcstructure`。导入工具会把 `mcpe:*` 家具替换成原版近似方块，并删除结构自带实体、刷怪笼和 Jigsaw；运行时不要求安装原素材包。每次开局按 32³ 分片清空实例槽位，再分帧加载结构，避免旧地图残留和一次性大量命令造成卡顿。现在有四个相隔 256 格的高空实例槽位。

新手教程为原创“车队坠毁—无线电引导—第一次撤离”剧情。教学枪是临时的普通品质 `test_gun:ak74u`，使用 `test_gun:ammo_rifle`；离开教程时会回收带“教学”名称的借用物品。首次贡献达标后，固定发放 2000 元和真实 Test Gun 物品 `test_gun:blueprint_deagle`（优良/蓝色品质图纸）。完成标记保存在玩家动态属性中，副本可重玩但奖励永不重复。

支持的关卡类型集中在 `scripts/dungeons/dungeonTemplates.js`：

- `briefing`：剧情、教学和临时装备；
- `checkpoint`：人工坐标打卡并更新复活点；
- `eliminate` / `boss`：固定刷怪点清剿；
- `interact`：放置并开启可复用物资箱；
- `route`：多节点载具或 NPC 护送；
- `defend`：按时间表生成多波敌人；
- `disaster`：副本内局部雷暴避险，不修改外部灾害包。

普通敌人优先生成 Apocalypse Mobs 实体，不存在时回退原版实体。`boss` 阶段通过独立的 `bossKey` 严格生成 Apocalypse Boss，不允许原版回退；当前副本池使用重装暴君、雾中人、山羊人、警笛头、变异僵尸、变异骷髅、变异溺尸、变异投掷者、变异末影人、变异铁傀儡和召唤母体。若真实 Boss 无法生成，副本会停止并明确提示检查 Apocalypse Boss，而不会把仅有杂兵的阶段判为完成。载具使用正式 Apocalypse Vehicles 中存在的 `ab_ve:motorcycle` / `ab_ve:truck`，未安装载具包时回退任务标记且路线仍可步行完成。

## 使用

管理员：

```mcfunction
/tag @s add admin
/scriptevent daily:admin
```

在管理菜单中放置“生存联盟委托专员”，并在野外人工建立事件节点。

委托专员使用原生 NPC 对话界面显示完成度、活跃度和可领取奖励。管理菜单还可以放置四种商人：

- 杂货商；
- 军火商；
- 高级军备商；
- 载具商。

商人类型与分类映射集中在 `daily_events_bp/scripts/merchants/merchantConfig.js`；显示名称、对话正文和按钮集中在 `daily_events_bp/dialogue/merchant_dialogues.json`，后续可直接修改。原生 NPC 对话不可用时会回退到 Script API 菜单。

玩家可右键 NPC、从 SAPI 服务器菜单进入，或运行：

```mcfunction
/scriptevent daily:menu
/scriptevent daily:news
/scriptevent daily:dungeon
```

调试命令（聊天事件可用时）：

- `!daily`
- `!daily reset`
- `!news`
- `!dungeon`
- `!event list`
- `!event start infected_attack`
- `!event start survivor_rescue`
- `!event start raider_ambush`
- `!event start crashed_convoy`
- `!event start roadblock_clearance`
- `!event start toxic_outbreak`
- `!event start mutant_nest`
- `!event start mercenary_blockade`
- `!event start fog_man_hunt`
- `!event start goatman_hunt`
- `!event start siren_head_hunt`
- `!event start rebel_invasion`
- `!event stop`
- `!event nodes`

聊天事件不可用的服务器可使用 `/scriptevent daily:event list|start <template>|stop|nodes`。
