# Apocalypse Mobs Addon

独立的 Minecraft Bedrock 主世界末日生存怪物与刷怪系统。v0.2.3 将内置安全区/法制区坐标正式打入安装包，并确保安全区内的脚本怪物与原版敌对生物会被周期清除。

## 已实现

- `ZoneRegistry`：安全区、法制区、非法制区；自动读取 SAPI Server 的管理保护区。
- `SpawnDirector`：按玩家、区域、权重和人口上限进行脚本刷怪。
- 主城保险：安全区禁止生成并周期清除敌对生物。
- 内置安全区 1：`x=2349..2635, y=-64..320, z=1863..2069`；例如 `2438.82, 17, 2024.33` 会被判定为安全区。
- 感染者：普通（20 HP）、疾行（30 HP）、变异（100 HP）、重型（200 HP）、毒液远程（50 HP）。
- 掠夺者步枪手（50 HP）：瞄准、4 发短点射、弹匣、换弹、距离衰减精度、掩体视线检测。
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
