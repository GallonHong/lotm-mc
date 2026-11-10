import { system } from '@minecraft/server';
// Fail closed if SAPI is absent. No speculative health writes or local retry.
export class LegacyMeleeBridge {
 static serial=0;
 static hit(player,target,kind){
  try{
   const item=player.getComponent('minecraft:equippable')?.getEquipment('Mainhand');
   if(!item||!target?.isValid())return false;
   const packet={nonce:`legacy_${system.currentTick}_${++this.serial}`,issuedTick:system.currentTick,
    shooterId:player.id,targetId:target.id,typeId:item.typeId,selectedSlot:player.selectedSlotIndex,
    sourceContext:JSON.stringify([player.dimension.id,player.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||t.startsWith('apoc')).sort()]),
    lore:item.getLore(),kind,dimension:player.dimension.id};
   player.dimension.runCommand('scriptevent tg:legacy_melee '+JSON.stringify(packet));return true;
  }catch{return false;}
 }
}
