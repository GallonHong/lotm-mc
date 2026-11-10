import { world, system, EquipmentSlot, ScriptEventSource } from '@minecraft/server';
import { FLAMETHROWER as F, flameContext } from '../data/flamethrower.js';
import { getHeldGun, getCurrentAmmo, setCurrentAmmo } from './utils/gunUtils.js';
import { pvpCanAttack, hasInfinitePvpReserve } from './utils/pvpRules.js';
import { countAmmoInInventory, isCreativePlayer } from './utils/inventoryUtils.js';
import { GunVisuals } from './gunVisuals.js';
import { traceCover, point, unit } from '../data/baizhan.js';

const KEY='tg_flamethrower_identity', ID='FT_ID:', SESSION='tg_flamethrower_session:';
function valid(e){try{return !!e?.isValid();}catch{return false;}}
function canOperate(p){try{return valid(p)&&p.getComponent('minecraft:health')?.currentValue>0&&pvpCanAttack(p)&&
 !['apoc:downed','apoc_downed','apoc:true_death'].some(t=>p.hasTag(t))&&String(p.getGameMode?.())!=='spectator';}catch{return false;}}
function message(p,text){try{p.onScreenDisplay.setActionBar(`§5[喷火器] §r${text}`);}catch{}}
function uniqueLore(item,token){try{const ids=(item.getLore()||[]).filter(x=>x.startsWith(ID));return ids.length===1&&ids[0]===ID+token;}catch{return false;}}
/** Fuel and input live in Guns. Damage/heat/burn live ONLY in the synchronous
 * SAPI authority. No result callback can apply damage locally. */
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
  this.removeSession(s?.player||(typeof player==='object'?player:undefined));
  this.players.delete(id);
  for(const[n,r]of this.pending)if(r.state===s)this.pending.delete(n);
  if(s)GunVisuals.reset(s.player);
 }
 static same(s){
  try{const held=getHeldGun(s.player),tags=s.player.getTags().filter(t=>t.startsWith(SESSION));
   return this.players.get(s.player.id)===s&&canOperate(s.player)&&flameContext(s.player)===s.context&&
    s.player.selectedSlotIndex===s.slot&&held?.gun?.id===F.id&&held.item.getDynamicProperty(KEY)===s.token&&
    uniqueLore(held.item,s.token)&&tags.length===1&&tags[0]===s.sessionTag;
  }catch{return false;}
 }
 static ensure(player,gun){
  let s=this.players.get(player.id);if(s&&!this.same(s)){this.clear(player);s=null;}
  if(s)return s;if(!gun?.isFlamethrower||!canOperate(player))return null;
  try{
   const eq=player.getComponent('minecraft:equippable'),item=eq?.getEquipment(EquipmentSlot.Mainhand);
   if(item?.typeId!==F.id)return null;
   let token=item.getDynamicProperty(KEY),changed=false;
   if(typeof token!=='string'||!/^[A-Za-z0-9_:-]{1,128}$/.test(token)){
    token=`ft_${Date.now()}_${system.currentTick}_${++this.serial}`;item.setDynamicProperty(KEY,token);changed=true;
   }
   if(!uniqueLore(item,token)){
    const lore=(item.getLore()||[]).filter(l=>!l.startsWith(ID));
    // Never drop PvP copy markers while adding the cross-pack item identity.
    const markers=lore.filter(l=>l.startsWith('PVP_MATCH:')),display=lore.filter(l=>!l.startsWith('PVP_MATCH:'));
    item.setLore([...display.slice(0,Math.max(0,19-markers.length)),ID+token,...markers]);changed=true;
   }
   if(changed){if(eq.setEquipment(EquipmentSlot.Mainhand,item)===false)return null;
    const saved=eq.getEquipment(EquipmentSlot.Mainhand);if(saved?.getDynamicProperty(KEY)!==token||!uniqueLore(saved,token))return null;}
   this.removeSession(player);
   const sessionTag=`${SESSION}${Date.now()}_${system.currentTick}_${++this.serial}`;player.addTag(sessionTag);
   s={player,gun,token,sessionTag,slot:player.selectedSlotIndex,context:flameContext(player),trigger:false,
    ready:false,handshake:null,nextPulse:0,holdUntil:0,reloadUntil:0,lastHud:-100,lastSound:-100};
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
  if(!s.ready&&!s.handshake){const packet=this.base(s);s.handshake=packet.nonce;
   if(!this.send(s,'tg:flamethrower_state',packet,'state')){s.handshake=null;this.stop(player);}}
  if(s.ready)this.fire(s);return true;
 }
 static stop(player){const s=this.players.get(player.id);if(s){s.trigger=false;GunVisuals.reset(player);}}
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
  if(this.pending.size>=F.maxPending){this.stop(s.player);message(s.player,'喷射请求繁忙，请松开后重试');return;}
  const direction=unit(s.player.getViewDirection());if(!direction)return;
  const origin=s.player.getHeadLocation(),packet={...this.base(s),origin,direction};
  if(setCurrentAmmo(s.player,s.gun,ammo-1)!==ammo-1){this.stop(s.player);return;}
  s.nextPulse=now+F.intervalTicks;
  if(!this.send(s,'tg:flamethrower_pulse',packet,'pulse')){this.stop(s.player);s.ready=false;return;}
  this.visual(s,origin,direction);GunVisuals.fire(s.player,s.gun);
 }
 static visual(s,origin,forward){
  const dim=s.player.dimension,now=system.currentTick;
  // Five clipped rays: bounded cosmetics only, never selecting damage targets.
  let right=unit({x:forward.z,y:0,z:-forward.x})||{x:1,y:0,z:0};
  const up=unit({x:forward.y*right.z-forward.z*right.y,y:forward.z*right.x-forward.x*right.z,z:forward.x*right.y-forward.y*right.x});
  for(const [x,y]of [[0,0],[-0.30,0.12],[0.30,-0.12],[-0.15,-0.26],[0.15,0.26]]){
   const dir=unit({x:forward.x+right.x*x+up.x*y,y:forward.y+right.y*x+up.y*y,z:forward.z+right.z*x+up.z*y});
   const trace=traceCover(dim,origin,dir,F.range,0);
   for(const d of [0.7,2.3,4.0,5.8])if(d<trace.distance)try{dim.spawnParticle('test_gun:flamethrower_flame',point(origin,dir,d));}catch{}
  }
  if(now-s.lastSound>=4){s.lastSound=now;try{dim.playSound('test_gun.flamethrower_spray',origin,{volume:0.45,pitch:0.96+(now%3)*0.025});}catch{}}
 }
 static receive(event){
  if(!['tg:flamethrower_state_result','tg:flamethrower_result'].includes(event.id)||event.sourceType!==ScriptEventSource.Server||event.sourceEntity||event.sourceBlock||typeof event.message!=='string'||event.message.length>1000)return;
  let data;try{data=JSON.parse(event.message);}catch{return;}
  const req=this.pending.get(data.nonce);if(!req||system.currentTick-req.issuedTick>F.guardTicks)return;
  const isState=event.id==='tg:flamethrower_state_result';if((req.kind==='state')!==isState)return;
  this.pending.delete(data.nonce);const s=req.state;if(!this.same(s))return;
  if(isState){s.handshake=null;s.ready=data.ready===true&&data.protocol===1&&Number.isInteger(data.checkedTick)&&data.checkedTick>=req.issuedTick&&data.checkedTick<=system.currentTick;
   if(s.ready){s.holdUntil=system.currentTick+F.maxHoldTicks;if(s.trigger)this.fire(s);}
   else{this.stop(s.player);message(s.player,'安全服务未就绪或当前位置不允许喷射');}}
  else if(data.accepted===false){s.ready=false;this.stop(s.player);message(s.player,'喷射被保护规则停止');}
 }
 static tick(){
  const present=new Set(world.getAllPlayers().map(p=>p.id));
  for(const[id,s]of this.players)if(!present.has(id)||!this.same(s))this.clear(s.player);
  for(const[n,req]of this.pending)if(system.currentTick-req.issuedTick>F.guardTicks){
   this.pending.delete(n);const s=req.state;if(!this.same(s))continue;s.ready=false;s.handshake=null;this.stop(s.player);message(s.player,'安全服务未响应，请确认配套SAPI版本');}
 }
 static tickPlayer(player,gun){
  if(!gun?.isFlamethrower){if(this.players.has(player.id))this.clear(player);return;}
  const s=this.ensure(player,gun);if(!s)return;
  if(s.reloadUntil){if(system.currentTick>=s.reloadUntil)this.completeReload(s);
   else if(system.currentTick-s.lastHud>=4){s.lastHud=system.currentTick;message(player,`装填高压燃料 ${((s.reloadUntil-system.currentTick)/20).toFixed(1)}秒`);}return;}
  if(s.trigger){if(system.currentTick>=s.holdUntil)this.stop(player);else this.fire(s);}
  if(system.currentTick-s.lastHud>=5){s.lastHud=system.currentTick;message(player,`燃料 ${getCurrentAmmo(player,gun)}/${F.capacity} · 长按使用喷射 · 攻击键换弹`);}
 }
}
