/** 将 BlockRaycastHit 的方块局部命中坐标转换为世界坐标。 */
export function resolveBlockRaycastHit(blockHit, direction, visualOffset = 0.03) {
  const blockLocation = blockHit?.block?.location;
  if (!blockLocation) return null;

  const dx = Number(direction?.x) || 0;
  const dy = Number(direction?.y) || 0;
  const dz = Number(direction?.z) || 0;
  const length = Math.hypot(dx, dy, dz) || 1;
  const normal = { x: dx / length, y: dy / length, z: dz / length };
  const local = blockHit.faceLocation;

  let surface;
  if (local && Number.isFinite(local.x) && Number.isFinite(local.y) && Number.isFinite(local.z)) {
    // faceLocation 以命中方块的西北下角为原点，并非世界坐标。
    surface = {
      x: Number(blockLocation.x) + Number(local.x),
      y: Number(blockLocation.y) + Number(local.y),
      z: Number(blockLocation.z) + Number(local.z)
    };
  } else {
    // 极旧 API 没有 faceLocation 时，从方块中心沿射线反方向求一个近似表面点。
    const maxAxis = Math.max(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z), 1e-6);
    const toFace = 0.5 / maxAxis;
    surface = {
      x: Number(blockLocation.x) + 0.5 - normal.x * toFace,
      y: Number(blockLocation.y) + 0.5 - normal.y * toFace,
      z: Number(blockLocation.z) + 0.5 - normal.z * toFace
    };
  }

  const offset = Math.max(0, Number(visualOffset) || 0);
  return {
    surface,
    // 将轨迹终点和命中火花推出实体方块表面，避免深度遮挡。
    visual: {
      x: surface.x - normal.x * offset,
      y: surface.y - normal.y * offset,
      z: surface.z - normal.z * offset
    }
  };
}
