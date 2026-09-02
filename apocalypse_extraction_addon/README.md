# Apocalypse Extraction City v0.3.0

持久化摸金都市测试版。需要 Minecraft Bedrock/BDS 1.21.120+（26.45 可用）、Beta APIs 实验玩法、`Survival Daily & World Events v0.6.1` 和 `Apocalypse Mobs v0.3.4`。

## 安装与联动

- 必装：本 Add-on、Daily World Events v0.6.1（提供统一物资箱）、Apocalypse Mobs v0.3.4（提供感染者、掠夺者和 Boss）。
- 推荐：SAPI Server（菜单入口）、Test Gun（玩家武器）。
- Test Gun 没有被修改；枪械致盲等效果继续由原 Add-on 处理。
- 城市测试素材复制自仓库内 `RandS Overgrown Cities 1.3`。不要再同时启用原 RandS 包，避免 `jigsaw:*` 标识冲突。

## 规则

- `/scriptevent extract:menu` 打开入口菜单；`/scriptevent extract:enter` 直接随机进入；`/scriptevent extract:exit` 在撤离点启动撤离。
- `/scriptevent extract:exits` 显示距离最近的 5 个撤离点。
- 管理员使用 `/scriptevent extract:status` 查看城市、怪物与物资箱联动状态。
- 管理员使用 `/scriptevent extract:rebuild` 修复承托层、扩建城区并重新布置物资箱。
- 当前服务器没有 `chatSend` 事件时，`!extract` 不可用，请使用上述 `/scriptevent` 指令或 SAPI 主菜单。
- 每次进入从 9 个城区中随机选点，并在半径 20 格内寻找经过验证的可站立地面；不会再生成孤立石头出生台。
- 默认 12 个撤离点，现场用绿色信标柱标记；到达 9 格内后执行 `/scriptevent extract:exit`，留在范围内 10 秒即可撤离。
- 管理员站在摸金维度内执行 `!extract point add 名称` 可增加撤离点，最多保存 32 个。
- `!extract point reset` 恢复默认撤离点。
- 快捷栏槽位 1-9、主手/副手与穿戴护甲受保险保护；普通背包槽位 10-36 在摸金维度死亡时掉落。
- 为保证选择性掉落，Add-on 会将世界规则 `keepinventory` 设为 `true`，通过实时快照在死亡地点丢出背包槽位，并在复活后再次清除 10-36 槽，防止死亡事件失效时把战利品带回安全区。

## 城市与环境

- 首次加载 v0.3.0 时，会从原来的单个城区扩为 3×3 九个城区，整体范围约 768×768。
- 虚空维度的城区底部会铺设连续承托层，修复建筑之间的大型虚空缺口。
- 9 个城区共放置最多 37 个 Common/Rare/Epic/Legendary 可刷新物资箱，奖励和恢复时间继续由 Daily Events 的 `LootCrateManager` 管理。
- 摸金维度会移除自然生成的原版敌对怪，只直接生成 Apocalypse Mobs 中的高难感染者、远程感染者、重型感染者和持枪掠夺者。
- 进入都市的玩家会获得暖灰色黄昏雾效。Bedrock 的时间是世界级而非维度级，因此本版不强制修改全服时间，避免摸金都市玩家把主世界也锁在黄昏。

## 后期配置

城区间距、入口、撤离点、刷新上限、Boss 概率与怪物权重集中在 `extraction_bp/scripts/config.js`。都市传说 Boss（雾中人、羊人、警笛头）拥有更高权重，但全维度同时最多生成一个摸金 Boss。

## 26.x 自定义维度说明

- 必须在世界设置中打开 **Beta APIs**，然后彻底退出世界再重新进入。
- v0.2.0 起改为官方 `DimensionRegistry.registerCustomDimension` 接口，不再使用会产生 Schema 错误的 `dimensions/*.json`。
- 自定义维度当前由官方接口创建为虚空维度；本 Add-on 首次进入时通过 `StructureManager` 放置 RandS Jigsaw 城市。
- 请删除旧的 v0.1.x 行为包/资源包后重新导入，避免 Minecraft 继续读取缓存的旧维度 JSON。

从旧版更新后第一次进入会自动执行 v0.3.0 扩建。若旧世界仍显示原来的孤立城区，管理员执行一次 `/scriptevent extract:rebuild`。

本版的自定义维度和 RandS Jigsaw 组合属于测试功能；首次上线请用新世界或完整备份验证。
