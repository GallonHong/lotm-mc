export const MERCHANTS = Object.freeze({
  supplies: Object.freeze({
    id: "supplies",
    name: "§a杂货商",
    tag: "daily_merchant_supplies",
    scene: "daily_merchant_supplies",
    description: "食物、医疗品与原版物资回收。",
    categories: ["supplies"]
  }),
  weapons: Object.freeze({
    id: "weapons",
    name: "§c军火商",
    tag: "daily_merchant_weapons",
    scene: "daily_merchant_weapons",
    description: "弹药、常规半成品和普通/Rare 蓝图。",
    categories: ["armory"]
  }),
  medical: Object.freeze({
    id: "medical",
    name: "§6载具商",
    tag: "daily_merchant_medical",
    scene: "daily_merchant_medical",
    description: "载具蓝图、组件和后勤设备。",
    categories: ["vehicles"]
  }),
  research: Object.freeze({
    id: "research",
    name: "§5高级军备商",
    tag: "daily_merchant_research",
    scene: "daily_merchant_research",
    description: "限定 Epic 蓝图、高级半成品与军备抽奖入口。",
    categories: ["advanced_armory"]
  })
});

export function merchantByEntity(entity) {
  if (!entity) return null;
  for (const merchant of Object.values(MERCHANTS)) {
    try { if (entity.hasTag(merchant.tag)) return merchant; } catch {}
  }
  return null;
}
