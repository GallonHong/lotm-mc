import { isWeeklyBoss, enforceWeeklyArmor } from "./weeklyRaid.js";
import { world, system } from "@minecraft/server";
import { assignMobArmor, readMobArmor } from "./mobArmor.js";
import { resolveBossArmorZone } from "./armorZones.js";
import { isPvpExcluded, isPvpArea } from "./pvpIsolation.js";

/** Only newly spawned living bosses. Never scan loaded entities or backfill saves. */
export function isArmorBoss(entity) {
 try {
  if (!entity || entity.typeId === "apoc_boss:visual_probe" || entity.typeId === "minecraft:player") return false;
  if (!entity.getComponent("minecraft:health")) return false;
  return entity.getComponent("minecraft:type_family")?.hasTypeFamily("apoc_boss") === true ||
   !!entity.getComponent("minecraft:boss");
 } catch { return false; }
}

export function assignBossSpawnArmor(entity, origin) {
 try {
  if (!isArmorBoss(entity) || isPvpExcluded(entity) || isPvpArea(origin.dimensionId, origin.location)) return null;
  if (isWeeklyBoss(entity)) return enforceWeeklyArmor(entity);
  const existing = readMobArmor(entity);
  if (existing !== null) return existing;
  const tags = entity.getTags();
  if (tags.includes("daily_dungeon_enemy")) {
   const range = tags.map(tag => /^apoc:armor_max:(0|[1-9][0-9]?)$/.exec(tag))
    .find(match => match && Number(match[1]) <= 40);
   return assignMobArmor(entity, "dungeon", range ? Number(range[1]) : 10);
  }
  if (origin.dimensionId === "apoc_extract:city" || tags.includes("apoc_zone_extraction") ||
      tags.includes("apoc_extraction_hostile") || tags.includes("apoc_extraction_boss")) {
   return assignMobArmor(entity, "city", 40);
  }
  const zone = resolveBossArmorZone(origin.dimensionId, origin.location);
  if (zone === "outlaw") return assignMobArmor(entity, "outlaw", 20);
  if (zone === "law") return assignMobArmor(entity, "law", 10);
  // Manually summoned safe-zone bosses also receive armor: conservative 0–10.
  // This does not spawn, remove, or change suppression of any entity.
  return assignMobArmor(entity, "boss_safe", 10);
 } catch { return null; }
}

if (world.afterEvents?.entitySpawn?.subscribe) world.afterEvents.entitySpawn.subscribe(({ entity }) => {
 try {
  if (!isArmorBoss(entity)) return;
  const origin = { dimensionId: entity.dimension.id, location: { ...entity.location } };
  // Inline dungeon/city producers and Mobs' 1-tick observer get first ownership,
  // independently of BP subscription order. A persisted zero is initialized.
  system.runTimeout(() => assignBossSpawnArmor(entity, origin), 3);
 } catch {}
});
