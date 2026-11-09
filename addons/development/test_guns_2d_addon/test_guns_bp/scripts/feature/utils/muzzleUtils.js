import { MUZZLES } from '../../data/muzzles.js';
import { resolveBlockRaycastHit } from './raycastUtils.js';

const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);

// This is a world-space approximation of the third-person hand, not the
// separately posed first-person camera model. Native locator particles follow
// the actual animated muzzle in each view. Script API exposes neither locator.
export function estimateMuzzle(player, gun) {
 const head = player.getHeadLocation();
 const v = player.getViewDirection();
 const len = Math.hypot(v.x, v.y, v.z) || 1;
 const forward = { x: v.x / len, y: v.y / len, z: v.z / len };
 const horizontal = Math.hypot(forward.x, forward.z);
 const yaw = (player.getRotation?.().y || 0) * Math.PI / 180;
 const right = horizontal > 1e-6
  ? { x: -forward.z / horizontal, y: 0, z: forward.x / horizontal }
  : { x: -Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
 const up = {
  x: right.z * forward.y,
  y: right.x * forward.z - right.z * forward.x,
  z: -right.x * forward.y,
 };
 // right x forward points down for Bedrock's +Z south; invert to camera up.
 up.x *= -1; up.y *= -1; up.z *= -1;
 const model = MUZZLES[gun?.id] || [0, 2, -12];
 const lateral = 6 / 16 + model[0] * 0.85 / 16;
 const vertical = (20.393715 - 27.41 + model[1] * 0.85) / 16;
 const reach = (6.886207 - model[2] * 0.85) / 16;
 return {
  x: head.x + right.x * lateral + up.x * vertical + forward.x * reach,
  y: head.y + up.y * vertical + forward.y * reach,
  z: head.z + right.z * lateral + up.z * vertical + forward.z * reach,
 };
}

// Fail closed on unavailable chunks/raycast errors. Never move a muzzle through
// a wall simply because its desired origin is on the far side of that wall.
export function clipSegment(dimension, start, end) {
 const length = distance(start, end);
 if (length < 1e-6) return { location: start, blocked: false };
 const direction = { x: (end.x-start.x)/length, y: (end.y-start.y)/length, z: (end.z-start.z)/length };
 try {
  const hit = dimension.getBlockFromRay(start, direction, {
   maxDistance: length, includePassableBlocks: false, includeLiquidBlocks: false,
  });
  if (!hit) return { location: end, blocked: false };
  const resolved = resolveBlockRaycastHit(hit, direction);
  if (!resolved) return { location: start, blocked: true };
  const travel = Math.max(0, Math.min(length, distance(start, resolved.surface) - 0.04));
  return { location: { x: start.x + direction.x*travel, y: start.y + direction.y*travel, z: start.z + direction.z*travel }, blocked: true };
 } catch {
  return { location: start, blocked: true };
 }
}

export function getMuzzle(player, gun) {
 return clipSegment(player.dimension, player.getHeadLocation(), estimateMuzzle(player, gun));
}

export function getMuzzleLocation(player, gun) { return getMuzzle(player, gun).location; }
