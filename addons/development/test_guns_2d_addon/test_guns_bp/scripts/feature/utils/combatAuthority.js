import * as Minecraft from '@minecraft/server';

// Optional integration is selected from the world's loaded DATA registries,
// not a script reply, heartbeat, timer or cross-BP dynamic property. Those
// cannot distinguish an absent add-on from a slow/broken installed add-on.
const SAPI_ENTITIES = ['sapi:secure_safe', 'sapi:pvp_hud'];
const SAPI_ITEMS = ['sapi:menu_compass', 'sapi:secure_safe_deployer', 'sapi:player_vending_machine_deployer'];
let serverSeen = false;

/** 'local': registries positively establish the standalone Guns configuration.
 * 'server': SAPI data is loaded, even if its script has never answered.
 * 'blocked': registry unavailable/unready/error; this is NEVER absence.
 * Once present, authority stays server-owned until the world/script reloads.
 * Gameplay states must capture this value and cancel when it changes. */
export function combatAuthority() {
 if (serverSeen) return 'server';
 try {
  const entities = Minecraft.EntityTypes, items = Minecraft.ItemTypes;
  if (typeof entities?.get !== 'function' || typeof items?.get !== 'function') return 'blocked';
  // A positive marker is conclusive even during partial registry startup.
  for (const id of SAPI_ENTITIES) if (entities.get(id)) { serverSeen = true; return 'server'; }
  for (const id of SAPI_ITEMS) if (items.get(id)) { serverSeen = true; return 'server'; }
  // Verify native data is queryable before treating an
  // undefined optional ID as absence. Any exception fails closed and retries.
  if (!entities.get('minecraft:player') || !items.get('minecraft:stone')) return 'blocked';
  return 'local';
 } catch { return 'blocked'; }
}
