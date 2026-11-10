import { ItemStack, system } from '@minecraft/server';
import { EPIC_BLUEPRINT_DROPS } from '../data/epicGuns.js';
import { isPvpParticipant } from './utils/pvpRules.js';

/** Additive survival drops; leaves all vanilla / other-pack loot tables untouched. */
export class EpicBlueprintLoot {
 static seenDeaths = new Map();
 static onDeath(event) {
  const target = event.deadEntity, killer = event.damageSource?.damagingEntity;
  const rule = EPIC_BLUEPRINT_DROPS[target?.typeId];
  if (!rule || killer?.typeId !== 'minecraft:player' || isPvpParticipant(killer) || isPvpParticipant(target)) return false;
  const now = system.currentTick;
  for (const [id, tick] of this.seenDeaths) if (now - tick > 200) this.seenDeaths.delete(id);
  if (this.seenDeaths.has(target.id) || this.seenDeaths.size >= 256) return false;
  this.seenDeaths.set(target.id, now);
  if (Math.random() >= rule.chance) return false;
  try {
   target.dimension.spawnItem(new ItemStack(rule.item, 1), target.location);
   return true;
  } catch (error) {
   // No retry: an uncertain spawn must not duplicate a rare blueprint.
   console.warn('[Test Guns] Epic blueprint drop failed:', error);
   return false;
  }
 }
}
