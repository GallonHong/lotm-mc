# Authoritative rail projectile increment

SAPI 2.14.6 contains a new RailImpactManager. Legacy permission snapshots are not used by Guns3.16 rail damage. Neither Guns nor a result callback applies damage after receiving permission.

## Launch and flight

Server-origin `tg:rail_launch` carries nonce, issuedTick, shooterId, weaponToken, selectedSlot, sourceContext, sessionTag, origin, direction, chargeTicks and skill. No target, final damage, gravity, radius or free impact position is accepted. Source item has one shared `RAIL_ID:<token>` lore line and one player `tg_rail_session:<epoch>` tag. Private item properties stay Guns-owned. Exact current session, item, slot, combat context, matching copied PvP marker and active singleton are required throughout flight. Requests are bounded to4000 characters and12 ticks, nonce ledger4096, active projectiles128. Spawn/leave cancels prior projectiles and queued pre-leave launches.

Server owns the simulation and collision. Normal shell speed1.8blocks/tick, drag0.995, gravity0.045blocks/tick²; each tick sweeps segments at most0.5blocks, then updates velocity. Maximum path length40blocks or80ticks. Known solid/liquid obstacles cause collision; unknown chunks cancel silently. Candidate spheres cannot reach through a thin wall: both candidate-to-head and direct impact-to-head visibility are checked. Source/trajectory/target safety segments are re-read when damage commits. Straight sonic skill remains speed2, range24, radius1.3, max12unique targets, damage24, penetration50%, 24tick stun and30second cooldown. Shell and skill cadence are independent.

Profiles: charge7–19ticks=direct25/radius1/splash4;20–39=50/1.3/8;40–55=80/2.2/12. Low-charge AoE is the new requested small block-impact blast. Splash linearly falls with distance (existing minimum1 damage), uses actual collision location and LOS, and excludes the direct target to prevent direct+AoE double damage. No blocks are changed or destroyed. Missing/denied/rejected damage has no local fallback.

## Protection

Current team, active match, source/target state, region, plot, spawn and available apoc safety checks run synchronously with shared damage formulas. Ordinary-world player damage is conservatively denied because Life exposes no authoritative reverse dynamic-zone bridge, consistent with new Baizhan/flamethrower protection. Formal PvP enemies remain supported. An ordinary source cannot indirectly hurt players via a mob-held riot shield. This does not claim knowledge of another pack's private properties.

## Feedback and stun ownership

`tg:rail_launch_result {nonce,accepted,protocol:1}` reports launch acceptance. `tg:rail_impact_result` reports authoritative dimension/location/collision/hits/feedback and optional done. Only real collision results play explosion sound/particles. A range expiry is collision:false; missing chunks do not simulate an explosion. Direct impact is emitted once. Feedback uses the existing Baizhan measured-event collector: begin before actual damage, capture native entityHurt, finish accepted hit, consume one tick later. It contains real event damage or a conservative readable health-loss fallback; no guessed lethal values. Guns matches source, session and nonce and deduplicates native numbers.

SAPI sonic stun owns private `sapi_rail_stun_v1` and shared `tg:rail_stun_owner:sapi`. Guns recognizes the shared marker and never removes another pack's stun lease. SAPI persists restoration debt before disabling movement, restores previous enabled movement after24ticks/expiry, preserves preexisting disabled movement and defers restoration while downed/dead/admission rules own the lock. Persisted lease is recovered after reconnect. The shared `tg:rail_stunned` still blocks existing weapon inputs.30second skill cooldown remains independently persisted in each pack; no switching/reconnecting reset.

## Verification

`node tests/test_rail_impact.mjs` runs real authority source plus actual geometry/region/match/stun helpers, with Bedrock and final DamageHandler mocked. It covers19+ groups including gravity, exact profile data, blockAoE, thin-wall sphere leak, high-speed sweep, unknown chunks, session/replay/cadence, current protection, PvP, no false feedback, sonic behavior, expiry and reconnect. Separate shared-damage and independent cross-pack audits cover real damage/transport. This is offline validation, not a Minecraft client/server run.
