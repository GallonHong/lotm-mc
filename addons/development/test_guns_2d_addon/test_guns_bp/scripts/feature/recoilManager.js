import { EquipmentSlot, system } from '@minecraft/server';
import { nextSprayState, spreadProfile, sampleSpreadDirection } from './utils/spreadUtils.js';

// Historical name retained; recoil now affects bullet directions only.
export class RecoilManager {
  static sprayHeat = new Map();

  static beginShot(player, gun) {
    const state = nextSprayState(this.sprayHeat.get(player.id), system.currentTick, gun.id);
    this.sprayHeat.set(player.id, state);
    let mobPants = false;
    if (player.isSneaking) {
      try {
        const legs = player.getComponent?.('minecraft:equippable')?.getEquipment(EquipmentSlot.Legs);
        mobPants = Boolean(legs?.typeId.includes('armor_mob_pants'));
      } catch {}
    }
    return spreadProfile(gun.recoil, state.count, {
      sneaking: player.isSneaking, sprinting: player.isSprinting,
      falling: player.isFalling, climbing: player.isClimbing, mobPants
    });
  }

  static getShotDirection(player, gun, viewDirection, profile, pellet = false, random = Math.random) {
    return sampleSpreadDirection(viewDirection, profile ?? this.beginShot(player, gun), pellet, random);
  }

  static clearPlayer(playerId) {
    this.sprayHeat.delete(playerId);
  }
}
