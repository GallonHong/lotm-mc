/** Weekly raid balance. Quantities of materials are conservative, editable defaults. */
export const WEEKLY_CONFIG = Object.freeze({
 timezoneOffsetHours: 8,
 resetDay: 1, // Monday
 resetHour: 4,
 moneyObjective: "money",
 identityKey: "daily_events:weekly_identity",
 ledgerPrefix: "daily_events:weekly_ledger_",
 saltKey: "daily_events:weekly_reward_salt",
 retainedWeeks: 12,
 maxLedgerCharacters: 30000
});

export const WEEKLY_TIER_ORDER = Object.freeze(["normal", "hard", "nightmare", "hell"]);
export const WEEKLY_TIERS = Object.freeze({
 normal: Object.freeze({ id: "normal", name: "普通", rank: 0, armor: 0, multiplier: 1, blueprintChances: Object.freeze([0, 0]) }),
 hard: Object.freeze({ id: "hard", name: "困难", rank: 1, armor: 10, multiplier: 2, blueprintChances: Object.freeze([0.2, 0]) }),
 nightmare: Object.freeze({ id: "nightmare", name: "噩梦", rank: 2, armor: 20, multiplier: 4, blueprintChances: Object.freeze([0.4, 0.2]) }),
 hell: Object.freeze({ id: "hell", name: "地狱", rank: 3, armor: 40, multiplier: 8, blueprintChances: Object.freeze([1, 0.5]) })
});

export const WEEKLY_BOSSES = Object.freeze({
 sirok: Object.freeze({
  id: "sirok", name: "斯洛克", entityTypeId: "apoc_boss:sandworm", hp: 20000, baseGold: 20000,
  description: "遗忘沙海中的噬沙巨兽。不同难度只改变护甲，不改变最大生命值。",
  blueprints: Object.freeze([
   Object.freeze({ id: "test_gun:blueprint_python_finale", name: "Python 终曲蓝图" }),
   Object.freeze({ id: "test_gun:blueprint_arc", name: "特斯拉蓝图" })
  ]),
  materials: Object.freeze([
   Object.freeze({ id: "test_gun:part_heavy_barrel", amount: 2, name: "重型加固合金枪管" }),
   Object.freeze({ id: "test_gun:part_tungsten_bolt", amount: 1, name: "钨钢枪机" }),
   Object.freeze({ id: "test_gun:part_plasma_core", amount: 1, name: "特殊等离子核心" })
  ])
 }),
 mogathul: Object.freeze({
  id: "mogathul", name: "莫加苏尔", entityTypeId: "apoc_boss:abomination", hp: 30000, baseGold: 30000,
  description: "腐化祭坛上的畸变统领。不同难度只改变护甲，不改变最大生命值。",
  blueprints: Object.freeze([
   Object.freeze({ id: "test_gun:blueprint_scarh_stripper", name: "SCAR-H 剥甲者蓝图" }),
   Object.freeze({ id: "test_gun:blueprint_mgl", name: "MGL 蓝图" })
  ]),
  materials: Object.freeze([
   Object.freeze({ id: "test_gun:part_heavy_barrel", amount: 2, name: "重型加固合金枪管" }),
   Object.freeze({ id: "test_gun:part_military_fcu", amount: 1, name: "军用火控单元" }),
   Object.freeze({ id: "test_gun:part_exo_core", amount: 1, name: "外骨骼伺服核心" })
  ])
 })
});

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Key is the local Monday date. Sunday 20:00 UTC is Monday 04:00 China. */
export function weekKey(now = Date.now()) {
 const shifted = new Date(Number(now) + (WEEKLY_CONFIG.timezoneOffsetHours - WEEKLY_CONFIG.resetHour) * HOUR_MS);
 if (!Number.isFinite(shifted.getTime())) throw new Error("Invalid weekly reset time");
 const daysSinceMonday = (shifted.getUTCDay() + 6) % 7;
 shifted.setUTCDate(shifted.getUTCDate() - daysSinceMonday);
 return shifted.toISOString().slice(0, 10);
}

export function nextWeeklyReset(now = Date.now()) {
 return Date.parse(`${weekKey(now)}T00:00:00.000Z`) - (WEEKLY_CONFIG.timezoneOffsetHours - WEEKLY_CONFIG.resetHour) * HOUR_MS + WEEK_MS;
}
