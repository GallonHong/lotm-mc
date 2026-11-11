/** Tactical shield thresholds apply to one incoming scripted hit, before armor.
 * Vanilla shields retain their previous scripted-bullet profile; native blocking
 * is still owned by Minecraft. Already attached DOTs are not new shield hits. */
export const CUSTOM_SHIELDS = Object.freeze(['test_gun:riot_shield', 'test_gun:flash_shield']);
export const SHIELD_IDS = Object.freeze(['minecraft:shield', ...CUSTOM_SHIELDS]);
export function shieldProfile(typeId, sneaking = false) {
 if (CUSTOM_SHIELDS.includes(typeId)) return { threshold: sneaking ? 15 : 10, reduction: sneaking ? 0.75 : 0.60 };
 if (typeId === 'minecraft:shield') return { threshold: 0, reduction: sneaking ? 0.85 : 0.70 };
 return null;
}
export function calculateShieldBlock(damage, typeId, sneaking = false) {
 const incoming = Number.isFinite(damage) ? Math.max(0, damage) : 0;
 const profile = shieldProfile(typeId, sneaking);
 const remaining = profile ? Math.max(0, incoming - profile.threshold) * (1 - profile.reduction) : incoming;
 return { damage: remaining, blockedDamage: incoming - remaining, ...(profile || { threshold: 0, reduction: 0 }) };
}
export function isFrontalShieldHit(target, shooter) {
 try {
  if (!shooter?.isValid?.() || shooter.id === target.id || target.dimension.id !== shooter.dimension.id) return false;
  const dx = shooter.location.x - target.location.x, dz = shooter.location.z - target.location.z;
  const length = Math.hypot(dx, dz), view = target.getViewDirection(), facing = Math.hypot(view.x, view.z);
  if (!(Number.isFinite(length) && Number.isFinite(facing)) || facing < 1e-6) return false;
  // Retain the previous horizontal cone boundary, but normalize look pitch so
  // looking almost straight up/down can never accidentally block from behind.
  return length < 0.1 || (dx * view.x + dz * view.z) / (length * facing) > -0.25;
 } catch { return false; }
}
