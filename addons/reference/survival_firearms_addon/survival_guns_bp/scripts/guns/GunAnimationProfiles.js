/**
 * Original model-family metadata.
 *
 * Version 2.5 intentionally has no attachables or scripted player actions.
 * Firing/reload feedback comes from 2D items, audio, HUD, particles, and the
 * item-use state machine.
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
