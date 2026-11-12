// Shared tag protocol: no dependency on Life/SAPI UUIDs or script event service.
// This is monster targeting only; it never changes player damage or game mode.
import { isPvpExcluded } from "./pvpIsolation.js";
const DOWNED_TAGS = ["apoc:downed", "apoc:downed_pending", "pvp:downed", "pvp:downed_waiting"];
export function isDownedTarget(target) {
 try { return !!target && DOWNED_TAGS.some(tag => target.hasTag(tag)); }
 catch { return true; }
}
export function isCombatExcluded(target) {
 return isDownedTarget(target) || isPvpExcluded(target);
}
