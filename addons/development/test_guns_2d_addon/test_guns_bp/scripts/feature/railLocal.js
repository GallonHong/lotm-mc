import { combatAuthority } from './utils/combatAuthority.js';
import { DamageHandler } from './damageHandler.js';
import { isProtectedTeammate } from './utils/teamRules.js';
import { pvpCanAttack } from './utils/pvpRules.js';
import { clipSegment } from './utils/muzzleUtils.js';
import { applyRailStun } from './railStun.js';
import { RAIL } from './utils/railRules.js';
import { railSplashDamage, applyRailSlow, railBlastGeometry, railBlastTargets } from './utils/railBlast.js';

const body=t=>{try{return t.getHeadLocation();}catch{return {...t.location,y:t.location.y+.8};}};
export function railBlastPoint(t,impact){return railBlastGeometry(t,impact)?.point;}
export function localRailEligible(p,t){
 try{return combatAuthority()==='local'&&pvpCanAttack(p)&&!['pvp:protected','pvp:admission','pvp:dead','apoc:downed_pending','apoc:downed','apoc_downed','apoc:true_death'].some(tag=>p.hasTag(tag))&&p.isValid()&&t.isValid()&&t.getComponent('minecraft:health')?.currentValue>0&&t.id!==p.id&&t.dimension.id===p.dimension.id&&!isProtectedTeammate(p,t)&&!['minecraft:armor_stand','minecraft:item','minecraft:xp_orb','test_gun:baizhan_mount'].includes(t.typeId)&&!t.typeId.includes('hud')&&!['creative','spectator'].includes(t.getGameMode?.())&&!['pvp:protected','pvp:admission','pvp:dead','apoc:downed_pending','apoc:true_death'].some(tag=>t.hasTag(tag));}catch{return false;}
}
export function localRailDamage(w,t,amount,impact,{splash=false,stun=false}={}){
 if(w.authority!=='local'||!localRailEligible(w.shooter,t))return false;
 // A verified torso/feet collision must not be rejected because the target's
 // head is behind an overhang. Still check the body-height segment for walls.
 const center=stun?body(t):railBlastPoint(t,impact);
 if(!center||(!stun&&clipSegment(w.shooter.dimension,impact,center).blocked))return false;
 const gun={id:RAIL.id,name:'裂轨',tier:'legendary',type:'energy',isRailCannon:true,noHealthFallback:true,disableCritical:true,disableHeadshot:true,...(stun?{fixedArmorPenetration:.5}:{}),stats:{damage:amount,armorPenetration:.35,damageDropOff:0,headshotMultiplier:1,maxRange:RAIL.projectileRange}};
 try{const applied=DamageHandler.handleHit(null,w.shooter,t,gun,body(t))===true;
  if(applied&&combatAuthority()==='local'&&localRailEligible(w.shooter,t)){
   if(stun)applyRailStun(t);else applyRailSlow(t,w.profile);
  }return applied;
 }catch{return false;}
}
export function localRailImpact(w,location,direct){
 if(w.localCommitted||w.authority!=='local'||combatAuthority()!=='local')return false;
 w.localCommitted=true;
 // Capture before a lethal direct hit runs death/cleanup callbacks. Damage,
 // cover and permission checks remain fresh for every individual recipient.
 const targets=railBlastTargets(w.shooter.dimension,location,w.profile,direct?.id);
 if(direct)localRailDamage(w,direct,w.profile.damage,location);
 for(const t of targets){try{
  if(!localRailEligible(w.shooter,t))continue;
  const geometry=railBlastGeometry(t,location);if(!geometry)continue;
  const amount=railSplashDamage(w.profile,geometry.distance);
  if(amount>0)localRailDamage(w,t,amount,location,{splash:true});
 }catch{}}return true;
}
