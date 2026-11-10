# Flamethrower protocol 1

This is an additive SAPI increment based on 2.14.5. Existing Baizhan authority,
its damage dependency closure, and unrelated features are not replaced.

## Input and authorization

Guns sends server-origin, no source entity/block script events, maximum 4,000
characters. Both packets contain nonce, issuedTick, shooterId, weaponToken,
selectedSlot, sourceContext, sessionTag. Pulse additionally contains origin
and direction. Packet lifetime is 12 ticks. The nonce ledger is bounded to
4,096 and does not evict live entries to make room for another request.

- `tg:flamethrower_state` -> `tg:flamethrower_state_result` with nonce, ready,
  protocol: 1 and checkedTick. This checks the current source and safe origin,
  does not damage anything and is not future permission to damage.
- `tg:flamethrower_pulse` -> `tg:flamethrower_result` with nonce, accepted,
  applied and hits. accepted means current source/aim checks passed, applied
  means at least one target accepted real damage, hits is that target count.
  Empty shots can have accepted:true and applied:false.

Both paths validate the current held `test_gun:flamethrower`, exactly one
`FT_ID:<token>` shared lore marker, exactly one matching
`tg_flamethrower_session:<epoch>` player tag, slot, source combat context,
life/state, active match singleton and PVP_MATCH copy marker. ItemStack dynamic
properties are private to each BP and are never read cross-pack.

The actual pulse cone uses the current head position and current normalized
view, never caller damage/targets. The sent origin must be within eight blocks of that head as a transport
sanity bound, and the submitted direction must be finite and nonzero. Turning
during delivery is valid: only the current view defines the actual cone.
The eight-block bound does not extend the seven-block damage range. Pulse cadence uses monotonically increasing issuedTick, separated by at
least four ticks per player. Delivery jitter does not lose legitimate pulses.
Older/reordered or too-fast valid-source packets receive accepted:true,
hits:0, skipped:true, reason:cadence. Twelve-tick TTL permits at most four
previously issued pulses to catch up at one instant, never an unlimited burst.

## Damage and thermal erosion

Authoritative constants are in data/flamethrowerRules.js. Every valid living
target's head-point within seven blocks and 25 degrees of the view receives
its own full base 4 HP; total cone width is 50 degrees. A broad feet-based
query expands to 11 blocks before this exact head-point geometry test. No
arbitrary per-pulse target count cap splits or reduces damage. Per-target
line of sight, team, current region, plot, spawn and bridged zone checks are
made immediately before the existing mirrored DamageHandler runs.

Critical and headshot multipliers are disabled; armor penetration is fixed at
15%. Existing equipment damage bonuses, armor reduction, minimum 1 HP and
combat integration still apply. No native fire or block mutation is used.

Successful direct damage adds one heat layer for that shooter-target pair.
At five layers the burn lasts 80 ticks, with 1 base HP each 10 ticks. The user
did not specify burn magnitude; 1 HP per 0.5 seconds is an explicit, adjustable
conservative default. Continuous hits refresh one burn duration without
creating multiple timers. Heat clears 30 ticks after the last valid hit.
Independent shooters have independent pairs. The weapon never invokes PKM
burn logic and never causes PKM third-tick detonation.

Every burn tick revalidates source, item/session, life, match, target, team,
same dimension and all current protection segments. Established burns follow
their server-recorded target for four seconds even after leaving seven-block
range or moving behind ordinary solid cover. Turning away or releasing fire
while retaining the item/session also preserves the burn. Switching weapons,
death, logout, dimension change or entering/crossing protected space cancels
it. No client can supply a free-standing burn target.

Sessions must persist on trigger release but be revoked on weapon/slot/context
change, leave, death and respawn. SAPI additionally invalidates pre-leave and
pre-spawn packets and clears matching heat. Replay/source/leave maps expire;
heat records expire or are cleared and are bounded to 8,192 pairs. At that
extreme cap, direct per-target damage remains intact, but a newly encountered
pair does not accumulate heat until capacity frees. metrics.heatSaturated
records this exceptional condition. Sources/replay cap at 4,096 and deny
new requests at saturation rather than dropping live protections.

## Protection limitations inherited from 2.14.5

Ordinary-world player targets are refused because the installed Life package
has no authoritative reverse dynamic-zone bridge. Formal SAPI PvP enemies and
eligible mobs/vehicles are supported. Ordinary-player attacks against a mob
holding the riot reflection shield are also refused to avoid indirect player
damage. No claim is made to access another BP's private dynamic properties.

## Verification

Run tests/test_flamethrower_hit.mjs for geometry, concurrent targeting, cadence,
identity, replay, handshake, heat/burn timing and all safety checks using the
actual module with API doubles. Run --experimental-vm-modules with
 tests/test_flamethrower_damage.mjs for the actual damage dependency closure.
Existing Baizhan tests remain applicable. These are offline simulations, not
Bedrock client/server runtime or performance certification. Actual script-event
source metadata, game input, rendering/audio and tick-load behavior still need
an in-game acceptance pass.
