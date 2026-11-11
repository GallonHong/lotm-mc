/** Guns is the sole authority for its scripted weapon damage.
 * SAPI presence, startup timing and service replies never select damage paths.
 * This is not a timeout fallback: a hit is attempted once by Guns and cannot
 * also be sent to a second damage service. Team/PvP/state checks remain in
 * the local engines. Pair with SAPI 2.14.18+ to retire its legacy observers.
 */
export function combatAuthority() {
 return 'local';
}
