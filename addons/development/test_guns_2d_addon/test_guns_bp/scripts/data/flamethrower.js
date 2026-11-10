/** Each unit lasts 4 ticks: 60 units = 240 ticks (12 seconds at 20 TPS). */
export const FLAMETHROWER = Object.freeze({
 id:'test_gun:flamethrower', ammoId:'test_gun:high_pressure_fuel', visualIndex:30,
 capacity:60, intervalTicks:4, range:7, coneDegrees:50, damage:4, armorPenetration:0.15,
 reloadTicks:60, maxHoldTicks:240, guardTicks:12, maxPending:256,
 heatThreshold:5, heatResetTicks:30, burnTicks:80, burnIntervalTicks:10, burnDamage:1,
});
export function flameContext(entity) {
 try { return JSON.stringify([entity.dimension.id,entity.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||['apoc:downed','apoc_downed','apoc:true_death'].includes(t)).sort()]); }
 catch { return null; }
}
