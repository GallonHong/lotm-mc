import { world, system, EntityDamageCause } from "@minecraft/server";
import { NPC_WEAPONS } from "./config.js";
import { ZoneRegistry } from "./zones.js";

function valid(entity) {
  try { return !!entity && entity.isValid(); } catch { return false; }
}

function head(entity, offset = 1.5) {
  try { return entity.getHeadLocation(); } catch {
    return { x: entity.location.x, y: entity.location.y + offset, z: entity.location.z };
  }
}

function vector(from, to) {
  const x = to.x - from.x, y = to.y - from.y, z = to.z - from.z;
  const distance = Math.hypot(x, y, z) || 0.001;
  return { x: x / distance, y: y / distance, z: z / distance, distance };
}

function isSoftBlock(block) {
  if (!block) return true;
  const id = String(block.typeId || "");
  return block.isAir === true || id === "minecraft:air" || id === "minecraft:cave_air" ||
    id.includes("water") || id.includes("tallgrass") || id.includes("short_grass") ||
    id.includes("flower") || id.includes("snow_layer") || id.includes("vine");
}

function hasLineOfSight(dimension, from, to) {
  const direction = vector(from, to);
  const steps = Math.max(1, Math.floor(direction.distance * 2));
  for (let step = 2; step < steps - 1; step++) {
    const distance = step * 0.5;
    try {
      const block = dimension.getBlock({
        x: Math.floor(from.x + direction.x * distance),
        y: Math.floor(from.y + direction.y * distance),
        z: Math.floor(from.z + direction.z * distance)
      });
      if (!isSoftBlock(block)) return false;
    } catch { return false; }
  }
  return true;
}

function getEffect(entity, id) {
  try { return entity.getEffect(id) || entity.getEffect(`minecraft:${id}`); } catch { return undefined; }
}

export function isFlashDisabled(entity) {
  const blindness = getEffect(entity, "blindness");
  const darkness = getEffect(entity, "darkness");
  const slowness = getEffect(entity, "slowness");
  const weakness = getEffect(entity, "weakness");
  return !!blindness || !!darkness || Number(slowness?.amplifier || 0) >= 10 || Number(weakness?.amplifier || 0) >= 10;
}

function findTarget(entity, maxDistance) {
  const players = entity.dimension.getPlayers({ location: entity.location, maxDistance });
  let target = null;
  let best = Infinity;
  for (const player of players) {
    try {
      const mode = String(player.getGameMode()).toLowerCase();
      if (mode === "creative" || mode === "spectator") continue;
    } catch {}
    if (ZoneRegistry.isSafe(player.dimension.id, player.location)) continue;
    const distance = vector(entity.location, player.location).distance;
    if (distance < best) { target = player; best = distance; }
  }
  return target;
}

function face(entity, location) {
  try { entity.lookAt(location); return; } catch {}
  try {
    const dir = vector(entity.location, location);
    entity.setRotation({ x: -Math.asin(dir.y) * 180 / Math.PI, y: Math.atan2(-dir.x, dir.z) * 180 / Math.PI });
  } catch {}
}

function telegraph(entity, color = "acid") {
  const loc = head(entity);
  try {
    entity.dimension.spawnParticle(color === "acid" ? "minecraft:crop_growth_emitter" : "minecraft:critical_hit_emitter", loc);
  } catch {}
}

export class CombatAI {
  static raiders = new Map();
  static spitters = new Map();

  static resetDisabled(entity, map) {
    const previous = map.get(entity.id) || {};
    map.set(entity.id, { ...previous, state: "stunned", nextTick: system.currentTick + 8, burstLeft: 0 });
    if (system.currentTick % 8 === 0) telegraph(entity, "stun");
  }

  static tick() {
    let dimension;
    try { dimension = world.getDimension("overworld"); } catch { return; }
    for (const entity of dimension.getEntities({ type: "apoc:infected_spitter" })) this.tickSpitter(entity);
    for (const entity of dimension.getEntities({ type: "apoc:raider_rifleman" })) this.tickRaider(entity);
    if (system.currentTick % 200 === 0) this.prune();
  }

  static tickSpitter(entity) {
    if (!valid(entity)) return;
    if (isFlashDisabled(entity)) return this.resetDisabled(entity, this.spitters);
    const now = system.currentTick;
    const state = this.spitters.get(entity.id) || { state: "search", nextTick: now };
    if (now < state.nextTick) return;
    const target = findTarget(entity, 22);
    if (!target) {
      this.spitters.set(entity.id, { state: "search", nextTick: now + 12 });
      return;
    }
    const origin = head(entity);
    const targetHead = head(target, 1.4);
    const shot = vector(origin, targetHead);
    if (shot.distance < 7 || !hasLineOfSight(entity.dimension, origin, targetHead)) {
      this.spitters.set(entity.id, { state: "search", nextTick: now + 10 });
      return;
    }
    face(entity, targetHead);
    if (state.state !== "aim") {
      telegraph(entity);
      try { entity.dimension.playSound("mob.slime.squish", entity.location, { volume: 1.2, pitch: 0.6 }); } catch {}
      this.spitters.set(entity.id, { state: "aim", targetId: target.id, nextTick: now + 30 });
      return;
    }
    if (state.targetId !== target.id || !hasLineOfSight(entity.dimension, origin, targetHead)) {
      this.spitters.set(entity.id, { state: "search", nextTick: now + 10 });
      return;
    }
    this.fireSpit(entity, shot);
    this.spitters.set(entity.id, { state: "cooldown", nextTick: now + 55 + Math.floor(Math.random() * 25) });
  }

  static fireSpit(entity, direction) {
    const origin = head(entity);
    const spawn = { x: origin.x + direction.x * 0.8, y: origin.y + direction.y * 0.8, z: origin.z + direction.z * 0.8 };
    try {
      const projectile = entity.dimension.spawnEntity("apoc:toxic_spit", spawn);
      const component = projectile.getComponent("minecraft:projectile");
      if (component) {
        try { component.owner = entity; } catch {}
        component.shoot({ x: direction.x * 1.15, y: direction.y * 1.15, z: direction.z * 1.15 });
      } else projectile.applyImpulse({ x: direction.x * 1.15, y: direction.y * 1.15, z: direction.z * 1.15 });
      entity.dimension.playSound("mob.llama.spit", origin, { volume: 1.3, pitch: 0.7 });
    } catch (error) {
      console.warn(`[Apocalypse][AI] 毒液投射失败: ${error}`);
    }
  }

  static tickRaider(entity) {
    if (!valid(entity)) return;
    if (isFlashDisabled(entity)) return this.resetDisabled(entity, this.raiders);
    const profile = NPC_WEAPONS.raider_rifle;
    const now = system.currentTick;
    const state = this.raiders.get(entity.id) || { state: "patrol", nextTick: now, ammo: profile.magazine, burstLeft: 0 };
    if (now < state.nextTick) return;
    const target = findTarget(entity, profile.maxRange);
    if (!target) {
      this.raiders.set(entity.id, { ...state, state: "patrol", nextTick: now + 10, burstLeft: 0 });
      return;
    }
    const origin = head(entity);
    const targetHead = head(target, 1.45);
    const shot = vector(origin, targetHead);
    face(entity, targetHead);
    if (shot.distance < profile.minRange || !hasLineOfSight(entity.dimension, origin, targetHead)) {
      this.raiders.set(entity.id, { ...state, state: "reposition", nextTick: now + 10, burstLeft: 0 });
      return;
    }
    if (state.ammo <= 0) {
      if (state.state !== "reload") {
        try { entity.dimension.playSound("random.click", origin, { volume: 0.8, pitch: 0.8 }); } catch {}
        this.raiders.set(entity.id, { ...state, state: "reload", nextTick: now + profile.reloadTicks, burstLeft: 0 });
      } else {
        this.raiders.set(entity.id, { state: "aim", nextTick: now + profile.aimTicks, ammo: profile.magazine, burstLeft: 0, targetId: target.id });
      }
      return;
    }
    if (state.state !== "burst" || state.burstLeft <= 0 || state.targetId !== target.id) {
      telegraph(entity, "aim");
      this.raiders.set(entity.id, { ...state, state: "burst", targetId: target.id, burstLeft: profile.burst, nextTick: now + profile.aimTicks });
      return;
    }
    this.fireRaiderShot(entity, target, origin, targetHead, shot.distance, profile);
    const left = state.burstLeft - 1;
    this.raiders.set(entity.id, {
      ...state,
      state: left > 0 ? "burst" : "cooldown",
      burstLeft: left,
      ammo: state.ammo - 1,
      nextTick: now + (left > 0 ? profile.burstInterval : profile.cooldown)
    });
  }

  static fireRaiderShot(entity, target, origin, targetHead, distance, profile) {
    const distancePenalty = Math.max(0, (distance - 15) / 45);
    const hitChance = Math.max(0.22, profile.accuracy - distancePenalty);
    try {
      entity.dimension.spawnParticle("minecraft:basic_flame_particle", { x: origin.x, y: origin.y, z: origin.z });
      entity.dimension.playSound("random.explode", origin, { volume: 0.35, pitch: 1.8 });
    } catch {}
    if (Math.random() >= hitChance || !hasLineOfSight(entity.dimension, origin, targetHead)) return;
    try {
      target.applyDamage(profile.damage, { cause: EntityDamageCause.projectile, damagingEntity: entity });
      entity.dimension.spawnParticle("minecraft:critical_hit_emitter", targetHead);
    } catch {}
  }

  static prune() {
    for (const [id, state] of this.raiders) if (system.currentTick - Number(state.nextTick || 0) > 1200) this.raiders.delete(id);
    for (const [id, state] of this.spitters) if (system.currentTick - Number(state.nextTick || 0) > 1200) this.spitters.delete(id);
  }
}

