/**
 * 独立自然灾害高级配置。修改后重新构建并导入 Add-on。
 * 本包不读取 SAPI、怪物包或摸金都市的任何状态。
 */
export const STANDALONE_CONFIG = Object.freeze({
  enabled: true,
  autoEnabled: true,
  protectSpawn: false,
  blockDamage: false,

  warningSeconds: 20,
  disasterSeconds: 45,
  cooldownSeconds: 120,
  emptyRegionRetryMinutes: 1,
  difficulty: 2,
  manualRadius: 96,
  automaticRadius: 96,

  // 法制区事件较少，非法制区事件更频繁。
  intervalMinutes: Object.freeze({
    law: Object.freeze({ min: 20, max: 40 }),
    outlaw: Object.freeze({ min: 10, max: 20 }),
  }),

  weights: Object.freeze({
    tornado: 20,
    meteors: 20,
    lightning: 20,
  }),

  // 安全区永远不会成为自动灾害目标。
  safeRegions: Object.freeze([
    Object.freeze({ id: "safe_zone_1", name: "安全区 1", dimension: "minecraft:overworld", minX: 1949, maxX: 3035, minZ: 1463, maxZ: 2469 }),
    Object.freeze({ id: "safe_zone_2", name: "安全区 2", dimension: "minecraft:overworld", minX: 2352, maxX: 2585, minZ: 1165, maxZ: 1303 }),
    Object.freeze({ id: "safe_zone_3", name: "安全区 3", dimension: "minecraft:overworld", minX: 1942, maxX: 2087, minZ: 1273, maxZ: 1465 }),
  ]),

  // 下列固定区域按法制区计时；主世界其余非安全区按非法制区计时。
  autoRegions: Object.freeze([
    Object.freeze({
      id: "law_zone_1",
      name: "法制区 1",
      type: "law",
      dimension: "minecraft:overworld",
      minX: 3450,
      maxX: 3869,
      minZ: 2033,
      maxZ: 2478,
    }),
    Object.freeze({
      id: "law_zone_2",
      name: "法制区 2",
      type: "law",
      dimension: "minecraft:overworld",
      minX: 1687,
      maxX: 2250,
      minZ: 2509,
      maxZ: 3127,
    }),
  ]),
});
