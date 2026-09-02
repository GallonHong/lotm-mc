# Survival Daily & World Events Addon

独立的 Minecraft Bedrock 每日日常与动态事件 Addon，对应 PRD v0.1 MVP。

## 联动关系

- **SAPI Server**：服务器主菜单自动出现“生存联盟委托”；奖励写入 `money`；商店回收与玩家寄卖成交额自动推进出售任务。
- **Apocalypse Mobs**：事件刷怪通过 `apoc:spawn_requests:v1` 请求队列交给原有 `SpawnDirector`；本包不会复制怪物伤害或 AI 配置。启用本包后，怪物包自带的旧随机伏击自动停用，避免重复事件。
- **Test Guns**：枪械造成的伤害会进入击杀参与判定；MVP 维修台可以修复带耐久组件的 Test Guns 武器；制造事件可自动记录，若当前 Script API 没有该事件则可提交原版占位物。
- 任一可选 Addon 未安装时，本包仍能以原版怪物、绿宝石和原版材料回退运行。

## 每日日常

每名玩家每天固定生成四项，退出、死亡、服务器重启不会重新随机：

1. 采集任务；
2. 击杀任务；
3. 完成一次动态事件；
4. 制造、维修、出售或精英击杀中的随机任务。

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
- 坠毁运输车：防守 90 秒并清除三波敌人。

事件实体统一带 `daily_event_entity` 和实例 tag。节点完成或失败后进入独立冷却；重启时清理旧事件实体，不恢复错误的 ACTIVE 状态。

## 使用

管理员：

```mcfunction
/tag @s add admin
/scriptevent daily:admin
```

在管理菜单中放置“生存联盟委托专员”，并在野外人工建立事件节点。

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
- `!event stop`
- `!event nodes`

聊天事件不可用的服务器可使用 `/scriptevent daily:event list|start <template>|stop|nodes`。
