/**
 * 所有 structure、检查点与刷怪点坐标均相对于实例槽位原点。
 * 一个模板可以加载多个 structure；按数组顺序分帧加载，避免同一 tick 堆积结构操作。
 */
export const DUNGEON_TEMPLATES = Object.freeze({
  abandoned_clinic: {
    id: "abandoned_clinic",
    name: "废弃医院·封锁小镇",
    description: "从感染诊所突围，穿过街区和警局，在市场与车库完成最终清剿。",
    dimension: "minecraft:overworld",
    structureSize: { x: 55, y: 25, z: 105 },
    arenaBounds: {
      min: { x: -2, y: -4, z: -2 },
      max: { x: 56, y: 32, z: 106 }
    },
    structures: [
      { id: "clinic_a", structureId: "daily_dungeon:abandoned_town/clinic_a", offset: { x: 3, y: 0, z: 3 }, size: { x: 18, y: 10, z: 15 } },
      { id: "street_a", structureId: "daily_dungeon:abandoned_town/street_a", offset: { x: 0, y: 0, z: 21 }, size: { x: 25, y: 10, z: 9 } },
      { id: "police_b", structureId: "daily_dungeon:abandoned_town/police_b", offset: { x: 5, y: 0, z: 33 }, size: { x: 16, y: 15, z: 16 } },
      { id: "street_b", structureId: "daily_dungeon:abandoned_town/street_b", offset: { x: 5, y: 0, z: 52 }, size: { x: 16, y: 10, z: 16 } },
      { id: "market_c", structureId: "daily_dungeon:abandoned_town/market_c", offset: { x: 2, y: 0, z: 72 }, size: { x: 20, y: 9, z: 25 } },
      { id: "garage_final", structureId: "daily_dungeon:abandoned_town/garage_final", offset: { x: 32, y: 0, z: 79 }, size: { x: 21, y: 6, z: 14 } }
    ],
    structureLoadDelayTicks: 8,
    platform: { min: { x: -1, z: -1 }, max: { x: 55, z: 104 }, block: "minecraft:stone_bricks" },
    entryOffset: { x: 6.5, y: 1, z: 6.5 },
    spawnPoints: [
      { id: "clinic_waiting", offset: { x: 8.5, y: 1, z: 11.5 } },
      { id: "clinic_ward", offset: { x: 17.5, y: 1, z: 6.5 } },
      { id: "street_left", offset: { x: 7.5, y: 1, z: 25.5 } },
      { id: "street_right", offset: { x: 18.5, y: 1, z: 26.5 } },
      { id: "police_lobby", offset: { x: 13.5, y: 2, z: 43.5 } },
      { id: "police_side", offset: { x: 9.5, y: 2, z: 37.5 } },
      { id: "market_floor", offset: { x: 10.5, y: 1, z: 76.5 } },
      { id: "market_back", offset: { x: 17.5, y: 1, z: 84.5 } },
      { id: "garage_center", offset: { x: 42.5, y: 1, z: 83.5 } },
      { id: "garage_flank", offset: { x: 47.5, y: 1, z: 82.5 } }
    ],
    checkpoints: [
      { id: "clinic_gate", name: "诊所外集合点", offset: { x: 12.5, y: 1, z: 20.5 }, radius: 5 },
      { id: "police_gate", name: "警察局入口", offset: { x: 13.5, y: 1, z: 32.0 }, radius: 5 },
      { id: "market_gate", name: "废弃市场入口", offset: { x: 12.0, y: 1, z: 70.5 }, radius: 6 },
      { id: "garage_gate", name: "维修车库封锁线", offset: { x: 35.0, y: 1, z: 78.5 }, radius: 5 }
    ],
    stages: [
      {
        type: "eliminate",
        name: "清理 A 楼感染诊所",
        groups: [
          { mobKey: "basic", count: 4, spawnPoint: "clinic_waiting" },
          { mobKey: "runner", count: 2, spawnPoint: "clinic_ward" }
        ]
      },
      { type: "checkpoint", name: "从诊所撤离", checkpoint: "clinic_gate", hint: "离开 A 楼，到诊所外集合点打卡。" },
      {
        type: "eliminate",
        name: "街道阻击",
        groups: [
          { mobKey: "basic", count: 5, spawnPoint: "street_left" },
          { mobKey: "runner", count: 2, spawnPoint: "street_right" },
          { mobKey: "raider", count: 1, spawnPoint: "street_right" }
        ]
      },
      { type: "checkpoint", name: "转移至 B 楼", checkpoint: "police_gate", hint: "沿道路前进，到警察局入口打卡。" },
      {
        type: "eliminate",
        name: "肃清 B 楼警察局",
        groups: [
          { mobKey: "basic", count: 4, spawnPoint: "police_lobby" },
          { mobKey: "spitter", count: 2, spawnPoint: "police_side" },
          { mobKey: "raider", count: 2, spawnPoint: "police_lobby" }
        ]
      },
      { type: "checkpoint", name: "穿越第二街区", checkpoint: "market_gate", hint: "继续前往废弃市场入口。" },
      {
        type: "eliminate",
        name: "市场感染巢穴",
        groups: [
          { mobKey: "basic", count: 5, spawnPoint: "market_floor" },
          { mobKey: "runner", count: 2, spawnPoint: "market_back" },
          { mobKey: "mutant", count: 2, spawnPoint: "market_back" }
        ]
      },
      { type: "checkpoint", name: "抵达最终封锁线", checkpoint: "garage_gate", hint: "离开市场，到维修车库集合。" },
      {
        type: "eliminate",
        name: "车库最终清剿",
        groups: [
          { mobKey: "heavy", count: 1, spawnPoint: "garage_center" },
          { mobKey: "mutant", count: 2, spawnPoint: "garage_flank" },
          { mobKey: "raider", count: 2, spawnPoint: "garage_center" }
        ]
      }
    ],
    rewardId: "dungeon_abandoned_clinic",
    minimumContribution: 10,
    maxPlayers: 4,
    maxDeathsPerPlayer: 2,
    joinWindowTicks: 3600,
    timeoutTicks: 24000,
    abandonTicks: 900,
    spawnConfirmTicks: 80,
    maxSpawnRetries: 2
  }
});

/** 两个高空实例槽位，间距覆盖完整小镇边界。 */
export const DUNGEON_SLOTS = Object.freeze([
  { id: "town_01", dimension: "minecraft:overworld", origin: { x: 100000, y: 250, z: 100000 } },
  { id: "town_02", dimension: "minecraft:overworld", origin: { x: 100192, y: 250, z: 100000 } }
]);

export function dungeonTemplate(id) {
  return DUNGEON_TEMPLATES[id] || null;
}

export function absolutePoint(origin, offset) {
  return {
    x: Number(origin.x) + Number(offset.x),
    y: Number(origin.y) + Number(offset.y),
    z: Number(origin.z) + Number(offset.z)
  };
}
