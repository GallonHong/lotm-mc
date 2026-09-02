export const MERCHANTS = Object.freeze({
  supplies: Object.freeze({
    id: "supplies",
    name: "§6生存物资商人",
    tag: "daily_merchant_supplies",
    scene: "daily_merchant_supplies",
    description: "建筑材料、矿石与基础生存物资。",
    categories: ["building", "minerals"]
  }),
  weapons: Object.freeze({
    id: "weapons",
    name: "§c武器装备商人",
    tag: "daily_merchant_weapons",
    scene: "daily_merchant_weapons",
    description: "原版武器、防具和弹药占位物。",
    categories: ["equipment"]
  }),
  medical: Object.freeze({
    id: "medical",
    name: "§a医疗补给商人",
    tag: "daily_merchant_medical",
    scene: "daily_merchant_medical",
    description: "食物、恢复用品和野外补给。",
    categories: ["food"]
  }),
  research: Object.freeze({
    id: "research",
    name: "§d研究物资商人",
    tag: "daily_merchant_research",
    scene: "daily_merchant_research",
    description: "研究数据、蓝图占位物和珍品。",
    categories: ["special"]
  })
});

export function merchantByEntity(entity) {
  if (!entity) return null;
  for (const merchant of Object.values(MERCHANTS)) {
    try { if (entity.hasTag(merchant.tag)) return merchant; } catch {}
  }
  return null;
}
