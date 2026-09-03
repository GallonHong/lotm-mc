# SAPI Server Addon

独立的 Minecraft Bedrock 服务器基础系统，源码、测试、构建脚本和安装包全部位于本目录，不再与 LOTM Pathways 源码混放。v2.10.0 在主菜单增加一级“社交”入口：好友与申请、在线玩家资料卡、私聊、好友领地观光、四人临时队伍和持久化公会。队伍由队长发起副本 Ready，公会创建费默认 15,000 金币、上限 30 人；公会基地只是传送点，不会自动创建领地。v2.9.4 的十分钟全维度掉落物清理和 v2.9.3 的可站立保险箱修复继续保留。

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

主要配置位于 `sapi_server_bp/scripts/config.js`；奖池位于 `scripts/data/lotteryPools.js`；商店与回收价位于 `scripts/data/merchantConfig.js`；社交持久化位于 `scripts/data/socialStore.js`，菜单和关系逻辑位于 `scripts/modules/social.js`。SAPI Server 可独立安装，也可通过动态属性和 `scriptevent` 与 LOTM Pathways、Apocalypse Mobs、Daily & World Events 联动。

## 社交 MVP

- 好友和公会写入世界动态属性，玩家离线和服务器重启后仍保留；好友上限 50。
- 队伍仅存在于服务器本次运行内，最多 4 人，重启自动解散；队伍邀请、聊天、移交队长和移除成员全部从社交菜单进入。
- 玩家资料卡只公开名称、公会、称号、在线/所在状态和通缉状态，不公开坐标、金币、背包和装备。
- 好友观光必须由领地主人在地皮菜单设置访客点。邀请只执行传送，不把访客加入领地成员，也不授予破坏、放置、容器、保险箱或载具权限。
- 公会只有 `Leader` 和 `Member` 两级；Leader 可处理申请、邀请/移除成员、移交会长、编辑简介和设置基地。
- SAPI 单独安装时社交、好友、队伍和公会照常使用；只有“全队副本 Ready”需要启用 Daily & World Events v0.16.0。
