# Shield grip correction, private 3.14.0 integration

## Scope and changes

Both `test_gun:riot_shield` and `test_gun:flash_shield` keep their geometry, UVs, texture bytes, dimensions, identifiers and gameplay unchanged. Four resource files change: the two attachable definitions and the shared shield/holder animations.

The previous first-person attachable used the same offset and rotation in both slots. Its holder animation added only a small X rotation, leaving the offhand without a first-person placement. It also translated the shield independently while guarding/running. Those are definite animation inconsistencies; this environment did not measure their distance on a running client.

The fix provides separate main/offhand first-person transforms and mirrored holder poses. Each shield holder animation overrides only its own arm and item bone. Resetting that item bone prevents a vanilla item-only swing/bob from separating it from the arm. Guard and sprint translations move the whole arm and bound shield together. Main-hand attacks use a small full-arm thrust; an offhand shield does not copy the other hand's attacks. Third-person arm pitch and shield compensation keep the plate upright while maintaining handle contact. The player's body, opposite arm, firearm state, reload state and gameplay scripts are unchanged.

The source handle cube spans `[-0.1,18.7,2.5]` through `[2.1,25.7,3.5]`; its midpoint is `[1,22.2,3]`. The bone pivot remains `[1,15.5,3]`. The 6.7-unit difference is a rotation lever arm, **not** an observed in-game hand gap. Each attachable transform compensates this lever arm to the same bound-item contact reference `[0,24,2]` used by the pack's existing held-item rig. No mesh is moved or resized.

## Reproduce offline checks

From the add-on directory:

- `python tests/test_shield_grip.py`
- `python tests/test_shield_grip.py --baseline /path/to/prior/addon --compat /path/to/pose_compat_1.1.1`
- `node tests/validate_test_guns.mjs`
- `python tools/preview_shield_grip.py --baseline /path/to/prior/addon --output shield_grip_reference.png`

The test uses Python's standard library. The preview additionally needs NumPy and Pillow and reads the actual geometry and texture files, not an invented replacement model. The reference mannequin has simple colors, not the user's skin. It is a software-rendered rig study, **not** a Minecraft screenshot. Its first-person camera is illustrative, not a promise of matching the game's FOV.

4032 combinations cover both shields, both hands, both perspectives, standard/slim anchor heights, 21 guard blends, three sprint values and four attack phases. The maximum numerical contact error in this offline rig was below `2e-9` model units. The check validates the formulas and resource wiring, not the engine's renderer or Molang implementation. Original shield model and texture bytes were compared with the integration baseline and remained identical.

## Pack compatibility

The existing Apocalypse + Test Guns Pose Compatibility **1.1.1** player entity has the four shield animation aliases and `tg3d_guard` smoothing already required by this fix. It does not override the changed shield animations or attachables. No compatibility-pack update or UUID change is needed. Its top-priority placement remains required when used with the packs it bridges. Guns alone retains the same aliases and triggers.

Unknown higher-priority packs replacing `player.entity.json`, the player controller, these shield animation IDs or these attachables can still override the fix. No claim is made about arbitrary resource packs.

## Client acceptance still required

No Minecraft Bedrock client/server was available. In a copied test world, verify:

1. Both shields in mainhand and offhand; both first-person and front/back third-person views; classic and slim skins.
2. Idle, walking, sprint start/stop, guard start/stop, mainhand strike, repeated slot swapping and changing perspective.
3. Gun plus offhand shield, aiming/reloading/firing, particularly Liegui; the firearm's support hand must stay disabled while the shield occupies offhand.
4. Dual shields, shield plus vanilla items, riding/swimming/sleep/emote, touch controls, multiplayer remote-player view and resource-pack reload.
5. Default and high/low FOV, camera bob, custom/Persona skins and VR if used. These have not been visually certified.
6. Guns alone, then Guns + current Life/Apocalypse compatibility stack. Check the Content Log for Molang or missing animation errors.

If there is a remaining discrepancy, capture matching idle/guard screenshots with shield type, hand, skin arm width, FOV, Bedrock version and active pack order. Keep this build private and do not publish it as client-verified.

## Technical references

- Microsoft attachable binding and hand-slot documentation: https://learn.microsoft.com/en-us/minecraft/creator/documents/attachables
- Mojang player first-person sample: https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/animations/player_firstperson.animation.json
- Mojang classic/slim skeletons: https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/models/mobs.json
- Bound-item reference guide and offset caveat: https://wiki.bedrock.dev/items/attachables#method-2-bound-to-a-bone

The sample sources were read for reference only; no vanilla model or animation files were added to the resource pack.
