import { world, system } from "@minecraft/server";
import { WEEKLY_BOSSES, WEEKLY_TIERS, weekKey } from "./config.js";
import { WeeklyRewards } from "./rewards.js";
import { getMapSlot, isWeeklyMapInstalled } from "./maps.js";

const STORE = "daily:weekly_rooms:v1";
const RETURN = "daily:weekly_return:v1";
const ONLINE_GRACE = 300000;
const RUN_LIMIT = 1800000;
const LOBBY_LIMIT = 900000;
const key = value => String(value?.name ?? value ?? "").toLowerCase();
const online = name => world.getAllPlayers().find(p => key(p) === key(name));
const valid = e => { try { return typeof e?.isValid === "function" ? e.isValid() : !!e?.isValid; } catch { return false; } };
const downed = p => p.hasTag("apoc:downed") || p.hasTag("apoc:downed_pending");
const point = p => ({ dimension: p.dimension.id, x: p.location.x, y: p.location.y, z: p.location.z });
const say = (p, text) => { try { p?.sendMessage(`§6[围剿周本] §r${text}`); } catch {} };
const load = (target, property) => { try { return JSON.parse(target.getDynamicProperty(property) || "null"); } catch { return null; } };
const save = (target, property, value) => target.setDynamicProperty(property, value == null ? undefined : JSON.stringify(value));
const result = (ok, message, room) => ({ ok, message, room });
function boundsContain(slot, p) {
 if (p.dimension.id.replace("minecraft:", "") !== String(slot.dimension || "overworld").replace("minecraft:", "")) return false;
 const o = slot.origin, s = slot.size;
 const sx = s.x ?? s[0], sy = s.y ?? s[1], sz = s.z ?? s[2];
 return p.location.x >= o.x && p.location.x < o.x + sx && p.location.z >= o.z && p.location.z < o.z + sz && p.location.y >= o.y - 6 && p.location.y <= o.y + sy + 40;
}
function eligibility(p, allowWeekly = false) {
 if (!valid(p)) return "玩家不在线。";
 if (!allowWeekly && load(p, RETURN)) return "上次周本返回尚未完成，请稍后重试。";
 if (downed(p) || (p.getComponent("minecraft:health")?.currentValue ?? 0) <= 0) return "倒地或死亡时不能进入周本。";
 for (const tag of ["pvp:participant", "pvp:admission", "extract:admission", "apoc_extraction_active", "daily_in_dungeon"]) if (p.hasTag(tag)) return "请先离开当前战斗玩法。";
 if (!allowWeekly && (p.hasTag("weekly:participant") || p.hasTag("weekly:admission"))) return "你已经加入周本房间。";
 return "";
}
function removeTags(p) {
 for (const tag of p.getTags()) if (tag === "weekly:participant" || tag === "weekly:admission" || tag.startsWith("weekly:room:")) p.removeTag(tag);
}

/** Persist roster/return receipts before teleporting. Never copy, clear or repair equipment. */
export class WeeklyRaidManager {
 static rooms = new Map();
 static loaded = false;
 static initialize() {
  if (this.loaded) return;
  this.loaded = true;
  const saved = load(world, STORE);
  // Entity combat state cannot be resumed faithfully after a script reload.
  // Abort non-completed runs, keeping personal return receipts for offline members.
  for (const room of Array.isArray(saved) ? saved : []) {
   if (room?.state === "finishing" && room.success) {
    try { this.settle(room); } catch { this.rooms.set(room.id, room); }
   }
  }
  this.persist();
  for (const p of world.getAllPlayers()) this.handlePlayerSpawn(p, true);
  system.runTimeout(() => this.cleanStaleBosses(), 20);
 }
 static persist() { save(world, STORE, [...this.rooms.values()]); }
 static listRooms() { return [...this.rooms.values()]; }
 static getPlayerRoom(p) { return this.listRooms().find(r => r.members.some(m => key(m) === key(p) && m.status !== "left")) || null; }
 static canInstall(bossId) { return !this.rooms.has(bossId); }
 static createRoom(p, bossId, tier) {
  if (this.getPlayerRoom(p)) return result(false, "你仍在一个周本房间中，请先退出。");
  const problem = eligibility(p);
  if (problem) return result(false, problem);
  if (!WEEKLY_BOSSES[bossId] || !WEEKLY_TIERS[tier]) return result(false, "周本或难度不存在。");
  if (this.rooms.has(bossId)) return result(false, "该首领场地已有房间，请加入或等待结束。");
  if (!isWeeklyMapInstalled(bossId)) return result(false, "该周本地图尚未安装，请管理员从周本菜单安装场地。");
  const room = { id: bossId, bossId, tier, session: `${Date.now()}_${Math.floor(Math.random()*1e9)}`, state: "lobby", leader: p.name, createdAt: Date.now(), members: [{...WeeklyRewards.identity(p),id:p.id,name:p.name,ready:false,status:"waiting",offlineSince:0}] };
  this.rooms.set(room.id, room);
  try { this.persist(); p.addTag("weekly:admission"); p.addTag(`weekly:room:${room.id}`); }
  catch (e) { this.rooms.delete(room.id); removeTags(p); return result(false, `保存房间失败：${e}`); }
  return result(true, "周本房间已创建，最多8人。准备后由队长开始。", room);
 }
 static joinRoom(p, roomId, expectedSession) {
  if (this.getPlayerRoom(p)) return result(false, "你仍在一个周本房间中，请先退出。");
  const r = this.rooms.get(roomId), error = eligibility(p);
  if (error) return result(false, error);
  if (!r || r.state !== "lobby" || (expectedSession && r.session !== expectedSession)) return result(false, "房间已开始或已关闭。");
  if (r.members.filter(m => m.status !== "left").length >= 8) return result(false, "房间已满8人。");
  r.members = r.members.filter(m => key(m) !== key(p));
  r.members.push({...WeeklyRewards.identity(p),id:p.id,name:p.name,ready:false,status:"waiting",offlineSince:0});
  this.persist(); p.addTag("weekly:admission"); p.addTag(`weekly:room:${r.id}`);
  this.broadcast(r, `${p.name} 加入了周本房间。`);
  return result(true, "已加入，请确认准备。", r);
 }
 static setReady(p, ready, expectedSession) {
  const r = this.getPlayerRoom(p);
  if (!r || r.state !== "lobby" || (expectedSession && r.session !== expectedSession)) return result(false, "房间已变化。");
  const problem = eligibility(p, true); if (problem) return result(false, problem);
  r.members.find(m => key(m) === key(p)).ready = !!ready; this.persist();
  return result(true, ready ? "已准备。" : "已取消准备。", r);
 }
 static startRoom(p, expectedSession) {
  const r = this.getPlayerRoom(p);
  if (!r || r.state !== "lobby" || key(r.leader) !== key(p) || (expectedSession && r.session !== expectedSession)) return result(false, "仅当前房主可以开始。" );
  const members = r.members.filter(m => m.status !== "left");
  if (!members.length || members.length > 8 || members.some(m => !m.ready || !online(m.name) || eligibility(online(m.name), true))) return result(false, "所有成员必须在线、存活且已准备。");
  if (!isWeeklyMapInstalled(r.bossId)) return result(false, "场地尚未安装完成。");
  r.state = "starting"; r.startedAt = Date.now(); r.week = weekKey();
  try {
   // Save all return positions before any member moves. Personal receipts survive abort/restart.
   for (const m of members) {
    const player = online(m.name);
    if (load(player, RETURN)) throw new Error(`${m.name} 仍有未完成返回记录，请重新登录恢复`);
    m.returnLocation = point(player); m.status = "alive"; m.offlineSince = 0;
    save(player, RETURN, {session:r.session,roomId:r.id,returnLocation:m.returnLocation});
   }
   this.persist();
   const slot = getMapSlot(r.bossId), dim = world.getDimension(slot.dimension || "overworld");
   for (let i=0;i<members.length;i++) {
    const player = online(members[i].name);
    player.teleport({...slot.spawn,x:slot.spawn.x+(i%4)*1.5,z:slot.spawn.z+Math.floor(i/4)*1.5},{dimension:dim});
    player.removeTag("weekly:admission"); player.addTag("weekly:participant");
   }
   // Players drive chunk loading. Spawn only after the destination is accessible, bounded 10s.
   this.waitSpawn(r.session, r.id, 0);
   return result(true, "正在进入周本，使用自己的装备、弹药和耐久。", r);
  } catch (e) { this.finish(r, false, `进入失败：${e}`); return result(false, "进入失败，已安排返回原位。"); }
 }
 static waitSpawn(session, id, attempt) {
  system.runTimeout(() => {
   const r = this.rooms.get(id); if (!r || r.session !== session || r.state !== "starting") return;
   try {
    const slot = getMapSlot(id), dim = world.getDimension(slot.dimension || "overworld");
    if (!dim.getBlock(slot.bossSpawn)) throw new Error("首领出生区块尚未加载");
    const identifier = id === "sirok" ? "apoc_boss:sandworm" : "apoc_boss:abomination";
    const boss = dim.spawnEntity(`${identifier}<apoc_boss:weekly_spawn>`, slot.bossSpawn);
    r.bossEntityId = boss.id;
    boss.addTag("weekly:boss"); boss.addTag(`weekly:room:${id}`); boss.addTag(`weekly:armor:${WEEKLY_TIERS[r.tier].armor}`);
    boss.triggerEvent(`apoc_boss:weekly_room_${id}`);
    r.bossEntityId = boss.id; r.state = "active"; this.persist();
    this.broadcast(r,"战斗开始！倒地可被救援；真正死亡退出本局，通关仍有奖励。全员阵亡或30分钟超时则失败。");
   } catch(e) {
    this.removeBoss(r); r.bossEntityId = undefined;
    if (attempt < 40) this.waitSpawn(session,id,attempt+1);
    else this.finish(r,false,`首领加载失败：${e}`);
   }
  }, 5);
 }
 static leaveRoom(p) {
  const r = this.getPlayerRoom(p);
  if (!r) { this.restore(p); return result(true,"已离开周本。"); }
  const m = r.members.find(m => key(m) === key(p)); m.status = "left"; m.ready = false;
  this.persist(); this.restore(p); removeTags(p);
  if (!r.members.some(x => x.status !== "left")) this.finish(r,false,"所有成员离开。");
  else if (key(r.leader) === key(p)) { r.leader = r.members.find(x => x.status !== "left").name; this.persist(); }
  return result(true,"已退出本局，不结算本局奖励。");
 }
 static broadcast(r, message) { for(const m of r.members) if(m.status!=="left") say(online(m.name),message); }
 static handleDeath(p) {
  const r=this.getPlayerRoom(p); if(!r || !["active","starting"].includes(r.state))return false;
  const m=r.members.find(x=>key(x)===key(p)); if(m.status!=="alive") return true;
  m.status="dead";try{p.removeTag("weekly:participant");}catch{}this.persist(); this.broadcast(r,`${m.name} 已阵亡，等待其余队友完成挑战。`);return true;
 }
 static handleBossDeath(entity) {
  for(const r of this.rooms.values()) if(r.state==="active" && r.bossEntityId===entity.id) {this.finish(r,true,"首领已被击败。");return true;}
  return false;
 }
 static restore(p) {
  const receipt=load(p,RETURN); if(!receipt){removeTags(p);return true;}
  try {
   if(downed(p) || (p.getComponent("minecraft:health")?.currentValue??0)<=0) return false;
   const dest=receipt.returnLocation; if(!dest) return false;
   p.teleport({x:dest.x,y:dest.y,z:dest.z},{dimension:world.getDimension(dest.dimension)});
   save(p,RETURN,null);removeTags(p);return true;
  }catch(e){say(p,"返回位置暂不可用，将自动重试；返回记录已保留。");return false;}
 }
 static handlePlayerSpawn(p, initialSpawn=false) {
  const receipt=load(p,RETURN),r=this.getPlayerRoom(p),m=r?.members.find(x=>key(x)===key(p));
  if(!r || !m || r.state==="finishing" || m.status==="left" || m.status==="dead"){this.restore(p);WeeklyRewards.claimPending(p);return;}
  if(r.state==="lobby") {removeTags(p);p.addTag("weekly:admission");p.addTag(`weekly:room:${r.id}`);m.ready=false;this.persist();return;}
  if(!initialSpawn) {this.handleDeath(p);this.restore(p);return;}
  if(receipt?.session!==r.session){m.status="left";this.persist();removeTags(p);return;}
  m.id=p.id;m.offlineSince=0;
  const slot=getMapSlot(r.bossId);
  p.teleport(slot.spawn,{dimension:world.getDimension(slot.dimension||"overworld")});p.addTag("weekly:participant");p.addTag(`weekly:room:${r.id}`);this.persist();
 }
 static settle(r) {
  for(const m of r.members) if(m.status!=="left") WeeklyRewards.complete(m,r.bossId,r.tier,r.week,r.session);
 }
 static finish(r,success,reason) {
  if(!this.rooms.has(r.id) || r.state==="finishing")return;
  r.state="finishing";r.success=success;this.persist();
  try{if(success)this.settle(r);}catch(e){console.warn(`[Weekly] reward settlement deferred: ${e}`);this.removeBoss(r);for(const m of r.members){const p=online(m.name);if(p)this.restore(p);}this.broadcast(r,"奖励记录暂未保存成功，结算已保留等待重试，请勿重复领取。");return;}
  this.broadcast(r,success?"挑战成功！每周按最高难度补差结算，奖励可在周本菜单补领。":`挑战结束：${reason}`);
  this.removeBoss(r);this.rooms.delete(r.id);this.persist();
  for(const m of r.members){const p=online(m.name);if(p){this.restore(p);WeeklyRewards.claimPending(p);}}
 }
 static removeBoss(r) {try{const e=world.getEntity(r.bossEntityId);if(valid(e))e.remove();}catch{}}
 static cleanStaleBosses() {
  for(const id of Object.keys(WEEKLY_BOSSES))try{
   const slot=getMapSlot(id),dim=world.getDimension(slot.dimension||"overworld");
   for(const e of dim.getEntities({tags:["weekly:boss",`weekly:room:${id}`]}))if(!this.rooms.has(id)||this.rooms.get(id).bossEntityId!==e.id)e.remove();
  }catch{}
 }
 static tick() {
  const now=Date.now();
  for(const r of [...this.rooms.values()]) {
   if(r.state==="finishing") {try{if(r.success)this.settle(r);this.removeBoss(r);this.rooms.delete(r.id);this.persist();for(const m of r.members){const p=online(m.name);if(p){this.restore(p);WeeklyRewards.claimPending(p);}}}catch{}continue;}
   if(r.state==="lobby"&&now-r.createdAt>LOBBY_LIMIT){this.finish(r,false,"房间等待超时。");continue;}
   if(r.state!=="lobby"&&now-r.startedAt>RUN_LIMIT){this.finish(r,false,"超过30分钟挑战时限。");continue;}
   let changed=false;
   for(const m of r.members){
    if(m.status==="left"||m.status==="dead")continue;
    const p=online(m.name);
    if(!p){if(!m.offlineSince){m.offlineSince=now;m.ready=false;changed=true;}if(now-m.offlineSince>ONLINE_GRACE){m.status="left";changed=true;}continue;}
    if(m.offlineSince){m.offlineSince=0;changed=true;}
    if(r.state==="active" && !boundsContain(getMapSlot(r.bossId),p) && !downed(p)){
     try{p.teleport(getMapSlot(r.bossId).spawn,{dimension:world.getDimension(getMapSlot(r.bossId).dimension||"overworld")});}catch{}
    }
   }
   if(changed)this.persist();
   if(!r.members.some(m=>m.status==="alive"||m.status==="waiting")){this.finish(r,false,"队伍已全员阵亡或离开。");continue;}
   // An unloaded/missing boss is never treated as a kill/reward.
   if(r.state==="active")try{if(!valid(world.getEntity(r.bossEntityId))){r.missingSince ||=now;if(now-r.missingSince>ONLINE_GRACE)this.finish(r,false,"首领失联，请重新挑战。");}else {r.missingSince=0;const boss=world.getEntity(r.bossEntityId),slot=getMapSlot(r.bossId);if(boss && !boundsContain(slot,boss))boss.teleport(slot.bossSpawn,{dimension:world.getDimension(slot.dimension||"overworld")});}}catch{}
  }
  for(const p of world.getAllPlayers()) {const r=this.getPlayerRoom(p),m=r?.members.find(x=>key(x)===key(p));if(load(p,RETURN)&&(!r||m?.status==="dead"))this.restore(p);}
 }
}
