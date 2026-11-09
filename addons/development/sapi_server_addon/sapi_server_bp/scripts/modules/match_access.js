/** Shared cross-pack tags; no imports, so transaction guards cannot create cycles. */
export function isMatchLocked(player) {
 try { return !!player && (player.hasTag("pvp:participant") || player.hasTag("pvp:admission")); }
 catch { return true; }
}
export function allowOrdinaryAction(player, notify = true) {
 if (!isMatchLocked(player)) return true;
 if (notify) try { player.sendMessage("§c比赛准备、比赛或装备恢复期间，暂不能进行此操作。"); } catch {}
 return false;
}
export function matchTag(player) {
 try { return player?.getTags().find(t => t.startsWith("pvp:match:")) || ""; } catch { return ""; }
}
export function matchTeam(player) {
 try { return player?.hasTag("pvp:team:red") ? "red" : player?.hasTag("pvp:team:blue") ? "blue" : ""; } catch { return ""; }
}
export function matchDamageAllowed(attacker, victim) {
 if (!isMatchLocked(attacker) && !isMatchLocked(victim)) return true;
 try {
  return attacker.hasTag("pvp:active") && victim.hasTag("pvp:active") &&
   !attacker.hasTag("pvp:downed") && !attacker.hasTag("pvp:dead") && !victim.hasTag("pvp:dead") &&
   !attacker.hasTag("pvp:protected") && !victim.hasTag("pvp:protected") &&
   !!matchTag(attacker) && matchTag(attacker) === matchTag(victim) &&
   !!matchTeam(attacker) && !!matchTeam(victim) && matchTeam(attacker) !== matchTeam(victim);
 } catch { return false; }
}
