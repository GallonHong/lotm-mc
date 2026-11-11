import { world, EquipmentSlot } from '@minecraft/server';
import { CombatTechniques } from './combatTechniques.js';

// Base totals, for documentation and input identification only. Item components
// add 10/18/9 to the ordinary player's native 1 damage. No scripted left damage.
export const LEFT_MELEE = Object.freeze({
 'test_gun:salvage_cleaver': { nativeBaseDamage: 11 },
 'test_gun:breach_hammer': { nativeBaseDamage: 19 },
 'test_gun:pulse_spear': { nativeBaseDamage: 10 }
});

/** Observe input only so attacking ends a technique guard. Native damage does
 * not call modifyHit: no scripted penetration, combos, extra hit or parry refund.
 * Protection belongs to existing combat/match handlers; API 1.15 has no native
 * before-entityHurt cancellation. An after-event cannot prevent a lethal hit.
 */
export class MeleeLeftManager {
 static registered = false;
 static observe(event) {
  const player = event?.damagingEntity;
  if (player?.typeId !== 'minecraft:player') return;
  try {
   const item = player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand);
   if (LEFT_MELEE[item?.typeId]) CombatTechniques.noteAttack(player);
  } catch {}
 }
 static registerEvents() {
  if (this.registered || !world.afterEvents?.entityHitEntity?.subscribe) return;
  world.afterEvents.entityHitEntity.subscribe(event => this.observe(event));
  this.registered = true;
 }
}
