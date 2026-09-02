# Apocalypse Extraction City v0.10.1

持久化摸金都市测试版。需要 Minecraft Bedrock/BDS 1.21.120+（26.45 可用）及 Beta APIs 实验玩法。v0.10.1 在每个城区全部 Structure 加载后再次修复道路十字带，只填补 Y=62～64 的空气孔洞，解决截图中贯穿城区中央的长条虚空断层；同时保留 v0.10.0 的高楼入口高度与高级物资箱修复。

## 安装与联动

- 必装：本 Add-on 中的 `Apocalypse Extraction City BP v0.10.1`、`Apocalypse Extraction Dimension Bootstrap v0.1.0` 和 RP。启用主 BP 时会声明 Bootstrap 依赖。
- 推荐联动：Daily World Events v0.7.0（提供统一物资箱和神话箱）、Apocalypse Mobs v0.4.1（提供区域强化感染者、掠夺者和 Boss）；缺少时入口仍会响应，但对应内容不会生成。
- 推荐：SAPI Server（菜单入口）、Test Gun（玩家武器）。
- Test Gun 没有被修改；枪械致盲等效果继续由原 Add-on 处理。
- 城市测试素材复制自仓库内 `RandS Overgrown Cities 1.3`。不要再同时启用原 RandS 包，避免 `jigsaw:*` 标识冲突。

## 规则

- `/scriptevent extract:menu` 打开入口菜单；`/scriptevent extract:enter` 直接随机进入；`/scriptevent extract:exit` 在撤离点启动撤离。
- `/scriptevent extract:exits` 显示距离最近的 5 个撤离点。
- 管理员使用 `/scriptevent extract:status` 查看城市、怪物与物资箱联动状态。
- 管理员进入摸金都市后可使用 `/scriptevent extract:boss` 强制生成一个 Boss，便于测试；同一时间最多存在一个。
- 管理员使用 `/scriptevent extract:rebuild` 修复承托层、扩建城区并重新布置物资箱。
- 当前服务器没有 `chatSend` 事件时，`!extract` 不可用，请使用上述 `/scriptevent` 指令或 SAPI 主菜单。
- 每次进入从主要城区中随机选择空投点，在城市上空获得 60 秒缓降；不会生成孤立石头出生台。
- 默认 12 个撤离点，现场使用 32 格高绿色玻璃信标柱、海晶灯和 9×9 绿色地面标记；进入都市时自动锁定最近撤离点。Actionbar 每 2 秒轮换显示最近撤离点与最近传说物资箱的相对方向、距离和坐标。进入 9 格范围会自动开始 10 秒撤离倒计时，离开范围则取消，重新进入可再次启动。`/scriptevent extract:exit` 仍作为手动备用入口。
- 管理员站在摸金维度内执行 `!extract point add 名称` 可增加撤离点，最多保存 32 个。
- `!extract point reset` 恢复默认撤离点。
- 快捷栏槽位 1-9、主手/副手与穿戴护甲受保险保护；普通背包槽位 10-36 在摸金维度死亡时掉落。
- 为保证选择性掉落，Add-on 会将世界规则 `keepinventory` 设为 `true`，通过实时快照在死亡地点丢出背包槽位，并在复活后再次清除 10-36 槽，防止死亡事件失效时把战利品带回安全区。

## 城市与环境

- 首次加载 v0.10.1 时会一次性生成 5×5 共 25 个城区；`city_ready:v8` 和钻石块布局哨兵写入后，每次进入只检查状态，不重复加载城市结构。
- 虚空维度按每区 8×8 的 16 格网格加载 RandS 建筑与街道。每区保留双格十字道路，非道路格混合 11 类小型建筑，并轮换 9 类大型地标。
- 每个城区加载前按 32×32×32 小块清理旧布局；全部建筑和街道加载后，在仍保持区块激活时再次填补十字道路下方两层承托及路面空气孔洞。修复只替换空气，不覆盖已有建筑和道路装饰。
- 城市 Structure 中的原版刷怪笼会按城区与建筑稳定转换为 Common/Rare/Epic 物资箱，不再全部变成普通箱，也不会留下刷怪笼。
- 每个城区道路固定补给台放置 2 个 Common、1 个 Rare、1 个 Epic；五个对角城区额外各有 1 个 Legendary，中央城区另有 1 个 Mythic。补给台地面颜色与品质对应，奖励、补给卡校验和恢复时间由 Daily Events 的 `LootCrateManager` 管理。
- 摸金维度会移除自然生成的原版敌对怪，只直接生成 Apocalypse Mobs 中的高难感染者、远程感染者、重型感染者和持枪掠夺者。
- 进入都市的玩家会获得暖灰色黄昏雾效。Bedrock 的时间是世界级而非维度级，因此本版不强制修改全服时间，避免摸金都市玩家把主世界也锁在黄昏。

## 后期配置

城区间距、入口、撤离点、刷新上限、Boss 概率与怪物权重集中在 `extraction_bp/scripts/config.js`。都市传说 Boss（雾中人、羊人、警笛头）拥有更高权重，但全维度同时最多生成一个摸金 Boss。

## 26.x 自定义维度说明

- 必须在世界设置中打开 **Beta APIs**，然后彻底退出世界再重新进入。
- `Apocalypse Extraction Dimension Bootstrap` 使用官方 `DimensionRegistry.registerCustomDimension` 注册虚空维度；稳定核心通过原版 `/place structure` 和 `/tickingarea` 命令建设城区。
- 请删除旧的 v0.1.x 行为包/资源包后重新导入，避免 Minecraft 继续读取缓存的旧维度 JSON。

从旧版更新后第一次进入会自动执行一次 v0.10.1 中央断层、地标高度与补给台升级，预计需要 3～6 分钟；完成后不再重建。若旧世界没有自动升级，管理员执行一次 `/scriptevent extract:rebuild`。升级期间不要重复点击入口或重复执行重建。

本版的自定义维度和 RandS Jigsaw 组合属于测试功能；首次上线请用新世界或完整备份验证。
