export const EVENT_TEMPLATES = Object.freeze({
  infected_attack: {
    name: "感染者围攻", rewardId: "event_infected_attack", outlawRewardId: "event_infected_attack_outlaw", weight: 28, mode: "waves",
    waves: [[{ mobKey: "basic", count: 6 }], [{ mobKey: "basic", count: 6 }, { mobKey: "runner", count: 3 }], [{ mobKey: "mutant", count: 2 }]],
    outlawWaves: [[{ mobKey: "runner", count: 6 }, { mobKey: "shrieker", count: 1 }], [{ mobKey: "spitter", count: 3 }, { mobKey: "charger", count: 2 }, { mobKey: "hunter", count: 2 }], [{ mobKey: "mutant", count: 3 }, { mobKey: "heavy", count: 1 }, { mobKey: "tyrant", count: 1 }]]
  },
  survivor_rescue: {
    name: "幸存者救援", rewardId: "event_survivor_rescue", outlawRewardId: "event_survivor_rescue_outlaw", weight: 14, mode: "rescue",
    waves: [[{ mobKey: "basic", count: 5 }, { mobKey: "runner", count: 3 }]],
    outlawWaves: [[{ mobKey: "basic", count: 8 }, { mobKey: "runner", count: 5 }, { mobKey: "spitter", count: 2 }]]
  },
  raider_ambush: {
    name: "掠夺者伏击", rewardId: "event_raider_ambush", outlawRewardId: "event_raider_ambush_outlaw", weight: 18, mode: "waves",
    waves: [[{ mobKey: "raider", count: 4 }]],
    outlawWaves: [[{ mobKey: "raider", count: 5 }], [{ mobKey: "raider", count: 3 }, { mobKey: "mutant", count: 2 }]]
  },
  crashed_convoy: {
    name: "坠毁运输车防守", rewardId: "event_crashed_convoy", outlawRewardId: "event_crashed_convoy_outlaw", weight: 12, mode: "defense",
    defenseTicks: 1800, outlawDefenseTicks: 2400,
    waveAtTicks: [20, 600, 1200], outlawWaveAtTicks: [20, 600, 1200, 1800],
    waves: [[{ mobKey: "basic", count: 5 }], [{ mobKey: "basic", count: 5 }, { mobKey: "runner", count: 2 }], [{ mobKey: "mutant", count: 2 }, { mobKey: "heavy", count: 1 }]],
    outlawWaves: [[{ mobKey: "basic", count: 8 }, { mobKey: "runner", count: 3 }], [{ mobKey: "runner", count: 6 }, { mobKey: "spitter", count: 3 }], [{ mobKey: "mutant", count: 3 }, { mobKey: "raider", count: 2 }], [{ mobKey: "heavy", count: 2 }, { mobKey: "mutant", count: 2 }]]
  },
  roadblock_clearance: {
    name: "公路路障清理", rewardId: "event_roadblock_clearance", outlawRewardId: "event_roadblock_clearance_outlaw", weight: 14, mode: "waves",
    waves: [[{ mobKey: "basic", count: 4 }, { mobKey: "runner", count: 4 }], [{ mobKey: "spitter", count: 2 }, { mobKey: "mutant", count: 2 }]],
    outlawWaves: [[{ mobKey: "runner", count: 7 }, { mobKey: "spitter", count: 3 }], [{ mobKey: "mutant", count: 4 }, { mobKey: "raider", count: 3 }], [{ mobKey: "heavy", count: 1 }, { mobKey: "raider", count: 3 }]]
  },
  toxic_outbreak: {
    name: "毒液感染爆发", rewardId: "event_toxic_outbreak", outlawRewardId: "event_toxic_outbreak_outlaw", weight: 10, mode: "waves",
    waves: [[{ mobKey: "basic", count: 5 }, { mobKey: "spitter", count: 2 }], [{ mobKey: "runner", count: 3 }, { mobKey: "spitter", count: 3 }]],
    outlawWaves: [[{ mobKey: "runner", count: 5 }, { mobKey: "spitter", count: 4 }], [{ mobKey: "mutant", count: 3 }, { mobKey: "spitter", count: 4 }], [{ mobKey: "heavy", count: 1 }, { mobKey: "spitter", count: 3 }]]
  },
  mutant_nest: {
    name: "变异体巢穴", rewardId: "event_mutant_nest_outlaw", weight: 10, zones: ["outlaw"], mode: "waves",
    waves: [[{ mobKey: "runner", count: 6 }, { mobKey: "shrieker", count: 1 }], [{ mobKey: "spitter", count: 3 }, { mobKey: "charger", count: 2 }, { mobKey: "hunter", count: 2 }], [{ mobKey: "heavy", count: 2 }, { mobKey: "mutant", count: 2 }, { mobKey: "tyrant", count: 1 }]]
  },
  mercenary_blockade: {
    name: "武装封锁线", rewardId: "event_mercenary_blockade_outlaw", weight: 9, zones: ["outlaw"], mode: "waves",
    waves: [[{ mobKey: "raider", count: 5 }], [{ mobKey: "raider", count: 6 }, { mobKey: "heavy", count: 1 }]]
  },
  fog_man_hunt: {
    name: "雾中人调查", rewardId: "event_fog_man_hunt", weight: 3, zones: ["law", "outlaw"], mode: "boss",
    bossEntityId: "apoc_boss:fog_man", bossName: "§8雾中人", waves: []
  },
  goatman_hunt: {
    name: "山羊人调查", rewardId: "event_goatman_hunt", weight: 3, zones: ["law", "outlaw"], mode: "boss",
    bossEntityId: "apoc_boss:goatman", bossName: "§4山羊人", waves: []
  },
  siren_head_hunt: {
    name: "警笛头调查", rewardId: "event_siren_head_hunt", weight: 2, zones: ["law", "outlaw"], mode: "boss",
    bossEntityId: "apoc_boss:siren_head", bossName: "§4警笛头", waves: []
  },
  rebel_invasion: {
    name: "叛军进攻主城", rewardId: "event_rebel_invasion", weight: 1, zones: ["safe"], allowSafeZone: true, mode: "defense",
    objectiveEntityId: "daily:convoy_marker", objectiveName: "§a主城防线",
    defenseTicks: 1800, waveAtTicks: [20, 420, 900, 1320],
    waves: [
      [{ mobKey: "raider", count: 6 }],
      [{ mobKey: "raider", count: 8 }, { mobKey: "runner", count: 3 }],
      [{ mobKey: "raider", count: 8 }, { mobKey: "heavy", count: 2 }],
      [{ mobKey: "raider", count: 10 }, { mobKey: "charger", count: 2 }, { mobKey: "heavy", count: 2 }]
    ]
  }
});

const LEGACY_ALL = ["infected_attack", "survivor_rescue", "raider_ambush", "crashed_convoy"];

export function chooseTemplate(allowedIds, zoneType = "law") {
  const requested = !allowedIds || LEGACY_ALL.every(id => allowedIds.includes(id)) ? Object.keys(EVENT_TEMPLATES) : allowedIds;
  const entries = requested.map(id => [id, EVENT_TEMPLATES[id]])
    .filter(([, value]) => value && (zoneType !== "safe" || value.allowSafeZone === true) && (!value.zones || value.zones.includes(zoneType)));
  const total = entries.reduce((sum, [, value]) => sum + Number(value.weight || 1), 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const [id, value] of entries) {
    roll -= Number(value.weight || 1);
    if (roll <= 0) return id;
  }
  return entries[0]?.[0] || null;
}
