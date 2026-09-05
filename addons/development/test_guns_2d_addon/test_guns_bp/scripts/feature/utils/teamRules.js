const TEAM_TAG_PREFIX = "sapi_team_";

function teamTag(entity) {
  if (!entity || entity.typeId !== "minecraft:player") return "";
  try { return entity.getTags().find(tag => tag.startsWith(TEAM_TAG_PREFIX)) || ""; }
  catch { return ""; }
}

/** SAPI 队伍标签是跨 Addon 的轻量契约；SAPI 未安装时自然退化为原行为。 */
export function isProtectedTeammate(attacker, target) {
  if (!attacker || !target || attacker.id === target.id || target.typeId !== "minecraft:player") return false;
  const attackerTeam = teamTag(attacker);
  return !!attackerTeam && attackerTeam === teamTag(target);
}
