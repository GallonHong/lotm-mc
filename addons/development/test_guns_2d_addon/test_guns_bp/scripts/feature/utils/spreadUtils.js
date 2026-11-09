// Pure angular dispersion, in degrees. No camera or entity mutation.
const DEG = Math.PI / 180;
export function nextSprayState(previous, tick, gunId) {
 const continued = previous?.gunId === gunId && tick >= previous.lastTick && tick - previous.lastTick <= 12;
 return { count: continued ? Math.min(15, previous.count + 1) : 1, lastTick: tick, gunId };
}

export function spreadProfile(rawRecoil, count, stance = {}) {
 const number = Number(rawRecoil);
 const recoil = Number.isFinite(number) && number >= 0 ? number : 0.20;
 const heat = 1 + Math.min(1.2, Math.max(0, count) * 0.12);
 const stability = stance.sneaking ? 0.55 * (stance.mobPants ? 0.65 : 1)
  : stance.sprinting ? 1.4 : stance.falling || stance.climbing ? 1.6 : 1;
 // Former upward pitch kick and half-width yaw drift become symmetric
 // angular limits. The old tiny world-axis offset is replaced, not added.
 return {
  pitchDegrees: Math.min(18, recoil * 5.5 * heat * stability),
  yawDegrees: Math.min(12, recoil * 2.9 * heat * stability),
  pelletDegrees: Math.atan(stance.sneaking ? 0.022 : 0.075) / DEG
 };
}

export function sampleSpreadDirection(direction, profile, pellet = false, random = Math.random) {
 const length = Math.hypot(direction.x, direction.y, direction.z);
 const f = length > 1e-10 && Number.isFinite(length)
  ? { x: direction.x / length, y: direction.y / length, z: direction.z / length }
  : { x: 0, y: 0, z: 1 };
 const horizontal = Math.hypot(f.x, f.z);
 const r = horizontal > 1e-8
  ? { x: f.z / horizontal, y: 0, z: -f.x / horizontal }
  : { x: 1, y: 0, z: 0 };
 const u = { x: f.y * r.z - f.z * r.y, y: f.z * r.x - f.x * r.z, z: f.x * r.y - f.y * r.x };
 // Uniform disk, stretched into an ellipse in the aim-local angular plane.
 // Pellet base cone is combined in quadrature and sampled per pellet.
 const base = pellet ? profile.pelletDegrees : 0;
 const radius = Math.sqrt(Math.max(0, Math.min(1, random())));
 const theta = random() * 2 * Math.PI;
 const yaw = radius * Math.cos(theta) * Math.hypot(profile.yawDegrees, base) * DEG;
 const pitch = radius * Math.sin(theta) * Math.hypot(profile.pitchDegrees, base) * DEG;
 const angle = Math.hypot(yaw, pitch);
 if (angle < 1e-12) return f;
 const s = Math.sin(angle) / angle;
 const c = Math.cos(angle);
 return { x: f.x * c + (r.x * yaw + u.x * pitch) * s,
  y: f.y * c + (r.y * yaw + u.y * pitch) * s,
  z: f.z * c + (r.z * yaw + u.z * pitch) * s };
}
