# Apocalypse Extraction City v0.2.0

持久化摸金都市测试版。需要 Minecraft Bedrock/BDS 1.21.120+（26.45 可用）、Beta APIs 实验玩法，以及 `Survival Daily & World Events v0.6.0`。

## 安装与联动

- 必装：本 Add-on、Daily World Events v0.6.0（提供统一物资箱）。
- 推荐：Apocalypse Mobs/Boss（提供高难怪物和 Boss）、SAPI Server（菜单入口）、Test Gun（玩家武器）。
- Test Gun 没有被修改；枪械致盲等效果继续由原 Add-on 处理。
- 城市测试素材复制自仓库内 `RandS Overgrown Cities 1.3`。不要再同时启用原 RandS 包，避免 `jigsaw:*` 标识冲突。

## 规则

- `/scriptevent extract:menu` 打开入口菜单；`/scriptevent extract:enter` 直接随机进入；`/scriptevent extract:exit` 在撤离点启动撤离。
- 当前服务器没有 `chatSend` 事件时，`!extract` 不可用，请使用上述 `/scriptevent` 指令或 SAPI 主菜单。
- 每次进入从 8 组区域中随机选点，并在半径 20 格内随机落点。
- 默认 8 个撤离点；到达 9 格内后启动 10 秒撤离。
- 管理员站在摸金维度内执行 `!extract point add 名称` 可增加撤离点，最多保存 32 个。
- `!extract point reset` 恢复默认撤离点。
- 快捷栏槽位 1-9、主手/副手与穿戴护甲受保险保护；普通背包槽位 10-36 在摸金维度死亡时掉落。
- 为保证选择性掉落，Add-on 会将世界规则 `keepinventory` 设为 `true`，然后仅手动丢出背包槽位。

## 后期配置

入口、撤离点、刷新上限、Boss 概率与怪物权重集中在 `extraction_bp/scripts/config.js`。都市传说 Boss（雾中人、羊人、警笛头）拥有更高权重，但全维度同时最多生成一个摸金 Boss。

## 26.x 自定义维度说明

- 必须在世界设置中打开 **Beta APIs**，然后彻底退出世界再重新进入。
- v0.2.0 改为官方 `DimensionRegistry.registerCustomDimension` 接口，不再使用会产生 Schema 错误的 `dimensions/*.json`。
- 自定义维度当前由官方接口创建为虚空维度；本 Add-on 首次进入时通过 `StructureManager` 放置 RandS Jigsaw 城市。
- 请删除旧的 v0.1.x 行为包/资源包后重新导入，避免 Minecraft 继续读取缓存的旧维度 JSON。

本版的自定义维度和 RandS Jigsaw 组合属于测试功能；首次上线请用新世界或完整备份验证。
