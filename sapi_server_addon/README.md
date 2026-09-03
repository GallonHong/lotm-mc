# SAPI Server Addon

独立的 Minecraft Bedrock 服务器基础系统，源码、测试、构建脚本和安装包全部位于本目录，不再与 LOTM Pathways 源码混放。v2.8.0 收敛为单一金币经济，新增四类统一配置商店、高级军备箱与当期限定军备箱。Epic 池单抽 1,200、20 抽保底（总保底 24,000）；Legendary 池单抽 2,000、30 抽保底（总保底 60,000），第一期为 HK MP7，管理员可切换当前 UP 蓝图。抽奖使用聊天、粒子与声音分阶段揭晓，不占用 Action Bar。可选 Apocalypse Survival UI 未安装时，完整原版 ActionForm 菜单仍可正常工作。

## 目录

- `sapi_server_bp/`：可直接作为开发行为包使用的完整源码；
- `tests/validate_server.mjs`：菜单、抽奖、传送、签到、兑换码和版本验证；
- `build.sh`：独立构建入口；
- `SAPI_Server_BP.mcpack`：行为包；
- `SAPI_Server_Addon.mcaddon`：推荐导入的安装包。

## 构建与验证

```bash
node sapi_server_addon/tests/validate_server.mjs
bash sapi_server_addon/build.sh
```

主要配置位于 `sapi_server_bp/scripts/config.js`；奖池位于 `scripts/data/lotteryPools.js`；商店与回收价位于 `scripts/data/merchantConfig.js`。SAPI Server 可独立安装，也可通过动态属性和 `scriptevent` 与 LOTM Pathways、Apocalypse Mobs、Daily & World Events 联动。
