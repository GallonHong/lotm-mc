# 0.3.15 黑紫贴图修复 · 64×64 方块颜色 + Dynamic Details PBR

已定位三类确定的无效纹理集：93个color引用在同包不存在；91个heightmap引用的源图为RGB/RGBA而非单通道；17个MERS引用RGB图而缺少第4通道。

0.3.15 修复：为93个方块补入随包的 64×64 颜色图（美术取自本地 Dynamic Details 1.2 的64×64方块颜色层）；高度图只取原图同一RGB通道无损转单通道灰度；17个不具备SSS数据的MERS声明还原为MER。保留高度细节、全部MER像素和其他光影设置，不全面移除PBR。PBR高度/材质图仍完全来自本地 Dynamic Details 1.2.mcpack。

64×64 颜色会替换这些方块的默认颜色（不是原版16×16色彩）；同包纹理集不会使用其他资源包的颜色覆盖，需要和其他方块材质包协调优先级。

验证：递归检查全部94个纹理集的本地引用、PNG/TGA有效性、通道、互斥层、颜色原始哈希与包内一致性。未进行基岩客户端内容日志/画面/GPU实测。0.3.12成品保留。0.3.15采用0.3.13验证过的修复方案，颜色图换成 Dynamic Details 1.2 的64×64方块美术。单独光影与合并光影音乐包不要同时启用，本轮未自动更新合并包。

官方依据：https://learn.microsoft.com/en-us/minecraft/creator/reference/content/texturesetsreference/texturesetsconcepts/texturesetsintroduction

原包NOTICE标注PBR素材来自Marketplace用于本地测试；保留此来源与限制，勿当成可公开再分发的原创资产。

---
历史说明：
# 0.3.9 雾与水微调测试版

在0.3.8天空渐变/高光调整上继续修改；0.3.7与0.3.8成品均保留供对照。未经客户端/GPU/手机实测。

雾：晴天距离雾起点由渲染距离72%后移到78%，结束仍100%；空气体积密度.0036、HG .65、颜色与吸收/散射不变，未继续削弱光束参数。雨天距离雾由25%–75%改30%–80%，体积密度.012→.0105。保持uniform，不按海平面设置高度雾，避免Y≈250的副本完全失去雾。远景雾会随设备渲染距离变化，短视距仍可能有明显边缘；不能保证光束出现。

水：降低颗粒浓度而不改纹理，保留群系差异。默认水泥沙8→6、叶绿素.35→.30、CDOM .08→.06；沙漠泥沙18→14，苍白水12→9，雪地4.5→3.5，沼泽20→16。沼泽仍最浑浊，雪地相对清澈。各类型波浪位移/速度适度降低，octaves仍14，未宣称性能提升。

焦散：按官方water schema，power为1–6整数，现有.8/1.1/1.2/1.4等统一为1。这不是可保证更暗的0–1透明度，尤其原沼泽.8的引擎处理未知，应在浅水底实测。

本轮未改：方块/水/雨贴图、texture_set材质、群系、水下距离雾、雨粒子、太阳/月亮/环境光、gamma、色调映射。雾、水和0.3.8继承的调色仍可能影响夜景。

先确认灵动视效已开启，仅启用一个光影包，不与光影音乐合并包叠加。对比相同地点/时间/天气：正午水面反光、浅水底焦散、雨天城市远景、Y≈250高空副本、午夜灯光。保留0.3.8作回退，同UUID不应同时导入启用；回退可能需先在游戏存储管理移除新版再导入旧版。

官方依据：
https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/watercustomization
https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/volumetricfoglightshaftscustomization

继承0.3.8：高光阈值1.8、gain .63与天空分区；夜景不保证完全保持。

## 草地截图补充调整
已查看用户截图：受光草顶偏浅黄绿，树叶鲜绿，建筑较灰。保持草地/树叶纹理、材质与群系色不变，仅将中间调饱和度.83→.80、高光饱和度.90→.82，配合继承的高光gain .63控制亮区。此调色不是绿颜色选择器，会同样略降低其他中高亮颜色，包括夜间亮部；无法通过静态检查保证草地已自然。未对截图做合成来冒充实机。

焦散一致性复核：五种水配置统一使用原默认水的frame_length=0.05秒、scale=0.12，以及相同贴图/power=1；避免跨群系时采用不同动画速度/投影尺度。水体颜色和波浪差异仍保留。

官方Biomes Customization的Limitations已核实：同包水设置应使用相同caustics参数，因为它们不能混合。上述统一遵循此限制。来源：https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/biomecustomization


## 0.3.12 追加：常用方块 PBR 贴图

从第三方光影包 Dynamic Details 1.2（Square Dreams AB）提取常用方块的高度图（heightmap）与金属/发光/粗糙度图（MER），共 93 个方块纹理、145 张 PBR 贴图，合计约 294KB；颜色仍使用原版贴图（texture_set 的 color 指向原版纹理名），不替换方块外观颜色。

覆盖：石头/圆石/深板岩/花岗岩/闪长岩/安山岩/石砖/砖块/泥土/草方块/沙/砂岩/木头/木板/矿石/矿物块/混凝土/陶瓦/羊毛/玻璃/冰/雪/下界岩/灵魂沙/黑曜石等常用方块。

注意：该 PBR 贴图数据来源于市场付费包，仅供本地测试使用，请勿公开再分发；如果某些方块的 PBR 未生效，可删除 textures/blocks 下对应的 texture_set.json 单独排查。
