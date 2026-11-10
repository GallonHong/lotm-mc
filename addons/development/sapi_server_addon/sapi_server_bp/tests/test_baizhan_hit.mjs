import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.env.SAPI_SCRIPTS_ROOT || path.resolve(import.meta.dirname,'../scripts');
const rules=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(root+'/data/baizhanRules.js','utf8')).toString('base64'));
function load(file,name,globals){const source=fs.readFileSync(root+'/'+file,'utf8').replace(/^import .*;\s*$/gm,'').replace(/export class /g,'class ').replace(/export const /g,'const ').replace(/export function /g,'function ');const context=vm.createContext({...globals,console});return vm.runInContext(source+`\n${name}`,context);}
const itemProperties={guns:new Map([['tg_baizhan_identity','token1']]),sapi:new Map()};
let heldLore=['BAIZHAN_ID:token1'],activeMatchId=null,leaveHandler;
let properties={},blocks=new Map(),regions=[],messages=[],damages=[];
const BAIZHAN_GUN=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(root+'/data/baizhanGun.js','utf8')).toString('base64')).then(m=>m.BAIZHAN_GUN);
const dimension={id:'minecraft:overworld',getBlock(p){return blocks.get(`${p.x},${p.y},${p.z}`)||{typeId:'minecraft:air',isAir:true};},runCommand(s){messages.push(s);}};
function entity(id,x){return{id,typeId:id==='target'?'minecraft:zombie':'minecraft:player',location:{x,y:0,z:0},dimension,isSneaking:false,selectedSlotIndex:0,tags:new Set(id==='shooter'?['tg_baizhan_session:session1']:[]),isValid:()=>true,getHeadLocation(){return {...this.location,y:1.6}},hasTag(t){return this.tags.has(t)},getTags(){return [...this.tags]},getGameMode:()=> 'survival',getComponent(t){if(t==='minecraft:health')return{currentValue:20};if(t==='minecraft:equippable')return{getEquipment:()=>({typeId:'test_gun:baizhan',getDynamicProperty:key=>itemProperties.sapi.get(key),getLore:()=> heldLore})}}};}
const shooter=entity('shooter',0.5),target=entity('target',10.5);
const world={afterEvents:{playerLeave:{subscribe(fn){leaveHandler=fn}}},getAllPlayers:()=>[shooter,target],getEntity:id=>id===target.id?target:undefined,getDimension:()=>dimension,getDynamicProperty:k=>properties[k],getDefaultSpawnLocation:()=>({x:10000,z:10000})};
const system={currentTick:10,afterEvents:{scriptEventReceive:{subscribe(){}}}};
const PlotSafeZone=load('modules/plot_safe_zone.js','PlotSafeZone',{world,system});
const Integration=load('modules/integration.js','Integration',{world,system,PlotSafeZone,allowOrdinaryAction:()=>true});
const matchPolicy=load('modules/match_access.js','({isMatchLocked,matchDamageAllowed})',{});
const manager=load('modules/baizhan_permission.js','BaizhanPermissionManager',{DamageHandler:{handleHit(projectile,shooter,target,gun,impact){damages.push({shooter,target,gun,impact});return true}},BAIZHAN_GUN,world,system,ScriptEventSource:{Server:'Server',Entity:'Entity'},EquipmentSlot:{Mainhand:'Mainhand',Offhand:'Offhand'},RegionManager:{getRegions:()=>regions},CombatManager:{areTeammates:(a,b)=>a.tags.has('team')&&b.tags.has('team')},Integration,...matchPolicy,...rules});
manager.getActiveMatchId=()=>activeMatchId;
let count=0,serial=0;
const context=e=>JSON.stringify([e.dimension.id,e.getTags().filter(t=>t.startsWith('pvp:')||t.startsWith('sapi_team_')||['apoc:downed','apoc_downed','apoc:true_death'].includes(t)).sort()]);
const packet=()=>({nonce:'n'+(++serial),issuedTick:system.currentTick,shooterId:'shooter',targetId:'target',kind:'direct',round:'normal',mounted:false,weaponToken:'token1',sessionTag:'tg_baizhan_session:session1',selectedSlot:0,sourceContext:context(shooter),targetContext:context(target),origin:{x:0.5,y:1.6,z:0},impact:{x:10.5,y:1.6,z:0}});
function hit(p=packet(),event={}){const before=damages.length;manager.handleRequest({id:'tg:baizhan_hit',sourceType:'Server',message:JSON.stringify(p),...event});return damages.length-before;}
function test(name,fn){fn();count++;console.log('PASS',name);properties={};blocks.clear();regions=[];shooter.tags.clear();shooter.tags.add('tg_baizhan_session:session1');target.tags.clear();shooter.isSneaking=false;target.typeId='minecraft:zombie';heldLore=['BAIZHAN_ID:token1'];activeMatchId=null;manager.getActiveMatchId=()=>activeMatchId;manager.lastLeaveTick.clear();}
const solid=(x,id='minecraft:oak_planks')=>blocks.set(`${x},1,0`,{typeId:id,isSolid:true});
test('authoritative synchronous hit and attributed formula',()=>{assert.equal(hit(),1);assert.equal(damages.at(-1).shooter,shooter);assert.equal(damages.at(-1).gun.stats.damage,27);assert.equal(JSON.parse(messages.at(-1).split(' ').slice(2).join(' ')).applied,true)});
test('legacy guard disabled',()=>assert.equal(hit(packet(),{id:'tg:baizhan_guard'}),0));
test('server only; entity/block and unknown reject',()=>{for(const event of [{sourceType:'Entity'},{sourceEntity:shooter},{sourceBlock:{}},{sourceType:'Unknown'}])assert.equal(hit(packet(),event),0)});
test('same nonce applies once only',()=>{const p=packet();assert.equal(hit(p),1);assert.equal(hit(p),0)});
test('held token, slot, contexts and round validated',()=>{for(const delta of [{weaponToken:'other'},{selectedSlot:1},{sourceContext:'[]'},{targetContext:'[]'},{round:'fake'}])assert.equal(hit({...packet(),...delta}),0)});
test('crouch mode mismatch rejected in every kind',()=>{assert.equal(hit({...packet(),mounted:true}),0);shooter.isSneaking=true;assert.equal(hit(packet()),0);assert.equal(hit({...packet(),kind:'burn',round:'fire'}),0)});
test('one-two allowed mounted blocks; third rejects',()=>{solid(3);assert.equal(hit(),0);shooter.isSneaking=true;assert.equal(hit({...packet(),mounted:true}),1);solid(4);assert.equal(hit({...packet(),mounted:true}),1);solid(5);assert.equal(hit({...packet(),mounted:true}),0)});
test('hard blocks, liquids and unknown chunks rejected',()=>{shooter.isSneaking=true;for(const id of ['minecraft:stone','minecraft:water']){solid(3,id);assert.equal(hit({...packet(),mounted:true}),0)}blocks.clear();const get=dimension.getBlock;dimension.getBlock=()=>undefined;assert.equal(hit({...packet(),mounted:true}),0);dimension.getBlock=get});
test('admin region created after request before handling blocks actual damage',()=>{const p=packet();regions=[{dimension:dimension.id,min:{x:5.001,y:0,z:-1},max:{x:5.002,y:3,z:1},flags:{allowPvp:false}}];assert.equal(hit(p),0)});
test('apoc region created after request before handling blocks actual damage',()=>{const p=packet();properties['apoc:zones:v1']=JSON.stringify([{type:'safe',dimension:dimension.id,min:{x:5.001,y:0,z:-1},max:{x:5.002,y:3,z:1}}]);assert.equal(hit(p),0)});
test('plot created after request before handling blocks actual damage',()=>{const p=packet();properties['plt_overworld_0_0']=JSON.stringify({ownerId:'owner',chunkX:0,chunkZ:0,dimension:'overworld'});assert.equal(hit(p),0)});
test('spawn warp/defaultspawn changed before handling blocks actual damage',()=>{const p=packet();properties['sapi:server:warps:v1']=JSON.stringify([{id:'spawn',dimension:dimension.id,x:5,z:64}]);assert.equal(hit(p),0);properties={};const get=world.getDefaultSpawnLocation;world.getDefaultSpawnLocation=()=>({x:5,z:0});assert.equal(hit(packet()),0);world.getDefaultSpawnLocation=get});
test('higher-priority explicit admin allow preserved',()=>{const r={dimension:dimension.id,min:{x:5.001,y:-2,z:-1},max:{x:5.002,y:3,z:1},flags:{allowPvp:false}};regions=[r,{...r,priority:10,flags:{allowPvp:true}}];assert.equal(hit(),1)});
test('downed/protected attacker and teammate rejected',()=>{for(const tag of ['pvp:downed','pvp:protected','apoc:downed']){shooter.tags.add(tag);assert.equal(hit(),0);shooter.tags.clear();shooter.tags.add('tg_baizhan_session:session1')}shooter.tags.add('team');target.tags.add('team');assert.equal(hit(),0)});
test('context change after creation rejected',()=>{const p=packet();target.tags.add('pvp:downed');assert.equal(hit(p),0);assert.equal(hit(packet()),1)});
test('splash requires parent geometry with no secondary penetration',()=>{shooter.isSneaking=true;const p={...packet(),kind:'splash',round:'splash',mounted:true,shotOrigin:packet().origin,origin:{x:9,y:1.6,z:0}};solid(3);solid(4);assert.equal(hit(p),1);assert.equal(damages.at(-1).gun.stats.damage,4);solid(9);assert.equal(hit({...p,nonce:'new_splash'}),0);blocks.clear();assert.equal(hit({...p,nonce:'bad_splash',shotOrigin:undefined}),0)});
test('burn no penetration and static damage',()=>{assert.equal(hit({...packet(),kind:'burn',round:'fire'}),1);assert.equal(damages.at(-1).gun.stats.damage,3);solid(3);assert.equal(hit({...packet(),kind:'burn',round:'fire'}),0)});
test('vehicle multiplier exactly once, client damage ignored',()=>{target.typeId='ab_ve:helicopter';assert.equal(hit({...packet(),damage:9999}),1);assert.equal(damages.at(-1).gun.stats.damage,54)});
test('issuedTick rejects missing, future and expired replays',()=>{for(const issuedTick of [undefined,system.currentTick+1,system.currentTick-13])assert.equal(hit({...packet(),issuedTick}),0);const p=packet();assert.equal(hit(p),1);system.currentTick+=13;assert.equal(hit(p),0)});
test('wear-state server-only known singleton reply',()=>{let before=messages.length;manager.handleRequest({id:'tg:baizhan_wear_state',sourceType:'Entity',message:JSON.stringify({nonce:'w0',issuedTick:system.currentTick})});assert.equal(messages.length,before);manager.handleRequest({id:'tg:baizhan_wear_state',sourceType:'Server',message:JSON.stringify({nonce:'w1',issuedTick:system.currentTick})});assert.match(messages.at(-1),/"activeMatchId":null/);activeMatchId='m1';manager.handleRequest({id:'tg:baizhan_wear_state',sourceType:'Server',message:JSON.stringify({nonce:'w2',issuedTick:system.currentTick})});assert.match(messages.at(-1),/"activeMatchId":"m1"/)});
test('unknown match getter fails closed; expired copied items unusable',()=>{manager.getActiveMatchId=undefined;assert.equal(hit(),0);manager.getActiveMatchId=()=>activeMatchId;heldLore=['BAIZHAN_ID:token1','PVP_MATCH:old'];assert.equal(hit(),0);activeMatchId='old';assert.equal(hit(),0)});
test('PvP hit requires actual singleton match and marked copy',()=>{target.typeId='minecraft:player';shooter.tags=new Set(['tg_baizhan_session:session1','pvp:participant','pvp:active','pvp:guns_ready','pvp:match:m1','pvp:team:red']);target.tags=new Set(['pvp:participant','pvp:active','pvp:match:m1','pvp:team:blue']);activeMatchId='m1';assert.equal(hit(),0);heldLore=['BAIZHAN_ID:token1','PVP_MATCH:m1'];assert.equal(hit(),1);activeMatchId='m2';assert.equal(hit(),0);activeMatchId='m1';heldLore.push('PVP_MATCH:old');assert.equal(hit(),0)});
test('actual base match policy denies protected/same-team PvP, allows enemy downed target',()=>{target.typeId='minecraft:player';
 shooter.tags=new Set(['tg_baizhan_session:session1','pvp:participant','pvp:active','pvp:guns_ready','pvp:match:m1','pvp:team:red']);target.tags=new Set(['pvp:participant','pvp:active','pvp:match:m1','pvp:team:blue']);activeMatchId='m1';heldLore=['BAIZHAN_ID:token1','PVP_MATCH:m1'];
 target.tags.add('pvp:protected');assert.equal(hit(),0);target.tags.delete('pvp:protected');target.tags.add('pvp:downed');assert.equal(hit(),1);target.tags.delete('pvp:team:blue');target.tags.add('pvp:team:red');assert.equal(hit(),0);
});
test('realistic tagged context packet fits bounded protocol',()=>{shooter.tags=new Set(['tg_baizhan_session:session1','sapi_team_55f8b72b-45ea-4ca0-9cde-team-id','pvp:guns_finished','sapi_team_extra_long_name']);const p=packet();assert.ok(JSON.stringify(p).length<8000);assert.equal(hit(p),1)});
test('existing singleton PvP manager prevents overlapping starts and retains failed cleanup match',()=>{const source=fs.readFileSync(root+'/modules/pvp.js','utf8');assert.match(source,/static match = null/);assert.match(source,/if\(this\.busy\|\|this\.match\)/);assert.match(source,/await this\.cleanupArena\(m\.id\);this\.match=null/);assert.match(fs.readFileSync(root+'/main.js','utf8'),/registerEvents\(\(\) => PvPManager\.match\?\.id \?\? null\)/)});
test('ordinary-world players fail closed in direct splash and burn',()=>{
 target.typeId='minecraft:player';
 assert.equal(hit(),0);assert.equal(hit({...packet(),kind:'burn',round:'fire'}),0);
 assert.equal(hit({...packet(),kind:'splash',round:'splash',shotOrigin:packet().origin,origin:{x:9,y:1.6,z:0}}),0);
 target.tags.add('pvp:admission');assert.equal(hit(),0);
});
test('cross-BP private identity undefined but exactly one shared lore works',()=>{
 assert.equal(itemProperties.guns.get('tg_baizhan_identity'),'token1');assert.equal(shooter.getComponent('minecraft:equippable').getEquipment().getDynamicProperty('tg_baizhan_identity'),undefined);assert.equal(hit(),1);
 for(const lore of [[],['BAIZHAN_ID:other'],['BAIZHAN_ID:token1','BAIZHAN_ID:token1'],['BAIZHAN_ID:token1','BAIZHAN_ID:other']]){heldLore=lore;assert.equal(hit(),0)}
});
test('queued packet rejected after session revoke/retrieve/redeploy',()=>{
 const p=packet();shooter.tags.delete(p.sessionTag);assert.equal(hit(p),0);
 shooter.tags.add('tg_baizhan_session:newgeneration');assert.equal(hit({...packet(),sessionTag:p.sessionTag}),0);
 assert.equal(hit({...packet(),sessionTag:'tg_baizhan_session:newgeneration'}),1);
});
test('missing/duplicate/mismatched/overlong sessions fail closed',()=>{
 assert.equal(hit({...packet(),sessionTag:undefined}),0);assert.equal(hit({...packet(),sessionTag:'tg_baizhan_session:wrong'}),0);
 shooter.tags.add('tg_baizhan_session:second');assert.equal(hit(),0);shooter.tags.delete('tg_baizhan_session:second');
 assert.equal(hit({...packet(),sessionTag:'tg_baizhan_session:'+('x'.repeat(130))}),0);
});
test('quick reconnect rejects pre-leave packet despite persisted same public epoch',()=>{
 manager.registerEvents(()=>activeMatchId);assert.equal(typeof leaveHandler,'function');
 const p=packet();leaveHandler({playerId:shooter.id});assert.equal(hit(p),0);
 system.currentTick++;assert.equal(hit(packet()),1);
 system.currentTick+=13;assert.equal(hit(packet()),1);assert.equal(manager.lastLeaveTick.has(shooter.id),false);
});
test('SAPI never reads or changes Guns private identity/debt properties',()=>{
 const source=fs.readFileSync(root+'/modules/baizhan_permission.js','utf8');assert.doesNotMatch(source,/held\.getDynamicProperty|setDynamicProperty|tg_baizhan_identity/);
});
test('ordinary-player indirect riot reflection gate covers both mob hands; formal PvP unchanged',()=>{
 const original=target.getComponent;
 for(const hand of ['Mainhand','Offhand']){
  target.getComponent=function(type){return type==='minecraft:equippable'?{getEquipment:slot=>slot===hand?{typeId:'test_gun:riot_shield'}:undefined}:original.call(this,type)};
  assert.equal(hit(),0);
 }
 target.typeId='minecraft:player';shooter.tags=new Set(['tg_baizhan_session:session1','pvp:participant','pvp:active','pvp:guns_ready','pvp:match:m1','pvp:team:red']);target.tags=new Set(['pvp:participant','pvp:active','pvp:match:m1','pvp:team:blue']);activeMatchId='m1';heldLore=['BAIZHAN_ID:token1','PVP_MATCH:m1'];
 assert.equal(hit(),1);target.getComponent=original;
});
test('vendor modules match pinned source plus synchronized guns and accepted-hit shield wear',()=>{const base=path.resolve(process.argv[2] || process.env.GUNS_BP || '../../../lotm-guns-integrated/addons/development/test_guns_2d_addon/test_guns_bp','scripts');const hashes=JSON.parse(fs.readFileSync(root+'/vendor/baizhan_damage/source_hashes.json'));assert.equal(Object.keys(hashes).length,17);for(const file of Object.keys(hashes)){const content=fs.readFileSync(root+'/vendor/baizhan_damage/'+file);const expected=file==='data/guns.js'?path.resolve(import.meta.dirname,'../../../guns/test_guns_bp/scripts',file):base+'/'+file;let expectedBytes=fs.readFileSync(expected);if(file==='feature/damageHandler.js')expectedBytes=Buffer.from(expectedBytes.toString().replace('EquipmentWear.apply(target, finalDamage, damageOptions, currentDamage)','EquipmentWear.apply(target, finalDamage, damageOptions, currentDamage, activeShieldSlot, blockedDamage)'));assert.deepEqual(content,expectedBytes,file);assert.equal(crypto.createHash('sha256').update(content).digest('hex'),hashes[file],file+' fingerprint');}const source=fs.readFileSync(base+'/data/guns.js','utf8').replace(/^import.*$/gm,'').replace(/export const /g,'const ').replace(/export function /g,'function ');const guns=vm.runInNewContext(source+'\nGUNS',{FireMode:{AUTO:'auto',SEMI:'semi',BURST:'burst',SHOTGUN:'shotgun'}});assert.deepEqual(JSON.parse(JSON.stringify(BAIZHAN_GUN)),JSON.parse(JSON.stringify(guns.find(g=>g.id==='test_gun:baizhan'))))});
test('handler has no delayed application or raw health fallback',()=>{const code=fs.readFileSync(root+'/modules/baizhan_permission.js','utf8').split(' static handleRequest(event) {')[1].split(' static registerEvents()')[0];assert.doesNotMatch(code,/await |system\.run\(|setCurrentValue/);assert.match(code,/DamageHandler\.handleHit/)});
console.log(`${count} authoritative hit regression groups passed`);
