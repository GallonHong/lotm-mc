# Apocalypse Survival UI

可选的 Minecraft Bedrock JSON UI 资源包，为 SAPI Server 的主菜单提供末日生存像素磁贴外观。

v1.0.2 将注入定义迁移到独立的 `ui/apocalypse_server_form.json`，通过 `_ui_defs.json` 加载；资源包内不再存在会遮蔽原版或 DDUI 的 `ui/server_form.json` 路径。v1.0.1 已将完整覆盖改成增量注入。

## 兼容原则

- 该项目只有资源包，不包含行为包，也不保存任何经济或玩法数据。
- SAPI Server 仍使用标准 `ActionFormData` 创建菜单并处理按钮。
- 未安装本资源包时，主菜单自动显示为 Minecraft 原版纵向表单，所有功能仍然可用。
- 只有标题完全匹配 `§l§2末日生存联盟§r` 的表单会被换肤，其余 addon 表单保持原样。
- 不修改 Test Gun addon。

## 安装

1. 安装 `Apocalypse_UI.mcpack`。
2. 在世界资源包中启用 **Apocalypse Survival UI**。
3. DDUI 可保持原有资源包顺序；本包不再占用它依赖的原版 `ui/server_form.json` 文件路径。

## 素材

像素插画由 OpenAI 图像生成工具为本项目原创生成，提示词记录在 `ASSET_PROMPTS.md`。

JSON UI 的标题门控与 `collection_index` 技术参考了公开示例：
https://github.com/markeev/bedrock-tile-menu

## 打包

```bash
bash build.sh
```
