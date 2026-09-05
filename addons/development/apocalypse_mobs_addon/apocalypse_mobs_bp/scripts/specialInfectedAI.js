import { world, system, EntityDamageCause } from "@minecraft/server";
import { CONFIG, ZONE_DIFFICULTY } from "./config.js";
import { ZoneRegistry } from "./zones.js";
import { SpawnDirector } from "./spawnDirector.js";
import { valid, findTarget, vector, face, telegraph, isFlashDisabled } from "./combatAI.js";

const states = new Map();
const buildStates = new Map();

function stateOf(entity) { return states.get(entity.id) || { phase: "idle", nextTick: 0 }; }
function setState(entity, state) { states.set(entity.id, state); }
function zoneType(entity) {
  try {
    if (entity.hasTag("apoc_zone_extraction")) return "extraction";
    if (entity.hasTag("apoc_zone_outlaw")) return "outlaw";
  } catch {}
  return "law";
}
function damage(entity, target, amount) {
  const multiplier = ZONE_DIFFICULTY[zoneType(entity)]?.skillDamageMultiplier || 1;
  try { target.applyDamage(amount * multiplier, { cause: EntityDamageCause.entityAttack, damagingEntity: entity }); } catch {}
}
function warn(entity, sound = "mob.zombie.say") {
  telegraph(entity, "warning");
  try { entity.dimension.playSound(sound, entity.location, { volume: 1.4, pitch: 0.65 }); } catch {}
}
function nearbyEventCount(entity) {
  try { return entity.dimension.getEntities({ location: entity.location, maxDistance: 32, tags: ["apoc_hostile"] }).length; }
  catch { return 99; }
}
function summon(entity, count, tag) {
  if (nearbyEventCount(entity) >= 24) return;
  const pool = zoneType(entity) === "extraction"
    ? ["runner", "runner", "spitter", "charger", "hunter"]
    : ["basic", "basic", "runner", "spitter"];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const location = SpawnDirector.findGround(entity.dimension, entity.location, 4, 9);
    if (!location) continue;
    SpawnDirector.spawnAt(entity.dimension, location, pool[Math.floor(Math.random() * pool.length)], [tag], zoneType(entity));
  }
}

function tickShrieker(entity, now) {
  const state = stateOf(entity);
  if (now < state.nextTick) return;
  const target = findTarget(entity, 24);
  if (!target) return setState(entity, { phase: "idle", nextTick: now + 20 });
  face(entity, target.location);
  if (state.phase !== "scream") {
    warn(entity, "mob.warden.roar");
    try { target.sendMessage("§c尖啸者正在长声蓄力呼叫尸群——尽快集火打断！"); } catch {}
    return setState(entity, { phase: "scream", nextTick: now + 70 });
  }

  // 附近丧尸数量上限防护：若 16 格内已有 5 只以上感染者，不再继续暴兵
  try {
    const nearbyInfected = entity.dimension.getEntities({
      location: entity.location,
      maxDistance: 16,
      tags: ["apoc_hostile"]
    });
    if (nearbyInfected.length < 5) {
      summon(entity, zoneType(entity) === "law" ? 2 : 3, "apoc_shrieker_reinforcement");
    }
  } catch {
    summon(entity, 2, "apoc_shrieker_reinforcement");
  }

  // 冷却延长至 36 秒 (720 ticks)
  setState(entity, { phase: "cooldown", nextTick: now + 720 });
}

function tickCharger(entity, now) {
  const state = stateOf(entity);
  if (state.phase === "charge") {
    if (now >= state.endTick) return setState(entity, { phase: "cooldown", nextTick: now + 100 });
    try { entity.applyImpulse({ x: state.direction.x * 0.42, y: 0.02, z: state.direction.z * 0.42 }); } catch {}
    const target = findTarget(entity, 2.3);
    if (target && target.id !== state.hitId) {
      damage(entity, target, 8);
      try { target.applyKnockback(state.direction.x, state.direction.z, 2.4, 0.25); } catch {}
      setState(entity, { ...state, hitId: target.id });
    }
    return;
  }
  if (now < state.nextTick) return;
  const target = findTarget(entity, 20);
  if (!target) return setState(entity, { phase: "idle", nextTick: now + 12 });
  if (state.phase !== "windup") {
    face(entity, target.location); warn(entity, "mob.ravager.roar");
    try { target.sendMessage("§6冲锋者俯身蓄力——离开它的直线！"); } catch {}
    return setState(entity, { phase: "windup", targetId: target.id, nextTick: now + 24 });
  }
  const direction = vector(entity.location, target.location);
  setState(entity, { phase: "charge", direction, endTick: now + 22, hitId: "" });
}

function tickHunter(entity, now) {
  const state = stateOf(entity);
  if (now < state.nextTick) return;
  const target = findTarget(entity, 16);
  if (!target) return setState(entity, { phase: "idle", nextTick: now + 12 });
  if (state.phase !== "windup") {
    face(entity, target.location); warn(entity, "mob.cat.hiss");
    try { target.sendMessage("§e猎手正在蓄力扑击！"); } catch {}
    return setState(entity, { phase: "windup", targetId: target.id, nextTick: now + 18 });
  }
  const direction = vector(entity.location, target.location);
  try { entity.applyImpulse({ x: direction.x * 0.95, y: 0.48, z: direction.z * 0.95 }); } catch {}
  system.runTimeout(() => {
    if (!valid(entity)) return;
    const victim = findTarget(entity, 2.8);
    if (victim) damage(entity, victim, 7);
  }, 8);
  setState(entity, { phase: "cooldown", nextTick: now + 90 });
}

function tickTyrant(entity, now) {
  const state = stateOf(entity);
  if (now < state.nextTick) return;
  const target = findTarget(entity, 14);
  if (!target) return setState(entity, { phase: "idle", nextTick: now + 16 });
  if (state.phase !== "slam") {
    warn(entity, "mob.ravager.roar");
    return setState(entity, { phase: "slam", nextTick: now + 30 });
  }
  try { entity.dimension.spawnParticle("minecraft:large_explosion", entity.location); } catch {}
  for (const player of entity.dimension.getPlayers({ location: entity.location, maxDistance: 6 })) damage(entity, player, 12);
  setState(entity, { phase: "cooldown", nextTick: now + 120 });
}

function tickBroodmother(entity, now) {
  const state = stateOf(entity);
  if (now < state.nextTick) return;
  const target = findTarget(entity, 32);
  if (!target) return setState(entity, { phase: "idle", nextTick: now + 20 });
  if (state.phase !== "summon") {
    warn(entity, "mob.enderdragon.growl");
    try { target.sendMessage("§4召唤母体正在孕育尸潮——立即集火！"); } catch {}
    return setState(entity, { phase: "summon", nextTick: now + 50 });
  }
  summon(entity, 6, "apoc_broodmother_spawn");
  setState(entity, { phase: "cooldown", nextTick: now + 220 });
}

function tryBuild(entity, now) {
  if (!valid(entity) || entity.dimension.id !== CONFIG.overworld || !String(entity.typeId).startsWith("apoc:infected_")) return;
  let zone;
  try { zone = ZoneRegistry.resolve(entity.dimension.id, entity.location); } catch { return; }
  if (zone.type !== "outlaw") return;
  const state = buildStates.get(entity.id) || { nextTick: 0, placed: 0 };
  if (now < state.nextTick || state.placed >= CONFIG.builderMaxBlocksPerMob) return;
  const target = findTarget(entity, 16);
  if (!target || target.location.y < entity.location.y + 1.2) return;
  const dir = vector(entity.location, target.location);
  const position = {
    x: Math.floor(entity.location.x + dir.x * 1.2),
    y: Math.floor(entity.location.y - 0.1),
    z: Math.floor(entity.location.z + dir.z * 1.2)
  };
  try {
    const block = entity.dimension.getBlock(position);
    if (!block?.isAir) return;
    block.setType("minecraft:cobblestone");
    buildStates.set(entity.id, { nextTick: now + CONFIG.builderCooldownTicks, placed: state.placed + 1 });
  } catch {}
}

export class SpecialInfectedAI {
  static tick() {
    const now = system.currentTick;
    const dimensions = new Map();
    for (const player of world.getAllPlayers()) try { dimensions.set(player.dimension.id, player.dimension); } catch {}
    const handlers = {
      "apoc:infected_shrieker": tickShrieker,
      "apoc:infected_charger": tickCharger,
      "apoc:infected_hunter": tickHunter,
      "apoc:infected_tyrant": tickTyrant,
      "apoc:infected_broodmother": tickBroodmother
    };
    for (const dimension of dimensions.values()) {
      for (const [typeId, handler] of Object.entries(handlers)) {
        for (const entity of dimension.getEntities({ type: typeId })) {
          if (!valid(entity)) continue;
          if (isFlashDisabled(entity)) {
            setState(entity, { phase: "stunned", nextTick: now + 12 });
            continue;
          }
          handler(entity, now);
        }
      }
      if (now % CONFIG.builderCheckInterval === 0) {
        for (const entity of dimension.getEntities({ tags: ["apoc_hostile"] })) tryBuild(entity, now);
      }
    }
    if (now % 600 === 0) {
      for (const [id, state] of states) if (now - Number(state.nextTick || 0) > 2400) states.delete(id);
      for (const [id, state] of buildStates) if (now - Number(state.nextTick || 0) > 2400) buildStates.delete(id);
    }
  }
}
