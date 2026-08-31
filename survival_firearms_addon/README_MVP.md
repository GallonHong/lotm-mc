# Survival Firearms MVP 1.3.7

本目录严格实现仓库根目录 `1.md` 定义的四枪 MVP，不包含经济、诡秘途径或其他扩展系统。

## 架构

- `GunRegistry`：仅注册 M1911、AKM、M870、MP5 与对应图纸。
- `AmmoRegistry` / `AmmoManager`：四种弹药注册、服务端弹匣状态、备弹统计与完成点扣弹。
- `FireScheduler`：20 TPS 小数累加器，最高 1200 RPM；松开使用键停止全自动射击。
- `GunController`：服务端权威输入校验，并按 SHOT → HIT → DAMAGE 调用。
- `HitResolver`：服务端视线、散布、方块遮挡和实体 Raycast。
- `FirearmDamageResolver`：距离、头/身、护甲、PvE/PvP 结算；直接修改生命值绕过枪械受伤间隔。
- `ReloadManager`：换弹完成点扣备弹；切槽、换枪、丢枪、死亡、跨维度取消。
- `recipes/blueprint_*.json`：四种图纸的原版工作台九宫格配方。
- `InventoryTransaction`：武器制造快照回滚；成功制造出的枪为满耐久、空弹匣。
- `GunAnimationProfiles`：核心逻辑只引用 equip/idle/fire/ads/sprint/reload/swim 语义状态。

## 操作

- M1911/M870 点击右键发射一发；AKM/MP5 按住右键连射。
- 全自动单次长按最多持续 3 秒；正常松开立即停止。若平台漏掉松开事件，可再次点击停止，且硬超时会自动切断。
- 潜行持枪：ADS。
- `!reload` / `!r`：换弹。
- 原版工作台：合成 M1911、AKM、M870、MP5 图纸。
- `!workbench`：使用图纸制造枪械、打开靶场菜单。
- `!guntest`：游戏内自动测试。
- `!gunkit`：开发测试补给。

### 1.3.3 修复

- 四把枪的物品定义升级到 `1.21.50`，确保 `minecraft:use_modifiers` 被识别并触发右键开始/停止使用事件。
- 四个 attachable 改为始终运行独立持枪状态机，第一、第三人称都能进入模型姿态计算。
- 使用 Survival Gun 自己的渲染控制器显式绑定默认几何、材质和纹理，不依赖 DeadZone 的玩家渲染覆盖。

### 1.3.4 稳定性修复

- 图标使用与物品标识符一致的命名空间键，例如 `survival:akm`。
- attachable 补齐官方示例所需的 `item` 映射，并改用内置 `controller.render.item_default`。
- 四个枪械几何体都显式绑定当前手持物品槽；移除持枪状态机与动作，仅保留静态模型。
- 开火改为一次右键一次脉冲，结算后无条件释放扳机，从逻辑上杜绝无限开火。

### 1.3.5 连射与日志修复

- 根据实际运行日志，将 `minecraft:icon` 改为当前物品 Schema 接受的 `textures.default` 形式。
- 补齐内置物品渲染控制器要求的 `material.enchanted` 与 `texture.enchanted` 映射。
- AKM/MP5 恢复长按连射，并增加松开、再次点击、切槽、换弹、死亡及 3 秒硬超时停止保护。

### 1.3.6 静态模型可见性修复

- 将四个旧 DeadZone 几何体从 `1.12.0` 升级到支持 attachable 绑定的 `1.16.0`。
- 扩大模型可见边界，避免枪体因旧玩家模型边界被错误裁剪。
- 新增只调整枪体位置的静态持枪姿态，不包含换弹、开火或移动动作。

### 1.3.7 图纸工作台配方

- 删除枪械菜单中的“图纸测绘研究”，图纸只能在原版工作台合成。
- M1911：4 基础枪械残页 + 2 机械数据 + 2 纸。
- MP5：4 冲锋枪残页 + 4 机械数据 + 1 纸。
- M870：4 霰弹枪残页 + 4 机械数据 + 1 纸。
- AKM：4 步枪残页 + 3 机械数据 + 1 枪械结构样本 + 1 纸。

## 测试

静态测试：

```bash
node survival_firearms_addon/tests/validate_mvp.mjs
```

游戏内 `!guntest` 验证：M1911/AKM/MP5 的 10 秒射速误差不超过 2%；5000 HP 靶人连续承受 AKM 与 MP5 各 10 发时逐发扣血；四枪注册范围和一次性图纸规则。

## 临时 DeadZone 依赖与替换点

仅下列目录含临时复用内容：

- `survival_guns_rp_mvp/models/entity/temporary_deadzone_assets`
- `survival_guns_rp_mvp/textures/entity/temporary_deadzone_assets`
- `survival_guns_rp_mvp/textures/temporary_deadzone_assets/items`
- `survival_guns_rp_mvp/animations/temporary_deadzone_assets`
- `survival_guns_rp_mvp/sounds/temporary_deadzone_assets`

`survival_guns_rp` 是仓库原有的参考资源目录，构建脚本不会将它打进 MVP。替换原创资源时修改上述 MVP 文件、四个 `attachables/survival_*.json`，以及 `GunAnimationProfiles.js`；弹药、伤害、制造和射击逻辑无需更改。

## 已知限制

- Bedrock 射线命中部位没有稳定骨骼 Hitbox，MVP 以命中高度近似区分头部和身体。
- 致命伤害先尝试带射手归属的原版致命事件；不同服务端构建对自定义高血量实体死亡事件的表现可能不同。
- 正式发布前必须将临时 DeadZone 视觉/音频资源替换为自有或已获授权资源。
