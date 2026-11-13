// Explicit admission policy. Do not use namespace/prefix matching: blueprints,
// ingredients and unrelated addon items must remain in the canonical vault.
import { PVP_GUN_IDS } from './guns.generated.js';
export const PVP_BOW_IDS = new Set([
 'test_gun:hunter_compound_bow', 'test_gun:carbon_spider_bow'
]);
export const PVP_SHIELD_IDS = new Set([
 'minecraft:shield', 'test_gun:riot_shield', 'test_gun:flash_shield'
]);
export const isMatchWeapon = item => !!item && (PVP_GUN_IDS.has(item.typeId) || PVP_BOW_IDS.has(item.typeId));
export const isMatchShield = item => !!item && PVP_SHIELD_IDS.has(item.typeId);
export function planMatchEquipment(inventory, offhand, selectedSlot) {
 const items=[];
 for(let slot=0;slot<36;slot++) {
  const item=inventory[slot];
  if(isMatchWeapon(item)||isMatchShield(item))items.push({slot,item});
 }
 const needsFallback=!items.some(({item})=>isMatchWeapon(item))&&!isMatchWeapon(offhand);
 const occupied=new Set(items.map(({slot})=>slot));
 const preferred=Number.isInteger(selectedSlot)&&selectedSlot>=0&&selectedSlot<36?selectedSlot:0;
 const freeSlot=()=>!occupied.has(preferred)?preferred:Array.from({length:36},(_,i)=>i).find(i=>!occupied.has(i));
 let fallbackSlot;
 if(isMatchWeapon(offhand)||needsFallback) {
  const slot=freeSlot();
  if(slot===undefined)throw new Error('本局装备栏已满，无法安置副手武器或保底武器；原装备未清空。');
  if(needsFallback)fallbackSlot=slot;
  else items.push({slot,item:offhand});
 }
 const selected=needsFallback?fallbackSlot:(items.some(x=>x.slot===preferred&&isMatchWeapon(x.item))?preferred:items.find(x=>isMatchWeapon(x.item))?.slot??preferred);
 return {items,offhand:isMatchShield(offhand)?offhand:undefined,needsFallback,fallbackSlot,selectedSlot:selected};
}
