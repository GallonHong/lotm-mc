// Shared cross-pack protocol: assigned by the hostile-mob spawning authority.
// Tags are visible across behavior-pack namespaces; dynamic properties are not.
export function getInnateArmorPoints(entity) {
 if (!entity || entity.typeId === 'minecraft:player') return null;
 try {
  let armor = null;
  for (const tag of entity.getTags()) {
   const match = /^apoc:armor:(0|[1-9][0-9]?)$/.exec(tag);
   if (match && Number(match[1]) <= 40) armor = Math.max(armor ?? 0, Number(match[1]));
  }
  // Defensive duplicate handling: never stack stale assignment tags.
  return armor;
 } catch { return null; }
}
