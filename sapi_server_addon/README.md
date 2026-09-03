# SAPI Server Addon

独立的 Minecraft Bedrock 服务器基础系统，源码、测试、构建脚本和安装包全部位于本目录，不再与 LOTM Pathways 源码混放。v2.9.0 新增加固密码保险箱：只能在游戏商城购买，提供 27 格真实物品存储、4～8 位数字密码、2000 耐久、普通近战/枪械 90% 伤害减免和特殊枪械完整伤害；报废后密码永久失效且不能回收，未报废的空保险箱可由拥有者回收并在下次放置时恢复满耐久。杂货商仍提供二级物资分类。经济采用单一金币；Epic 池 20 抽保底，Legendary 池 30 抽保底。

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
