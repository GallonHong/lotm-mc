/** Five immutable cosmetic styles, keyed by the SAME round sent to SAPI. */
export const BAIZHAN_TRAILS = Object.freeze({
 normal:Object.freeze({particle:'test_gun:baizhan_tracer_normal',step:0.9}),
 splash:Object.freeze({particle:'test_gun:baizhan_tracer_splash',step:1.25}),
 fire:Object.freeze({particle:'test_gun:baizhan_tracer_fire',step:0.65}),
 slow:Object.freeze({particle:'test_gun:baizhan_tracer_slow',step:1.05}),
 piercing:Object.freeze({particle:'test_gun:baizhan_tracer_piercing',step:0.8}),
});
export function drawBaizhanTracer(dimension,start,end,round) {
 const style=BAIZHAN_TRAILS[round];
 if(!style||!dimension||![start,end].every(p=>p&&['x','y','z'].every(a=>Number.isFinite(p[a]))))return 0;
 const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z,length=Math.hypot(dx,dy,dz);
 if(length<0.1||!Number.isFinite(length))return 0;
 const count=Math.min(64,Math.max(1,Math.ceil(length/style.step)));
 let emitted=0;
 for(let i=0;i<count;i++) {
  const t=(i+0.5)/count;
  try {dimension.spawnParticle(style.particle,{x:start.x+dx*t,y:start.y+dy*t,z:start.z+dz*t});emitted++;}catch{}
 }
 return emitted;
}
