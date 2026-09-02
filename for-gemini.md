# for-gemini：LOTM MC 项目维护与修复经验

本文用于帮助后续接手本仓库的 Gemini 或其他开发者快速理解已经踩过的坑。修改前请先阅读本文件，不要把已经修复的问题重新引入。

## 1. 仓库与发布物

- `sapi_server_addon/SAPI_Server_Addon.mcaddon`：服务器经济、商店、领地、抽奖和寄卖行。
- `LOTM_Pathways_Addon.mcaddon`：诡秘之主途径、序列和能力系统。
- `survival_firearms_addon/`：Survival Firearms 独立枪械 Addon。
- `V1.6.6-1DeadZone/`：DeadZone 原始参考资源。Survival Firearms 复用了其中的枪械模型、动画、材质和音效。
- 不要只修改源码目录而忘记重新生成 `.mcpack` 和 `.mcaddon`；玩家实际导入的是构建后的压缩包。

## 2. Bedrock Script API 事件兼容

Bedrock 可能把清单请求的 `@minecraft/server` 自动提升到更高版本，但这不保证每个运行环境都提供完全相同的事件对象。禁止直接对不确定事件使用：

```js
world.afterEvents.someEvent.subscribe(handler);
```

应先取得信号并检查 `subscribe`：

```js
function subscribeAfterEvent(eventName, handler) {
  try {
    const events = world.afterEvents;
    const signal = events ? events[eventName] : undefined;
    if (!signal || typeof signal.subscribe !== "function") return false;
    signal.subscribe(handler);
    return true;
  } catch (error) {
    console.warn(`Cannot subscribe to ${eventName}: ${error}`);
    return false;
  }
}
```

同样的规则适用于 `world.beforeEvents` 和 `system.afterEvents`。这可以避免：

```text
TypeError: cannot read property 'subscribe' of undefined
```

## 3. Survival Firearms 无限射击问题

### 根因

旧实现同时使用 `itemStartUse` 和 `itemUse` 调用同一个“按下扳机”函数。玩家松开右键后，释放事件可能先把扳机设为松开，随后 `itemUse` 又把它设为按下，导致全自动枪持续发射。

同时，代码监听了 `itemReleaseUse` 和 `itemStopUseOn`，却遗漏了与 `itemStartUse` 对应的标准 `itemStopUse`。

### 正确规则

- `itemStartUse`：开始按住扳机。
- `itemStopUse`：主要停火事件。
- `itemReleaseUse`：充能物品释放时的补充停火事件。
- `itemStopUseOn`：对方块使用物品时的补充停火事件。
- `itemUse`：只用于便携枪械工作台；当 `itemStartUse` 可用时，不得再次启动枪械扳机。
- 如果旧运行时没有 `itemStartUse`，回退射击必须有固定的短超时，绝不能创建无停止条件的持续状态。
- 玩家切换快捷栏、枪械离手、弹匣耗尽、武器损坏、开始换弹或退出世界时，也必须清除扳机状态。

当前实现位于：

```text
survival_firearms_addon/survival_guns_bp/scripts/main.js
survival_firearms_addon/survival_guns_bp/scripts/guns/GunController.js
survival_firearms_addon/survival_guns_bp/scripts/guns/FireScheduler.js
```

## 4. 枪械没有模型的问题

### 根因

旧的预构建 `.mcpack` 使用了 Windows 反斜杠路径，例如：

```text
attachables\survival_akm.json
models\entity\ak47.geo.json
```

Bedrock 资源查找使用 `/` 路径。清单在压缩包根目录，所以行为包脚本可能仍然启动，但 attachable、geometry、texture 和 animation 无法正常匹配，表现为物品存在而枪械模型消失。

### 模型链检查

每把枪必须同时满足以下链路：

```text
BP item identifier
  -> RP attachable identifier
  -> geometry identifier
  -> geometry JSON
  -> texture path and PNG
  -> animation controller
  -> animation definitions
  -> render controller
```

当前四把枪的主要映射：

| 枪械物品 | attachable | geometry | 材质 |
|---|---|---|---|
| `survival:akm` | `attachables/survival_akm.json` | `geometry.ak47` | `textures/entity/guns/ak47.png` |
| `survival:m1911` | `attachables/survival_m1911.json` | `geometry.m1911` | `textures/entity/guns/m1911.png` |
| `survival:m870` | `attachables/survival_m870.json` | `geometry.m870` | `textures/entity/guns/m870.png` |
| `survival:mp5` | `attachables/survival_mp5.json` | `geometry.mp5` | `textures/entity/guns/mp5.png` |

不要只检查文件是否存在，还要检查 JSON 内的 `identifier`、大小写和路径是否完全一致。

## 5. 音效资源错误

错误示例：

```text
Invalid asset path sounds/guns/dry/dry2
```

原因是 `sound_definitions.json` 引用了不存在的 `dry2.ogg`。修复时应删除无效引用，或者确实加入对应 OGG；不要创建空文件占位。

此外，`sound_definitions.json` 必须放在 `sounds/` 下。不要把声音定义文件放进 `animation_controllers/`，否则会被错误的资源加载器解析。

## 6. JSON 与物品注册错误

遇到：

```text
Item is an invalid json object
Invalid item identifier
```

第二条通常是第一条的后果：物品 JSON 加载失败后，脚本自然无法创建该物品。排查顺序：

1. 用严格 JSON 解析器检查语法。
2. 删除 `//` 注释、尾逗号和其他 JSONC 写法。
3. 检查 `format_version` 与组件结构。
4. 检查 `minecraft:item.description.identifier`。
5. 检查物品图标键是否存在于 `textures/item_texture.json`。
6. 最后再检查脚本中的物品 ID。

本次还发现并修复了 `animations/misc/item_size.animation.json` 中的 `//` 注释。Minecraft 的部分加载器不会接受这种非标准 JSON。

## 7. UI 回调错误

遇到 `UI Callback Error: TypeError: not a function` 时：

- 检查按钮回调是否真的为函数。
- 检查表单结果是否 `canceled`，不要直接读取不存在的 `selection` 或 `formValues`。
- 打开新表单时优先通过 `system.run` 延迟到下一 tick，避免在当前 UI 回调栈中嵌套调用。
- 对不同 Script API 版本的事件和方法做存在性检查。

## 8. 构建规则

Survival Firearms 使用：

```bash
./survival_firearms_addon/build_survival_guns.sh
```

构建脚本首行必须是无 BOM 的：

```bash
#!/usr/bin/env bash
```

如果 BOM 位于 `#!` 前，Shell 会报告：

```text
#!/usr/bin/env: No such file or directory
```

修改后应同步提高 BP、RP、模块和依赖版本。当前修复版为 `1.2.1`，并明确请求 `@minecraft/server` `1.19.0`。

如果玩家反馈的日志仍显示 PackId 版本 `1.0.0`，并且初始化文本没有 `v1.2.1 FIXED`，说明游戏实际运行的仍是旧缓存包，而不是当前源码。不要继续根据旧日志重复修改已修好的源码；应让玩家删除旧 BP/RP，导入带版本号文件名的 `Survival_Guns_Addon_v1.2.1_FIXED.mcaddon`，再重新激活行为包和资源包。

## 9. 提交前验证清单

至少完成以下检查：

```bash
# 所有 JSON 必须能被严格解析
find survival_firearms_addon/survival_guns_bp \
     survival_firearms_addon/survival_guns_rp \
     -type f -name '*.json' -print0 | xargs -0 -n1 jq empty

# 所有脚本必须通过语法检查
find survival_firearms_addon/survival_guns_bp/scripts \
     -type f -name '*.js' -print0 | xargs -0 -n1 node --check

# 重建并检查压缩包
./survival_firearms_addon/build_survival_guns.sh
unzip -tq survival_firearms_addon/Survival_Guns_BP.mcpack
unzip -tq survival_firearms_addon/Survival_Guns_RP.mcpack
unzip -tq survival_firearms_addon/Survival_Guns_Addon.mcaddon

# 包内不能存在反斜杠路径
zipinfo -1 survival_firearms_addon/Survival_Guns_BP.mcpack | rg '\\'
zipinfo -1 survival_firearms_addon/Survival_Guns_RP.mcpack | rg '\\'

# 不应再出现失效音效
rg 'dry2' survival_firearms_addon
```

最后确认：

- BP/RP UUID 依赖互相匹配。
- BP、RP 和 `.mcaddon` 内嵌的包版本一致。
- 构建后的 `scripts/main.js` 与源码一致。
- 四把枪的 attachable、geometry、texture 和动画文件确实存在于最终 RP 压缩包内。
- `git diff --check` 无错误，且没有把访问令牌、密码或其他凭据写入仓库。

## 10. 玩家测试建议

导入新包时，先删除游戏内旧的 Survival Firearms BP/RP，避免世界继续使用旧版缓存。重新导入 `Survival_Guns_Addon.mcaddon` 后测试：

1. 日志显示 Survival Firearms `v1.2.1 FIXED` 成功初始化，PackId 版本为 `1.2.1`。
2. AKM、M1911、M870、MP5 在第一和第三人称都显示模型。
3. 按住右键时全自动枪按射速开火，松开立即停止。
4. 半自动枪一次按压只发射一发。
5. 切换物品、换弹、弹匣耗尽、武器损坏和退出世界都不会留下后台射击状态。
6. 日志不再出现 `subscribe of undefined` 或 `dry2` 资源错误。

## 11. 已完成的关键提交

- `0ce7582`：修复 Survival Firearms 模型路径、事件订阅、无限射击、无效音效与构建包。
- 后续修改应保留上述行为，并在修改枪械输入或资源包结构后重新执行完整验证。
