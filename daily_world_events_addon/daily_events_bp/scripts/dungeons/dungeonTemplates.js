/**
 * 副本中的所有空间坐标均相对于 structure load 的原点。
 * 地图作者只需要替换结构文件并调整 entryOffset / spawnPoints，核心逻辑无需改动。
 */
export const DUNGEON_TEMPLATES = Object.freeze({
  abandoned_clinic: {
    id: "abandoned_clinic",
    name: "废弃医院·感染诊所",
    description: "清理诊所大厅、隔离病房与深处的重型感染体。",
    structureId: "daily_dungeon:abandoned_clinic",
    structureSize: { x: 18, y: 10, z: 15 },
    dimension: "minecraft:overworld",
    entryOffset: { x: 1.5, y: 1, z: 3.5 },
    spawnPoints: [
      { id: "waiting_room", offset: { x: 5.5, y: 1, z: 8.5 } },
      { id: "ward", offset: { x: 14.5, y: 1, z: 3.5 } },
      { id: "isolation_room", offset: { x: 13.5, y: 1, z: 8.5 } }
    ],
    stages: [
      {
        name: "清理候诊大厅",
        groups: [
          { mobKey: "basic", count: 4, spawnPoint: "waiting_room" },
          { mobKey: "runner", count: 2, spawnPoint: "ward" }
        ]
      },
      {
        name: "肃清隔离病房",
        groups: [
          { mobKey: "basic", count: 4, spawnPoint: "ward" },
          { mobKey: "spitter", count: 2, spawnPoint: "isolation_room" }
        ]
      },
      {
        name: "消灭地下实验体",
        groups: [
          { mobKey: "mutant", count: 2, spawnPoint: "waiting_room" },
          { mobKey: "heavy", count: 1, spawnPoint: "isolation_room" }
        ]
      }
    ],
    rewardId: "dungeon_abandoned_clinic",
    minimumContribution: 6,
    maxPlayers: 4,
    maxDeathsPerPlayer: 2,
    joinWindowTicks: 2400,
    timeoutTicks: 12000,
    abandonTicks: 600
  }
});

/**
 * 固定实例槽位。管理员可以后期直接修改坐标，或继续增加槽位。
 * 槽位间距大于副本清理半径，避免不同实例互相影响。
 */
export const DUNGEON_SLOTS = Object.freeze([
  { id: "clinic_01", dimension: "minecraft:overworld", origin: { x: 100000, y: 250, z: 100000 } },
  { id: "clinic_02", dimension: "minecraft:overworld", origin: { x: 100128, y: 250, z: 100000 } }
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
