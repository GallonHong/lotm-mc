import { world, system, EquipmentSlot, ScriptEventSource } from '@minecraft/server';
import { FLAMETHROWER as F, flameContext, traceFlameCover } from '../data/flamethrower.js';
import { getHeldGun, getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { pvpCanAttack, hasInfinitePvpReserve, pvpWeaponAllowed } from './utils/pvpRules.js';
import { countAmmoInInventory, isCreativePlayer } from './utils/inventoryUtils.js';
import { GunVisuals } from './gunVisuals.js';
import { point, unit } from '../data/baizhan.js';

import { combatAuthority } from './utils/combatAuthority.js';
import { FlamethrowerLocal } from './flamethrowerLocal.js';
import { FlamethrowerWear } from './flamethrowerWear.js';
import { showAmmoHUD, showReloadingHUD } from './ui.js';

const KEY='tg_flamethrower_identity', ID='FT_ID:', SESSION='tg_flamethrower_session:';
function valid(e){try{return !!e?.isValid();}catch{return false;}}
function canOperate(p){try{return valid(p)&&p.getComponent('minecraft:health')?.currentValue>0&&pvpCanAttack(p)&&
 !['apoc:downed','apoc:downed_pending','apoc_downed','apoc:true_death'].some(t=>p.hasTag(t))&&String(p.getGameMode?.())!=='spectator';}catch{return false;}}
function message(p,text){try{const held=getHeldGun(p);if(held?.gun.isFlamethrower)showAmmoHUD(p,held.gun,getCurrentAmmo(p,held.gun),`§7${text}§r`);}catch{}}
function warning(p,text){const s=FlamethrowerEngine.players.get(p.id);if(s)s.noticeUntil=system.currentTick+60;message(p,text);}
function uniqueLore(item,token){try{const ids=(item.getLore()||[]).filter(x=>x.startsWith(ID));return ids.length===1&&ids[0]===ID+token;}catch{return false;}}
/** Guns owns every flame session, including worlds with SAPI installed.
 * A rejected damage call is never retried through another service. */
export class FlamethrowerEngine {
 static players=new Map(); static pending=new Map(); static serial=0; static initialized=false;
 static initialize(){
  if(this.initialized)return;this.initialized=true;
  system.afterEvents?.scriptEventReceive?.subscribe(e=>this.receive(e));
  world.afterEvents?.playerSpawn?.subscribe(({player})=>this.clear(player));
 }
 static removeSession(p){try{for(const t of p?.getTags?.()||[])if(t.startsWith(SESSION))p.removeTag(t);}catch{}}
 static clear(player){
  const id=typeof player==='string'?player:player.id,s=this.players.get(id);
  if(s?.mode!=='local')this.removeSession(s?.player||(typeof player==='object'?player:undefined));
  if(s)FlamethrowerWear.settle(s.player,s.token,s.wearScope);
  this.players.delete(id);FlamethrowerLocal.clear(id);
  for(const[n,r]of this.pending)if(r.state===s)this.pending.delete(n);
  if(s)GunVisuals.reset(s.player);
 }
 static same(s){
  try{const held=getHeldGun(s.player);
   if(s.mode==='local')return combatAuthority()==='local'&&this.players.get(s.player.id)===s&&canOperate(s.player)&&
    s.player.dimension.id===s.dimensionId&&s.player.selectedSlotIndex===s.slot&&held?.gun?.id===F.id&&
    held.item.getDynamicProperty(KEY)===s.token&&flameContext(s.player)===s.context&&pvpWeaponAllowed(s.player,held.item);
   const tags=s.player.getTags().filter(t=>t.startsWith(SESSION));
   return s.mode!=='blocked'&&combatAuthority()===s.mode&&this.players.get(s.player.id)===s&&canOperate(s.player)&&flameContext(s.player)===s.context&&
    s.player.selectedSlotIndex===s.slot&&held?.gun?.id===F.id&&held.item.getDynamicProperty(KEY)===s.token&&
    uniqueLore(held.item,s.token)&&tags.length===1&&tags[0]===s.sessionTag;
  }catch{return false;}
 }
 static ensure(player,gun){
  let s=this.players.get(player.id);if(s&&!this.same(s)){this.clear(player);s=null;}
  if(s)return s;const mode=combatAuthority();if(mode==='blocked')return null;if(!gun?.isFlamethrower||!canOperate(player))return null;
  try{
   const eq=player.getComponent('minecraft:equippable'),item=eq?.getEquipment(EquipmentSlot.Mainhand);
   if(item?.typeId!==F.id)return null;
   if(mode==='local'&&!pvpWeaponAllowed(player,item))return null;
   let token=item.getDynamicProperty(KEY),changed=false;
   if(typeof token!=='string'||!/^[A-Za-z0-9_:-]{1,128}$/.test(token)){
    token=`ft_${Date.now()}_${system.currentTick}_${++this.serial}`;item.setDynamicProperty(KEY,token);changed=true;
   }
   if(mode==='server'&&!uniqueLore(item,token)){
    const lore=(item.getLore()||[]).filter(l=>!l.startsWith(ID));
    // Never drop PvP copy markers while adding the cross-pack item identity.
    const markers=lore.filter(l=>l.startsWith('PVP_MATCH:')),display=lore.filter(l=>!l.startsWith('PVP_MATCH:'));
    item.setLore([...display.slice(0,Math.max(0,19-markers.length)),ID+token,...markers]);changed=true;
   }
   if(changed){if(eq.setEquipment(EquipmentSlot.Mainhand,item)===false)return null;
    const saved=eq.getEquipment(EquipmentSlot.Mainhand);if(saved?.getDynamicProperty(KEY)!==token||(mode==='server'&&!uniqueLore(saved,token)))return null;}
   if(!FlamethrowerWear.settle(player,token))return null;
   if(mode==='local'){
    if(!pvpWeaponAllowed(player,item))return null;
    s={player,gun,token,wearScope:FlamethrowerWear.scope(player),mode,slot:player.selectedSlotIndex,dimensionId:player.dimension.id,context:flameContext(player),trigger:false,
     ready:true,handshake:null,nextPulse:0,holdUntil:0,reloadUntil:0,lastHud:-100,lastSound:-100};
    this.players.set(player.id,s);return s;
   }
   this.removeSession(player);
   const sessionTag=`${SESSION}${Date.now()}_${system.currentTick}_${++this.serial}`;player.addTag(sessionTag);
   s={player,gun,token,wearScope:FlamethrowerWear.scope(player),sessionTag,mode,slot:player.selectedSlotIndex,context:flameContext(player),trigger:false,
    ready:mode==='local',handshake:null,nextPulse:0,holdUntil:0,reloadUntil:0,lastHud:-100,lastSound:-100};
   this.players.set(player.id,s);if(!this.same(s)){this.clear(player);return null;}return s;
  }catch{return null;}
 }
 static base(s){return{nonce:`ft_${system.currentTick}_${++this.serial}`,issuedTick:system.currentTick,
  shooterId:s.player.id,weaponToken:s.token,selectedSlot:s.slot,sourceContext:s.context,sessionTag:s.sessionTag};}
 static send(s,id,payload,kind){
  if(this.pending.size>=F.maxPending)return false;
  this.pending.set(payload.nonce,{state:s,issuedTick:payload.issuedTick,kind});
  try{s.player.dimension.runCommand(`scriptevent ${id} ${JSON.stringify(payload)}`);return true;}
  catch{this.pending.delete(payload.nonce);return false;}
 }
 static begin(player,gun){
  const s=this.ensure(player,gun);if(!s||s.reloadUntil)return false;
  // Start events can be duplicated by platform input. Do not extend an active
  // hold indefinitely or create multiple same-tick shots.
  if(!s.trigger){s.trigger=true;s.holdUntil=system.currentTick+F.maxHoldTicks;}
  if(s.mode==='server'&&!s.ready&&!s.handshake){const packet=this.base(s);s.handshake=packet.nonce;
   if(!this.send(s,'tg:flamethrower_state',packet,'state')){s.handshake=null;this.stop(player);warning(player,'安全服务请求发送失败，请检查脚本/命令权限');}}
  if(s.ready)this.fire(s);return true;
 }
 static settleWear(s){if([...this.pending.values()].some(r=>r.state===s&&r.kind==='pulse'))return;FlamethrowerWear.settle(s.player,s.token,s.wearScope);}
 static stop(player){const s=this.players.get(player.id);if(s){s.trigger=false;this.settleWear(s);GunVisuals.reset(player);}}
 static startReload(player,gun){
  const s=this.ensure(player,gun);if(!s||s.reloadUntil)return false;
  this.stop(player);
  if(getCurrentAmmo(player,gun)>=F.capacity)return false;
  if(countAmmoInInventory(player,F.ammoId)<=0){message(player,'背包没有高压燃料');return false;}
  s.reloadUntil=system.currentTick+F.reloadTicks;GunVisuals.reload(player,gun,F.reloadTicks);
  try{player.dimension.playSound('test_gun.flamethrower_reload',player.location,{volume:0.8});}catch{}
  return true;
 }
 static completeReload(s){
  if(!this.same(s))return;
  const p=s.player,old=getCurrentAmmo(p,s.gun),need=F.capacity-old;
  s.reloadUntil=0;
  if(need<=0){GunVisuals.reset(p);return;}
  if(isCreativePlayer(p)||hasInfinitePvpReserve(p)){setCurrentAmmo(p,s.gun,F.capacity);GunVisuals.reset(p);return;}
  // Plan all inventory writes, debit first, credit the persistent tank last.
  // A storage failure can never mint fuel; do not retry an uncertain write.
  let container,planned=[];
  try{
   container=p.getComponent('minecraft:inventory')?.container;if(!container)return;
   let remaining=need;
   for(let i=0;i<container.size&&remaining>0;i++){
    const item=container.getItem(i);if(item?.typeId!==F.ammoId)continue;
    const take=Math.min(item.amount,remaining);planned.push({i,item: item.clone?item.clone():item,old:item.amount,take});remaining-=take;
   }
   let consumed=0;
   for(const entry of planned){
    const current=container.getItem(entry.i);if(current?.typeId!==F.ammoId||current.amount!==entry.old)throw Error('fuel inventory changed');
    if(entry.old===entry.take)container.setItem(entry.i,undefined);
    else{current.amount=entry.old-entry.take;container.setItem(entry.i,current);}
    const check=container.getItem(entry.i);
    if((check?.typeId===F.ammoId?check.amount:0)!==entry.old-entry.take)throw Error('fuel debit unverified');
    consumed+=entry.take;
   }
   const result=setCurrentAmmo(p,s.gun,old+consumed);
   if(result!==old+consumed){message(p,'燃料存储失败，已安全停止；请备份后检查日志');return;}
   message(p,`装填完成 ${result}/${F.capacity}`);
  }catch{message(p,'燃料读写异常，已安全停止；不自动重试');}
  GunVisuals.reset(p);
 }
 static fire(s){
  const now=system.currentTick;if(!this.same(s)||!s.trigger||!s.ready||s.reloadUntil||now<s.nextPulse)return;
  if(now>=s.holdUntil){this.stop(s.player);return;}
  const ammo=getCurrentAmmo(s.player,s.gun);
  if(ammo<1){this.stop(s.player);this.startReload(s.player,s.gun);return;}
  if(s.mode==='server'&&this.pending.size>=F.maxPending){this.stop(s.player);message(s.player,'喷射请求繁忙，请松开后重试');return;}
  const direction=unit(s.player.getViewDirection());if(!direction)return;
  const origin=s.player.getHeadLocation(),packet=s.mode==='server'?{...this.base(s),origin,direction}:null;
  if(!FlamethrowerWear.reserve(s.player,s.token)){this.stop(s.player);return;}
  if(setCurrentAmmo(s.player,s.gun,ammo-1)!==ammo-1){FlamethrowerWear.cancelReservation(s.player,s.token);this.stop(s.player);return;}
  s.nextPulse=now+F.intervalTicks;
  if(s.mode==='local')FlamethrowerLocal.pulse(s,state=>this.same(state));
  else if(!this.send(s,'tg:flamethrower_pulse',packet,'pulse')){this.stop(s.player);s.ready=false;return;}
  this.visual(s,origin,direction);GunVisuals.fire(s.player,s.gun);
  if(FlamethrowerWear.isBroken(s.player,s.token))this.stop(s.player);
 }
 static visual(s,origin,forward){
  const dim=s.player.dimension,now=system.currentTick;
  // Five clipped rays: bounded cosmetics only, never selecting damage targets.
  let right=unit({x:forward.z,y:0,z:-forward.x})||{x:1,y:0,z:0};
  const up=unit({x:forward.y*right.z-forward.z*right.y,y:forward.z*right.x-forward.x*right.z,z:forward.x*right.y-forward.y*right.x});
  for(const [x,y]of [[0,0],[-0.30,0.12],[0.30,-0.12],[-0.15,-0.26],[0.15,0.26]]){
   const dir=unit({x:forward.x+right.x*x+up.x*y,y:forward.y+right.y*x+up.y*y,z:forward.z+right.z*x+up.z*y});
   const trace=traceFlameCover(dim,origin,dir,F.range);
   for(const d of [0.7,2.3,4.0,5.8,7.6,9.4])if(d<trace.distance)try{dim.spawnParticle('test_gun:flamethrower_flame',point(origin,dir,d));}catch{}
  }
  if(now-s.lastSound>=4){s.lastSound=now;try{dim.playSound('test_gun.flamethrower_spray',origin,{volume:0.45,pitch:0.96+(now%3)*0.025});}catch{}}
 }
 static receive(event){
  if(!['tg:flamethrower_state_result','tg:flamethrower_result'].includes(event.id)||event.sourceType!==ScriptEventSource.Server||event.sourceEntity||event.sourceBlock||typeof event.message!=='string'||event.message.length>1000)return;
  let data;try{data=JSON.parse(event.message);}catch{return;}
  const req=this.pending.get(data.nonce);if(!req||system.currentTick-req.issuedTick>F.guardTicks)return;
  const isState=event.id==='tg:flamethrower_state_result';if((req.kind==='state')!==isState)return;
  this.pending.delete(data.nonce);const s=req.state;if(s.mode!=='server'||!this.same(s))return;
  if(isState){s.handshake=null;s.ready=data.ready===true&&data.protocol===1&&Number.isInteger(data.checkedTick)&&data.checkedTick>=req.issuedTick&&data.checkedTick<=system.currentTick;
   if(s.ready){s.holdUntil=system.currentTick+F.maxHoldTicks;if(s.trigger)this.fire(s);}
   else{this.stop(s.player);
    const reasons={respawn_transition:'刚进入世界或重生，请松开后重新喷射',invalid_geometry:'坐标状态异常，已停止喷射',service_initializing:'安全服务正在初始化，请稍后重试',player_state:'当前状态禁止喷射（倒地、死亡、出生保护或眩晕）',state_changed:'持枪槽位或玩家状态已变化，请松开后重试',weapon_state:'武器身份已变化，请重新切换喷火器',match_state:'比赛装备或队伍状态未就绪',validation_error:'安全校验异常，请查看服务器日志',region_denied:'当前位置不允许喷射'};
    warning(s.player,data.protocol!==1?'安全服务版本不匹配，请同步更新 Guns 和 SAPI':reasons[data.reason]||'安全服务已响应，但本次状态校验未通过');}
}
  else if(data.accepted===false){s.ready=false;this.stop(s.player);warning(s.player,'喷射已停止：玩家状态、队伍或比赛保护不允许本次攻击');}
  if(!s.trigger)this.settleWear(s);
 }
 static tick(){
  FlamethrowerLocal.tick(s=>this.same(s));
  const present=new Set(world.getAllPlayers().map(p=>p.id));
  for(const[id,s]of this.players)if(!present.has(id)||!this.same(s))this.clear(s.player);
  for(const[n,req]of this.pending)if(system.currentTick-req.issuedTick>F.guardTicks){
   this.pending.delete(n);const s=req.state;if(!this.same(s))continue;s.ready=false;s.handshake=null;this.stop(s.player);warning(s.player,'安全服务未响应，请确认启用配套 SAPI 并查看脚本日志');}
 }
 static tickPlayer(player,gun){
  if(!gun?.isFlamethrower){if(this.players.has(player.id))this.clear(player);return;}
  const s=this.ensure(player,gun);if(!s)return;
  if(s.reloadUntil){if(system.currentTick>=s.reloadUntil)this.completeReload(s);
   else if(system.currentTick-s.lastHud>=4){s.lastHud=system.currentTick;showReloadingHUD(player,gun,1-(s.reloadUntil-system.currentTick)/F.reloadTicks);}return;}
  if(s.trigger){if(system.currentTick>=s.holdUntil)this.stop(player);else this.fire(s);}
  if(system.currentTick<(s.noticeUntil||0))return;
  if(system.currentTick-s.lastHud>=5){s.lastHud=system.currentTick;showAmmoHUD(player,gun,getCurrentAmmo(player,gun));}
 }
}
