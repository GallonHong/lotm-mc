# SAPI 2.14.18: Guns-owned combat

- SAPI main no longer imports or registers Baizhan, flame, rail, rail permission, melee techniques or left-melee observer adapters. Their registration entrypoints are defensively disabled. Historical source is retained, but none of these modules or vendored damage/armor listeners is reachable from the manifest entrypoint.
- Guns must provide all firearm and melee damage, special attacks, melee techniques, armor wear and intrinsic drone armor. Upgrade Guns together with this pack. Older Guns versions waiting on SAPI responses are not compatible.
- Plot-safe tag broadcasting is preserved byte-for-byte because Apocalypse Life consumes it for survival temperature protection, not Guns weapon damage. Plot geometry remains available for claims, location display and wanted rules.
- Existing region code already contains no geographical player-damage interception or safe-zone healing. No blanket effect removal is added: it could erase intentional match spawn protection or unrelated survival/armor effects.
- Team/match protections, wanted crime accounting, match rescue/respawn protection, secure-safe virtual durability, blocks/land/explosion protection, economy, shops and menus remain intact.
- Team fallback healing after native damage is retained from the baseline; it cannot undo lethal hits on runtimes without a cancelable before-hurt event. Guns must perform its own team/match checks before applying scripted damage.
- Validation: mocked combat event regression tests and plot-publisher preservation, active import graph isolation, JSON parsing and JavaScript syntax checks. Not a Bedrock multiplayer playtest.
