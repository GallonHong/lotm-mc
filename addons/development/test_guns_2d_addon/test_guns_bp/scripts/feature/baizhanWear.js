import { combatAuthority } from './utils/combatAuthority.js';
import { world, system, ScriptEventSource, EquipmentSlot } from '@minecraft/server';
import { isPvpParticipant, pvpMatch } from './utils/pvpRules.js';

const ITEM_KEY='tg_baizhan_identity';
const RECEIPT_KEY='tg_baizhan_wear_receipt';
let settlementSerial=0;
const scopeOf=player=>isPvpParticipant(player)?`match:${pvpMatch(player)}`:'survival';
const keyOf=token=>`tg_baizhan_wear_${token}`;
const MAX_SCOPES=2,MAX_RECORD_BYTES=4096;
let verifiedMatchKnown=false,verifiedMatchId=null;
function prune(record){
 if(!verifiedMatchKnown)return record;
 const keep=verifiedMatchId===null?null:`match:${verifiedMatchId}`;
 for(const scope of Object.keys(record.debts))if(scope.startsWith('match:')&&scope!==keep)delete record.debts[scope];
 if(record.settlement?.scope?.startsWith('match:')&&record.settlement.scope!==keep)delete record.settlement;
 return record;
}
function read(token) {
 const raw=world.getDynamicProperty(keyOf(token));
 if(raw===undefined)return {version:1,debts:{}};
 const record=JSON.parse(raw);
 if(record?.version!==1||!record.debts||typeof record.debts!=='object'||Array.isArray(record.debts)||
  Object.values(record.debts).some(n=>!Number.isSafeInteger(n)||n<0)||Object.keys(record.debts).some(scope=>scope!=='survival'&&!/^match:.{1,128}$/.test(scope)))throw Error('Invalid Baizhan wear record');
 return prune(record);
}
function write(token,record) {
 for(const [scope,count]of Object.entries(record.debts))if(count===0)delete record.debts[scope];
 prune(record);
 const encoded=JSON.stringify(record);
 if(Object.keys(record.debts).length>MAX_SCOPES||encoded.length>MAX_RECORD_BYTES)throw Error('Baizhan wear record needs authoritative match cleanup');
 world.setDynamicProperty(keyOf(token),Object.keys(record.debts).length||record.settlement?encoded:undefined);
}
function matches(item,token) { try{return item?.typeId==='test_gun:baizhan'&&item.getDynamicProperty(ITEM_KEY)===token;}catch{return false;} }
function locate(player,token) {
 const equipment=player.getComponent('minecraft:equippable');
 const held=equipment?.getEquipment(EquipmentSlot.Mainhand);
 if(matches(held,token))return {item:held,get:()=>equipment.getEquipment(EquipmentSlot.Mainhand),set:value=>equipment.setEquipment(EquipmentSlot.Mainhand,value)};
 const container=player.getComponent('minecraft:inventory')?.container;
 for(let slot=0;slot<(container?.size||0);slot++) {
  const item=container.getItem(slot);
  if(matches(item,token))return {item,get:()=>container.getItem(slot),set:value=>container.setItem(slot,value)};
 }
 return null;
}
/** Durable, item-identity keyed wear, without equipment writes during a burst.
 * Lost/dropped items retain debt for their next holder. Match copies cannot pay
 * or erase the survival original's debt. A write-ahead settlement prevents an
 * uncertain ledger-clear from applying the same wear again. */
export class BaizhanWear {
 static initialized=false;static stateRequest=null;static serial=0;static lastRequest=-100;static lastDesiredMatch=undefined;
 static initialize(){
  if(this.initialized)return;this.initialized=true;
  system.afterEvents?.scriptEventReceive?.subscribe(event=>this.receiveState(event));
 }
 static requestState(player){
  if(combatAuthority()!=='server'){this.stateRequest=null;return;}
  if(verifiedMatchKnown&&(!isPvpParticipant(player)||verifiedMatchId===pvpMatch(player)))return;
  if(this.stateRequest&&system.currentTick-this.stateRequest.issuedTick<=12)return;
  const desired=isPvpParticipant(player)?pvpMatch(player):null;
  if(system.currentTick-this.lastRequest<20&&this.lastDesiredMatch===desired)return;
  this.lastRequest=system.currentTick;this.lastDesiredMatch=desired;
  const nonce=`bz_wear_${system.currentTick}_${++this.serial}`;
  this.stateRequest={nonce,issuedTick:system.currentTick};
  try{player.dimension.runCommand(`scriptevent tg:baizhan_wear_state ${JSON.stringify(this.stateRequest)}`);}catch{this.stateRequest=null;}
 }
 static receiveState(event){
  if(combatAuthority()!=='server')return;
  if(event.id!=='tg:baizhan_wear_state_result'||event.sourceType!==ScriptEventSource.Server||event.sourceEntity||event.sourceBlock||!this.stateRequest)return;
  let data;try{data=JSON.parse(event.message);}catch{return;}
  if(data?.nonce!==this.stateRequest.nonce||system.currentTick-this.stateRequest.issuedTick>12||
   !Number.isInteger(data.checkedTick)||data.checkedTick<this.stateRequest.issuedTick||data.checkedTick>system.currentTick||
   !(data.activeMatchId===null||(typeof data.activeMatchId==='string'&&data.activeMatchId.length>0&&data.activeMatchId.length<=128)))return;
  verifiedMatchKnown=true;verifiedMatchId=data.activeMatchId;this.stateRequest=null;
 }
 static canUse(player,item){
  try{
   const authority=combatAuthority();
   if(authority==='blocked')return false;
   const markers=(item?.getLore?.()||[]).filter(line=>line.startsWith('PVP_MATCH:'));
   // A leftover PvP copy cannot authorize itself in a standalone world.
   if(authority==='local')return !isPvpParticipant(player)&&markers.length===0;
   if(isPvpParticipant(player))return verifiedMatchKnown&&verifiedMatchId===pvpMatch(player)&&markers.length===1&&markers[0]===`PVP_MATCH:${verifiedMatchId}`;
   return markers.length===0;
  }catch{return false;}
 }

 static scope(player){return scopeOf(player);}
 static pending(player,token) { try{return read(token).debts[scopeOf(player)]||0;}catch{return Infinity;} }
 static reserve(player,token) {
  try {
   const slot=locate(player,token),dur=slot?.item.getComponent('minecraft:durability');
   if(!slot||!dur||!this.canUse(player,slot.item))return false;
   const record=read(token),scope=scopeOf(player),debt=record.debts[scope]||0;
   if(record.settlement||dur.damage+debt>=dur.maxDurability)return false;
   record.debts[scope]=debt+1;
   write(token,record); // If persistence fails, do not emit a shot.
   return true;
  }catch{return false;}
 }
 static cancelReservation(player,token) {
  try{const record=read(token),scope=scopeOf(player);if(record.settlement)return;
   record.debts[scope]=Math.max(0,(record.debts[scope]||0)-1);write(token,record);
  }catch{ /* Retain a conservative debt rather than fabricate a refund. */ }
 }
 static isBroken(player,token) {
  try{const slot=locate(player,token),dur=slot?.item.getComponent('minecraft:durability');
   return !dur||dur.damage+(read(token).debts[scopeOf(player)]||0)>=dur.maxDurability;
  }catch{return true;}
 }
 static settle(player,token,expectedScope=scopeOf(player)) {
  try {
   // On entry/exit the inventory may already be an escrow copy. Never settle
   // the old context's debt against that replacement.
   if(scopeOf(player)!==expectedScope)return false;
   const slot=locate(player,token);if(!slot||!this.canUse(player,slot.item))return false;
   const dur=slot.item.getComponent('minecraft:durability');if(!dur)return false;
   const record=read(token),scope=expectedScope;
   if(record.settlement) {
    const tx=record.settlement;
    if(tx.scope!==scope)return false;
    if(!Number.isSafeInteger(tx.amount)||!Number.isSafeInteger(tx.before)||!Number.isSafeInteger(tx.after)||tx.before<0||tx.amount<1||tx.after!==tx.before+tx.amount||
     (tx.receipt!==undefined&&(typeof tx.receipt!=='string'||!tx.receipt.length||tx.receipt.length>200)))return false;
    // Item receipt and native damage were committed together. An anvil repair
    // after that commit must not make an uncertain ledger clear charge twice.
    if((tx.receipt&&slot.item.getDynamicProperty(RECEIPT_KEY)===tx.receipt)||(!tx.receipt&&dur.damage>=tx.after)) {
     record.debts[scope]=Math.max(0,(record.debts[scope]||0)-tx.amount);
     delete record.settlement;write(token,record);
    } else if(dur.damage!==tx.before){
     if(!tx.receipt)return false; // Legacy ambiguous transaction: do not guess.
     tx.before=dur.damage;tx.after=dur.damage+tx.amount;write(token,record);
    }
   }
   let tx=record.settlement;
   const debt=record.debts[scope]||0;
   if(!debt){write(token,record);return true;}
   if(!tx) {
    tx={scope,amount:debt,before:dur.damage,after:dur.damage+debt,receipt:`${scope}:${Date.now()}:${++settlementSerial}`};
    record.settlement=tx;write(token,record);
   }
   let result;
   if(tx.after>=dur.maxDurability)result=slot.set(undefined);
   else {dur.damage=tx.after;if(tx.receipt)slot.item.setDynamicProperty(RECEIPT_KEY,tx.receipt);result=slot.set(slot.item);}
   if(result===false)return false;
   const actual=slot.get();
   if(tx.after>=dur.maxDurability?actual!==undefined:(!matches(actual,token)||(actual.getComponent('minecraft:durability')?.damage??-1)<tx.after||
    (tx.receipt&&actual.getDynamicProperty(RECEIPT_KEY)!==tx.receipt)))return false;
   record.debts[scope]=Math.max(0,(record.debts[scope]||0)-tx.amount);
   delete record.settlement;write(token,record);
   return true;
  }catch{return false;} // Retry only by reading the durable settlement first.
 }
}
