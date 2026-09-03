import { world, system, EntityDamageCause, ItemStack } from "@minecraft/server";
import { NPC_WEAPONS } from "./config.js";
import { ZoneRegistry } from "./zones.js";

export function valid(entity) {
  try { return !!entity && entity.isValid(); } catch { return false; }
}

export function head(entity, offset = 1.5) {
  try { return entity.getHeadLocation(); } catch {
    return { x: entity.location.x, y: entity.location.y + offset, z: entity.location.z };
  }
}

export function vector(from, to) {
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

export function hasLineOfSight(dimension, from, to) {
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

/**
 * 通用存活玩家索敌（特感感染者使用）
 */
export function findTarget(entity, maxDistance) {
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

/**
 * 掠夺者索敌：搜索有效玩家以及避难所守卫
 */
export function findRaiderTarget(entity, maxDistance) {
  let target = findTarget(entity, maxDistance);
  if (!target) {
    const guards = entity.dimension.getEntities({ type: "apoc:shelter_guard", location: entity.location, maxDistance });
    let best = Infinity;
    for (const g of guards) {
      if (!valid(g)) continue;
      const distance = vector(entity.location, g.location).distance;
      if (distance < best) { target = g; best = distance; }
    }
  }
  return target;
}

/**
 * 避难所守卫索敌：警戒并消灭丧尸、变异体、暴君以及敌对掠夺者（绝不攻击玩家）
 */
export function findGuardTarget(guard, maxDistance) {
  const nearby = guard.dimension.getEntities({ location: guard.location, maxDistance });
  let target = null;
  let best = Infinity;
  for (const ent of nearby) {
    if (!valid(ent) || ent.id === guard.id) continue;
    if (ent.typeId === "minecraft:player" || ent.typeId === "apoc:shelter_guard") continue;

    const famComp = ent.getComponent("minecraft:type_family");
    const isHostile = ent.typeId === "apoc:raider_rifleman" ||
      ent.typeId.startsWith("apoc:infected_") ||
      ent.typeId.startsWith("apoc_boss:") ||
      ent.hasTag("apoc_hostile") ||
      ent.hasTag("monster") ||
      (famComp?.hasTypeFamily("monster") ?? false) ||
      (famComp?.hasTypeFamily("raider") ?? false);

    if (!isHostile) continue;

    const distance = vector(guard.location, ent.location).distance;
    if (distance < best) { target = ent; best = distance; }
  }
  return target;
}

export function face(entity, location) {
  try { entity.lookAt(location); return; } catch {}
  try {
    const dir = vector(entity.location, location);
    entity.setRotation({ x: -Math.asin(dir.y) * 180 / Math.PI, y: Math.atan2(-dir.x, dir.z) * 180 / Math.PI });
  } catch {}
}

export function telegraph(entity, color = "acid") {
  const loc = head(entity);
  try {
    entity.dimension.spawnParticle(color === "acid" ? "minecraft:crop_growth_emitter" : "minecraft:critical_hit_emitter", loc);
  } catch {}
}

function getNpcGunProfile(entity) {
  try {
    const equippable = entity.getComponent("minecraft:equippable");
    const held = equippable?.getEquipment("Mainhand");
    if (held?.typeId && NPC_WEAPONS[held.typeId]) {
      return NPC_WEAPONS[held.typeId];
    }
  } catch {}
  return NPC_WEAPONS["test_gun:ak47"];
}

function ensureWeapon(entity, defaultGun = "test_gun:ak47") {
  try {
    const equippable = entity.getComponent("minecraft:equippable");
    if (!equippable) return false;
    const held = equippable.getEquipment("Mainhand");
    if (held?.typeId && held.typeId.startsWith("test_gun:")) return true;
    equippable.setEquipment("Mainhand", new ItemStack(defaultGun, 1));
    return true;
  } catch {
    try {
      entity.runCommandAsync(`replaceitem entity @s slot.weapon.mainhand 0 ${defaultGun}`);
      return true;
    } catch {}
  }
  return false;
}

export class CombatAI {
  static raiders = new Map();
  static guards = new Map();
  static guardAnchors = new Map();
  static spitters = new Map();

  static resetDisabled(entity, map) {
    const previous = map.get(entity.id) || {};
    map.set(entity.id, { ...previous, state: "stunned", nextTick: system.currentTick + 8, burstLeft: 0 });
    if (system.currentTick % 8 === 0) telegraph(entity, "stun");
  }

  static tick() {
    const dimensions = new Map();
    for (const player of world.getAllPlayers()) {
      try { dimensions.set(player.dimension.id, player.dimension); } catch {}
    }
    for (const dimension of dimensions.values()) {
      for (const entity of dimension.getEntities({ type: "apoc:infected_spitter" })) this.tickSpitter(entity);
      for (const entity of dimension.getEntities({ type: "apoc:raider_rifleman" })) this.tickRaider(entity);
      for (const entity of dimension.getEntities({ type: "apoc:shelter_guard" })) this.tickGuard(entity);
    }
    if (system.currentTick % 200 === 0) this.prune();
  }

  static tickSpitter(entity) {
    if (!valid(entity)) return;
    if (isFlashDisabled(entity)) return this.resetDisabled(entity, this.spitters);
    const now = system.currentTick;
    const state = this.spitters.get(entity.id) || { state: "search", nextTick: now };
    if (now < state.nextTick) return;
    const target = findRaiderTarget(entity, 22);
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

  /**
   * 荒原持枪掠夺者射击循环
   */
  static tickRaider(entity) {
    if (!valid(entity)) return;
    if (system.currentTick % 20 === 0) ensureWeapon(entity, "test_gun:ak47");
    if (isFlashDisabled(entity)) return this.resetDisabled(entity, this.raiders);

    const profile = getNpcGunProfile(entity);
    const now = system.currentTick;
    const state = this.raiders.get(entity.id) || { state: "patrol", nextTick: now, ammo: profile.magazine, burstLeft: 0 };
    if (now < state.nextTick) return;

    const target = findRaiderTarget(entity, profile.maxRange);
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

    this.fireNpcGun(entity, target, origin, targetHead, profile);
    const left = state.burstLeft - 1;
    this.raiders.set(entity.id, {
      ...state,
      state: left > 0 ? "burst" : "cooldown",
      burstLeft: left,
      ammo: state.ammo - 1,
      nextTick: now + (left > 0 ? profile.burstInterval : profile.cooldown)
    });
  }

  /**
   * 避难所驻守护卫循环（定点哨兵，150HP，枪械真实射击）
   */
  static tickGuard(entity) {
    if (!valid(entity)) return;
    if (system.currentTick % 20 === 0) ensureWeapon(entity, "test_gun:ak47");

    // 1. 定点驻守锚定（严禁跑丢）
    if (!this.guardAnchors.has(entity.id)) {
      this.guardAnchors.set(entity.id, { x: entity.location.x, y: entity.location.y, z: entity.location.z });
    }
    const anchor = this.guardAnchors.get(entity.id);
    const distToAnchor = Math.hypot(entity.location.x - anchor.x, entity.location.z - anchor.z);

    const profile = getNpcGunProfile(entity);
    const now = system.currentTick;
    const state = this.guards.get(entity.id) || { state: "guard", nextTick: now, ammo: profile.magazine, burstLeft: 0 };

    // 离哨点超过 12 格且无敌人时，回防哨点
    const target = findGuardTarget(entity, profile.maxRange);
    if (!target && distToAnchor > 12) {
      try {
        entity.teleport(anchor);
      } catch {}
    }

    if (now < state.nextTick) return;

    if (!target) {
      this.guards.set(entity.id, { ...state, state: "guard", nextTick: now + 12, burstLeft: 0 });
      return;
    }

    const origin = head(entity);
    const targetHead = head(target, 1.45);
    const shot = vector(origin, targetHead);
    face(entity, targetHead);

    if (shot.distance < profile.minRange || !hasLineOfSight(entity.dimension, origin, targetHead)) {
      this.guards.set(entity.id, { ...state, state: "reposition", nextTick: now + 8, burstLeft: 0 });
      return;
    }

    if (state.ammo <= 0) {
      if (state.state !== "reload") {
        try { entity.dimension.playSound("random.click", origin, { volume: 0.8, pitch: 0.9 }); } catch {}
        this.guards.set(entity.id, { ...state, state: "reload", nextTick: now + profile.reloadTicks, burstLeft: 0 });
      } else {
        this.guards.set(entity.id, { state: "aim", nextTick: now + profile.aimTicks, ammo: profile.magazine, burstLeft: 0, targetId: target.id });
      }
      return;
    }

    if (state.state !== "burst" || state.burstLeft <= 0 || state.targetId !== target.id) {
      telegraph(entity, "aim");
      this.guards.set(entity.id, { ...state, state: "burst", targetId: target.id, burstLeft: profile.burst, nextTick: now + profile.aimTicks });
      return;
    }

    this.fireNpcGun(entity, target, origin, targetHead, profile);
    const left = state.burstLeft - 1;
    this.guards.set(entity.id, {
      ...state,
      state: left > 0 ? "burst" : "cooldown",
      burstLeft: left,
      ammo: state.ammo - 1,
      nextTick: now + (left > 0 ? profile.burstInterval : profile.cooldown)
    });
  }

  /**
   * 真实枪械射击分发（发射 test_guns_2d_addon 的真实子弹投掷物）
   */
  static fireNpcGun(entity, target, origin, targetHead, profile) {
    const dir = vector(origin, targetHead);
    const spawnPos = {
      x: origin.x + dir.x * 0.75,
      y: origin.y + dir.y * 0.75,
      z: origin.z + dir.z * 0.75
    };

    try {
      entity.dimension.playSound(profile.shootSound, origin, { volume: 1.3, pitch: 1.0 });
      entity.dimension.spawnParticle("minecraft:basic_flame_particle", spawnPos);
    } catch {}

    const count = profile.gunId.includes("shotgun") ? 5 : 1;
    for (let i = 0; i < count; i++) {
      try {
        const bullet = entity.dimension.spawnEntity(profile.projectileId, spawnPos);
        const projComp = bullet.getComponent("minecraft:projectile");
        const spread = (1 - profile.accuracy) * 0.12;
        const vx = (dir.x + (Math.random() - 0.5) * spread) * profile.speed;
        const vy = (dir.y + (Math.random() - 0.5) * spread) * profile.speed;
        const vz = (dir.z + (Math.random() - 0.5) * spread) * profile.speed;

        if (projComp) {
          try { projComp.owner = entity; } catch {}
          projComp.shoot({ x: vx, y: vy, z: vz });
        } else {
          bullet.applyImpulse({ x: vx, y: vy, z: vz });
        }
      } catch {
        // 兜底伤害判定
        if (hasLineOfSight(entity.dimension, origin, targetHead)) {
          try {
            target.applyDamage(profile.damage, { cause: EntityDamageCause.projectile, damagingEntity: entity });
            entity.dimension.spawnParticle("minecraft:critical_hit_emitter", targetHead);
          } catch {}
        }
      }
    }
  }

  static prune() {
    for (const [id, state] of this.raiders) if (system.currentTick - Number(state.nextTick || 0) > 1200) this.raiders.delete(id);
    for (const [id, state] of this.guards) if (system.currentTick - Number(state.nextTick || 0) > 1200) this.guards.delete(id);
    for (const [id, state] of this.spitters) if (system.currentTick - Number(state.nextTick || 0) > 1200) this.spitters.delete(id);
  }
}
