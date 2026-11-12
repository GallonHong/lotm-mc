# Drone combat buff (damage / crit rate)

跨包契约：**Apocalypse Life**（生产者）→ **Test Guns / SAPI**（消费者）。
三个包内的 `droneCombatBuff.js` 必须保持**字节一致**，由
`apocalypse_life_addon/tests/test_drone_combat_buff.mjs` 校验。

> 设计背景：辅助无人机技能文案长期写着"提高伤害与暴击率"，但此前只下发了原版
> 药水效果（吸收心/速度/力量），暴击率与枪械伤害实际从未生效。本契约把它补齐。

## 1. 传输方式：player tag

实体 tag 跨 behavior pack 可见，dynamic property 按包隔离，因此增益走 tag：

```
ab_dr:dmg:<percent>:<token>    出手伤害 +percent%（整数 1..100）
ab_dr:crit:<percent>:<token>   暴击率 +percent 个百分点（整数 1..100）
```

- `<token>` 由生产者在施加时生成（`system.currentTick`），保证到期只移除**自己那一次**的增益。
- 增益期间重复施加不会叠加：消费者取同类**最高值**。
- 到期由生产者 `system.runTimeout` 精确移除；世界重载时生产者会清掉所有残留 tag。

## 2. 设计值（`DroneConstants.js` 的 `skills[].combatBuff`）

| 无人机 | 技能 | 伤害 | 暴击率 | 持续 | 触发 |
|---|---|---|---|---|---|
| 「守护天使」医疗机 `guardian` | `adrenaline_shot` 肾上腺素超频注入 | +20% | — | 8s | 交火 |
| 「疾风」战术增幅机 `gale` | `gale_buff` 战术战意注入 | +20% | +20pp | 8s | 交火 |
| 「深渊主宰」典藏矩阵 `abyssal` | `abyssal_matrix` 终极超频矩阵 | +35% | +35pp | 10s | 交火 |

保留原有原版效果（吸收心/速度/抗性/力量），并额外下发上面的伤害/暴击率增益。

## 3. 消费者规则

- 只对 `minecraft:player` 生效；无效/格式错误/超过 100 的 tag 一律忽略。
- 暴击率：加到 `critRate` 后仍按原有规则 clamp 到 100%，**不改变暴击伤害倍率**。
- 伤害：加到 `dmgMultiplier`（与装备增伤同一乘区，相加后再乘伤害）。

接入点（三处，均在暴击 clamp 之前）：

- Test Guns `scripts/feature/damageHandler.js` → `DamageHandler.handleHit`（所有枪械/爆炸/近战/火焰/轨道炮路径汇总处）
- SAPI `scripts/vendor/baizhan_damage/feature/damageHandler.js`（镜像副本）
- SAPI `scripts/vendor/melee_damageHandler.js`（SAPI 权威近战）

**PvP / 周本生效**：伤害公式本身不区分 PvE/PvP，增益随玩家生效；交火触发条件在 PvP 对局与周常团本中放宽为 ≥1 个敌对目标（其他 PvE 仍为 ≥2）。

## 4. 测试

```bash
node addons/development/apocalypse_life_addon/tests/test_drone_combat_buff.mjs
```

校验：三份契约文件字节一致、tag 解析（合法/畸形/超大/不叠加）、三个技能设计值、
生产端写入与清理逻辑、三个伤害处理器的接入位置、三份文档一致。
