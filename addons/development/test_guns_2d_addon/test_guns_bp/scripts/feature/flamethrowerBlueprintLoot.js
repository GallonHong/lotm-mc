import { ItemStack, system } from '@minecraft/server';
import { isPvpParticipant } from './utils/pvpRules.js';

/** Additive player-kill loot: no vanilla or third-party loot tables overridden. */
export class FlamethrowerBlueprintLoot {
 static seenDeaths = new Map();
 static chance = 0.08;
 static onDeath(event) {
  const target = event?.deadEntity, killer = event?.damageSource?.damagingEntity;
  if (target?.typeId !== 'minecraft:blaze' || killer?.typeId !== 'minecraft:player' || isPvpParticipant(killer) || isPvpParticipant(target)) return false;
  const now = system.currentTick;
  for (const [id, tick] of this.seenDeaths) if (now - tick > 200) this.seenDeaths.delete(id);
  if (!target.id || this.seenDeaths.has(target.id) || this.seenDeaths.size >= 256) return false;
  this.seenDeaths.set(target.id, now);
  if (Math.random() >= this.chance) return false;
  try {
   target.dimension.spawnItem(new ItemStack('test_gun:blueprint_flamethrower', 1), target.location);
   return true;
  } catch (error) {
   // An uncertain spawn must not be retried and duplicate a rare blueprint.
   console.warn('[Test Guns] Flamethrower blueprint drop failed:', error);
   return false;
  }
 }
}
