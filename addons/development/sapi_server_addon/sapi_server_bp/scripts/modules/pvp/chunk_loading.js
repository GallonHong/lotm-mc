import { world, system, GameMode } from '@minecraft/server';
import { PVP_CONFIG as C } from './rules.js';

export const INSTALLER_KEY='pvp:installer_restore_v1';
export const LOAD_TIMEOUT_TICKS=2400; // 120 simulated seconds; generation is not synchronous.
const activeInstallers=new Set();
const delay=ticks=>new Promise(resolve=>system.runTimeout(resolve,ticks));
const valid=p=>{try{return !!p?.isValid();}catch{return false;}};
const note=(p,text)=>{try{p.sendMessage(`§b[废土争夺战] §r${text}`);}catch{}};

export class ChunkLoadError extends Error {
 constructor(code,message){super(message);this.name='ChunkLoadError';this.code=code;}
}
export function chunkColumns(location,size,dimension) {
 for(const n of [location.x,location.y,location.z,size.x,size.y,size.z])if(!Number.isSafeInteger(n))throw new ChunkLoadError('INVALID_REGION','施工区域坐标/尺寸必须为整数。');
 if(size.x<=0||size.y<=0||size.z<=0)throw new ChunkLoadError('INVALID_REGION','施工区域尺寸无效。');
 const range=dimension.heightRange||{min:-64,max:320};
 const maxY=Math.min(C.bounds.maxY,range.max);
 if(location.y<range.min||location.y+size.y-1>maxY)throw new ChunkLoadError('HEIGHT_RANGE',`结构高度 ${location.y}..${location.y+size.y-1} 超出维度高度 ${range.min}..${maxY}。`);
 const minX=Math.floor(location.x/16),maxX=Math.floor((location.x+size.x-1)/16),minZ=Math.floor(location.z/16),maxZ=Math.floor((location.z+size.z-1)/16);
 const total=(maxX-minX+1)*(maxZ-minZ+1);
 if(total>100)throw new ChunkLoadError('AREA_CAPACITY',`单片 ${total} 区块超过 tickingarea 的100区块上限。`);
 const y=Math.max(range.min,Math.min(64,maxY)),columns=[];
 for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)columns.push({x:x*16+8,y,z:z*16+8});
 return columns;
}
function command(d,text,label) {
 let result;
 try{result=d.runCommand(text);}catch(e){throw new ChunkLoadError('AREA_COMMAND',`${label}失败：${String(e.message||e)}。请检查常加载区名额/权限；不会删除其他常加载区。`);}
 if(!result||!(result.successCount>0))throw new ChunkLoadError('AREA_COMMAND',`${label}未成功（successCount=${result?.successCount??'缺失'}）。可能是同名区域尚未释放、命令限制或名额不足；successCount不能确定具体原因。不会删除其他常加载区。`);
 return result;
}
export function removeOwnArea(d,name) {
 if(!/^pvp_(work|vault|spawn_red|spawn_blue|hud_area)$/.test(name))throw new Error('拒绝清理非本插件常加载区。');
 try{d.runCommand(`tickingarea remove ${name}`);}catch(e){console.warn(`[PVP area cleanup] ${name}: ${e}`);}
}
export async function waitForColumns(d,columns,{label='赛场',player=null,timeoutTicks=LOAD_TIMEOUT_TICKS,onPoll=null}={}) {
 let lastError='',lastMissing=columns.length;
 for(let elapsed=0;elapsed<=timeoutTicks;elapsed+=10){
  if(player&&!valid(player))throw new ChunkLoadError('INSTALLER_LEFT','施工管理员已离线，停止施工；重登后恢复其位置和模式。');
  let missing=0;
  for(const p of columns){
   try{if(!d.getBlock(p))missing++;}
   catch(e){
    const detail=`${e.name||'Error'}: ${e.message||e}`;
    if(/OutOfWorld|out of.*(world|bound)|outside.*world|InvalidArgument/i.test(detail))throw new ChunkLoadError('BLOCK_RANGE',`${label}坐标读取失败：${detail}`);
    missing++;lastError=detail;
   }
  }
  if(!missing)return;
  lastMissing=missing;
  if(elapsed>0&&elapsed%200===0)note(player,`${label}正在生成/加载：${columns.length-missing}/${columns.length} 区块，已等待${elapsed/20}秒。`);
  if(onPoll)onPoll(elapsed,missing);
  if(elapsed<timeoutTicks)await delay(10);
 }
 throw new ChunkLoadError('LOAD_TIMEOUT',`${label}加载超时：${lastMissing}/${columns.length} 区块仍不可读（已等待${timeoutTicks/20}秒）。${lastError?` 原始原因：${lastError}`:''}`);
}

export function recoverInstaller(player) {
 if(!valid(player)||activeInstallers.has(player.id))return false;
 const raw=player.getDynamicProperty(INSTALLER_KEY);if(!raw)return false;
 try{
  const r=JSON.parse(String(raw));
  player.teleport(r.location,{dimension:world.getDimension(r.dimension),rotation:r.rotation});
  player.setGameMode(r.gameMode);
  player.inputPermissions.movementEnabled=r.movementEnabled;
  if(!r.admissionTag)player.removeTag('pvp:admission');
  player.setDynamicProperty(INSTALLER_KEY,undefined);
  note(player,'已恢复施工前的位置、模式和操作权限。');
 }catch(e){note(player,`施工状态恢复暂未完成，将自动重试：${e.message||e}`);console.warn(`[PVP installer recovery] ${e}`);}
 return true;
}
export function beginInstaller(player) {
 if(!valid(player))throw new Error('管理员不在线。');
 if(player.getDynamicProperty(INSTALLER_KEY)){
  recoverInstaller(player);
  if(player.getDynamicProperty(INSTALLER_KEY))throw new Error('上次施工状态尚未恢复，请先处理恢复。');
 }
 const record={version:1,dimension:player.dimension.id,location:{...player.location},rotation:player.getRotation(),gameMode:player.getGameMode(),movementEnabled:player.inputPermissions.movementEnabled,admissionTag:player.hasTag('pvp:admission')};
 // Durable before altering player state. No inventory or health mutation.
 player.setDynamicProperty(INSTALLER_KEY,JSON.stringify(record));activeInstallers.add(player.id);
 try{player.addTag('pvp:admission');player.setGameMode(GameMode.spectator);player.inputPermissions.movementEnabled=false;}
 catch(e){activeInstallers.delete(player.id);recoverInstaller(player);throw e;}
 return {move(location){
  if(!valid(player))throw new ChunkLoadError('INSTALLER_LEFT','施工管理员已离线。');
  player.setGameMode(GameMode.spectator);player.inputPermissions.movementEnabled=false;
  player.teleport(location,{dimension:world.getDimension(C.dimension)});
 },finish(){activeInstallers.delete(player.id);recoverInstaller(player);}};
}

let loadingTail=Promise.resolve();
/** One temporary 16-chunk work area at a time, never remove_all. */
export function withLoadedTile(tile,callback,options={}) {
 const work=loadingTail.then(()=>loadTile(tile,callback,options));
 loadingTail=work.catch(()=>{});return work;
}
async function loadTile(tile,callback,{player=null,session=null,timeoutTicks=LOAD_TIMEOUT_TICKS}={}) {
 const d=world.getDimension(C.dimension),p=tile.location,s=tile.size;
 const columns=chunkColumns(p,s,d);
 // Move the already-consenting installer first. Allocation is an aid, not proof
 // of chunk readiness; every destination column is always checked below.
 if(session)session.move({x:p.x+s.x/2,y:Math.max(d.heightRange?.min??-64,Math.min((d.heightRange?.max??320)-1,p.y+s.y/2)),z:p.z+s.z/2});
 let allocated=false,lastError;
 try{
  for(let attempt=0;attempt<3&&!allocated;attempt++){
   // Native removal/name-table updates can settle after the command returns.
   // Await the async command when available AND a tick barrier before re-add.
   let removed;
   try{removed=await areaCommand(d,'tickingarea remove pvp_work');}
   catch(e){console.warn(`[PVP work remove] attempt=${attempt+1} ${e.message||e}`);}
   await delay(10*(attempt+1));
   try{
    const result=await areaCommand(d,`tickingarea add ${p.x} 64 ${p.z} ${p.x+s.x-1} 64 ${p.z+s.z-1} pvp_work true`);
    allocated=result?.successCount>0;
    if(!allocated)lastError=new ChunkLoadError('AREA_COMMAND',`临时常加载区未确认创建：add=${result?.successCount??'缺失'}, remove=${removed?.successCount??'缺失'}；不能据此判定名额已满。`);
   }catch(e){lastError=new ChunkLoadError('AREA_COMMAND',`临时常加载区命令失败：${e.message||e}`);}
  }
  if(!allocated){
   if(!session||!player||!valid(player))throw lastError;
   console.warn(`[PVP work fallback] ${tile.name}: ${lastError.message} 使用已确认的管理员现场加载，仍逐区块验证。`);
   note(player,'临时常加载区未确认成功，改用现场加载；不会删除其他插件的常加载区。');
  }
  await waitForColumns(d,columns,{label:`地图 ${tile.name}`,player,timeoutTicks});
  await callback(d,p,s);
  await delay(5);
 }finally{
  // An unsuccessful/ambiguous add can still leave an owned native area.
  // Always attempt bounded cleanup, even when callback/loading fails.
  try{await areaCommand(d,'tickingarea remove pvp_work');}catch(e){console.warn(`[PVP work cleanup] ${e.message||e}`);}
  await delay(10);
 }
}
async function areaCommand(d,text) {
 if(typeof d.runCommandAsync==='function')return await d.runCommandAsync(text);
 return d.runCommand(text);
}

export async function ensurePersistentArea(name,location,size,{label,timeoutTicks=LOAD_TIMEOUT_TICKS,player=null,session=null}={}) {
 const d=world.getDimension(C.dimension),columns=chunkColumns(location,size,d);
 // Reuse only our own fixed-name areas; duplicate add must not look like a loading timeout.
 let existing=false;
 try{existing=d.runCommand(`tickingarea preload ${name}`)?.successCount>0;}catch{}
 if(existing){
  try{d.runCommand(`tickingarea preload ${name} true`);}catch(e){throw new ChunkLoadError('AREA_COMMAND',`启用${label||name}预加载失败：${e.message||e}`);}
 }
 if(!existing)command(d,`tickingarea add ${location.x} 64 ${location.z} ${location.x+size.x-1} 64 ${location.z+size.z-1} ${name} true`,`创建${label||name}常加载区`);
 if(session)session.move({x:location.x+size.x/2,y:64,z:location.z+size.z/2});
 await waitForColumns(d,columns,{label:label||name,timeoutTicks,player});
}
