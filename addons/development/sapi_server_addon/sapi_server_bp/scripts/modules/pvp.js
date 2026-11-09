import { withLoadedTile, ensurePersistentArea, beginInstaller, recoverInstaller, removeOwnArea } from './pvp/chunk_loading.js';
import { world, system, GameMode } from '@minecraft/server';
import { ActionFormData, MessageFormData } from '@minecraft/server-ui';
import { Utils } from '../utils.js';
import { PVP_CONFIG as C, inBounds, onPoint, stepPoint, teamFor, marker, navigationLine } from './pvp/rules.js';
import { readTransaction, writeTransaction, reserveVault, vaultLocation, vaultContainers, storeOriginals, issueMatchEquipment, restoreOriginals, releaseVault } from './pvp/vault.js';
import { ARENA_TILES } from './pvp/arena.generated.js';
import { PvPHud } from './pvp/hud.js';

const MATCH_KEY = 'pvp:match_v1', READY_KEY = 'pvp:arena_ready_v1';
const delay = ticks => new Promise(resolve => system.runTimeout(resolve, ticks));
const tell = (p,s) => { try { p.sendMessage(`§b[废土争夺战] §r${s}`); } catch {} };
const byId = id => world.getAllPlayers().find(p=>p.id===id);
const dimension = () => world.getDimension(C.dimension);
const prefixTags = ['pvp:participant','pvp:admission','pvp:active','pvp:protected','pvp:dead','pvp:life_ready','pvp:life_rejected','pvp:life_finished','pvp:guns_ready','pvp:guns_rejected','pvp:guns_finished'];
const clearTags = p => { for(const t of p.getTags()) if(prefixTags.includes(t)||t.startsWith('pvp:team:')||t.startsWith('pvp:match:')) p.removeTag(t); };
const mode = p => p.getGameMode();
function lock(p) { p.setGameMode(GameMode.spectator); try { p.inputPermissions.movementEnabled=false; } catch {} }
function unlockMovement(p) { try { p.inputPermissions.movementEnabled=true; } catch {} }
function event(p, id, matchId) { dimension().runCommand(`scriptevent ${id} ${JSON.stringify({playerId:p.id,matchId})}`); }
function validKeepInventory() { try { return world.gameRules.keepInventory === true; } catch { return false; } }
function ready() { return world.getDynamicProperty(READY_KEY) === true; }
function hasForeignMatch(p) {
 return ['pvp:admission','extract:admission','apoc_extraction_active','apoc:downed','apoc_downed','apoc:true_death','daily_in_dungeon'].some(t=>p.hasTag(t)) || p.dimension.id==='apoc_extract:city' || p.getTags().some(t=>/^(dungeon:|lotm:dungeon|apoc_dungeon)/.test(t));
}
function saveMatch(m) { world.setDynamicProperty(MATCH_KEY,m ? JSON.stringify(m) : undefined); }
function markItems(p, matchId) {
 const c=p.getComponent('minecraft:inventory')?.container;
 for(let i=0;i<(c?.size||0);i++) { const item=c.getItem(i); if(!item)continue; if(!item.getLore().includes(marker(matchId))) { item.setLore([...item.getLore().slice(0,19),marker(matchId)]);c.setItem(i,item); } }
}
async function waitTag(p, success, rejected, ticks=100) {
 for(let i=0;i<ticks;i+=2) { if(!Utils.isValid(p)) throw new Error('玩家已离线，将在重登时恢复。'); if(rejected?.some(t=>p.hasTag(t))) throw new Error('联动包拒绝准备，请先召回货运无人机、退出其他活动并查看内容日志。'); if(success.every(t=>p.hasTag(t)))return; await delay(2); }
 throw new Error('联动包响应超时，已停止入场；需要启用配套 Life 与 Guns 更新。');
}

export class PvPManager {
 static queue = new Set(); static teamSize = 1; static match = null; static busy = false; static restoring = new Map(); static respawning = new Set(); static finishing = null; static protectionEpoch = new Map(); static menuHold = new Map();
 static isParticipant(p) { try{return !!p?.hasTag('pvp:participant');}catch{return false;} }
 static isArenaLocation(d,location) { return d===C.dimension && inBounds(location); }
 static isVaultLocation(d,p) { return d===C.dimension && !!p && p.x>=C.vault.x-2&&p.x<=C.vault.x+34&&p.y>=C.vault.y-2&&p.y<=C.vault.y+4&&p.z>=C.vault.z-2&&p.z<=C.vault.z+14; }
 static openMenu(p,onBack=null) {
  if(!Utils.isValid(p))return;
  if(this.isParticipant(p)) {
   const tx=readTransaction(p);
   const navigation=(this.match?.points||C.points).map(point=>`${navigationLine(p.location,point)} · ${point.contested?'争夺中':point.owner==='red'?'红方':point.owner==='blue'?'蓝方':'中立'}${point.capturing?` · 占领 ${point.progress}/${C.captureSeconds}`:''}`).join('\n');
   Utils.showForm(p,new ActionFormData().title('废土争夺战').body(`当前：${tx?.phase||'恢复中'}\n${navigation}\n死亡保留本局装备；无人机召回后本局停用。\n退出后恢复赛前原装备。`).button('退出比赛并恢复原装备').button('继续比赛'),r=>{if(r.selection===0)this.leave(p);});return;
  }
  const acts=[]; const form=new ActionFormData().title('废土争夺战').body(`六分街 · 三据点占领\n候场 ${this.queue.size}/${this.teamSize*2}，当前 ${this.teamSize}v${this.teamSize}\n无枪时提供普通AK47；无限备弹与医疗品，保留换弹/治疗时间\n无人机真实损耗，货运机禁止入场\n${ready()?'地图已安装':'管理员尚未安装赛场'}${this.match?' · 比赛正在进行':''}`);
  const add=(label,fn)=>{form.button(label);acts.push(fn);};
  add(this.queue.has(p.id)?'取消报名':'报名（自动分队）',()=>this.queue.has(p.id)?this.queue.delete(p.id):(this.queue.size?this.join(p,this.teamSize):this.selectSize(p)));
  if(Utils.isAdmin(p)){add('管理员：安装/检查赛场',()=>this.installMenu(p));add('管理员：结束本局并恢复装备',()=>this.finish('管理员结束'));}
  add('返回',()=>onBack?.()); Utils.showForm(p,form,r=>acts[r.selection]?.());
 }
 static selectSize(p) {
  const form=new ActionFormData().title('选择比赛人数').body('支持 1v1 至 8v8；当前仅运行一个赛场。首位报名者设置本房间人数，人数齐后自动开赛。');
  for(let n=1;n<=8;n++)form.button(`${n}v${n} · 共 ${n*2} 人`);
  Utils.showForm(p,form,r=>{if(Number.isInteger(r.selection)&&r.selection>=0&&r.selection<8)this.join(p,r.selection+1);});
 }
 static join(p,teamSize=1) {
  if(!ready())return tell(p,'赛场尚未安装，无法报名。');
  if(this.busy||this.match)return tell(p,'上一场正在进行或清理，请稍后。');
  if(this.isParticipant(p)||hasForeignMatch(p))return tell(p,'请先退出其他活动或等待装备恢复。');
  if(!Number.isInteger(teamSize)||teamSize<1||teamSize>8)return;
  if(this.queue.size&&this.teamSize!==teamSize)return tell(p,`当前房间为 ${this.teamSize}v${this.teamSize}，请重新报名。`);
  if(!this.queue.size)this.teamSize=teamSize;
  if(this.queue.size>=this.teamSize*2)return tell(p,'候场已满。');
  const old=readTransaction(p);if(old&&(!['RESTORED','CANCELLED'].includes(old.phase)||old.unlockPending))return this.restore(p);
  this.queue.add(p.id);tell(p,`报名成功，候场 ${this.queue.size}/${this.teamSize*2}。可再次打开此菜单取消。`);
  if(this.queue.size>=this.teamSize*2)this.start();
 }
 static async start() {
  if(this.busy||this.match)return;
  for(const id of this.queue)if(!byId(id))this.queue.delete(id);
  const players=[...this.queue].map(byId).filter(Boolean).slice(0,this.teamSize*2);
  if(players.length<this.teamSize*2)return;
  for(let i=players.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[players[i],players[j]]=[players[j],players[i]];}
  if(!validKeepInventory()){for(const p of players)tell(p,'世界 keepInventory 尚未开启，安全检查拒绝开赛。请等待 Life 初始化或管理员检查。');return;}
  this.busy=true;this.queue.clear();
  const m={id:`${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,phase:'PREPARING',teamSize:this.teamSize,players:[],allPlayers:[],score:{red:0,blue:0},points:C.points.map(p=>({...p,owner:null,capturing:null,progress:0,contested:false})),remaining:C.durationSeconds,stats:{}};
  this.match=m;saveMatch(m);
  try {
   await this.ensureVaultLoaded();
   await this.ensureSpawnsLoaded();
   this.assertPreparing(m);
   let red=0,blue=0;
   for(const p of players) {
    this.assertPreparing(m);
    if(!Utils.isValid(p)||!byId(p.id))throw new Error('准备期间玩家离线。');
    if(hasForeignMatch(p)||this.isParticipant(p))throw new Error(`${p.name} 已进入另一活动。`);
    const previous=readTransaction(p);
    if(previous){if(!['RESTORED','CANCELLED'].includes(previous.phase)||previous.unlockPending)throw new Error(`${p.name} 尚有未完成的装备恢复。`);releaseVault(p,previous);}
    const team=teamFor(red,blue);if(team==='red')red++;else blue++;
    const tx={version:1,matchId:m.id,phase:'PREPARING',slot:reserveVault(p),team,dimension:p.dimension.id,location:{...p.location},rotation:p.getRotation(),gameMode:mode(p),selectedSlot:p.selectedSlotIndex};
    writeTransaction(p,tx);clearTags(p);p.addTag('pvp:admission');p.addTag('pvp:participant');p.addTag(`pvp:match:${m.id}`);p.addTag(`pvp:team:${team}`);p.addTag('pvp:protected');
    m.players.push(p.id);m.allPlayers.push(p.id);m.stats[p.id]={name:p.name,team,kills:0,deaths:0};saveMatch(m);
    lock(p);
    event(p,'pvp:prepare',m.id);
    await waitTag(p,['pvp:life_ready','pvp:guns_ready'],['pvp:life_rejected','pvp:guns_rejected']);
    this.assertPreparing(m);lock(p);
    storeOriginals(p,tx);issueMatchEquipment(p,tx);
    p.teleport(this.spawnLocation(team,p.id),{dimension:dimension(),rotation:{x:0,y:team==='blue'?180:0}});
    tell(p,`${team==='red'?'§c红':'§9蓝'}方，原装备已托管。比赛物品只在本局有效。`);
   }
   await PvPHud.begin(m);this.assertPreparing(m);
   m.phase='COUNTDOWN';saveMatch(m);
   for(let n=C.countdownSeconds;n>0;n--) {
    if(this.match!==m||m.phase!=='COUNTDOWN'||m.cancelRequested)throw new Error('比赛已取消。');
    for(const id of m.players)if(!byId(id))throw new Error('开局前有人离线，正在恢复所有装备。');
    PvPHud.update(m,n);
    await delay(20);
   }
   if(this.match!==m||m.phase!=='COUNTDOWN'||m.cancelRequested)throw new Error('比赛已取消。');
   for(const id of m.players){const p=byId(id);if(!p)throw new Error('开赛前玩家离线。');const tx=readTransaction(p);p.teleport(this.spawnLocation(tx.team,p.id),{dimension:dimension(),rotation:{x:0,y:tx.team==='blue'?180:0}});p.removeTag('pvp:admission');p.addTag('pvp:active');p.setGameMode(GameMode.adventure);unlockMovement(p);event(p,'pvp:start',m.id);this.protect(p);}
   m.phase='ACTIVE';PvPHud.update(m);saveMatch(m);
  }catch(e){for(const p of players)tell(p,`入场中止：${e.message}`);this.busy=false;await this.finish('准备失败');}
  finally{this.busy=false;}
 }
 static assertPreparing(m) { if(this.match!==m||m.phase!=='PREPARING'||m.cancelRequested)throw new Error('比赛准备已取消。'); }
 static spawnLocation(team,playerId) {
  const base=C[team],members=(this.match?.players||[]).filter(id=>this.match?.stats[id]?.team===team),index=Math.max(0,members.indexOf(playerId));
  const offsets=[[0,0],[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,2],[2,-2],[-2,-2],[3,0],[-3,0],[0,3],[0,-3]];
  const candidates=offsets.map(([x,z])=>({x:base.x+x,y:base.y,z:base.z+z})).filter(p=>{
   try{const d=dimension(),below=d.getBlock({x:Math.floor(p.x),y:p.y-1,z:Math.floor(p.z)}),feet=d.getBlock({x:Math.floor(p.x),y:p.y,z:Math.floor(p.z)}),head=d.getBlock({x:Math.floor(p.x),y:p.y+1,z:Math.floor(p.z)});const support=below&&!below.isAir&&!below.isLiquid&&/^(minecraft:)?(.*terracotta|.*hardened_clay|.*concrete|.*stone|.*planks|.*bricks|gravel|dirt|grass_block|grass|sand|red_sand|.*stone_bricks|.*cobblestone|.*_block)$/.test(below.typeId);
    if(!support||!feet?.isAir||!head?.isAir)return false;
    for(const x of new Set([Math.floor(p.x-0.31),Math.floor(p.x+0.31)]))for(const z of new Set([Math.floor(p.z-0.31),Math.floor(p.z+0.31)]))for(const y of [p.y,p.y+1])if(!d.getBlock({x,y,z})?.isAir)return false;
    return true;}catch{return false;}
  });
  if(!candidates.length)throw new Error('出生点未加载或被堵塞，已停止传送。');
  return candidates[index%candidates.length];
 }
 static protect(p) {
  p.addTag('pvp:protected');
  try { p.extinguishFire(); for (const effect of ['poison','wither','slowness','weakness','blindness','nausea']) p.removeEffect(effect); p.addEffect('resistance',C.protectionSeconds*20,{amplifier:255,showParticles:false}); } catch {}
  const id=this.match?.id, epoch=(this.protectionEpoch.get(p.id)||0)+1;this.protectionEpoch.set(p.id,epoch);
  system.runTimeout(()=>{if(Utils.isValid(p)&&this.isParticipant(p)&&this.match?.id===id&&this.protectionEpoch.get(p.id)===epoch&&!p.hasTag('pvp:dead'))p.removeTag('pvp:protected');},C.protectionSeconds*20);
 }
 static death(p,killer) {
  const m=this.match;if(!m||m.phase!=='ACTIVE'||!m.players.includes(p.id)||p.hasTag('pvp:dead'))return;
  p.addTag('pvp:dead');p.addTag('pvp:protected');m.stats[p.id].deaths++;
  const attacker=killer?.id&&m.stats[killer.id];if(attacker&&attacker.team!==m.stats[p.id].team)attacker.kills++;
  event(p,'pvp:death',m.id);saveMatch(m);
 }
 static handleSpawn(p,initialSpawn) {
  if(recoverInstaller(p))return true;
  if(!this.isParticipant(p)) {
   const tx=readTransaction(p);if(tx&&(!['RESTORED','CANCELLED'].includes(tx.phase)||tx.unlockPending)){p.addTag('pvp:participant');this.restore(p);return true;}
   return false;
  }
  const m=this.match;
  if(initialSpawn||!m||m.phase!=='ACTIVE'||!m.players.includes(p.id)){this.restore(p);return true;}
  this.respawn(p);return true;
 }
 static async respawn(p) {
  if(this.respawning.has(p.id))return;this.respawning.add(p.id);
  const m=this.match;
  try{lock(p);p.addTag('pvp:dead');p.addTag('pvp:protected');tell(p,`${C.respawnSeconds} 秒后复活，保留死亡时的本局装备。`);await delay(C.respawnSeconds*20);
   if(!Utils.isValid(p))return;
   if(this.match!==m||m.phase!=='ACTIVE'||!m.players.includes(p.id)||!this.isParticipant(p))return this.restore(p);
   const tx=readTransaction(p);if(tx?.phase!=='ACTIVE'||tx.matchId!==m.id)return this.restore(p);p.teleport(this.spawnLocation(tx.team,p.id),{dimension:dimension(),rotation:{x:0,y:tx.team==='blue'?180:0}});p.removeTag('pvp:dead');p.setGameMode(GameMode.adventure);unlockMovement(p);this.protect(p);
  }catch(e){console.warn(`[PVP respawn] ${e}`);this.restore(p);}finally{this.respawning.delete(p.id);}
 }
 static leave(p) {
  this.queue.delete(p.id);if(!this.isParticipant(p))return;
  const m=this.match;if(m&&['PREPARING','COUNTDOWN'].includes(m.phase)){m.cancelRequested=true;saveMatch(m);tell(p,'正在取消准备并恢复装备，请稍候。');return;}
  if(m){m.players=m.players.filter(id=>id!==p.id);saveMatch(m);}
  this.restore(p);
  if(m?.phase==='ACTIVE'&&['red','blue'].some(t=>!m.players.some(id=>m.stats[id]?.team===t)))this.finish('一方全部离场');
 }
 static restore(p) {
  if(!Utils.isValid(p))return Promise.resolve(false);
  if(this.restoring.has(p.id))return this.restoring.get(p.id);
  const work=this.restorePlayer(p);this.restoring.set(p.id,work);
  work.then(()=>this.restoring.delete(p.id),()=>this.restoring.delete(p.id));
  return work;
 }
 static async restorePlayer(p) {
  try{
   const tx=readTransaction(p);if(!tx){tell(p,'缺少装备托管记录，已保留隔离状态，请管理员检查。');return false;}
   if(tx.phase==='RESTORED'||tx.phase==='CANCELLED'){if(tx.unlockPending){p.setGameMode(tx.gameMode);unlockMovement(p);tx.unlockPending=false;writeTransaction(p,tx);}clearTags(p);await this.ensureVaultLoaded();releaseVault(p,tx);return true;}
   p.addTag('pvp:participant');p.addTag('pvp:protected');p.removeTag('pvp:active');lock(p);
   const originalUntouched=tx.phase==='PREPARING';
   if(!originalUntouched){tx.phase='RESTORING';writeTransaction(p,tx);}
   p.removeTag('pvp:life_finished');p.removeTag('pvp:guns_finished');
   event(p,'pvp:finish',tx.matchId);
   await waitTag(p,['pvp:life_finished','pvp:guns_finished'],null,160);
   await this.ensureVaultLoaded();lock(p);
   if(!originalUntouched)restoreOriginals(p,tx);
   p.teleport(tx.location,{dimension:world.getDimension(tx.dimension),rotation:tx.rotation});
   // Persist terminal phase only after deterministic inventory and position restoration.
   tx.phase=originalUntouched?'CANCELLED':'RESTORED';tx.unlockPending=true;writeTransaction(p,tx);
   p.setGameMode(tx.gameMode);unlockMovement(p);clearTags(p);tx.unlockPending=false;writeTransaction(p,tx);releaseVault(p,tx);tell(p,'已离场，原装备和弹匣已恢复。');return true;
  }catch(e){tell(p,`恢复暂未完成：${e.message}。原件保留在托管区，请勿删除托管箱；重新打开比赛菜单重试。`);console.warn(`[PVP restore] ${p.id}: ${e.stack||e}`);system.runTimeout(()=>{if(Utils.isValid(p))this.openMenu(p);},20);return false;}
 }
 static finish(reason='比赛结束') {
  const m=this.match;if(!m)return Promise.resolve();
  if(this.busy&&['PREPARING','COUNTDOWN'].includes(m.phase)){m.cancelRequested=true;saveMatch(m);return Promise.resolve();}
  if(this.finishing)return this.finishing;
  const work=this.finishMatch(reason);this.finishing=work;
  work.then(()=>{this.finishing=null;},()=>{this.finishing=null;});return work;
 }
 static async finishMatch(reason) {
  const m=this.match;if(!m)return;
  const roster=m.allPlayers||m.players;
  m.phase='FINISHING';saveMatch(m);
  const result=m.score.red===m.score.blue?'平局':m.score.red>m.score.blue?'红方获胜':'蓝方获胜';
  for(const id of m.players){const p=byId(id);if(p){p.removeTag('pvp:active');p.addTag('pvp:protected');tell(p,`${reason} · ${result}，红 ${m.score.red} : 蓝 ${m.score.blue}。`);}}
  // Stop producers before cleaning; per-player restore has durable records for offline recovery.
  const results=await Promise.all(roster.map(id=>{const p=byId(id);return p?this.restore(p):Promise.resolve(true);}));
  if(results.some(ok=>!ok)){
   m.phase='RECOVERY_FAILED';saveMatch(m);
   for(const p of world.getAllPlayers())if(Utils.isAdmin(p))tell(p,'部分在线玩家尚未恢复，已暂停清场和下一局。修复后在废土争夺战菜单重试结束比赛。');
   return;
  }
  try { await PvPHud.clear(m.id);await this.cleanupArena(m.id);this.match=null;saveMatch(null);for(const team of ['red','blue'])try{dimension().runCommand(`tickingarea remove pvp_spawn_${team}`);}catch{} }
  catch(e){console.warn(`[PVP cleanup] ${e}`);m.phase='CLEANUP_FAILED';saveMatch(m);for(const p of world.getAllPlayers())if(Utils.isAdmin(p))tell(p,'赛场清理失败，暂不接受新比赛。重新载入会重试清理。');}
 }
 static async ensureSpawnsLoaded() {
  for(const team of ['red','blue']) {
   const p=C[team];
   await ensurePersistentArea(`pvp_spawn_${team}`,{x:Math.floor(p.x/16)*16-16,y:64,z:Math.floor(p.z/16)*16-16},{x:48,y:1,z:48},{label:`${team==='red'?'红':'蓝'}方出生点`});
  }
 }
 static async ensureVaultLoaded(options={}) {
  await ensurePersistentArea('pvp_vault',{x:C.vault.x-2,y:C.vault.y,z:C.vault.z-2},{x:37,y:5,z:17},{label:'装备托管区',...options});
 }
 static loadedTile(tile,callback,options={}) { return withLoadedTile(tile,callback,options); }
 static async cleanupArena(matchId) {
  for(const tile of ARENA_TILES) await this.loadedTile(tile,async(d,p,s)=>{
   for(const e of d.getEntities({type:'minecraft:item',location:p,volume:{x:s.x,y:s.y,z:s.z}})){
    // Dedicated arena: remove all item drops, including interrupted unmarked supply drops.
    e.remove();
   }
  });
 }
 static installMenu(p) {
  if(!Utils.isAdmin(p))return;
  let status='';try{const j=JSON.parse(String(world.getDynamicProperty('pvp:install_v2')||'null'));if(j&&j.phase!=='DONE')status=`\n发现未完成记录：${j.nextTile||0}/${ARENA_TILES.length}片；确认后继续。`;}catch{}
  Utils.showForm(p,new MessageFormData().title('安装六分街争夺战赛场').body('仅首次安装或更新地图时使用。\n将覆盖主世界 X100096..100319、Z100096..100383、Y-64..319，并在 X100336..100366、Z100112..100121、Y-60 建立装备托管箱。请先备份世界并确认这些位置无原有建筑。\n施工会临时切换你为旁观模式并带你逐片加载地形，结束或失败会恢复位置、模式与操作权限；离线则停止并在重登后恢复。\n地图署名 Licraft漓清，仅供本服使用。'+status+'\n是否开始？').button1('取消').button2('确认指定范围施工并临时加载'),r=>{if(r.selection===1&&Utils.isAdmin(p))this.install(p);});
 }
 static async install(p) {
  if(!Utils.isAdmin(p))return;
  if(this.busy||this.match||this.queue.size)return tell(p,'有比赛或候场，不能安装。');
  if(this.isParticipant(p)||hasForeignMatch(p))return tell(p,'请先退出其他活动后安装赛场。');
  this.busy=true;let session=null,journal=null;
  const journalKey='pvp:install_v2';
  const signature=JSON.stringify(ARENA_TILES.map(t=>[t.name,t.location,t.size]));
  try{
   const allocated=JSON.parse(String(world.getDynamicProperty('pvp:vault_index_v1')||'{}'));
   if(Object.keys(allocated).length)throw new Error('存在未释放托管记录，先恢复所有玩家装备。');
   // Fixed manifest bounds, not user-supplied command coordinates. Never expand scope on retry.
   for(const t of ARENA_TILES){const a=t.location,b={x:a.x+t.size.x-1,y:a.y+t.size.y-1,z:a.z+t.size.z-1};if(!inBounds(a)||!inBounds(b))throw new Error(`结构 ${t.name} 超出已确认赛区，拒绝安装。`);}
   let previous=null;try{previous=JSON.parse(String(world.getDynamicProperty(journalKey)||'null'));}catch{}
   journal=previous&&previous.signature===signature&&['RUNNING','FAILED'].includes(previous.phase)&&Number.isInteger(previous.nextTile)&&previous.nextTile>=0&&previous.nextTile<=ARENA_TILES.length?previous:{version:2,signature,nextTile:0};
   journal.phase='RUNNING';journal.installerId=p.id;delete journal.error;
   world.setDynamicProperty(journalKey,JSON.stringify(journal));world.setDynamicProperty(READY_KEY,false);
   session=beginInstaller(p);
   tell(p,`开始施工，已完成 ${journal.nextTile}/${ARENA_TILES.length} 片。首次远端生成可能较慢，请保持在线。`);
   for(let i=journal.nextTile;i<ARENA_TILES.length;i++){
    const tile=ARENA_TILES[i];
    await this.loadedTile(tile,async d=>{
     for(const e of d.getEntities({tags:['pvp:decoration'],location:tile.location,volume:tile.size}))e.remove();
     const command=`structure load ${tile.name} ${tile.location.x} ${tile.location.y} ${tile.location.z} 0_degrees none true true`;
     const r=typeof d.runCommandAsync==='function'?await d.runCommandAsync(command):d.runCommand(command);
     if(!r||!(r.successCount>0))throw new Error(`结构未加载：${tile.name}，请确认启用六分街场景BP。`);
    },{player:p,session});
    journal.nextTile=i+1;world.setDynamicProperty(journalKey,JSON.stringify(journal));
    tell(p,`安装地图 ${journal.nextTile}/${ARENA_TILES.length}`);
   }
   await this.ensureVaultLoaded({player:p,session});
   for(let slot=0;slot<C.vault.slots;slot++)for(let side=0;side<2;side++){
    const v=vaultLocation(slot,side),existing=dimension().getBlock(v),container=existing?.getComponent('minecraft:inventory')?.container;
    if(container&&container.emptySlotsCount!==container.size)throw new Error('发现非空托管箱，拒绝覆盖。');
    if(existing?.typeId!=='minecraft:chest'){
     const r=dimension().runCommand(`setblock ${v.x} ${v.y} ${v.z} chest`);if(!(r?.successCount>0))throw new Error(`创建托管箱失败：${v.x},${v.y},${v.z}`);
    }
   }
   for(let slot=0;slot<C.vault.slots;slot++)vaultContainers(slot);
   journal.phase='DONE';delete journal.error;world.setDynamicProperty(journalKey,JSON.stringify(journal));
   world.setDynamicProperty(READY_KEY,true);tell(p,'赛场和全部托管箱安装完成。请先在测试服检查路线、出生点与边界，再开启正式比赛。');
  }catch(e){
   if(journal){journal.phase='FAILED';journal.error=String(e.message||e).slice(0,1500);try{world.setDynamicProperty(journalKey,JSON.stringify(journal));}catch{}}
   tell(p,`安装未完成：${e.message}。已保留${journal?.nextTile||0}/${ARENA_TILES.length}片进度；修正后重新确认安装即可继续。`);
   console.warn(`[PVP install ${e.code||'ERROR'}] tile=${journal?.nextTile??0}: ${e.stack||e}`);
  }finally{removeOwnArea(dimension(),'pvp_work');session?.finish();this.busy=false;}
 }
 static tick() {
  const m=this.match;if(!m||m.phase!=='ACTIVE')return;
  if(!validKeepInventory()){this.finish('背包保留规则被关闭，安全中止');return;}
  const live=m.players.map(byId).filter(Boolean);
  for(const p of live){
   if(p.hasTag('pvp:dead'))continue;
   const tx=readTransaction(p);
   if(p.dimension.id!==C.dimension||!inBounds(p.location,C.combat)){p.teleport(C[tx.team],{dimension:dimension()});this.protect(p);tell(p,'超出战区，已返回出生点。');}
   markItems(p,m.id);
  }
  m.points=m.points.map(point=>{
   const occupiers=live.filter(p=>p.hasTag('pvp:active')&&!p.hasTag('pvp:dead')&&!p.hasTag('pvp:protected')&&p.dimension.id===C.dimension&&onPoint(p.location,point));
   return stepPoint(point,occupiers.filter(p=>p.hasTag('pvp:team:red')).length,occupiers.filter(p=>p.hasTag('pvp:team:blue')).length);
  });
  for(const point of m.points)if(point.owner&&!point.contested)m.score[point.owner]++;
  m.remaining--;
  PvPHud.update(m);
  if(m.remaining%5===0)saveMatch(m);
  if(m.remaining<=0||m.score.red>=C.targetScore||m.score.blue>=C.targetScore)this.finish('比赛结束');
 }
 static init() {
  removeOwnArea(dimension(),'pvp_work');
  for(const p of world.getAllPlayers())recoverInstaller(p);
  system.runInterval(()=>{for(const p of world.getAllPlayers())recoverInstaller(p);},20);
  const old=world.getDynamicProperty(MATCH_KEY);
  if(old){try{this.match=JSON.parse(String(old));this.match.phase='RECOVERING';system.run(()=>this.finish('服务器重启，安全结束比赛'));}catch(e){console.warn(`[PVP journal] ${e}`);this.busy=true;}}
  for(const p of world.getAllPlayers()){
   const tx=readTransaction(p);if(tx&&(!['RESTORED','CANCELLED'].includes(tx.phase)||tx.unlockPending)){p.addTag('pvp:participant');system.run(()=>this.restore(p));}
  }
  const sub=(events,name,fn)=>{try{events?.[name]?.subscribe(fn);}catch(e){console.warn(`[PVP subscribe ${name}] ${e}`);}};
  sub(world.afterEvents,'entityDie',e=>{if(e.deadEntity?.typeId==='minecraft:player'&&this.isParticipant(e.deadEntity))this.death(e.deadEntity,e.damageSource?.damagingEntity);});
  sub(world.afterEvents,'playerLeave',e=>{
   this.queue.delete(e.playerId);this.protectionEpoch.delete(e.playerId);this.menuHold.delete(e.playerId);const m=this.match;
   if(!m?.players.includes(e.playerId))return;
   if(['PREPARING','COUNTDOWN'].includes(m.phase)){m.cancelRequested=true;saveMatch(m);return;}
   m.players=m.players.filter(id=>id!==e.playerId);saveMatch(m);
   if(m.phase==='ACTIVE'&&['red','blue'].some(t=>!m.players.some(id=>m.stats[id]?.team===t)))this.finish('一方离线');
  });
  const protectedBlock=e=>this.isArenaLocation(e.block?.dimension?.id,e.block?.location)||this.isVaultLocation(e.block?.dimension?.id,e.block?.location);
  sub(world.beforeEvents,'playerBreakBlock',e=>{if(this.isParticipant(e.player)||protectedBlock(e))e.cancel=true;});
  // Stable 1.15 has no before playerPlaceBlock. Cancel placement through itemUseOn and interaction instead.
  sub(world.beforeEvents,'itemUseOn',e=>{if(this.isParticipant(e.source)||protectedBlock(e))e.cancel=true;});
  sub(world.beforeEvents,'playerInteractWithBlock',e=>{if(this.isVaultLocation(e.block?.dimension?.id,e.block?.location)){e.cancel=true;return;}if(this.isArenaLocation(e.block?.dimension?.id,e.block?.location)&&!this.isParticipant(e.player)){e.cancel=true;return;}if(this.isParticipant(e.player)&&!/(door|trapdoor|fence_gate|button|lever)$/.test(e.block?.typeId||''))e.cancel=true;});
  sub(world.beforeEvents,'playerInteractWithEntity',e=>{if(this.isParticipant(e.player)||this.isArenaLocation(e.target?.dimension?.id,e.target?.location)||this.isVaultLocation(e.target?.dimension?.id,e.target?.location))e.cancel=true;});
  sub(world.beforeEvents,'explosion',e=>{try{e.setImpactedBlocks(e.getImpactedBlocks().filter(b=>!this.isArenaLocation(b.dimension.id,b.location)&&!this.isVaultLocation(b.dimension.id,b.location)));}catch{if(this.isArenaLocation(e.dimension?.id,e.source?.location))e.cancel=true;}});
  // Stable fallback when chatSend is unavailable: hold sneak with an empty hand for two seconds.
  system.runInterval(()=>{for(const p of world.getAllPlayers())try{
   const holding=this.isParticipant(p)&&p.hasTag('pvp:active')&&!p.hasTag('pvp:dead')&&p.isSneaking&&!p.getComponent('minecraft:inventory')?.container?.getItem(p.selectedSlotIndex);
   if(!holding){this.menuHold.delete(p.id);continue;}const n=(this.menuHold.get(p.id)||0)+1;this.menuHold.set(p.id,n);if(n===8)this.openMenu(p);
  }catch(e){console.warn(`[PVP menu] ${e}`);}},5);
  system.runInterval(()=>{try{for(const p of world.getAllPlayers())if(this.match&&this.isArenaLocation(p.dimension.id,p.location)&&!this.isParticipant(p)){p.teleport(world.getDefaultSpawnLocation(),{dimension:dimension()});tell(p,'赛场进行中，仅本场参赛者可进入。');}}catch(e){console.warn(`[PVP boundary] ${e}`);}},5);
  system.runInterval(()=>{try{this.tick();}catch(e){console.warn(`[PVP tick] ${e}`);this.finish('比赛异常，安全结束');}},20);
 }
}
