/** PKM sulfur burn is scripted, attributed damage, not native setOnFire damage. */
export const PKM_BURN = Object.freeze({
 hitsToIgnite: 5,
 hitWindowTicks: 40,
 maxHitGapTicks: 12,
 maxPrimedTargets: 512,
 durationTicks: 80,
 intervalTicks: 10,
 damagePerTick: 2,
 burstAfterTicks: 30,
 burstDamage: 8,
 maxSourcesPerTarget: 4,
 maxActiveBurns: 256,
 guardTimeoutTicks: 10
});
