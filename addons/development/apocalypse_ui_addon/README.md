# Apocalypse Survival UI

可选的 Minecraft Bedrock JSON UI 资源包，为 SAPI Server 的主菜单提供末日生存像素磁贴外观。

v1.2.0 在原有 SAPI 主菜单磁贴之外，为标题精确匹配 `§l§6希望报` 的 ActionForm 增加独立报纸版式；未安装本资源包时，希望报和小游戏仍以原版表单正常工作。当前版本继续保留普通表单与 ModalForm 所需控件。

## 兼容原则

- 该项目只有资源包，不包含行为包，也不保存任何经济或玩法数据。
- SAPI Server 仍使用标准 `ActionFormData` 创建菜单并处理按钮。
- 未安装本资源包时，主菜单自动显示为 Minecraft 原版纵向表单，所有功能仍然可用。
- 只有标题匹配 `§l§2幸存者联盟§r`（并兼容两个旧标题）的表单会进入磁贴分支，其余 addon 表单保持原样。
- 不修改 Test Gun addon。

## 安装

1. 安装 `Apocalypse_UI.mcpack`。
2. 在世界资源包中启用 **Apocalypse Survival UI**。
3. 若同时使用 DDUI，请把本包放在需要覆盖的通用 UI 包上方；只有 SAPI 主菜单命中标题门控时使用磁贴布局。

## 素材

像素插画由 OpenAI 图像生成工具为本项目原创生成，提示词记录在 `ASSET_PROMPTS.md`。

JSON UI 的标题门控与 `collection_index` 技术参考了公开示例：
https://github.com/markeev/bedrock-tile-menu

## 打包

```bash
bash build.sh
```
