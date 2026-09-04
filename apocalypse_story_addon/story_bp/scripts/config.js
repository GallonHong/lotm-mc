/**
 * 主世界集结点占位坐标。正式部署时可以直接修改这里，也可以让管理员
 * 站在目标位置输入：/scriptevent story:set_entry here
 */
export const STORY_CONFIG = Object.freeze({
  version: "0.1.0",
  stateKey: "apoc_story:tutorial:v1",
  entryOverrideKey: "apoc_story:entry:v1",
  dailyHeartbeatKey: "interop:daily_events_heartbeat",
  dailyHeartbeatMaxAgeMs: 30000,
  tutorialDungeonId: "newcomer_valley",
  entry: {
    dimensionId: "minecraft:overworld",
    x: 0,
    y: 80,
    z: 0,
    radius: 8
  },
  objectiveReminderTicks: 6000
});
