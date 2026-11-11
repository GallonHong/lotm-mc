# 无人机机体护甲与爆炸减免（跨包契约）

本文件记录 Test Guns 与 SAPI 共同遵守的"无人机固有护甲/防爆"契约。设计数值的唯一事实来源是 Apocalypse Life 的 `apocalypse_life_bp/scripts/drones/DroneConstants.js`。

## 数据与镜像

| 文件 | 角色 |
|---|---|
| `addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneConstants.js` | 设计源：每台无人机带 `armor`、`blastReduction` 字段 |
| `test_guns_bp/scripts/data/droneArmor.js` | 伤害端数据：实体 → 档位映射、护甲点、爆炸减免、解析函数 |
| `sapi_server_bp/scripts/vendor/baizhan_damage/data/droneArmor.js` | 与上者**逐字节相同**的镜像 |

一致性由 `addons/development/apocalypse_life_addon/tests/test_drone_armor.mjs` 强制：两包镜像字节相等、档位数值相等、12 台登录机库无人机全覆盖、非机库实体（含 `ground/lightning_strike/freeze` 等 7 种）保持 0 护甲。

## 数值

| 档位 | 护甲点 | 爆炸减免 |
|---|---:|---:|
| 普通 COMMON（蜂鸟-I、骆驼） | 10 | 45% |
| 低级 RARE（生命线、惩戒者、幽灵、神风） | 10 | 55% |
| 高级 EPIC（守护天使、毁灭者、死神、疾风） | 18 | 65% |
| 典藏 LEGENDARY（极光天灾、深渊主宰） | 25 | 75% |

## 伤害端接入点

1. **护甲**：三份 `DamageHandler.estimateArmorPoints()`（Test Guns `feature/damageHandler.js`、SAPI `vendor/baizhan_damage/feature/damageHandler.js`、SAPI `vendor/melee_damageHandler.js`）在装备扫描之前解析 `intrinsicArmorPoints(entity.typeId)`。因此枪械直击、喷火器、电弧、裂轨直击、百战直击/燃烧、近战技法全部走既有护甲公式，并按武器穿甲削减。
2. **爆炸减免**：
   - `ArmorEngine.getBlastReduction()`（两包镜像 `feature/armorEngine.js`）在装备防爆之前返回无人机固有减免。RPG / M79 / MGL / 迫击炮的爆炸引擎本来就在结算里乘以 `(1 - getBlastReduction(target))`，因此自动生效。
   - 百战溅射与裂轨爆炸走 SAPI 权威 `DamageHandler.handleHit` 路径，不吃 `getBlastReduction`，所以在 4 个溅射计算点显式乘 `(1 - intrinsicBlastReduction(target.typeId))`：
     - `test_guns feature/baizhanEngine.js`（localHit 溅射伤害）
     - `sapi_server_bp/scripts/modules/baizhan_permission.js`（权威溅射伤害）
     - `test_guns feature/railLocal.js`（本地裂轨溅射）
     - `sapi_server_bp/scripts/modules/rail_impact.js`（权威裂轨溅射）

## 范围限制

- 只覆盖**脚本伤害**。原生爆炸（苦力怕、TNT、自然灾害陨石的 `createExplosion`）与原生近战不在此机制内，本次刻意不动实体 JSON 的 `damage_sensor`。
- 百战对无人机的 ×2 机器加成仍先结算，再进入护甲与爆炸减免。
- 无人机 `entityHurt` 的耐久磨损按减免后的 `event.damage` 累计（每 30 点扣 1 耐久），因此护甲/防爆同时延长机身耐久。
- 修改本契约必须同步更新 Life 设计常量、两个镜像数据文件与 4 个溅射站点，并运行 `node addons/development/apocalypse_life_addon/tests/test_drone_armor.mjs`。
