# SAPI Server Addon

独立的 Minecraft Bedrock 服务器基础系统，源码、测试、构建脚本和安装包全部位于本目录，不再与 LOTM Pathways 源码混放。v2.6.5 将自然灾害管理员页面收敛为手动指定灾害/维度/X/Y/Z 与停止事件；自动开关、间隔、权重、安全区和地形破坏等高级参数统一由 Natural Disasters Server Events v2.2.0 的 `scripts/config.js` 管理，避免跨 Add-on 配置覆盖导致灾害失效。

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
