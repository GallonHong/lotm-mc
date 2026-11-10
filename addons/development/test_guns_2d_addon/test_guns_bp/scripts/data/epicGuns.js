/** Additive epic variants. Values are fractions, ticks and individual rounds. */
export const EPIC_GUNS = Object.freeze({
 scar: 'test_gun:scarh_stripper', relay: 'test_gun:mp5k_relay', finale: 'test_gun:python_finale',
 scarBasePenetration: 0.45, scarPenetrationPerHit: 0.07, scarMaxBonusHits: 5,
 scarWindowTicks: 40, maxTrackedShooters: 256,
 finaleHealthThreshold: 0.35, finaleMultiplier: 1.75,
 relayMinRounds: 2, relayMaxRounds: 4
});
export const EPIC_BLUEPRINT_DROPS = Object.freeze({
 'minecraft:ravager': Object.freeze({ item: 'test_gun:blueprint_scarh_stripper', chance: 0.12 }),
 'minecraft:evocation_illager': Object.freeze({ item: 'test_gun:blueprint_python_finale', chance: 0.10 })
});
