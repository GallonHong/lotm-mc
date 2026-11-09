import { system } from "@minecraft/server";

// Visuals only: this module never applies damage or changes weapon cadence.
export class DroneEffects {
 static maxEmittersPerTick = 96;
 static maxEmittersPerDroneTick = 12;
 static maxTracesPerTick = 16;
 static tick = -1;
 static emitted = 0;
 static traced = 0;
 static muzzleCasts = 0;
 static droneBudgets = new WeakMap();
 static missingParticles = new Map();

 static resetBudget() {
  if (this.tick !== system.currentTick) {
   this.tick = system.currentTick;
   this.emitted = 0;
   this.traced = 0;
   this.muzzleCasts = 0;
   this.droneBudgets = new WeakMap();
  }
 }

 static muzzle(entity) {
  // Model units / 16. Existing front locators are used where available;
  // gunless bodies use a small forward-underbody mount, not the entity center.
  const offsets = {
   "makercamp_dr:mining_drone": [3.5 / 16, 1.05 / 16],
   "makercamp_dr:laser_drone": [3.5 / 16, 2.05 / 16],
   "makercamp_dr:ore_finder_drone": [3.5 / 16, 1.05 / 16],
   "makercamp_dr:tnt_launcher_drone": [3.5 / 16, 12.35 / 16],
   "makercamp_dr:summoner_drone": [5.5 / 16, 3.5 / 16],
   "makercamp_dr:inventory_drone": [4 / 16, 2 / 16],
   "makercamp_dr:water_drone": [5.5 / 16, 3 / 16]
  };
  const [forward, up] = offsets[entity.typeId] || [0.36, 0.18];
  const rotation = entity.getRotation();
  const yaw = rotation.y * Math.PI / 180, pitch = rotation.x * Math.PI / 180;
  const horizontal = forward * Math.cos(pitch) + up * Math.sin(pitch);
  const position = {
   x: entity.location.x - Math.sin(yaw) * horizontal,
   y: entity.location.y + up * Math.cos(pitch) - forward * Math.sin(pitch),
   z: entity.location.z + Math.cos(yaw) * horizontal
  };
  const anchor = { x: entity.location.x, y: entity.location.y + up, z: entity.location.z };
  const delta = { x: position.x - anchor.x, y: position.y - anchor.y, z: position.z - anchor.z };
  const length = Math.hypot(delta.x, delta.y, delta.z);
  this.resetBudget();
  if (length < 0.001 || this.muzzleCasts >= this.maxTracesPerTick) return anchor;
  this.muzzleCasts++;
  try {
   const direction = { x: delta.x / length, y: delta.y / length, z: delta.z / length };
   const block = entity.dimension.getBlockFromRay(anchor, direction, { maxDistance: length, includeLiquidBlocks: false, includePassableBlocks: false });
   if (block) {
    const p = block.block.location, f = block.faceLocation;
    const distance = Math.max(0, Math.min(length, Math.hypot(p.x + f.x - anchor.x, p.y + f.y - anchor.y, p.z + f.z - anchor.z) - 0.025));
    return { x: anchor.x + direction.x * distance, y: anchor.y + direction.y * distance, z: anchor.z + direction.z * distance };
   }
  } catch { return anchor; }
  return position;
 }

 static emit(dimension, id, position, budget) {
  if (this.emitted >= this.maxEmittersPerTick || budget.count >= this.maxEmittersPerDroneTick) return;
  // Failed attempts also consume budget. No bursty vanilla fallback: Life ships
  // its own single-particle effects and does not require Test Guns resources.
  if ((this.missingParticles.get(id) ?? -1) > system.currentTick) return;
  this.emitted++;
  budget.count++;
  try { dimension.spawnParticle(id, position); }
  catch { this.missingParticles.set(id, system.currentTick + 200); }
 }

 static flights = [];
 static maxFlights = 16;
 static flightLoop = false;

 static budgetFor(drone) {
  this.resetBudget();
  let budget = this.droneBudgets.get(drone);
  if (!budget) { budget = { count: 0, muzzle: false }; this.droneBudgets.set(drone, budget); }
  return budget;
 }

 // The current combat skill already applies instant damage. These six visual
 // frames are NOT projectile entities, damage delays, homing AI, or splash damage.
 static skill(dimension, start, end, drone, skillId) {
  if (skillId !== "grenade_shot" && skillId !== "micro_missiles") {
   this.trace(dimension, start, end, drone);
   return;
  }
  if (this.flights.length >= this.maxFlights || !Object.values(start).every(Number.isFinite) || !Object.values(end).every(Number.isFinite)) return;
  const distance = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
  if (distance < 0.05 || distance > 48) return;
  const budget = this.budgetFor(drone);
  if (!budget.muzzle) { this.emit(dimension, "ab_dr:muzzle_flash", start, budget); budget.muzzle = true; }
  try { dimension.playSound("makercamp_dr.drone.heavy_shoot", start, { volume: 0.45, pitch: skillId === "grenade_shot" ? 0.8 : 1.25 }); } catch {}
  this.flights.push({ dimension, start: { ...start }, end: { ...end }, previous: { ...start }, drone, skillId, frame: 0, createdTick: system.currentTick });
  if (!this.flightLoop) {
   this.flightLoop = true;
   system.runInterval(() => this.updateFlights(), 1);
  }
 }

 static updateFlights() {
  this.resetBudget();
  const remaining = [];
  for (const flight of this.flights) {
   try {
    const { dimension, drone } = flight;
    if (!drone.entity?.isValid() || !drone.player?.isValid() || drone.entity.dimension.id !== dimension.id || system.currentTick - flight.createdTick > 20) continue;
    if (this.traced >= this.maxTracesPerTick) { remaining.push(flight); continue; }
    this.traced++;
    flight.frame++;
    const t = flight.frame / 6;
    const point = {
     x: flight.start.x + (flight.end.x - flight.start.x) * t,
     y: flight.start.y + (flight.end.y - flight.start.y) * t + Math.sin(Math.PI * t) * (flight.skillId === "grenade_shot" ? 1.2 : 0.25),
     z: flight.start.z + (flight.end.z - flight.start.z) * t
    };
    const previous = flight.previous;
    const delta = { x: point.x - previous.x, y: point.y - previous.y, z: point.z - previous.z };
    const length = Math.hypot(delta.x, delta.y, delta.z);
    let stop = length, collided = false;
    if (length > 0.001) {
     const direction = { x: delta.x / length, y: delta.y / length, z: delta.z / length };
     const block = dimension.getBlockFromRay(previous, direction, { maxDistance: length, includeLiquidBlocks: false, includePassableBlocks: false });
     if (block) {
      const p = block.block.location, f = block.faceLocation;
      const distance = Math.hypot(p.x + f.x - previous.x, p.y + f.y - previous.y, p.z + f.z - previous.z);
      if (Number.isFinite(distance) && distance <= stop) { stop = distance; collided = true; }
     }
     for (const hit of dimension.getEntitiesFromRay(previous, direction, { maxDistance: length })) {
      if (hit.entity.id !== drone.entity.id && hit.entity.id !== drone.player.id && Number.isFinite(hit.distance) && hit.distance >= 0 && hit.distance <= stop) { stop = hit.distance; collided = true; }
     }
     if (collided) {
      point.x = previous.x + direction.x * Math.max(0, stop - 0.02);
      point.y = previous.y + direction.y * Math.max(0, stop - 0.02);
      point.z = previous.z + direction.z * Math.max(0, stop - 0.02);
     }
    }
    const budget = this.budgetFor(drone);
    this.emit(dimension, flight.skillId === "grenade_shot" ? "ab_dr:grenade_glint" : "ab_dr:missile_glow", point, budget);
    this.emit(dimension, "ab_dr:smoke_puff", previous, budget);
    if (collided || flight.frame >= 6) {
     // The final endpoint is from a successful instant skill hit, never an
     // arbitrary air shot. Collisions end the VISUAL early without new damage.
     this.emit(dimension, "ab_dr:blast_flash", point, budget);
     for (const offset of [-0.12, 0, 0.12]) this.emit(dimension, "ab_dr:smoke_puff", { x: point.x + offset, y: point.y + 0.12, z: point.z }, budget);
     try { dimension.playSound("random.explode", point, { volume: 0.4, pitch: 1.3 }); } catch {}
    } else {
     flight.previous = point;
     remaining.push(flight);
    }
   } catch {
    // Invalid entity / unloaded chunk: drop only this visual, not gameplay.
   }
  }
  this.flights = remaining;
 }

 static trace(dimension, start, requestedEnd, drone) {
  this.resetBudget();
  if (!drone || this.emitted >= this.maxEmittersPerTick || this.traced >= this.maxTracesPerTick) return;
  let budget = this.droneBudgets.get(drone);
  if (!budget) { budget = { count: 0, muzzle: false }; this.droneBudgets.set(drone, budget); }
  if (budget.count >= this.maxEmittersPerDroneTick) return;
  const dx = requestedEnd.x - start.x, dy = requestedEnd.y - start.y, dz = requestedEnd.z - start.z;
  const distance = Math.hypot(dx, dy, dz);
  if (!Number.isFinite(distance) || distance < 0.05) return;
  const length = Math.min(distance, 48);
  const direction = { x: dx / distance, y: dy / distance, z: dz / distance };
  let stop = length, impact = false;
  this.traced++;
  try {
   const block = dimension.getBlockFromRay(start, direction, { maxDistance: length + 0.01, includeLiquidBlocks: false, includePassableBlocks: false });
   if (block) {
    const p = block.block.location, f = block.faceLocation;
    const d = Math.hypot(p.x + f.x - start.x, p.y + f.y - start.y, p.z + f.z - start.z);
    if (Number.isFinite(d) && d <= stop + 0.01) { stop = Math.min(stop, d); impact = true; }
   }
   const hits = dimension.getEntitiesFromRay(start, direction, { maxDistance: length + 0.01 });
   for (const hit of hits) {
    if (hit.entity.id === drone.entity?.id || hit.entity.id === drone.player?.id) continue;
    if (Number.isFinite(hit.distance) && hit.distance >= 0 && hit.distance <= stop) { stop = hit.distance; impact = true; }
   }
  } catch {
   // Unloaded chunk or unavailable raycast: no invented tracer/impact through it.
   return;
  }
  const at = distance => ({ x: start.x + direction.x * distance, y: start.y + direction.y * distance, z: start.z + direction.z * distance });
  if (!budget.muzzle) {
   this.emit(dimension, "ab_dr:muzzle_flash", start, budget);
   budget.muzzle = true;
  }
  // A short 2.5m luminous streak, not a persistent 32m laser or 45 particles.
  // Deterministic phase varies the streak along consecutive instant-hit shots.
  const tailLength = Math.min(2.5, Math.max(0, stop - 0.1));
  const phase = ((system.currentTick * 7) % 17) / 17;
  const tailStart = Math.max(0.08, (stop - tailLength) * (0.2 + phase * 0.7));
  const steps = Math.min(6, Math.ceil(tailLength / 0.45));
  for (let i = 0; i < steps; i++) {
   const d = tailStart + tailLength * (i + 1) / Math.max(1, steps);
   if (d < stop - 0.02) this.emit(dimension, "ab_dr:tracer_glint", at(d), budget);
  }
  if (impact) this.emit(dimension, "ab_dr:impact_spark", at(Math.max(0, stop - 0.015)), budget);
 }
}
