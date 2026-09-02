# Survival Daily & World Events Addon

独立的 Minecraft Bedrock 每日日常与动态事件 Addon，对应 PRD v0.1 MVP。v0.3.1 修复原生 NPC 对话未关闭导致“查看今日任务”等按钮无法打开 Script API 菜单的问题，并增加 `UserBusy` 自动重试。

## 联动关系

- **SAPI Server**：服务器主菜单自动出现“生存联盟委托”；奖励写入 `money`；商店回收与玩家寄卖成交额自动推进出售任务；商人 NPC 可直接打开指定 SAPI 商店分类。
- **Apocalypse Mobs**：事件刷怪通过 `apoc:spawn_requests:v1` 请求队列交给原有 `SpawnDirector`；本包不会复制怪物伤害或 AI 配置。启用本包后，怪物包自带的旧随机伏击自动停用，避免重复事件。
- **Test Guns**：枪械造成的伤害会进入击杀参与判定；制造事件可自动记录，若当前 Script API 没有该事件则可提交原版占位物。本包不会修改 Test Guns。
- 任一可选 Addon 未安装时，本包仍能以原版怪物、绿宝石和原版材料回退运行。

## 每日日常

每名玩家每天固定生成四项，退出、死亡、服务器重启不会重新随机：

1. 采集任务；
2. 击杀任务；
3. 完成一次动态事件；
4. 制造、出售或精英击杀中的随机任务。

采集只统计玩家亲手破坏方块。击杀采用“30 格内且最近 15 秒参与伤害”的共享归属，不要求最后一击。

## MVP 原版占位物

| 未来物品 | 当前原版占位 |
|---|---|
| 普通枪械蓝图 | 地图 `minecraft:map` |
| 弹药 | 箭 `minecraft:arrow` |
| 机械研究数据 | 红石 `minecraft:redstone` |
| 枪械维修材料 | 铁锭 `minecraft:iron_ingot` |
| Epic 研究数据 | 紫水晶碎片 `minecraft:amethyst_shard` |
| Epic Research Ticket | 重命名命名牌 `minecraft:name_tag` |

后期只修改 `scripts/rewards/rewards.js` 与任务注册表即可替换为正式物品。

## 动态事件

事件只会从管理员人工建立的节点触发：

- 感染者围攻：三波感染者；
- 幸存者救援：幸存者死亡则失败；
- 掠夺者伏击：4 名持枪掠夺者；
- 坠毁运输车：法制区防守 90 秒，非法制区防守 120 秒；
- 公路路障清理：清除道路上的疾行、远程和变异感染者；
- 毒液感染爆发：以远程毒液感染者为核心的混合敌群；
- 变异体巢穴：仅非法制区出现的三波高阶感染者；
- 武装封锁线：仅非法制区出现的两波持枪掠夺者与重型单位。

事件会读取 Apocalypse Mobs 的区域注册表自动判定难度：

- **法制区**：T1–T3 为主，波次数量较低，提供常规奖励；
- **非法制区**：增加疾行、毒液、变异、重型和持枪 NPC，部分事件增加波数与防守时间，并提供约 1.5–2 倍金币和更高价值材料；
- **安全区**：拒绝启动任何动态事件。

区域判定与 Apocalypse Mobs 当前规则一致：内置坐标和管理员区域优先；未被划入安全区或法制区的地点默认为非法制荒原。

旧版“全部四类随机”节点会自动扩展到新的八类事件池，不需要管理员重新放置节点。管理员仍可把单个节点限制为指定事件。

事件实体统一带 `daily_event_entity` 和实例 tag。节点完成或失败后进入独立冷却；重启时清理旧事件实体，不恢复错误的 ACTIVE 状态。

## 使用

管理员：

```mcfunction
/tag @s add admin
/scriptevent daily:admin
```

在管理菜单中放置“生存联盟委托专员”，并在野外人工建立事件节点。

委托专员使用原生 NPC 对话界面显示完成度、活跃度和可领取奖励。管理菜单还可以放置四种商人：

- 生存物资商人；
- 武器装备商人；
- 医疗补给商人；
- 研究物资商人。

商人类型与分类映射集中在 `daily_events_bp/scripts/merchants/merchantConfig.js`；显示名称、对话正文和按钮集中在 `daily_events_bp/dialogue/merchant_dialogues.json`，后续可直接修改。原生 NPC 对话不可用时会回退到 Script API 菜单。

玩家可右键 NPC、从 SAPI 服务器菜单进入，或运行：

```mcfunction
/scriptevent daily:menu
```

调试命令（聊天事件可用时）：

- `!daily`
- `!daily reset`
- `!event list`
- `!event start infected_attack`
- `!event start survivor_rescue`
- `!event start raider_ambush`
- `!event start crashed_convoy`
- `!event start roadblock_clearance`
- `!event start toxic_outbreak`
- `!event start mutant_nest`
- `!event start mercenary_blockade`
- `!event stop`
- `!event nodes`

聊天事件不可用的服务器可使用 `/scriptevent daily:event list|start <template>|stop|nodes`。
