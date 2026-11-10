import { system, MolangVariableMap } from '@minecraft/server';

/** Cosmetics only. Called exclusively for consumed, Server-origin, successful
 * authoritative receipts. Counts include the actual particles per emitter. */
export const BAIZHAN_IMPACTS = Object.freeze({
 normal: [{id:'test_gun:baizhan_hit_spark',count:3},{id:'test_gun:baizhan_hit_dust',count:2}],
 splash: [{id:'test_gun:baizhan_hit_ring',count:1},{id:'test_gun:baizhan_hit_spark',count:3}],
 fire: [{id:'test_gun:baizhan_hit_flame',count:3},{id:'test_gun:baizhan_hit_smoke',count:2}],
 slow: [{id:'test_gun:baizhan_hit_frost',count:5}],
 piercing: [{id:'test_gun:baizhan_hit_metal',count:6}],
});
export const IMPACT_BUDGET=Object.freeze({perPlayerTick:12,globalTick:96,maxKeys:512,keyTicks:12});
const finite=p=>p&&['x','y','z'].every(a=>typeof p[a]==='number'&&Number.isFinite(p[a]));
export class BaizhanImpactFeedback {
 static tick=-1;static total=0;static players=new Map();static seen=new Map();
 static show({applied,nonce,shooterId,dimension,shot,created}) {
  if(applied!==true||typeof nonce!=='string'||typeof shooterId!=='string'||!dimension?.spawnParticle||
   !shot||!['direct','splash','burn'].includes(shot.kind)||!Object.prototype.hasOwnProperty.call(BAIZHAN_IMPACTS,shot.round)||
   (shot.kind==='splash'&&shot.round!=='splash')||(shot.kind==='burn'&&shot.round!=='fire')||
   !Number.isInteger(created)||system.currentTick-created<0||system.currentTick-created>IMPACT_BUDGET.keyTicks)return false;
  const location=shot.kind==='splash'?shot.origin:shot.impact;
  if(!finite(location)||!finite(shot.origin))return false;
  const now=system.currentTick;
  if(now!==this.tick){this.tick=now;this.total=0;this.players.clear();}
  for(const[key,tick]of this.seen)if(now-tick>IMPACT_BUDGET.keyTicks)this.seen.delete(key);
  // All accepted direct/splash targets from one explosive round share one ring.
  // A denied direct request does not reserve this key: a legitimate splash can.
  const key=shot.round==='splash'?JSON.stringify([shooterId,created,'splash',location.x,location.y,location.z]):nonce;
  if(this.seen.has(key)||this.seen.size>=IMPACT_BUDGET.maxKeys)return false;
  const effects=shot.kind==='burn'?[{id:'test_gun:baizhan_hit_smoke',count:2}]:BAIZHAN_IMPACTS[shot.round];
  const cost=effects.reduce((n,e)=>n+e.count,0),spent=this.players.get(shooterId)||0;
  if(spent+cost>IMPACT_BUDGET.perPlayerTick||this.total+cost>IMPACT_BUDGET.globalTick)return false;
  // Reserve before API calls, never retry an uncertain visual emission.
  this.seen.set(key,now);this.players.set(shooterId,spent+cost);this.total+=cost;
  const length=Math.hypot(location.x-shot.origin.x,location.y-shot.origin.y,location.z-shot.origin.z)||1;
  let vars;
  try {vars=new MolangVariableMap();for(const a of ['x','y','z'])vars.setFloat(`variable.bz_d${a}`,(location[a]-shot.origin[a])/length);}catch{}
  for(const effect of effects)try{dimension.spawnParticle(effect.id,location,vars);}catch{}
  return true;
 }
}
