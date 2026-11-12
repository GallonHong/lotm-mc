import { GameMode, system } from '@minecraft/server';
const POSE_CONTROLLER='sapi_pvp_downed_pose';
const DOWN='pvp:downed';
const health=p=>p.getComponent('minecraft:health');
const note=(p,s)=>{try{p.sendMessage(`§e[废土争夺战] ${s}`);}catch{}};
export const RESCUE_RULES=Object.freeze({bleedTicks:600,rescueTicks:100,radius:2.8});
export class PvpRescue {
 static hooks=null;
 static poseTokens=new Map();
 static beginPose(p){const token={};this.poseTokens.set(p.id,token);return token;}
 static resetPose(p){
  const id=p.id,token=this.beginPose(p);
  const reset=()=>{
   if(this.poseTokens.get(id)!==token)return;
   try{
    const current=this.hooks?.byId?.(id);
    if(!current||current.isValid?.()===false||!(health(current)?.currentValue>0)||current.hasTag(DOWN)||this.record(id))return;
    current.playAnimation('animation.sapi_pvp.downed_reset',{controller:POSE_CONTROLLER,blendOutTime:0,stopExpression:'query.all_animations_finished'});
   }catch{}
  };
  reset();for(const delay of [1,4,10,20,40])system.runTimeout(reset,delay);
 }
 static configure(h){this.hooks=h;}
 static record(id){return this.hooks.getMatch()?.downed?.[id];}
 static enemyId(source,victim){
  const m=this.hooks.getMatch();if(!m||!source)return null;
  let id=source.id;
  if(source.hasTag?.('pvp:drone')){
   if(!source.hasTag(`pvp:match:${m.id}`))return null;
   id=source.getTags().find(t=>t.startsWith('pvp:owner:'))?.slice(10);
  }
  return id&&m.stats[id]&&m.stats[victim.id]&&m.stats[id].team!==m.stats[victim.id].team?id:null;
 }
 static nativeDeath(p,source){
  const h=this.hooks,m=h.getMatch();if(!m||m.phase!=='ACTIVE'||!m.players.includes(p.id)||p.hasTag('pvp:dead'))return;
  const old=this.record(p.id);if(old){if(old.stage==='DOWNED')this.finalize(p,this.enemyId(source,p)||old.attacker,true);return;}
  if(h.canDownAt&&!h.canDownAt(p)){h.formalDeath(p,source);return;}
  this.beginPose(p);
  m.downed||={};m.downed[p.id]={stage:'WAITING',matchId:m.id,location:{...p.location},rotation:p.getRotation(),attacker:this.enemyId(source,p),bleedTicks:RESCUE_RULES.bleedTicks,rescueTicks:0,reviver:null,waitTicks:0};
  // Persist before any subsequent spawn callback; native keepInventory preserves actual match items.
  h.save(m);p.addTag(DOWN);p.addTag('pvp:downed_waiting');p.removeTag('pvp:protected');
  h.signal(p,'pvp:downed',m.id);
  note(p,'已倒地，等待同队救援。倒地不计阵亡，无人机继续自动作战。');
 }
 static spawn(p){
  const h=this.hooks,m=h.getMatch(),r=this.record(p.id);if(!r||r.matchId!==m?.id||m.phase!=='ACTIVE')return false;
  if(r.stage!=='WAITING')return false;
  p.setGameMode(GameMode.adventure);p.teleport(r.location,{dimension:h.dimension(),rotation:r.rotation});
  const hp=health(p);if(!hp)throw new Error('倒地玩家生命组件不可用');
  hp.setCurrentValue(Math.min(hp.effectiveMax??20,4));
  p.addTag(DOWN);p.removeTag('pvp:downed_waiting');p.removeTag('pvp:protected');p.inputPermissions.movementEnabled=false;
  for(const e of ['resistance','regeneration','absorption'])try{p.removeEffect(e);}catch{}
  r.stage='DOWNED';r.poseTicks=0;r.rescueTicks=0;r.surrenderTicks=0;r.jumpReleased=false;
  this.beginPose(p);
  try{p.playAnimation('animation.sapi_pvp.downed_fall',{controller:POSE_CONTROLLER,blendOutTime:0,stopExpression:'!query.is_alive || query.all_animations_finished'});}catch{}
  h.save(m);note(p,'队友在2.8格内潜行5秒可救援；30秒后正式阵亡。可在比赛菜单选择放弃救援。');return true;
 }
 static clear(p){
  const m=this.hooks?.getMatch?.();if(m?.downed)delete m.downed[p.id];
  try{p.removeTag(DOWN);p.removeTag('pvp:downed_waiting');p.removeEffect('weakness');p.removeEffect('slowness');}catch{}
  this.resetPose(p);
 }
 static finalize(p,attacker=null,nativeDead=false){
  const h=this.hooks,m=h.getMatch(),r=this.record(p.id);if(!r||m?.phase!=='ACTIVE'||p.hasTag('pvp:dead'))return false;
  r.stage='FINAL';this.clear(p);
  h.formalDeath(p,attacker?h.byId(attacker)||{id:attacker}:null);
  if(!nativeDead)h.respawn(p);
  return true;
 }
 static revive(p){
  const h=this.hooks,m=h.getMatch(),r=this.record(p.id);if(!r||r.stage!=='DOWNED')return;
  this.clear(p);const hp=health(p);if(hp)hp.setCurrentValue(Math.max(1,Math.min(hp.effectiveMax??20,8)));
  p.inputPermissions.movementEnabled=true;
  this.beginPose(p); // Do not let the prior clear retries interrupt getting up.
  try{p.playAnimation('animation.humanoid.revive',{controller:POSE_CONTROLLER,blendOutTime:0,stopExpression:'!query.is_alive || query.all_animations_finished'});}catch{}
  h.save(m);h.signal(p,'pvp:revived',m.id);note(p,'已被队友救起，继续使用当前本局装备。');
 }
 static clearLine(a,b){
  try{const from={x:a.location.x,y:a.location.y+1,z:a.location.z},to={x:b.location.x,y:b.location.y+0.5,z:b.location.z};const v={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},n=Math.hypot(v.x,v.y,v.z);return n<0.01||!a.dimension.getBlockFromRay(from,{x:v.x/n,y:v.y/n,z:v.z/n},{maxDistance:Math.max(0,n-0.2),includeLiquidBlocks:false,includePassableBlocks:false});}catch{return false;}
 }
 static hurt(p){const r=this.record(p.id);if(r){r.rescueTicks=0;r.reviver=null;}const m=this.hooks.getMatch();for(const v of Object.values(m?.downed||{}))if(v.reviver===p.id){v.rescueTicks=0;v.reviver=null;}}
 static tick(){
  const h=this.hooks,m=h.getMatch();if(!m||m.phase!=='ACTIVE')return;
  for(const [id,r]of Object.entries(m.downed||{})){
   const p=h.byId(id);if(!p||!h.valid(p))continue;
   if(r.stage==='WAITING'){r.waitTicks+=5;if(r.waitTicks>200){this.finalize(p,r.attacker,true);note(p,'未完成原生复活，已按正式阵亡处理；复活后返回出生点。');}continue;}
   if(r.stage!=='DOWNED')continue;
   r.poseTicks=(r.poseTicks||0)+5;
   if(r.poseTicks>=20&&r.poseTicks%10===0){
    try{p.playAnimation('animation.sapi_pvp.downed_hold',{controller:POSE_CONTROLLER,blendOutTime:0,stopExpression:'!query.is_alive || query.all_animations_finished'});}catch{}
   }
   // Keep the player at the downed point; FPV recovery or knockback must not release movement.
   p.inputPermissions.movementEnabled=false;
   if(p.dimension.id!==h.dimension().id||Math.hypot(p.location.x-r.location.x,p.location.y-r.location.y,p.location.z-r.location.z)>0.2)p.teleport(r.location,{dimension:h.dimension()});
   try{p.addEffect('weakness',20,{amplifier:255,showParticles:false});}catch{}
   r.bleedTicks-=5;
   if(r.bleedTicks<=0){this.finalize(p,r.attacker);continue;}
   const helpers=m.players.map(h.byId).filter(q=>q&&q.id!==id&&h.valid(q)&&q.hasTag('pvp:active')&&!q.hasTag(DOWN)&&!q.hasTag('pvp:dead')&&!q.hasTag('pvp:protected')&&m.stats[q.id]?.team===m.stats[id]?.team&&q.dimension.id===p.dimension.id&&q.isSneaking&&Math.hypot(q.location.x-p.location.x,q.location.y-p.location.y,q.location.z-p.location.z)<=RESCUE_RULES.radius&&this.clearLine(q,p));
   const helper=helpers.find(q=>q.id===r.reviver)||helpers[0];
   if(!helper){r.rescueTicks=0;r.reviver=null;}else{if(r.reviver!==helper.id){r.rescueTicks=0;note(helper,`保持潜行5秒救援${p.name}，离开或受伤会中断。`);}r.reviver=helper.id;r.rescueTicks+=5;if(r.rescueTicks>=RESCUE_RULES.rescueTicks){this.revive(p);continue;}}
   if(r.bleedTicks%100===0)note(p,`倒地剩余${Math.ceil(r.bleedTicks/20)}秒${helper?`；${helper.name}救援${Math.round(r.rescueTicks/RESCUE_RULES.rescueTicks*100)}%`: '；等待同队潜行救援'}`);
  }
 }
}
