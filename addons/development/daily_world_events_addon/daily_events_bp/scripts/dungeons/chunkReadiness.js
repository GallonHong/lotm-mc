// Fixed delays do not prove that newly generated destination chunks are ready.
export function arenaColumns(origin, maxX = 130, maxZ = 130) {
 const columns = [];
 for (let x = Math.floor((origin.x - 2) / 16); x <= Math.floor((origin.x + maxX) / 16); x++) {
  for (let z = Math.floor((origin.z - 2) / 16); z <= Math.floor((origin.z + maxZ) / 16); z++) {
   columns.push({ x: x * 16 + 8, y: origin.y, z: z * 16 + 8 });
  }
 }
 return columns;
}

export function waitForArena(dimension, columns, schedule, onReady, onError, isCurrent = () => true) {
 let elapsed = 0, stable = 0;
 const poll = () => {
  if (!isCurrent()) return;
  let ready = 0;
  for (const point of columns) {
   try { if (dimension.getBlock(point)) ready++; } catch {}
  }
  stable = ready === columns.length ? stable + 1 : 0;
  if (stable >= 2) return onReady();
  if (elapsed >= 1200) return onError(new Error(`副本区块加载超时（${ready}/${columns.length}），未开始生成；请检查常加载区名额。`));
  elapsed += 10;
  schedule(poll, 10);
 };
 poll();
}

export function platformTiles(origin, platform) {
 if (!platform) return [];
 const tiles = [];
 for (let x = platform.min.x; x <= platform.max.x;) {
  const x2 = Math.min(platform.max.x, Math.floor((origin.x + x) / 16) * 16 + 15 - origin.x);
  for (let z = platform.min.z; z <= platform.max.z;) {
   const z2 = Math.min(platform.max.z, Math.floor((origin.z + z) / 16) * 16 + 15 - origin.z);
   tiles.push({ min: { x: origin.x + x, y: origin.y - 1, z: origin.z + z }, max: { x: origin.x + x2, y: origin.y - 1, z: origin.z + z2 } });
   z = z2 + 1;
  }
  x = x2 + 1;
 }
 return tiles;
}
