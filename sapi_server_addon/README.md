# SAPI Server Addon

独立的 Minecraft Bedrock 服务器基础系统，源码、测试、构建脚本和安装包全部位于本目录，不再与 LOTM Pathways 源码混放。v2.6.3 为摸金都市和自然灾害加入 `scriptevent` + 玩家动态属性双通道请求：目标脚本收到请求后必须回执，并能区分“维度已注册但核心脚本异常”和“行为脚本根本未启动”。v2.6.2 及既有服务器功能保持不变。

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

主要配置位于 `sapi_server_bp/scripts/config.js`。SAPI Server 可独立安装，也可通过动态属性和 `scriptevent` 与 LOTM Pathways、Apocalypse Mobs、Daily & World Events 联动。
