import { world, system } from '@minecraft/server';
const RAIL={stunTicks:24,stunImmunityMs:3000};
const KEY='sapi_rail_stun_v1', TAG='tg:rail_stunned', OWNER='tg:rail_stun_owner:sapi';
function read(p){try{const s=p.getDynamicProperty(KEY);return typeof s==='string'?JSON.parse(s):null;}catch{return null;}}
function blockedByOtherMode(p){return p.hasTag('pvp:dead')||p.hasTag('pvp:downed')||p.hasTag('pvp:protected')||p.hasTag('pvp:admission')||p.hasTag('apoc:downed')||p.hasTag('apoc_downed')||p.getGameMode?.()==='spectator';}
export function isRailStunned(p){if(p?.hasTag?.('tg:rail_stun_owner:sapi')&&p.hasTag(TAG))return true;const s=read(p);return !!s&&s.until>Date.now();}
export function applyAuthoritativeRailStun(target) {
 if(target.typeId!=='minecraft:player') {
  // Bosses keep their mechanics; ordinary mobs receive brief movement/attack suppression.
  if(/boss|titan/.test(target.typeId))return;
  try{target.addEffect('slowness',RAIL.stunTicks,{amplifier:255,showParticles:false});target.addEffect('weakness',RAIL.stunTicks,{amplifier:255,showParticles:false});}catch{}return;
 }
 const now=Date.now(),old=read(target);if(old&&old.immuneUntil>now)return;
 let previousMovement=true;
 try{previousMovement=target.inputPermissions.movementEnabled;}catch{}
 const state={until:now+RAIL.stunTicks*50,immuneUntil:now+RAIL.stunImmunityMs,previousMovement,locked:true};
 // Persist the restoration debt BEFORE disabling movement. A later property
 // failure must never leave a disabled input with an unrecorded lock.
 target.setDynamicProperty(KEY,JSON.stringify(state));target.addTag(TAG);target.addTag(OWNER);
 try{target.inputPermissions.movementEnabled=false;}catch{}
 try{target.addEffect('slowness',RAIL.stunTicks,{amplifier:255,showParticles:false});target.addEffect('weakness',RAIL.stunTicks,{amplifier:255,showParticles:false});}catch{}
}
export function tickAuthoritativeRailStuns(){for(const p of world.getAllPlayers()){
 try{const s=read(p);if(!s){if(p.hasTag(OWNER)){p.removeTag(TAG);p.removeTag(OWNER);}continue;}
  if(s.until>Date.now()&&!blockedByOtherMode(p))continue;
  p.removeTag(TAG);p.removeTag(OWNER);
  if(s.locked){if(blockedByOtherMode(p))continue;if(s.previousMovement)p.inputPermissions.movementEnabled=true;s.locked=false;p.setDynamicProperty(KEY,JSON.stringify(s));}
  if(s.immuneUntil<=Date.now())p.setDynamicProperty(KEY,undefined);
 }catch{}
}}
