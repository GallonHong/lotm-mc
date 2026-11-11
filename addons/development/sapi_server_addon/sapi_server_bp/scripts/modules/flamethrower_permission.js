import { world, system, ScriptEventSource, EquipmentSlot } from '@minecraft/server';
import { RegionManager } from './region.js';
import { CombatManager } from './combat.js';
import { Integration } from './integration.js';
import { isMatchLocked, matchDamageAllowed } from './match_access.js';
import { DamageHandler } from '../vendor/baizhan_damage/feature/damageHandler.js';
import { distance, traceCover, approvedSegment, unit } from '../data/baizhanRules.js';
import { FLAMETHROWER, FLAMETHROWER_GUN, inFlameCone } from '../data/flamethrowerRules.js';

const SESSION='tg_flamethrower_session:';
const context=e=>{try{return JSON.stringify([e.dimension.id,e.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||['apoc:downed','apoc:downed_pending','apoc_downed','apoc:true_death'].includes(t)).sort()]);}catch{return null;}};
const point=p=>!!p&&['x','y','z'].every(a=>typeof p[a]==='number'&&Number.isFinite(p[a]));
const living=e=>{try{return e?.isValid()&&e.getComponent('minecraft:health')?.currentValue>0;}catch{return false;}};
const body=e=>{try{return e.getHeadLocation();}catch{return {...e.location,y:e.location.y+0.8};}};
const blocked=e=>['pvp:downed','pvp:dead','pvp:protected','tg:rail_stunned','apoc:downed','apoc:downed_pending','apoc_downed','apoc:true_death'].some(t=>e.hasTag(t));

/** Synchronous, authoritative damage. A result is informational, never a
 * transferable damage permission. No source input can specify damage/targets. */
export class FlamethrowerPermissionManager {
 static registered=false;
 static getActiveMatchId;
 static seen=new Map();
 static sources=new Map();
 static heat=new Map();
 static lastLeaveTick=new Map();
 static leaveOverflowTick=-1;
 static metrics={pulses:0,candidates:0,directHits:0,burnHits:0,heatSaturated:0};
 static clearPlayer(id) {
  this.sources.delete(id);
  for(const [key,state]of this.heat)if(state.packet.shooterId===id||state.targetId===id)this.heat.delete(key);
 }
 static recordLeave(id) {
  const now=system.currentTick;
  this.prune();this.clearPlayer(id);
  if(typeof id!=='string')return;
  if(this.lastLeaveTick.has(id)||this.lastLeaveTick.size<FLAMETHROWER.maxSources)this.lastLeaveTick.set(id,now);
  else this.leaveOverflowTick=Math.max(this.leaveOverflowTick,now);
 }
 static prune() {
  const now=system.currentTick;
  for(const [key,tick]of this.seen)if(now-tick>FLAMETHROWER.guardTicks)this.seen.delete(key);
  for(const [id,tick]of this.lastLeaveTick)if(now-tick>FLAMETHROWER.guardTicks)this.lastLeaveTick.delete(id);
  for(const [id,s]of this.sources)if(now-s.tick>FLAMETHROWER.guardTicks)this.sources.delete(id);
 }
 static source(packet,checkAim=false,failure=null) {
  const reject=reason=>{if(failure)failure.reason=reason;return null;};
  try {
   const active=this.getActiveMatchId?.();
   if(active!==null&&!(typeof active==='string'&&active))return reject('service_initializing');
   const shooter=world.getAllPlayers().find(e=>e.id===packet.shooterId);
   if(!living(shooter)||blocked(shooter)||String(shooter.getGameMode?.()).toLowerCase()==='spectator')return reject('player_state');
   if(context(shooter)!==packet.sourceContext||!Number.isInteger(packet.selectedSlot)||shooter.selectedSlotIndex!==packet.selectedSlot)return reject('state_changed');
   const held=shooter.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand);
   if(held?.typeId!==FLAMETHROWER.id||typeof packet.weaponToken!=='string'||!/^[A-Za-z0-9_:-]{1,128}$/.test(packet.weaponToken))return reject('weapon_state');
   const lore=held.getLore()||[],identity=lore.filter(l=>l.startsWith('FT_ID:'));
   if(identity.length!==1||identity[0]!=='FT_ID:'+packet.weaponToken)return reject('weapon_state');
   const sessions=shooter.getTags().filter(t=>t.startsWith(SESSION));
   if(typeof packet.sessionTag!=='string'||!packet.sessionTag.startsWith(SESSION)||packet.sessionTag.length<=SESSION.length||packet.sessionTag.length>128||sessions.length!==1||sessions[0]!==packet.sessionTag)return reject('weapon_state');
   const markers=lore.filter(l=>l.startsWith('PVP_MATCH:'));
   if(isMatchLocked(shooter)){
    const match=shooter.getTags().find(t=>t.startsWith('pvp:match:'))?.slice(10);
    if(!shooter.hasTag('pvp:participant')||!shooter.hasTag('pvp:active')||!shooter.hasTag('pvp:guns_ready')||shooter.hasTag('pvp:guns_finished')||active!==match||markers.length!==1||markers[0]!=='PVP_MATCH:'+match)return reject('match_state');
   }else if(markers.length)return reject('weapon_state');
   const head=body(shooter),direction=unit(shooter.getViewDirection());
   if(!point(head)||!direction)return reject('weapon_state');
   if(!point(shooter.location))return reject('invalid_geometry');
   // A safe-zone location does not reject firing. Nonplayer targets retain
   // their geographical checks below; player targets use current combat rules.
   if(checkAim){
    const sent=point(packet.direction)&&unit(packet.direction);
    // The actual cone always uses the CURRENT view and current head, not a
    // delayed caller origin. Turning during delivery must not interrupt a
    // valid sweep. The old direction is only validated, never trusted.
    // An 8m transport bound rejects teleport-sized changes while allowing
    // normal movement within the 12-tick packet lifetime.
    if(!point(packet.origin)||distance(head,packet.origin)>8||!sent)return reject('weapon_state');
   }
   return {shooter,head,direction};
  }catch{return reject('validation_error');}
 }
 static allowed(source,target,{burn=false}={}) {
  try {
   const {shooter,head}=source;
   if(!living(shooter)||blocked(shooter)||!living(target)||target.hasTag('apoc:downed_pending')||target.id===shooter.id||shooter.dimension.id!==target.dimension.id)return false;
   if(['minecraft:armor_stand','minecraft:item','minecraft:xp_orb','test_gun:baizhan_mount'].includes(target.typeId)||target.typeId.includes('hud'))return false;
   if(['creative','spectator'].includes(String(target.getGameMode?.()).toLowerCase()))return false;
   if(!shooter.hasTag('pvp:participant')&&target.typeId!=='minecraft:player'){
    const eq=target.getComponent('minecraft:equippable');
    if([EquipmentSlot.Mainhand,EquipmentSlot.Offhand].some(slot=>eq?.getEquipment(slot)?.typeId==='test_gun:riot_shield'))return false;
   }
   if(isMatchLocked(shooter)||isMatchLocked(target)){if(!matchDamageAllowed(shooter,target))return false;}
   else if(CombatManager.areTeammates(shooter,target))return false;
   const impact=body(target),length=distance(head,impact),dim=shooter.dimension;
   if(!point(impact)||!burn&&length>FLAMETHROWER.range+1e-8)return false;
   const delta={x:impact.x-head.x,y:impact.y-head.y,z:impact.z-head.z};
   if(!burn&&traceCover(dim,head,length?delta:{x:1,y:0,z:0},length,0).blocked)return false;
   const regions=RegionManager.getRegions().filter(r=>r.dimension===dim.id).map(r=>({min:r.min,max:r.max,priority:r.priority||0,allow:r.flags?.allowPvp!==false}));
   const approval={allowed:true,targetDimension:dim.id,regions,adminBypass:false};
   for(const [start,end]of [[shooter.location,head],[head,impact],[impact,target.location]]){
    if(!point(start)||!point(end))return false;
    if(target.typeId!=='minecraft:player'&&(!approvedSegment(approval,dim.id,start,end)||Integration.segmentCrossesSafeZone(dim.id,start,end)))return false;
   }
   return true;
  }catch{return false;}
 }
 static damage(source,target,amount,{burn=false}={}) {
  // Each direct target/pulse uses the shared gear crit roll; burn never crits.
  // Pass base damage unchanged so gear damage bonuses are applied only once.
  const gun={...FLAMETHROWER_GUN,disableCritical:burn,damageOverTime:burn,stats:{...FLAMETHROWER_GUN.stats,damage:amount}};
  try{return DamageHandler.handleHit(null,source.shooter,target,gun,body(target))===true;}catch{return false;}
 }
 static heatHit(packet,target) {
  const now=system.currentTick,key=JSON.stringify([packet.shooterId,target.id]);
  let state=this.heat.get(key);
  if(state&&state.packet.sessionTag!==packet.sessionTag){this.heat.delete(key);state=null;}
  if(!state){
   if(this.heat.size>=FLAMETHROWER.maxHeatEntries){this.metrics.heatSaturated++;return;}
   state={packet:{...packet},targetId:target.id,layers:0,lastHit:now,burnUntil:-1,nextBurn:-1};
   this.heat.set(key,state);
  }
  if(now-state.lastHit>=FLAMETHROWER.heatExpiryTicks)state.layers=0;
  state.layers=Math.min(FLAMETHROWER.heatThreshold,state.layers+1);state.lastHit=now;
  if(state.layers>=FLAMETHROWER.heatThreshold){
   if(state.burnUntil<now)state.nextBurn=now+FLAMETHROWER.burnInterval;
   state.burnUntil=now+FLAMETHROWER.burnTicks;
  }
 }
 static handleRequest(event) {
  if(!['tg:flamethrower_pulse','tg:flamethrower_state'].includes(event.id)||event.sourceType!==ScriptEventSource.Server||event.sourceEntity||event.sourceBlock||typeof event.message!=='string'||event.message.length>4000)return;
  let packet;try{packet=JSON.parse(event.message);}catch{return;}
  const now=system.currentTick;
  if(!packet||typeof packet.nonce!=='string'||!/^[A-Za-z0-9_:-]{1,96}$/.test(packet.nonce)||typeof packet.shooterId!=='string'||!Number.isInteger(packet.issuedTick)||packet.issuedTick>now||now-packet.issuedTick>FLAMETHROWER.guardTicks)return;
  this.prune();
  const replayKey=event.id+':'+packet.nonce;
  if(this.seen.has(replayKey)||this.seen.size>=FLAMETHROWER.maxReplay)return;
  this.seen.set(replayKey,packet.issuedTick);
  if(packet.issuedTick<=Math.max(this.lastLeaveTick.get(packet.shooterId)??-1,this.leaveOverflowTick)){
   if(event.id==='tg:flamethrower_state')try{world.getDimension('minecraft:overworld').runCommand(`scriptevent tg:flamethrower_state_result ${JSON.stringify({nonce:packet.nonce,ready:false,protocol:1,checkedTick:now,reason:'respawn_transition'})}`);}catch{}
   return;
  }
  if(event.id==='tg:flamethrower_state'){
   const failure={};const ready=!!this.source(packet,false,failure);
   try{world.getDimension('minecraft:overworld').runCommand(`scriptevent tg:flamethrower_state_result ${JSON.stringify({nonce:packet.nonce,ready,protocol:1,checkedTick:now,reason:ready?'ready':failure.reason||'player_state'})}`);}catch{}
   return;
  }
  let hits=0;
  const source=this.source(packet,true);
  if(source&&(!this.sources.has(packet.shooterId)&&this.sources.size>=FLAMETHROWER.maxSources))return;
  if(source){
   const last=this.sources.get(packet.shooterId);
   // Delivery can jitter across ticks. Enforce actual monotonically issued
   // cadence, not receive spacing; TTL bounds catch-up to four old pulses.
   if(last&&packet.issuedTick-last.issuedTick<FLAMETHROWER.interval){
    try{world.getDimension('minecraft:overworld').runCommand(`scriptevent tg:flamethrower_result ${JSON.stringify({nonce:packet.nonce,accepted:true,applied:false,hits:0,skipped:true,reason:'cadence'})}`);}catch{}
    return;
   }
   this.sources.set(packet.shooterId,{tick:now,issuedTick:packet.issuedTick});this.metrics.pulses++;
   let targets=[];
   // Feet-based broad phase includes standard tall mobs; exact head-point
   // radius and cone follow below. No arbitrary per-shot target count cap.
   try{targets=source.shooter.dimension.getEntities({location:source.head,maxDistance:FLAMETHROWER.range+4});}catch{}
   const visited=new Set();
   for(const target of targets){
    if(visited.has(target.id))continue;visited.add(target.id);this.metrics.candidates++;
    try{
     const current=this.source(packet,true);
     if(!current||!inFlameCone(current.head,current.direction,body(target))||!this.allowed(current,target))continue;
     if(this.damage(current,target,FLAMETHROWER.damage)){
      hits++;this.metrics.directHits++;
      if(living(target))this.heatHit(packet,target);
     }
    }catch{}
   }
  }
  try{world.getDimension('minecraft:overworld').runCommand(`scriptevent tg:flamethrower_result ${JSON.stringify({nonce:packet.nonce,accepted:!!source,applied:hits>0,hits})}`);}catch{}
 }
 static tick() {
  this.prune();
  const now=system.currentTick;
  for(const [key,state]of this.heat){
   const source=this.source(state.packet);
   let target;try{target=world.getEntity(state.targetId);}catch{}
   if(!source||!living(target)){this.heat.delete(key);continue;}
   if(now-state.lastHit>=FLAMETHROWER.heatExpiryTicks)state.layers=0;
   if(now>state.burnUntil){if(!state.layers)this.heat.delete(key);continue;}
   if(now<state.nextBurn)continue;
   state.nextBurn=now+FLAMETHROWER.burnInterval;
   // Stored heat proves the earlier hit. Ordinary cover/range changes do not
   // extinguish a four-second burn, but all current safety segments still do.
   if(!this.allowed(source,target,{burn:true})){state.burnUntil=-1;state.layers=0;this.heat.delete(key);continue;}
   if(this.damage(source,target,FLAMETHROWER.burnDamage,{burn:true})){
    this.metrics.burnHits++;
    try{target.dimension.spawnParticle('test_gun:flamethrower_ember',body(target));}catch{}
   }else{this.heat.delete(key);}
  }
 }
 static registerEvents(getActiveMatchId) {
  if(typeof getActiveMatchId==='function')this.getActiveMatchId=getActiveMatchId;
  if(this.registered)return;
  if(!system.afterEvents?.scriptEventReceive?.subscribe||!world.afterEvents?.playerLeave?.subscribe||!world.afterEvents?.playerSpawn?.subscribe)return;
  world.afterEvents.playerLeave.subscribe(({playerId})=>this.recordLeave(playerId));
  world.afterEvents.playerSpawn.subscribe(({player})=>this.recordLeave(player.id));
  system.afterEvents.scriptEventReceive.subscribe(e=>this.handleRequest(e));
  system.runInterval(()=>this.tick(),1);this.registered=true;
 }
}
