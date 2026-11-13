import { world, system, EquipmentSlot } from '@minecraft/server';
import { getBow } from '../data/bows.js';
import { chargeProfile, splashDamageAt, chainMultiplier, flightStep } from './utils/bowRules.js';
import { DamageHandler } from './damageHandler.js';
import { traceGrenadeSegment } from './utils/grenadeFlight.js';
import { clipSegment } from './utils/muzzleUtils.js';
import { isProtectedTeammate } from './utils/teamRules.js';
import { pvpCanAttack, pvpWeaponAllowed, hasInfinitePvpReserve, pvpMatch, isPvpParticipant } from './utils/pvpRules.js';
const add=(a,b,s=1)=>({x:a.x+b.x*s,y:a.y+b.y*s,z:a.z+b.z*s});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const alive=e=>{try{return e.isValid()&&e.getComponent('minecraft:health')?.currentValue>0;}catch{return false;}};
const context=p=>JSON.stringify([p.dimension.id,isPvpParticipant(p),pvpMatch(p)]);
const held=p=>p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand);
function animate(p,id){try{p.playAnimation(id,{controller:'tg_bow_arms',blendOutTime:.15,...(id.endsWith('player_draw')?{stopExpression:"!query.is_alive || !query.is_using_item || !query.is_item_name_any('slot.weapon.mainhand', 0, 'test_gun:hunter_compound_bow', 'test_gun:carbon_spider_bow')"}:{})});}catch{}}
function eligible(p,t){try{return alive(t)&&t.id!==p.id&&!isProtectedTeammate(p,t)&&!['creative','spectator'].includes(t.getGameMode?.())&&!t.typeId.includes('armor_stand');}catch{return false;}}
function clearArrow(a){try{a.entity?.remove();}catch{}}
function feedback(d,id,pos,options){try{d.playSound(id,pos,options);}catch{}}
function particle(d,id,pos){try{d.spawnParticle(id,pos);}catch{}}
/** Standard arrow item is consumed. An inert visual entity + swept segment collision
 * owns parabolic flight, so vanilla arrow damage can never double-hit the target. */
export class BowEngine {
 static charges=new Map(); static arrows=[]; static chains=new Map(); static slowCooldown=new Map(); static initialized=false;
 static initialize(){
  if(this.initialized)return;this.initialized=true;
  world.afterEvents.itemStartUse.subscribe(e=>{if(getBow(e.itemStack?.typeId))this.start(e.source,e.itemStack);});
  // Both can be emitted by different use components/platforms; release is idempotent.
  world.afterEvents.itemStopUse.subscribe(e=>this.release(e.source));
  world.afterEvents.itemReleaseUse?.subscribe(e=>this.release(e.source));
  world.afterEvents.playerSpawn.subscribe(({player})=>this.cancel(player.id));
  world.afterEvents.playerLeave.subscribe(({playerId})=>this.cancel(playerId));
  system.runInterval(()=>this.tick(),1);
 }
 static start(p,item){
  try{
   const bow=getBow(item.typeId);if(!bow||!alive(p)||!pvpCanAttack(p)||!pvpWeaponAllowed(p,item))return;
   this.charges.set(p.id,{player:p,bow,slot:p.selectedSlotIndex,start:system.currentTick,context:context(p)});
   animate(p,'animation.tg_bow.player_draw');
  }catch{}
 }
 static cancel(id){const charge=this.charges.get(id);if(charge)animate(charge.player,'animation.tg_bow.player_release');this.charges.delete(id);this.chains.delete(id);this.slowCooldown.delete(id);this.arrows=this.arrows.filter(a=>{if(a.shooter.id!==id)return true;clearArrow(a);return false;});}
 static release(p){
  const c=this.charges.get(p?.id);if(!c)return;this.charges.delete(p.id);
  try{
   const item=held(p);if(!alive(p)||!pvpCanAttack(p)||context(p)!==c.context||p.selectedSlotIndex!==c.slot||item?.typeId!==c.bow.id||!pvpWeaponAllowed(p,item))return;
   const ticks=system.currentTick-c.start;if(ticks<3||this.arrows.length>=128)return;
   const profile=chargeProfile(c.bow,ticks),infinite=hasInfinitePvpReserve(p)||p.getGameMode?.()==='creative';
   const inventory=p.getComponent('minecraft:inventory')?.container;
   let ammoSlot=-1,ammo;
   if(!infinite){for(let i=0;i<(inventory?.size||0);i++){const candidate=inventory.getItem(i);if(candidate?.typeId==='minecraft:arrow'){ammoSlot=i;ammo=candidate;break;}}
    if(ammoSlot<0){p.onScreenDisplay.setActionBar('§c需要原版箭');return;}}
   const origin=p.getHeadLocation(),direction=p.getViewDirection(),dim=p.dimension;
   let entity;try{entity=dim.spawnEntity('test_gun:bow_arrow',origin);}catch{return;}
   // Commit ammo only after successfully creating the shot. No arrow item drops
   // are produced, including PvP reserve arrows, avoiding duplication/escrow leaks.
   try{if(!infinite){if(ammo.amount===1)inventory.setItem(ammoSlot,undefined);else{ammo.amount--;inventory.setItem(ammoSlot,ammo);}}}
   catch{try{entity.remove();}catch{}return;}
   const dur=item.getComponent('minecraft:durability');
   if(dur&&!infinite)try{dur.damage=Math.min(dur.maxDurability,dur.damage+1);p.getComponent('minecraft:equippable').setEquipment(EquipmentSlot.Mainhand,dur.damage>=dur.maxDurability?undefined:item);}catch(error){console.warn('[Test Guns Bow] wear:',error);}
   this.arrows.push({entity,shooter:p,bow:c.bow,profile,position:origin,velocity:{x:direction.x*profile.speed,y:direction.y*profile.speed,z:direction.z*profile.speed},context:c.context,age:0,travel:0});
   feedback(dim,'random.bow',origin,{volume:.65,pitch:1+.25*profile.ratio});
   animate(p,'animation.tg_bow.player_release');
  }catch(error){console.warn('[Test Guns Bow] release:',error);}
 }
 static apply(a,target,point,damage,splash=false){
  if(!eligible(a.shooter,target)||!(damage>0))return false;
  const multiplier=!splash&&a.bow.id==='test_gun:hunter_compound_bow'?chainMultiplier(this.chains.get(a.shooter.id),target.id,system.currentTick):1;
  const gun={id:a.bow.id,category:'bow',disableHeadshot:splash,fixedArmorPenetration:a.bow.penetration,
   stats:{damage:damage*multiplier,damageDropOff:0,armorPenetration:a.bow.penetration,headshotMultiplier:splash?1:1.5}};
  let applied=false;try{applied=DamageHandler.handleHit(null,a.shooter,target,gun,point)===true;}catch(error){console.warn('[Test Guns Bow] damage:',error);}
  if(applied&&!splash&&a.bow.id==='test_gun:hunter_compound_bow')this.chains.set(a.shooter.id,{targetId:target.id,tick:system.currentTick});
  return applied;
 }
 static impact(a,hit){
  const point=hit.location,dim=a.shooter.dimension,affected=new Map();
  if(hit.target&&this.apply(a,hit.target,point,a.profile.damage))affected.set(hit.target.id,hit.target);
  if(!a.bow.explosive){particle(dim,'minecraft:basic_crit_particle',point);return;}
  particle(dim,'minecraft:huge_explosion_emitter',point);particle(dim,'minecraft:large_smoke',point);
  feedback(dim,'random.explode',point,{volume:1,pitch:1.2});
  // All impacts (entity and terrain) reach the same 3D splash path. Direct victim
  // is excluded even if its shield blocked the direct hit: no duplicate blast.
  let targets=[];try{targets=dim.getEntities({location:point,maxDistance:a.profile.radius+2});}catch{}
  for(const target of targets){
   try{
    if(target.id===hit.target?.id||!eligible(a.shooter,target))continue;
    const feet=target.location,head=target.getHeadLocation(),body={x:feet.x,y:(feet.y+head.y)/2,z:feet.z};
    const len=distance(point,body),damage=splashDamageAt(a.profile,len);if(!(damage>0))continue;
    const d={x:(body.x-point.x)/len,y:(body.y-point.y)/len,z:(body.z-point.z)/len};
    if(len>.1&&dim.getBlockFromRay(point,d,{maxDistance:Math.max(.01,len-.1),includePassableBlocks:false,includeLiquidBlocks:false}))continue;
    if(this.apply(a,target,body,damage,true))affected.set(target.id,target);
   }catch{}
  }
  if(a.profile.full&&affected.size>=2&&(this.slowCooldown.get(a.shooter.id)||0)<=system.currentTick){
   this.slowCooldown.set(a.shooter.id,system.currentTick+160);
   for(const target of affected.values())try{target.addEffect('slowness',40,{amplifier:1,showParticles:false});}catch{}
  }
 }
 static tick(){
  for(const[id,c]of this.charges){try{const item=held(c.player);if(!alive(c.player)||!pvpCanAttack(c.player)||context(c.player)!==c.context||c.player.selectedSlotIndex!==c.slot||item?.typeId!==c.bow.id||!pvpWeaponAllowed(c.player,item)){animate(c.player,'animation.tg_bow.player_release');this.charges.delete(id);continue;}
    if(system.currentTick%4===0){const pct=Math.min(100,Math.floor((system.currentTick-c.start)/c.bow.chargeTicks*100));const dur=item.getComponent('minecraft:durability');c.player.onScreenDisplay.setActionBar(`§f${c.bow.name} §7| 蓄力 ${pct}% | ${hasInfinitePvpReserve(c.player)?'系统箭':'原版箭'} | 耐久 ${dur?dur.maxDurability-dur.damage:'—'}`);}
   }catch{this.charges.delete(id);}}
  this.arrows=this.arrows.filter(a=>{
   try{
    if(!alive(a.shooter)||!pvpCanAttack(a.shooter)||context(a.shooter)!==a.context||++a.age>100){clearArrow(a);return false;}
    const next=flightStep(a.position,a.velocity);a.travel+=distance(a.position,next.position);if(a.travel>100){clearArrow(a);return false;}
    const hit=traceGrenadeSegment(a.shooter.dimension,a.position,next.position,{shooterId:a.shooter.id,collides:e=>eligible(a.shooter,e),fallbackClip:clipSegment});
    if(hit.unavailable){clearArrow(a);return false;}
    if(hit.target||hit.blocked){this.impact(a,hit);clearArrow(a);return false;}
    a.position=next.position;a.velocity=next.velocity;
    const v=a.velocity;a.entity.teleport(a.position,{rotation:{x:-Math.atan2(v.y,Math.hypot(v.x,v.z))*180/Math.PI,y:-Math.atan2(v.x,v.z)*180/Math.PI}});
    return true;
   }catch{clearArrow(a);return false;}
  });
  if(system.currentTick%100===0){for(const[id,c]of this.chains)if(system.currentTick-c.tick>100)this.chains.delete(id);for(const[id,t]of this.slowCooldown)if(t<system.currentTick)this.slowCooldown.delete(id);}
 }
}
BowEngine.initialize();
