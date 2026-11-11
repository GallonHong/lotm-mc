import { combatAuthority } from './utils/combatAuthority.js';
import { LocalMeleeTechniques } from './localMeleeTechniques.js';
import { system, ScriptEventSource } from '@minecraft/server';
// Choose authority before sending; never retry a server hit locally.
export class LegacyMeleeBridge {
 static serial=0;
 static hit(player,target,kind){
  try{
   const authority=combatAuthority();if(authority==='blocked')return false;
   const item=player.getComponent('minecraft:equippable')?.getEquipment('Mainhand');
   if(!item||!target?.isValid())return false;
   const packet={nonce:`legacy_${system.currentTick}_${++this.serial}`,issuedTick:system.currentTick,
    shooterId:player.id,targetId:target.id,typeId:item.typeId,selectedSlot:player.selectedSlotIndex,
    sourceContext:JSON.stringify([player.dimension.id,player.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||t.startsWith('apoc')).sort()]),
    lore:item.getLore(),kind,dimension:player.dimension.id};
   if(authority==='local'){LocalMeleeTechniques.registerEvents();LocalMeleeTechniques.handleLegacy({id:'tg:legacy_melee',packet});return true;}
   player.dimension.runCommand('scriptevent tg:legacy_melee '+JSON.stringify(packet));return true;
  }catch{return false;}
 }
}
