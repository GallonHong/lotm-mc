// Exact Baizhan definition mirrored from Test Guns data/guns.js.
export const BAIZHAN_GUN = Object.freeze({
  id: 'test_gun:baizhan', name: '百战', tier: 'legendary', type: 'lmg',
  mode: 'auto', maxAmmo: 100, initialAmmo: 0, fireRate: 4, shootPower: 14,
  recoil: 0.30, reloadTime: 80, shootSound: 'test_gun.pkm_shoot',
  ammoTypeId: 'test_gun:ammo_belt_100', projectileTypeId: 'test_gun:bullet_rifle',
  isBaizhan: true, hasSkill: false,
  stats: { damage: 27, headshotMultiplier: 1.5, armorPenetration: 0.42, damageDropOff: 0.008, maxRange: 80, knockback: { x: 0.3, y: 0.1 } }
});
