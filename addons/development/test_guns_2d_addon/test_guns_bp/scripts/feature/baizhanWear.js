import { combatAuthority } from './utils/combatAuthority.js';
import { world, EquipmentSlot } from '@minecraft/server';
import { isPvpParticipant, pvpMatch, pvpWeaponAllowed } from './utils/pvpRules.js';

const ITEM_KEY='tg_baizhan_identity';
const RECEIPT_KEY='tg_baizhan_wear_receipt';
let settlementSerial=0;
const scopeOf=player=>isPvpParticipant(player)?`match:${pvpMatch(player)}`:'survival';
const keyOf=token=>`tg_baizhan_wear_${token}`;
const MAX_SCOPES=2,MAX_RECORD_BYTES=4096;
function prune(record,scope){
 // Match copies are disposable and cannot settle another match's debt.
 // Always preserve the survival original; retain only this validated context.
 const keep=scope?.startsWith('match:')?scope:null;
 for(const scope of Object.keys(record.debts))if(scope.startsWith('match:')&&scope!==keep)delete record.debts[scope];
 if(record.settlement?.scope?.startsWith('match:')&&record.settlement.scope!==keep)delete record.settlement;
 return record;
}
function read(token,scope) {
 const raw=world.getDynamicProperty(keyOf(token));
 if(raw===undefined)return {version:1,debts:{}};
 const record=JSON.parse(raw);
 if(record?.version!==1||!record.debts||typeof record.debts!=='object'||Array.isArray(record.debts)||
  Object.values(record.debts).some(n=>!Number.isSafeInteger(n)||n<0)||Object.keys(record.debts).some(scope=>scope!=='survival'&&!/^match:.{1,128}$/.test(scope)))throw Error('Invalid Baizhan wear record');
 return prune(record,scope);
}
function write(token,record,scope) {
 for(const [scope,count]of Object.entries(record.debts))if(count===0)delete record.debts[scope];
 prune(record,scope);
 const encoded=JSON.stringify(record);
 if(Object.keys(record.debts).length>MAX_SCOPES||encoded.length>MAX_RECORD_BYTES)throw Error('Baizhan wear record exceeds bounded context limits');
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
 static initialized=false;static stateRequest=null;
 static initialize(){this.initialized=true;}
 // Legacy callers keep their API, but no service or global match lookup is needed.
 static requestState(){this.stateRequest=null;}
 static receiveState(){}
 static canUse(player,item){return combatAuthority()==='local'&&pvpWeaponAllowed(player,item);}

 static scope(player){return scopeOf(player);}
 static pending(player,token) { try{return read(token,scopeOf(player)).debts[scopeOf(player)]||0;}catch{return Infinity;} }
 static reserve(player,token) {
  try {
   const slot=locate(player,token),dur=slot?.item.getComponent('minecraft:durability');
   if(!slot||!dur||!this.canUse(player,slot.item))return false;
   const scope=scopeOf(player),record=read(token,scope),debt=record.debts[scope]||0;
   if(record.settlement||dur.damage+debt>=dur.maxDurability)return false;
   record.debts[scope]=debt+1;
   write(token,record,scope); // If persistence fails, do not emit a shot.
   return true;
  }catch{return false;}
 }
 static cancelReservation(player,token) {
  try{const scope=scopeOf(player),record=read(token,scope);if(record.settlement)return;
   record.debts[scope]=Math.max(0,(record.debts[scope]||0)-1);write(token,record,scope);
  }catch{ /* Retain a conservative debt rather than fabricate a refund. */ }
 }
 static isBroken(player,token) {
  try{const slot=locate(player,token),dur=slot?.item.getComponent('minecraft:durability');
   return !dur||dur.damage+(read(token,scopeOf(player)).debts[scopeOf(player)]||0)>=dur.maxDurability;
  }catch{return true;}
 }
 static settle(player,token,expectedScope=scopeOf(player)) {
  try {
   // On entry/exit the inventory may already be an escrow copy. Never settle
   // the old context's debt against that replacement.
   if(scopeOf(player)!==expectedScope)return false;
   const slot=locate(player,token);if(!slot||!this.canUse(player,slot.item))return false;
   const dur=slot.item.getComponent('minecraft:durability');if(!dur)return false;
   const scope=expectedScope,record=read(token,scope);
   if(record.settlement) {
    const tx=record.settlement;
    if(tx.scope!==scope)return false;
    if(!Number.isSafeInteger(tx.amount)||!Number.isSafeInteger(tx.before)||!Number.isSafeInteger(tx.after)||tx.before<0||tx.amount<1||tx.after!==tx.before+tx.amount||
     (tx.receipt!==undefined&&(typeof tx.receipt!=='string'||!tx.receipt.length||tx.receipt.length>200)))return false;
    // Item receipt and native damage were committed together. An anvil repair
    // after that commit must not make an uncertain ledger clear charge twice.
    if((tx.receipt&&slot.item.getDynamicProperty(RECEIPT_KEY)===tx.receipt)||(!tx.receipt&&dur.damage>=tx.after)) {
     record.debts[scope]=Math.max(0,(record.debts[scope]||0)-tx.amount);
     delete record.settlement;write(token,record,scope);
    } else if(dur.damage!==tx.before){
     if(!tx.receipt)return false; // Legacy ambiguous transaction: do not guess.
     tx.before=dur.damage;tx.after=dur.damage+tx.amount;write(token,record,scope);
    }
   }
   let tx=record.settlement;
   const debt=record.debts[scope]||0;
   if(!debt){write(token,record,scope);return true;}
   if(!tx) {
    tx={scope,amount:debt,before:dur.damage,after:dur.damage+debt,receipt:`${scope}:${Date.now()}:${++settlementSerial}`};
    record.settlement=tx;write(token,record,scope);
   }
   let result;
   if(tx.after>=dur.maxDurability)result=slot.set(undefined);
   else {dur.damage=tx.after;if(tx.receipt)slot.item.setDynamicProperty(RECEIPT_KEY,tx.receipt);result=slot.set(slot.item);}
   if(result===false)return false;
   const actual=slot.get();
   if(tx.after>=dur.maxDurability?actual!==undefined:(!matches(actual,token)||(actual.getComponent('minecraft:durability')?.damage??-1)<tx.after||
    (tx.receipt&&actual.getDynamicProperty(RECEIPT_KEY)!==tx.receipt)))return false;
   record.debts[scope]=Math.max(0,(record.debts[scope]||0)-tx.amount);
   delete record.settlement;write(token,record,scope);
   return true;
  }catch{return false;} // Retry only by reading the durable settlement first.
 }
}
