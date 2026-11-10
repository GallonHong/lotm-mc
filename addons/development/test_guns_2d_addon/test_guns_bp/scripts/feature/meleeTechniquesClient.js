import { world, system, ScriptEventSource } from '@minecraft/server';
import { DamageIndicator } from './damageIndicator.js';
const context=p=>JSON.stringify([p.dimension.id,p.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||t.startsWith('apoc')).sort()]);
export class MeleeTechniquesClient {
 static sessions=new Map();
 static pending=new Map();static serial=0;static initialized=false;
 static init(){if(this.initialized)return;this.initialized=true;world.afterEvents?.playerLeave?.subscribe(({playerId})=>this.clear(playerId));world.afterEvents?.playerSpawn?.subscribe(({player})=>this.clear(player.id));system.afterEvents?.scriptEventReceive?.subscribe(e=>this.receive(e));}
 static ensure(p,item){
  const ids=(item?.getLore?.()||[]).filter(l=>l.startsWith('SM_ID:'));if(ids.length!==1)return null;
  const signature=JSON.stringify([item.typeId,ids[0],p.selectedSlotIndex,context(p)]);let state=this.sessions.get(p.id);
  if(state&&state.signature!==signature){this.clear(p.id);state=null;}
  if(!state){for(const t of p.getTags())if(t.startsWith('tg_melee_session:'))p.removeTag(t);const tag=`tg_melee_session:${Date.now()}_${system.currentTick}_${++this.serial}`;p.addTag(tag);state={player:p,signature,tag};this.sessions.set(p.id,state);}
  const tags=p.getTags().filter(t=>t.startsWith('tg_melee_session:'));return tags.length===1&&tags[0]===state.tag?state:null;
 }
 static base(p,item){const ids=(item?.getLore?.()||[]).filter(l=>l.startsWith('SM_ID:'));if(ids.length!==1)return null;const session=this.ensure(p,item);if(!session)return null;return{sessionTag:session.tag,issuedTick:system.currentTick,shooterId:p.id,typeId:item.typeId,identity:ids[0],selectedSlot:p.selectedSlotIndex,sourceContext:context(p)};}
 static begin(p,attack,done){
  this.init();this.prune();if(this.pending.size>=512)return false;
  const item=p.getComponent('minecraft:equippable')?.getEquipment('Mainhand'),base=this.base(p,item);if(!base)return false;
  const nonce=`melee_${system.currentTick}_${++this.serial}`,packet={...base,nonce,index:attack.index,heavy:attack.heavy};attack.techniqueNonce=nonce;
  this.pending.set(nonce,{player:p,attack,packet,done,created:system.currentTick,resolved:false});
  try{p.dimension.runCommand('scriptevent tg:melee_begin '+JSON.stringify(packet));return true;}catch{this.pending.delete(nonce);return false;}
 }
 static resolve(p,attack){const r=this.pending.get(attack.techniqueNonce);if(!r||r.resolved)return false;r.resolved=true;
  const packet={...r.packet,nonce:r.packet.nonce+'_resolve',attackId:r.packet.nonce,issuedTick:system.currentTick};
  try{p.dimension.runCommand('scriptevent tg:melee_resolve '+JSON.stringify(packet));return true;}catch{this.pending.delete(r.packet.nonce);r.done?.(false,0);return false;}
 }
 static receive(e){
  if(e.id!=='tg:melee_result'||e.sourceType!==ScriptEventSource.Server||e.sourceEntity||e.sourceBlock||typeof e.message!=='string'||e.message.length>16000)return;
  let data;try{data=JSON.parse(e.message);}catch{return;}
  const r=this.pending.get(data.nonce);if(!r||system.currentTick-r.created>80)return;
  if(data.phase==='begin'){if(data.accepted!==true){this.pending.delete(data.nonce);r.done?.(false,0);}return;}
  if(data.phase!=='resolve'||!r.resolved)return;this.pending.delete(data.nonce);
  const item=r.player.getComponent('minecraft:equippable')?.getEquipment('Mainhand'),base=this.base(r.player,item);
  if(!base||base.sessionTag!==r.packet.sessionTag||base.identity!==r.packet.identity||base.selectedSlot!==r.packet.selectedSlot||base.sourceContext!==r.packet.sourceContext){r.done?.(false,0);return;}
  if(data.accepted===true)for(const [i,f]of (Array.isArray(data.feedback)?data.feedback:[]).entries())if(f?.shooterId===r.player.id&&f.dimension===r.player.dimension.id)DamageIndicator.receiveRemoteHit(data.nonce+':'+i,f);
  r.done?.(data.accepted===true,Number.isInteger(data.hits)?data.hits:0);
 }
 static clear(id){const s=this.sessions.get(id);if(s){try{for(const t of s.player.getTags())if(t.startsWith('tg_melee_session:'))s.player.removeTag(t);}catch{}this.sessions.delete(id);}for(const[k,r]of this.pending)if(r.player.id===id){this.pending.delete(k);try{r.player.dimension.runCommand('scriptevent tg:melee_cancel '+JSON.stringify({...r.packet,nonce:k+'_cancel',attackId:k,issuedTick:system.currentTick}));}catch{}}}
 static prune(){
  const present=new Set();for(const p of world.getAllPlayers?.()||[]){try{const item=p.getComponent('minecraft:equippable')?.getEquipment('Mainhand');if(['test_gun:salvage_cleaver','test_gun:breach_hammer','test_gun:pulse_spear'].includes(item?.typeId)){present.add(p.id);this.ensure(p,item);}}catch{}}
  for(const[id]of this.sessions)if(!present.has(id))this.clear(id);
  for(const[k,r]of this.pending)if(system.currentTick-r.created>80){this.pending.delete(k);r.done?.(false,0);}}
}
