> Historical implementation reference. Since SAPI 2.14.18, SAPI weapon adapters are not loaded or registered. Guns owns weapon damage and intrinsic drone armor. See DAMAGE_OWNERSHIP_2.14.18.md.

# Rail projectile authority: Guns 3.16.11 / SAPI 2.14.14

Guns-only worlds use local rail authority. If SAPI is installed, RailImpactManager owns damage; Guns only simulates flight visuals and displays confirmed results. A delayed or missing service never causes local damage fallback. Legacy permission snapshots are not the active damage path.

## Launch and flight

Server-origin `tg:rail_launch` carries nonce, issuedTick, shooterId, weaponToken, selectedSlot, sourceContext, sessionTag, origin, direction, chargeTicks and skill. No target, final damage, gravity, radius or free impact position is accepted. The item has one shared `RAIL_ID:<token>` lore line and the player one `tg_rail_session:<epoch>` tag. Private item properties stay Guns-owned. Current session, item, slot, combat context, PvP marker and active match are checked throughout flight. Requests are bounded to 4,000 characters and 12 ticks, the replay ledger to 4,096 entries and active shots to 128. Spawn/leave cancels old projectiles and queued pre-leave launches.

The normal shell retains speed 1.8 blocks/tick, drag 0.995 and gravity 0.045 blocks/tick squared. Swept segments are at most 0.5 blocks. The shared grenadeFlight helper follows the actual M79/MGL launcher approach: live entity collision-box rays, native block rays and endpoint-cell contact. The center plus four rim rays span a 0.25-block shell. Native ray failure uses the existing block tracer and a fresh whole-body query. Walls win collision ties. Block impacts use a 0.04-block outward offset so effects and blast checks do not begin inside the floor.

At the increased 56-block travel or unchanged 80-tick lifetime limit, a loaded shell detonates once as a fuse. Unknown/unloaded chunks cannot fabricate an explosion. These launchers use scripted ballistic flight rather than native projectile entity callbacks; no second projectile damage source was introduced.

Charge profiles (base HP, before armor and shields):
- 7–19 ticks: direct 45, radius 3.5, splash base 36, no slow.
- 20–39 ticks: direct 90, radius 5.5, splash base 72, Slowness III for 60 ticks (3 seconds).
- 40–55 ticks: direct 150, radius 7.5, splash base 120, Slowness IV for 80 ticks (4 seconds).
- Charge timing, 56-tick vent limit, ammunition cost and 12-tick shot recovery are unchanged.

The previous full-charge splash base was only 12: at 2 blocks it was 6 HP before armor/shield reduction, explaining single-digit damage. Splash now deals full base damage inside 35% of its radius, then tapers linearly to a 40% base floor at the outer edge. Outside that radius it is zero. These are pre-mitigation values; heavy armor and raised shields still reduce the result. Mid/full charge slow is applied to both the direct target and every accepted splash victim only after damage is accepted, never through cover, after rejection or on protected/downed/dead targets. A stronger active slow/stun is not replaced, and a same-strength longer effect is not shortened. It excludes the directly hit entity, preventing direct-plus-splash double damage. Both ballistic direct and splash visibility use the nearest vertical body point; an exposed torso is no longer rejected solely because the head is behind an overhang. Walls still block damage. Impact consumes the shot before damage/feedback callbacks and cannot commit twice. No terrain changes or native explosion damage are created.

The separate through-wall sonic skill retains speed 2, penetration 50%, stun-immunity 3 seconds and cooldown 30 seconds. Its range increases to 36, radius to 2.8, unique-target cap to 18, damage to 72 and stun duration to 36 ticks (1.8 seconds). Its broad target query is enlarged alongside the actual hit radius. Shell and skill cadence are independent.

## Protection

Current team, match, source/target life and spawn/admission protections remain. In ordinary play, geographical safe regions do not block player mutual combat, as in the delivered baseline. Formal matches still require valid enemy participants. Geographic source/trajectory/target protection remains for mobs, and the existing mob-held riot shield restriction remains. No code assumes another behavior pack's private dynamic properties are shared.

## Feedback and stun ownership

`tg:rail_launch_result` reports acceptance. `tg:rail_impact_result` reports authoritative position, dimension, damage feedback and completion. Detonation receipts distinguish `detonation`, `collision`, `reason` (`block`, `entity`, `range`, `fuse`) and `surface`. Receipts include server-owned `radius` and `slowTicks`; clients use those fields for the footprint and slow ring, so an older server does not falsely show the new slow. Both contact and fuse bursts show effects once; only actual block contact draws the finite ground ring. A vanilla huge-explosion emitter is a fallback if custom rail particles fail, without applying native explosion damage. Added finite local emitters provide a radius-scaled blast flash and expanding shock ring, 56 outward sparks, 16 smoke-plume particles and a 24-emitter ground rim. An expanding 72-particle spherical light shell makes the upper and lower volume visible; charged slow adds 56 blue sparks distributed over the spherical boundary, rather than a flat disc. The sonic skill emits wide blue shock rings. No looping emitters, extra damage source, terrain edits or native fire are introduced, and existing shot/charge/impact sounds are unchanged.

Damage feedback uses the existing Baizhan measured-event collector: begin before damage, capture native entityHurt, finish the accepted hit and consume the record on the deferred callback. It reports native event damage or readable health loss rather than guessed lethal damage. Guns verifies source/session/nonce and deduplicates receipts.

SAPI sonic stun owns `sapi_rail_stun_v1` and the shared `tg:rail_stun_owner:sapi` marker. Guns does not remove another pack's stun lease. Restoration debt is saved before disabling movement, restored after expiry only when other life-state rules permit, and recovered after reconnect. The 30-second skill cooldown remains persisted independently in each pack.

## Entity-impact isolation and three-dimensional blast

Entity contact and block contact both enter the same one-shot explosion path. The blast uses Euclidean x/y/z distance to the nearest point on each target's vertical body. Damage and slow occupy a sphere, not an infinite cylinder or a horizontal plane. Exposed enemies above and below are valid; walls and solid floors/ceilings still block line of sight. The damage radius, damage profile and armor/shield calculations are unchanged by this fix.

Before direct damage runs any native death or cleanup callbacks, both packs capture eligible nearby candidates. Each candidate has independent validity/geometry handling, and source/target protection, current dimension, current radius and cover are checked again before committing its damage. Direct-hit IDs are excluded from splash, and each other ID is considered once. Failed candidates cannot cancel remaining victims or suppress the impact receipt.

A regression reproduces a definite defect in SAPI 2.14.13: an invalid query candidate caused an uncaught location read before filtering, after the shot had been consumed. The test shows direct damage succeeding while subsequent splash and the receipt abort. Direct-target death alone was separately tested and is not sufficient to reproduce this defect. Without a live game trace, the user's exact trigger remains unconfirmed.

## Verification

The companion Guns source includes `tests/rail_balance.test.mjs` and `tests/rail_entity_blast.test.mjs`. The latter retains an unchanged SAPI 2.14.13 module fixture and tests the real flight → collision → impact path in both authority modes, including lethal direct damage, stale candidates, moving targets, direct damage rejection, duplicate receipts, upper/lower layers, diagonal boundaries, walls and floor/ceiling cover. Run it with Node and, if needed, pass this SAPI pack's absolute `scripts` directory as the first argument. It covers local/authoritative tuning parity, charge boundaries, inner/edge splash, one-shot commits, accepted-hit slow, rejection/cover/team/life-state protection, unchanged collision helper behavior, and finite visual emitters with existing textures. These are mocked Script API checks, not a Bedrock client/server gameplay or rendering run. Both packs must be updated together to obtain the new authoritative balance in SAPI worlds; an old server retains its own older damage numbers and no local fallback is attempted.
