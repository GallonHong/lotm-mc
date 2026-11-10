import { world, system, ScriptEventSource, EquipmentSlot } from '@minecraft/server';
import { RegionManager } from './region.js';
import { CombatManager } from './combat.js';
import { Integration } from './integration.js';
import { isMatchLocked, matchDamageAllowed } from './match_access.js';
import { DamageHandler } from '../vendor/baizhan_damage/feature/damageHandler.js';
import { DamageIndicator as AuthoritativeIndicator } from '../vendor/baizhan_damage/feature/damageIndicator.js';
import { BAIZHAN_GUN } from '../data/baizhanGun.js';
import { BAIZHAN, MACHINE_TARGETS, machineDamageMultiplier, distance, traceCover, approvedSegment } from '../data/baizhanRules.js';

const combatContext=e=>{try{return JSON.stringify([e.dimension.id,e.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||['apoc:downed','apoc_downed','apoc:true_death'].includes(t)).sort()]);}catch{return null;}};
const finitePoint = p => !!p && ['x','y','z'].every(a => typeof p[a] === 'number' && Number.isFinite(p[a]));
const living = e => { try { return e?.isValid() && e.getComponent('minecraft:health')?.currentValue > 0; } catch { return false; } };
const body = e => { try { return e.getHeadLocation(); } catch { return {...e.location,y:e.location.y+0.8}; } };
const delta = (a,b) => ({x:b.x-a.x,y:b.y-a.y,z:b.z-a.z});
const blockedTag = p => ['pvp:downed','pvp:dead','pvp:protected','tg:rail_stunned','apoc:downed','apoc_downed','apoc:true_death'].some(t=>p.hasTag(t));

/** Authoritative Baizhan commit. Protection, cover and current damage formulas
 * run synchronously in one server callback; no delayed damage approval exists. */
export class BaizhanPermissionManager {
 static feedback = new Map();
 static beginFeedback(packet, shooter, target) {
  for(const [key,r] of this.feedback)if(system.currentTick-r.tick>BAIZHAN.guardTicks)this.feedback.delete(key);
  if(this.feedback.size>=4096)return null;
  try {
   const record={nonce:packet.nonce,shooterId:shooter.id,targetId:target.id,tick:system.currentTick,
    dimension:target.dimension.id,location:{...target.location},before:target.getComponent('minecraft:health')?.currentValue};
   this.feedback.set(packet.nonce,record);return record;
  }catch{return null;}
 }
 static captureHurt(event) {
  const damage=Number(event?.damage);
  if(!Number.isFinite(damage)||damage<=0||event.damageSource?.cause!=='override')return;
  for(const record of this.feedback.values()) {
   if(record.observed||record.targetId!==event.hurtEntity?.id||record.shooterId!==event.damageSource?.damagingEntity?.id||system.currentTick-record.tick>2)continue;
   record.observed=true;record.damage=damage;record.basis='entityHurt';
   if(typeof AuthoritativeIndicator!=='undefined'){
    record.headshot=AuthoritativeIndicator.headshots.has(record.targetId);
    record.critical=AuthoritativeIndicator.crits.has(record.targetId);
   }
   break;
  }
 }
 static finishFeedback(record, target, applied) {
  if(!record||!applied)return;
  try {
   const after=target.getComponent('minecraft:health')?.currentValue;
   if(!record.observed&&target.isValid()&&Number.isFinite(record.before)&&Number.isFinite(after)&&after>=0&&record.before>after&&
    !['pvp:downed','apoc:downed','apoc_downed'].some(t=>target.hasTag(t))){
    record.damage=record.before-after;record.basis='health_loss';
   }
  }catch{} // Never invent a lethal/deleted target's remaining HP.
 }
 static consumeFeedback(record) {
  if(!record)return undefined;
  this.feedback.delete(record.nonce);
  if(!Number.isFinite(record.damage)||record.damage<=0)return undefined;
  const {shooterId,targetId,dimension,location,damage,basis,headshot,critical,tick}=record;
  return {shooterId,targetId,dimension,location,damage,basis,headshot,critical,cause:'override',hitTick:tick};
 }
 static sendResult(packet, applied, record) {
  const send=()=>{
   const feedback=applied?this.consumeFeedback(record):undefined;
   this.feedback.delete(packet.nonce);
   try{world.getDimension('minecraft:overworld').runCommand(`scriptevent tg:baizhan_hit_result ${JSON.stringify({nonce:packet.nonce,applied,feedback})}`);}catch{}
  };
  // Damage was already committed synchronously. Defer only the cosmetic
  // receipt one tick to prefer Bedrock's actual damage event over HP deltas.
  if(typeof system.run==='function')system.run(send);else send();
 }
 static registered = false;
 static getActiveMatchId;
 static activeMatchId(){try{const id=this.getActiveMatchId?.();return id===null||typeof id==='string'&&id?id:undefined;}catch{return undefined;}}
 static seen = new Map();
 static lastLeaveTick = new Map();
 static leaveOverflowTick = -1;
 static recordLeave(playerId){
  const now=system.currentTick;
  for(const [id,tick]of this.lastLeaveTick)if(now-tick>BAIZHAN.guardTicks)this.lastLeaveTick.delete(id);
  if(typeof playerId!=='string')return;
  if(this.lastLeaveTick.has(playerId)||this.lastLeaveTick.size<4096)this.lastLeaveTick.set(playerId,now);
  // Do not evict a still-live replay guard. A bounded global cutoff safely
  // covers overflow IDs without retaining their individual records.
  else this.leaveOverflowTick=Math.max(this.leaveOverflowTick,now);
 }
 static clearPath(dimension,start,end,penetrations=0) {
  const length=distance(start,end);
  // A zero-length segment still checks its occupied cell.
  return !traceCover(dimension,start,length ? delta(start,end) : {x:1,y:0,z:0},length,penetrations).blocked;
 }
 static authorize(packet) {
  const denied={allowed:false};
  const activeMatchId=this.activeMatchId();if(activeMatchId===undefined)return denied;
  try {
   const shooter=world.getAllPlayers().find(p=>p.id===packet.shooterId);
   const target=world.getEntity(packet.targetId);
   if(!living(shooter)||!living(target)||shooter.id===target.id||blockedTag(shooter))return denied;
   // Life 1.4.5 exposes no authoritative dynamic-region permission bridge.
   // Never infer ordinary-world player permission from SAPI-local properties.
   if(target.typeId==='minecraft:player'&&(!isMatchLocked(target)||!target.hasTag('pvp:participant')))return denied;
   if(shooter.dimension.id!==target.dimension.id||target.typeId===BAIZHAN.mountId||['minecraft:armor_stand','minecraft:item','minecraft:xp_orb'].includes(target.typeId)||target.typeId.includes('hud'))return denied;
   if(['creative','spectator'].includes(String(target.getGameMode?.()))||String(shooter.getGameMode?.())==='spectator')return denied;
   // Ordinary-world players cannot be hurt indirectly through a mob's riot
   // shield reflection either. Formal PvP keeps the original shield behavior.
   if(!shooter.hasTag('pvp:participant')&&target.typeId!=='minecraft:player'){
    const equipment=target.getComponent('minecraft:equippable');
    if([EquipmentSlot.Mainhand,EquipmentSlot.Offhand].some(slot=>equipment?.getEquipment(slot)?.typeId==='test_gun:riot_shield'))return denied;
   }
   const held=shooter.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand);
   if(held?.typeId!==BAIZHAN.id||typeof packet.weaponToken!=='string'||!packet.weaponToken||packet.weaponToken.length>128)return denied;
   // Item dynamic properties are behavior-pack scoped. Only shared lore binds
   // the visible item here; Guns retains its private durability identity.
   const identities=(held.getLore()||[]).filter(line=>line.startsWith('BAIZHAN_ID:'));
   if(identities.length!==1||identities[0]!=='BAIZHAN_ID:'+packet.weaponToken)return denied;
   // A deployment/state epoch is revoked synchronously by removing its tag.
   // This blocks queued shots after retrieve, clear, switch or redeployment.
   const sessions=shooter.getTags().filter(tag=>tag.startsWith('tg_baizhan_session:'));
   if(typeof packet.sessionTag!=='string'||packet.sessionTag.length<=19||packet.sessionTag.length>128||sessions.length!==1||sessions[0]!==packet.sessionTag)return denied;
   const matchId=shooter.getTags().find(t=>t.startsWith('pvp:match:'))?.slice(10)||'';
   const markers=(held.getLore()||[]).filter(line=>line.startsWith('PVP_MATCH:'));
   if(isMatchLocked(shooter)){if(activeMatchId!==matchId||!markers.includes('PVP_MATCH:'+matchId)||markers.some(m=>m!=='PVP_MATCH:'+matchId))return denied;}
   else if(markers.length)return denied;
   if(!Number.isInteger(packet.selectedSlot)||shooter.selectedSlotIndex!==packet.selectedSlot||combatContext(shooter)!==packet.sourceContext||combatContext(target)!==packet.targetContext)return denied;
   if(!!shooter.isSneaking!==packet.mounted||!['normal','splash','fire','slow','piercing'].includes(packet.round))return denied;
   if(packet.kind==='splash'&&packet.round!=='splash'||packet.kind==='burn'&&packet.round!=='fire')return denied;
   if(isMatchLocked(shooter)||isMatchLocked(target)) {
    if(!shooter.hasTag('pvp:guns_ready')||shooter.hasTag('pvp:guns_finished')||!matchDamageAllowed(shooter,target))return denied;
   } else if(CombatManager.areTeammates(shooter,target))return denied;
   if(!finitePoint(packet.origin)||!finitePoint(packet.impact)||!['direct','splash','burn'].includes(packet.kind)||typeof packet.mounted!=='boolean')return denied;
   const dim=shooter.dimension,head=body(shooter),targetBody=body(target);
   // Known vehicle hulls reach 2.8m wide / 2.5m tall; drones remain narrow.
   const impactTolerance=MACHINE_TARGETS.has(target.typeId)&&target.typeId.startsWith('ab_ve:')?3.5:2.5;
   if(distance(packet.impact,targetBody)>impactTolerance)return denied;
   const paths=[];
   if(packet.kind==='direct') {
    if(packet.mounted&&!shooter.isSneaking)return denied;
    if(distance(head,packet.origin)>3||distance(packet.origin,packet.impact)>BAIZHAN.range+0.01)return denied;
    if(!this.clearPath(dim,head,packet.origin)||!this.clearPath(dim,packet.origin,packet.impact,packet.mounted?2:0))return denied;
    paths.push([head,packet.origin],[packet.origin,packet.impact]);
   } else if(packet.kind==='splash') {
    // Splash carries its parent bullet geometry, never a free-standing blast.
    if(!finitePoint(packet.shotOrigin))return denied;
    if(packet.mounted&&!shooter.isSneaking)return denied;
    if(distance(head,packet.shotOrigin)>3||distance(packet.shotOrigin,packet.origin)>BAIZHAN.range+0.01||distance(packet.origin,packet.impact)>BAIZHAN.splashRadius+0.01)return denied;
    if(!this.clearPath(dim,head,packet.shotOrigin)||!this.clearPath(dim,packet.shotOrigin,packet.origin,packet.mounted?2:0)||!this.clearPath(dim,packet.origin,packet.impact))return denied;
    paths.push([head,packet.shotOrigin],[packet.shotOrigin,packet.origin],[packet.origin,packet.impact]);
   } else {
    if(distance(head,packet.origin)>0.5||distance(packet.origin,packet.impact)>BAIZHAN.range+0.01)return denied;
    if(!this.clearPath(dim,head,packet.origin)||!this.clearPath(dim,packet.origin,packet.impact))return denied;
    paths.push([head,packet.origin],[packet.origin,packet.impact]);
   }
   // Never permit shooting out of, into, or across protected space. Keep both
   // raw player feet and body in the region proof to cover thin Y boundaries.
   paths.push([shooter.location,head],[packet.impact,targetBody],[targetBody,target.location]);
   const regions=RegionManager.getRegions().filter(r=>r.dimension===dim.id).map(r=>({min:r.min,max:r.max,priority:r.priority||0,allow:r.flags?.allowPvp!==false}));
   const approval={allowed:true,targetDimension:dim.id,regions,adminBypass:false};
   for(const [start,end]of paths)if(!approvedSegment(approval,dim.id,start,end)||Integration.segmentCrossesSafeZone(dim.id,start,end))return denied;
   return {...approval,shooterId:shooter.id,targetId:target.id,shooterLocation:{...shooter.location},targetLocation:{...target.location},origin:{...packet.origin},impact:{...packet.impact},createdTick:system.currentTick,expiresTick:system.currentTick+BAIZHAN.guardTicks};
  }catch{return denied;}
 }
 static handleRequest(event) {
  // Legacy guard packets are deliberately ignored: old Guns must fail closed.
  if(!['tg:baizhan_hit','tg:baizhan_wear_state'].includes(event.id)||event.sourceType!==ScriptEventSource.Server||event.sourceEntity||event.sourceBlock||typeof event.message!=='string'||event.message.length>8000)return;
  let packet;try{packet=JSON.parse(event.message);}catch{return;}
  if(!packet||typeof packet.nonce!=='string'||!/^[A-Za-z0-9_:-]{1,96}$/.test(packet.nonce)||!Number.isInteger(packet.issuedTick)||packet.issuedTick>system.currentTick||system.currentTick-packet.issuedTick>BAIZHAN.guardTicks)return;
  // Expired packets cannot reopen the deduplication window. No retries are
  // synthesized by either side; a nonce is bound to its original issuedTick.
  for(const [key,tick]of this.seen)if(system.currentTick-tick>BAIZHAN.guardTicks)this.seen.delete(key);
  for(const [id,tick]of this.lastLeaveTick)if(system.currentTick-tick>BAIZHAN.guardTicks)this.lastLeaveTick.delete(id);
  const key=event.id+':'+packet.nonce;
  if(this.seen.has(key)||this.seen.size>=4096)return;
  this.seen.set(key,packet.issuedTick);
  if(event.id==='tg:baizhan_wear_state'){
   const activeMatchId=this.activeMatchId();
   if(activeMatchId!==undefined)try{world.getDimension('minecraft:overworld').runCommand(`scriptevent tg:baizhan_wear_state_result ${JSON.stringify({nonce:packet.nonce,activeMatchId,checkedTick:system.currentTick})}`);}catch{}
   return;
  }
  if(typeof packet.shooterId!=='string'||typeof packet.targetId!=='string')return;
  // A player's persisted public tag may survive logout until spawn cleanup.
  // Never accept a pre-leave packet, even after a quick same-id reconnect.
  if(packet.issuedTick<=Math.max(this.lastLeaveTick.get(packet.shooterId)??-1,this.leaveOverflowTick))return;
  let applied=false,feedbackRecord;
  try {
   const approval=this.authorize(packet);
   if(approval.allowed===true){
    const shooter=world.getAllPlayers().find(p=>p.id===packet.shooterId),target=world.getEntity(packet.targetId);
    const damage=(packet.kind==='direct'?BAIZHAN_GUN.stats.damage:packet.kind==='burn'?BAIZHAN.burnDamage:
     BAIZHAN.splashDamage*Math.max(0.2,1-distance(packet.origin,packet.impact)/BAIZHAN.splashRadius))*machineDamageMultiplier(target);
    const gun={...BAIZHAN_GUN,noHealthFallback:true,disableCritical:packet.kind!=='direct',disableHeadshot:packet.kind!=='direct',
     fixedArmorPenetration:packet.round==='piercing'?0.85:undefined,
     stats:{...BAIZHAN_GUN.stats,damage,damageDropOff:packet.kind==='direct'?BAIZHAN_GUN.stats.damageDropOff:0,
      knockback:packet.kind==='direct'?BAIZHAN_GUN.stats.knockback:undefined}};
    // No await, queued callback, or caller-supplied final damage occurs between
    // current safety checks and this exact mirrored damage/armor/shield code.
    feedbackRecord=this.beginFeedback(packet,shooter,target);
    applied=DamageHandler.handleHit(null,shooter,target,gun,packet.impact)===true;
    this.finishFeedback(feedbackRecord,target,applied);
    if(applied&&packet.kind==='direct'&&packet.round==='slow'&&living(target)){
     try{target.addEffect('slowness',40,{amplifier:1,showParticles:false});}catch{}
    }
   }
  }catch{applied=false;} // Never retry an uncertain apply, nor fall back to HP.
  this.sendResult(packet,applied,feedbackRecord);
 }
 static registerEvents(getActiveMatchId) {
  if(typeof getActiveMatchId==='function')this.getActiveMatchId=getActiveMatchId;
  if(this.registered)return;
  const signal=system.afterEvents?.scriptEventReceive,leaveSignal=world.afterEvents?.playerLeave;
  if(!signal?.subscribe||!leaveSignal?.subscribe)return;
  leaveSignal.subscribe(({playerId})=>this.recordLeave(playerId));
  world.afterEvents?.entityHurt?.subscribe(event=>this.captureHurt(event));
  signal.subscribe(e=>this.handleRequest(e));
  this.registered=true;
 }
}
