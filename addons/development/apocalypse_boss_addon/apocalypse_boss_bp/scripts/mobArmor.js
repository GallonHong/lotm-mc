/** Shared persisted spawn armor contract. Keep the producer copies byte-identical.
 * Entity tags cross behavior-pack namespaces; dynamic properties do not.
 * The rolled value is TOTAL armor for addon damage, not bonus wearable armor.
 * A stored zero is initialized. Never reroll when a mob moves or reloads.
 */
export const MOB_ARMOR_PREFIX = "apoc:armor:";
export const MOB_ARMOR_SOURCE_PREFIX = "apoc:armor_source:";
export const MOB_ARMOR_MAX = 40;

export function readMobArmor(entity) {
 try {
  if (!entity || entity.typeId === "minecraft:player") return null;
  let result = null;
  for (const tag of entity.getTags()) {
   const match = /^apoc:armor:(0|[1-9][0-9]?)$/.exec(tag);
   if (match && Number(match[1]) <= MOB_ARMOR_MAX) result = Math.max(result ?? 0, Number(match[1]));
  }
  return result;
 } catch {}
 return null;
}

export function assignMobArmor(entity, source, maximum, random = Math.random) {
 const existing = readMobArmor(entity);
 if (existing !== null) return existing;
 if (!entity || entity.typeId === "minecraft:player" || entity.typeId === "apoc:shelter_guard") return null;
 const max = Math.max(0, Math.min(MOB_ARMOR_MAX, Math.floor(Number(maximum) || 0)));
 const sample = Number(random());
 const bounded = Number.isFinite(sample) ? Math.max(0, Math.min(0.9999999999999999, sample)) : 0;
 const value = Math.min(max, Math.floor(bounded * (max + 1)));
 try {
  const tag = MOB_ARMOR_PREFIX + value;
  entity.addTag(tag);
  // Confirm the persisted marker rather than treating a failed write as success.
  if (!entity.hasTag(tag)) return null;
  try { entity.addTag(MOB_ARMOR_SOURCE_PREFIX + String(source || "unknown").replace(/[^a-z0-9_]/g, "").slice(0, 40)); } catch {}
  return value;
 } catch { return null; }
}
