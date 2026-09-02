export const EVENT_TEMPLATES = Object.freeze({
  infected_attack: {
    name: "感染者围攻",
    rewardId: "event_infected_attack",
    weight: 40,
    mode: "waves",
    waves: [
      [{ mobKey: "basic", count: 6 }],
      [{ mobKey: "basic", count: 6 }, { mobKey: "runner", count: 3 }],
      [{ mobKey: "mutant", count: 2 }]
    ]
  },
  survivor_rescue: {
    name: "幸存者救援",
    rewardId: "event_survivor_rescue",
    weight: 20,
    mode: "rescue",
    waves: [[{ mobKey: "basic", count: 5 }, { mobKey: "runner", count: 3 }]]
  },
  raider_ambush: {
    name: "掠夺者伏击",
    rewardId: "event_raider_ambush",
    weight: 25,
    mode: "waves",
    waves: [[{ mobKey: "raider", count: 4 }]]
  },
  crashed_convoy: {
    name: "坠毁运输车防守",
    rewardId: "event_crashed_convoy",
    weight: 15,
    mode: "defense",
    defenseTicks: 1800,
    waveAtTicks: [20, 600, 1200],
    waves: [
      [{ mobKey: "basic", count: 5 }],
      [{ mobKey: "basic", count: 5 }, { mobKey: "runner", count: 2 }],
      [{ mobKey: "mutant", count: 2 }, { mobKey: "heavy", count: 1 }]
    ]
  }
});

export function chooseTemplate(allowedIds) {
  const entries = (allowedIds || Object.keys(EVENT_TEMPLATES)).map(id => [id, EVENT_TEMPLATES[id]]).filter(([, value]) => value);
  const total = entries.reduce((sum, [, value]) => sum + Number(value.weight || 1), 0);
  let roll = Math.random() * total;
  for (const [id, value] of entries) {
    roll -= Number(value.weight || 1);
    if (roll <= 0) return id;
  }
  return entries[0]?.[0] || "infected_attack";
}
