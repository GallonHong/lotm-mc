import { world, system, EquipmentSlot } from '@minecraft/server';
import { CombatTechniques } from './combatTechniques.js';
import { DamageHandler } from '../vendor/melee_damageHandler.js';
import { RegionManager } from './region.js';
import { CombatManager } from './combat.js';
import { Integration } from './integration.js';
import { isMatchLocked, matchDamageAllowed } from './match_access.js';
import { distance, traceCover, approvedSegment } from '../data/baizhanRules.js';

export const LEFT_MELEE=Object.freeze({
 'test_gun:salvage_cleaver':{damage:[11,12,16],range:3.2,penetration:.20,cooldown:11},
 'test_gun:breach_hammer':{damage:[19,25],range:2.8,penetration:.50,cooldown:21},
 'test_gun:pulse_spear':{damage:[10,11,15],range:4.5,penetration:.35,cooldown:11}
});
const live=e=>{try{return e?.isValid()&&e.getComponent('minecraft:health')?.currentValue>0;}catch{return false;}};
const head=e=>{try{return e.getHeadLocation();}catch{return{...e.location,y:e.location.y+.8};}};
const context=e=>JSON.stringify([e.dimension.id,e.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||t.startsWith('apoc')).sort()]);
const downed=e=>['pvp:downed','apoc:downed','apoc_downed'].some(t=>e.hasTag(t));
const blocked=e=>['pvp:downed','pvp:dead','pvp:protected','apoc:downed','apoc_downed','apoc:true_death','tg:rail_stunned'].some(t=>e.hasTag(t));
const identity=item=>(item?.getLore?.()||[]).filter(l=>l.startsWith('SM_ID:'));
/** No simulated input / caller-supplied damage accepted. Only a genuine native
 * entityAttack event plus a matching Guns input/cooldown grant can supplement.
 * The un-cancellable native hit has ALREADY happened before this module runs. */
export class MeleeLeftManager {
 static registered=false;static getActiveMatchId;static pending=new Map();static cooldown=new Map();static serial=0;
 static clear(id){for(const[k,r]of this.pending)if(r.shooterId===id||r.targetId===id)this.pending.delete(k);this.cooldown.delete(id);}
 static observe(event){
  if(event?.damageSource?.cause!=='entityAttack'||!(Number.isFinite(event.damage)&&event.damage>0))return;
  const p=event.damageSource.damagingEntity,t=event.hurtEntity;if(p?.typeId!=='minecraft:player'||!t||p.id===t.id)return;
  try{
   const item=p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand),spec=LEFT_MELEE[item?.typeId],ids=identity(item);
   if(!spec||ids.length!==1||!live(p)||!live(t)||blocked(p)||downed(t)||this.pending.size>=512)return;
   const tick=system.currentTick,key=`${p.id}:${t.id}:${tick}`;
   if(this.pending.has(key))return;
   const r={shooterId:p.id,targetId:t.id,typeId:item.typeId,identity:ids[0],slot:p.selectedSlotIndex,
    tick,kind:CombatTechniques.describeAttack(p),nativeDamage:event.damage,sourceContext:context(p),targetContext:context(t)};
   CombatTechniques.noteAttack(p,tick,r.kind);
   this.pending.set(key,r);system.run(()=>this.commit(key));
  }catch{}
 }
 static allowed(r,p,t){
  try{
   const spec=LEFT_MELEE[r.typeId],item=p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand),ids=identity(item);
   if(!spec||!live(p)||!live(t)||blocked(p)||downed(t)||p.id===t.id||p.dimension.id!==t.dimension.id||context(p)!==r.sourceContext||context(t)!==r.targetContext)return false;
   if(item?.typeId!==r.typeId||ids.length!==1||ids[0]!==r.identity||p.selectedSlotIndex!==r.slot)return false;
   if(['creative','spectator'].includes(String(t.getGameMode?.()))||String(p.getGameMode?.())==='spectator')return false;
   if(['minecraft:armor_stand','minecraft:item','minecraft:xp_orb','test_gun:baizhan_mount'].includes(t.typeId)||t.typeId.includes('hud'))return false;
   const prefix=`tg_melee_left:${r.tick}:${r.slot}:${t.id}:`,grants=p.getTags().filter(x=>x.startsWith(prefix));
   if(grants.length!==1)return false;
   const index=Number(grants[0].slice(prefix.length));if(!Number.isInteger(index)||index<0||index>=spec.damage.length)return false;
   r.index=index;
   const active=this.getActiveMatchId?.();if(active!==null&&!(typeof active==='string'&&active))return false;
   const markers=(item.getLore()||[]).filter(l=>l.startsWith('PVP_MATCH:'));
   if(isMatchLocked(p)||isMatchLocked(t)){
    const match=p.getTags().find(x=>x.startsWith('pvp:match:'))?.slice(10);
    if(active!==match||!p.hasTag('pvp:guns_ready')||p.hasTag('pvp:guns_finished')||markers.length!==1||markers[0]!=='PVP_MATCH:'+match||!matchDamageAllowed(p,t))return false;
   }else{if(markers.length||t.typeId==='minecraft:player'||CombatManager.areTeammates(p,t))return false;}
   if(!p.hasTag('pvp:participant')&&t.typeId!=='minecraft:player'){
    const eq=t.getComponent('minecraft:equippable');
    if([EquipmentSlot.Mainhand,EquipmentSlot.Offhand].some(k=>eq?.getEquipment(k)?.typeId==='test_gun:riot_shield'))return false;
   }
   const a=head(p),b=head(t),length=distance(a,b),delta={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z};
   if(length>spec.range+.2||traceCover(p.dimension,a,length?delta:{x:1,y:0,z:0},length,0).blocked)return false;
   const regions=RegionManager.getRegions().filter(x=>x.dimension===p.dimension.id).map(x=>({min:x.min,max:x.max,priority:x.priority||0,allow:x.flags?.allowPvp!==false}));
   const approval={allowed:true,targetDimension:p.dimension.id,regions,adminBypass:false};
   return [[p.location,a],[a,b],[b,t.location]].every(([s,e])=>approvedSegment(approval,p.dimension.id,s,e)&&!Integration.segmentCrossesSafeZone(p.dimension.id,s,e));
  }catch{return false;}
 }
 static commit(key){
  const r=this.pending.get(key);if(!r)return;this.pending.delete(key);
  const now=system.currentTick;if(now-r.tick>3||now<r.tick)return;
  for(const[id,until]of this.cooldown)if(until<now-200)this.cooldown.delete(id);
  if((this.cooldown.get(r.shooterId)||0)>r.tick||this.cooldown.size>=4096&&!this.cooldown.has(r.shooterId))return;
  const p=world.getAllPlayers().find(e=>e.id===r.shooterId);let t;try{t=world.getEntity(r.targetId);}catch{}
  if(!this.allowed(r,p,t))return;
  const spec=LEFT_MELEE[r.typeId];this.cooldown.set(p.id,r.tick+spec.cooldown);
  let gun={id:r.typeId,category:'melee',disableHeadshot:true,noHealthFallback:true,fixedArmorPenetration:spec.penetration,nativeDamageCredit:r.nativeDamage,skipTargetWear:true,
   stats:{damage:spec.damage[r.index],damageDropOff:0,headshotMultiplier:1,armorPenetration:spec.penetration,maxRange:spec.range}};
  gun=CombatTechniques.modifyHit(p,t,gun,r.kind);
  // Native already landed: a technique can deny the supplement but cannot undo that valid hit.
  // No await or transport between CURRENT protection and extra attributed hit.
  let accepted=gun===null;try{if(gun)accepted=DamageHandler.handleHit(null,p,t,gun,head(t))===true;}catch{} // uncertain apply is never retried
  try{world.getDimension('minecraft:overworld').runCommand(`scriptevent tg:melee_left_result ${JSON.stringify({playerId:p.id,tick:r.tick,accepted})}`);}catch{}
 }
 static registerEvents(getActiveMatchId){
  this.getActiveMatchId=getActiveMatchId;if(this.registered)return;
  if(!world.afterEvents?.entityHurt?.subscribe)return;
  world.afterEvents.entityHurt.subscribe(e=>this.observe(e));
  world.afterEvents.playerLeave?.subscribe(({playerId})=>this.clear(playerId));
  world.afterEvents.playerSpawn?.subscribe(({player})=>this.clear(player.id));
  world.afterEvents.entityDie?.subscribe(({deadEntity})=>{if(deadEntity)this.clear(deadEntity.id);});
  this.registered=true;
 }
}
