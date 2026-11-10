/** Cosmetic only. API 1.15-compatible world-space bursts, not client-bone emitters. */
export const JETPACK_VISUALS = Object.freeze({
 pulseStepTicks: 2,
 trailTicks: 6,
 nozzleSide: 3.15 / 16,
 nozzleHeight: 10.61 / 16,
 nozzleBack: 6.125 / 16
});

export function jetpackNozzleLocations(player) {
 // Rotation yaw is well defined even when the player looks straight up/down.
 let yaw;
 try { yaw = player.getRotation().y * Math.PI / 180; } catch {}
 if (!Number.isFinite(yaw)) {
  const view = player.getViewDirection();
  yaw = Math.atan2(-view.x, view.z);
 }
 const forward = { x: -Math.sin(yaw), z: Math.cos(yaw) };
 const right = { x: Math.cos(yaw), z: Math.sin(yaw) };
 const loc = player.location;
 // A conservative crouch adjustment; custom client poses are not observable here.
 const crouch = player.isSneaking ? 0.15 : 0;
 const back = JETPACK_VISUALS.nozzleBack + (player.isSneaking ? 0.06 : 0);
 return [-1, 1].map(sign => ({
  x: loc.x - forward.x * back + right.x * JETPACK_VISUALS.nozzleSide * sign,
  y: loc.y + JETPACK_VISUALS.nozzleHeight - crouch,
  z: loc.z - forward.z * back + right.z * JETPACK_VISUALS.nozzleSide * sign
 }));
}

function emit(player, initial) {
 try {
  for (const location of jetpackNozzleLocations(player)) {
   for (const id of initial
    ? ['test_gun:jetpack_ion', 'test_gun:jetpack_spark', 'test_gun:jetpack_flash', 'test_gun:jetpack_smoke']
    : ['test_gun:jetpack_ion']) {
    // One failed resource cannot suppress the other effect or any gameplay step.
    try { player.dimension.spawnParticle(id, location); } catch {}
   }
  }
 } catch {}
}

export function startJetpackThrustVisuals(player, state, tick) {
 emit(player, true);
 state.jetpackVisual = {
  dimensionId: player.dimension.id,
  endTick: tick + JETPACK_VISUALS.trailTicks,
  nextTick: tick + JETPACK_VISUALS.pulseStepTicks
 };
}

export function updateJetpackThrustVisuals(player, state, tick) {
 const visual = state.jetpackVisual;
 if (!visual) return;
 if (tick > visual.endTick || player.dimension.id !== visual.dimensionId) {
  delete state.jetpackVisual;
  return;
 }
 try {
  const health = player.getComponent('minecraft:health');
  if (health && health.currentValue <= 0) { delete state.jetpackVisual; return; }
 } catch { delete state.jetpackVisual; return; }
 if (tick < visual.nextTick) return;
 emit(player, false);
 // No timer backlog/catch-up bursts after a lag spike.
 visual.nextTick = tick + JETPACK_VISUALS.pulseStepTicks;
}
