export const HOPE_POST_QUIZZES = [
  {
    prompt: "编辑部收到三份关于物资箱的情报，哪一份是真的？",
    options: [
      "神话物资箱必须使用神话补给密钥开启",
      "高级随机箱会在摸金都市的道路中央自然生成",
      "普通随机箱一次最多掉落五类物品"
    ],
    answer: 0,
    explanation: "神话箱需要神话补给密钥；实体随机箱不在摸金都市生成，普通随机箱最多掉落两类物品。"
  },
  {
    prompt: "下面哪条关于军备蓝图的消息可信？",
    options: [
      "Boss 会直接掉落 Legendary 蓝图",
      "限定 Epic 池内所有限定 Epic 蓝图合计概率为 5%",
      "Commander AK 的 Legendary 蓝图可以在工作台合成"
    ],
    answer: 1,
    explanation: "限定 Epic 蓝图共享 5% 总概率；Legendary 蓝图不由怪物直接掉落，Commander AK 蓝图也不可合成。"
  },
  {
    prompt: "安全区广播正在核实玩家守则，哪一条是真的？",
    options: [
      "好友观光权限默认可以打开箱子",
      "同一队伍的玩家无法互相造成伤害",
      "通缉值越高，保释费用越低"
    ],
    answer: 1,
    explanation: "队友伤害会被拦截；观光权限不包含容器权限，通缉值也不会降低保释成本。"
  },
  {
    prompt: "关于废墟随机物资箱，编辑部应该采用哪条稿件？",
    options: [
      "箱子刷新后会恢复未开启外观",
      "开过一次后贴图永远保持开启状态",
      "玩家必须输入聊天指令才能开启"
    ],
    answer: 0,
    explanation: "物资箱冷却结束后会恢复可用状态与未开启外观，玩家直接互动即可开启。"
  },
  {
    prompt: "远征队发回三条副本情报，哪条是真的？",
    options: [
      "队长发起副本后，队员应先确认准备",
      "副本最终奖励由全队共用同一个箱子",
      "副本导航必须占用枪械 action bar"
    ],
    answer: 0,
    explanation: "队伍副本采用准备确认并为每位成员独立结算；导航不会占用 Test Gun 的 action bar。"
  },
  {
    prompt: "联盟医疗组整理了三条提示，哪条可以刊登？",
    options: [
      "医疗站会无限免费恢复生命",
      "医疗站使用现有绷带或急救包提供治疗",
      "医疗站必须安装 SAPI 才能正常加载"
    ],
    answer: 1,
    explanation: "医疗站消耗 Apocalypse Life 内现有医疗品；SAPI 只负责售卖入口，不是实体运行依赖。"
  }
];

function hash(text) {
  let value = 2166136261;
  for (const char of String(text)) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function quizForDay(dayKey) {
  return HOPE_POST_QUIZZES[hash(dayKey) % HOPE_POST_QUIZZES.length];
}
