# Apocalypse Story Test Addon

独立的主线任务 MVP。它不修改 SAPI 菜单，通过事件驱动把主世界集结点连接到 Daily World Events 中已有的“曙光谷·第一次撤离”新手教程副本。

## 安装

同时启用：

- `Apocalypse_Story_Test_Addon.mcaddon`
- `Survival_Daily_Events_Addon.mcaddon` v0.16.2 或更新版本
- 新手教程原本依赖的 Test Gun、Apocalypse Mobs、载具/自然灾害包按服务器配置启用

## 玩家指令

```text
/scriptevent story:menu
/scriptevent story:start
/scriptevent story:status
/scriptevent story:reset
```

`story:reset` 只重置剧情状态，不会重置新手副本的一次性奖励记录。

## 管理员设置集结点

站在新的集结点输入：

```text
/scriptevent story:set_entry here
```

也可以直接修改 `story_bp/scripts/config.js` 中的 `entry`。运行时设置优先于文件默认坐标，并保存在世界 Dynamic Property 中。

## 流程

```text
接听广播 → 前往主世界集结点 → 进入曙光谷新手副本 → 成功撤离 → 完成测试主线
```

剧情菜单不占用 Action Bar；任务只在状态变化、手动查询和低频提醒时发送聊天消息。
