# Apocalypse Survival UI

可选的 Minecraft Bedrock JSON UI 资源包，为 SAPI Server 的主菜单提供末日生存像素磁贴外观。

## 兼容原则

- 该项目只有资源包，不包含行为包，也不保存任何经济或玩法数据。
- SAPI Server 仍使用标准 `ActionFormData` 创建菜单并处理按钮。
- 未安装本资源包时，主菜单自动显示为 Minecraft 原版纵向表单，所有功能仍然可用。
- 只有标题完全匹配 `§l§2末日生存联盟§r` 的表单会被换肤，其余 addon 表单保持原样。
- 不修改 Test Gun addon。

## 安装

1. 安装 `Apocalypse_UI.mcpack`。
2. 在世界资源包中启用 **Apocalypse Survival UI**。
3. 如果同时启用了其他修改 `ui/server_form.json` 的资源包，将本资源包放在更高优先级。

## 素材

像素插画由 OpenAI 图像生成工具为本项目原创生成，提示词记录在 `ASSET_PROMPTS.md`。

JSON UI 的标题门控与 `collection_index` 技术参考了公开示例：
https://github.com/markeev/bedrock-tile-menu

## 打包

```bash
bash build.sh
```
