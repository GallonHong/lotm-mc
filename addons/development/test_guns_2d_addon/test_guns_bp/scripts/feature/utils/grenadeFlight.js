// Launcher collision contract, adapted from the active M79/MGL GrenadeEngine:
// native entity ray -> native block ray -> endpoint contact, every flight tick.
// Keep the SAPI copy byte-identical. This helper never applies damage or effects.
const finitePoint = p => p && ['x','y','z'].every(a => Number.isFinite(p[a]));
const at = (a,d,t) => ({x:a.x+d.x*t,y:a.y+d.y*t,z:a.z+d.z*t});
const solid = b => b && !b.isAir && !['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(b.typeId) && (b.isLiquid || b.isSolid !== false);
function boxEntry(start, direction, length, min, max) {
 let enter=0,exit=length;
 for(const axis of ['x','y','z']){
  if(Math.abs(direction[axis])<1e-9){if(start[axis]<min[axis]||start[axis]>max[axis])return null;continue;}
  const a=(min[axis]-start[axis])/direction[axis],b=(max[axis]-start[axis])/direction[axis];
  enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));if(enter>exit)return null;
 }
 return enter;
}
function bodyEntry(entity,start,direction,length){
 try{
  const feet=entity.location,head=entity.getHeadLocation();
  return boxEntry(start,direction,length,{x:feet.x-.475,y:Math.min(feet.y,head.y),z:feet.z-.475},
   {x:feet.x+.475,y:Math.max(feet.y,head.y)+.275,z:feet.z+.475});
 }catch{return null;}
}

export function traceGrenadeSegment(dim,start,end,{shooterId,collides=()=>true,fallbackClip}={}){
 if(!finitePoint(start)||!finitePoint(end))return{location:start,unavailable:true};
 const length=Math.hypot(end.x-start.x,end.y-start.y,end.z-start.z);
 if(length<1e-8)return{location:end,blocked:false};
 const dir={x:(end.x-start.x)/length,y:(end.y-start.y)/length,z:(end.z-start.z)/length};
 let obstacle=null,blockDistance=length,blockRayWorked=false;
 try{
  const hit=dim.getBlockFromRay(start,dir,{maxDistance:length,includePassableBlocks:false,includeLiquidBlocks:true});
  blockRayWorked=true;
  if(hit?.block){
   const b=hit.block.location,f=hit.faceLocation;
   const surface=finitePoint(b)&&finitePoint(f)?{x:b.x+f.x,y:b.y+f.y,z:b.z+f.z}:null;
   const entry=surface?((surface.x-start.x)*dir.x+(surface.y-start.y)*dir.y+(surface.z-start.z)*dir.z):finitePoint(b)?boxEntry(start,dir,length,b,{x:b.x+1,y:b.y+1,z:b.z+1}):null;
   if(entry===null)blockRayWorked=false;
   else{blockDistance=Math.max(0,Math.min(length,entry));obstacle={location:at(start,dir,Math.max(0,blockDistance-.04)),blocked:true};}
  }
 }catch{}
 if(!blockRayWorked){
  let clip;try{clip=fallbackClip?.(dim,start,end);}catch{}
  if(!clip||clip.unavailable||clip.reason==='unavailable')return{location:start,unavailable:true};
  if(clip.blocked){obstacle={location:clip.location,blocked:true};blockDistance=Math.hypot(clip.location.x-start.x,clip.location.y-start.y,clip.location.z-start.z);}
 }
 // Same endpoint fallback as M79/MGL. A missed ground ray must not silently fly
 // into the floor. Keep the detonation just outside the block for splash LOS.
 if(!obstacle&&typeof dim.getBlock==='function'){
  try{
   const cell={x:Math.floor(end.x),y:Math.floor(end.y),z:Math.floor(end.z)},b=dim.getBlock(cell);
   if(!b)return{location:start,unavailable:true};
   if(solid(b)){
    blockDistance=boxEntry(start,dir,length,cell,{x:cell.x+1,y:cell.y+1,z:cell.z+1})??length;
    obstacle={location:at(start,dir,Math.max(0,blockDistance-.04)),blocked:true};
   }
  }catch{return{location:start,unavailable:true};}
 }
 let hits;
 try{
  // Bedrock intersects live collision boxes, including feet/torso and entities
  // which entered the path after launch. Do not replace this with head points.
  const horizontal=Math.hypot(dir.x,dir.z),side=horizontal>1e-8?{x:-dir.z/horizontal,y:0,z:dir.x/horizontal}:{x:1,y:0,z:0};
  const up={x:dir.y*side.z-dir.z*side.y,y:dir.z*side.x-dir.x*side.z,z:dir.x*side.y-dir.y*side.x};
  // A 0.25-block shell uses center + four rim rays, like the launcher's
  // declared grenade collision box. The engine still owns target hitboxes.
  hits=[];
  for(const origin of [start,at(start,side,.125),at(start,side,-.125),at(start,up,.125),at(start,up,-.125)]){
   hits.push(...dim.getEntitiesFromRay(origin,dir,{maxDistance:blockDistance,ignoreBlockCollision:false}));
  }
 }catch{
  // Compatibility fallback only when the native ray API itself is unavailable.
  // Query each segment afresh and intersect the whole vertical body, not head.
  try{hits=dim.getEntities({location:at(start,dir,length/2),maxDistance:length/2+4})
   .map(entity=>({entity,distance:bodyEntry(entity,start,dir,blockDistance)}));}catch{hits=[];}
 }
 const candidates=[];
 for(const hit of hits||[]){try{
  const entity=hit.entity;if(!entity||entity.id===shooterId||!collides(entity))continue;
  const distance=hit.distance;
  if(!Number.isFinite(distance)||distance<0||distance>blockDistance+1e-6)continue;
  // Known walls win ties: never damage a body ray reported on the far surface.
  if(obstacle&&distance>=blockDistance-1e-6)continue;
  candidates.push({target:entity,distance});
 }catch{}}
 candidates.sort((a,b)=>a.distance-b.distance);
 if(candidates.length){const hit=candidates[0];return{location:at(start,dir,hit.distance),target:hit.target,blocked:false};}
 return obstacle||{location:end,blocked:false};
}

// A timeout is a real grenade fuse, not a fabricated surface collision. Never
// detonate into an unloaded chunk or after the source/authority was revoked.
export function grenadeFuseLocationAvailable(dim,location){
 if(!finitePoint(location))return false;
 try{return !!dim.getBlock({x:Math.floor(location.x),y:Math.floor(location.y),z:Math.floor(location.z)});}catch{return false;}
}
