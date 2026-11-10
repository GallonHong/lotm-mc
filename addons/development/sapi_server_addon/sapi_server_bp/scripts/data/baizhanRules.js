// Mirrored from Test Guns data/baizhan.js. Keep cover policy identical.
/** Shared gameplay constants and deterministic geometry helpers. */
export const BAIZHAN = Object.freeze({
 id: 'test_gun:baizhan', mountId: 'test_gun:baizhan_mount', ammoId: 'test_gun:ammo_belt_100',
 deployTicks: 20, handFireTicks: 4, mountedFireTicks: 3, range: 80,
 maxPenetrations: 2, guardTicks: 12, maxPending: 128,
 splashRadius: 2.5, splashDamage: 10, burnDamage: 3, burnInterval: 20, burnTicks: 60,
 maxBurstTicks: 200, mountedMuzzleReach: 25.1 / 16, mountedPivotHeight: 18 / 16,
});
export const ROUND_WEIGHTS = Object.freeze([
 Object.freeze({ id: 'normal', weight: 50 }), Object.freeze({ id: 'splash', weight: 15 }),
 Object.freeze({ id: 'fire', weight: 10 }), Object.freeze({ id: 'slow', weight: 10 }),
 Object.freeze({ id: 'piercing', weight: 15 }),
]);
export function chooseRound(random = Math.random) {
 const roll = Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * 100;
 let limit = 0;
 for (const round of ROUND_WEIGHTS) { limit += round.weight; if (roll < limit) return round.id; }
 return 'normal';
}
export const MACHINE_TARGETS = new Set([
 'ab_ve:truck', 'ab_ve:motorcycle', 'ab_ve:ambulance', 'ab_ve:helicopter', 'ab_ve:speedboat',
 ...['summoner', 'ore_finder', 'healing', 'mob_transporter', 'spy', 'mining', 'laser',
 'tnt_launcher', 'poison', 'inventory', 'race', 'water', 'ground', 'lightning_strike',
 'freeze', 'night_vision', 'item_collector', 'crossbow', 'fertiliser'].map(name => `makercamp_dr:${name}_drone`),
]);
export function machineDamageMultiplier(target) { return MACHINE_TARGETS.has(target?.typeId) ? 2 : 1; }
// Deliberately narrow whitelist. No stone, metal, containers, doors, barriers,
// bedrock, liquids or unknown/add-on blocks. No block is ever destroyed.
const WOODS = ['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','pale_oak'];
export const PENETRABLE_BLOCKS = new Set([
 'minecraft:glass', 'minecraft:glass_pane', 'minecraft:dirt', 'minecraft:coarse_dirt',
 'minecraft:grass_block', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
 'minecraft:planks', 'minecraft:log', 'minecraft:log2', 'minecraft:leaves', 'minecraft:leaves2',
 ...WOODS.flatMap(wood => [`minecraft:${wood}_planks`, `minecraft:${wood}_log`, `minecraft:${wood}_leaves`, `minecraft:stripped_${wood}_log`]),
 ...['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black']
 .flatMap(color => [`minecraft:${color}_stained_glass`, `minecraft:${color}_stained_glass_pane`, `minecraft:${color}_wool`]),
]);
export const point = (start, direction, distance) => ({ x: start.x + direction.x * distance, y: start.y + direction.y * distance, z: start.z + direction.z * distance });
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export function unit(direction) {
 const length = Math.hypot(direction?.x, direction?.y, direction?.z);
 if (!(length > 0) || !Number.isFinite(length)) return null;
 return { x: direction.x / length, y: direction.y / length, z: direction.z / length };
}
/** Voxel DDA counts each occupied cell once, including diagonal/negative rays.
 * Unknown chunks fail closed; liquids stop the gun. */
export function traceCover(dimension, start, direction, maxDistance, maxBlocks = 0) {
 const dir = unit(direction);
 const result = { distance: 0, end: start, blocked: true, cells: [] };
 if (!dir || !['x','y','z'].every(axis => Number.isFinite(start?.[axis])) || !(maxDistance >= 0)) return result;
 const cell = {}, step = {}, next = {}, delta = {};
 for (const axis of ['x','y','z']) {
  cell[axis] = Math.floor(start[axis]); step[axis] = Math.sign(dir[axis]);
  delta[axis] = dir[axis] === 0 ? Infinity : Math.abs(1 / dir[axis]);
  next[axis] = dir[axis] === 0 ? Infinity : ((step[axis] > 0 ? cell[axis] + 1 : cell[axis]) - start[axis]) / dir[axis];
 }
 let travel = 0;
 for (let iterations = 0; iterations < 512 && travel <= maxDistance; iterations++) {
  let block;
  try { block = dimension.getBlock(cell); } catch { block = undefined; }
  if (!block) return { ...result, distance: travel, end: point(start,dir,travel) };
  const id = block.typeId;
  const air = block.isAir === true || ['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(id);
  const liquid = block.isLiquid === true || ['minecraft:water','minecraft:flowing_water','minecraft:lava','minecraft:flowing_lava'].includes(id);
  if (!air && (liquid || block.isSolid !== false || PENETRABLE_BLOCKS.has(id))) {
   if (liquid || !PENETRABLE_BLOCKS.has(id) || result.cells.length >= maxBlocks) {
    return { ...result, distance: Math.max(0,travel-0.01), end: point(start,dir,Math.max(0,travel-0.01)) };
   }
   result.cells.push({ x: cell.x, y: cell.y, z: cell.z, typeId: id });
  }
  const boundary = Math.min(next.x,next.y,next.z);
  if (boundary > maxDistance || !Number.isFinite(boundary)) return { ...result, blocked:false, distance:maxDistance, end:point(start,dir,maxDistance) };
  for (const axis of ['x','y','z']) if (Math.abs(next[axis]-boundary)<1e-8) { cell[axis] += step[axis]; next[axis] += delta[axis]; }
  travel = Math.max(travel,boundary);
 }
 return { ...result, distance:travel, end:point(start,dir,travel) };
}
/** Check boundary intervals rather than sampling and missing thin regions. */
export function approvedSegment(approval, dimension, start, end) {
 if (!approval || approval.allowed !== true || approval.targetDimension !== dimension || !Array.isArray(approval.regions)) return false;
 if (approval.adminBypass === true) return true;
 if (!['x','y','z'].every(a => Number.isFinite(start?.[a]) && Number.isFinite(end?.[a]))) return false;
 const values = [0,1];
 for (const region of approval.regions) {
  if (!region.min || !region.max || !['x','y','z'].every(a=>Number.isFinite(region.min[a])&&Number.isFinite(region.max[a]))) return false;
  for (const axis of ['x','y','z']) for (const side of ['min','max']) {
   const d = end[axis]-start[axis];
   if (Math.abs(d)>1e-9) { const t=(region[side][axis]-start[axis])/d; if(t>0&&t<1)values.push(t); }
  }
 }
 values.sort((a,b)=>a-b);
 const checkpoints = [...values];
 for(let i=1;i<values.length;i++) checkpoints.push((values[i-1]+values[i])/2);
 return checkpoints.every(t=>{
  const p = {x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t,z:start.z+(end.z-start.z)*t};
  const containing=approval.regions.filter(r=>['x','y','z'].every(a=>p[a]>=r.min[a]&&p[a]<=r.max[a])).sort((a,b)=>(b.priority||0)-(a.priority||0));
  return !containing.length || containing[0].allow === true;
 });
}
