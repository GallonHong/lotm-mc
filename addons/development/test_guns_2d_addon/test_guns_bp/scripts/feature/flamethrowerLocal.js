import { system, EquipmentSlot } from '@minecraft/server';
import { FLAMETHROWER as F, flameContext } from '../data/flamethrower.js';
import { traceCover, distance, unit } from '../data/baizhan.js';
import { DamageHandler } from './damageHandler.js';
import { isProtectedTeammate } from './utils/teamRules.js';
import { combatAuthority } from './utils/combatAuthority.js';

const living=e=>{try{return e?.isValid()&&e.getComponent('minecraft:health')?.currentValue>0;}catch{return false;}};
const body=e=>{try{return e.getHeadLocation();}catch{return {...e.location,y:e.location.y+0.8};}};
const finite=p=>p&&['x','y','z'].every(a=>Number.isFinite(p[a]));
export function inLocalFlameCone(origin,direction,target){
 const length=distance(origin,target),d=unit(direction);
 return !!d&&Number.isFinite(length)&&length<=F.range+1e-8&&(length<1e-8||
  ((target.x-origin.x)*d.x+(target.y-origin.y)*d.y+(target.z-origin.z)*d.z)/length>=Math.cos(F.coneDegrees*Math.PI/360)-1e-10);
}
const gun=Object.freeze({id:F.id,type:'special',isFlamethrower:true,hasSkill:false,noHealthFallback:true,
 disableCritical:false,disableHeadshot:true,fixedArmorPenetration:F.armorPenetration});
/** Guns-only authority. Never runs as a timeout fallback. Heat belongs to one
 * source session and target context; no vanilla fire or terrain mutations. */
export class FlamethrowerLocal {
 static heat=new Map();
 static clear(id){for(const[k,h]of this.heat)if(h.state.player.id===id||h.target.id===id)this.heat.delete(k);}
 static allowed(s,target,burn=false){
  try{
   const p=s.player;
   if(s.mode!=='local'||combatAuthority()!=='local'||!living(p)||!living(target)||target.id===p.id||p.dimension.id!==target.dimension.id)return false;
   if(['pvp:downed','pvp:dead','pvp:protected','tg:rail_stunned','apoc:downed','apoc:downed_pending','apoc_downed','apoc:true_death'].some(t=>p.hasTag(t))||String(p.getGameMode?.()).toLowerCase()==='spectator')return false;
   if(['pvp:admission','pvp:dead','pvp:protected','apoc:downed_pending','apoc:true_death'].some(t=>target.hasTag(t))||isProtectedTeammate(p,target))return false;
   if(['creative','spectator'].includes(String(target.getGameMode?.()).toLowerCase()))return false;
   if(['minecraft:armor_stand','minecraft:item','minecraft:xp_orb','test_gun:baizhan_mount'].includes(target.typeId)||target.typeId.includes('hud'))return false;
   const eq=target.getComponent('minecraft:equippable');
   if(!p.hasTag('pvp:participant')&&target.typeId!=='minecraft:player'&&[EquipmentSlot.Mainhand,EquipmentSlot.Offhand].some(slot=>eq?.getEquipment(slot)?.typeId==='test_gun:riot_shield'))return false;
   const head=body(p),impact=body(target),length=distance(head,impact);
   if(!finite(head)||!finite(impact))return false;
   if(!burn&&(length>F.range+1e-8||traceCover(p.dimension,head,length?{x:impact.x-head.x,y:impact.y-head.y,z:impact.z-head.z}:{x:1,y:0,z:0},length,0).blocked))return false;
   return true;
  }catch{return false;}
 }
 static damage(s,target,amount,{burn=false}={}){
  // Each direct target/pulse uses the shared gear crit roll; burn never crits.
  try{return DamageHandler.handleHit(null,s.player,target,{...gun,disableCritical:burn,damageOverTime:burn,stats:{damage:amount,armorPenetration:F.armorPenetration,damageDropOff:0,headshotMultiplier:1,maxRange:F.range}},body(target))===true;}catch{return false;}
 }
 static pulse(s,same){
  if(!same(s)||s.mode!=='local'||combatAuthority()!=='local')return;
  let targets;try{targets=s.player.dimension.getEntities({location:body(s.player),maxDistance:F.range+4});}catch{return;}
  const visited=new Set();
  for(const target of targets){
   if(!same(s))break;
   if(visited.has(target.id))continue;visited.add(target.id);
   try{if(!inLocalFlameCone(body(s.player),s.player.getViewDirection(),body(target))||!this.allowed(s,target)||!this.damage(s,target,F.damage)||!living(target))continue;
    const now=system.currentTick,key=JSON.stringify([s.player.id,target.id]),context=flameContext(target);
    let h=this.heat.get(key);
    if(h&&(h.state!==s||h.context!==context)){this.heat.delete(key);h=null;}
    if(!h){if(this.heat.size>=8192)continue;h={state:s,target,context,layers:0,lastHit:now,burnUntil:-1,nextBurn:-1};this.heat.set(key,h);}
    if(now-h.lastHit>=F.heatResetTicks)h.layers=0;
    h.layers=Math.min(F.heatThreshold,h.layers+1);h.lastHit=now;
    if(h.layers>=F.heatThreshold){if(h.burnUntil<now)h.nextBurn=now+F.burnIntervalTicks;h.burnUntil=now+F.burnTicks;}
   }catch{}
  }
 }
 static tick(same){
  const now=system.currentTick;
  for(const[key,h]of this.heat){
   if(!same(h.state)||h.state.mode!=='local'||combatAuthority()!=='local'||!living(h.target)||flameContext(h.target)!==h.context||!this.allowed(h.state,h.target,true)){this.heat.delete(key);continue;}
   if(now-h.lastHit>=F.heatResetTicks)h.layers=0;
   if(now>h.burnUntil){if(!h.layers)this.heat.delete(key);continue;}
   if(now<h.nextBurn)continue;
   h.nextBurn=now+F.burnIntervalTicks;
   if(!this.damage(h.state,h.target,F.burnDamage,{burn:true})){this.heat.delete(key);continue;}
   try{h.target.dimension.spawnParticle('test_gun:flamethrower_ember',body(h.target));}catch{}
  }
 }
}
