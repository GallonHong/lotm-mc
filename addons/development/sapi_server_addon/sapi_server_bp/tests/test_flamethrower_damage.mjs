import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'../scripts/vendor/baizhan_damage');
let callbacks=0,subscriptions=0,hits=[];
const system={currentTick:10,run:()=>callbacks++,runInterval:()=>{throw Error('unexpected initialization')},afterEvents:{scriptEventReceive:{subscribe(){subscriptions++}}}};
const eqSlots={Head:'Head',Chest:'Chest',Legs:'Legs',Feet:'Feet',Mainhand:'Mainhand',Offhand:'Offhand'};
const exports={world:{},system,EquipmentSlot:eqSlots,EntityDamageCause:{override:'override',thorns:'thorns'},ScriptEventSource:{Server:'Server'},MolangVariableMap:class{setFloat(){}setVector3(){}}};
const context=vm.createContext({console,Math:Object.assign(Object.create(Math),{random:()=>0.99}),Map,Set,Date});
const server=new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v)},{context});
const cache=new Map();
function get(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
const mod=get(root+'/feature/damageHandler.js');
await mod.link((specifier,ref)=>specifier==='@minecraft/server'?server:get(path.resolve(path.dirname(ref.identifier),specifier)));
await mod.evaluate();
assert.equal(subscriptions,0);assert.equal(callbacks,0);
const {DamageHandler}=mod.namespace;
const dim={spawnParticle(){},playSound(){}};
function entity(id,x){const equipment=new Map();return{id,typeId:'minecraft:player',location:{x,y:0,z:0},dimension:dim,isSneaking:false,equipment,isValid:()=>true,getTags:()=>[],hasTag:()=>false,getGameMode:()=> 'survival',getViewDirection:()=>({x:-1,y:0,z:0}),getComponent(type){if(type==='minecraft:equippable')return{getEquipment:s=>equipment.get(s),setEquipment:(s,item)=>equipment.set(s,item)};if(type==='minecraft:health')return{currentValue:100,effectiveMax:100}},applyDamage(amount,options){hits.push({id,amount,options});return true},applyKnockback(){},clearVelocity(){},onScreenDisplay:{setActionBar(){}}};}
const shooter=entity('s',0),target=entity('t',3);
const cfg=fs.readFileSync(path.resolve(root,'../../data/flamethrowerRules.js'),'utf8');
const flame=vm.runInNewContext(cfg.replace(/export (?=(?:const|function) )/g,'')+'\n({FLAMETHROWER_GUN})').FLAMETHROWER_GUN;
const pkm=cache.get(root+'/feature/pkmBurn.js').namespace.PkmBurn;
const beforePkm=pkm.active.size;
for(const damage of [4,1]) {
 const gun={...flame,stats:{...flame.stats,damage}};
 assert.equal(DamageHandler.handleHit(null,shooter,target,gun,{x:3,y:1,z:0}),true);
 assert.equal(hits.at(-1).amount,damage);
 assert.equal(hits.at(-1).options.damagingEntity,shooter);
 assert.equal(hits.at(-1).options.cause,'override');
 assert.equal(pkm.active.size,beforePkm);
}
target.equipment.set('Chest',{typeId:'minecraft:diamond_chestplate',getComponent:()=>undefined});
assert.equal(DamageHandler.handleHit(null,shooter,target,flame,{x:3,y:1,z:0}),true);
assert.equal(hits.at(-1).amount,DamageHandler.calculateArmorReduction(4,8,.15,.45));
assert.equal(pkm.active.size,beforePkm);
const before=hits.length;target.applyDamage=()=>false;
assert.equal(DamageHandler.handleHit(null,shooter,target,flame,{x:3,y:1,z:0}),false);
assert.equal(hits.length,before);
assert.equal(subscriptions,0);
console.log('PASS real damage closure: direct4 / burn1, 15% armor, attributed override, no PKM stacks, no rejected-hit fallback');
