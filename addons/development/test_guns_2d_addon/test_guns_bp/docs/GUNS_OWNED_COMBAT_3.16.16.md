# Guns 3.16.16 damage ownership

Guns now owns firearm, Baizhan, rail cannon, flamethrower, PKM burn and scripted melee damage in both standalone and SAPI-enabled worlds. The authority selector always chooses the Guns-local implementation, without data-registry readiness or SAPI replies. There is no timeout fallback and no second damage attempt after rejection.

Install SAPI 2.14.18 together with this Guns version if using SAPI. That SAPI version retires the old weapon request handlers and technique observers so they cannot compete with Guns. Installing an older SAPI with new Guns is unsupported; installing new SAPI with older server-dependent Guns leaves those old weapons waiting for a service that was removed.

Safe-zone geometry does not veto Guns hits. This does not remove physical cover, teammate protection, PvP match isolation, spawn/death/transition protection, item ownership, ammunition or durability checks. Active PvP flamethrower/melee equipment remains supported only with active/ready player tags and the matching current-match item marker. Stale match copies remain unusable outside a match. Technique/heat state is reset when its context changes.

SAPI still handles non-weapon server features, including wanted accounting, land/build/explosion permissions, economy, menus, match lifecycle and team protection. Apocalypse Life temperature-related plot tags are unchanged. Native vanilla melee base damage remains native; the Guns-local techniques layer handles the same scripted additions as before.

Armor coefficients, mob-spawn armor, intrinsic drone armor, model/texture assets and the 3.16.15 Molang fixes are retained. Baizhan muzzle/collision fixes are documented separately with their focused regression tests.

Verification uses Node VM modules with mocked Minecraft APIs, complete Guns/SAPI entrypoint loading, real weapon handlers and targeted regression checks. It is not a Bedrock engine, client or multiplayer playtest. Validate safe-zone player damage, boss hits, current-match weapons and reload/weapon switching in a test world before deployment.
