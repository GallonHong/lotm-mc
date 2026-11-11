import { RAIL } from './utils/railRules.js';
import { getMuzzle } from './utils/muzzleUtils.js';
import { MolangVariableMap } from '@minecraft/server';

// Short, finite mechanical samples: cancel/release never leaves a looping sound.
// Feedback is cosmetic and each emitter is isolated from the damage state machine.
function particle(dimension, id, location, variables) {
 try { dimension.spawnParticle(id, location, variables); } catch {}
}
function blastVariables(radius) {
 try { const vars=new MolangVariableMap();vars.setFloat('variable.rail_radius',radius);return vars; } catch { return undefined; }
}
function sound(player, id, location, volume, pitch = 1) {
 try { player.dimension.playSound(id, location, { volume, pitch }); } catch {}
}
function muzzle(player, gun) {
 try { return getMuzzle(player, gun).location; } catch { return player.location; }
}

export const RailFeedback = {
 begin(player, gun) {
  const location = muzzle(player, gun);
  sound(player, 'test_gun.liegui_charge_start', location, 1.0);
  particle(player.dimension, 'test_gun:liegui_charge', location);
 },
 charge(player, gun, ticks) {
  // Pulses accelerate from a slow ratchet to a loaded pressure mechanism.
  const interval = ticks >= RAIL.fullCharge ? 3 : ticks >= RAIL.midCharge ? 4 : 6;
  const pulse = ticks > 0 && ticks % interval === 0;
  const stage = [RAIL.minCharge, RAIL.midCharge, RAIL.fullCharge].includes(ticks);
  if (!pulse && !stage && ticks % 4 !== 0) return;
  const location = muzzle(player, gun);
  if (pulse && !stage) sound(player, 'test_gun.liegui_charge_pulse', location,
   0.7 + Math.min(ticks / RAIL.fullCharge, 1) * 0.3,
   0.8 + Math.min(ticks / RAIL.fullCharge, 1) * 0.4);
  if (stage) sound(player, ticks === RAIL.fullCharge ? 'test_gun.liegui_charge_ready' : 'test_gun.liegui_charge_latch', location, 1.1,
   ticks === RAIL.midCharge ? 1.15 : 1);
  // Server-side fallback remains visible if the owner-variable animation is absent.
  // The primary first-person sparks stay attached to the real charge/vent locators.
  if (ticks % 4 === 0 || stage) particle(player.dimension, 'test_gun:liegui_charge', location);
 },
 fire(player, location) {
  particle(player.dimension, 'test_gun:liegui_muzzle', location);
  particle(player.dimension, 'minecraft:basic_flame_particle', location);
  particle(player.dimension, 'test_gun:liegui_smoke', location);
 },
 trail(dimension, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
  const length = Math.hypot(dx, dy, dz);
  if (!Number.isFinite(length) || length < 0.001) return;
  // Like the M79/MGL's hot projectile, with short smoke rather than a laser beam.
  // Sample only the collision-clipped segment, never the intended point beyond it.
  const count = Math.min(6, Math.max(1, Math.ceil(length / 0.5)));
  for (let i = 1; i <= count; i++) {
   const t = i / count;
   particle(dimension, 'test_gun:liegui_tracer', { x: start.x + dx*t, y: start.y + dy*t, z: start.z + dz*t });
  }
  particle(dimension, 'test_gun:liegui_smoke', end);
 },
 impact(dimension, location, {surface=false,radius=3.5,slow=false}={}) {
  if(!location||!['x','y','z'].every(axis=>Number.isFinite(location[axis])))return;
  // Finite local emitters only: no createExplosion, block edits or native fire.
  // Use the collision-clipped point, already just outside the struck surface.
  const r=Math.max(0.5,Math.min(8,Number(radius)||3.5)),vars=blastVariables(r);
  particle(dimension, 'test_gun:liegui_blast', location,vars);
  // A true spherical shell shows upper/lower volume even on an entity impact.
  // The ground ring remains a surface cue, never the damage geometry.
  particle(dimension, 'test_gun:liegui_blast_shell', location,vars);
  particle(dimension, 'test_gun:liegui_shockwave', location,vars);
  particle(dimension, 'test_gun:liegui_blast_sparks', location,vars);
  particle(dimension, 'test_gun:liegui_blast_plume', location,vars);
  if(slow)particle(dimension,'test_gun:liegui_slow_ring',location,vars);
  // M79/MGL use this built-in emitter too. Keep a visible explosion even if
  // the client's custom rail particles fail to load; each emitter is isolated.
  particle(dimension, 'minecraft:huge_explosion_emitter', location);
  if(surface){
   // A finite ring of embers shows the actual blast footprint on landing.
   for(let i=0;i<24;i++){
    const angle=i*Math.PI/12;
    particle(dimension,'test_gun:liegui_ground_spark',{x:location.x+Math.cos(angle)*r,y:location.y+.06,z:location.z+Math.sin(angle)*r});
   }
  }
  particle(dimension, 'test_gun:liegui_impact', location);
  particle(dimension, 'test_gun:liegui_dust', location);
  particle(dimension, 'test_gun:liegui_smoke', location);
  try { dimension.playSound('random.explode', location, { volume:1.5, pitch:0.85 }); } catch {}
 },
 skillWave(dimension,location) {
  // A broad, finite sonic shock ring rather than a line of tiny hit sparks.
  particle(dimension,'test_gun:liegui_sonic_ring',location,blastVariables(RAIL.skillRadius));
  particle(dimension,'test_gun:liegui_impact',location);
 },
 vent(player, location) {
  particle(player.dimension, 'test_gun:liegui_vent', location);
  sound(player, 'test_gun.liegui_vent', location, 1.0);
 }
};
