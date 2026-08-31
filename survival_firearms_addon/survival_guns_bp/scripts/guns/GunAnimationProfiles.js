/**
 * Original model-family metadata.
 *
 * Version 2 intentionally has no scripted player actions. The attachables own
 * their static hold pose, while firing/reload feedback comes from audio, HUD,
 * particles, and the item-use state machine.
 */
export const GUN_ANIMATION_PROFILES = Object.freeze({
  pistol: Object.freeze({ family: "pistol" }),
  rifle: Object.freeze({ family: "rifle" }),
  smg: Object.freeze({ family: "smg" }),
  shotgun: Object.freeze({ family: "shotgun" })
});

export function getGunAnimationProfile(profileId) {
  return GUN_ANIMATION_PROFILES[profileId] || null;
}
