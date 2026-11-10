// Run: node tests/pvp_gun_registry.mjs /path/to/test_guns_bp
// Exercises production modules with in-memory Minecraft API doubles, not a live server.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const gunsRoot=process.argv[2];
assert.ok(gunsRoot,'Pass the final integrated test_guns_bp root to validate Guns/SAPI parity');
function load(file,names,globals={}) {
 const source=fs.readFileSync(file,'utf8').replace(/^import .*;\s*$/gm,'').replace(/export (?=(?:const|function|class)\b)/g,'');
 return vm.runInNewContext(source+`\n({${names.join(',')}})`,{...globals,console});
}
const {PVP_GUN_IDS}=load(root+'/scripts/modules/pvp/guns.generated.js',['PVP_GUN_IDS']);
const data=load(path.resolve(gunsRoot,'scripts/data/guns.js'),['GUNS','getGunById'],{FireMode:{AUTO:'auto',SEMI:'semi',BURST:'burst'}});
assert.deepEqual([...PVP_GUN_IDS].sort(),Array.from(data.GUNS,x=>x.id).sort(), 'PvP registry must match final Guns IDs (no melee/equipment added)');
const expected=[['flamethrower','special','test_gun:high_pressure_fuel',60],['liegui','energy','test_gun:ammo_battery',4],['baizhan','lmg','test_gun:ammo_belt_100',100],['scarh_stripper','rifle','test_gun:ammo_rifle',20],['mp5k_relay','smg','test_gun:ammo_45acp',30],['python_finale','pistol','test_gun:ammo_45acp',6]];
class ItemStack {
 constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;this.lore=[];this.metadata={name:'original',durability:7};}
 clone(){const copy=new ItemStack(this.typeId,this.amount);copy.lore=[...this.lore];copy.metadata={...this.metadata};return copy;}
 getLore(){return [...this.lore]} setLore(value){this.lore=[...value]}
}
const container=size=>({size,items:[],getItem(i){return this.items[i]?.clone()},setItem(i,item){this.items[i]=item?.clone()}});
const EquipmentSlot={Head:'Head',Chest:'Chest',Legs:'Legs',Feet:'Feet',Offhand:'Offhand'};
const worldProps=new Map();let boxes;
const world={getDynamicProperty:k=>worldProps.get(k),setDynamicProperty:(k,v)=>worldProps.set(k,v),getDimension:()=>({getBlock:({x})=>({typeId:'minecraft:chest',getComponent:()=>({container:boxes[x===0?0:1]})})})};
const vault=load(root+'/scripts/modules/pvp/vault.js',['reserveVault','storeOriginals','issueMatchEquipment','restoreOriginals','releaseVault','writeTransaction'],{world,EquipmentSlot,ItemStack,PVP_GUN_IDS,PVP_CONFIG:{vault:{x:0,y:0,z:0,slots:1},dimension:'minecraft:overworld'},marker:id=>'match:'+id});
const utils=path.resolve(gunsRoot,'scripts/feature/utils');
const rules=load(utils+'/pvpRules.js',['ammoKey','isPvpParticipant','isPvpDowned','hasTag','pvpMatch','PVP_BACKUP_KEY','PVP_AMMO_PREFIX']);
const ammo=load(utils+'/gunUtils.js',['getGunDynamicKey','getCurrentAmmo','setCurrentAmmo'],{...rules,getGunById:data.getGunById,getHeldItem:()=>undefined});
const transactions=load(utils+'/pvpAmmoTransaction.js',['preparePvpAmmo','finishPvpAmmo'],rules);
let count=0;
for(const [name,type,ammoTypeId,maxAmmo] of expected) for(const offhand of [false,true]) {
 const id='test_gun:'+name,gun=data.getGunById(id);
 assert.ok(gun);assert.equal(gun.type,type);assert.equal(gun.ammoTypeId,ammoTypeId);assert.equal(gun.maxAmmo,maxAmmo);
 worldProps.clear();boxes=[container(27),container(27)];
 const inv=container(36),equipment=new Map(),props=new Map(),tags=new Set(['pvp:participant','pvp:match:test','pvp:guns_ready','pvp:active']);
 const eq={getEquipment:k=>equipment.get(k)?.clone(),setEquipment:(k,v)=>{if(v)equipment.set(k,v.clone());else equipment.delete(k)}};
 const player={id:'player',selectedSlotIndex:6,getComponent:k=>k==='minecraft:inventory'?{container:inv}:eq,getDynamicProperty:k=>props.get(k),getDynamicPropertyIds:()=>[...props.keys()],setDynamicProperty:(k,v)=>v===undefined?props.delete(k):props.set(k,v),hasTag:t=>tags.has(t),getTags:()=>[...tags]};
 const original=new ItemStack(id);original.setLore(['original lore']);
 if(offhand)eq.setEquipment(EquipmentSlot.Offhand,original);else inv.setItem(6,original);
 inv.setItem(20,new ItemStack('minecraft:diamond',3));
 eq.setEquipment(EquipmentSlot.Chest,new ItemStack('minecraft:iron_chestplate'));
 const normalKey='tg_ammo_test_gun_'+name,matchKey='tg_pvp_ammo_test_gun_'+name;
 assert.equal(ammo.getGunDynamicKey(id),normalKey);
 props.set(normalKey,2);
 transactions.preparePvpAmmo(player,'test');
 const tx={slot:vault.reserveVault(player),phase:'PREPARING',matchId:'test',selectedSlot:6};
 vault.storeOriginals(player,tx);vault.issueMatchEquipment(player,tx);
 assert.equal(tx.fallbackGunIssued,false);
 const slot=offhand?0:6,copy=inv.getItem(slot);
 assert.equal(copy.typeId,id);assert.deepEqual(copy.getLore(),['original lore','match:test']);assert.deepEqual(copy.metadata,original.metadata);
 assert.equal(inv.getItem(20),undefined);assert.equal(eq.getEquipment(EquipmentSlot.Offhand),undefined);
 // Exercise actual generic ammo accessors, verifying the separate numeric key.
 ammo.getCurrentAmmo(player,gun);ammo.setCurrentAmmo(player,gun,maxAmmo);
 assert.equal(ammo.setCurrentAmmo(player,gun,ammo.getCurrentAmmo(player,gun)-1),maxAmmo-1);
 assert.equal(props.get(matchKey),maxAmmo-1);assert.equal(typeof props.get(matchKey),'number');assert.equal(props.get(normalKey),2);
 inv.setItem(slot);assert.equal(vault.issueMatchEquipment(player,tx),false);assert.equal(inv.getItem(slot),undefined,'Repeated admission must not refill a dropped gun');
 // Restore the retained originals and ammo, including repeat recovery.
 transactions.finishPvpAmmo(player,'test');transactions.finishPvpAmmo(player,'test');
 vault.restoreOriginals(player,tx);vault.restoreOriginals(player,tx);
 const restored=offhand?eq.getEquipment(EquipmentSlot.Offhand):inv.getItem(6);
 assert.equal(restored.typeId,id);assert.deepEqual(restored.getLore(),['original lore']);assert.deepEqual(restored.metadata,original.metadata);
 assert.equal(inv.getItem(20).amount,3);assert.equal(player.selectedSlotIndex,6);assert.equal(props.get(normalKey),2);assert.equal(props.has(matchKey),false);
 tx.phase='RESTORED';vault.writeTransaction(player,tx);vault.releaseVault(player,tx);
 assert.ok(boxes.every(c=>c.items.every(x=>!x)));
 console.log('PASS',name,offhand?'offhand':'inventory','admission, duplicate guard, ammo isolation, recovery');count++;
}
console.log(`PASS registry parity (${PVP_GUN_IDS.size} guns), types/ammo IDs, ${count} lifecycle cases`);
