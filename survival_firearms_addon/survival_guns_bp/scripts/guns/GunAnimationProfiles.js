/**
 * TEMP_DEADZONE_ASSET visual adapter.
 *
 * Core gun logic refers only to these semantic states. Replacing the temporary
 * DeadZone animations later requires editing this mapping and RP bindings, not
 * GunController, ReloadManager, damage, ammo, or crafting logic.
 */
export const GUN_ANIMATION_PROFILES = Object.freeze({
  pistol: Object.freeze({
    equip: "animation.pistol.draw",
    idle: "animation.pistol.hold",
    fire: "animation.m1911.shoots",
    ads: "animation.pistol.aim",
    sprint: "animation.pistol.sprint",
    reload: "animation.pistol.reload_full",
    swim: "animation.pistol.waist"
  }),
  rifle: Object.freeze({
    equip: "animation.guns.draw",
    idle: "animation.guns.hold",
    fire: "animation.ak47.shoots",
    ads: "animation.guns.aim",
    sprint: "animation.guns.sprint",
    reload: "animation.ak.reload_full",
    swim: "animation.guns.back"
  }),
  smg: Object.freeze({
    equip: "animation.guns.draw",
    idle: "animation.guns.hold",
    fire: "animation.mp5.shoots",
    ads: "animation.guns.aim",
    sprint: "animation.guns.sprint",
    reload: "animation.slap.reload_full",
    swim: "animation.guns.back"
  }),
  shotgun: Object.freeze({
    equip: "animation.guns.draw",
    idle: "animation.guns.hold",
    fire: "animation.m870.shoots",
    ads: "animation.guns.aim",
    sprint: "animation.guns.sprint",
    reload: "animation.pump_8.reload",
    swim: "animation.guns.back"
  })
});

export function getGunAnimationProfile(profileId) {
  return GUN_ANIMATION_PROFILES[profileId] || null;
}
