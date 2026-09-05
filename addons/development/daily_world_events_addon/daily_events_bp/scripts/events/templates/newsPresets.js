const preset = (id, eventTemplateId, category, headline, lead, success, failure, danger = 3) => ({
  id, eventTemplateId, category, headline, lead, success, failure, danger
});

/**
 * 新闻文案与战斗模板分离：多个报道可以复用同一事件，也可以由管理员
 * 选择预设后修改地点和坐标。占位符由 DailyNewsManager 在发布时替换。
 */
export const NEWS_PRESETS = Object.freeze({
  mass_horde_surface: preset(
    "mass_horde_surface", "infected_attack", "尸潮警报", "地表发现大规模尸潮",
    "侦察队在{location}发现大规模感染者集群，正在向周边道路扩散。",
    "{location}的大规模尸潮已被清除，区域交通正在恢复。",
    "防线未能阻止尸潮扩散，{location}仍处于高危状态。", 4
  ),
  migrating_horde: preset(
    "migrating_horde", "infected_attack", "尸潮警报", "迁徙尸群逼近居民区",
    "监听站确认一支迁徙尸群正在经过{location}，幸存者应立即组织拦截。",
    "迁徙尸群已在{location}被截断，没有继续靠近居民区。",
    "迁徙尸群突破拦截并离开监控范围，请避开{location}。", 4
  ),
  fog_man_sighting: preset(
    "fog_man_sighting", "fog_man_hunt", "不明生物", "浓雾中发现人形生物",
    "多名幸存者在{location}目击到被浓雾包围的人形目标，联盟暂定代号“雾中人”。",
    "雾中人已在{location}被消灭，附近异常雾气开始消散。",
    "雾中人脱离追踪，{location}附近仍可能出现异常雾气。", 5
  ),
  goatman_sighting: preset(
    "goatman_sighting", "goatman_hunt", "不明生物", "林区发现羊首人形生物",
    "侦察员在{location}发现高速移动的羊首人形目标，请勿单独靠近。",
    "山羊人已在{location}被击杀，失踪侦察队的装备已被回收。",
    "山羊人突破包围并消失在{location}附近，搜寻行动暂停。", 5
  ),
  siren_head_sighting: preset(
    "siren_head_sighting", "siren_head_hunt", "不明生物", "远郊出现异常警报声",
    "{location}持续传出无法识别的防空警报，观察员确认现场存在超高人形生物。",
    "警笛头已在{location}倒下，异常广播信号已经停止。",
    "追捕行动失败，{location}仍能接收到来源不明的警报声。", 5
  ),
  rebel_city_assault: preset(
    "rebel_city_assault", "rebel_invasion", "主城警报", "叛军正在进攻主城防线",
    "武装叛军已经抵达{location}，安全区防线进入紧急状态。",
    "叛军对{location}的进攻已被击退，安全区恢复开放。",
    "{location}防线失守，联盟要求居民暂时撤离该区域。", 5
  ),
  rebel_checkpoint_assault: preset(
    "rebel_checkpoint_assault", "rebel_invasion", "主城警报", "叛军车队袭击检查站",
    "一支叛军车队正在攻击{location}，守备队请求所有幸存者支援。",
    "叛军车队已在{location}被摧毁，检查站重新开放。",
    "守备队已撤出{location}，叛军仍控制附近道路。", 5
  ),
  convoy_distress: preset(
    "convoy_distress", "crashed_convoy", "救援通报", "运输车队发出紧急求救",
    "联盟运输车在{location}遭到感染者包围，车载物资急需保护。",
    "{location}的运输车与物资已成功保全。",
    "运输车防守失败，{location}的物资已经损失。", 3
  ),
  survivor_emergency: preset(
    "survivor_emergency", "survivor_rescue", "救援通报", "收到幸存者求救信号",
    "无线电在{location}收到断续求救信号，现场有大量感染者活动。",
    "受困幸存者已从{location}获救。",
    "求救信号已经中断，{location}救援行动失败。", 3
  ),
  toxic_contamination: preset(
    "toxic_contamination", "toxic_outbreak", "污染警报", "发现高浓度感染毒雾",
    "{location}出现异常毒雾和吐酸感染者，请携带医疗物资前往。",
    "{location}的污染源已被清除，空气指标正在恢复。",
    "污染继续扩散，联盟已将{location}标记为危险区域。", 4
  ),
  armed_roadblock: preset(
    "armed_roadblock", "raider_ambush", "治安通报", "武装人员封锁交通要道",
    "侦察队报告叛军在{location}设立临时封锁线并袭击过往幸存者。",
    "{location}的武装封锁已经解除。",
    "清剿行动失败，请暂时绕行{location}。", 3
  ),
  infected_roadblock: preset(
    "infected_roadblock", "roadblock_clearance", "交通警报", "感染者占据主要公路",
    "大量感染者聚集在{location}的废弃车辆之间，联盟发布道路清理委托。",
    "{location}路障已经清理，主干道恢复通行。",
    "道路清理失败，车队应继续绕行{location}。", 3
  ),
  mutant_nest_report: preset(
    "mutant_nest_report", "mutant_nest", "荒原警报", "发现大型变异体巢穴",
    "非法制区侦察队在{location}发现持续扩张的变异体巢穴。",
    "{location}的变异体巢穴已被摧毁。",
    "巢穴清理失败，{location}的感染活动正在增强。", 5
  ),
  mercenary_blockade_report: preset(
    "mercenary_blockade_report", "mercenary_blockade", "荒原警报", "雇佣兵建立重型封锁线",
    "武装雇佣兵已控制{location}，现场发现重型单位。",
    "{location}的雇佣兵封锁线已被突破。",
    "突击队未能夺回{location}，封锁仍在持续。", 4
  )
});

export function newsPreset(id) { return NEWS_PRESETS[id] || null; }

export function presetsForTemplate(templateId) {
  return Object.values(NEWS_PRESETS).filter(value => value.eventTemplateId === templateId);
}
