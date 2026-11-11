/** Gameplay tuning uses existing Test Guns damage units, not normalized HP. */
export const RAIL = Object.freeze({ id:'test_gun:liegui', minCharge:7, midCharge:20, fullCharge:40,
 maxHold:56, ventTicks:24, skillCooldownMs:30000, skillRange:36, skillRadius:2.8,
 skillDamage:72, stunTicks:36, stunImmunityMs:3000, maxTargets:18, projectileSpeed:1.8, gravity:0.045, drag:0.995, sweepStep:0.5, projectileRange:56, maxFlightTicks:80 });
export function chargeProfile(ticks) {
 if(!Number.isInteger(ticks)||ticks<RAIL.minCharge||ticks>=RAIL.maxHold)return null;
 if(ticks<RAIL.midCharge)return {damage:45,spread:3,radius:3.5,splash:36,slowTicks:0,slowAmplifier:0};
 if(ticks<RAIL.fullCharge)return {damage:90,spread:1.5,radius:5.5,splash:72,slowTicks:60,slowAmplifier:2};
 return {damage:150,spread:0.6,radius:7.5,splash:120,slowTicks:80,slowAmplifier:3};
}
export function pointOnSegment(point,start,end,radius) {
 const d={x:end.x-start.x,y:end.y-start.y,z:end.z-start.z};
 const len2=d.x*d.x+d.y*d.y+d.z*d.z;
 const t=len2?Math.max(0,Math.min(1,((point.x-start.x)*d.x+(point.y-start.y)*d.y+(point.z-start.z)*d.z)/len2)):0;
 const distance=Math.hypot(point.x-start.x-t*d.x,point.y-start.y-t*d.y,point.z-start.z-t*d.z);
 return distance<=radius?{t,distance}:null;
}
export function cooldownRemaining(until, now=Date.now()) {return Math.max(0,Math.ceil((Number(until||0)-now)/1000));}
export function spreadDirection(d,degrees,random=Math.random) {
 const length=Math.hypot(d.x,d.y,d.z)||1; const f={x:d.x/length,y:d.y/length,z:d.z/length};
 let r={x:-f.z,y:0,z:f.x};const rl=Math.hypot(r.x,r.z);
 r=rl>1e-6?{x:r.x/rl,y:0,z:r.z/rl}:{x:1,y:0,z:0};
 const u={x:f.y*r.z-f.z*r.y,y:f.z*r.x-f.x*r.z,z:f.x*r.y-f.y*r.x};
 const angle=random()*Math.PI*2,rad=Math.sqrt(random())*Math.tan(degrees*Math.PI/180);
 const v={x:f.x+rad*(r.x*Math.cos(angle)+u.x*Math.sin(angle)),y:f.y+rad*(r.y*Math.cos(angle)+u.y*Math.sin(angle)),z:f.z+rad*(r.z*Math.cos(angle)+u.z*Math.sin(angle))};
 const n=Math.hypot(v.x,v.y,v.z);return{x:v.x/n,y:v.y/n,z:v.z/n};
}

/** Recheck position against the SAPI snapshot, including explicit allow overrides. */
export function approvedAt(approval, dimension, location) {
 if (!approval || approval.targetDimension !== dimension || !Array.isArray(approval.regions)) return false;
 if (approval.adminBypass === true) return true;
 const containing = approval.regions.filter(r => r.min && r.max && ['x','y','z'].every(axis => Number.isFinite(r.min[axis]) && Number.isFinite(r.max[axis]) && location[axis] >= r.min[axis] && location[axis] <= r.max[axis]))
  .sort((a,b)=>(b.priority||0)-(a.priority||0));
 return !containing.length || containing[0].allow === true;
}
