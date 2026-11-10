import { world, system, EquipmentSlot, ScriptEventSource } from '@minecraft/server';
import { RAIL, chargeProfile, pointOnSegment, cooldownRemaining, spreadDirection } from './utils/railRules.js';
import { pvpCanAttack, isPvpParticipant, pvpMatch } from './utils/pvpRules.js';
import { isProtectedTeammate } from './utils/teamRules.js';
import { getHeldGun, getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { getMuzzle, clipSegment } from './utils/muzzleUtils.js';
import { GunVisuals } from './gunVisuals.js';
import { RailFeedback } from './railFeedback.js';
import { DamageIndicator } from './damageIndicator.js';
import { ReloadManager } from './reload.js';
import { initializeRailStuns, tickRailStuns } from './railStun.js';
const CD_KEY='tg_liegui_skill_until', ITEM_KEY='tg_rail_identity', ID_PREFIX='RAIL_ID:', SESSION_PREFIX='tg_rail_session:';
const add=(a,b,s=1)=>({x:a.x+b.x*s,y:a.y+b.y*s,z:a.z+b.z*s});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const body=e=>{try{return e.getHeadLocation();}catch{return add(e.location,{x:0,y:0.8,z:0});}};
const valid=e=>{try{return (typeof e?.isValid==='function'?e.isValid():e?.isValid===true)&&e.getComponent('minecraft:health')?.currentValue>0;}catch{return false;}};
function tell(p,s){try{p.sendMessage(`§b[裂轨] §r${s}`);}catch{}}
function particle(d,id,p){try{d.spawnParticle(id,p);}catch{}}
function eligible(p,t){return valid(t)&&t.id!==p.id&&!isProtectedTeammate(p,t)&&!t.typeId.includes('hud')&&!t.typeId.includes('armor_stand')&&!['creative','spectator'].includes(t.getGameMode?.());}
function snapshot(p){return{dimension:p.dimension.id,match:pvpMatch(p),participant:isPvpParticipant(p)};}
function same(p,s){return valid(p)&&pvpCanAttack(p)&&p.dimension.id===s.dimension&&pvpMatch(p)===s.match&&isPvpParticipant(p)===s.participant;}

export class RailCannon {
 static charges=new Map();static cooling=new Map();static ended=new Map();static waves=[];static pending=new Map();static serial=0;
 static sessions=new Map();static lastServiceWarning=new Map();
 static initialize(){initializeRailStuns();system.afterEvents?.scriptEventReceive?.subscribe(e=>this.receive(e));world.afterEvents?.playerSpawn?.subscribe(({player})=>this.cancel(player));}
 static removeSession(p){try{for(const t of p?.getTags?.()||[])if(t.startsWith(SESSION_PREFIX))p.removeTag(t);}catch{}}
 static sourceContext(p){try{return JSON.stringify([p.dimension.id,p.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||['apoc:downed','apoc_downed','apoc:true_death'].includes(t)).sort()]);}catch{return null;}}
 static sameSession(s){try{const p=s.player,item=getHeldGun(p)?.item,tags=p.getTags().filter(t=>t.startsWith(SESSION_PREFIX));return this.sessions.get(p.id)===s&&same(p,s)&&p.selectedSlotIndex===s.slot&&item?.typeId===RAIL.id&&item.getDynamicProperty(ITEM_KEY)===s.token&&this.sourceContext(p)===s.sourceContext&&tags.length===1&&tags[0]===s.sessionTag&&(item.getLore()||[]).filter(l=>l.startsWith(ID_PREFIX)).join('')===ID_PREFIX+s.token;}catch{return false;}}
 static ensureSession(p){
  let state=this.sessions.get(p.id);if(state&&!this.sameSession(state)){this.cancel(p);state=null;}if(state)return state;
  if(!valid(p)||!pvpCanAttack(p)||getHeldGun(p)?.gun.id!==RAIL.id)return null;
  try{const eq=p.getComponent('minecraft:equippable'),item=eq?.getEquipment(EquipmentSlot.Mainhand);if(item?.typeId!==RAIL.id)return null;
   let token=item.getDynamicProperty(ITEM_KEY),changed=false;
   if(typeof token!=='string'||!/^[A-Za-z0-9_:-]{1,128}$/.test(token)){token=`rail_${Date.now()}_${system.currentTick}_${++this.serial}`;item.setDynamicProperty(ITEM_KEY,token);changed=true;}
   if((item.getLore()||[]).filter(l=>l.startsWith(ID_PREFIX)).join('')!==ID_PREFIX+token){const lore=(item.getLore()||[]).filter(l=>!l.startsWith(ID_PREFIX)),markers=lore.filter(l=>l.startsWith('PVP_MATCH:'));item.setLore([...lore.filter(l=>!l.startsWith('PVP_MATCH:')).slice(0,Math.max(0,19-markers.length)),ID_PREFIX+token,...markers]);changed=true;}
   if(changed&&eq.setEquipment(EquipmentSlot.Mainhand,item)===false)return null;
   this.removeSession(p);const sessionTag=`${SESSION_PREFIX}${Date.now()}_${system.currentTick}_${++this.serial}`;p.addTag(sessionTag);
   state={...snapshot(p),player:p,slot:p.selectedSlotIndex,token,sessionTag,sourceContext:this.sourceContext(p)};this.sessions.set(p.id,state);
   if(!this.sameSession(state)){this.cancel(p);return null;}return state;
  }catch{return null;}
 }
 static cancel(player){const id=typeof player==='string'?player:player.id,state=this.sessions.get(id);this.removeSession(state?.player||(typeof player==='object'?player:undefined));this.sessions.delete(id);this.charges.delete(id);this.waves=this.waves.filter(w=>w.shooter.id!==id);for(const[k,r]of this.pending)if(r.shooterId===id)this.pending.delete(k);if(typeof player!=='string')GunVisuals.reset(player);}
 static launch(w,chargeTicks){
  const state=this.sessions.get(w.shooter.id);if(!state||!this.sameSession(state)||this.pending.size>=256)return false;
  const nonce=`rail_${system.currentTick}_${++this.serial}`;w.nonce=nonce;w.session=state;
  const packet={nonce,issuedTick:system.currentTick,shooterId:w.shooter.id,weaponToken:state.token,sessionTag:state.sessionTag,selectedSlot:state.slot,sourceContext:state.sourceContext,origin:w.position,direction:w.dir,chargeTicks,skill:w.skill};
  this.pending.set(nonce,{created:system.currentTick,shooterId:w.shooter.id,state,shot:w,impactShown:false,feedbackSeen:new Set()});
  try{w.shooter.dimension.runCommand(`scriptevent tg:rail_launch ${JSON.stringify(packet)}`);return this.pending.has(nonce);}catch{this.pending.delete(nonce);return false;}
 }
 static receive(event){
  if(!['tg:rail_impact_result','tg:rail_launch_result'].includes(event.id)||event.sourceType!==ScriptEventSource.Server||event.sourceEntity||event.sourceBlock||typeof event.message!=='string'||event.message.length>32000)return;
  let data;try{data=JSON.parse(event.message);}catch{return;}
  const req=this.pending.get(data.nonce);if(!req||system.currentTick-req.created>100||!this.sameSession(req.state))return;
  if(event.id==='tg:rail_launch_result'&&data.accepted===true)req.acknowledged=true;
  if(data.accepted===false){this.pending.delete(data.nonce);this.waves=this.waves.filter(w=>w.nonce!==data.nonce);return;}
  if(data.collision===true&&!req.impactShown&&data.dimension===req.state.player.dimension.id&&data.impact&&['x','y','z'].every(a=>Number.isFinite(data.impact[a]))){req.impactShown=true;RailFeedback.impact(req.state.player.dimension,data.impact);this.waves=this.waves.filter(w=>w.nonce!==data.nonce);}
  // Per-target authoritative receipts are rendered through the shared native-
  // event correlation API. No callback can apply or retry damage here.
  for(const [index,feedback]of (Array.isArray(data.feedback)?data.feedback:[]).entries()){
   if(feedback?.shooterId!==req.shooterId||feedback.dimension!==req.state.player.dimension.id)continue;
   const key=`${data.nonce}:${feedback.targetId}:${feedback.hitTick}:${index}`;if(req.feedbackSeen.has(key))continue;req.feedbackSeen.add(key);
   DamageIndicator.receiveRemoteHit(key,feedback);
  }
  if(data.done===true)this.pending.delete(data.nonce);
 }
 static begin(player,gun){
  if(!gun?.isRailCannon)return false;
  if(!this.ensureSession(player))return true;
  if(!valid(player)||!pvpCanAttack(player)||ReloadManager.isReloading(player))return true;
  if((this.ended.get(player.id)??-99)>=system.currentTick-1)return true;
  if(this.charges.has(player.id))return true;
  if(player.isSneaking){this.skill(player,gun);return true;}
  if((this.cooling.get(player.id)||0)>system.currentTick)return true;
  if(getCurrentAmmo(player,gun)<1){ReloadManager.startReload(player,gun);return true;}
  this.charges.set(player.id,{...snapshot(player),start:system.currentTick,slot:player.selectedSlotIndex,gun});
  GunVisuals.charge(player,gun,RAIL.fullCharge,RAIL.maxHold);
  RailFeedback.begin(player,gun);
  return true;
 }
 static release(player){const c=this.charges.get(player.id);if(!c)return;this.ended.set(player.id,system.currentTick);
  this.charges.delete(player.id);GunVisuals.reset(player);
  if(!same(player,c)||player.selectedSlotIndex!==c.slot||getHeldGun(player)?.gun.id!==RAIL.id||ReloadManager.isReloading(player))return;
  const held=system.currentTick-c.start,profile=chargeProfile(held);
  if(held>=RAIL.maxHold){this.vent(player,c.gun);return;}
  if(!profile){this.cooling.set(player.id,system.currentTick+8);return;}
  const ammo=getCurrentAmmo(player,c.gun);if(ammo<1)return;
  if(setCurrentAmmo(player,c.gun,ammo-1)!==ammo-1)return;
  this.cooling.set(player.id,system.currentTick+12);
  const muzzle=getMuzzle(player,c.gun);const dir=spreadDirection(player.getViewDirection(),profile.spread);
  GunVisuals.fire(player,c.gun);this.wear(player);RailFeedback.fire(player,muzzle.location);
  try{player.dimension.playSound(c.gun.shootSound,muzzle.location,{volume:1.5,pitch:0.65});}catch{}
  const shot={...snapshot(player),shooter:player,gun:c.gun,profile,position:muzzle.location,dir,velocity:{x:dir.x*RAIL.projectileSpeed,y:dir.y*RAIL.projectileSpeed,z:dir.z*RAIL.projectileSpeed},age:0,travel:0,skill:false,hit:new Set()};
  if(muzzle.reason!=='unavailable'&&this.launch(shot,held)&&!muzzle.blocked)this.waves.push(shot);
 }
 static vent(player,gun){
  this.cooling.set(player.id,system.currentTick+RAIL.ventTicks);
  GunVisuals.vent(player,gun);RailFeedback.vent(player,getMuzzle(player,gun).location);
 }
 static wear(p){try{const eq=p.getComponent('minecraft:equippable'),item=eq?.getEquipment(EquipmentSlot.Mainhand),d=item?.getComponent('minecraft:durability');if(item?.typeId!==RAIL.id||!d)return;d.damage++;eq.setEquipment(EquipmentSlot.Mainhand,d.damage>=d.maxDurability?undefined:item);}catch{}}
 static skill(p,g){
  if(!pvpCanAttack(p)||ReloadManager.isReloading(p))return;
  let until;try{until=p.getDynamicProperty(CD_KEY);}catch{return;}
  const remain=cooldownRemaining(until);if(remain){if((this.ended.get(p.id)??-99)<system.currentTick-2)tell(p,`裂空音波冷却 ${remain} 秒。`);this.ended.set(p.id,system.currentTick);return;}
  // Persist before any emission; switching guns, death and reconnect cannot clear cooldown.
  try{p.setDynamicProperty(CD_KEY,Date.now()+RAIL.skillCooldownMs);}catch{return;}
  this.ended.set(p.id,system.currentTick);this.charges.delete(p.id);
  const m=getMuzzle(p,g);GunVisuals.fire(p,g);particle(p.dimension,'test_gun:liegui_impact',m.location);
  try{p.dimension.playSound('mob.warden.sonic_boom',m.location,{volume:1.3,pitch:0.9});}catch{}
  const wave={...snapshot(p),shooter:p,gun:g,position:m.location,dir:spreadDirection(p.getViewDirection(),0),travel:0,skill:true,hit:new Set()};
  if(m.reason!=='unavailable'&&this.launch(wave,0))this.waves.push(wave);
 }
 static impact(w,loc,direct){
  // Client collision ends visuals only. SAPI owns independent current-world
  // collision, splash/guard decisions and the one explosion result.
  w.impacted=true;
 }
 static advanceProjectile(w){
  const p=w.shooter,velocity=w.velocity;
  if(!velocity||w.impacted||++w.age>RAIL.maxFlightTicks)return false;
  const speed=Math.hypot(velocity.x,velocity.y,velocity.z);
  const remaining=RAIL.projectileRange-w.travel;
  if(!(speed>0)||remaining<=0)return false;
  const length=Math.min(speed,remaining),steps=Math.max(1,Math.ceil(length/RAIL.sweepStep));
  const delta={x:velocity.x/speed*length/steps,y:velocity.y/speed*length/steps,z:velocity.z/speed*length/steps};
  for(let i=0;i<steps;i++){
   const start=w.position,end=add(start,delta),segment=clipSegment(p.dimension,start,end);
   if(segment.reason==='unavailable')return false;
   const actual=segment.location;let candidates=[];
   try{candidates=p.dimension.getEntities({location:add(start,delta,.5),maxDistance:3.5})
    .filter(t=>eligible(p,t)&&!clipSegment(p.dimension,start,body(t)).blocked)
    .map(t=>({target:t,hit:pointOnSegment(body(t),start,actual,.7)}))
    .filter(c=>c.hit).sort((a,b)=>a.hit.t-b.hit.t);}catch{return false;}
   if(candidates.length){const c=candidates[0],at=add(start,{x:actual.x-start.x,y:actual.y-start.y,z:actual.z-start.z},c.hit.t);
    RailFeedback.trail(p.dimension,start,at);this.impact(w,at,c.target);return false;}
   RailFeedback.trail(p.dimension,start,actual);
   if(segment.blocked){this.impact(w,actual);return false;}
   w.travel+=dist(start,actual);w.position=actual;
  }
  velocity.x*=RAIL.drag;velocity.z*=RAIL.drag;velocity.y=velocity.y*RAIL.drag-RAIL.gravity;
  // Maximum-flight expiration is not a collision, so never fabricate an air blast.
  return w.travel<RAIL.projectileRange&&w.age<RAIL.maxFlightTicks;
 }
 static tick(){
  tickRailStuns();
  const present=new Set(world.getAllPlayers().map(p=>p.id));
  for(const[id,state]of this.sessions)if(!present.has(id)||!this.sameSession(state))this.cancel(state.player);
  for(const p of world.getAllPlayers())if(getHeldGun(p)?.gun.id===RAIL.id)this.ensureSession(p);
  for(const [id,c]of this.charges){const p=world.getAllPlayers().find(x=>x.id===id);
   if(!p||!same(p,c)||p.selectedSlotIndex!==c.slot||getHeldGun(p)?.gun.id!==RAIL.id||ReloadManager.isReloading(p)||p.isSneaking){this.charges.delete(id);if(p)GunVisuals.reset(p);continue;}
   const ticks=system.currentTick-c.start;
   if(ticks<RAIL.maxHold)RailFeedback.charge(p,c.gun,ticks);
   if(ticks % 4 === 0){try{const stage=ticks>=RAIL.fullCharge?'III · 80':ticks>=RAIL.midCharge?'II · 50':ticks>=RAIL.minCharge?'I · 25':'预压';p.onScreenDisplay.setActionBar(`§6[裂轨] §7蓄力 ${Math.min(100,Math.floor(ticks/RAIL.fullCharge*100))}% §f${stage} §7| 松开击发 · 弹药 ${getCurrentAmmo(p,c.gun)}/${c.gun.maxAmmo}`);}catch{}}
   if(ticks>=RAIL.maxHold){this.charges.delete(id);this.ended.set(id,system.currentTick);this.vent(p,c.gun);}
  }
  const next=[];
  for(const w of this.waves){
   const p=w.shooter;if(!same(p,w))continue;
   if(!w.skill){if(this.advanceProjectile(w))next.push(w);continue;}
   const range=RAIL.skillRange,speed=2;
   const end=add(w.position,w.dir,Math.min(speed,range-w.travel)),segment=w.skill?{location:end,blocked:false}:clipSegment(p.dimension,w.position,end);
   // Unavailable chunks/API failures are not physical explosions. Retire the
   // shell without damage or impact feedback rather than inventing a surface.
   if(segment.reason==='unavailable')continue;
   const actual=segment.location;let candidates=[];
   try{candidates=p.dimension.getEntities({location:add(w.position,w.dir,speed/2),maxDistance:speed/2+3}).filter(t=>eligible(p,t)&&!w.hit.has(t.id)&&(w.skill||!clipSegment(p.dimension,w.position,body(t)).blocked)).map(t=>({target:t,hit:pointOnSegment(body(t),w.position,actual,w.skill?RAIL.skillRadius:0.7)})).filter(x=>x.hit).sort((a,b)=>a.hit.t-b.hit.t);}catch{}
   if(w.skill){for(const c of candidates){if(w.hit.size>=RAIL.maxTargets)break;w.hit.add(c.target.id);/* SAPI applies the skill hit/stun, this path is visual only. */}}
   else if(candidates.length){const c=candidates[0],loc=add(w.position,{x:actual.x-w.position.x,y:actual.y-w.position.y,z:actual.z-w.position.z},c.hit.t);RailFeedback.trail(p.dimension,w.position,loc);this.impact(w,loc,c.target);continue;}
   if(w.skill)particle(p.dimension,'test_gun:liegui_impact',actual);
   else RailFeedback.trail(p.dimension,w.position,actual);
   if(segment.blocked){this.impact(w,actual);continue;}
   w.travel+=dist(w.position,actual);w.position=actual;if(w.travel<range)next.push(w);
  }this.waves=next;
  for(const[k,r]of this.pending)if(system.currentTick-r.created>100){
   this.pending.delete(k);
   if(!r.acknowledged&&system.currentTick-(this.lastServiceWarning.get(r.shooterId)??-1000)>100){tell(r.state.player,'配套安全服务未响应，请检查SAPI版本；未执行本地补伤害。');this.lastServiceWarning.set(r.shooterId,system.currentTick);}
  }
  for(const[id,tick]of this.lastServiceWarning)if(system.currentTick-tick>200)this.lastServiceWarning.delete(id);
  for(const[k,t]of this.cooling)if(t<=system.currentTick)this.cooling.delete(k);
  for(const[k,t]of this.ended)if(system.currentTick-t>40)this.ended.delete(k);
 }
}
