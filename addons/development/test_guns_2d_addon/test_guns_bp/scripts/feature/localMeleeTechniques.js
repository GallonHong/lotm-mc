import { world, system, EquipmentSlot, ScriptEventSource } from '@minecraft/server';
import { EquipmentWear } from './equipmentWear.js';
import { ArmorEngine } from './armorEngine.js';
import { LEGACY_MELEE } from '../data/legacyMelee.js';
import { guardEquipment } from '../data/guardEquipment.js';
import { SURVIVAL_MELEE, meleeDamageProfile } from '../data/survivalMelee.js';
import { DamageHandler } from './damageHandler.js';
import { combatAuthority } from './utils/combatAuthority.js';
import { isProtectedTeammate } from './utils/teamRules.js';
import { pvpCanAttack, isPvpParticipant, pvpMatch, pvpWeaponAllowed } from './utils/pvpRules.js';
import { distance, traceCover, unit } from '../data/baizhan.js';
// Guns owns the technique runtime whether or not SAPI is installed.


export const TECHNIQUES=Object.freeze({doubleSneak:7,rollTicks:8,dodgeTicks:4,rollCooldownMs:1200,
 parryTicks:5,clashTicks:1,poise:5,breakTicks:24,parryStaggerTicks:12,
 sprintMultiplier:1.2,jumpMultiplier:1.35,maxStates:256,maxAttacks:512,guardTicks:20});
const STATE_KEY='tg_local_melee_techniques_v1';
const live=e=>{try{return e?.isValid()&&e.getComponent('minecraft:health')?.currentValue>0;}catch{return false;}};
const blocked=e=>['pvp:downed','pvp:dead','pvp:protected','apoc:downed','apoc:downed_pending','apoc_downed','apoc:true_death','tg:rail_stunned'].some(t=>e.hasTag(t));
const held=e=>e.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand);
const equipment=p=>guardEquipment(held(p),p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Offhand));
const identity=i=>(i?.getLore?.()||[]).filter(l=>l.startsWith('SM_ID:'));
const head=e=>{try{return e.getHeadLocation();}catch{return{...e.location,y:e.location.y+1.6};}};
const body=e=>{const h=head(e);return{x:e.location.x,y:(e.location.y+h.y)/2,z:e.location.z};};
export const techniqueContext=e=>JSON.stringify([e.dimension.id,e.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||t.startsWith('apoc')).sort()]);
const scope=e=>e.hasTag('pvp:participant')?'match:'+e.getTags().find(t=>t.startsWith('pvp:match:'))?.slice(10):'survival';
const finite=p=>!!p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
const front=(a,b)=>{const d=unit(a.getViewDirection()),v=unit({x:b.location.x-a.location.x,y:0,z:b.location.z-a.location.z});return d&&v&&d.x*v.x+d.z*v.z>=Math.cos(50*Math.PI/180);};
function animate(p,name,seconds=.4){try{
 const typeId=held(p)?.typeId;
 if(!SURVIVAL_MELEE[typeId]||equipment(p)?.shield)return;
 const rolling=name==='roll';
 // life_time - state_time is the immutable start time, not a refreshed deadline.
 const done=rolling?`!query.is_item_name_any('slot.weapon.mainhand', 0, '${typeId}') || query.state_time >= ${seconds}`:`query.state_time >= ${seconds}`;
 const expression=`temp.tg_melee_done = ${done}; variable.tg_melee_roll_until = ${rolling?`temp.tg_melee_done ? 0 : query.life_time - query.state_time + ${seconds}`:'0'}; return temp.tg_melee_done;`;
 p.playAnimation('animation.tg_melee.'+name,{controller:'tg_melee_techniques',blendOutTime:rolling?0:.08,stopExpression:expression});
}catch{}}
function clearRollVisual(p){try{p.playAnimation('animation.tg_melee.clear',{controller:'tg_melee_techniques',blendOutTime:0,stopExpression:'variable.tg_melee_roll_until = 0; return 1;'});}catch{}}
function cue(p,text,sound='random.anvil_land'){try{p.onScreenDisplay?.setActionBar('§b'+text);p.dimension.playSound(sound,p.location,{volume:.45,pitch:1.2});}catch{}}

/** Compatibility rewrite of reference technique concepts. No prototype patches,
 * raw health edits, permission locks or global native-damage cancellation. */
export class LocalMeleeTechniques {
 static receive; static legacySerial=1000000000;static legacyBleeds=new Map();static states=new Map();static attacks=new Map();static bleeds=new Map();static seen=new Map();static leaves=new Map();static registered=false;static getActiveMatchId;
 static state(p){
  try{if(combatAuthority()!=='local'||p?.typeId!=='minecraft:player')return null;
   const item=held(p),gear=equipment(p),ids=identity(item),trio=!!SURVIVAL_MELEE[item?.typeId];
   if(!live(p)||!gear)return null;
   const sessionTag='local';
   const itemIdentity=trio?(ids[0]||item.typeId):gear.signature;
   const ctx=techniqueContext(p),sc=scope(p);let s=this.states.get(p.id);
   if(s&&(s.context!==ctx||s.identity!==itemIdentity||s.equipmentSignature!==gear.signature||s.slot!==p.selectedSlotIndex||s.sessionTag!==sessionTag)){this.clear(p.id);s=null;}
   if(s)return s;if(this.states.size>=TECHNIQUES.maxStates)return null;
   let root={};const raw=p.getDynamicProperty(STATE_KEY);if(typeof raw==='string')root=JSON.parse(raw);
   const saved=root[sc]||{};
   s={player:p,context:ctx,scope:sc,sessionTag,identity:itemIdentity,equipmentSignature:gear.signature,gear,slot:p.selectedSlotIndex,typeId:item?.typeId||'',
    poise:Number.isFinite(saved.poise)?Math.min(5,saved.poise):5,
    rollCooldown:Number(saved.rollCooldown)||0,heavyUntil:saved.heavyUntil||{},staggerMs:Number(saved.staggerMs)||0,
    guardStart:-100,guard:false,sneaking:!!p.isSneaking,lastSneak:-100,rollUntil:-1,dodgeUntil:-1,rollDirection:null,
    attackTick:-100,attackUntil:-1,lastHit:-100,lastRegen:system.currentTick,root};
   this.states.set(p.id,s);return s;
  }catch{return null;}
 }
 static persist(s){
  try{const record={savedAt:Date.now(),poise:s.poise,rollCooldown:s.rollCooldown,heavyUntil:s.heavyUntil,staggerMs:s.staggerMs};
   // Retain survival and at most the current match, never an unbounded match history.
   const root={};if(s.scope!=='survival'&&s.root.survival)root.survival={poise:s.root.survival.poise,rollCooldown:s.root.survival.rollCooldown,heavyUntil:s.root.survival.heavyUntil,staggerMs:s.root.survival.staggerMs};root[s.scope]=record;
   const text=JSON.stringify(root);s.player.setDynamicProperty(STATE_KEY,text);if(s.player.getDynamicProperty(STATE_KEY)!==text)return false;s.root=root;return true;
  }catch{return false;}
 }
 static clear(id){const s=this.states.get(id);if(s&&combatAuthority()==='local'){clearRollVisual(s.player);this.persist(s);try{s.player.removeTag('tg_melee_staggered');}catch{}}this.states.delete(id);
  for(const[k,b]of this.legacyBleeds)if(b.packet.shooterId===id||b.packet.targetId===id)this.legacyBleeds.delete(k);
  for(const[k,a]of this.attacks)if(a.packet.shooterId===id)this.attacks.delete(k);
  for(const[k,b]of this.bleeds)if(b.packet.shooterId===id||b.targetId===id)this.bleeds.delete(k);
 }
 static pathSafe(dim,a,b){return combatAuthority()==='local'&&finite(a)&&finite(b);}
 static source(p,packet){
  try{if(combatAuthority()!=='local'||!live(p)||blocked(p)||!pvpCanAttack(p)||p.hasTag('pvp:admission')||String(p.getGameMode?.())==='spectator')return null;
   const s=this.state(p);if(!s||s.staggerMs>Date.now())return null;
   const item=held(p);
   if(!pvpWeaponAllowed(p,item))return null;
   if(packet&&(packet.typeId!==s.typeId||packet.identity!==s.identity||packet.selectedSlot!==s.slot||packet.sourceContext!==s.context||packet.sessionTag!==s.sessionTag))return null;
   if(!finite(p.location)||!finite(head(p)))return null;return s;
  }catch{return null;}
 }
 static allowed(p,t,range,angle=180){
  try{if(!this.source(p)||!live(t)||blocked(t)||p.id===t.id||p.dimension.id!==t.dimension.id||blocked(p))return false;
   if(['creative','spectator'].includes(String(t.getGameMode?.()))||['minecraft:armor_stand','minecraft:item','minecraft:xp_orb','test_gun:baizhan_mount'].includes(t.typeId)||t.typeId.includes('hud'))return false;
   if(isProtectedTeammate(p,t)||t.hasTag('pvp:admission'))return false;
   if(!p.hasTag('pvp:participant')&&t.typeId!=='minecraft:player'){const eq=t.getComponent('minecraft:equippable');if([EquipmentSlot.Mainhand,EquipmentSlot.Offhand].some(k=>eq?.getEquipment(k)?.typeId==='test_gun:riot_shield'))return false;}
   const a=body(p),b=body(t),len=distance(a,b),dir=unit({x:b.x-a.x,y:b.y-a.y,z:b.z-a.z}),view=unit(p.getViewDirection());
   if(len>range||!view||len>0&&!dir)return false;
   if(angle<180&&len>0&&view.x*dir.x+view.y*dir.y+view.z*dir.z<Math.cos(angle*Math.PI/180))return false;
   if(traceCover(p.dimension,a,dir||{x:1,y:0,z:0},len,0).blocked)return false;
   return this.pathSafe(p.dimension,p.location,a,t)&&this.pathSafe(p.dimension,a,b,t)&&this.pathSafe(p.dimension,b,t.location,t);
  }catch{return false;}
 }
 static describeAttack(p){try{return p.isOnGround===false&&!p.isInWater&&!p.isFlying?'jump':p.isSprinting?'sprint':'normal';}catch{return'normal';}}
 static noteAttack(p,tick=system.currentTick,kind='normal'){const s=this.state(p);if(s){s.attackTick=tick;s.attackUntil=Math.max(s.attackUntil,tick+4);s.guard=false;}return kind;}
 static stagger(s,ticks){const previous=s.staggerMs;s.staggerMs=Math.max(s.staggerMs,Date.now()+ticks*50);if(!this.persist(s)){s.staggerMs=previous;return false;}s.guard=false;s.rollUntil=-1;s.dodgeUntil=-1;try{s.player.addTag('tg_melee_staggered');}catch{}animate(s.player,'stagger',ticks/20);return true;}
 static modifyHit(p,t,gun,kind='normal'){
  const a=this.source(p);if(!a||system.currentTick<a.rollUntil)return null;const d=this.source(t),now=system.currentTick,tGear=equipment(t);
  const customShield=!!tGear?.shield&&EquipmentWear.isShield(t.getComponent('minecraft:equippable')?.getEquipment(tGear.shieldSlot));
  const shieldResolved=!!tGear?.shield&&(!customShield||(this.state(t)?.staggerMs||0)>Date.now());
  let scale=kind==='jump'?1.35:kind==='sprint'?1.2:1,shieldBlocked=0;
  if(d&&d.context===techniqueContext(t)&&!blocked(t)){
   if(now<d.dodgeUntil)return null;
   if(d.staggerMs<=Date.now()&&front(t,p)){
    if(Math.abs(d.attackTick-now)<=TECHNIQUES.clashTicks&&Math.abs(a.attackTick-now)<=TECHNIQUES.clashTicks){if(this.stagger(a,6)&&this.stagger(d,6)){cue(t,'拼刀');return null;}}
    if(d.guard&&t.isSneaking&&now>=d.attackUntil){
     d.lastHit=now;
     if(now-d.guardStart<TECHNIQUES.parryTicks){if(!this.persist(d))return {...gun,techniqueShieldResolved:shieldResolved,techniqueShieldBlocked:0,stats:{...gun.stats,damage:gun.stats.damage*scale}};this.stagger(a,12);cue(t,'精准招架');animate(t,'parry',.3);return customShield?{...gun,techniqueParried:true,techniqueShieldResolved:false,stats:{...gun.stats,damage:gun.stats.damage*scale}}:null;}
     const previous={poise:d.poise};d.poise-=kind==='heavy'?3:kind==='jump'?2:1;if(!this.persist(d)){Object.assign(d,previous);return {...gun,techniqueShieldResolved:shieldResolved,techniqueShieldBlocked:0,stats:{...gun.stats,damage:gun.stats.damage*scale}};}if(!customShield){if(d.gear.shield)shieldBlocked=gun.stats.damage*scale*.75;scale*=.25;}
     if(d.poise<=0){d.poise=0;this.stagger(d,TECHNIQUES.breakTicks);cue(t,'韧性击破');}else{this.persist(d);cue(t,'格挡');}
    }
   }
  }
  return{...gun,techniqueShieldResolved:shieldResolved,techniqueShieldBlocked:shieldBlocked,stats:{...gun.stats,damage:gun.stats.damage*scale}};
 }
 static canRoll(s){const p=s.player;return s.gear.canRoll&&p.isOnGround===true&&!p.isInWater&&!p.isFlying&&this.source(p)&&system.currentTick>=s.attackUntil&&Date.now()>=s.rollCooldown;}
 static startRoll(s){if(!this.canRoll(s))return false;const dir=unit(s.player.getViewDirection());if(!dir)return false;const flat=unit({x:dir.x,y:0,z:dir.z});if(!flat||!this.rollClear(s.player,flat))return false;
  const before={rollCooldown:s.rollCooldown};s.rollCooldown=Date.now()+1200;
  if(!this.persist(s)){Object.assign(s,before);return false;}
  s.attackUntil=system.currentTick+8;s.rollDirection=flat;s.rollUntil=system.currentTick+8;s.dodgeUntil=system.currentTick+4;s.guard=false;animate(s.player,'roll',.4);return true;
 }
 static rollClear(p,d){
  try{const side={x:-d.z*.32,y:0,z:d.x*.32};
   for(const y of [.1,.9,1.7])for(const offset of [-1,0,1]){
    const a={x:p.location.x+side.x*offset,y:p.location.y+y,z:p.location.z+side.z*offset},b={x:a.x+d.x*.9,y:a.y,z:a.z+d.z*.9};
    if(traceCover(p.dimension,a,d,.9,0).blocked||!this.pathSafe(p.dimension,a,b))return false;
   }
   const foot=p.dimension.getBlock({x:Math.floor(p.location.x+d.x*.6),y:Math.floor(p.location.y-.2),z:Math.floor(p.location.z+d.z*.6)});
   return !!foot&&!foot.isAir&&!foot.isLiquid;
  }catch{return false;}
 }
 static reply(id,data){if(combatAuthority()!=='local')return;this.receive?.({id,sourceType:ScriptEventSource.Server,message:'',data,local:true});}
 static handleLegacy(event){
  if(combatAuthority()!=='local')return;
  if(event.id!=='tg:legacy_melee')return;
  const q=event.packet;
  if(!q)return;
  const spec=LEGACY_MELEE[q.kind];if(!spec||spec.weapon!==q.typeId)return;
  const p=world.getAllPlayers().find(x=>x.id===q.shooterId);let t;try{t=world.getEntity(q.targetId);}catch{return;}
  const s=this.source(p);if(!s||s.typeId!==q.typeId||s.slot!==q.selectedSlot||p.dimension.id!==q.dimension||q.sourceContext!==s.context||JSON.stringify(held(p)?.getLore())!==JSON.stringify(q.lore)||system.currentTick<s.rollUntil||!this.allowed(p,t,spec.range))return;
  if(q.kind==='backstab'&&(!p.isSneaking||front(t,p)))return;
  if(q.kind!=='bleed')this.noteAttack(p,q.issuedTick);
  const gun={category:'melee',damageOverTime:q.kind==='bleed',stats:{damage:spec.damage}};
  // Bleed is an already established wound, still authorized per tick, not a new strike.
  const hit=q.kind==='bleed'?gun:this.modifyHit(p,t,gun);if(!hit)return;
  try{
   const shield=DamageHandler.resolveShieldHit(t,p,hit.stats.damage,body(t),hit),amount=shield.damage;
   const blockedDamage=shield.blockedDamage+(Number(hit.techniqueShieldBlocked)||0),shieldSlot=shield.slot||this.state(t)?.gear.shieldSlot;
   if(shield.blockedDamage>0&&amount<=0){EquipmentWear.block(t,shieldSlot,blockedDamage);shield.respond?.();return;}
   const shieldWear=blockedDamage>0?EquipmentWear.snapshot(t,amount,shieldSlot,blockedDamage,false):null;
   if(amount>0&&t.applyDamage(amount,{cause:q.kind==='bleed'?'magic':q.kind==='axe'?'override':'entityAttack',damagingEntity:p})!==true)return;
   if(shieldWear)EquipmentWear.commit(t,shieldWear);
   shield.respond?.();
   if(!live(t)||blocked(t))return;
   const scale=spec.damage>0?amount/spec.damage:1;
   if(spec.slow)t.addEffect('slowness',Math.max(1,Math.round(spec.slow*scale)),{amplifier:1,showParticles:true});
   if(spec.weakness)t.addEffect('weakness',Math.max(1,Math.round(spec.weakness*scale)),{amplifier:1,showParticles:true});
   if(spec.knockback){const resist=ArmorEngine.getKnockbackResistance(t);if(resist>=1)t.clearVelocity();else{const d=unit({x:t.location.x-p.location.x,y:0,z:t.location.z-p.location.z});if(d)t.applyKnockback(d.x*(1-resist),d.z*(1-resist),spec.knockback*(1-resist)*scale,(q.kind==='axe'?.2:.35)*(1-resist));}}
   if(spec.bleed&&this.legacyBleeds.size<512)this.legacyBleeds.set(p.id+'|'+t.id,{packet:q,next:system.currentTick+20,remaining:3});
  }catch{}
 }
 static handleRequest(event){
  if(combatAuthority()!=='local')return;
  if(!['tg:melee_begin','tg:melee_resolve','tg:melee_cancel'].includes(event.id))return;
  const packet=event.packet;
  const now=system.currentTick;if(!packet)return;
  const p=world.getAllPlayers().find(x=>x.id===packet.shooterId),s=this.source(p,packet);
  if(event.id==='tg:melee_cancel'){const a=this.attacks.get(packet.attackId);if(s&&a&&a.packet.shooterId===p.id&&a.packet.sessionTag===s.sessionTag)this.attacks.delete(packet.attackId);return;}
  if(event.id==='tg:melee_begin'){
   let accepted=false;const spec=SURVIVAL_MELEE[packet.typeId];
   if(s&&spec&&Number.isInteger(packet.index)&&packet.index>=0&&packet.index<spec.damage.length&&typeof packet.heavy==='boolean'&&packet.heavy===!!p.isSneaking&&now>=s.attackUntil&&this.attacks.size<512){
    const mode=packet.heavy?{...spec,...spec.heavy}:spec;
    if(!packet.heavy||(s.heavyUntil[packet.typeId]||0)<=Date.now()){
     if(packet.heavy){s.heavyUntil[packet.typeId]=Date.now()+spec.heavy.cooldown*50;if(!this.persist(s)){this.reply('tg:melee_result',{nonce:packet.nonce,phase:'begin',accepted:false});return;}}
     const kind=packet.heavy?'heavy':this.describeAttack(p);s.attackTick=packet.issuedTick+mode.windup;s.attackUntil=s.attackTick+mode.recovery;s.guard=false;
     this.attacks.set(packet.nonce,{packet,kind,mode,spec,strike:s.attackTick,expires:s.attackTick+20});accepted=true;
    }
   }
   this.reply('tg:melee_result',{nonce:packet.nonce,phase:'begin',accepted});return;
  }
  const attack=this.attacks.get(packet.attackId);if(!attack)return;
  if(!s||attack.packet.shooterId!==p.id||attack.packet.sessionTag!==s.sessionTag)return;this.attacks.delete(packet.attackId);
  if(!s||attack.packet.shooterId!==p.id||attack.packet.identity!==s.identity||now<attack.strike||now>attack.expires){this.reply('tg:melee_result',{nonce:packet.attackId,phase:'resolve',accepted:false,hits:0});return;}
  let targets=[];try{targets=p.dimension.getEntities({location:p.location,maxDistance:attack.mode.range+2}).filter(t=>this.allowed(p,t,attack.mode.range,attack.mode.halfAngle)).sort((a,b)=>distance(body(p),body(a))-distance(body(p),body(b))).slice(0,attack.mode.maxTargets);}catch{}
  let hits=0,feedback=[];for(const t of targets){
   if(!this.source(p,attack.packet)||!this.allowed(p,t,attack.mode.range,attack.mode.halfAngle))continue;
   let gun=meleeDamageProfile(packet.typeId,attack.spec,attack.packet.heavy?attack.mode.damage:attack.spec.damage[attack.packet.index],attack.mode.penetration);
   gun=this.modifyHit(p,t,{...gun,noHealthFallback:true},attack.kind);if(!gun)continue;
   let applied=false;try{applied=DamageHandler.handleHit(null,p,t,gun,body(t))===true;}catch{}
   if(applied){hits++;if(attack.packet.heavy&&attack.mode.slow&&live(t))try{t.addEffect('slowness',attack.mode.slow,{amplifier:1,showParticles:true});}catch{}
    if(attack.packet.heavy&&attack.mode.bleed&&live(t)&&this.bleeds.size<512)this.bleeds.set(p.id+'|'+t.id,{packet:attack.packet,targetId:t.id,remaining:3,next:now+20});}

  }
  system.run(()=>this.reply('tg:melee_result',{nonce:packet.attackId,phase:'resolve',accepted:true,hits,feedback:[]}));
 }
 static tick(){
  if(combatAuthority()!=='local'){this.states.clear();this.attacks.clear();this.bleeds.clear();this.legacyBleeds.clear();return;}
  const now=system.currentTick,present=new Set();
  for(const p of world.getAllPlayers()){
   if(!equipment(p))continue;present.add(p.id);const s=this.state(p);if(!s)continue;
   if(!this.source(p)){if(s.rollUntil>=0)clearRollVisual(p);s.guard=false;s.rollUntil=-1;s.dodgeUntil=-1;continue;}
   const sneak=!!p.isSneaking;
   if(sneak&&!s.sneaking){if(now-s.lastSneak<=7)this.startRoll(s);s.lastSneak=now;s.guardStart=now;}
   s.sneaking=sneak;s.guard=sneak&&now>=s.rollUntil&&now>=s.attackUntil&&s.staggerMs<=Date.now();
   if(now<s.rollUntil){if(!this.rollClear(p,s.rollDirection)){s.rollUntil=now;s.dodgeUntil=now;}else try{p.applyKnockback(s.rollDirection.x,s.rollDirection.z,.28,0);}catch{s.rollUntil=now;s.dodgeUntil=now;}}
   if(s.rollUntil>=0&&now>=s.rollUntil){clearRollVisual(p);s.rollUntil=-1;}
   if(s.staggerMs<=Date.now()){try{p.removeTag('tg_melee_staggered');}catch{}if(s.poise<=0)s.poise=1;}
   if(now-s.lastRegen>=20){s.lastRegen=now;if(now-s.lastHit>=40)s.poise=Math.min(5,s.poise+1);this.persist(s);}
   if(s.guard&&now%8===0)animate(p,'guard',.45);
  }
  for(const[id]of this.states)if(!present.has(id))this.clear(id);
  for(const[k,a]of this.attacks)if(now>a.expires)this.attacks.delete(k);
  for(const[k,t]of this.seen)if(now-t>60)this.seen.delete(k);
  for(const[k,t]of this.leaves)if(now-t>20)this.leaves.delete(k);
  for(const[k,b]of this.legacyBleeds){if(now<b.next)continue;
   const q={...b.packet,nonce:`legacy_${now}_${++this.legacySerial}`,issuedTick:now,kind:'bleed'};
   this.handleLegacy({id:'tg:legacy_melee',packet:q});
   if(--b.remaining<=0)this.legacyBleeds.delete(k);else b.next=now+20;
  }
  for(const[k,b]of this.bleeds){if(now<b.next)continue;const p=world.getAllPlayers().find(x=>x.id===b.packet.shooterId);let t;try{t=world.getEntity(b.targetId);}catch{}
   if(!this.source(p,b.packet)||!this.allowed(p,t,8,180)){this.bleeds.delete(k);continue;}
   const spec=SURVIVAL_MELEE[b.packet.typeId],gun={...meleeDamageProfile(b.packet.typeId,spec,2,.1,true),noHealthFallback:true};
   try{if(DamageHandler.handleHit(null,p,t,gun,body(t))!==true){this.bleeds.delete(k);continue;}}catch{this.bleeds.delete(k);continue;}
   if(--b.remaining<=0)this.bleeds.delete(k);else b.next=now+20;
  }
 }
 static registerEvents(){if(this.registered)return;this.registered=true;
  system.runInterval(()=>this.tick(),1);
  world.afterEvents.entityHitEntity?.subscribe(({damagingEntity})=>{if(damagingEntity?.typeId==='minecraft:player'&&!SURVIVAL_MELEE[held(damagingEntity)?.typeId])this.noteAttack(damagingEntity);});
  world.afterEvents.itemUse?.subscribe(({source})=>{if(source?.typeId==='minecraft:player'&&!SURVIVAL_MELEE[held(source)?.typeId])this.noteAttack(source);});
  world.afterEvents.playerLeave.subscribe(({playerId})=>{this.leaves.set(playerId,system.currentTick);this.clear(playerId);});
  world.afterEvents.playerSpawn.subscribe(({player})=>{this.leaves.set(player.id,system.currentTick);this.clear(player.id);});
  world.afterEvents.entityDie.subscribe(({deadEntity})=>{if(deadEntity)this.clear(deadEntity.id);});
 }
}
