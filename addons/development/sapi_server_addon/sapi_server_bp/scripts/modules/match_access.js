/** Shared cross-pack tags; no imports, so transaction guards cannot create cycles. */
export function isMatchLocked(player) {
 try { return !!player && (player.hasTag("pvp:participant") || player.hasTag("pvp:admission")); }
 catch { return true; }
}
// Weekly raid rooms use their own admission state, not PvP match/damage rules.
export function isWeeklyLocked(player) {
 try { return !!player && (player.hasTag("weekly:participant") || player.hasTag("weekly:admission")); }
 catch { return true; }
}
// This guards out-of-activity services (teleport, storage, commerce), not
// weapon use, attacks, healing, movement, or cross-pack health probes.
const lastBlockedNotice = new WeakMap();
function blockedActionMessage(player) {
 try {
  if (player.hasTag("weekly:participant")) return "§c周本战斗中不能传送、交易或操作外部仓储。正常战斗不受此限制；退出请打开周本菜单。";
  if (player.hasTag("weekly:admission")) return "§c你已加入周本候场，暂不能传送、交易或操作外部仓储。请先从周本菜单退出候场。";
  if (player.hasTag("pvp:participant")) return "§c比赛或装备恢复期间不能进行此操作，请从比赛菜单退出并完成装备恢复。";
  if (player.hasTag("extract:admission")) return "§c摸金都市正在准备入场，请稍后再试。";
 } catch {}
 return "§c正在准备入场或恢复装备，暂不能进行此操作。";
}
export function allowOrdinaryAction(player, notify = true) {
 if (!isMatchLocked(player) && !isWeeklyLocked(player)) {
  if (player) lastBlockedNotice.delete(player);
  return true;
 }
 if (notify) try {
  const message = blockedActionMessage(player), previous = lastBlockedNotice.get(player), now = Date.now();
  // Duplicate native/custom interaction events should produce one explanation.
  // Silent passive checks do not consume the next intentional-action notice.
  if (!previous || previous.message !== message || now - previous.at >= 3000) {
   lastBlockedNotice.set(player, { message, at: now });
   player.sendMessage(message);
  }
 } catch {}
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
