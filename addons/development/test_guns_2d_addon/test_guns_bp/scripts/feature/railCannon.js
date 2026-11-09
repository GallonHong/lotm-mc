import { world, system, EquipmentSlot, ScriptEventSource } from '@minecraft/server';
import { RAIL, chargeProfile, pointOnSegment, cooldownRemaining, spreadDirection, approvedAt } from './utils/railRules.js';
import { pvpCanAttack, isPvpParticipant, pvpMatch } from './utils/pvpRules.js';
import { isProtectedTeammate } from './utils/teamRules.js';
import { getHeldGun, getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { getMuzzle, clipSegment } from './utils/muzzleUtils.js';
import { GunVisuals } from './gunVisuals.js';
import { DamageHandler } from './damageHandler.js';
import { ReloadManager } from './reload.js';
import { applyRailStun, initializeRailStuns, tickRailStuns } from './railStun.js';
const CD_KEY='tg_liegui_skill_until';
const add=(a,b,s=1)=>({x:a.x+b.x*s,y:a.y+b.y*s,z:a.z+b.z*s});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const body=e=>{try{return e.getHeadLocation();}catch{return add(e.location,{x:0,y:0.8,z:0});}};
const valid=e=>{try{return e?.isValid()&&e.getComponent('minecraft:health')?.currentValue>0;}catch{return false;}};
function tell(p,s){try{p.sendMessage(`§b[裂轨] §r${s}`);}catch{}}
function particle(d,id,p){try{d.spawnParticle(id,p);}catch{}}
function eligible(p,t){return valid(t)&&t.id!==p.id&&!isProtectedTeammate(p,t)&&!t.typeId.includes('hud')&&!t.typeId.includes('armor_stand')&&!['creative','spectator'].includes(t.getGameMode?.());}
function snapshot(p){return{dimension:p.dimension.id,match:pvpMatch(p),participant:isPvpParticipant(p)};}
function same(p,s){return valid(p)&&pvpCanAttack(p)&&p.dimension.id===s.dimension&&pvpMatch(p)===s.match&&isPvpParticipant(p)===s.participant;}

export class RailCannon {
 static charges=new Map();static cooling=new Map();static ended=new Map();static waves=[];static pending=new Map();static serial=0;
 static initialize(){initializeRailStuns();system.afterEvents?.scriptEventReceive?.subscribe(e=>{
  if(e.id!=='tg:rail_guard_result'||e.sourceType!==ScriptEventSource.Server||e.sourceEntity||e.sourceBlock)return;
  try{const data=JSON.parse(e.message),req=this.pending.get(data.nonce);if(!req)return;this.pending.delete(data.nonce);
   if(data.allowed===true&&system.currentTick-req.created<=20)req.commit(data);
  }catch{}
 });}
 static cancel(player){const id=typeof player==='string'?player:player.id;this.charges.delete(id);this.waves=this.waves.filter(w=>w.shooter.id!==id);for(const[k,r]of this.pending)if(r.shooterId===id)this.pending.delete(k);if(typeof player!=='string')GunVisuals.reset(player);}
 static begin(player,gun){
  if(!gun?.isRailCannon)return false;
  if(!valid(player)||!pvpCanAttack(player)||ReloadManager.isReloading(player))return true;
  if((this.ended.get(player.id)??-99)>=system.currentTick-1)return true;
  if(this.charges.has(player.id))return true;
  if(player.isSneaking){this.skill(player,gun);return true;}
  if((this.cooling.get(player.id)||0)>system.currentTick)return true;
  if(getCurrentAmmo(player,gun)<1){ReloadManager.startReload(player,gun);return true;}
  this.charges.set(player.id,{...snapshot(player),start:system.currentTick,slot:player.selectedSlotIndex,gun});
  GunVisuals.charge(player,gun,RAIL.fullCharge,RAIL.maxHold);
  try{player.dimension.playSound('beacon.activate',player.location,{volume:0.7,pitch:0.7});}catch{}
  return true;
 }
 static release(player){const c=this.charges.get(player.id);this.ended.set(player.id,system.currentTick);if(!c)return;
  this.charges.delete(player.id);GunVisuals.reset(player);
  if(!same(player,c)||player.selectedSlotIndex!==c.slot||getHeldGun(player)?.gun.id!==RAIL.id||ReloadManager.isReloading(player))return;
  const held=system.currentTick-c.start,profile=chargeProfile(held);
  if(!profile||held>=RAIL.maxHold){this.cooling.set(player.id,system.currentTick+8);return;}
  if(getCurrentAmmo(player,c.gun)<1)return;
  setCurrentAmmo(player,c.gun,0);this.cooling.set(player.id,system.currentTick+12);
  const muzzle=getMuzzle(player,c.gun);const dir=spreadDirection(player.getViewDirection(),profile.spread);
  GunVisuals.fire(player,c.gun);this.wear(player);particle(player.dimension,'test_gun:liegui_muzzle',muzzle.location);
  try{player.dimension.playSound(c.gun.shootSound,muzzle.location,{volume:1.5,pitch:0.65});}catch{}
  const shot={...snapshot(player),shooter:player,gun:c.gun,profile,position:muzzle.location,dir,travel:0,skill:false,hit:new Set()};
  if(muzzle.blocked)this.impact(shot,muzzle.location);else this.waves.push(shot);
 }
 static wear(p){try{const eq=p.getComponent('minecraft:equippable'),item=eq?.getEquipment(EquipmentSlot.Mainhand),d=item?.getComponent('minecraft:durability');if(item?.typeId!==RAIL.id||!d)return;d.damage++;eq.setEquipment(EquipmentSlot.Mainhand,d.damage>=d.maxDurability?undefined:item);}catch{}}
 static skill(p,g){
  if(!pvpCanAttack(p)||ReloadManager.isReloading(p))return;
  let until;try{until=p.getDynamicProperty(CD_KEY);}catch{return;}
  const remain=cooldownRemaining(until);if(remain){if((this.ended.get(p.id)??-99)<system.currentTick-2)tell(p,`裂空音波冷却 ${remain} 秒。`);this.ended.set(p.id,system.currentTick);return;}
  // Persist before any emission; switching guns, death and reconnect cannot clear cooldown.
  try{p.setDynamicProperty(CD_KEY,Date.now()+RAIL.skillCooldownMs);}catch{return;}
  this.ended.set(p.id,system.currentTick);this.charges.delete(p.id);
  const m=getMuzzle(p,g);GunVisuals.fire(p,g);particle(p.dimension,'minecraft:sonic_explosion',m.location);
  try{p.dimension.playSound('mob.warden.sonic_boom',m.location,{volume:1.3,pitch:0.9});}catch{}
  this.waves.push({...snapshot(p),shooter:p,gun:g,position:m.location,dir:spreadDirection(p.getViewDirection(),0),travel:0,skill:true,hit:new Set()});
 }
 static hit(w,target,damage,stun=false){
  const p=w.shooter;if(!same(p,w)||!eligible(p,target))return;
  const loc=body(target),dim=target.dimension.id,created=system.currentTick;
  const commit=(approval)=>{
   // Recheck current location against all region boundaries in the one-shot SAPI snapshot.
   if (approval && !approvedAt(approval,target.dimension.id,target.location)) return;
   if(!same(p,w)||!eligible(p,target)||target.dimension.id!==dim||dist(body(target),loc)>2||system.currentTick-created>20)return;
   const gun={...w.gun,disableCritical:true,disableHeadshot:true,noHealthFallback:true,
    ...(stun?{fixedArmorPenetration:0.5}:{}),stats:{...w.gun.stats,damage,damageDropOff:0,headshotMultiplier:1,knockback:undefined}};
   if(DamageHandler.handleHit(null,p,target,gun,loc)===true&&stun&&valid(target))applyRailStun(target);
  };
  if(target.typeId!=='minecraft:player'||isPvpParticipant(p)){commit();return;}
  // Native stable APIs cannot synchronously query another BP's protected regions.
  // Ask SAPI at actual impact time, and fail closed if its companion update is absent.
  const nonce=`rail_${system.currentTick}_${++this.serial}`;
  this.pending.set(nonce,{created,shooterId:p.id,commit});
  try{p.runCommand(`scriptevent tg:rail_guard ${JSON.stringify({nonce,shooterId:p.id,targetId:target.id})}`);}catch{this.pending.delete(nonce);}
 }
 static impact(w,loc,direct){
  particle(w.shooter.dimension,'test_gun:liegui_impact',loc);
  if(direct)this.hit(w,direct,w.profile.damage);
  if(!w.profile.radius)return;
  let targets=[];try{targets=w.shooter.dimension.getEntities({location:loc,maxDistance:w.profile.radius+1});}catch{}
  for(const t of targets.slice(0,32)){
   if(t.id===direct?.id||!eligible(w.shooter,t))continue;
   const center=body(t),distance=dist(center,loc);if(distance>w.profile.radius)continue;
   if(clipSegment(w.shooter.dimension,loc,center).blocked)continue;
   this.hit(w,t,Math.max(1,w.profile.splash*(1-distance/w.profile.radius)));
  }
 }
 static tick(){
  tickRailStuns();
  for(const [id,c]of this.charges){const p=world.getAllPlayers().find(x=>x.id===id);
   if(!p||!same(p,c)||p.selectedSlotIndex!==c.slot||getHeldGun(p)?.gun.id!==RAIL.id||ReloadManager.isReloading(p)||p.isSneaking){this.charges.delete(id);if(p)GunVisuals.reset(p);continue;}
   const ticks=system.currentTick-c.start;
   if(ticks>=RAIL.maxHold){this.charges.delete(id);this.ended.set(id,system.currentTick);this.cooling.set(id,system.currentTick+RAIL.ventTicks);GunVisuals.vent(p,c.gun);try{p.dimension.playSound('random.fizz',p.location,{volume:0.7,pitch:0.7});}catch{}}
  }
  const next=[];
  for(const w of this.waves){
   const p=w.shooter;if(!same(p,w))continue;
   const range=w.skill?RAIL.skillRange:40,speed=w.skill?2:3;
   const end=add(w.position,w.dir,Math.min(speed,range-w.travel)),segment=w.skill?{location:end,blocked:false}:clipSegment(p.dimension,w.position,end);
   const actual=segment.location;let candidates=[];
   try{candidates=p.dimension.getEntities({location:add(w.position,w.dir,speed/2),maxDistance:speed/2+3}).filter(t=>eligible(p,t)&&!w.hit.has(t.id)).map(t=>({target:t,hit:pointOnSegment(body(t),w.position,actual,w.skill?RAIL.skillRadius:0.7)})).filter(x=>x.hit).sort((a,b)=>a.hit.t-b.hit.t);}catch{}
   if(w.skill){for(const c of candidates){if(w.hit.size>=RAIL.maxTargets)break;w.hit.add(c.target.id);this.hit(w,c.target,RAIL.skillDamage,true);}}
   else if(candidates.length){const c=candidates[0],loc=add(w.position,{x:actual.x-w.position.x,y:actual.y-w.position.y,z:actual.z-w.position.z},c.hit.t);this.impact(w,loc,c.target);continue;}
   particle(p.dimension,w.skill?'minecraft:sonic_explosion':'test_gun:liegui_tracer',actual);
   if(segment.blocked){this.impact(w,actual);continue;}
   w.travel+=dist(w.position,actual);w.position=actual;if(w.travel<range)next.push(w);
  }this.waves=next;
  for(const[k,r]of this.pending)if(system.currentTick-r.created>20)this.pending.delete(k);
  for(const[k,t]of this.cooling)if(t<=system.currentTick)this.cooling.delete(k);
  for(const[k,t]of this.ended)if(system.currentTick-t>40)this.ended.delete(k);
 }
}
