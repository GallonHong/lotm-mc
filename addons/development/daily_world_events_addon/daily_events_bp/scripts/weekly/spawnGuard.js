import { world, system } from "@minecraft/server";
import { protectedWeeklySlots, inWeeklySlot } from "./isolation.js";

const BOSS_TYPES = Object.freeze({ sirok: "apoc_boss:sandworm", mogathul: "apoc_boss:abomination" });
// Explicit actors, not a namespace/tag escape hatch. Several combat devices have
// health and the `mob` family, but are not ambient creatures.
const DEVICES = new Set([
 "test_gun:baizhan_mount", "sapi:secure_safe", "sapi:pvp_hud", "minecraft:armor_stand",
 "minecraft:boat", "minecraft:chest_boat", "minecraft:minecart", "minecraft:chest_minecart",
 "minecraft:hopper_minecart", "minecraft:tnt_minecart", "minecraft:command_block_minecart", "minecraft:ender_crystal",
 "ab_ve:motorcycle", "ab_ve:speedboat", "ab_ve:truck", "ab_ve:ambulance", "ab_ve:helicopter",
 "ab_ve:medical_station", "ab_ve:training_target",
 ...[
  "item_collector_drone", "summoner_drone", "crossbow_drone", "poison_drone_poison", "poison_drone",
  "water_drone", "mob_transporter_drone", "inventory_drone", "race_drone", "spy_drone", "healing_drone_heal",
  "ore_finder_drone", "mining_drone", "night_vision_drone", "tnt_launcher_drone_projectile", "tnt_launcher_drone",
  "healing_drone", "freeze_drone", "laser_drone", "lightning_strike_drone", "freeze_drone_ice", "ground_drone", "fertiliser_drone"
 ].map(id => `makercamp_dr:${id}`)
]);

function valid(entity) {
 try { return !!entity && (typeof entity.isValid === "function" ? entity.isValid() : entity.isValid === true); }
 catch { return false; }
}
function component(entity, id) {
 try { return entity.getComponent(id); } catch { return undefined; }
}

/** Native after-spawn/load callbacks cannot cancel a spawn on stable API 1.15.
 * Remove unrelated creatures without a kill, XP or loot. The one-turn deferral
 * lets the authorized spawn caller register its exact Boss ID before checking.
 * No blanket weekly tag, entity property or same-type exception is sufficient.
 */
export function createWeeklySpawnGuard({ world: gameWorld, system: scheduler, getRoom, getSlots = protectedWeeklySlots }) {
 let started = false;
 const pending = new Set();
 const api = {
  removeUnrelated(entity, slots = getSlots()) {
   if (!valid(entity)) return false;
   try {
    const slot = slots.find(value => inWeeklySlot(value, entity.dimension.id, entity.location));
    if (!slot || entity.typeId === "minecraft:player") return false;
    const room = getRoom(slot.id);
    if (room && ["starting", "active"].includes(room.state) && room.id === slot.id &&
        room.bossId === slot.id && room.bossEntityId === entity.id && entity.typeId === BOSS_TYPES[slot.id]) return false;
    if (DEVICES.has(entity.typeId) || component(entity, "minecraft:projectile")) return false;
    // Current weekly bosses do not summon creatures. If that changes, add an
    // explicit registered-child-ID contract, never a reusable tag-only bypass.
    const family = component(entity, "minecraft:type_family");
    const inFamily = value => family?.hasTypeFamily?.(value) === true;
    if (inFamily("inanimate") || inFamily("projectile")) return false;
    const health = component(entity, "minecraft:health");
    const creature = ["mob", "monster", "apoc_hostile", "apoc_boss"].some(inFamily) ||
     (health && /^(minecraft:|apoc:|apoc_boss:)/.test(entity.typeId)) ||
     entity.typeId === "sando_standalone:tornado_core" || entity.typeId === "sando_standalone:meteor";
    // Health alone is not a creature test: floating damage numbers, hitboxes,
    // loot containers and other third-party utility actors can also have it.
    if (!creature) return false;
    entity.remove();
    return true;
   } catch { return false; }
  },
  handleEntity(entity) {
   if (!valid(entity)) return;
   const id = entity.id;
   if (pending.has(id)) return;
   pending.add(id);
   scheduler.run(() => { pending.delete(id); api.removeUnrelated(entity); });
  },
  sweep() {
   const slots = getSlots();
   for (const slot of slots) {
    try {
     const b = slot.protectedBounds;
     const entities = gameWorld.getDimension(slot.dimension).getEntities({
      location: { x: b.minX, y: b.minY, z: b.minZ },
      volume: { x: b.maxX - b.minX + 1, y: b.maxY - b.minY + 1, z: b.maxZ - b.minZ + 1 }
     });
     // Recheck coordinates even if the native query includes an overlapping
     // hitbox. This also keeps a broad mocked/fallback query non-destructive.
     for (const entity of entities) api.removeUnrelated(entity, slots);
    } catch {} // Unloaded chunks are handled by entityLoad or the next sweep.
   }
  },
  initialize() {
   if (started) return;
   started = true;
   for (const name of ["entitySpawn", "entityLoad"]) {
    try { gameWorld.afterEvents?.[name]?.subscribe(event => api.handleEntity(event.entity)); } catch {}
   }
   scheduler.run(() => api.sweep());
  }
 };
 return api;
}

export const WeeklySpawnGuard = createWeeklySpawnGuard({ world, system, getRoom: id => roomLookup(id) });
let roomLookup = () => null;
export function initializeWeeklySpawnGuard(getRoom) {
 roomLookup = getRoom;
 WeeklySpawnGuard.initialize();
}
