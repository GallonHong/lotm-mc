import { CONFIG, MOB_PROFILES } from "./config.js";
import { ZoneRegistry } from "./zones.js";
import { isPvpExcluded } from "./pvpIsolation.js";
import { assignMobArmor, readMobArmor } from "./mobArmor.js";

const HOSTILE_TYPES = new Set(Object.values(MOB_PROFILES)
 .map(profile => profile.typeId).filter(typeId => typeId !== "apoc:shelter_guard"));

export function isArmorBoss(entity) {
 try {
  if (!entity || entity.typeId === "apoc_boss:visual_probe" || entity.typeId === "minecraft:player") return false;
  return !!entity.getComponent("minecraft:boss") || entity.getComponent("minecraft:type_family")?.hasTypeFamily("apoc_boss") === true;
 } catch { return false; }
}

export function isArmorHostile(entity) {
 try {
  if (!entity || entity.typeId === "minecraft:player" || entity.typeId === "apoc:shelter_guard") return false;
  if (!entity.getComponent("minecraft:health")) return false;
  if (HOSTILE_TYPES.has(entity.typeId)) return true;
  const family = entity.getComponent("minecraft:type_family");
  return family?.hasTypeFamily("monster") === true || family?.hasTypeFamily("apoc_boss") === true ||
   family?.hasTypeFamily("apoc_hostile") === true;
 } catch { return false; }
}

/** Source metadata wins over physical zone. Dungeon/city producers assign inline;
 * the deferred observer only fills missing data and never rerolls saved armor.
 */
export function assignSpawnArmor(entity, spawnOrigin = null) {
 try {
  if (!isArmorHostile(entity) || isPvpExcluded(entity)) return null;
  const existing = readMobArmor(entity);
  if (existing !== null) return existing;
  const dimensionId = spawnOrigin?.dimensionId ?? entity.dimension.id;
  const location = spawnOrigin?.location ?? entity.location;
  const tags = entity.getTags();
  if (tags.includes("daily_dungeon_enemy")) {
   const range = tags.map(tag => /^apoc:armor_max:(0|[1-9][0-9]?)$/.exec(tag))
    .find(match => match && Number(match[1]) <= 40);
   // An older dungeon package does not expose its difficulty; never guess 40.
   return assignMobArmor(entity, "dungeon", range ? Number(range[1]) : 10);
  }
  if (tags.includes("apoc_zone_extraction") || tags.includes("apoc_extraction_hostile") ||
      tags.includes("apoc_extraction_boss") || dimensionId === CONFIG.extractionDimension) {
   return assignMobArmor(entity, "city", 40);
  }
  // Use the actual spawn position, not the nearby player's side of a boundary.
  const zone = ZoneRegistry.resolve(dimensionId, location).type;
  if (zone === "law") return assignMobArmor(entity, "law", 10);
  if (zone === "outlaw") return assignMobArmor(entity, "outlaw", 20);
  // Safe zones do not naturally spawn enemies. If an administrator deliberately
  // summons a Boss there, give it the law-zone cap without changing suppression.
  if (zone === "safe" && isArmorBoss(entity)) return assignMobArmor(entity, "boss_safe", 10);
  // Preserve safe-zone and PvP suppression. Do not create any new entities.
  return null;
 } catch (error) {
  console.warn(`[Apocalypse][Armor] spawn armor unavailable: ${error}`);
  return null;
 }
}
