/** Keep a useful blast across its footprint, before normal armor/shield reduction.
 * Inner 35% is full damage; the outer ring tapers to 40%, never to 1 HP.
 * Mirrored by SAPI data/railBlast.js; callers own authority, cover and permission. */
export function railSplashDamage(profile, distance) {
 if (!profile || !Number.isFinite(distance) || distance < 0 ||
     !Number.isFinite(profile.radius) || profile.radius <= 0 ||
     !Number.isFinite(profile.splash) || profile.splash <= 0 || distance > profile.radius) return 0;
 const outer = Math.max(0, (distance / profile.radius - 0.35) / 0.65);
 return Math.round(profile.splash * (1 - 0.6 * outer) * 10) / 10;
}

const finitePoint = p => !!p && ['x','y','z'].every(axis=>Number.isFinite(p[axis]));

/** Sphere-to-body distance, in all three axes. A target is reached when its
 * vertical body intersects the blast sphere, not an infinite horizontal disk.
 * Invalid native handles are isolated here, never allowed to abort the blast. */
export function railBlastGeometry(target, impact) {
 try {
  if (!finitePoint(impact)) return null;
  const valid=typeof target?.isValid==='function'?target.isValid():target?.isValid===true;
  if (!valid || !(target.getComponent('minecraft:health')?.currentValue>0)) return null;
  const feet=target.location;
  if (!finitePoint(feet)) return null;
  let head;
  try { head=target.getHeadLocation(); } catch { head={...feet,y:feet.y+.8}; }
  if (!finitePoint(head)) return null;
  const low=Math.min(feet.y,head.y)+.1,high=Math.max(low,feet.y,head.y);
  const point={x:feet.x,y:Math.max(low,Math.min(high,impact.y)),z:feet.z};
  return { point,distance:Math.hypot(point.x-impact.x,point.y-impact.y,point.z-impact.z) };
 } catch { return null; }
}

/** Capture candidates BEFORE direct damage can create drops or invalidate
 * native handles. Every candidate is independent; a stale entry is skipped.
 * Callers still recheck current geometry, permissions and walls before damage. */
export function railBlastTargets(dimension, impact, profile, directId) {
 if (!finitePoint(impact) || !(Number.isFinite(profile?.radius)&&profile.radius>0)) return [];
 let nearby;
 try { nearby=dimension.getEntities({location:impact,maxDistance:profile.radius+4}); } catch { return []; }
 const targets=[],seen=new Set(directId?[directId]:[]);
 for (const target of nearby) {
  try {
   const id=target.id;
   if (seen.has(id)) continue;
   seen.add(id);
   const geometry=railBlastGeometry(target,impact);
   if (geometry && geometry.distance<=profile.radius) targets.push(target);
  } catch {} // No one candidate may cancel other victims or the impact receipt.
 }
 return targets;
}

/** Called only after an accepted hit. No lock/tags/timer, no damage retry. */
export function applyRailSlow(target, profile) {
 if (!Number.isInteger(profile?.slowTicks) || profile.slowTicks <= 0 ||
     !Number.isInteger(profile.slowAmplifier) || profile.slowAmplifier < 0) return false;
 try {
  if (!(target.getComponent('minecraft:health')?.currentValue > 0)) return false;
  if (['pvp:protected','pvp:admission','pvp:downed','pvp:dead','apoc:downed_pending',
       'apoc:downed','apoc_downed','apoc:true_death'].some(tag=>target.hasTag?.(tag))) return false;
  // Never replace a stronger stun or shorten a same-strength slow.
  const current = target.getEffect?.('slowness');
  if (current && (current.amplifier > profile.slowAmplifier ||
      (current.amplifier === profile.slowAmplifier && current.duration >= profile.slowTicks))) return false;
  return target.addEffect('slowness', profile.slowTicks,
   { amplifier: profile.slowAmplifier, showParticles: false }) !== false;
 } catch { return false; }
}
