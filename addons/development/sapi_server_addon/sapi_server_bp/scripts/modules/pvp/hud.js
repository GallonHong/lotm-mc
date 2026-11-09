import { ensurePersistentArea, removeOwnArea } from './chunk_loading.js';
import { world, system } from '@minecraft/server';
import { PVP_CONFIG as C } from './rules.js';

// Native boss HUD only. No title/actionbar transport, no global JSON UI overrides.
// Visibility is distance-based, not player-tag-based: nearby observers also see it.
export const PVP_HUD_ENTITY = 'sapi:pvp_hud';
export const PVP_HUD_TAG = 'pvp:hud';
const ANCHOR = { x: 100208, y: 120, z: 100240 };
const AREA = 'pvp_hud_area';
const delay = ticks => new Promise(resolve => system.runTimeout(resolve,ticks));
const dim = () => world.getDimension(C.dimension);
const valid = entity => { try { return !!entity?.isValid(); } catch { return false; } };
const ratioHealth = ratio => Math.max(1,Math.min(1000,Math.round(ratio*1000)));

export function hudRows(match,countdown=null) {
 const remaining=Math.max(0,Number(match.remaining)||0);
 const time=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
 const headline=countdown!==null?`§e废土争夺战 · ${match.teamSize}v${match.teamSize} · ${countdown}秒后开始`:
  `§c红 ${match.score.red} §f│ §9蓝 ${match.score.blue} §f│ ${time} · 目标 ${C.targetScore}`;
 return [{key:'score',label:headline,health:ratioHealth(countdown!==null?countdown/C.countdownSeconds:remaining/C.durationSeconds)},
  ...match.points.map(point=>{
   const owner=point.owner==='red'?'§c红方':point.owner==='blue'?'§9蓝方':'§7中立';
   const capture=point.capturing==='red'?'§c红方':point.capturing==='blue'?'§9蓝方':'';
   const state=point.contested?'§e争夺中':capture?`${capture}占领 ${point.progress}/${C.captureSeconds}秒`:'§7无争夺';
   return {key:point.id,label:`§f${point.id}据点 §7│ ${owner} §7│ ${state}`,
    health:ratioHealth(point.capturing?point.progress/C.captureSeconds:point.owner?1:0)};
  })];
}

export class PvPHud {
 static entities=new Map(); static matchId=null;
 static async ensureLoaded() {
  await ensurePersistentArea(AREA,{x:Math.floor(ANCHOR.x/16)*16-16,y:64,z:Math.floor(ANCHOR.z/16)*16-16},{x:48,y:1,z:48},{label:'顶部战况显示区'});
 }
 static removeLoaded(matchId=null) {
  const tags=[PVP_HUD_TAG];if(matchId)tags.push(`pvp:hud_match:${matchId}`);
  // Exact custom identifier plus tags; never delete ordinary bosses or decorative entities.
  for(const entity of dim().getEntities({type:PVP_HUD_ENTITY,tags}))entity.remove();
  if(!matchId||this.matchId===matchId){this.entities.clear();this.matchId=null;}
 }
 static async begin(match) {
  await this.ensureLoaded();this.removeLoaded();this.matchId=match.id;
  this.update(match,C.countdownSeconds);
 }
 static update(match,countdown=null) {
  if(this.matchId!==match.id)throw new Error('顶部战况未初始化。');
  for(const row of hudRows(match,countdown)) {
   let entity=this.entities.get(row.key);
   if(!valid(entity)) {
    entity=dim().spawnEntity(PVP_HUD_ENTITY,ANCHOR);
    entity.addTag(PVP_HUD_TAG);entity.addTag(`pvp:hud_match:${match.id}`);entity.addTag(`pvp:hud_row:${row.key}`);
    this.entities.set(row.key,entity);
   }
   entity.nameTag=row.label;
   const hp=entity.getComponent('minecraft:health');
   if(!hp)throw new Error('顶部战况实体缺少生命值组件。');
   hp.setCurrentValue(row.health);
  }
 }
 static async clear(matchId=null) {
  // Also works after a script reload when runtime entity references were lost.
  try{await this.ensureLoaded();this.removeLoaded(matchId);}finally{removeOwnArea(dim(),AREA);}
 }
}
