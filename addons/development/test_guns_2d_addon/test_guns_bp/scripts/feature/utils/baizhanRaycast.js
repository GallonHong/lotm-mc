import { BAIZHAN, traceCover, unit, point, distance } from '../../data/baizhan.js';

function valid(entity) {
 try { return typeof entity?.isValid === 'function' ? entity.isValid() : entity?.isValid === true; }
 catch { return false; }
}

// Keep native collision geometry. In particular, do not replace a large boss's
// hitbox with a fixed-radius sphere around its head. Protected entities still
// stop a bullet; the damage layer, not the ray, decides whether they can be hurt.
function boundaryDistance(trace) {
 return Number.isFinite(trace.collisionDistance) ? trace.collisionDistance : trace.distance;
}

function beforeBoundary(travel, trace) {
 const limit = boundaryDistance(trace);
 // A coincident entity/wall surface belongs to the wall. Only a numerical
 // guard is needed here, not the old 0.01-block particle offset.
 return trace.blocked ? travel < limit - 1e-6 : travel <= limit;
}

function firstHit(dimension, shooterId, origin, direction, trace) {
 const maxDistance = boundaryDistance(trace);
 if (trace.blocked && !(maxDistance > 0)) return undefined;
 const hits = dimension.getEntitiesFromRay(origin, direction, {
  // Query the enclosing whole-block interval for legacy ray implementations.
  // The exact hit distance is still filtered below, before the true wall.
  // No preview API option or extra damage range is required.
  maxDistance: Math.ceil(maxDistance), ignoreBlockCollision: true,
 });
 return hits.filter(hit => valid(hit.entity) && hit.entity.id !== shooterId &&
  hit.entity.typeId !== BAIZHAN.mountId &&
  !['minecraft:item', 'minecraft:xp_orb'].includes(hit.entity.typeId) &&
  Number.isFinite(hit.distance) && hit.distance >= 0 &&
  beforeBoundary(hit.distance, trace))
  .sort((a, b) => a.distance - b.distance)[0];
}

/** Resolve one native eye hit and its actual barrel path before spending ammo.
 * No nearby-entity auto aim, head-radius guess, damage retry or health fallback.
 * A ray error propagates to the caller, which cancels this shot before emission.
 */
export function resolveBaizhanRay({ dimension, shooterId, head, origin, direction, mounted, muzzle }) {
 const maxBlocks = mounted ? BAIZHAN.maxPenetrations : 0;
 if (muzzle?.blocked) {
  const trace = { blocked: true, hitBlock: muzzle.reason === 'collision', distance: 0, end: origin, cells: [] };
  return { origin, direction, trace, end: origin, target: undefined, contact: false };
 }

 const sight = traceCover(dimension, head, direction, BAIZHAN.range, maxBlocks);
 const sightHit = firstHit(dimension, shooterId, head, direction, sight);
 const aim = sightHit ? point(head, direction, sightHit.distance) : sight.end;
 const offset = { x: aim.x - origin.x, y: aim.y - origin.y, z: aim.z - origin.z };
 const forwardDistance = offset.x * direction.x + offset.y * direction.y + offset.z * direction.z;

 // A long barrel can already be inside/past a close target's front surface.
 // Converging backward and then raycasting from inside its box can miss it.
 // Preserve the verified forward eye contact instead. The head-to-muzzle
 // obstruction check has already passed; the sight trace also clips cover.
 // Contact tracers start at the impact, never draw backwards from the barrel.
 if (sightHit && forwardDistance <= 0) {
  // A deployed pivot is not passed through getMuzzle. Check this connection
  // again in case a block was placed around the gun after deployment.
  if (mounted) {
   const connection = { x: origin.x - head.x, y: origin.y - head.y, z: origin.z - head.z };
   const cover = traceCover(dimension, head, unit(connection) || direction, distance(head, origin), 0);
   if (cover.blocked) return { origin: head, direction, trace: cover, end: cover.end, target: undefined, contact: false };
  }
  return { origin: head, direction, trace: sight, end: aim, target: sightHit.entity, contact: true };
 }

 const barrelDirection = unit(offset) || direction;
 const trace = traceCover(dimension, origin, barrelDirection, BAIZHAN.range, maxBlocks);
 const barrelHit = firstHit(dimension, shooterId, origin, barrelDirection, trace);
 const aimDistance = distance(origin, aim);

 // Keep an eye-selected collision at the endpoint when a second native query
 // omits that boundary/overlap hit. A closer entity or muzzle-side wall still
 // wins, including teammates. Never use the fallback beyond cover or range.
 const eyeEndpointReachable = sightHit && beforeBoundary(aimDistance, trace);
 if (barrelHit && (!eyeEndpointReachable || barrelHit.distance <= aimDistance)) {
  return { origin, direction: barrelDirection, trace, end: point(origin, barrelDirection, barrelHit.distance),
   target: barrelHit.entity, contact: false };
 }
 if (eyeEndpointReachable) {
  return { origin, direction: barrelDirection, trace, end: aim, target: sightHit.entity, contact: false };
 }
 return { origin, direction: barrelDirection, trace, end: trace.end, target: undefined, contact: false };
}
