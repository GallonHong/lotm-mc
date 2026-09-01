import { FireMode } from './types.js';

export const GUNS = [
  {
    id: 'test_gun:ak47',
    name: 'AK-47',
    type: 'rifle',
    mode: FireMode.AUTO,
    maxAmmo: 30,
    fireRate: 3,
    shootPower: 12.0,
    recoil: 0.22,
    reloadTime: 48,
    shootSound: 'test_gun.ak47_shoot',
    ammoTypeId: 'test_gun:ammo_rifle',
    projectileTypeId: 'test_gun:bullet_rifle',
    hasSkill: false,
    stats: {
      damage: 15.0,
      headshotMultiplier: 1.8,
      armorPenetration: 0.35,
      damageDropOff: 0.015,
      maxRange: 80,
      knockback: { x: 0.45, y: 0.2 }
    }
  },
  {
    id: 'test_gun:shotgun',
    name: 'Remington M870',
    type: 'shotgun',
    mode: FireMode.SHOTGUN,
    maxAmmo: 8,
    fireRate: 16,
    shootPower: 9.0,
    recoil: 0.55,
    reloadTime: 60,
    shootSound: 'test_gun.shotgun_shoot',
    ammoTypeId: 'test_gun:ammo_shotgun',
    projectileTypeId: 'test_gun:bullet_shotgun',
    hasSkill: false,
    stats: {
      damage: 7.5,
      headshotMultiplier: 1.5,
      armorPenetration: 0.15,
      damageDropOff: 0.05,
      maxRange: 35,
      knockback: { x: 0.75, y: 0.35 }
    }
  },
  {
    id: 'test_gun:vector',
    name: 'HK MP7',
    type: 'smg',
    mode: FireMode.AUTO,
    maxAmmo: 50,
    fireRate: 2, // 10 发/秒 (平滑可控，单点打出1发)
    shootPower: 11.0,
    recoil: 0.08,
    reloadTime: 36,
    shootSound: 'test_gun.vector_shoot',
    ammoTypeId: 'test_gun:ammo_45acp',
    projectileTypeId: 'test_gun:bullet_smg',
    hasSkill: true,
    skillName: '暴走狂潮',
    skillCooldownSec: 25,
    skillDurationSec: 5.0,
    stats: {
      damage: 5.0, // 单发真实伤害 5.0 (爆头 8.0)
      headshotMultiplier: 1.6,
      armorPenetration: 0.25,
      damageDropOff: 0.025,
      maxRange: 60,
      knockback: { x: 0.18, y: 0.1 }
    }
  },
  {
    id: 'test_gun:mgl',
    name: 'MGL 40mm',
    type: 'special',
    mode: FireMode.SEMI,
    maxAmmo: 6,
    fireRate: 10,
    shootPower: 1.45,
    recoil: 0.75,
    reloadTime: 70,
    shootSound: 'test_gun.mgl_shoot',
    ammoTypeId: 'test_gun:ammo_40mm',
    projectileTypeId: 'test_gun:bullet_grenade',
    isGrenadeLauncher: true,
    hasSkill: false,
    stats: {
      damage: 40.0,
      heSplashDamage: 45.0,
      heRadius: 6.0,
      armorPenetration: 0.50,
      maxRange: 65,
      knockback: { x: 1.2, y: 0.6 }
    }
  },
  {
    id: 'test_gun:m82',
    name: 'Barrett M82',
    type: 'sniper',
    mode: FireMode.SEMI,
    maxAmmo: 5,
    fireRate: 25,
    shootPower: 18.0,
    recoil: 0.85,
    reloadTime: 65,
    shootSound: 'test_gun.m82_shoot',
    ammoTypeId: 'test_gun:ammo_50cal',
    projectileTypeId: 'test_gun:bullet_heavy',
    hasSkill: false,
    stats: {
      damage: 75.0,
      headshotMultiplier: 1.8,
      armorPenetration: 0.75,
      damageDropOff: 0.005,
      maxRange: 120,
      knockback: { x: 1.4, y: 0.5 }
    }
  },
  {
    id: 'test_gun:arc_emitter',
    name: 'Arc Emitter',
    type: 'energy',
    mode: FireMode.SEMI,
    maxAmmo: 20,
    fireRate: 8,
    shootPower: 10.0,
    recoil: 0.15,
    reloadTime: 45,
    shootSound: 'test_gun.arc_shoot',
    ammoTypeId: 'test_gun:ammo_battery',
    projectileTypeId: 'test_gun:bullet_rifle',
    isArcWeapon: true,
    hasSkill: false,
    stats: {
      damage: 24.0,
      chainRadius: 8.0,
      maxChains: 4,
      decayRate: 0.20,
      armorPenetration: 0.40,
      maxRange: 25,
      knockback: { x: 0.3, y: 0.15 }
    }
  },
  {
    id: 'test_gun:deagle',
    name: 'Desert Eagle',
    type: 'pistol',
    mode: FireMode.SEMI,
    maxAmmo: 7,
    fireRate: 6,
    shootPower: 12.0,
    recoil: 0.45,
    reloadTime: 35,
    shootSound: 'test_gun.deagle_shoot',
    ammoTypeId: 'test_gun:ammo_50cal',
    projectileTypeId: 'test_gun:bullet_heavy',
    hasSkill: false,
    stats: {
      damage: 25.0,
      headshotMultiplier: 1.8,
      armorPenetration: 0.35,
      damageDropOff: 0.03,
      maxRange: 45,
      knockback: { x: 0.5, y: 0.25 }
    }
  }
];

export function getGunById(id) {
  return GUNS.find(g => g.id === id);
}

export function getGunByProjectile(typeId) {
  return GUNS.find(g => g.projectileTypeId === typeId);
}
