# Survival Firearms MVP 1.3.2

本目录严格实现仓库根目录 `1.md` 定义的四枪 MVP，不包含经济、诡秘途径或其他扩展系统。

## 架构

- `GunRegistry`：仅注册 M1911、AKM、M870、MP5 与对应图纸。
- `AmmoRegistry` / `AmmoManager`：四种弹药注册、服务端弹匣状态、备弹统计与完成点扣弹。
- `FireScheduler`：20 TPS 小数累加器，最高 1200 RPM；松开使用键停止全自动射击。
- `GunController`：服务端权威输入校验，并按 SHOT → HIT → DAMAGE 调用。
- `HitResolver`：服务端视线、散布、方块遮挡和实体 Raycast。
- `FirearmDamageResolver`：距离、头/身、护甲、PvE/PvP 结算；直接修改生命值绕过枪械受伤间隔。
- `ReloadManager`：换弹完成点扣备弹；切槽、换枪、丢枪、死亡、跨维度取消。
- `InventoryTransaction`：图纸合成与武器制造快照回滚；成功制造出的枪为满耐久、空弹匣。
- `GunAnimationProfiles`：核心逻辑只引用 equip/idle/fire/ads/sprint/reload/swim 语义状态。

## 操作

- 按住右键：射击；松开：立即停止。
- 潜行持枪：ADS。
- `!reload` / `!r`：换弹。
- `!workbench`：制造、图纸、靶场菜单。
- `!guntest`：游戏内自动测试。
- `!gunkit`：开发测试补给。

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
