import { system } from '@minecraft/server';
/** Fail closed: never overwrite old buildings, liquids, containers or unknown blocks.
 * Runs before each not-yet-committed tile; interrupted loads require manual review. */
export async function assertEmptyDestination(d,tile,{isOnline=()=>true,onProgress=()=>{}}={}) {
 const {location:p,size:s}=tile;let checked=0;
 for(let x=p.x;x<p.x+s.x;x++)for(let z=p.z;z<p.z+s.z;z++)for(let y=p.y;y<p.y+s.y;y++){
  if(!isOnline())throw new Error('管理员离线，停止目标区域检查。');
  const b=d.getBlock({x,y,z});
  if(!b||!['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(b.typeId))throw new Error(`目标区域不是空白：${x},${y},${z} (${b?.typeId||'未加载'})。未覆盖此片，请先人工检查，不能自动清空。`);
  if(++checked%4096===0){if(checked%65536===0)onProgress(checked,s.x*s.y*s.z);await new Promise(resolve=>system.runTimeout(resolve,1));}
 }
 return checked;
}
