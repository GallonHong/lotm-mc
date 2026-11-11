import { world, system, ScriptEventSource } from "@minecraft/server";
import { RegionManager } from "./region.js";
import { CombatManager } from "./combat.js";
import { Utils } from "../utils.js";
import { isMatchLocked } from "./match_access.js";

/**
 * 裂轨跨包伤害准入。只返回权限，不造成伤害，也不替代实际命中的通缉处理。
 * 接受服务端 API 请求或身份匹配的射手实体请求；坐标、区域和队伍从当前实体读取。
 */
export class RailPermissionManager {
 static registered = false;

 static isAllowed(shooter, target) {
  if (!shooter || !target || shooter.typeId !== "minecraft:player" || target.typeId !== "minecraft:player") return false;
  try {
   if (!shooter.isValid() || !target.isValid() || shooter.id === target.id) return false;
   if (["pvp:downed","apoc:downed","apoc_downed","apoc:downed_pending"].some(t => shooter.hasTag?.(t)) || target.hasTag?.("apoc:downed_pending")) return false;
   if (shooter.dimension.id !== target.dimension.id) return false;
   // 比赛权限由 Guns 的比赛标签检查处理，普通世界桥不能授权比赛伤害。
   if (isMatchLocked(shooter) || isMatchLocked(target) || CombatManager.areTeammates(shooter, target)) return false;
   return true; // Safe-zone location does not prohibit ordinary player combat.
  } catch { return false; }
 }

 static handleRequest(event) {
  if (event.id !== "tg:rail_guard" || typeof event.message !== "string" || event.message.length > 512) return;
  let packet;
  try { packet = JSON.parse(event.message); } catch { return; }
  if (!packet || typeof packet.nonce !== "string" || !/^[A-Za-z0-9_:-]{1,96}$/.test(packet.nonce)) return;
  if (typeof packet.shooterId !== "string" || typeof packet.targetId !== "string") return;
  // runCommand API 可标记为 Server 且没有 sourceEntity；实体来源则必须是射手。
  // 任何来源携带实体时都校验身份，拒绝命令方块、NPC 对话及未知来源。
  if (event.sourceBlock) return;
  const matchingShooter = event.sourceEntity?.typeId === "minecraft:player" && event.sourceEntity.id === packet.shooterId;
  if (event.sourceType === ScriptEventSource.Server) {
   if (event.sourceEntity && !matchingShooter) return;
  } else if (event.sourceType !== ScriptEventSource.Entity || !matchingShooter) return;
  let allowed = false, targetDimension = null, targetLocation = null, regions = [], adminBypass = false;
  try {
   const players = world.getAllPlayers();
   const shooter = players.find(player => player.id === packet.shooterId);
   const target = players.find(player => player.id === packet.targetId);
   allowed = this.isAllowed(shooter, target);
   if (allowed) {
    targetDimension = target.dimension.id; targetLocation = { ...target.location };
    adminBypass = Utils.isAdmin(shooter);
    regions = []; // Player-combat proof: keep all non-geographical guards above.
   }
  } catch { allowed = false; regions = []; }
  try {
   // 以 Server 来源响应；Guns 仅接受此来源且仍须匹配其一次性待处理 nonce。
   world.getDimension("minecraft:overworld").runCommand(`scriptevent tg:rail_guard_result ${JSON.stringify({ nonce: packet.nonce, allowed, targetDimension, targetLocation, regions, adminBypass })}`);
  } catch (error) {
   console.warn(`[RailPermission] Response failed: ${error}`);
  }
 }

 static registerEvents() {
  if (this.registered) return;
  const signal = system.afterEvents?.scriptEventReceive;
  if (!signal?.subscribe) return;
  signal.subscribe(event => this.handleRequest(event));
  this.registered = true;
 }
}
