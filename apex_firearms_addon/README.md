# Apex Firearms Demo: Tactical AK-47 (7.62×39mm)

专为单人能力测评打造的高品质单武器示范模组。融合 **OldAssGunA** 与 **ACE（Akiohh's Combat Equipment）** 的核心优势，结合现代 Bedrock Script API（1.21.50+），实现全自动射频时钟、真实穿甲减伤、无敌帧穿透、动态视口后坐力与空间立体声效。

---

## 核心特性与技术亮点

1. **射击与连发控制**
   - 严格 **600 RPM**（10 发/秒，2.0 ticks/发）时钟调度。
   - PC 右键长按 / 手机长按全自动连发，松开瞬间立即平滑停火。
   - 弹匣容量 30 发，空仓触发真实击空音效。

2. **高阶战斗伤害结算（吸收 ACE 精髓）**
   - **无敌帧穿透（`EntityDamageCause.override`）**：全自动扫射时每一发子弹都能连续产生有效伤害，不受原版 10-tick 无敌帧阻挡。
   - **真实击杀归属**：致命一击记录 `damagingEntity: player`，保留击杀统计、经验球掉落与死亡信息。
   - **头部暴击**：命中头部造成 **2.0×（44 HP）** 暴击伤害。
   - **35% 护甲穿透**：根据目标护甲值动态计算衰减（0 护甲 22 HP、10 护甲 17 HP、20 护甲 12 HP）。
   - **方向性击退**：按玩家射击视线对目标产生物理冲量。

3. **视听与物理环境交互（吸收 OldAssGunA & ACE 精髓）**
   - **动态视口后坐力（Camera Shake）**：站立开火施加镜头震颤，潜行瞄准（ADS）自动削减 50% 后坐力。
   - **环境破坏**：子弹可直接击碎玻璃（`glass` / `glass_pane`）与树叶，硬方块产生撞击火花与烟尘。
   - **空间立体声**：近距离枪声 + 远距离开火回声 + 命中肉体/金属音效 + 换弹音效。
   - **实时 HUD 状态**：
     - 弹药状态：`§e[AK-47] [||||||||||] 30/128 §7(7.62mm)`
     - 命中回执：`§a🎯 命中 僵尸 (24m) §c💥 头部暴击! -44 HP`

---

## 游戏内快捷指令

| 聊天框指令 | 脚本事件指令 | 功能说明 |
|---|---|---|
| `!gunkit` 或 `!kit` | `/scriptevent apex:gunkit` | 领取 1 把满弹 AK-47 与 4 组 7.62mm 弹药 |
| `!r` 或 `!reload` | `/scriptevent apex:reload` | 快速为手持武器换弹（扣除背包备弹） |
| `!dummy` | `/scriptevent apex:dummy` | 在身旁生成 5000 HP 自动化评测假人 |
| `!test` 或 `!guntest` | `/scriptevent apex:test` | 运行射速、无敌帧穿透与伤害测试套件 |
| `!help` | `/scriptevent apex:help` | 显示指令说明与操作指南 |

---

## 原版工作台合成配方

1. **战术 AK-47 突击步枪**：
   - 形状（3×3）：
     - 第 1 行：空、空、铁锭
     - 第 2 行：铁锭、红石粉、木板
     - 第 3 行：空、木板、空
   - 产出：1 把全新满弹 AK-47。

2. **7.62×39mm 步枪弹药盒 ×8**：
   - 无序合成：1 铁粒 + 1 铜锭 + 1 火药 -> 8 盒 7.62mm 弹药。

---

## 测试验证与构建

- 运行离线数学与 JSON 校验：
  ```bash
  node apex_firearms_addon/tests/test_math.mjs
  ```
- 重新打包：
  ```powershell
  .\apex_firearms_addon\build_apex.ps1
  ```
- 打包产物：
  - `Apex_AK47_v1.0.0.mcaddon`
  - `Apex_AK47_BP.mcpack`
  - `Apex_AK47_RP.mcpack`
