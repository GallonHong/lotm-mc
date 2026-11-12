import { isCombatExcluded } from "./downedTarget.js";
/**
 * Raid bosses imported from the "Bosses Rise" reference add-on (Block Factory).
 *
 *  - apoc_boss:sandworm     "斯洛克 · 巨型沙虫"   16000 HP, forced 10 armor (weekly: 20000 HP)
 *  - apoc_boss:abomination  "莫加苏尔"           26000 HP, forced 10 armor (weekly: 30000 HP)
 *
 * The reference pack drives every attack from its own bundled script. This module
 * re-implements the two fights on top of the Apocalypse conventions instead:
 * the client-side animation controllers stay untouched and are steered only by
 * the entity properties they already read (bf_bossesrise:state / state_id / ...).
 *
 * Armor note: apoc:armor:N is the total addon-damage armor rating and the shared
 * reader ignores anything above 40. Raid bosses are tuned to N = 10 (≈38% mitigation
 * against armor-aware Guns/SAPI damage); raw HP is scaled up to compensate.
 */
import { world, system } from "@minecraft/server";
import { readMobArmor } from "./mobArmor.js";
import { isPvpArea } from "./pvpIsolation.js";
import { isLiveEntity, isWeeklyBoss, canWeeklyBossTarget, enforceWeeklyArmor } from "./weeklyRaid.js";

const RAID_ARMOR = 10;
const SANDWORM = "apoc_boss:sandworm";
const ABOMINATION = "apoc_boss:abomination";
const RAID_TYPES = new Set([SANDWORM, ABOMINATION]);
const POLL_INTERVAL = 10;
const runtime = new Map();

/* ------------------------------------------------------------------ helpers */
const tick = () => system.currentTick;
const stateOf = entity => {
 let entry = runtime.get(entity.id);
 if (!entry) {
  entry = { initialized: false, busyUntil: 0, nextAttack: 0 };
  runtime.set(entity.id, entry);
  // Restore native AI on ordinary bosses already persisted before component groups.
  if (!isWeeklyBoss(entity)) { try { entity.triggerEvent("apoc_boss:normal_spawn"); } catch {} }
 }
 return entry;
};
const flatDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const setProperty = (entity, key, value) => {
 try { entity.setProperty(key, value); } catch { /* entity may be mid-removal */ }
};
const playSound = (entity, sound, options = {}) => {
 try { entity.dimension.playSound(sound, entity.location, options); } catch {}
};
const spawnParticle = (entity, id, location = null) => {
 try { entity.dimension.spawnParticle(id, location ?? entity.location); } catch {}
};
const spawnParticleAt = (dimension, id, location) => {
 try { dimension.spawnParticle(id, location); } catch {}
};
const healthRatio = entity => {
 try {
  const health = entity.getComponent("minecraft:health");
  if (!health) return 1;
  const current = Number(health.currentValue);
  const max = Number(health.effectiveMax ?? health.defaultValue ?? health.currentValue);
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) return 1;
  return Math.max(0, Math.min(1, current / max));
 } catch { return 1; }
};

function canTarget(entity, player) {
 try {
  return canWeeklyBossTarget(entity, player) && !isCombatExcluded(player) &&
   player.dimension.id === entity.dimension.id;
 } catch { return false; }
}

function playersNear(entity, radius) {
 try {
  return entity.dimension
   .getEntities({ location: entity.location, maxDistance: radius, families: ["player"] })
   .filter(player => canTarget(entity, player));
 } catch { return []; }
}

function nearestPlayer(entity, radius) {
 const players = playersNear(entity, radius);
 if (!players.length) return undefined;
 return players.sort((a, b) => distance(entity.location, a.location) - distance(entity.location, b.location))[0];
}

function hitPlayers(entity, center, radius, amount, options = {}) {
 const { slowTicks = 0, weakTicks = 0, knockUp = 0, knockBack = 0 } = options;
 const dimension = entity.dimension;
 let players = [];
 try {
  players = dimension.getEntities({ location: center, maxDistance: radius, families: ["player"] });
 } catch {}
 for (const player of players) {
  if (!canTarget(entity, player)) continue;
  try { player.applyDamage(amount, { cause: "entityAttack", damagingEntity: entity }); } catch {}
  try { if (slowTicks) player.addEffect("slowness", slowTicks, { amplifier: 1, showParticles: true }); } catch {}
  try { if (weakTicks) player.addEffect("weakness", weakTicks, { amplifier: 1, showParticles: true }); } catch {}
  try { if (knockUp) player.applyKnockback(0, 0, 0.25, knockUp); } catch {}
  try {
   if (knockBack) {
    const dx = player.location.x - center.x;
    const dz = player.location.z - center.z;
    const length = Math.hypot(dx, dz) || 1;
    player.applyKnockback(dx / length * knockBack, dz / length * knockBack, 0.3, 0.4);
   }
  } catch {}
 }
 return players.length;
}

function enforceRaidArmor(entity) {
 if (isWeeklyBoss(entity)) return enforceWeeklyArmor(entity);
 try {
  if (readMobArmor(entity) !== RAID_ARMOR) {
   entity.addTag(`apoc:armor:${RAID_ARMOR}`);
   entity.addTag("apoc:armor_source:raid");
  }
 } catch {}
}

/* -------------------------------------------------- spawn: armor + intro cue */
if (world.afterEvents?.entitySpawn?.subscribe) {
 world.afterEvents.entitySpawn.subscribe(({ entity }) => {
  try {
   if (!RAID_TYPES.has(entity.typeId)) return;
   enforceRaidArmor(entity);
   if (entity.typeId === SANDWORM) {
    setProperty(entity, "bf_bossesrise:is_dormant", false);
    setProperty(entity, SANDWORM_STATE, "intro");
   } else {
    setProperty(entity, "bf_bossesrise:state_id", 0);
   }
  } catch {}
 });
}

if (world.afterEvents?.entityDie?.subscribe) {
 world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
  try {
   if (!RAID_TYPES.has(deadEntity.typeId)) return;
   runtime.delete(deadEntity.id);
   const dimension = deadEntity.dimension;
   const location = deadEntity.location;
   for (let index = 0; index < 6; index++) {
    const offset = { x: location.x + (Math.random() - 0.5) * 4, y: location.y + Math.random() * 2, z: location.z + (Math.random() - 0.5) * 4 };
    spawnParticleAt(dimension, deadEntity.typeId === SANDWORM ? "bf_bossesrise:sand_rock" : "bf_bossesrise:abomination_impact_dust", offset);
   }
   try {
    dimension.playSound(deadEntity.typeId === SANDWORM ? "bf_bossesrise.sandworm.eruption_1" : "bf_bossesrise.abomination_death_1", location, { volume: 3 });
   } catch {}
  } catch {}
 });
}

// Explicit removal (room reset/restart cleanup) does not emit entityDie.
if (world.afterEvents?.entityRemove?.subscribe) {
 world.afterEvents.entityRemove.subscribe(({ removedEntityId }) => runtime.delete(removedEntityId));
}

/* ================================================================ SANDWORM */
const SANDWORM_STATE = "bf_bossesrise:state";

function sandwormIntro(entity, entry) {
 entry.initialized = true;
 setProperty(entity, "bf_bossesrise:is_dormant", false);
 setProperty(entity, SANDWORM_STATE, "intro");
 entry.busyUntil = tick() + 45;
 entry.nextAttack = tick() + 65;
 spawnParticle(entity, "bf_bossesrise:sand_rock");
 playSound(entity, "bf_bossesrise.sandworm.emergence", { volume: 2.5 });
 system.runTimeout(() => {
  if (!isLiveEntity(entity)) return;
  setProperty(entity, SANDWORM_STATE, "emerged");
  playSound(entity, "bf_bossesrise.sandworm.eruption_1", { volume: 2 });
 }, 45);
}

function sandwormEarthquake(entity, entry) {
 const start = tick();
 entry.busyUntil = start + 105;
 entry.nextAttack = start + 135;
 setProperty(entity, SANDWORM_STATE, "roar");
 playSound(entity, "bf_bossesrise.sandworm.charge_start_build_up_roar", { volume: 2, pitch: 0.9 });
 spawnParticle(entity, "bf_bossesrise:sandworm_earthquake_warning");
 system.runTimeout(() => {
  if (!isLiveEntity(entity)) return;
  setProperty(entity, SANDWORM_STATE, "earthquake");
  playSound(entity, "bf_bossesrise.sandworm.eruption_1", { volume: 3 });
  let pulses = 0;
  const interval = system.runInterval(() => {
   if (!isLiveEntity(entity)) { try { system.clearRun(interval); } catch {} return; }
   pulses++;
   const center = entity.location;
   for (let index = 0; index < 8; index++) {
    const angle = (Math.PI * 2 * index) / 8 + pulses * 0.4;
    const radius = 3 + pulses * 1.1;
    spawnParticleAt(entity.dimension, "bf_bossesrise:sand_rock", {
     x: center.x + Math.cos(angle) * radius,
     y: center.y + 0.2,
     z: center.z + Math.sin(angle) * radius,
    });
   }
   spawnParticle(entity, "bf_bossesrise:earthquake_splash");
   hitPlayers(entity, center, 10, 18, { knockUp: 0.9, knockBack: 1.2, slowTicks: 40 });
   playSound(entity, "bf_bossesrise.sandworm.rumble_1", { volume: 1.6, pitch: 0.9 });
   if (pulses >= 6) {
    try { system.clearRun(interval); } catch {}
    if (isLiveEntity(entity)) setProperty(entity, SANDWORM_STATE, "emerged");
   }
  }, 10);
 }, 20);
}

function sandwormDive(entity, target, entry) {
 const start = tick();
 entry.busyUntil = start + 70;
 entry.nextAttack = start + 100;
 const origin = { x: entity.location.x, y: entity.location.y, z: entity.location.z };
 setProperty(entity, SANDWORM_STATE, "dive");
 playSound(entity, "bf_bossesrise.sandworm.dash", { volume: 2.5 });
 spawnParticle(entity, "bf_bossesrise:sandworm_dive1");
 system.runTimeout(() => {
  if (!isLiveEntity(entity)) return;
  spawnParticleAt(entity.dimension, "bf_bossesrise:sandworm_dive1", origin);
  const destination = canTarget(entity, target) ? { ...target.location } : origin;
  try {
   entity.teleport({ x: destination.x, y: destination.y, z: destination.z }, { checkForBlocks: false });
  } catch {}
  spawnParticle(entity, "bf_bossesrise:sandworm_dive2");
  playSound(entity, "bf_bossesrise.sandworm.roar_dive_impact", { volume: 3 });
  system.runTimeout(() => {
   if (!isLiveEntity(entity)) return;
   setProperty(entity, SANDWORM_STATE, "emerged");
   spawnParticle(entity, "bf_bossesrise:earthquake_splash");
   spawnParticle(entity, "bf_bossesrise:knockback_hit");
   hitPlayers(entity, entity.location, 6.5, 26, { knockUp: 1.0, knockBack: 1.4 });
  }, 8);
 }, 16);
}

function sandwormScreech(entity, entry) {
 const start = tick();
 entry.busyUntil = start + 50;
 entry.nextAttack = start + 80;
 setProperty(entity, SANDWORM_STATE, "screech");
 playSound(entity, "bf_bossesrise.sandworm.screech_04", { volume: 3 });
 spawnParticle(entity, "bf_bossesrise:sandworm_earthquake_zone");
 system.runTimeout(() => {
  if (!isLiveEntity(entity)) return;
  hitPlayers(entity, entity.location, 24, 10, { slowTicks: 120, weakTicks: 100, knockBack: 0.6 });
  spawnParticle(entity, "bf_bossesrise:sandworm_vulnerability");
  playSound(entity, "bf_bossesrise.sandworm.sand_explosion_impact", { volume: 2.5 });
 }, 14);
 system.runTimeout(() => {
  if (isLiveEntity(entity)) setProperty(entity, SANDWORM_STATE, "emerged");
 }, 46);
}

function tickSandworm(entity, player, entry) {
 if (!entry.initialized) { sandwormIntro(entity, entry); return; }
 enforceRaidArmor(entity);
 if (tick() < entry.busyUntil) return;
 if (tick() < entry.nextAttack) return;
 const target = nearestPlayer(entity, 48) ?? (canTarget(entity, player) ? player : undefined);
 if (!target) return;
 const range = flatDistance(entity.location, target.location);
 const roll = Math.random();
 if (range <= 8) {
  if (roll < 0.5) sandwormScreech(entity, entry);
  else sandwormEarthquake(entity, entry);
  return;
 }
 if (roll < 0.45) sandwormDive(entity, target, entry);
 else if (roll < 0.8) sandwormEarthquake(entity, entry);
 else sandwormScreech(entity, entry);
}

/* ============================================================= ABOMINATION */
const ABOMINATION_STATES = {
 IDLE: 1,
 WALK: 2,
 LIGHT_ATTACK: 3,
 AREA_ATTACK: 4,
 HEAVY_ATTACK: 5,
 CHARGE_RUN: 6,
 WALL_STUN: 7,
 SCREAM: 8,
 RAMPAGE: 9,
 METEOR: 10,
 GRAB: 12,
 GRAB_IDLE: 13,
 GRAB_SUCCESS: 14,
 GRAB_THROW: 15,
 GRAB_RECOVER: 16,
};

function abominationIntro(entity, entry) {
 entry.initialized = true;
 setProperty(entity, "bf_bossesrise:is_dying", false);
 setProperty(entity, "bf_bossesrise:state_id", 0);
 playSound(entity, "bf_bossesrise.abomination_spawn", { volume: 3 });
 spawnParticle(entity, "bf_bossesrise:abomination_spawn_1");
 entry.busyUntil = tick() + 55;
 entry.nextAttack = tick() + 80;
 system.runTimeout(() => {
  if (isLiveEntity(entity)) setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.IDLE);
 }, 55);
}

function abominationIdleState(entity) {
 let velocity = { x: 0, y: 0, z: 0 };
 try { velocity = entity.getVelocity(); } catch {}
 const moving = Math.hypot(velocity.x, velocity.z) > 0.05;
 setProperty(entity, "bf_bossesrise:is_walking", moving);
 setProperty(entity, "bf_bossesrise:state_id", moving ? ABOMINATION_STATES.WALK : ABOMINATION_STATES.IDLE);
}

function abominationMelee(entity, entry, kind) {
 const start = tick();
 setProperty(entity, "bf_bossesrise:state_id", kind);
 if (kind === ABOMINATION_STATES.HEAVY_ATTACK) {
  entry.busyUntil = start + 45;
  entry.nextAttack = start + 85;
  playSound(entity, "bf_bossesrise.abomination_smash_01", { volume: 2.5 });
  spawnParticle(entity, "bf_bossesrise:abomination_hand_smash");
  system.runTimeout(() => {
   if (!isLiveEntity(entity)) return;
   spawnParticle(entity, "bf_bossesrise:abomination_smash_1");
   spawnParticle(entity, "bf_bossesrise:abomination_impact_dust");
   playSound(entity, "bf_bossesrise.abomination_smash_impact", { volume: 3 });
   hitPlayers(entity, entity.location, 8.5, 40, { knockUp: 1.4, knockBack: 1.3 });
  }, 16);
 } else if (kind === ABOMINATION_STATES.AREA_ATTACK) {
  entry.busyUntil = start + 35;
  entry.nextAttack = start + 75;
  playSound(entity, "bf_bossesrise.abomination_swipe_attack_03", { volume: 2.5 });
  spawnParticle(entity, "bf_bossesrise:abomination_attack");
  system.runTimeout(() => {
   if (!isLiveEntity(entity)) return;
   spawnParticle(entity, "bf_bossesrise:abomination_smash_2");
   hitPlayers(entity, entity.location, 7, 32, { knockBack: 1.0, slowTicks: 60 });
  }, 10);
 } else {
  entry.busyUntil = start + 25;
  entry.nextAttack = start + 65;
  playSound(entity, "bf_bossesrise.abomination_attack_03", { volume: 2 });
  system.runTimeout(() => {
   if (!isLiveEntity(entity)) return;
   hitPlayers(entity, entity.location, 5, 26);
  }, 8);
 }
 system.runTimeout(() => {
  if (isLiveEntity(entity)) setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.IDLE);
 }, entry.busyUntil - tick() + 5);
}

function abominationCharge(entity, entry, target) {
 const start = tick();
 entry.busyUntil = start + 70;
 entry.nextAttack = start + 110;
 setProperty(entity, "bf_bossesrise:is_charging", true);
 setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.CHARGE_RUN);
 playSound(entity, "bf_bossesrise.abomination_scream_01", { volume: 2.5, pitch: 0.8 });
 spawnParticle(entity, "bf_bossesrise:abomination_charge_run");
 let steps = 0;
 const interval = system.runInterval(() => {
  if (!isLiveEntity(entity)) { try { system.clearRun(interval); } catch {} return; }
  steps++;
  const goal = canTarget(entity, target) ? target.location : entity.location;
  const dx = goal.x - entity.location.x;
  const dz = goal.z - entity.location.z;
  const length = Math.hypot(dx, dz) || 1;
  if (length > 2) {
   const step = Math.min(length - 1.5, 1.6);
   const next = { x: entity.location.x + dx / length * step, y: entity.location.y, z: entity.location.z + dz / length * step };
   let blocked = false;
   try {
    const block = entity.dimension.getBlock({ x: Math.floor(next.x), y: Math.floor(next.y + 0.5), z: Math.floor(next.z) });
    blocked = !!block && !block.isAir && !block.isLiquid;
   } catch {}
   if (blocked) {
    try { system.clearRun(interval); } catch {}
    abominationWallStun(entity, entry);
    return;
   }
   try { entity.teleport(next, { checkForBlocks: false }); } catch {}
   spawnParticle(entity, "bf_bossesrise:abomination_charge_run");
   hitPlayers(entity, entity.location, 3.5, 30, { knockBack: 1.6, knockUp: 0.7 });
  }
  if (steps >= 24) {
   try { system.clearRun(interval); } catch {}
   if (isLiveEntity(entity)) {
    setProperty(entity, "bf_bossesrise:is_charging", false);
    setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.IDLE);
   }
  }
 }, 2);
}

function abominationWallStun(entity, entry) {
 entry.busyUntil = tick() + 50;
 entry.nextAttack = tick() + 90;
 setProperty(entity, "bf_bossesrise:is_charging", false);
 setProperty(entity, "bf_bossesrise:is_wall_collision", true);
 setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.WALL_STUN);
 playSound(entity, "bf_bossesrise.abomination_chargeknocked_03", { volume: 3 });
 spawnParticle(entity, "bf_bossesrise:abomination_impact_dust");
 hitPlayers(entity, entity.location, 6, 20, { knockBack: 1.2 });
 system.runTimeout(() => {
  if (!isLiveEntity(entity)) return;
  setProperty(entity, "bf_bossesrise:is_wall_collision", false);
  setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.IDLE);
 }, 45);
}

function abominationScream(entity, entry) {
 const start = tick();
 entry.busyUntil = start + 55;
 entry.nextAttack = start + 95;
 setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.SCREAM);
 playSound(entity, "bf_bossesrise.abomination_scream_01", { volume: 3 });
 spawnParticle(entity, "bf_br:abomination_roar");
 system.runTimeout(() => {
  if (!isLiveEntity(entity)) return;
  spawnParticle(entity, "bf_bossesrise:abomination_scream_1");
  spawnParticle(entity, "bf_bossesrise:abomination_scream_2");
  hitPlayers(entity, entity.location, 20, 22, { slowTicks: 100, weakTicks: 100, knockBack: 1.2 });
 }, 18);
 system.runTimeout(() => {
  if (isLiveEntity(entity)) setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.IDLE);
 }, 50);
}

function abominationMeteors(entity, entry, target) {
 const start = tick();
 entry.busyUntil = start + 100;
 entry.nextAttack = start + 140;
 setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.METEOR);
 playSound(entity, "bf_bossesrise.abomination_rampage_01", { volume: 2.5 });
 for (let index = 0; index < 6; index++) {
  system.runTimeout(() => {
   if (!isLiveEntity(entity)) return;
   const base = canTarget(entity, target) ? target.location : entity.location;
   const location = { x: base.x + (Math.random() - 0.5) * 12, y: base.y, z: base.z + (Math.random() - 0.5) * 12 };
   spawnParticleAt(entity.dimension, "bf_bossesrise:line", { x: location.x, y: location.y + 8, z: location.z });
   spawnParticleAt(entity.dimension, "bf_bossesrise:point", location);
   system.runTimeout(() => {
    if (!isLiveEntity(entity)) return;
    spawnParticleAt(entity.dimension, "bf_bossesrise:abomination_impact_dust_small", location);
    playSound(entity, "bf_bossesrise.abomination_smash_impact", { volume: 2.5, pitch: 0.8 });
    hitPlayers(entity, location, 5, 24, { knockUp: 0.8, knockBack: 0.8 });
   }, 20);
  }, index * 8);
 }
 system.runTimeout(() => {
  if (isLiveEntity(entity)) setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.IDLE);
 }, 95);
}

function abominationRampage(entity, entry) {
 const start = tick();
 entry.busyUntil = start + 90;
 entry.nextAttack = start + 120;
 setProperty(entity, "bf_bossesrise:is_enraged", true);
 setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.RAMPAGE);
 playSound(entity, "bf_bossesrise.abomination_phase_transition", { volume: 3 });
 let pulses = 0;
 const interval = system.runInterval(() => {
  if (!isLiveEntity(entity)) { try { system.clearRun(interval); } catch {} return; }
  pulses++;
  spawnParticle(entity, "bf_br:abomination_circle");
  spawnParticle(entity, "bf_bossesrise:abomination_rampage_1");
  hitPlayers(entity, entity.location, 10, 14, { knockBack: 1.4 });
  if (pulses >= 7) {
   try { system.clearRun(interval); } catch {}
   if (isLiveEntity(entity)) setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.IDLE);
  }
 }, 10);
}

function abominationGrab(entity, entry, target) {
 const start = tick();
 entry.busyUntil = start + 75;
 entry.nextAttack = start + 120;
 setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.GRAB);
 playSound(entity, "bf_bossesrise.abomination_hand_smash_02", { volume: 2.5 });
 system.runTimeout(() => {
  if (!isLiveEntity(entity)) return;
  setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.GRAB_IDLE);
 }, 14);
 system.runTimeout(() => {
  if (!isLiveEntity(entity)) return;
  if (!canTarget(entity, target)) {
   setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.GRAB_RECOVER);
   return;
  }
  setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.GRAB_SUCCESS);
  try { target.applyDamage(34, { cause: "entityAttack", damagingEntity: entity }); } catch {}
  try { target.applyImpulse({ x: 0, y: 1.1, z: 0 }); } catch {}
  playSound(entity, "bf_bossesrise.abomination_d2_scream", { volume: 2.5 });
 }, 28);
 system.runTimeout(() => {
  if (!isLiveEntity(entity)) return;
  if (canTarget(entity, target)) {
   setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.GRAB_THROW);
   try { target.applyDamage(28, { cause: "entityAttack", damagingEntity: entity }); } catch {}
   try {
    const dx = target.location.x - entity.location.x;
    const dz = target.location.z - entity.location.z;
    const length = Math.hypot(dx, dz) || 1;
    target.applyImpulse({ x: dx / length * 2.4, y: 0.8, z: dz / length * 2.4 });
   } catch {}
   playSound(entity, "bf_bossesrise.abomination_d2_throw_air", { volume: 2.5 });
  }
 }, 42);
 system.runTimeout(() => {
  if (isLiveEntity(entity)) setProperty(entity, "bf_bossesrise:state_id", ABOMINATION_STATES.IDLE);
 }, 70);
}

function tickAbomination(entity, player, entry) {
 if (!entry.initialized) { abominationIntro(entity, entry); return; }
 enforceRaidArmor(entity);
 const ratio = healthRatio(entity);
 if (ratio < 0.5) setProperty(entity, "bf_bossesrise:is_enraged", true);
 if (tick() < entry.busyUntil) return;
 const target = nearestPlayer(entity, 56) ?? (canTarget(entity, player) ? player : undefined);
 if (!target) { abominationIdleState(entity); return; }
 const range = flatDistance(entity.location, target.location);
 if (tick() < entry.nextAttack) { abominationIdleState(entity); return; }
 const enraged = ratio < 0.5;
 const roll = Math.random();
 if (enraged && range <= 5 && roll < 0.3) { abominationGrab(entity, entry, target); return; }
 if (enraged && roll < 0.2) { abominationRampage(entity, entry); return; }
 if (range <= 4.5) {
  if (roll < 0.45) abominationMelee(entity, entry, ABOMINATION_STATES.HEAVY_ATTACK);
  else if (roll < 0.8) abominationMelee(entity, entry, ABOMINATION_STATES.AREA_ATTACK);
  else abominationMelee(entity, entry, ABOMINATION_STATES.LIGHT_ATTACK);
  return;
 }
 if (range <= 16) {
  if (roll < 0.7) abominationCharge(entity, entry, target);
  else if (roll < 0.85) abominationMelee(entity, entry, ABOMINATION_STATES.AREA_ATTACK);
  else abominationScream(entity, entry);
  return;
 }
 if (roll < 0.5) abominationMeteors(entity, entry, target);
 else abominationScream(entity, entry);
}

/* ------------------------------------------------- weekly scripted pursuit */
// Native AI is disabled on weekly instances: it cannot compare per-room tags and
// could otherwise melee an outsider. Skills and movement share the same filter.
function followWeeklyTarget(entity, entry) {
 if (!isWeeklyBoss(entity) || tick() < entry.busyUntil) return;
 const target = nearestPlayer(entity, 64);
 if (!target) return;
 const here = entity.location;
 const goal = target.location;
 const range = flatDistance(here, goal);
 if (range <= 4) return;
 const step = Math.min(range - 4, entity.typeId === SANDWORM ? 2.6 : 2.2);
 const next = { x: here.x + (goal.x - here.x) / range * step, y: here.y, z: here.z + (goal.z - here.z) / range * step };
 try {
  const options = { checkForBlocks: true, facingLocation: goal };
  if (typeof entity.tryTeleport === "function") entity.tryTeleport(next, options);
  else entity.teleport(next, options);
 } catch {}
}

/* ------------------------------------------------------------------ driver */
function tickRaidBoss(entity, player) {
 if (!entity || !isLiveEntity(entity)) { runtime.delete(entity?.id); return; }
 if (isPvpArea(entity.dimension.id, entity.location)) return;
 const entry = stateOf(entity);
 if (entry.dead) return;
 enforceRaidArmor(entity);
 followWeeklyTarget(entity, entry);
 try {
  if (entity.typeId === SANDWORM) tickSandworm(entity, player, entry);
  else if (entity.typeId === ABOMINATION) tickAbomination(entity, player, entry);
 } catch {}
}

system.runInterval(() => {
 const seen = new Set();
 for (const player of world.getAllPlayers()) {
  if (!player || !player.isValid() || isCombatExcluded(player)) continue;
  let bosses = [];
  try {
   bosses = player.dimension.getEntities({ location: player.location, maxDistance: 72, families: ["apoc_boss"] });
  } catch { continue; }
  for (const boss of bosses) {
   if (!RAID_TYPES.has(boss.typeId) || seen.has(boss.id)) continue;
   seen.add(boss.id);
   tickRaidBoss(boss, player);
  }
 }
 if (runtime.size > 96) {
  for (const id of runtime.keys()) {
   if (!seen.has(id)) runtime.delete(id);
   if (runtime.size <= 64) break;
  }
 }
}, POLL_INTERVAL);

export { RAID_TYPES, RAID_ARMOR, tickRaidBoss, hitPlayers };
