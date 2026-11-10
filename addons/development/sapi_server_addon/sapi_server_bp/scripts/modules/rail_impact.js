import { world, system, ScriptEventSource, EquipmentSlot } from '@minecraft/server';
import { BaizhanPermissionManager as Feedback } from './baizhan_permission.js';
import { RegionManager } from './region.js';
import { CombatManager } from './combat.js';
import { Integration } from './integration.js';
import { isMatchLocked, matchDamageAllowed } from './match_access.js';
import { DamageHandler } from '../vendor/baizhan_damage/feature/damageHandler.js';
import { distance, traceCover, approvedSegment, unit, point as along } from '../data/baizhanRules.js';
import { RAIL_IMPACT as R, railProfile, nearSegment } from '../data/railImpactRules.js';
import { applyAuthoritativeRailStun, tickAuthoritativeRailStuns } from './rail_authoritative_stun.js';
const SESSION='tg_rail_session:';
const context=e=>{try{return JSON.stringify([e.dimension.id,e.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||['apoc:downed','apoc_downed','apoc:true_death'].includes(t)).sort()]);}catch{return null;}};
const point=p=>!!p&&['x','y','z'].every(a=>typeof p[a]==='number'&&Number.isFinite(p[a]));
const living=e=>{try{return e?.isValid()&&e.getComponent('minecraft:health')?.currentValue>0;}catch{return false;}};
const body=e=>{try{return e.getHeadLocation();}catch{return {...e.location,y:e.location.y+.8};}};
const blocked=e=>['pvp:downed','pvp:dead','pvp:protected','tg:rail_stunned','apoc:downed','apoc_downed','apoc:true_death'].some(t=>e.hasTag(t));
const delta=(a,b)=>({x:b.x-a.x,y:b.y-a.y,z:b.z-a.z});
const add=(a,b,t=1)=>({x:a.x+b.x*t,y:a.y+b.y*t,z:a.z+b.z*t});
const excluded=e=>!living(e)||['minecraft:armor_stand','minecraft:item','minecraft:xp_orb','test_gun:baizhan_mount'].includes(e.typeId)||e.typeId.includes('hud');
export class RailImpactManager {
 static registered=false;static getActiveMatchId;static shots=new Map();static seen=new Map();static cadence=new Map();static lastLeave=new Map();static leaveOverflow=-1;
 static reply(id,data){try{world.getDimension('minecraft:overworld').runCommand(`scriptevent ${id} ${JSON.stringify(data)}`);}catch{}}
 static prune(){const now=system.currentTick;for(const[k,t]of this.seen)if(now-t>R.guardTicks)this.seen.delete(k);for(const[k,t]of this.lastLeave)if(now-t>R.guardTicks)this.lastLeave.delete(k);for(const[k,s]of this.cadence)if(now-s.received>100)this.cadence.delete(k);}
 static leave(id){this.prune();if(this.lastLeave.size<4096||this.lastLeave.has(id))this.lastLeave.set(id,system.currentTick);else this.leaveOverflow=system.currentTick;for(const[n,s]of this.shots)if(s.packet.shooterId===id)this.shots.delete(n);}
 static source(packet) {
  try {
   const active=this.getActiveMatchId?.();
   if(active!==null&&!(typeof active==='string'&&active))return null;
   const shooter=world.getAllPlayers().find(e=>e.id===packet.shooterId);
   if(!living(shooter)||blocked(shooter)||String(shooter.getGameMode?.()).toLowerCase()==='spectator')return null;
   if(context(shooter)!==packet.sourceContext||!Number.isInteger(packet.selectedSlot)||shooter.selectedSlotIndex!==packet.selectedSlot)return null;
   const held=shooter.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand);
   if(held?.typeId!==R.id||typeof packet.weaponToken!=='string'||!/^[A-Za-z0-9_:-]{1,128}$/.test(packet.weaponToken))return null;
   const lore=held.getLore()||[],identity=lore.filter(l=>l.startsWith('RAIL_ID:'));
   if(identity.length!==1||identity[0]!=='RAIL_ID:'+packet.weaponToken)return null;
   const sessions=shooter.getTags().filter(t=>t.startsWith(SESSION));
   if(typeof packet.sessionTag!=='string'||!packet.sessionTag.startsWith(SESSION)||packet.sessionTag.length<=SESSION.length||packet.sessionTag.length>128||sessions.length!==1||sessions[0]!==packet.sessionTag)return null;
   const markers=lore.filter(l=>l.startsWith('PVP_MATCH:'));
   if(isMatchLocked(shooter)){
    const match=shooter.getTags().find(t=>t.startsWith('pvp:match:'))?.slice(10);
    if(!shooter.hasTag('pvp:participant')||!shooter.hasTag('pvp:active')||!shooter.hasTag('pvp:guns_ready')||shooter.hasTag('pvp:guns_finished')||active!==match||markers.length!==1||markers[0]!=='PVP_MATCH:'+match)return null;
   }else if(markers.length)return null;
   const head=body(shooter),direction=unit(shooter.getViewDirection());
   if(!point(head)||!direction)return null;
   const regions=RegionManager.getRegions().filter(r=>r.dimension===shooter.dimension.id).map(r=>({min:r.min,max:r.max,priority:r.priority||0,allow:r.flags?.allowPvp!==false}));
   const approval={allowed:true,targetDimension:shooter.dimension.id,regions,adminBypass:false};
   if(!approvedSegment(approval,shooter.dimension.id,shooter.location,head)||Integration.segmentCrossesSafeZone(shooter.dimension.id,shooter.location,head))return null;
   return {shooter,head,direction};
  }catch{return null;}
 }
 static safeSegments(dim,segments){
  try{const regions=RegionManager.getRegions().filter(r=>r.dimension===dim.id).map(r=>({min:r.min,max:r.max,priority:r.priority||0,allow:r.flags?.allowPvp!==false}));
   const approval={allowed:true,targetDimension:dim.id,regions,adminBypass:false};
   return segments.every(([a,b])=>approvedSegment(approval,dim.id,a,b)&&!Integration.segmentCrossesSafeZone(dim.id,a,b));
  }catch{return false;}
 }
 static clip(dim,a,b){
  const length=distance(a,b),dir=unit(delta(a,b))||{x:1,y:0,z:0},trace=traceCover(dim,a,dir,length,0);
  if(!trace.blocked)return{location:b,blocked:false};
  // DDA reports unknown chunks as blocked too. Probe the encountered cell;
  // only a known obstacle produces an explosion, never an unavailable chunk.
  try{const p=along(a,dir,Math.min(length,trace.distance+.025)),block=dim.getBlock({x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z)});
   if(!block)return{location:trace.end,blocked:true,unavailable:true};
   if(block.isAir||['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(block.typeId))return{location:trace.end,blocked:true,unavailable:true};
   return{location:trace.end,blocked:true,unavailable:false};
  }catch{return{location:trace.end,blocked:true,unavailable:true};}
 }
 static allowed(s,source,target,impact,{splash=false}={}){
  try{const p=source.shooter;
   if(excluded(target)||target.id===p.id||target.dimension.id!==p.dimension.id||['creative','spectator'].includes(String(target.getGameMode?.()).toLowerCase()))return false;
   if(target.typeId==='minecraft:player'&&(!isMatchLocked(target)||!target.hasTag('pvp:participant')))return false;
   if(isMatchLocked(p)||isMatchLocked(target)){if(!matchDamageAllowed(p,target))return false;}else if(CombatManager.areTeammates(p,target))return false;
   if(!p.hasTag('pvp:participant')&&target.typeId!=='minecraft:player'){const eq=target.getComponent('minecraft:equippable');if([EquipmentSlot.Mainhand,EquipmentSlot.Offhand].some(k=>eq?.getEquipment(k)?.typeId==='test_gun:riot_shield'))return false;}
   const center=body(target),segments=[...s.paths,[p.location,source.head],[impact,center],[center,target.location]];
   if(!this.safeSegments(p.dimension,segments))return false;
   if((splash||!s.packet.skill)&&this.clip(p.dimension,impact,center).blocked)return false;
   return true;
  }catch{return false;}
 }
 static damage(s,target,amount,impact,{splash=false,stun=false}={}){
  const source=this.source(s.packet);if(!source||!this.allowed(s,source,target,impact,{splash}))return null;
  const gun={id:R.id,name:'裂轨',tier:'legendary',type:'energy',isRailCannon:true,noHealthFallback:true,disableCritical:true,disableHeadshot:true,
   ...(stun?{fixedArmorPenetration:.5}:{}),stats:{damage:amount,armorPenetration:.35,damageDropOff:0,headshotMultiplier:1,maxRange:40}};
  const record=Feedback.beginFeedback({nonce:`rail_${s.packet.nonce}_${s.feedbackSerial=(s.feedbackSerial||0)+1}`},source.shooter,target);
  let applied=false;try{applied=DamageHandler.handleHit(null,source.shooter,target,gun,body(target))===true;}catch{}
  Feedback.finishFeedback(record,target,applied);
  if(!applied){if(record)Feedback.feedback.delete(record.nonce);return null;}
  if(stun&&living(target))try{applyAuthoritativeRailStun(target);}catch{}
  return record || {unmeasured:true};
 }
 static impact(s,location,direct){
  // Delete before callbacks: no duplicate or reentrant explosion can commit.
  if(!this.shots.delete(s.packet.nonce))return;
  const source=this.source(s.packet);if(!source||!this.safeSegments(source.shooter.dimension,[...s.paths,[source.shooter.location,source.head]]))return;
  let hits=0;const feedback=[];
  if(direct){const f=this.damage(s,direct,s.profile.damage,location);if(f){hits++;feedback.push(f);}}
  if(s.profile.radius>0){let targets=[];try{targets=source.shooter.dimension.getEntities({location,maxDistance:s.profile.radius+4});}catch{}
   const seen=new Set();for(const target of targets){if(seen.has(target.id)||target.id===direct?.id)continue;seen.add(target.id);
    const d=distance(body(target),location);if(d>s.profile.radius)continue;
    const f=this.damage(s,target,Math.max(1,s.profile.splash*(1-d/s.profile.radius)),location,{splash:true});if(f){hits++;feedback.push(f);}
   }
  }
  // Coordinates are the authoritative swept collision, not the visual copy.
  const result={nonce:s.packet.nonce,impact:location,dimension:source.shooter.dimension.id,collision:true,done:true,hits};
  system.run(()=>this.reply('tg:rail_impact_result',{...result,feedback:feedback.map(r=>Feedback.consumeFeedback(r)).filter(Boolean)}));
 }
 static handleRequest(event){
  if(event.id!=='tg:rail_launch'||event.sourceType!==ScriptEventSource.Server||event.sourceEntity||event.sourceBlock||typeof event.message!=='string'||event.message.length>4000)return;
  let p;try{p=JSON.parse(event.message);}catch{return;}
  const now=system.currentTick;
  if(!p||typeof p.nonce!=='string'||!/^[A-Za-z0-9_:-]{1,96}$/.test(p.nonce)||typeof p.shooterId!=='string'||!Number.isInteger(p.issuedTick)||p.issuedTick>now||now-p.issuedTick>R.guardTicks)return;
  this.prune();if(this.seen.has(p.nonce)||this.seen.size>=R.maxReplay)return;this.seen.set(p.nonce,p.issuedTick);
  if(p.issuedTick<=Math.max(this.lastLeave.get(p.shooterId)??-1,this.leaveOverflow))return;
  let accepted=false;
  try{const source=this.source(p),profile=p.skill===true?{damage:24,radius:0,splash:0,spread:0}:railProfile(p.chargeTicks),direction=point(p.direction)&&unit(p.direction);
   if(source&&profile&&typeof p.skill==='boolean'&&point(p.origin)&&direction&&distance(source.head,p.origin)<=3&&this.shots.size<R.maxShots){
    const cadenceKey=p.shooterId+':'+(p.skill?'skill':'shell'),last=this.cadence.get(cadenceKey);
    if(!last||p.issuedTick-last.issuedTick>=12){
     const muzzle=this.clip(source.shooter.dimension,source.head,p.origin);
     if(!muzzle.blocked&&this.safeSegments(source.shooter.dimension,[[source.head,p.origin]])){
      if(p.skill){const until=Number(source.shooter.getDynamicProperty('sapi_rail_skill_until')||0);if(until>Date.now())throw Error('skill cooldown');source.shooter.setDynamicProperty('sapi_rail_skill_until',Date.now()+R.skillCooldownMs);}
      const shot={packet:p,profile,position:{...p.origin},velocity:{x:direction.x*(p.skill?R.skillSpeed:R.speed),y:direction.y*(p.skill?R.skillSpeed:R.speed),z:direction.z*(p.skill?R.skillSpeed:R.speed)},travel:0,age:0,paths:[[source.head,{...p.origin}]],hit:new Set()};
      this.shots.set(p.nonce,shot);this.cadence.set(cadenceKey,{issuedTick:p.issuedTick,received:now});accepted=true;
     }
    }
   }
  }catch{}
  this.reply('tg:rail_launch_result',{nonce:p.nonce,accepted,protocol:1});
 }
 static tick(){
  this.prune();tickAuthoritativeRailStuns();
  for(const [nonce,s]of this.shots){
   const source=this.source(s.packet);if(!source){this.shots.delete(nonce);continue;}
   const dim=source.shooter.dimension,range=s.packet.skill?R.skillRange:R.range;
   if(++s.age>R.maxFlightTicks||s.travel>=range){this.shots.delete(nonce);this.reply('tg:rail_impact_result',{nonce,dimension:dim.id,collision:false,done:true,hits:0,feedback:[]});continue;}
   const length=Math.min(Math.hypot(s.velocity.x,s.velocity.y,s.velocity.z),range-s.travel),direction=unit(s.velocity);
   if(!direction){this.shots.delete(nonce);continue;}
   const count=Math.max(1,Math.ceil(length/R.sweepStep));let ended=false;
   for(let i=0;i<count&&!ended;i++){
    const start={...s.position},end=along(start,direction,length/count),segment=s.packet.skill?{location:end,blocked:false}:this.clip(dim,start,end),actual=segment.location;
    if(segment.unavailable){this.shots.delete(nonce);ended=true;break;}
    const segmentLength=distance(start,actual);s.paths.push([start,actual]);
    if(!this.safeSegments(dim,[[start,actual]])){this.shots.delete(nonce);ended=true;break;}
    let candidates=[];try{candidates=dim.getEntities({location:add(start,delta(start,actual),.5),maxDistance:segmentLength/2+4}).filter(t=>!excluded(t)&&t.id!==source.shooter.id&&!s.hit.has(t.id)).map(target=>({target,hit:nearSegment(body(target),start,actual,s.packet.skill?R.skillRadius:.7)})).filter(x=>x.hit&&(s.packet.skill||!this.clip(dim,start,body(x.target)).blocked)).sort((a,b)=>a.hit.t-b.hit.t);}catch{this.shots.delete(nonce);ended=true;break;}
    if(s.packet.skill){for(const c of candidates){if(s.hit.size>=R.skillMaxTargets)break;s.hit.add(c.target.id);const impact=add(start,delta(start,actual),c.hit.t),f=this.damage(s,c.target,R.skillDamage,impact,{stun:true});if(f){const targetId=c.target.id;system.run(()=>{const feedback=Feedback.consumeFeedback(f);this.reply('tg:rail_impact_result',{nonce:s.packet.nonce,targetId,dimension:dim.id,collision:false,done:false,hits:1,feedback:feedback?[feedback]:[]});});}}}
    else if(candidates.length){const c=candidates[0];this.impact(s,add(start,delta(start,actual),c.hit.t),c.target);ended=true;break;}
    s.travel+=segmentLength;s.position=actual;
    if(segment.blocked){this.impact(s,actual);ended=true;break;}
   }
   if(!ended&&!s.packet.skill){s.velocity={x:s.velocity.x*R.drag,y:s.velocity.y*R.drag-R.gravity,z:s.velocity.z*R.drag};}
   if(!ended&&s.travel>=range){this.shots.delete(nonce);system.run(()=>this.reply('tg:rail_impact_result',{nonce,dimension:dim.id,collision:false,done:true,hits:0,feedback:[]}));}
  }
 }
 static registerEvents(getActiveMatchId){
  if(typeof getActiveMatchId==='function')this.getActiveMatchId=getActiveMatchId;if(this.registered)return;
  if(!system.afterEvents?.scriptEventReceive?.subscribe||!world.afterEvents?.playerLeave?.subscribe||!world.afterEvents?.playerSpawn?.subscribe)return;
  system.afterEvents.scriptEventReceive.subscribe(e=>this.handleRequest(e));world.afterEvents.playerLeave.subscribe(({playerId})=>this.leave(playerId));world.afterEvents.playerSpawn.subscribe(({player})=>this.leave(player.id));
  system.runInterval(()=>this.tick(),1);this.registered=true;
 }
}
