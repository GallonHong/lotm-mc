/** Authoritative tunables. Ticks assume the normal Bedrock 20 TPS clock.
 * The unrequested burn magnitude is deliberately conservative: 1 HP / 0.5 s.
 * Independent source-target burns refresh one duration; they never multiply
 * stacks and never call vanilla fire APIs or the unrelated PKM burn module. */
export const FLAMETHROWER = Object.freeze({
 id: 'test_gun:flamethrower', ammoId: 'test_gun:high_pressure_fuel',
 range: 7, halfAngleDegrees: 25, interval: 4, damage: 4,
 capacity: 60, reloadTicks: 60, armorPenetration: 0.15,
 heatThreshold: 5, heatExpiryTicks: 30, burnTicks: 80,
 burnInterval: 10, burnDamage: 1,
 guardTicks: 12, maxReplay: 4096, maxSources: 4096, maxHeatEntries: 8192,
});
export const FLAMETHROWER_GUN = Object.freeze({
 id: FLAMETHROWER.id, name: '喷火器', tier: 'epic', type: 'special',
 isFlamethrower: true, hasSkill: false, noHealthFallback: true,
 disableCritical: true, disableHeadshot: true,
 fixedArmorPenetration: FLAMETHROWER.armorPenetration,
 stats: Object.freeze({ damage: FLAMETHROWER.damage, headshotMultiplier: 1,
  armorPenetration: FLAMETHROWER.armorPenetration, damageDropOff: 0,
  maxRange: FLAMETHROWER.range }),
});
export function inFlameCone(origin, direction, target) {
 const x=target.x-origin.x,y=target.y-origin.y,z=target.z-origin.z;
 const length=Math.hypot(x,y,z),d=Math.hypot(direction.x,direction.y,direction.z);
 return Number.isFinite(length)&&Number.isFinite(d)&&d>0&&length<=FLAMETHROWER.range+1e-8&&
  (length<1e-8||(x*direction.x+y*direction.y+z*direction.z)/(length*d)>=Math.cos(FLAMETHROWER.halfAngleDegrees*Math.PI/180)-1e-10);
}
