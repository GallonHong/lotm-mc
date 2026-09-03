# Apocalypse Mobs Addon

独立的 Minecraft Bedrock 主世界末日生存怪物与刷怪系统。v0.6.1 保留 v0.6.0 的荒原持枪掠夺者与避难所驻守护卫，并为 World Events 主城叛军入侵增加严格的安全区例外：只有同时带有 `daily_event_entity` 和 `daily_allow_safe_zone` 的事件敌人可以暂时留在安全区，事件结束后由 World Events 清理；其他自然生成或普通事件敌人仍会被安全区守卫删除。

摸金都市可低概率生成召唤母体，并按冷却随机触发三波尸潮。护甲优先复用原版物品；启用 Test Guns 时还会随机使用其轻型/重型背心、战术头盔与泰坦胸甲。本包没有修改 Test Guns 文件。

## 已实现

- `ZoneRegistry`：安全区、法制区、非法制区；自动读取 SAPI Server 的管理保护区。
- `SpawnDirector`：按玩家、区域、权重和人口上限进行脚本刷怪。
- 主城保险：安全区禁止生成并周期清除敌对生物，只允许 World Events 明确标记的主城入侵单位临时存在。
- 内置安全区 1：`x=2349..2635, y=-64..320, z=1863..2069`；例如 `2438.82, 17, 2024.33` 会被判定为安全区。
- 感染者：普通（20 HP）、疾行（30 HP）、变异（100 HP）、重型（200 HP）、毒液远程（50 HP）。
- 感染者外观：普通与疾行感染者完整随机使用 8 套 Deadzone 风格外观；特殊感染者保留其标志性贴图，同时混入区域幸存者/感染者外观变体。
- 可见护甲：标准人形骨骼 + `enable_attachables`；原版头盔、胸甲、护腿、靴子和已安装的 Test Guns 战术护甲均可随实体动作正确挂载。
- 掠夺者步枪手（70 HP）：瞄准、4 发短点射、弹匣、换弹、距离衰减精度、掩体视线检测。
- 荒原持枪掠夺者：仅在非法制区参与自然刷怪，使用 Test Guns 武器和真实弹道伤害。
- 避难所驻守护卫（150 HP）：通过刷怪蛋定点布防，记住驻守位置并主动攻击感染者与叛军。
- Test Guns 联动：掠夺者会在主手装备并显示 `test_gun:ak47`；`test_gun:flash_shield` 的致盲/黑暗/高等级减速会立即中断毒液怪和步枪手的瞄准与射击；NPC 伤害会进入玩家盾牌减伤事件。
- LootNode：管理员人工登记补给箱，支持刷新冷却。
- 动态事件：野外感染者伏击，完成后向参战玩家发放金币或物资。
- 原版敌对生物抑制开关，避免自然怪物绕过 SpawnDirector。

## 安装

导入根目录生成的 `Apocalypse_Mobs_Addon.mcaddon`，为世界同时启用行为包与资源包。脚本 API 使用稳定版 `@minecraft/server 1.19.0`。

SAPI Server 是可选包。持枪掠夺者现在依赖 Test Guns 2D v3.9.0，导入怪物 Addon 时应同时启用 Test Guns 的行为包和资源包；本次修复没有修改 Test Guns 文件。

## 管理

管理员指拥有 `admin` 标签或 OP 权限的玩家。

- `/scriptevent apoc:menu`：打开管理菜单。
- `/scriptevent apoc:spawn basic|runner|mutant|heavy|spitter|raider`：在身前生成测试敌人。
- `/scriptevent apoc:event`：在当前位置附近触发动态伏击。
- 聊天输入 `!apoc` 也可打开菜单。

区域菜单使用“记录点 A / 点 B → 创建区域”。区域优先级为：本 Addon 区域 → SAPI 管理保护区 → 世界出生点默认安全半径 → 法制区。

SAPI 管理保护区默认视为安全区；若其 flags 显式包含 `allowHostileSpawn: true`，则允许 SpawnDirector 刷怪。

## 素材来源

感染者与掠夺者贴图复用本仓库 `V1.6.6-1DeadZone` 中的素材，并复制进本 Addon 自身资源包，因此运行时不依赖 DeadZone。
