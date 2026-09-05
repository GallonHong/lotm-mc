# Apocalypse Extraction City v0.10.8

持久化摸金都市测试版。需要 Minecraft Bedrock/BDS 1.21.120+（26.45 可用）及 Beta APIs 实验玩法。v0.10.8 将撤离点从12个增加到20个，外围坐标向城区内缩，使用可验证的7×7固定标记，并增加灵动视效兼容的绿色全亮粒子；旧版突出平台会在进入城市时迁移一次。v0.10.7 为资源包声明 `capabilities: ["pbr"]`。

## 安装与联动

- 必装：本 Add-on 中的 `Apocalypse Extraction City BP v0.10.8`、`Apocalypse Extraction Dimension Bootstrap v0.1.0` 和 RP。主 BP 继续只强制依赖维度 Bootstrap；缺少 RP 时仍可运行，并回退显示原版粒子。
- 推荐联动：Daily World Events v0.11.0（提供统一物资箱、神话箱和每日新闻）、Apocalypse Mobs v0.6.1（提供区域强化感染者、持枪掠夺者、避难所守卫、Boss 与主城入侵安全区例外）；缺少时入口仍会响应，但对应内容不会生成。
- 推荐：SAPI Server（菜单入口）、Test Gun（玩家武器）。
- Test Guns 保持原样，并独占 action bar 显示弹药、换弹与技能信息；City 不再写入该区域。
- 城市测试素材复制自仓库内 `RandS Overgrown Cities 1.3`。不要再同时启用原 RandS 包，避免 `jigsaw:*` 标识冲突。

## 规则

- `/scriptevent extract:menu` 打开入口菜单；`/scriptevent extract:enter` 直接随机进入；`/scriptevent extract:exit` 在撤离点启动撤离。
- `/scriptevent extract:exits` 显示距离最近的 5 个撤离点。
- 管理员使用 `/scriptevent extract:status` 查看城市、怪物与物资箱联动状态。
- 管理员进入摸金都市后可使用 `/scriptevent extract:boss` 强制生成一个 Boss，便于测试；同一时间最多存在一个。
- 管理员使用 `/scriptevent extract:rebuild` 修复承托层、扩建城区并重新布置物资箱。
- 当前服务器没有 `chatSend` 事件时，`!extract` 不可用，请使用上述 `/scriptevent` 指令或 SAPI 主菜单。
- 每次进入从主要城区中随机选择空投点，在城市上空获得 60 秒缓降；不会生成孤立石头出生台。
- 默认20个撤离点，包括12个外围出口和8个城区内部出口。每处使用7×7黑绿警戒地面、四角照明、中央信标与绿色全亮粒子；粒子只在玩家96格内刷新。进入都市时自动锁定最近撤离点，之后每60秒在左上角聊天汇总最近撤离点与高价值箱方向。进入9格范围会自动开始10秒撤离倒计时，离开范围则取消。`/scriptevent extract:exit` 仍作为手动备用入口。
- 管理员站在摸金维度内执行 `!extract point add 名称` 可增加撤离点，最多保存 32 个。
- `!extract point reset` 恢复默认撤离点。
- 快捷栏槽位 1-9、主手/副手与穿戴护甲受保险保护；普通背包槽位 10-36 在摸金维度死亡时掉落。
- 为保证选择性掉落，Add-on 会将世界规则 `keepinventory` 设为 `true`，通过实时快照在死亡地点丢出背包槽位，并在复活后再次清除 10-36 槽，防止死亡事件失效时把战利品带回安全区。

## 城市与环境

- 首次加载 v0.10.2 或更高版本时会一次性生成 5×5 共 25 个城区；布局版本和钻石块哨兵必须同时有效才会复用已有城市，避免只剩一个哨兵时错误跳过修复。
- 虚空维度按每区 8×8 的 16 格网格加载 RandS 建筑与街道。每区保留双格十字道路，非道路格混合 11 类小型建筑，并轮换 9 类大型地标。
- 每个城区加载前按 32×32×32 小块清理旧布局；全部建筑和街道加载后，在仍保持区块激活时再次填补十字道路下方四层承托，并逐格检查路面空气孔洞。路面修复只替换空气，不覆盖已有建筑和道路装饰。
- 城市 Structure 中的每个原版刷怪笼和每个道路补给台都会先独立抽取 Common/Rare/Epic/Legendary/Mythic；默认概率为普通 60%、精良 25%、Epic 10%、传说 4%、神话 1%。若同一栋多箱房恰好全部抽中同一品质，会对其中一个箱位做品质校正，保证至少混合两种品质，也不会留下刷怪笼。
- Epic、传说和神话箱没有全城数量上限，也不再限定到指定城区；实际数量完全由所有箱位的独立概率决定。补给台地面颜色与品质对应，奖励、补给卡校验和恢复时间由 Daily Events 的 `LootCrateManager` 管理。
- 摸金维度会移除自然生成的原版敌对怪，只直接生成 Apocalypse Mobs 中的高难感染者、远程感染者、重型感染者和持枪掠夺者。
- 进入都市的玩家会获得暖灰色黄昏雾效。Bedrock 的时间是世界级而非维度级，因此本版不强制修改全服时间，避免摸金都市玩家把主世界也锁在黄昏。

## 后期配置

城区间距、入口、撤离点、刷新上限、Boss 概率与怪物权重集中在 `extraction_bp/scripts/config.js`。都市传说 Boss（雾中人、羊人、警笛头）拥有更高权重，但全维度同时最多生成一个摸金 Boss。

## 26.x 自定义维度说明

- 必须在世界设置中打开 **Beta APIs**，然后彻底退出世界再重新进入。
- `Apocalypse Extraction Dimension Bootstrap` 使用官方 `DimensionRegistry.registerCustomDimension` 注册虚空维度；稳定核心通过原版 `/structure load` 和 `/tickingarea` 命令建设城区。
- 请删除旧的 v0.1.x 行为包/资源包后重新导入，避免 Minecraft 继续读取缓存的旧维度 JSON。

从 v0.10.7 更新到 v0.10.8 后，第一次进入不会重建25个城区；系统会撤除位于 `±352` 的12个旧岗亭和信号柱、保留承托层并恢复普通地面，然后在固定安全坐标生成20个新撤离标记。管理员添加的自定义撤离点会与默认点合并保留。该迁移只运行一次，若旧世界没有自动升级，管理员执行一次 `/scriptevent extract:rebuild`。

本版的自定义维度和 RandS Jigsaw 组合属于测试功能；首次上线请用新世界或完整备份验证。
