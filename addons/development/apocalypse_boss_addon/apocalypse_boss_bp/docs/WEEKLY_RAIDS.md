# 周本 Boss 接入契约

这里只实现 Boss 实例，房间、队伍、周奖励账本、清场由调用方负责。普通手动召唤及原本的掉落表保持不变。

## 生成顺序

1. 用自定义生成事件生成实例，不要先普通生成再修改：
   - `dimension.spawnEntity("apoc_boss:sandworm<apoc_boss:weekly_spawn>", location)`
   - `dimension.spawnEntity("apoc_boss:abomination<apoc_boss:weekly_spawn>", location)`
2. 同步写 Boss 标签：`weekly:boss`、唯一的 `weekly:room:sirok` 或 `weekly:room:mogathul`、唯一的 `weekly:armor:0/10/20/40`（选其中一个数值）。
3. 写入对应 `apoc:armor:N`，移除其他旧护甲标签，再触发 `apoc_boss:weekly_room_sirok` 或 `apoc_boss:weekly_room_mogathul`。Boss 自身的轮询也会强制纠正护甲，防止普通团战的 10 护甲覆盖周本。
4. 只有已进入战斗的玩家具有 `weekly:participant` 和同一房间标签。离场/死亡结算/断线恢复时必须清理，不能使用 `pvp:participant`。同名 Boss 房间一次只允许一个实例。

跨行为包只用实体标签共享信息，不依赖另一个 BP 的动态属性。`apoc_boss:weekly_instance` 是实体 JSON 属性，用于生成事件尚未写完脚本标签时的保护。

## 实例数据

- 斯洛克：固定生命上限/初始值 20000；莫加苏尔：30000，不随难度改变。
- 护甲是精确的总护甲 `0 / 10 / 20 / 40`，不是随机上限。缺失/冲突配置暂按 0 处理。
- `weekly_no_loot` 组件组从生成时覆盖原有掉落表为空表、死亡经验为 0；原实体普通生成仍是 16000/26000 生命和原掉落/经验。
- 生成至房间事件完成前，原生伤害全部关闭。房间事件后只允许同房间 `weekly:participant` 玩家归因的伤害，拒绝其他玩家、其他房间、PvP 玩家及无归因伤害。
- 普通目标选择、受击仇恨、原生近战和随机游走从周本实例移除；周本使用有房间检查的脚本追踪/技能。延迟命中时重新检查存活、标签和维度。

## 枪械及其他伤害消费者

原生 `damage_sensor` 不能拦截脚本 `health.setCurrentValue()`。所有直接扣血消费者必须先校验攻击者是同房间参战玩家。判定失败时不扣血、不写伤害归因、不产生击杀/奖励。

- 枪械命中真正 Boss 后再检查房间和护甲，必须覆盖原点及身体命中盒路径。
- 若消费者创建代理实体，代理必须继承 `weekly:boss`、对应 `weekly:room:*` 和护甲标签，命中后解析回本体并再检查。清场应移除本体及所有代理，不留旧房间目标。
- 其他脚本的 `applyDamage` 必须设置 `damagingEntity` 为实际攻击玩家；只传抛射物本身不能绕过原生保护。
- 本包的 `minecraft:custom_hit_test` 都属于 Boss 本体，没有独立代理实体；原模型/贴图/动画文件未修改。
- 调用方如有额外尸体、经验或战利品系统，也必须排除 `weekly:boss`，奖励只能由周账本发放。

## 测试与尚需实机验证

运行 `node addons/development/apocalypse_boss_addon/tests/test_weekly_bosses.mjs`。Node 模拟覆盖生成组件、普通 Boss 回归、精确护甲、房间过滤、14 类招式及中途死亡/移除/退队/换房/换维度；它不是真正的 Bedrock 实测。

上线前仍应验证：自定义生成事件、各类枪弹的伤害归因、原版箭/三叉戟的 `damage_sensor` 中 `other` 是否归因为射手、有效队友伤害、外部玩家无法扣血、无重复掉落/经验、存档重载和连续清场。无法归因为参战玩家的投射物采用拒绝伤害的保守行为。
