# Add-on 目录说明

## development：当前开发项目

| 目录 | 用途 |
|---|---|
| `apocalypse_boss_addon` | Apocalypse Boss 实体与掉落 |
| `apocalypse_extraction_addon` | 摸金都市生成、撤离点与城市副本 |
| `apocalypse_mobs_addon` | 末日怪物、刷怪导演与掉落 |
| `apocalypse_story_addon` | 主世界剧情 / 副本新手教程 MVP |
| `apocalypse_ui_addon` | 可选 UI 资源包 |
| `apocalypse_vehicles_addon` | Apocalypse 载具 |
| `daily_world_events_addon` | 日常委托、世界事件、副本与物资箱 |
| `lotm_pathways_addon` | LOTM 途径系统及资源 |
| `natural_disasters_standalone_addon` | 独立自然灾害包 |
| `sapi_server_addon` | 经济、商店、社交、领地与服务器管理 |
| `test_guns_2d_addon` | Test Guns 武器、护甲与战斗脚本 |

这些目录是发布源。相互联动的项目保持为同级目录，测试可以使用相对路径验证公共契约，但运行时 Add-on 仍通过动态属性和 `scriptevent` 通讯。

## reference：参考素材

| 目录 | 定位 |
|---|---|
| `V1.6.6-1DeadZone` | Deadzone 原始模型、护甲、贴图与音效来源 |
| `Natural Disasters Survival Challenge` | 自然灾害原始实现参考 |
| `RandS Overgrown Cities 1.3`、`Ranzie Rise and Survive 1.2` | 城市生成参考 |
| `Random plantsnblocks` | 植被、方块和 vendmach 自动贩卖机素材 |
| `Vehicles Add-On` | 载具与方块式贩卖机参考 |
| `Old DLC`、`OldAssGunA`、`ACE战斗装备1.0测试` | 旧枪械与战斗装备素材 |
| `apex_boss_addon`、`apex_firearms_addon`、`survival_firearms_addon` | 已被当前 Apocalypse / Test Guns 路线取代的原型工程 |

参考目录保持原文件结构，不直接修改第三方原件。需要使用的资源应复制到对应开发 Add-on 内，使发布包不依赖参考目录。

## Test Guns 护甲来源

`test_guns_2d_addon/tools/import_deadzone_wearables.mjs` 记录 Test Guns 与 Deadzone 原始护甲的逐件映射，并把 32 件护甲/服装穿戴所需的 attachable、geometry 和实体贴图复制到 Test Guns 自己的资源包。喷气背包继续使用 Test Guns 的专用模型。导入后的发布包无需安装 Deadzone。

重新导入后运行：

```bash
cd addons/development/test_guns_2d_addon
node tools/import_deadzone_wearables.mjs
node tests/validate_test_guns.mjs
bash build.sh
```
