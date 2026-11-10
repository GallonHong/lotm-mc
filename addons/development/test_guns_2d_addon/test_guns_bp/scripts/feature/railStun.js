import { world, system } from '@minecraft/server';
import { RAIL } from './utils/railRules.js';
const KEY='tg_rail_stun_v1', TAG='tg:rail_stunned';
function read(p){try{const s=p.getDynamicProperty(KEY);return typeof s==='string'?JSON.parse(s):null;}catch{return null;}}
function blockedByOtherMode(p){return p.hasTag('pvp:dead')||p.hasTag('pvp:downed')||p.hasTag('pvp:protected')||p.hasTag('pvp:admission')||p.hasTag('apoc:downed')||p.hasTag('apoc_downed')||p.getGameMode?.()==='spectator';}
export function isRailStunned(p){if(p?.hasTag?.('tg:rail_stun_owner:sapi')&&p.hasTag(TAG))return true;const s=read(p);return !!s&&s.until>Date.now();}
export function applyRailStun(target) {
 if(target.typeId!=='minecraft:player') {
  // Bosses keep their mechanics; ordinary mobs receive brief movement/attack suppression.
  if(/boss|titan/.test(target.typeId))return;
  try{target.addEffect('slowness',RAIL.stunTicks,{amplifier:255,showParticles:false});target.addEffect('weakness',RAIL.stunTicks,{amplifier:255,showParticles:false});}catch{}return;
 }
 const now=Date.now(),old=read(target);if(old&&old.immuneUntil>now)return;
 let previousMovement=true;
 try{previousMovement=target.inputPermissions.movementEnabled;}catch{}
 const state={until:now+RAIL.stunTicks*50,immuneUntil:now+RAIL.stunImmunityMs,previousMovement,locked:false};
 // Persist ownership before disabling movement, so reload/login can recover it.
 target.setDynamicProperty(KEY,JSON.stringify(state));target.addTag(TAG);
 try{target.inputPermissions.movementEnabled=false;state.locked=true;target.setDynamicProperty(KEY,JSON.stringify(state));}catch{}
 try{target.addEffect('slowness',RAIL.stunTicks,{amplifier:255,showParticles:false});target.addEffect('weakness',RAIL.stunTicks,{amplifier:255,showParticles:false});}catch{}
}
export function tickRailStuns(){for(const p of world.getAllPlayers()){
 try{if(p.hasTag('tg:rail_stun_owner:sapi'))continue;const s=read(p);if(!s){p.removeTag(TAG);continue;}
  if(s.until>Date.now()&&!blockedByOtherMode(p))continue;
  p.removeTag(TAG);
  if(s.locked){if(blockedByOtherMode(p))continue;if(s.previousMovement)p.inputPermissions.movementEnabled=true;s.locked=false;p.setDynamicProperty(KEY,JSON.stringify(s));}
  if(s.immuneUntil<=Date.now())p.setDynamicProperty(KEY,undefined);
 }catch{}
}}
export function initializeRailStuns(){
 for(const name of ['itemUse','playerInteractWithBlock','playerInteractWithEntity','playerBreakBlock']){
  try{world.beforeEvents?.[name]?.subscribe(e=>{const p=e.source||e.player;if(p&&isRailStunned(p))e.cancel=true;});}catch{}
 }
 world.afterEvents?.playerSpawn?.subscribe(()=>system.run(tickRailStuns));
}
