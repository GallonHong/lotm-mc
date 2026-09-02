export const CONFIG = Object.freeze({
  version: "0.1.0",
  dimensionId: "apoc_extract:city",
  heartbeatKey: "interop:apoc_extraction_heartbeat",
  activeTag: "apoc_extraction_active",
  returnKey: "apoc_extract:return:v1",
  deathReturnKey: "apoc_extract:death_return:v1",
  pointsKey: "apoc_extract:points:v1",
  spawnQueueKey: "apoc:spawn_requests:v1",
  apocalypseHeartbeatKey: "apoc:heartbeat",
  keepInventoryRequired: true,
  protectedHotbarSlots: 9,
  extractionRadius: 9,
  extractionSeconds: 10,
  hostileCapPerPlayer: 8,
  hostileSpawnIntervalTicks: 100,
  bossCheckIntervalTicks: 1200,
  bossChancePerCheck: 0.08,
  entryPoints: [
    { name: "东部街区", x: 96, z: 96 }, { name: "西部街区", x: -96, z: 96 },
    { name: "南部街区", x: 96, z: -96 }, { name: "北部街区", x: -96, z: -96 },
    { name: "旧城区", x: 320, z: 64 }, { name: "工业区", x: -320, z: -64 },
    { name: "河东区", x: 64, z: 320 }, { name: "河西区", x: -64, z: -320 }
  ],
  extractionPoints: [
    { id: "metro_north", name: "北部地铁口", x: 0, z: 420 },
    { id: "bridge_east", name: "东部断桥", x: 420, z: 0 },
    { id: "tunnel_south", name: "南部隧道", x: 0, z: -420 },
    { id: "rail_west", name: "西部铁路", x: -420, z: 0 },
    { id: "hospital", name: "医院停机坪", x: 260, z: 260 },
    { id: "factory", name: "废厂后门", x: -260, z: -260 },
    { id: "checkpoint", name: "公路检查站", x: 260, z: -260 },
    { id: "sewer", name: "下水道出口", x: -260, z: 260 }
  ],
  mobPool: [
    { key: "mutant", weight: 35 }, { key: "heavy", weight: 28 },
    { key: "spitter", weight: 22 }, { key: "raider", weight: 15 }
  ],
  bossPool: [
    { id: "apoc_boss:fog_man", weight: 26, urbanLegend: true },
    { id: "apoc_boss:goatman", weight: 22, urbanLegend: true },
    { id: "apoc_boss:siren_head", weight: 18, urbanLegend: true },
    { id: "apoc_boss:mutant_zombie", weight: 10 },
    { id: "apoc_boss:mutant_skeleton", weight: 8 },
    { id: "apoc_boss:mutant_lobber", weight: 6 },
    { id: "apoc_boss:mutant_drowned", weight: 4 },
    { id: "apoc_boss:mutant_enderman", weight: 3 },
    { id: "apoc_boss:mutant_iron_golem", weight: 3 }
  ]
});
