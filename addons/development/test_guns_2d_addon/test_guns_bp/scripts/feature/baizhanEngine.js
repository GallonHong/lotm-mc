import { BaizhanImpactFeedback } from './baizhanImpactFeedback.js';
import { BaizhanWear } from './baizhanWear.js';
import { world, system, EquipmentSlot, ScriptEventSource } from '@minecraft/server';
import { BAIZHAN, chooseRound, traceCover, unit, point, distance } from '../data/baizhan.js';
import { getHeldGun, getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { pvpCanAttack, isPvpParticipant, hasInfinitePvpReserve } from './utils/pvpRules.js';
import { isProtectedTeammate } from './utils/teamRules.js';
import { consumeAmmoFromInventory, countAmmoInInventory, isCreativePlayer } from './utils/inventoryUtils.js';
import { getMuzzle, clipSegment } from './utils/muzzleUtils.js';
import { drawBaizhanTracer } from './baizhanFeedback.js';
import { DamageIndicator } from './damageIndicator.js';
import { RecoilManager } from './recoilManager.js';
import { GunVisuals } from './gunVisuals.js';
import { ReloadManager } from './reload.js';

const ITEM_KEY = 'tg_baizhan_identity';
const SHARED_ID_PREFIX = 'BAIZHAN_ID:';
const SESSION_PREFIX = 'tg_baizhan_session:';
function sharedIdentity(item,token){
 try{const markers=(item?.getLore?.()||[]).filter(line=>line.startsWith(SHARED_ID_PREFIX));return markers.length===1&&markers[0]===SHARED_ID_PREFIX+token;}catch{return false;}
}
function valid(entity) { try { return typeof entity?.isValid === 'function' ? entity.isValid() : entity?.isValid === true; } catch { return false; } }
function alive(entity) { try { return valid(entity) && entity.getComponent('minecraft:health')?.currentValue > 0; } catch { return false; } }
function body(entity) { try { return entity.getHeadLocation(); } catch { return { ...entity.location, y: entity.location.y + 0.8 }; } }
function canOperate(player) {
 try { return alive(player) && pvpCanAttack(player) && !['apoc:downed','apoc_downed','apoc:true_death'].some(tag=>player.hasTag(tag)) &&
  String(player.getGameMode?.()).toLowerCase()!=='spectator'; } catch { return false; }
}
function context(entity) {
 try { return JSON.stringify([entity.dimension.id, entity.getTags().filter(t => t.startsWith('pvp:') || t.startsWith('sapi_team_') || ['apoc:downed','apoc_downed','apoc:true_death'].includes(t)).sort()]); } catch { return null; }
}
function tell(player, message) { try { player.onScreenDisplay?.setActionBar?.(`§6[百战] §r${message}`); } catch {} }
function effect(dimension,id,location) { try { dimension.spawnParticle(id,location); } catch {} }
function eligible(shooter,target) {
 try { return canOperate(shooter) && alive(target) && shooter.id !== target.id && shooter.dimension.id === target.dimension.id &&
  pvpCanAttack(shooter) && (target.typeId!=='minecraft:player'||isPvpParticipant(target)) && !isProtectedTeammate(shooter,target) && target.typeId !== BAIZHAN.mountId &&
  !['minecraft:armor_stand','minecraft:item','minecraft:xp_orb'].includes(target.typeId) &&
  !target.typeId.includes('hud') && !['creative','spectator'].includes(String(target.getGameMode?.()).toLowerCase());
 } catch { return false; }
}

/** The actual item never leaves the player's hand. The mount is cosmetic only.
 * Therefore mount cleanup NEVER refunds, adds, moves or drops guns/ammunition. */
export class BaizhanEngine {
 static players = new Map();
 static pending = new Map();
 static burns = new Map();
 static serial = 0;
 static initialized = false;

 static initialize() {
  if (this.initialized) return;
  this.initialized = true;
  BaizhanWear.initialize();
  system.afterEvents?.scriptEventReceive?.subscribe(event => this.receiveHit(event));
  world.afterEvents?.playerSpawn?.subscribe(({player})=>this.clear(player));
 }
 static clear(player) {
  const id = typeof player === 'string' ? player : player.id;
  const state = this.players.get(id);
  const owner=state?.player||(typeof player==='object'?player:world.getAllPlayers().find(p=>p.id===id));
  this.removeSession(owner);
  this.players.delete(id);
  if (state) BaizhanWear.settle(state.player,state.token,state.wearScope);
  if (state?.mount) { try { if (valid(state.mount.entity)) state.mount.entity.remove(); } catch {} }
  for (const [key,request] of this.pending) if (request.state.player.id === id || request.target.id === id) this.pending.delete(key);
  for (const [key,burn] of this.burns) if (burn.state.player.id === id || burn.target.id === id) this.burns.delete(key);
  if (state) { RecoilManager.clearPlayer(id); GunVisuals.reset(state.player); }
 }
 static same(state) {
  const player = state.player;
  try { return this.players.get(player.id) === state && canOperate(player) && context(player) === state.context &&
   player.selectedSlotIndex === state.slot && getHeldGun(player)?.item.getDynamicProperty(ITEM_KEY) === state.token &&
   sharedIdentity(getHeldGun(player)?.item,state.token) && !!state.sessionTag &&
   player.getTags().filter(tag=>tag.startsWith(SESSION_PREFIX)).length===1 && player.hasTag(state.sessionTag); }
  catch { return false; }
 }
 static ensure(player,gun) {
  BaizhanWear.requestState(player);
  let state = this.players.get(player.id);
  if (state && !this.same(state)) { this.clear(player); state = undefined; }
  if (state) return state;
  if (!canOperate(player) || !gun?.isBaizhan) return null;
  try {
   const equipment = player.getComponent('minecraft:equippable');
   const item = equipment?.getEquipment(EquipmentSlot.Mainhand);
   if (item?.typeId !== BAIZHAN.id || !BaizhanWear.canUse(player,item)) return null;
   let token = item.getDynamicProperty(ITEM_KEY);
   const fresh=typeof token!=='string'||!token;
   if(fresh){
    const shared=(item.getLore?.()||[]).filter(line=>line.startsWith(SHARED_ID_PREFIX));
    if(shared.length>1)return null;
    token=shared.length===1?shared[0].slice(SHARED_ID_PREFIX.length):`bz_${Date.now()}_${system.currentTick}_${++this.serial}`;
    if(!/^[A-Za-z0-9_:-]{1,128}$/.test(token))return null;
    item.setDynamicProperty(ITEM_KEY,token);
   }
   if(token.length>128)return null;
   // ItemStack dynamic properties are private to the Guns BP UUID. The one
   // shared lore marker proves this held item to SAPI without moving wear debt.
   if(fresh||!sharedIdentity(item,token)){
    const lore=item.getLore?.()||[],pvp=lore.filter(line=>line.startsWith('PVP_MATCH:'));
    const display=fresh?['§7手持100发弹仓 · 潜行1秒架枪 / 起身收枪','§7右键手动射击 · 架枪直接消耗背包机枪弹药','§7五种随机弹头 · 架枪穿透最多2格软掩体','§7对载具/无人机×2 · 现有弹药按1物品/发计数']:lore.filter(line=>!line.startsWith(SHARED_ID_PREFIX)&&!line.startsWith('PVP_MATCH:'));
    item.setLore([...display.slice(0,19-pvp.length),SHARED_ID_PREFIX+token,...pvp]);
    if(equipment.setEquipment(EquipmentSlot.Mainhand,item)===false)return null;
    const saved=equipment.getEquipment(EquipmentSlot.Mainhand);
    if(saved?.getDynamicProperty(ITEM_KEY)!==token||!sharedIdentity(saved,token))return null;
   }
   if(!BaizhanWear.settle(player,token))return null;
   state = { wearScope:BaizhanWear.scope(player),player,gun,slot:player.selectedSlotIndex,token,context:context(player),
    trigger:false,triggerUntil:0,cooldownUntil:0,mount:null,waitForStand:false,lastHud:-100,lastGuardHint:-100 };
   this.players.set(player.id,state);
   if(!this.rotateSession(state)){this.clear(player);return null;}
   return state;
  } catch { return null; }
 }
 static removeSession(player){
  try{for(const tag of player?.getTags?.()||[])if(tag.startsWith(SESSION_PREFIX))player.removeTag(tag);}catch{}
 }
 static rotateSession(state){
  const player=state.player;
  this.removeSession(player);state.sessionTag='';
  for(const[key,r]of this.pending)if(r.state===state)this.pending.delete(key);
  for(const[key,b]of this.burns)if(b.state===state)this.burns.delete(key);
  try{
   const tag=`${SESSION_PREFIX}${Date.now()}_${system.currentTick}_${++this.serial}_${Math.floor(Math.random()*0x100000000).toString(36)}`;
   player.addTag(tag);
   const current=player.getTags().filter(value=>value.startsWith(SESSION_PREFIX));
   if(current.length!==1||current[0]!==tag)return false;
   state.sessionTag=tag;return true;
  }catch{return false;}
 }
 static stop(player) { const state = this.players.get(player.id); if(state){state.trigger=false;BaizhanWear.settle(player,state.token,state.wearScope);} }
 static use(player,gun) {
  const state = this.ensure(player,gun);
  if (!state) return;
  // Input may arrive before the first crouch tick. Never fire a handheld shot
  // through that ordering window; deployment is driven by posture alone.
  if (player.isSneaking && !state.mount) this.deploy(state);
  state.trigger=true;
  state.triggerUntil=system.currentTick+BAIZHAN.maxBurstTicks;
  this.fire(state);
 }
 static deploy(state) {
  const player = state.player;
  if (state.waitForStand || state.mount || !this.same(state)) return;
  if(!this.rotateSession(state))return;
  ReloadManager.cancelReload(player);
  state.trigger=false;
  try {
   // Need a stable floor and free space at the gun pivot. Fail closed in air,
   // water and unloaded chunks. Do not overwrite the player's sneaking state.
   const origin = { ...player.location };
   const floor = player.dimension.getBlock({x:Math.floor(origin.x),y:Math.floor(origin.y-0.1),z:Math.floor(origin.z)});
   if (!floor || floor.isAir || floor.isLiquid || floor.isSolid === false || player.isInWater) {
    state.waitForStand=true; tell(player,'需要站在坚实地面上架枪。起身后重试。'); return;
   }
   const pivot = { ...origin,y:origin.y+BAIZHAN.mountedPivotHeight };
   if (clipSegment(player.dimension,player.getHeadLocation(),pivot).blocked) {
    state.waitForStand=true; tell(player,'架枪位置被挡住。起身后重试。'); return;
   }
   const entity = player.dimension.spawnEntity(BAIZHAN.mountId,origin);
   if(!valid(entity))throw new Error('mount not valid');
   state.mount={entity,origin,readyAt:system.currentTick+BAIZHAN.deployTicks};
   entity.addTag(`baizhan_owner:${player.id}`);
   this.aim(state);
  } catch { this.retrieve(state); state.waitForStand=true; tell(player,'架枪未成功，请起身后重试。'); }
 }
 static retrieve(state) {
  this.rotateSession(state);
  BaizhanWear.settle(state.player,state.token,state.wearScope);
  if(state.mount) { try { if(valid(state.mount.entity))state.mount.entity.remove(); } catch {} }
  state.mount=null;
  state.trigger=false;
  // In-flight approvals cannot outlive this deployment, including a quick
  // uncrouch/re-crouch during the asynchronous guard response.
  for (const [key,request] of this.pending) if(request.state===state)this.pending.delete(key);
  for (const [key,burn] of this.burns) if(burn.state===state)this.burns.delete(key);
 }
 static aim(state) {
  try {
   const rotation=state.player.getRotation();
   state.mount.entity.setRotation({x:0,y:rotation.y});
   state.mount.entity.setProperty('test_gun:aim_pitch',Math.max(-90,Math.min(90,rotation.x)));
  } catch { /* Model failure must not transfer ownership or grant ammo. */ }
 }
 static tickPlayer(player,gun) {
  if(!gun?.isBaizhan) { if(this.players.has(player.id))this.clear(player); return; }
  const state=this.ensure(player,gun); if(!state)return;
  if(player.isSneaking) {
   if(!state.mount)this.deploy(state);
   if(state.mount) {
    if(!valid(state.mount.entity) || distance(player.location,state.mount.origin)>0.45 || player.isInWater) {
     this.retrieve(state);state.waitForStand=true;tell(player,'架枪已收回，请起身后重新架设。');return;
    }
    this.aim(state);
   }
  } else {
   if(state.mount)this.retrieve(state);
   state.waitForStand=false;
  }
  if(ReloadManager.isReloading(player)) { ReloadManager.tick(player,gun); return; }
  if(state.trigger && system.currentTick<=state.triggerUntil)this.fire(state);
  else if(state.trigger)this.stop(player);
  if(system.currentTick-state.lastHud>=5) {
   state.lastHud=system.currentTick;
   if(state.mount) {
    const remaining=Math.max(0,state.mount.readyAt-system.currentTick);
    const ammo=hasInfinitePvpReserve(player)||isCreativePlayer(player)?'∞':countAmmoInInventory(player,BAIZHAN.ammoId);
    tell(player,remaining?`架设中 ${Math.floor((1-remaining/BAIZHAN.deployTicks)*100)}% · 保持潜行`:`已架设 · 背包备弹 ${ammo} · 右键射击 / 起身收枪`);
   } else if(!state.waitForStand)tell(player,`手持 ${getCurrentAmmo(player,gun)}/${gun.maxAmmo} · 潜行架枪`);
  }
 }
 static fire(state) {
  const player=state.player,gun=state.gun,now=system.currentTick;
  if(!this.same(state)||!state.trigger||now<state.cooldownUntil||ReloadManager.isReloading(player))return;
  const mounted=!!state.mount;
  if(player.isSneaking && (!mounted||now<state.mount.readyAt))return;
  if(mounted && (!player.isSneaking||distance(player.location,state.mount.origin)>0.45||!valid(state.mount.entity)))return;
  const direction=unit(mounted?player.getViewDirection():RecoilManager.getShotDirection(player,gun,player.getViewDirection()));
  if(!direction)return;
  let origin,muzzle;
  if(mounted)origin={...state.mount.origin,y:state.mount.origin.y+BAIZHAN.mountedPivotHeight};
  else { muzzle=getMuzzle(player,gun);origin=muzzle.location; }
  const trace=muzzle?.blocked?{blocked:true,distance:0,end:origin,cells:[]}:traceCover(player.dimension,origin,direction,BAIZHAN.range,mounted?BAIZHAN.maxPenetrations:0);
  // Reserve exactly once, before emission. Mount never reads or changes the
  // loaded magazine; creative/PvP helpers intentionally use virtual reserve.
  if((mounted?countAmmoInInventory(player,BAIZHAN.ammoId):getCurrentAmmo(player,gun))<1) {
   this.stop(player);if(!mounted)ReloadManager.startReload(player,gun);else tell(player,'背包没有机枪弹药。');return;
  }
  if(!BaizhanWear.reserve(player,state.token)){this.stop(player);return;}
  if(mounted) {
   if(consumeAmmoFromInventory(player,BAIZHAN.ammoId,1)!==1){BaizhanWear.cancelReservation(player,state.token);this.stop(player);tell(player,'背包没有机枪弹药。');return;}
  } else {
   const ammo=getCurrentAmmo(player,gun);
   if(ammo<1){BaizhanWear.cancelReservation(player,state.token);this.stop(player);ReloadManager.startReload(player,gun);return;}
   if(setCurrentAmmo(player,gun,ammo-1)!==ammo-1){BaizhanWear.cancelReservation(player,state.token);this.stop(player);return;}
  }
  state.cooldownUntil=now+(mounted?BAIZHAN.mountedFireTicks:BAIZHAN.handFireTicks);
  const round=chooseRound();
  let end=trace.end,target;
  try {
   const hits=player.dimension.getEntitiesFromRay(origin,direction,{maxDistance:trace.distance,ignoreBlockCollision:true}).sort((a,b)=>a.distance-b.distance);
   for(const hit of hits) {
    if(!valid(hit.entity)||hit.entity.id===player.id||hit.entity.typeId===BAIZHAN.mountId||['minecraft:item','minecraft:xp_orb'].includes(hit.entity.typeId))continue;
    if(!Number.isFinite(hit.distance)||hit.distance<0||hit.distance>trace.distance)continue;
    // Teammates/protected targets still stop the bullet instead of letting it
    // tunnel through them and harm another player behind.
    target=hit.entity;end=point(origin,direction,hit.distance);break;
   }
  } catch { target=undefined; }
  const visibleStart=mounted?point(origin,direction,Math.min(BAIZHAN.mountedMuzzleReach,distance(origin,end))):origin;
  drawBaizhanTracer(player.dimension,visibleStart,end,round);
  try { player.dimension.playSound(gun.shootSound,visibleStart,{volume:1.3,pitch:0.9}); } catch {}
  if(mounted) {
   try { state.mount.firePhase=state.mount.firePhase==='a'?'b':'a'; state.mount.entity.playAnimation(`animation.baizhan.mount_fire_${state.mount.firePhase}`,{controller:'baizhan_fire',blendOutTime:0}); } catch {}
  } else GunVisuals.fire(player,gun);
  if(target && eligible(player,target))this.requestHit(state,target,{kind:'direct',round,origin,impact:end,mounted,damage:gun.stats.damage});
  if(round==='splash')this.splash(state,origin,end,target,mounted);
  if(BaizhanWear.isBroken(player,state.token))this.stop(player);
 }
 static splash(state,shotOrigin,impact,direct,mounted) {
  const player=state.player;
  let targets=[];try{targets=player.dimension.getEntities({location:impact,maxDistance:BAIZHAN.splashRadius+1});}catch{}
  for(const target of targets.slice(0,32)) {
   if(target.id===direct?.id||!eligible(player,target))continue;
   const center=body(target),d=distance(center,impact);
   if(d>BAIZHAN.splashRadius||clipSegment(player.dimension,impact,center).blocked)continue;
   this.requestHit(state,target,{kind:'splash',round:'splash',origin:impact,shotOrigin,impact:center,mounted,
    damage:BAIZHAN.splashDamage*Math.max(0.2,1-d/BAIZHAN.splashRadius)});
  }
 }
 static requestHit(state,target,shot) {
  if(!this.same(state)||!eligible(state.player,target)||this.pending.size>=BAIZHAN.maxPending)return;
  const nonce=`baizhan_${system.currentTick}_${++this.serial}`;
  const request={state,target,shot,created:system.currentTick,shooterLocation:{...state.player.location},shooterHead:{...state.player.getHeadLocation()},targetLocation:{...target.location},targetContext:context(target)};
  this.pending.set(nonce,request);
  DamageIndicator.expectAuthoritative(nonce,state.player,target);
  try {
   // Dimension command is server-originated, unlike player.runCommand. The
   // companion refuses player, command-block and unbound source events.
   state.player.dimension.runCommand(`scriptevent tg:baizhan_hit ${JSON.stringify({nonce,issuedTick:system.currentTick,gunId:BAIZHAN.id,shooterId:state.player.id,targetId:target.id,
    weaponToken:state.token,sessionTag:state.sessionTag,selectedSlot:state.slot,sourceContext:state.context,targetContext:context(target),round:shot.round,
    origin:shot.origin,impact:shot.impact,shotOrigin:shot.shotOrigin,shotMounted:shot.mounted,mounted:shot.mounted,kind:shot.kind})}`);
  } catch { this.pending.delete(nonce);DamageIndicator.cancelAuthoritative(nonce);this.guardHint(state); }
 }
 static guardHint(state) {
  if(system.currentTick-state.lastGuardHint<100)return;
  state.lastGuardHint=system.currentTick;tell(state.player,'安全校验未通过或命中回执未到，暂未确认命中效果。');
 }
 static receiveHit(event) {
  if(event.id!=='tg:baizhan_hit_result'||event.sourceType!==ScriptEventSource.Server||event.sourceEntity||event.sourceBlock)return;
  let data;try{data=JSON.parse(event.message);}catch{return;}
  const request=this.pending.get(data?.nonce);if(!request)return;
  this.pending.delete(data.nonce);
  const {state,target,shot}=request;
  // Cosmetics may survive a lethal target; pending nonce and source metadata
  // bind feedback. No damage or gameplay side effect is performed here.
  if(system.currentTick-request.created<=BAIZHAN.guardTicks)
   DamageIndicator.resolveAuthoritative(data.nonce,data.applied,data.feedback);
  else DamageIndicator.cancelAuthoritative(data.nonce);
  // SAPI has already applied accepted damage in its synchronous validation
  // callback. NEVER damage, reflect, slow or wear equipment again from this ACK.
  if(data.applied!==true){this.guardHint(state);return;}
  if(system.currentTick-request.created<=BAIZHAN.guardTicks&&this.same(state)&&
   !!state.mount===shot.mounted&&!!state.player.isSneaking===shot.mounted)
   BaizhanImpactFeedback.show({applied:true,nonce:data.nonce,shooterId:state.player.id,dimension:state.player.dimension,shot,created:request.created});
  if(system.currentTick-request.created>BAIZHAN.guardTicks||!this.same(state)||!eligible(state.player,target)||
   context(target)!==request.targetContext||!!state.mount!==shot.mounted||!!state.player.isSneaking!==shot.mounted)return;
  // Every subsequent burn pulse is a new authoritative hit request. Starting
  // this timer is harmless if the target has since entered a protected region.
  if(shot.kind==='direct'&&shot.round==='fire')this.startBurn(state,target,shot.mounted);
 }
 static startBurn(state,target,mounted) {
  if(!eligible(state.player,target)||target.isInWater||target.getEffect?.('fire_resistance'))return;
  const key=JSON.stringify([state.player.id,target.id]);
  const prior=this.burns.get(key);
  if(prior&&prior.state===state){prior.expires=system.currentTick+BAIZHAN.burnTicks;return;}
  if(this.burns.size>=64)return;
  this.burns.set(key,{state,target,mounted,targetContext:context(target),expires:system.currentTick+BAIZHAN.burnTicks,next:system.currentTick+BAIZHAN.burnInterval});
 }
 static tick() {
  for(const [id,state]of this.players)if(!this.same(state))this.clear(id);
  for(const [nonce,request]of this.pending)if(system.currentTick-request.created>BAIZHAN.guardTicks){this.pending.delete(nonce);this.guardHint(request.state);}
  for(const [key,burn]of this.burns) {
   const {state,target}=burn;
   if(!this.same(state)||!eligible(state.player,target)||context(target)!==burn.targetContext||target.isInWater||target.getEffect?.('fire_resistance')||
    !!state.mount!==burn.mounted||system.currentTick>burn.expires){this.burns.delete(key);continue;}
   if(system.currentTick<burn.next)continue;
   burn.next=system.currentTick+BAIZHAN.burnInterval;
   this.requestHit(state,target,{kind:'burn',round:'fire',origin:state.player.getHeadLocation(),impact:body(target),mounted:burn.mounted,damage:BAIZHAN.burnDamage});
  }
  // Also cleans persistent displays loaded after a server restart. Only known
  // dimensions are queried; an unavailable dimension is never force-loaded.
  if(system.currentTick%40===0)for(const id of ['overworld','nether','the_end']) {
   try { for(const entity of world.getDimension(id).getEntities({type:BAIZHAN.mountId})) {
    if(![...this.players.values()].some(state=>state.mount?.entity.id===entity.id))entity.remove();
   } } catch {}
  }
 }
}
