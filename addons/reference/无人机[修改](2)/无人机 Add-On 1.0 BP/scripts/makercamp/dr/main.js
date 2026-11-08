var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// data/system_template_esbuild/subscripts/_controller.ts
import { world as world15, system as system15, Player as Player9, InputButton as InputButton2, ButtonState as ButtonState2, InputPermissionCategory as InputPermissionCategory2, EasingType as EasingType2, TicksPerSecond as TicksPerSecond15, EntityComponentTypes as EntityComponentTypes15, EquipmentSlot as EquipmentSlot2 } from "@minecraft/server";

// data/system_template_esbuild/subscripts/_drone.ts
import { world as world13, system as system13, TicksPerSecond as TicksPerSecond13, ItemStack } from "@minecraft/server";

// data/system_template_esbuild/subscripts/laser_drone.ts
import { system, TicksPerSecond } from "@minecraft/server";

// data/system_template_esbuild/subscripts/_utils.ts
import { EntityComponentTypes } from "@minecraft/server";
function getDistance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function getRotationTowards(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const yaw = Math.atan2(-dx, dz) * (180 / Math.PI);
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  const pitch = -Math.atan2(dy, horizontalDistance) * (180 / Math.PI);
  return { x: pitch, y: yaw };
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function getOwner(entity) {
  const owner = entity.getComponent(EntityComponentTypes.Tameable)?.tamedToPlayer ?? void 0;
  return owner;
}
function batteryColored(value) {
  if (value <= 10) {
    return `\xA7c${value}`;
  } else if (value <= 30) {
    return `\xA76${value}`;
  } else if (value <= 60) {
    return `\xA7g${value}`;
  } else {
    return `\xA7a${value}`;
  }
}
function batteryProgressBar(value) {
  const clamped = Math.max(0, Math.min(100, value));
  const full = Math.floor(clamped / 10);
  const rest = clamped % 10;
  let bar = "";
  let fullColor = "\xA7a";
  let halfColor = "\xA7a";
  if (clamped <= 10) {
    fullColor = "\xA7c";
    halfColor = "\xA7c";
  } else if (clamped <= 30) {
    fullColor = "\xA76";
    halfColor = "\xA76";
  } else if (clamped <= 60) {
    fullColor = "\xA7g";
    halfColor = "\xA7g";
  }
  for (let i = 0; i < full; i++) {
    bar += `${fullColor}\u2588`;
  }
  if (full < 10) {
    if (rest >= 5) {
      bar += `${halfColor}\u2592`;
    } else if (rest > 0) {
      bar += `\xA78\u2592`;
    } else {
      bar += "\xA78\u2592";
    }
  }
  for (let i = bar.length / 3; i < 10; i++) {
    bar += "\xA78\u2592";
  }
  return bar;
}
function simpleAbilityPowerBar(value) {
  const clamped = Math.max(0, Math.min(100, value));
  const full = Math.ceil(clamped / 10);
  let bar = "";
  for (let i = 0; i < full; i++) {
    bar += "\xA7a\u2588";
  }
  for (let i = full; i < 10; i++) {
    bar += "\xA78\u2592";
  }
  return bar;
}
function simpleAbilityPowerBarToFull(value) {
  const clamped = Math.max(0, Math.min(100, value));
  const full = Math.ceil(clamped / 10);
  const color = clamped === 100 ? "\xA7a" : "\xA7e";
  let bar = "";
  for (let i = 0; i < full; i++) {
    bar += color + "\u2588";
  }
  for (let i = full; i < 10; i++) {
    bar += "\xA78\u2592";
  }
  return bar;
}

// ============================================================
// 全新编队系统（Formation System v2.0）
// ============================================================

// 无人机类型分类
const DRONE_TYPES = {
  combat: [
    "makercamp_dr:laser_drone",
    "makercamp_dr:freeze_drone", 
    "makercamp_dr:crossbow_drone",
    "makercamp_dr:tnt_launcher_drone",
    "makercamp_dr:lightning_strike_drone",
    "makercamp_dr:poison_drone"
  ],
  support: [
    "makercamp_dr:healing_drone",
    "makercamp_dr:fertiliser_drone",
    "makercamp_dr:item_collector_drone",
    "makercamp_dr:mob_transporter_drone"
  ],
  utility: [
    "makercamp_dr:ore_finder_drone",
    "makercamp_dr:night_vision_drone",
    "makercamp_dr:water_drone",
    "makercamp_dr:spy_drone",
    "makercamp_dr:race_drone",
    "makercamp_dr:mining_drone",
    "makercamp_dr:summoner_drone"
  ]
};

function getDroneCategory(typeId) {
  if (DRONE_TYPES.combat.includes(typeId)) return "combat";
  if (DRONE_TYPES.support.includes(typeId)) return "support";
  if (DRONE_TYPES.utility.includes(typeId)) return "utility";
  return "unknown";
}

function getWingmanInfo(entity) {
  const nearby = entity.dimension.getEntities({
    location: entity.location,
    maxDistance: 120,
    families: ["makercamp_dr:drone"],
    propertyOptions: [{ propertyId: "makercamp_dr:state", value: "passive" }]
  });
  
  const stats = { combat: 0, support: 0, utility: 0, total: 0 };
  const drones = [];
  
  for (const d of nearby) {
    if (d.id === entity.id) continue;
    const category = getDroneCategory(d.typeId);
    if (category !== "unknown") {
      stats[category]++;
      stats.total++;
      drones.push({ entity: d, category });
    }
  }
  return stats;
}

const FORMATIONS = {
  battle: {
    name: "Battle Formation",
    shortName: "[Battle]",
    color: "§c",
    condition: (s) => s.combat >= 2 && s.support < 2 && s.utility < 2,
    boosts: { damage: 1.35, attackSpeed: 1.25, range: 1.0, shieldRegen: 0.8, energyRegen: 1.0 },
    description: "DMG+35% SPD+25%"
  },
  firepower: {
    name: "Firepower",
    shortName: "[Fire]",
    color: "§4",
    condition: (s) => s.combat >= 3 && s.support < 1,
    boosts: { damage: 1.5, attackSpeed: 1.3, range: 1.1, shieldRegen: 0.6, energyRegen: 0.8 },
    description: "DMG+50% SPD+30% RNG+10%"
  },
  support: {
    name: "Support Formation",
    shortName: "[Support]",
    color: "§a",
    condition: (s) => s.support >= 2 && s.combat < 2 && s.utility < 2,
    boosts: { damage: 0.9, attackSpeed: 1.0, range: 1.0, shieldRegen: 2.0, energyRegen: 1.8 },
    description: "SHIELD+100% ENERGY+80%"
  },
  logistics: {
    name: "Logistics",
    shortName: "[Logistics]",
    color: "§2",
    condition: (s) => s.support >= 2 && s.combat >= 1,
    boosts: { damage: 1.2, attackSpeed: 1.0, range: 1.0, shieldRegen: 1.5, energyRegen: 2.0 },
    description: "DMG+20% SHIELD+50% ENERGY+100%"
  },
  tactical: {
    name: "Tactical Formation",
    shortName: "[Tactical]",
    color: "§b",
    condition: (s) => s.combat >= 2 && s.utility >= 1 && s.support < 1,
    boosts: { damage: 1.4, attackSpeed: 1.1, range: 1.3, shieldRegen: 0.7, energyRegen: 1.0 },
    description: "DMG+40% RNG+30%"
  },
  mixed: {
    name: "Mixed Formation",
    shortName: "[Mixed]",
    color: "§d",
    condition: (s) => s.combat >= 1 && s.support >= 1 && s.utility >= 1,
    boosts: { damage: 1.3, attackSpeed: 1.2, range: 1.2, shieldRegen: 1.3, energyRegen: 1.3 },
    description: "ALL+30%"
  },
  perfect: {
    name: "Perfect Formation",
    shortName: "[Perfect]",
    color: "§6",
    condition: (s) => s.combat >= 2 && s.support >= 2 && s.utility >= 2,
    boosts: { damage: 1.6, attackSpeed: 1.4, range: 1.3, shieldRegen: 1.8, energyRegen: 1.8 },
    description: "ALL+60% ULTIMATE"
  },
  swarm: {
    name: "Swarm",
    shortName: "[Swarm]",
    color: "§e",
    condition: (s) => s.total >= 5 && s.combat < 2 && s.support < 2,
    boosts: { damage: 1.2, attackSpeed: 1.1, range: 1.0, shieldRegen: 1.2, energyRegen: 1.1 },
    description: "ALL+20%"
  }
};

function getFormation(entity) {
  const stats = getWingmanInfo(entity);
  if (stats.total === 0) return null;
  const priority = ["perfect", "firepower", "tactical", "logistics", "mixed", "battle", "support", "swarm"];
  for (const key of priority) {
    if (FORMATIONS[key].condition(stats)) {
      return { ...FORMATIONS[key], key, stats };
    }
  }
  return null;
}

function getFormationBoost(entity) {
  const formation = getFormation(entity);
  if (!formation) {
    return { damage: 1.0, attackSpeed: 1.0, range: 1.0, shieldRegen: 1.0, energyRegen: 1.0, formation: null };
  }
  return { ...formation.boosts, formation: formation };
}

function getSynergyBoost(entity) {
  const boost = getFormationBoost(entity);
  return boost.damage;
}

function getFormationBoosts(entity) {
  const boost = getFormationBoost(entity);
  return {
    damage: boost.damage || 1.0,
    attackSpeed: boost.attackSpeed || 1.0,
    range: boost.range || 1.0,
    shieldRegen: boost.shieldRegen || 1.0,
    energyRegen: boost.energyRegen || 1.0,
    formation: boost.formation
  };
}

function getFormationDisplayInfo(entity) {
  const formation = getFormation(entity);
  if (!formation) return null;
  return {
    name: formation.name,
    shortName: formation.shortName,
    color: formation.color,
    description: formation.description,
    level: Math.min(3, Math.floor(formation.stats.total / 2) + 1),
    wingmanCount: formation.stats.total,
    boosts: formation.boosts
  };
}

// ============================================================

// data/system_template_esbuild/subscripts/laser_drone.ts
system.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (entity?.typeId === "makercamp_dr:laser_drone" && id === "makercamp_dr:laser_drone.shoot") {
    shoot(entity);
  }
});
function shoot(entity) {
  const owner = getOwner(entity);
  if (!owner) return;
  const boosts = getFormationBoosts(entity);
  const range = 24 * boosts.range;
  const ray = entity.dimension.getEntitiesFromRay(
    entity.location,
    entity.getViewDirection(),
    {
      maxDistance: range,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
      excludeFamilies: ["inanimate"],
      includeLiquidBlocks: false,
      includePassableBlocks: false
    }
  );
  if (ray.length <= 0) return;
  for (const hit of ray) {
    const distance = hit.distance;
    const target = hit.entity;
    if (target !== entity && target !== owner) {
      entity.setProperty("makercamp_dr:laser_length", distance);
      let damage = 1 * boosts.damage;
      target.applyDamage(Math.floor(damage), { damagingProjectile: entity, damagingEntity: entity });
      target.clearVelocity();
      break;
    }
  }
}
function laser_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 5 * TicksPerSecond;
    controller.abilityPower = 5 * TicksPerSecond;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 1 * TicksPerSecond;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 0.5 * TicksPerSecond;
  }
  controller.ability_bar = simpleAbilityPowerBar(controller.abilityPower / controller.abilityMaxPower * 100);
  entity.setProperty("makercamp_dr:controlled.rot.x", player.getRotation().x);
  entity.setProperty("makercamp_dr:controlled.rot.y", player.getRotation().y);
  if (controller.isUsingItem && controller.abilityPower > 0) {
    entity.setProperty("makercamp_dr:is_shooting", true);
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      controller.abilityPower -= 1;
      controller.abilityPowerRegenStart = 0;
      if (system.currentTick % 2 === 0) {
        shootPlayer(controller);
      }
    }
  } else {
    controller.abilityStartDelay = 0;
    if (controller.abilityStopDelay > 0) {
      controller.abilityStopDelay -= 1;
      entity.setProperty("makercamp_dr:is_shooting", true);
    } else {
      entity.setProperty("makercamp_dr:is_shooting", false);
    }
    if (!controller.isUsingItem && controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system.currentTick;
      }
      if (system.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        const boosts = getFormationBoosts(entity);
        controller.abilityPower += Math.floor(3 * boosts.energyRegen);
      }
    }
  }
}
function shootPlayer(controller) {
  const entity = controller.entity;
  const player = controller.player;
  const boosts = getFormationBoosts(entity);
  const range = 16 * boosts.range;
  const entityRay = entity.dimension.getEntitiesFromRay(
    entity.location,
    player.getViewDirection(),
    {
      maxDistance: range,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
      excludeFamilies: ["inanimate"],
      includeLiquidBlocks: false,
      includePassableBlocks: false
    }
  );
  for (const hit of entityRay) {
    const distance = hit.distance;
    const target = hit.entity;
    if (target !== entity && target !== player) {
      entity.setProperty("makercamp_dr:laser_length", distance);
      let damage = 2 * boosts.damage;
      target.applyDamage(Math.floor(damage), { damagingProjectile: entity, damagingEntity: entity });
      target.clearVelocity();
      return;
    }
  }
  const hitBlock = entity.dimension.getBlockFromRay(
    entity.location,
    player.getViewDirection(),
    {
      maxDistance: 24 * boosts.range,
      includeLiquidBlocks: false,
      includePassableBlocks: false
    }
  );
  if (hitBlock?.block) {
    const block = hitBlock.block;
    const distance = getDistance(block.location, entity.location);
    entity.setProperty("makercamp_dr:laser_length", distance);
    return;
  }
  entity.setProperty("makercamp_dr:laser_length", 24);
}

// data/system_template_esbuild/subscripts/freeze_drone.ts
import { world as world2, system as system2, TicksPerSecond as TicksPerSecond2, Player as Player2 } from "@minecraft/server";
var FROZEN = /* @__PURE__ */ new Map();
var BOSSES = [
  "minecraft:wither",
  "minecraft:ender_dragon",
  "minecraft:warden"
];
system2.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (entity?.typeId === "makercamp_dr:freeze_drone" && id === "makercamp_dr:freeze_drone.shoot") {
    shoot2(entity);
  }
});
function shoot2(entity) {
  const owner = getOwner(entity);
  if (!owner) return;
  const boosts = getFormationBoosts(entity);
  const range = 24 * boosts.range;
  const ray = entity.dimension.getEntitiesFromRay(
    entity.location,
    entity.getViewDirection(),
    {
      maxDistance: range,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
      excludeFamilies: ["inanimate"],
      includeLiquidBlocks: false,
      includePassableBlocks: false
    }
  );
  if (ray.length <= 0) return;
  for (const hit of ray) {
    const distance = hit.distance;
    const target = hit.entity;
    if (target !== entity && target !== owner) {
      entity.setProperty("makercamp_dr:laser_length", distance);
      if (!FROZEN.has(target)) {
        target.dimension.playSound("makercamp_dr.drone.ice", target.location, { pitch: 1, volume: 1 });
        const ice = target.dimension.spawnEntity("makercamp_dr:freeze_drone_ice", target.location);
        FROZEN.set(target, { ice, tick: system2.currentTick });
        break;
      } else {
        const frozen = FROZEN.get(target);
        if (frozen) frozen.tick = system2.currentTick;
        break;
      }
    }
  }
}
function frozen_tick(entity, ice, startTick) {
  if (!ice.isValid) {
    FROZEN.delete(entity);
    return;
  }
  const isBoss = BOSSES.includes(entity.typeId);
  if (!isBoss) {
    entity.clearVelocity();
    let rotation = ice.getRotation();
    if (entity instanceof Player2) {
      rotation = entity.getRotation();
    }
    entity.tryTeleport(ice.location, { rotation });
  } else {
    ice.tryTeleport(entity.location);
  }
  if (system2.currentTick % 20 === 0) {
    if (isBoss) {
      entity.addEffect("minecraft:slowness", 2 * TicksPerSecond2, { amplifier: 1, showParticles: false });
    } else {
      if (entity instanceof Player2) {
        entity.addEffect("minecraft:slowness", 2 * TicksPerSecond2, { amplifier: 0, showParticles: false });
      } else {
        entity.addEffect("minecraft:slowness", 2 * TicksPerSecond2, { amplifier: 10, showParticles: false });
      }
    }
    const position = entity.location;
    position.y += Math.abs(entity.location.y - entity.getHeadLocation().y) / 2;
    entity.dimension.spawnParticle("makercamp_dr:freeze_drone", position);
    if (Math.abs(startTick - system2.currentTick) >= 7 * TicksPerSecond2) {
      FROZEN.delete(entity);
      if (ice.isValid) {
        ice.dimension.playSound("makercamp_dr.drone.ice", ice.location, { pitch: 1.1, volume: 1 });
        ice.triggerEvent("to_despawn");
      }
    }
  }
}
system2.runInterval(() => {
  for (const entry of FROZEN) {
    const entity = entry[0];
    if (entity.isValid) {
      try {
        frozen_tick(entity, entry[1].ice, entry[1].tick);
      } catch (e) {
        console.warn(e);
        FROZEN.delete(entity);
      }
    } else {
      FROZEN.delete(entity);
      const ice = entry[1].ice;
      if (ice.isValid) {
        ice.dimension.playSound("makercamp_dr.drone.ice", ice.location, { pitch: 1.1, volume: 1 });
        ice.triggerEvent("to_despawn");
      }
    }
  }
}, 1);
world2.afterEvents.entityLoad.subscribe((event) => {
  const entity = event.entity;
  if (entity.typeId === "makercamp_dr:freeze_drone_ice") {
    for (const entry of FROZEN) {
      if (entry[1].ice === entity) return;
    }
    entity.triggerEvent("to_despawn");
  }
});
system2.runTimeout(() => { onReload(); });
function onReload() {
  const ice_entities = [];
  ["overworld", "nether", "the_end"].forEach((dimensionId) => {
    ice_entities.push(
      ...world2.getDimension(dimensionId).getEntities({
        type: "makercamp_dr:freeze_drone_ice"
      })
    );
  });
  for (const ice of ice_entities) {
    if (ice.isValid) ice.triggerEvent("to_despawn");
  }
}
system2.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === "makercamp_dr:ice_drone_ice.should_despawn") {
    const entity = event.sourceEntity;
    if (entity) {
      const nearby = entity.dimension.getEntities({
        location: entity.location,
        maxDistance: 2,
        excludeTypes: [entity.typeId]
      });
      if (nearby.length <= 0) {
        entity.triggerEvent("to_despawn");
      }
    }
  }
});
function freeze_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 5 * TicksPerSecond2;
    controller.abilityPower = 5 * TicksPerSecond2;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 1 * TicksPerSecond2;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 0.5 * TicksPerSecond2;
  }
  controller.ability_bar = simpleAbilityPowerBar(controller.abilityPower / controller.abilityMaxPower * 100);
  entity.setProperty("makercamp_dr:controlled.rot.x", player.getRotation().x);
  entity.setProperty("makercamp_dr:controlled.rot.y", player.getRotation().y);
  if (controller.isUsingItem && controller.abilityPower > 0) {
    entity.setProperty("makercamp_dr:is_shooting", true);
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      controller.abilityPower -= 1;
      controller.abilityPowerRegenStart = 0;
      if (system2.currentTick % 2 === 0) {
        shootPlayer2(controller);
      }
    }
  } else {
    controller.abilityStartDelay = 0;
    if (controller.abilityStopDelay > 0) {
      controller.abilityStopDelay -= 1;
      entity.setProperty("makercamp_dr:is_shooting", true);
    } else {
      entity.setProperty("makercamp_dr:is_shooting", false);
    }
    if (!controller.isUsingItem && controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system2.currentTick;
      }
      if (system2.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        const boosts = getFormationBoosts(entity);
        controller.abilityPower += Math.floor(3 * boosts.energyRegen);
      }
    }
  }
}
var PLAYER_FREEZE_TIME = 0;
function shootPlayer2(controller) {
  const entity = controller.entity;
  const player = controller.player;
  const boosts = getFormationBoosts(entity);
  const range = 24 * boosts.range;
  const entityRay = entity.dimension.getEntitiesFromRay(
    entity.location,
    player.getViewDirection(),
    {
      maxDistance: range,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
      excludeFamilies: ["inanimate"],
      includeLiquidBlocks: false,
      includePassableBlocks: false
    }
  );
  for (const hit of entityRay) {
    const distance = hit.distance;
    const target = hit.entity;
    if (target !== entity && target !== player) {
      entity.setProperty("makercamp_dr:laser_length", distance);
      if (!FROZEN.has(target)) {
        target.dimension.playSound("makercamp_dr.drone.ice", target.location, { pitch: 1, volume: 1 });
        const ice = target.dimension.spawnEntity("makercamp_dr:freeze_drone_ice", target.location);
        FROZEN.set(target, { ice, tick: system2.currentTick + PLAYER_FREEZE_TIME });
        return;
      } else {
        const frozen = FROZEN.get(target);
        if (frozen) frozen.tick = system2.currentTick + PLAYER_FREEZE_TIME;
        return;
      }
    }
  }
  const hitBlock = entity.dimension.getBlockFromRay(
    entity.location,
    player.getViewDirection(),
    {
      maxDistance: 24 * boosts.range,
      includeLiquidBlocks: false,
      includePassableBlocks: false
    }
  );
  if (hitBlock?.block) {
    const block = hitBlock.block;
    const distance = getDistance(block.location, entity.location);
    entity.setProperty("makercamp_dr:laser_length", distance);
    return;
  }
  entity.setProperty("makercamp_dr:laser_length", 24);
}

// data/system_template_esbuild/subscripts/mob_transporter_drone.ts
import { system as system3, TicksPerSecond as TicksPerSecond3 } from "@minecraft/server";
var ABILITY_REGEN_SPEED = 2;
function mob_transporter_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 15 * TicksPerSecond3;
    controller.abilityPower = 15 * TicksPerSecond3;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 1 * TicksPerSecond3;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 0.5 * TicksPerSecond3;
  }
  controller.ability_bar = simpleAbilityPowerBar(controller.abilityPower / controller.abilityMaxPower * 100);
  if (controller.isUsingItem && controller.abilityPower > 0) {
    entity.setProperty("makercamp_dr:is_shooting", true);
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      controller.abilityPowerRegenStart = 0;
      const used = shootPlayer3(controller);
      if (used) {
        controller.abilityPower -= 1;
      }
    }
  } else {
    controller.abilityStartDelay = 0;
    if (controller.abilityStopDelay > 0) {
      controller.abilityStopDelay -= 1;
      entity.setProperty("makercamp_dr:is_shooting", true);
    } else {
      entity.setProperty("makercamp_dr:is_shooting", false);
    }
    if (controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system3.currentTick;
      }
      if (system3.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        const boosts = getFormationBoosts(entity);
        controller.abilityPower += Math.floor(ABILITY_REGEN_SPEED * 2 * boosts.energyRegen);
      }
    }
  }
}
function shootPlayer3(controller) {
  const entity = controller.entity;
  const offset = entity.location;
  offset.y -= 1.5;
  if (controller.abilityAttachedEntity) {
    const transported = controller.abilityAttachedEntity;
    if (!transported.isValid) {
      controller.abilityAttachedEntity = void 0;
      return false;
    }
    const teleportOffset = entity.location;
    const height = transported.getHeadLocation().y - transported.location.y;
    teleportOffset.y -= 1 + height;
    if (getDistance(entity.location, transported.location) > height + 3) {
      controller.abilityAttachedEntity = void 0;
      return false;
    }
    transported.tryTeleport(teleportOffset, { checkForBlocks: true });
    return true;
  } else {
    const entities = entity.dimension.getEntities({
      location: offset,
      maxDistance: 10,
      closest: 2,
      families: ["mob"],
      excludeFamilies: ["monster"]
    }).filter((e) => e.id !== entity.id);
    if (entities.length <= 0) return false;
    const target = entities[0];
    controller.abilityAttachedEntity = target;
    entity.dimension.playSound("makercamp_dr.drone.mob_transporter", entity.location);
    target.tryTeleport(offset, { checkForBlocks: true });
  }
  return false;
}

// data/system_template_esbuild/subscripts/ore_finder_drone.ts
import { system as system4, TicksPerSecond as TicksPerSecond4, BlockVolume, MolangVariableMap } from "@minecraft/server";
var ABILITY_REGEN_SPEED2 = 1;
function ore_finder_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 5 * TicksPerSecond4;
    controller.abilityPower = 5 * TicksPerSecond4;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 1 * TicksPerSecond4;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 2 * TicksPerSecond4;
  }
  controller.ability_bar = simpleAbilityPowerBar(controller.abilityPower / controller.abilityMaxPower * 100);
  if (controller.isUsingItem && controller.abilityPower >= controller.abilityMaxPower) {
    entity.playAnimation("animation.makercamp_dr.ore_finder_drone.search", {
      players: entity.dimension.getPlayers({ location: entity.location, maxDistance: 48 }).filter((p) => p.id !== player.id)
    });
    entity.playAnimation("animation.makercamp_dr.ore_finder_drone.search_controlled", {
      players: [player]
    });
    entity.dimension.playSound("beacon.ambient", entity.location, { pitch: 3, volume: 0.8 });
    system4.runTimeout(() => {
      if (!DRONE_REGISTRY.has(player.id)) return;
      const ore_location = search(controller);
      if (ore_location) {
        const from = entity.location;
        from.y -= 0.1;
        controller.lockedMovement = system4.currentTick + 50;
        spawnOreFinderLocator(controller, from, ore_location, 2);
        player.tryTeleport(player.location, {
          rotation: getRotationTowards(entity.location, ore_location)
        });
        entity.dimension.playSound("beacon.activate", entity.location, { pitch: 2, volume: 0.8 });
      } else {
        entity.dimension.playSound("beacon.deactivate", entity.location, { pitch: 2.5, volume: 0.8 });
      }
    }, 20);
    controller.abilityPower = 0;
    controller.abilityPowerRegenStart = 0;
  } else {
    if (controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system4.currentTick;
      }
      if (system4.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        const boosts = getFormationBoosts(entity);
        controller.abilityPower += Math.floor(ABILITY_REGEN_SPEED2 * 2 * boosts.energyRegen);
      }
    }
  }
}
var ORES = {
  "coal": ["minecraft:coal_ore", "minecraft:deepslate_coal_ore"],
  "iron": ["minecraft:iron_ore", "minecraft:deepslate_iron_ore"],
  "gold": ["minecraft:gold_ore", "minecraft:deepslate_gold_ore"],
  "copper": ["minecraft:copper_ore", "minecraft:deepslate_copper_ore"],
  "redstone": ["minecraft:redstone_ore", "minecraft:deepslate_redstone_ore"],
  "lapis": ["minecraft:lapis_ore", "minecraft:deepslate_lapis_ore"]
};
function search(controller) {
  const entity = controller.entity;
  const max_distance = 64;
  const search_increase = 8;
  const location = entity.location;
  const ore = entity.getDynamicProperty("makercamp_dr.ore_finder_drone.ore") ?? "coal";
  if (!(ore in ORES)) return;
  const oreBlocks = ORES[ore];
  for (let distance = search_increase; distance <= max_distance; distance += search_increase) {
    const blockVolume = new BlockVolume(
      { x: location.x - distance, y: location.y - distance, z: location.z - distance },
      { x: location.x + distance, y: location.y + distance, z: location.z + distance }
    );
    const ore_blocks = entity.dimension.getBlocks(blockVolume, { includeTypes: oreBlocks }, false);
    const iterator = ore_blocks.getBlockLocationIterator();
    const firstOre = iterator.next();
    if (!firstOre.done) {
      return firstOre.value;
    }
  }
  return void 0;
}
function spawnOreFinderLocator(controller, from, to, speed) {
  const entity = controller.entity;
  const player = controller.player;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-6) return;
  const dir = { x: dx / len, y: dy / len, z: dz / len };
  const molang = new MolangVariableMap();
  molang.setSpeedAndDirection("custom_direction", speed, dir);
  player.spawnParticle("makercamp_dr:ore_finder_drone_locator_controlled", from, molang);
  const players = entity.dimension.getPlayers({ location: entity.location, maxDistance: 48 }).filter((p) => p.id !== player.id);
  for (const p of players) {
    p.spawnParticle("makercamp_dr:ore_finder_drone_locator", from, molang);
  }
}

// data/system_template_esbuild/subscripts/mining_drone.ts
import { system as system5, EntityComponentTypes as EntityComponentTypes6, TicksPerSecond as TicksPerSecond5 } from "@minecraft/server";
var BLOCK_DESTRUCTION = {
  "stone": 0.4 * TicksPerSecond5,
  "stone_pick_diggable": 0.4 * TicksPerSecond5,
  "minecraft:stone_tier_destructible": 0.4 * TicksPerSecond5,
  "iron_pick_diggable": 1.2 * TicksPerSecond5,
  "minecraft:iron_tier_destructible": 1.2 * TicksPerSecond5,
  "diamond_pick_diggable": 2 * TicksPerSecond5,
  "minecraft:diamond_tier_destructible": 2 * TicksPerSecond5,
  "minecraft:is_shovel_item_destructible": 0.4 * TicksPerSecond5,
  "minecraft:is_pickaxe_item_destructible": 1 * TicksPerSecond5
};
var ORE_ITEMS = [
  "minecraft:coal",
  "minecraft:raw_iron",
  "minecraft:raw_copper",
  "minecraft:raw_gold",
  "minecraft:diamond",
  "minecraft:emerald",
  "minecraft:lapis_lazuli",
  "minecraft:redstone",
  "minecraft:quartz",
  "minecraft:amethyst_shard",
  "minecraft:glowstone_dust"
];
var REFRESH = 2;
var RESET_MINING_PROGRESS = 1 * TicksPerSecond5;
function mining_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 15 * TicksPerSecond5;
    controller.abilityPower = 15 * TicksPerSecond5;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 1 * TicksPerSecond5;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 0.5 * TicksPerSecond5;
  }
  controller.ability_bar = simpleAbilityPowerBar(controller.abilityPower / controller.abilityMaxPower * 100);
  entity.setProperty("makercamp_dr:controlled.rot.x", player.getRotation().x);
  entity.setProperty("makercamp_dr:controlled.rot.y", player.getRotation().y);
  if (controller.isUsingItem && controller.abilityPower > 0) {
    entity.setProperty("makercamp_dr:is_shooting", true);
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      controller.abilityPower -= 1;
      controller.abilityPowerRegenStart = 0;
      if (system5.currentTick % REFRESH === 0) {
        shootPlayer4(controller);
      }
    }
  } else {
    controller.abilityStartDelay = 0;
    if (controller.abilityStopDelay > 0) {
      controller.abilityStopDelay -= 1;
      entity.setProperty("makercamp_dr:is_shooting", true);
    } else {
      entity.setProperty("makercamp_dr:is_shooting", false);
    }
    if (!controller.isUsingItem && controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system5.currentTick;
      }
      if (system5.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        controller.abilityMineBlockProgress.clear();
        const boosts = getFormationBoosts(entity);
        controller.abilityPower += Math.floor(4 * boosts.energyRegen);
      }
    }
  }
}
function shootPlayer4(controller) {
  const entity = controller.entity;
  const player = controller.player;
  const boosts = getFormationBoosts(entity);
  const hitBlock = entity.dimension.getBlockFromRay(
    entity.location,
    player.getViewDirection(),
    {
      maxDistance: 24 * boosts.range,
      includeLiquidBlocks: false,
      includePassableBlocks: false
    }
  );
  if (hitBlock?.block) {
    const block = hitBlock.block;
    const distance = getDistance(block.location, entity.location);
    entity.setProperty("makercamp_dr:laser_length", distance);
    const tags = block.permutation.getTags();
    if (tags.includes("minecraft:is_pickaxe_item_destructible") || tags.includes("minecraft:is_shovel_item_destructible")) {
      const destructibleTag = Object.keys(BLOCK_DESTRUCTION).find((tier) => tags.includes(tier));
      if (destructibleTag) {
        const location = block.location;
        const blockKey = getBlockKey(location);
        let speed = BLOCK_DESTRUCTION[destructibleTag];
        speed = speed / boosts.damage;
        block.dimension.spawnParticle("makercamp_dr:mining_drone_particle", block.center());
        if (controller.abilityMineBlockProgress.has(blockKey)) {
          const status = controller.abilityMineBlockProgress.get(blockKey);
          if (!status) return;
          if (Math.abs(status.lastHitTick - system5.currentTick) > RESET_MINING_PROGRESS) {
            status.progress = 0;
          }
          status.progress += REFRESH * boosts.attackSpeed;
          status.lastHitTick = system5.currentTick;
          if (status.progress > speed) {
            block.dimension.runCommand(`setblock ${location.x} ${location.y} ${location.z} air destroy`);
            system5.runTimeout(() => {
              if (!entity.isValid) return;
              const nearbyItems = block.dimension.getEntities({
                location,
                maxDistance: 2,
                type: "minecraft:item"
              });
              for (const item of nearbyItems) {
                const itemStack = item.getComponent(EntityComponentTypes6.Item)?.itemStack;
                if (itemStack && ORE_ITEMS.includes(itemStack.typeId)) {
                  const inventory = entity.getComponent(EntityComponentTypes6.Inventory);
                  if (inventory?.container) {
                    const remainingItem = inventory.container.addItem(itemStack);
                    if (!remainingItem || remainingItem.amount < itemStack.amount) {
                      const location2 = item.location;
                      item.remove();
                      if (remainingItem && remainingItem.amount > 0) {
                        entity.dimension.spawnItem(remainingItem, location2);
                      }
                    }
                  }
                }
              }
            }, 2);
          }
        } else {
          controller.abilityMineBlockProgress.set(blockKey, {
            progress: 1 * boosts.attackSpeed,
            lastHitTick: system5.currentTick
          });
        }
      }
    }
    return;
  }
  entity.setProperty("makercamp_dr:laser_length", 10);
}
function getBlockKey(location) {
  return `${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;
}

// data/system_template_esbuild/subscripts/crossbow_drone.ts
import { world as world6, EntityComponentTypes as EntityComponentTypes7, TicksPerSecond as TicksPerSecond6, system as system6 } from "@minecraft/server";
world6.afterEvents.entitySpawn.subscribe((event) => {
  const arrow = event.entity;
  if (arrow.typeId === "minecraft:arrow") {
    const projectile = arrow.getComponent(EntityComponentTypes7.Projectile);
    const owner = projectile?.owner;
    if (owner?.typeId === "makercamp_dr:crossbow_drone") {
      const player_shooting = owner.getProperty("makercamp_dr:is_shooting");
      const viewDir = owner.getViewDirection();
      if (!player_shooting) owner.setProperty("makercamp_dr:shoot", true);
      arrow.tryTeleport(owner.getHeadLocation());
      arrow.clearVelocity();
      const power = player_shooting ? 3.5 : 3;
      projectile?.shoot({
        x: viewDir.x * power,
        y: viewDir.y * power,
        z: viewDir.z * power
      }, { uncertainty: 0.01 });
      owner.dimension.playSound("crossbow.shoot", owner.location, { pitch: 1.2, volume: 0.7 });
      system6.runTimeout(() => {
        if (player_shooting) {
          if (owner.isValid) owner.dimension.playSound("crossbow.quick_charge.start", owner.location, { pitch: 0.8, volume: 0.7 });
        } else {
          if (owner.isValid) owner.dimension.playSound("crossbow.quick_charge.start", owner.location, { pitch: 1, volume: 0.7 });
        }
      }, 0.63 * TicksPerSecond6);
    }
  }
});
world6.afterEvents.projectileHitEntity.subscribe((event) => {
  const target = event.getEntityHit();
  const source = event.source;
  if (source?.typeId === "makercamp_dr:crossbow_drone") {
    const state = source.getProperty("makercamp_dr:state");
    const boosts = getFormationBoosts(source);
    let baseDamage = state === "passive" ? 7 : 10;
    baseDamage *= boosts.damage;
    const isShooting = source.getProperty("makercamp_dr:is_shooting");
    if (isShooting) baseDamage += 3;
    target.entity?.applyDamage(Math.floor(baseDamage));
    if (Math.random() < 0.15) {
      target.entity?.applyDamage(Math.floor(baseDamage * 0.5));
      source.dimension.playSound("random.explode", target.entity?.location || source.location, { pitch: 2, volume: 0.5 });
      source.dimension.spawnParticle("minecraft:critical_hit", target.entity?.location || source.location);
    }
  }
});
function crossbow_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 2.5 * TicksPerSecond6;
    controller.abilityPower = 2.5 * TicksPerSecond6;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 0;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 5;
    controller.fireCooldown = 0;
  }
  controller.ability_bar = simpleAbilityPowerBarToFull(controller.abilityPower / controller.abilityMaxPower * 100);
  entity.setProperty("makercamp_dr:controlled.rot.x", player.getRotation().x);
  entity.setProperty("makercamp_dr:controlled.rot.y", player.getRotation().y);
  const boosts = getFormationBoosts(entity);
  const baseCooldown = 6;
  const cooldown = Math.max(2, Math.floor(baseCooldown / boosts.attackSpeed));
  if (controller.isUsingItem && controller.abilityPower >= 1) {
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      entity.setProperty("makercamp_dr:is_shooting", true);
      if (controller.fireCooldown <= 0) {
        shootPlayer5(controller);
        controller.abilityPower -= 1;
        controller.abilityPowerRegenStart = 0;
        controller.fireCooldown = cooldown;
      } else {
        controller.fireCooldown -= 1;
      }
      if (controller.abilityPower <= 0) {
        controller.isUsingItem = false;
      }
    }
  } else {
    controller.abilityStartDelay = 0;
    controller.fireCooldown = 0;
    if (controller.abilityStopDelay > 0) {
      controller.abilityStopDelay -= 1;
      entity.setProperty("makercamp_dr:is_shooting", true);
    } else {
      entity.setProperty("makercamp_dr:is_shooting", false);
    }
    if (!controller.isUsingItem && controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system6.currentTick;
      }
      if (system6.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        controller.abilityPower += Math.floor(3 * boosts.energyRegen);
      }
    }
  }
}
function shootPlayer5(controller) {
  const entity = controller.entity;
  const player = controller.player;
  entity.triggerEvent("summon");
}

// data/system_template_esbuild/subscripts/tnt_launcher_drone.ts
import { system as system7, world as world7, EntityComponentTypes as EntityComponentTypes8, TicksPerSecond as TicksPerSecond7 } from "@minecraft/server";
var EXPLOSION_DISTANCE = 8;
var EXPLOSION_DAMAGE = 9;
system7.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (entity?.typeId === "makercamp_dr:tnt_launcher_drone_projectile" && id === "makercamp_dr:tnt_launcher_drone_projectile.explode") {
    explode(entity);
  }
});
function explode(entity) {
  const projectile = entity.getComponent(EntityComponentTypes8.Projectile);
  const shooter = projectile?.owner;
  const owner = shooter?.getComponent(EntityComponentTypes8.Tameable)?.tamedToPlayer;
  const targets = entity.dimension.getEntities({
    location: entity.location,
    maxDistance: EXPLOSION_DISTANCE,
    excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
    excludeFamilies: ["inanimate"]
  });
  for (const target of targets) {
    if (target === shooter || target === owner) return;
    let damage = EXPLOSION_DAMAGE;
    if (shooter) {
      const boosts = getFormationBoosts(shooter);
      damage *= boosts.damage;
      target.applyDamage(Math.floor(damage), { damagingEntity: shooter, damagingProjectile: shooter });
    } else {
      target.applyDamage(damage);
    }
    if (target) explodeKnockback(target, entity.location);
  }
}
function explodeKnockback(entity, center, strength = 2.5) {
  const loc = entity.location;
  const dx = loc.x - center.x;
  const dz = loc.z - center.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance === 0) return;
  try {
    entity.applyKnockback(
      {
        x: dx / distance * strength * (1 - distance / EXPLOSION_DISTANCE),
        z: dz / distance * strength * (1 - distance / EXPLOSION_DISTANCE)
      },
      strength * 0.15
    );
  } catch {}
}
world7.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;
  if (entity.typeId === "makercamp_dr:tnt_launcher_drone_projectile") {
    const projectile = entity.getComponent(EntityComponentTypes8.Projectile);
    const owners = entity.dimension.getEntities({
      location: entity.location,
      maxDistance: 3,
      closest: 1,
      type: "makercamp_dr:tnt_launcher_drone"
    });
    if (projectile && owners) {
      const owner = owners[0];
      projectile.owner = owner;
      const player_shooting = owner.getProperty("makercamp_dr:is_shooting");
      const viewDir = owner.getViewDirection();
      if (player_shooting) {
        entity.tryTeleport(owner.getHeadLocation(), { rotation: owner.getRotation() });
        entity.clearVelocity();
        const length = Math.sqrt(viewDir.x ** 2 + viewDir.y ** 2 + viewDir.z ** 2);
        const normalized = {
          x: viewDir.x / length,
          y: viewDir.y / length,
          z: viewDir.z / length
        };
        const power = 1.5;
        projectile.shoot({
          x: normalized.x * power,
          y: normalized.y * power,
          z: normalized.z * power
        });
      }
      owner.dimension.playSound("random.bow", owner.location, { pitch: 0.8, volume: 1 });
      system7.runTimeout(() => {
        if (owner.isValid) owner.dimension.playSound("crossbow.quick_charge.start", owner.location, { pitch: 1.1, volume: 0.7 });
      }, 0.63 * TicksPerSecond7);
    }
  }
});
function tnt_launcher_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 3 * TicksPerSecond7;
    controller.abilityPower = 3 * TicksPerSecond7;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 0;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 5;
    controller.fireCooldown = 0;
  }
  controller.ability_bar = simpleAbilityPowerBarToFull(controller.abilityPower / controller.abilityMaxPower * 100);
  entity.setProperty("makercamp_dr:controlled.rot.x", player.getRotation().x);
  entity.setProperty("makercamp_dr:controlled.rot.y", player.getRotation().y);
  const boosts = getFormationBoosts(entity);
  const baseCooldown = 3;
  const cooldown = Math.max(1, Math.floor(baseCooldown / boosts.attackSpeed));
  if (controller.isUsingItem && controller.abilityPower >= 1) {
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      entity.setProperty("makercamp_dr:is_shooting", true);
      if (controller.fireCooldown <= 0) {
        shootPlayer6(controller);
        controller.abilityPower -= 1;
        controller.abilityPowerRegenStart = 0;
        controller.fireCooldown = cooldown;
      } else {
        controller.fireCooldown -= 1;
      }
      if (controller.abilityPower <= 0) {
        controller.isUsingItem = false;
      }
    }
  } else {
    controller.abilityStartDelay = 0;
    controller.fireCooldown = 0;
    if (controller.abilityStopDelay > 0) {
      controller.abilityStopDelay -= 1;
      entity.setProperty("makercamp_dr:is_shooting", true);
    } else {
      entity.setProperty("makercamp_dr:is_shooting", false);
    }
    if (!controller.isUsingItem && controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system7.currentTick;
      }
      if (system7.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        controller.abilityPower += Math.floor(3 * boosts.energyRegen);
      }
    }
  }
}
function shootPlayer6(controller) {
  const entity = controller.entity;
  const player = controller.player;
  system7.runTimeout(() => {
    if (entity.isValid) entity.dimension.spawnEntity("makercamp_dr:tnt_launcher_drone_projectile", entity.location);
  }, 1);
}

// data/system_template_esbuild/subscripts/lightning_strike_drone.ts
import { world as world8, system as system8, EntityComponentTypes as EntityComponentTypes9, EntityDamageCause, Player as Player3, TicksPerSecond as TicksPerSecond8 } from "@minecraft/server";
var TARGET_TAG = "makercamp_dr:lightning_strike_drone_target";
system8.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (entity?.typeId === "makercamp_dr:lightning_strike_drone" && id === "makercamp_dr:lightning_strike_drone.set_target") {
    set_target(entity);
  }
  if (entity?.typeId === "makercamp_dr:lightning_strike_drone" && id === "makercamp_dr:lightning_strike_drone.shoot") {
    shoot3(entity);
  }
});
function set_target(entity) {
  const targets = entity.dimension.getEntities({
    location: entity.location,
    maxDistance: 48,
    tags: [TARGET_TAG],
    closest: 1
  });
  const target = targets[0];
  if (target) {
    target.removeTag(TARGET_TAG);
    entity.setDynamicProperty("makercamp_dr:drone.target.id", target.id);
  }
}
function shoot3(entity) {
  const target_id = entity.getDynamicProperty("makercamp_dr:drone.target.id") ?? void 0;
  if (target_id) {
    const target = world8.getEntity(target_id);
    if (target) {
      const location = target.location;
      location.y = clamp(target.location.y - 5, target.dimension.heightRange.min, target.dimension.heightRange.max);
      const lightning = entity.dimension.spawnEntity("minecraft:lightning_bolt", location);
      const owner = getOwner(entity);
      if (owner) {
        owner.setDynamicProperty("makercamp_dr:lightning_strike_drone.protect", system8.currentTick);
      }
    }
  }
}
world8.afterEvents.entityHurt.subscribe((event) => {
  const player = event.hurtEntity;
  const cause = event.damageSource.cause;
  const damage = event.damage;
  if (player instanceof Player3 && cause === EntityDamageCause.lightning) {
    const protect_string = player.getDynamicProperty("makercamp_dr:lightning_strike_drone.protect") ?? void 0;
    const protect = Number(protect_string);
    if (protect && Math.abs(protect - system8.currentTick) <= 1) {
      const health = player.getComponent(EntityComponentTypes9.Health);
      health?.setCurrentValue(health.currentValue + damage);
      player.extinguishFire();
    }
  }
});
function lightning_strike_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 3 * TicksPerSecond8;
    controller.abilityPower = 3 * TicksPerSecond8;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 0;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 5;
  }
  controller.ability_bar = simpleAbilityPowerBarToFull(controller.abilityPower / controller.abilityMaxPower * 100);
  if (controller.isUsingItem && controller.abilityPower >= controller.abilityMaxPower) {
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      entity.setProperty("makercamp_dr:is_shooting", true);
      shootPlayer7(controller);
      controller.abilityPower = 0;
      controller.abilityPowerRegenStart = 0;
    }
  } else {
    controller.abilityStartDelay = 0;
    if (controller.abilityStopDelay > 0) {
      controller.abilityStopDelay -= 1;
      entity.setProperty("makercamp_dr:is_shooting", true);
    } else {
      entity.setProperty("makercamp_dr:is_shooting", false);
    }
    if (!controller.isUsingItem && controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system8.currentTick;
      }
      if (system8.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        const boosts = getFormationBoosts(entity);
        controller.abilityPower += Math.floor(3 * boosts.energyRegen);
      }
    }
  }
}
function shootPlayer7(controller) {
  const entity = controller.entity;
  const player = controller.player;
  prepareSound(entity, 15);
  system8.runTimeout(() => {
    if (controller) shootPlayerSpawn(controller);
    entity.dimension.playSound("mob.creaking.unfreeze", entity.location, { pitch: 2, volume: 0.7 });
  }, 0.9 * TicksPerSecond8);
}
function prepareSound(entity, left) {
  if (!entity.isValid) return;
  entity.dimension.playSound("mob.creaking.freeze", entity.location, { pitch: 2, volume: 0.6 });
  if (left <= 0) return;
  system8.runTimeout(() => {
    if (entity.isValid) prepareSound(entity, left - 1);
  }, 0.1 * TicksPerSecond8);
}
function shootPlayerSpawn(controller) {
  const entity = controller.entity;
  const player = controller.player;
  const boosts = getFormationBoosts(entity);
  const range = 32 * boosts.range;
  const hitBlocks = entity.dimension.getBlockFromRay(entity.location, player.getViewDirection(), {
    maxDistance: range,
    includeLiquidBlocks: false,
    includePassableBlocks: false
  });
  let hitLocation = {
    x: entity.location.x + player.getViewDirection().x * 16 * boosts.range,
    y: entity.location.y + player.getViewDirection().y * 16 * boosts.range,
    z: entity.location.z + player.getViewDirection().z * 16 * boosts.range
  };
  if (hitBlocks?.block) {
    hitLocation = hitBlocks.block.location;
  } else {
    const rayResult = entity.dimension.getBlockFromRay(
      hitLocation,
      { x: 0, y: -1, z: 0 },
      {
        maxDistance: 32 * boosts.range,
        includeLiquidBlocks: false,
        includePassableBlocks: false
      }
    );
    if (rayResult) {
      hitLocation = rayResult.block.location;
    }
  }
  const location = hitLocation;
  location.y = clamp(location.y - 5, entity.dimension.heightRange.min, entity.dimension.heightRange.max);
  const lightning = entity.dimension.spawnEntity("minecraft:lightning_bolt", location);
  player.setDynamicProperty("makercamp_dr:lightning_strike_drone.protect", system8.currentTick);
}
// data/system_template_esbuild/subscripts/poison_drone.ts
import { world as world9, system as system9, EntityComponentTypes as EntityComponentTypes10, TicksPerSecond as TicksPerSecond9 } from "@minecraft/server";
var POISON_DISTANCE = 5;
var POISON_DURATION = 15;
var TARGET_TAG2 = "makercamp_dr:poison_drone_target";
var ACTIVE_POISON = /* @__PURE__ */ new Map();
system9.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (entity?.typeId === "makercamp_dr:poison_drone" && id === "makercamp_dr:poison_drone.set_target") {
    set_target2(entity);
  }
  if (entity?.typeId === "makercamp_dr:poison_drone" && id === "makercamp_dr:poison_drone.shoot") {
    shoot4(entity);
  }
});
function set_target2(entity) {
  const targets = entity.dimension.getEntities({
    location: entity.location,
    maxDistance: 48,
    tags: [TARGET_TAG2],
    closest: 1
  });
  const target = targets[0];
  if (target) {
    target.removeTag(TARGET_TAG2);
    entity.setDynamicProperty("makercamp_dr:drone.target.id", target.id);
  }
}
function shoot4(entity) {
  const target_id = entity.getDynamicProperty("makercamp_dr:drone.target.id") ?? void 0;
  if (target_id) {
    const target = world9.getEntity(target_id);
    if (target) {
      const location = target.location;
      const active = entity.dimension.getEntities({
        location: target.location,
        maxDistance: 32,
        type: "makercamp_dr:poison_drone_poison"
      });
      if (active.length >= 6) return;
      const poison = entity.dimension.spawnEntity("makercamp_dr:poison_drone_poison", location);
      entity.dimension.playSound("makercamp_dr.drone.poison_impact", location);
      const owner = getOwner(entity);
      if (owner) {
        ACTIVE_POISON.set(poison, owner.id);
      } else {
        const id = entity.getDynamicProperty("makercamp_dr:owner_id") ?? "0";
        ACTIVE_POISON.set(poison, id);
      }
    }
  }
}
function canShoot(entity) {
  const active = entity.dimension.getEntities({
    location: entity.location,
    maxDistance: 32,
    type: "makercamp_dr:poison_drone_poison"
  });
  if (active.length >= 6) {
    return false;
  }
  return true;
}
function poison_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 3 * TicksPerSecond9;
    controller.abilityPower = 3 * TicksPerSecond9;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 0;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 5;
  }
  controller.ability_bar = simpleAbilityPowerBarToFull(controller.abilityPower / controller.abilityMaxPower * 100);
  if (controller.isUsingItem && controller.abilityPower >= controller.abilityMaxPower) {
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      if (canShoot(entity)) {
        entity.setProperty("makercamp_dr:is_shooting", true);
        shootPlayer8(entity);
        controller.abilityPower = 0;
        controller.abilityPowerRegenStart = 0;
      } else {
        if (!controller.actionbarNote) {
          controller.actionbarNote = "\xA7c                             Poison Limit: 6/6";
          controller.actionbarNoteTime = 4 * TicksPerSecond9;
        }
      }
    }
  } else {
    controller.abilityStartDelay = 0;
    if (controller.abilityStopDelay > 0) {
      controller.abilityStopDelay -= 1;
      entity.setProperty("makercamp_dr:is_shooting", true);
    } else {
      entity.setProperty("makercamp_dr:is_shooting", false);
    }
    if (!controller.isUsingItem && controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system9.currentTick;
      }
      if (system9.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        const boosts = getFormationBoosts(entity);
        controller.abilityPower += Math.floor(3 * boosts.energyRegen);
      }
    }
  }
}
function shootPlayer8(entity) {
  const location = entity.location;
  entity.dimension.playSound("mob.horse.breathe", entity.location, { pitch: 0.6, volume: 1 });
  const active = entity.dimension.getEntities({
    location: entity.location,
    maxDistance: 32,
    type: "makercamp_dr:poison_drone_poison"
  });
  if (active.length >= 2) return;
  const poison = entity.dimension.spawnEntity("makercamp_dr:poison_drone_poison", location);
  entity.dimension.playSound("makercamp_dr.drone.poison_impact", location);
  const owner = getOwner(entity);
  if (owner) {
    ACTIVE_POISON.set(poison, owner.id);
  } else {
    const id = entity.getDynamicProperty("makercamp_dr:owner_id") ?? "0";
    ACTIVE_POISON.set(poison, id);
  }
}
system9.runInterval(() => {
  for (const poison of ACTIVE_POISON) {
    const entity = poison[0];
    const owner_id = poison[1];
    if (entity.isValid) {
      const targets = entity.dimension.getEntities({
        location: entity.location,
        maxDistance: POISON_DISTANCE,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
        excludeFamilies: ["inanimate"]
      });
      for (let target of targets) {
        try {
          const id = target.getDynamicProperty("makercamp_dr:owner_id") ?? void 0;
          if (id === owner_id || target.id === owner_id) continue;
          const family = target.getComponent(EntityComponentTypes10.TypeFamily);
          if (family?.hasTypeFamily("undead")) {
            target.addEffect("minecraft:wither", POISON_DURATION * TicksPerSecond9);
          } else {
            target.addEffect("minecraft:poison", POISON_DURATION * TicksPerSecond9);
          }
        } catch (e) {
          console.warn("Poison Drone:", e);
        }
      }
    } else {
      ACTIVE_POISON.delete(entity);
    }
  }
}, 20);

// data/system_template_esbuild/subscripts/summoner_drone.ts
import { world as world10, system as system10, EntityComponentTypes as EntityComponentTypes11, TicksPerSecond as TicksPerSecond10 } from "@minecraft/server";
var ACTIVE_DRONES = /* @__PURE__ */ new Map();
var MAX_DRONES_PASSIVE = 5;
var MAX_DRONES_ACTIVE = 10;
system10.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (entity?.typeId === "makercamp_dr:summoner_drone" && id === "makercamp_dr:summoner_drone.shoot") {
    shoot5(entity);
  }
  if (entity?.typeId === "makercamp_dr:ground_drone" && id === "makercamp_dr:ground_drone.check") {
    checkParent(entity);
  }
});
function checkParent(entity) {
  const parent_id = entity.getDynamicProperty("makercamp_dr:ground_drone.parent") ?? void 0;
  if (!parent_id) {
    entity.remove();
    return;
  }
  const parent = world10.getEntity(parent_id);
  if (!parent?.isValid) {
    entity.remove();
    return;
  }
  if (entity.hasTag("active_mode")) {
    if (parent.getProperty("makercamp_dr:state") !== "active") {
      entity.remove();
      return;
    }
  } else {
    if (parent.getProperty("makercamp_dr:state") === "standby") {
      entity.remove();
      return;
    }
  }
  const drones = ACTIVE_DRONES.get(parent);
  if (!drones || !drones.some((d) => d.id === entity.id)) {
    entity.remove();
    return;
  }
}
function shoot5(entity) {
  const currentDrones = ACTIVE_DRONES.get(entity)?.length ?? 0;
  if (currentDrones >= MAX_DRONES_PASSIVE) {
    return;
  } else {
    entity.setProperty("makercamp_dr:is_shooting", true);
    system10.runTimeout(() => {
      if (!entity.isValid) return;
      entity.setProperty("makercamp_dr:is_shooting", false);
      const owner = getOwner(entity);
      if (!owner) return;
      const location = entity.location;
      const ground_drone = entity.dimension.spawnEntity("makercamp_dr:ground_drone", { x: location.x, y: entity.dimension.heightRange.max, z: location.z });
      entity.dimension.playSound("makercamp_dr.drone.summon", location);
      ground_drone.setDynamicProperty("makercamp_dr:ground_drone.parent", entity.id);
      const tameable = ground_drone.getComponent(EntityComponentTypes11.Tameable);
      tameable?.tame(owner);
      ground_drone.teleport(location, { rotation: entity.getRotation() });
      ACTIVE_DRONES.set(entity, [...ACTIVE_DRONES.get(entity) ?? [], ground_drone]);
    }, 0.54 * TicksPerSecond10);
  }
}
function summoner_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 3 * TicksPerSecond10;
    controller.abilityPower = 3 * TicksPerSecond10;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 0;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 5;
  }
  controller.ability_bar = simpleAbilityPowerBarToFull(controller.abilityPower / controller.abilityMaxPower * 100);
  if (controller.isUsingItem && controller.abilityPower >= controller.abilityMaxPower) {
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      if (canShootControlled(entity)) {
        shootPlayer9(entity);
        controller.abilityPower = 0;
        controller.abilityPowerRegenStart = 0;
      } else {
        if (!controller.actionbarNote) {
          controller.actionbarNote = "\xA7c                         Ground Drone Limit: 10/10";
          controller.actionbarNoteTime = 4 * TicksPerSecond10;
        }
      }
    }
  } else {
    controller.abilityStartDelay = 0;
    if (!controller.isUsingItem && controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system10.currentTick;
      }
      if (system10.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        const boosts = getFormationBoosts(entity);
        controller.abilityPower += Math.floor(3 * boosts.energyRegen);
      }
    }
  }
}
function canShootControlled(entity) {
  const currentDrones = ACTIVE_DRONES.get(entity)?.length ?? 0;
  if (currentDrones >= MAX_DRONES_ACTIVE) {
    return false;
  }
  return true;
}
function shootPlayer9(entity) {
  const currentDrones = ACTIVE_DRONES.get(entity)?.length ?? 0;
  if (currentDrones >= MAX_DRONES_ACTIVE) {
    return;
  } else {
    entity.setProperty("makercamp_dr:is_shooting", true);
    system10.runTimeout(() => {
      if (!entity.isValid) return;
      entity.setProperty("makercamp_dr:is_shooting", false);
      const owner = getOwner(entity);
      if (!owner) return;
      const location = entity.location;
      const ground_drone = entity.dimension.spawnEntity("makercamp_dr:ground_drone", { x: location.x, y: entity.dimension.heightRange.max, z: location.z });
      entity.dimension.playSound("makercamp_dr.drone.summon", location);
      ground_drone.setDynamicProperty("makercamp_dr:ground_drone.parent", entity.id);
      const tameable = ground_drone.getComponent(EntityComponentTypes11.Tameable);
      tameable?.tame(owner);
      ground_drone.teleport(location, { rotation: entity.getRotation() });
      ground_drone.addTag("active_mode");
      ACTIVE_DRONES.set(entity, [...ACTIVE_DRONES.get(entity) ?? [], ground_drone]);
    }, 0.54 * TicksPerSecond10);
  }
}
world10.afterEvents.entityRemove.subscribe((event) => {
  const removedId = event.removedEntityId;
  const typeId = event.typeId;
  if (typeId === "makercamp_dr:ground_drone") {
    for (const [parent, drones] of ACTIVE_DRONES) {
      const filtered = drones.filter((d) => d.id !== removedId);
      if (filtered.length !== drones.length) {
        if (filtered.length === 0) {
          ACTIVE_DRONES.delete(parent);
        } else {
          ACTIVE_DRONES.set(parent, filtered);
        }
        break;
      }
    }
  }
  if (typeId === "makercamp_dr:summoner_drone") {
    for (const [parent, drones] of ACTIVE_DRONES) {
      if (parent.id === removedId) {
        for (const drone of drones) {
          if (drone.isValid) {
            drone.remove();
          }
        }
        ACTIVE_DRONES.delete(parent);
        break;
      }
    }
  }
});
system10.runInterval(() => {
  for (const [parent, drones] of ACTIVE_DRONES) {
    const validDrones = drones.filter((d) => d.isValid);
    if (validDrones.length !== drones.length) {
      if (validDrones.length === 0) {
        ACTIVE_DRONES.delete(parent);
      } else {
        ACTIVE_DRONES.set(parent, validDrones);
      }
    }
    if (!parent.isValid) {
      for (const drone of validDrones) {
        if (drone.isValid) {
          drone.remove();
        }
      }
      ACTIVE_DRONES.delete(parent);
    }
  }
}, 5 * TicksPerSecond10);

// data/system_template_esbuild/subscripts/fertiliser_drone.ts
import { world as world11, system as system11, TicksPerSecond as TicksPerSecond11, BlockVolume as BlockVolume3 } from "@minecraft/server";
var FARM_BLOCKS = [
  "minecraft:wheat",
  "minecraft:carrots",
  "minecraft:potatoes",
  "minecraft:pitcher_crop",
  "minecraft:beetroot",
  "minecraft:melon_stem",
  "minecraft:torchflower_crop",
  "minecraft:pumpkin_stem",
  "minecraft:sweet_berry_bush"
];
var GROW_COOLDOWN = 2;
var COOLDOWNS = /* @__PURE__ */ new Map();
world11.afterEvents.entityRemove.subscribe((event) => {
  COOLDOWNS.delete(event.removedEntityId);
});
system11.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (!entity?.isValid || id !== "makercamp_dr:fertiliser_drone.grow") return;
  if (entity.typeId !== "makercamp_dr:fertiliser_drone") return;
  if (COOLDOWNS.has(entity.id)) {
    const cooldown = COOLDOWNS.get(entity.id) ?? 0;
    if (cooldown > 0) {
      COOLDOWNS.set(entity.id, cooldown - 1);
      return;
    }
  }
  grow(entity, 6, false);
});
function grow(entity, range, playerControlled) {
  const location = entity.location;
  const blockVolume = new BlockVolume3(
    { x: location.x - range, y: location.y - 6, z: location.z - range },
    { x: location.x + range, y: location.y + 2, z: location.z + range }
  );
  const blocks = entity.dimension.getBlocks(blockVolume, {
    includeTypes: FARM_BLOCKS
  }, false);
  const iterator = blocks.getBlockLocationIterator();
  let success = 0;
  for (const block_location of iterator) {
    const block = entity.dimension.getBlock(block_location);
    if (block?.isValid) {
      const growthValue = block.permutation.getState("growth");
      if (growthValue !== null && growthValue !== void 0) {
        try {
          block.setPermutation(block.permutation.withState("growth", growthValue + 1));
          block.dimension.spawnParticle("minecraft:crop_growth_emitter", block.center());
          success += 1;
        } catch {
          continue;
        }
      }
    }
  }
  if (success > 0 || playerControlled) {
    COOLDOWNS.set(entity.id, GROW_COOLDOWN);
    entity.playAnimation("animation.makercamp_dr.fertiliser_drone.particles");
    entity.dimension.playSound("makercamp_dr.drone.fertiliser", entity.location);
  }
}
function fertiliser_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 3 * TicksPerSecond11;
    controller.abilityPower = 3 * TicksPerSecond11;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 0;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 5;
  }
  controller.ability_bar = simpleAbilityPowerBarToFull(controller.abilityPower / controller.abilityMaxPower * 100);
  if (controller.isUsingItem && controller.abilityPower >= controller.abilityMaxPower) {
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      grow(entity, 6, true);
      controller.abilityPower = 0;
      controller.abilityPowerRegenStart = 0;
    }
  } else {
    controller.abilityStartDelay = 0;
    if (!controller.isUsingItem && controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system11.currentTick;
      }
      if (system11.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        const boosts = getFormationBoosts(entity);
        controller.abilityPower += Math.floor(3 * boosts.energyRegen);
      }
    }
  }
}

// data/system_template_esbuild/subscripts/healing_drone.ts
import { system as system12, EntityComponentTypes as EntityComponentTypes13, TicksPerSecond as TicksPerSecond12 } from "@minecraft/server";
var HEAL_DISTANCE = 6;
var HEAL_DURATION = 15;
var ACTIVE_HEALING = /* @__PURE__ */ new Map();
var COOLDOWN = 10 * TicksPerSecond12;
var ANIM_DELAY = 0.4;
system12.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (entity?.typeId === "makercamp_dr:healing_drone" && id === "makercamp_dr:healing_drone.shoot") {
    if (shouldShoot(entity)) {
      entity.setDynamicProperty("makercamp_dr.healing_drone.cooldown", system12.currentTick + COOLDOWN);
      entity.setProperty("makercamp_dr:is_shooting", true);
      system12.runTimeout(() => {
        shoot6(entity);
        entity.setProperty("makercamp_dr:is_shooting", false);
      }, ANIM_DELAY * TicksPerSecond12);
    }
  }
});
function shouldShoot(entity) {
  const cooldown = entity.getDynamicProperty("makercamp_dr.healing_drone.cooldown") ?? 0;
  if (cooldown > system12.currentTick) return;
  const owner = getOwner(entity);
  if (owner) {
    const active = entity.dimension.getEntities({
      location: entity.location,
      maxDistance: 32,
      type: "makercamp_dr:healing_drone_heal"
    }).filter((e) => e.getDynamicProperty("makercamp_dr.owner_id") ?? void 0 === owner.id);
    if (active.length >= 3) return false;
    const health = owner.getComponent(EntityComponentTypes13.Health);
    if (health && health.currentValue < health.effectiveMax) {
      return true;
    }
  }
  return false;
}
function shoot6(entity) {
  if (!entity.isValid) return;
  const owner = getOwner(entity);
  if (owner) {
    const active = entity.dimension.getEntities({
      location: entity.location,
      maxDistance: 32,
      type: "makercamp_dr:healing_drone_heal"
    }).filter((e) => e.getDynamicProperty("makercamp_dr.owner_id") ?? void 0 === owner.id);
    if (active.length >= 3) return;
    const heal = entity.dimension.spawnEntity("makercamp_dr:healing_drone_heal", owner.location);
    heal.setDynamicProperty("makercamp_dr.owner_id", owner.id);
    entity.dimension.playSound("makercamp_dr.drone.healing", entity.location);
    ACTIVE_HEALING.set(heal, owner.id);
  }
}
function canShoot2(entity) {
  if (!entity.isValid) return false;
  const owner = getOwner(entity);
  if (owner) {
    const active = entity.dimension.getEntities({
      location: entity.location,
      maxDistance: 32,
      type: "makercamp_dr:healing_drone_heal"
    }).filter((e) => e.getDynamicProperty("makercamp_dr.owner_id") ?? void 0 === owner.id);
    if (active.length >= 3) return false;
    return true;
  }
  return false;
}
function healing_drone_controller(controller) {
  const player = controller.player;
  const entity = controller.entity;
  if (controller.abilityMaxPower === 0) {
    controller.abilityMaxPower = 3 * TicksPerSecond12;
    controller.abilityPower = 3 * TicksPerSecond12;
    controller.abilityPowerRegenDelay = 0;
    controller.abilityPowerRegenStart = 0;
    controller.abilityStartDelay = 0;
    controller.abilityMaxStartDelay = 0;
    controller.abilityStopDelay = 0;
    controller.abilityMaxStopDelay = 5;
  }
  controller.ability_bar = simpleAbilityPowerBarToFull(controller.abilityPower / controller.abilityMaxPower * 100);
  if (controller.isUsingItem && controller.abilityPower >= controller.abilityMaxPower) {
    if (controller.abilityStartDelay < controller.abilityMaxStartDelay) {
      controller.abilityStartDelay += 1;
    }
    controller.abilityStopDelay = controller.abilityMaxStopDelay;
    if (controller.abilityStartDelay >= controller.abilityMaxStartDelay) {
      if (canShoot2(entity)) {
        entity.setProperty("makercamp_dr:is_shooting", true);
        shootPlayer10(controller);
        controller.abilityPower = 0;
        controller.abilityPowerRegenStart = 0;
      } else {
        if (!controller.actionbarNote) {
          controller.actionbarNote = "\xA7c                             Healing Limit: 3/3";
          controller.actionbarNoteTime = 4 * TicksPerSecond12;
        }
      }
    }
  } else {
    controller.abilityStartDelay = 0;
    if (controller.abilityStopDelay > 0) {
      controller.abilityStopDelay -= 1;
      entity.setProperty("makercamp_dr:is_shooting", true);
    } else {
      entity.setProperty("makercamp_dr:is_shooting", false);
    }
    if (!controller.isUsingItem && controller.abilityPower < controller.abilityMaxPower) {
      if (controller.abilityPowerRegenStart === 0) {
        controller.abilityPowerRegenStart = system12.currentTick;
      }
      if (system12.currentTick >= controller.abilityPowerRegenStart + controller.abilityPowerRegenDelay) {
        const boosts = getFormationBoosts(entity);
        controller.abilityPower += Math.floor(3 * boosts.energyRegen);
      }
    }
  }
}
function shootPlayer10(controller) {
  const entity = controller.entity;
  const player = controller.player;
  const heal = entity.dimension.spawnEntity("makercamp_dr:healing_drone_heal", entity.location);
  heal.setDynamicProperty("makercamp_dr.owner_id", player.id);
  entity.dimension.playSound("makercamp_dr.drone.healing", entity.location);
  ACTIVE_HEALING.set(heal, player.id);
}
system12.runInterval(() => {
  for (const healing of ACTIVE_HEALING) {
    const entity = healing[0];
    if (entity.isValid) {
      const targets = entity.dimension.getEntities({
        location: entity.location,
        maxDistance: HEAL_DISTANCE,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
        excludeFamilies: ["inanimate"]
      });
      for (let target of targets) {
        try {
          const family = target.getComponent(EntityComponentTypes13.TypeFamily);
          if (family?.hasTypeFamily("undead")) {
            return;
          } else {
            target.addEffect("minecraft:regeneration", HEAL_DURATION * TicksPerSecond12);
          }
        } catch (e) {
          console.warn("Healing Drone:", e);
        }
      }
    } else {
      ACTIVE_HEALING.delete(entity);
    }
  }
}, 20);

// data/system_template_esbuild/subscripts/_drone.ts
var PASSIVE_DRONES_LIMIT = 10;
var BATTERY_DURATION_MINUTES = 60;
var BATTERY_MAX = 100;
var BATTERY_DRAIN_PER_TICK = BATTERY_MAX / (BATTERY_DURATION_MINUTES * 60 * TicksPerSecond13);
var BATTERY_UPDATE_INTERVAL = 10 * TicksPerSecond13;
var DRONES = {
  "makercamp_dr:laser_drone": {
    abilityController: laser_drone_controller
  },
  "makercamp_dr:crossbow_drone": {
    abilityController: crossbow_drone_controller
  },
  "makercamp_dr:fertiliser_drone": {
    abilityController: fertiliser_drone_controller
  },
  "makercamp_dr:freeze_drone": {
    abilityController: freeze_drone_controller
  },
  "makercamp_dr:healing_drone": {
    abilityController: healing_drone_controller
  },
  "makercamp_dr:inventory_drone": {
    defaultName: "\xA7m\xA7a\xA7k\xA7e\xA7r\xA7c\xA7a\xA7m\xA7p\xA7:\xA7i\xA7n\xA7v\xA7e\xA7n\xA7t\xA7o\xA7r\xA7y\xA7_\xA7d\xA7r\xA7o\xA7n\xA7e\xA7.\xA7n\xA7a\xA7m\xA7e\xA7r"
  },
  "makercamp_dr:item_collector_drone": {
    maxDistance: 32,
    defaultName: "\xA7m\xA7a\xA7k\xA7e\xA7r\xA7c\xA7a\xA7m\xA7p\xA7:\xA7i\xA7t\xA7e\xA7m\xA7_\xA7c\xA7o\xA7l\xA7l\xA7e\xA7c\xA7t\xA7o\xA7r\xA7_\xA7d\xA7r\xA7o\xA7n\xA7e\xA7.\xA7n\xA7a\xA7m\xA7e\xA7r"
  },
  "makercamp_dr:lightning_strike_drone": {
    abilityController: lightning_strike_drone_controller
  },
  "makercamp_dr:mining_drone": {
    abilityController: mining_drone_controller,
    defaultName: "\xA7m\xA7a\xA7k\xA7e\xA7r\xA7c\xA7a\xA7m\xA7p\xA7:\xA7m\xA7i\xA7n\xA7i\xA7n\xA7g\xA7_\xA7d\xA7r\xA7o\xA7n\xA7e\xA7.\xA7n\xA7a\xA7m\xA7e\xA7r"
  },
  "makercamp_dr:mob_transporter_drone": {
    abilityController: mob_transporter_drone_controller
  },
  "makercamp_dr:night_vision_drone": {
    maxDistance: 512
  },
  "makercamp_dr:ore_finder_drone": {
    abilityController: ore_finder_drone_controller
  },
  "makercamp_dr:poison_drone": {
    abilityController: poison_drone_controller
  },
  "makercamp_dr:race_drone": {
    maxDistance: 128,
    verticalSpeed: 1.1,
    horizontalSpeed: 1.1,
    verticalAcceleration: 0.25,
    verticalDeceleration: 0.15,
    horizontalAcceleration: 0.25,
    horizontalDeceleration: 0.15
  },
  "makercamp_dr:spy_drone": {
    maxDistance: 512,
    verticalSpeed: 0.7,
    horizontalSpeed: 0.7,
    verticalAcceleration: 0.15,
    verticalDeceleration: 0.1,
    horizontalAcceleration: 0.15,
    horizontalDeceleration: 0.1
  },
  "makercamp_dr:summoner_drone": {
    abilityController: summoner_drone_controller
  },
  "makercamp_dr:tnt_launcher_drone": {
    abilityController: tnt_launcher_drone_controller
  },
  "makercamp_dr:water_drone": {
    airSpeedMultiplier: 0.3,
    waterSpeedMultiplier: 1.5
  }
};
var BATTERY_ADDITION = 80;
system13.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (entity?.isValid && id === "makercamp_dr:drone.recharge") {
    const battery = entity.getProperty("makercamp_dr:battery") ?? 100;
    entity.setProperty("makercamp_dr:battery", clamp(battery + BATTERY_ADDITION, 0, 100));
    entity.dimension.playSound("makercamp_dr.drone.active_start", entity.location, { pitch: 1.5 });
    entity.dimension.spawnParticle("makercamp_dr:recharge", entity.location);
  }
  if (entity?.isValid && event.message && id === "makercamp_dr:debug.set_battery") {
    const value = Number(event.message) ?? 100;
    const drones = entity.dimension.getEntities({
      families: ["makercamp_dr:drone"]
    });
    for (const drone of drones) {
      drone.setProperty("makercamp_dr:battery", clamp(value, 0, 100));
    }
  }
  if (entity?.isValid && id === "makercamp_dr:drone.break") {
    breakDrone(entity);
  }
});
function breakDrone(entity) {
  if (!entity.isValid || !DRONES[entity.typeId]) return;
  const battery = entity.getProperty("makercamp_dr:battery") ?? 100;
  const item = new ItemStack(entity.typeId + "_spawn_egg");
  if (battery !== 100) {
    const battery_bar = batteryProgressBar(battery);
    item.setLore([`\xA7r\xA78[ ${battery_bar} \xA78] ${batteryColored(battery)}%`]);
  }
  entity.dimension.spawnItem(item, entity.location);
  entity.remove();
}

// ============================================================
// 全新机制：无人机护盾系统
// ============================================================
var DRONE_SHIELDS = /* @__PURE__ */ new Map();
var SHIELD_CONFIG = {
  baseMaxShield: 20,
  rechargeRate: 0.5,
  rechargeThreshold: 30,
  minBatteryToShield: 10,
};

function getShieldData(entity) {
  if (!DRONE_SHIELDS.has(entity.id)) {
    DRONE_SHIELDS.set(entity.id, {
      shield: SHIELD_CONFIG.baseMaxShield,
      maxShield: SHIELD_CONFIG.baseMaxShield
    });
  }
  return DRONE_SHIELDS.get(entity.id);
}

system13.runInterval(() => {
  for (const dimension of [world13.getDimension("overworld"), world13.getDimension("nether"), world13.getDimension("the_end")]) {
    try {
      const allDrones = dimension.getEntities({ families: ["makercamp_dr:drone"] });
      for (const drone of allDrones) {
        if (!drone.isValid) continue;
        const battery = drone.getProperty("makercamp_dr:battery") ?? 100;
        if (battery < SHIELD_CONFIG.minBatteryToShield) continue;
        const state = drone.getProperty("makercamp_dr:state");
        if (state === "standby") continue;
        const boosts = getFormationBoosts(drone);
        const shieldData = getShieldData(drone);
        let rechargeMult = 1 * boosts.shieldRegen;
        if (battery < 20) rechargeMult *= 0.3;
        else if (battery < 50) rechargeMult *= 0.6;
        else if (battery > 80) rechargeMult *= 1.5;
        shieldData.shield = Math.min(
          shieldData.maxShield,
          shieldData.shield + SHIELD_CONFIG.rechargeRate * rechargeMult
        );
        const bonusShield = Math.floor((battery - 30) / 10) * 2;
        shieldData.maxShield = SHIELD_CONFIG.baseMaxShield + Math.max(0, bonusShield);
      }
    } catch(e) {}
  }
}, 1);

system13.runInterval(() => {
  for (const [id, data] of DRONE_SHIELDS) {
    const entity = world13.getEntity(id);
    if (!entity?.isValid) {
      DRONE_SHIELDS.delete(id);
      continue;
    }
    if (data.shield >= data.maxShield * 0.9) {
      if (system13.currentTick % 20 === 0) {
        entity.dimension.spawnParticle("minecraft:end_rod", entity.location);
      }
    }
    if (data.shield < data.maxShield * 0.3 && data.shield > 0) {
      if (system13.currentTick % 5 === 0) {
        entity.dimension.spawnParticle("minecraft:damage_indicator", entity.location);
      }
    }
  }
}, 5);

world13.afterEvents.entityHurt.subscribe((event) => {
  const entity = event.hurtEntity;
  const family = entity.getComponent(EntityComponentTypes.TypeFamily);
  if (!family || !family.hasTypeFamily("makercamp_dr:drone")) return;
  const shieldData = DRONE_SHIELDS.get(entity.id);
  if (!shieldData) return;
  if (shieldData.shield <= 0) return;
  const originalDamage = event.damage;
  if (originalDamage <= 0) return;
  const absorbed = originalDamage * 0.8;
  const absorbedInt = Math.ceil(absorbed);
  const remaining = originalDamage - absorbedInt;
  shieldData.shield = Math.max(0, shieldData.shield - absorbedInt);
  if (shieldData.shield <= 0 && absorbedInt > 0) {
    entity.dimension.playSound("random.break", entity.location, { pitch: 1.5, volume: 0.8 });
    entity.dimension.spawnParticle("minecraft:totem_of_undying", entity.location);
  } else if (absorbedInt > 0) {
    entity.dimension.spawnParticle("minecraft:sparkler", entity.location);
  }
  if (remaining > 0) {
    event.damage = 0;
    const health = entity.getComponent(EntityComponentTypes.Health);
    if (health) {
      const newHealth = Math.max(0, health.currentValue - remaining);
      health.setCurrentValue(newHealth);
    }
  }
}, { first: true });

system13.runInterval(() => {
  for (const dimension of [world13.getDimension("overworld"), world13.getDimension("nether"), world13.getDimension("the_end")]) {
    const allDrones = dimension.getEntities({
      families: ["makercamp_dr:drone"]
    });
    for (const drone of allDrones) {
      if (!drone.isValid || !DRONES[drone.typeId]) continue;
      const state = drone.getProperty("makercamp_dr:state");
      const battery = drone.getProperty("makercamp_dr:battery") ?? 100;
      if (battery <= 0 && state !== "standby") {
        drone.triggerEvent("standby");
        const owner = getOwner(drone);
        if (owner?.isValid) {
          const controller = DRONE_REGISTRY.get(owner.id);
          if (controller) controller.shouldEnd = true;
          verifyPassiveDrone(owner);
        }
        continue;
      }
      if (state === "standby") continue;
      const progress = drone.getDynamicProperty("makercamp_dr:battery_drain_progress") ?? 0;
      const newProgress = progress + BATTERY_DRAIN_PER_TICK * BATTERY_UPDATE_INTERVAL;
      if (newProgress >= 1) {
        const newBattery = Math.max(0, battery - 1);
        drone.setProperty("makercamp_dr:battery", newBattery);
        drone.setDynamicProperty("makercamp_dr:battery_drain_progress", newProgress - 1);
        if (newBattery === 0) {
          drone.triggerEvent("standby");
          const owner = getOwner(drone);
          if (owner?.isValid) {
            const controller = DRONE_REGISTRY.get(owner.id);
            if (controller) controller.shouldEnd = true;
            verifyPassiveDrone(owner);
          }
        }
      } else {
        drone.setDynamicProperty("makercamp_dr:battery_drain_progress", newProgress);
      }
    }
  }
}, BATTERY_UPDATE_INTERVAL);
var REGENERATION_INTERVAL = 10 * TicksPerSecond13;
system13.runInterval(() => {
  for (const dimension of [world13.getDimension("overworld"), world13.getDimension("nether"), world13.getDimension("the_end")]) {
    const allDrones = dimension.getEntities({
      families: ["makercamp_dr:drone"]
    });
    for (const drone of allDrones) {
      if (!drone.isValid || !DRONES[drone.typeId]) continue;
      drone.addEffect("minecraft:regeneration", 1 * TicksPerSecond13, { amplifier: 2, showParticles: false });
    }
  }
}, REGENERATION_INTERVAL);

// ===== 编队视觉特效系统（只保留粒子链接，移除文字显示）=====
var FORMATION_LINK_PARTICLES = new Map();
system13.runInterval(() => {
  for (const [id, controller] of DRONE_REGISTRY) {
    const entity = controller.entity;
    if (!entity?.isValid) continue;
    const formation = getFormation(entity);
    if (!formation) continue;
    const nearby = entity.dimension.getEntities({
      location: entity.location,
      maxDistance: 10,
      families: ["makercamp_dr:drone"],
      propertyOptions: [{ propertyId: "makercamp_dr:state", value: "passive" }]
    });
    let linkCount = 0;
    for (const wingman of nearby) {
      if (wingman.id === entity.id) continue;
      if (linkCount >= 6) break;
      const from = wingman.location;
      const to = entity.location;
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const point = {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          z: from.z + (to.z - from.z) * t
        };
        let particle = "minecraft:end_rod";
        if (formation.key === "perfect") particle = "minecraft:totem_of_undying";
        else if (formation.key === "firepower") particle = "minecraft:flame";
        else if (formation.key === "support" || formation.key === "logistics") particle = "minecraft:spore_blossom_air";
        entity.dimension.spawnParticle(particle, point);
      }
      linkCount++;
    }
    // ★ 删除了原来的 setTitle 和 setActionBar 显示，避免冲突
  }
}, 10);

// ===== 强化版：被动无人机自动AI系统 =====
system13.runInterval(() => {
  const allDrones = [];
  for (const dim of ["overworld", "nether", "the_end"]) {
    try {
      allDrones.push(...world13.getDimension(dim).getEntities({
        families: ["makercamp_dr:drone"]
      }));
    } catch(e) {}
  }
  for (const drone of allDrones) {
    if (!drone.isValid) continue;
    const state = drone.getProperty("makercamp_dr:state");
    if (state !== "passive") continue;
    const battery = drone.getProperty("makercamp_dr:battery") ?? 100;
    if (battery <= 5) continue;
    const typeId = drone.typeId;
    const combatDrones = [
      "makercamp_dr:laser_drone",
      "makercamp_dr:freeze_drone",
      "makercamp_dr:crossbow_drone",
      "makercamp_dr:tnt_launcher_drone",
      "makercamp_dr:lightning_strike_drone",
      "makercamp_dr:poison_drone"
    ];
    if (combatDrones.includes(typeId)) {
      const mobs = drone.dimension.getEntities({
        location: drone.location,
        maxDistance: 24,
        families: ["monster"]
      });
      if (mobs.length > 0) {
        const target = mobs[0];
        try {
          const rot = getRotationTowards(drone.location, target.location);
          drone.setRotation(rot);
          if (system13.currentTick % 5 === 0) {
            if (typeId === "makercamp_dr:laser_drone") {
              drone.triggerEvent("makercamp_dr:laser_drone.shoot");
            } else if (typeId === "makercamp_dr:crossbow_drone") {
              drone.setProperty("makercamp_dr:shoot", true);
            } else if (typeId === "makercamp_dr:lightning_strike_drone") {
              target.addTag("makercamp_dr:lightning_strike_drone_target");
              drone.triggerEvent("makercamp_dr:lightning_strike_drone.set_target");
              drone.triggerEvent("makercamp_dr:lightning_strike_drone.shoot");
            } else if (typeId === "makercamp_dr:poison_drone") {
              target.addTag("makercamp_dr:poison_drone_target");
              drone.triggerEvent("makercamp_dr:poison_drone.set_target");
              drone.triggerEvent("makercamp_dr:poison_drone.shoot");
            }
          }
        } catch(e) {}
      }
    }
    if (typeId === "makercamp_dr:fertiliser_drone") {
      if (system13.currentTick % 40 === 0) {
        drone.triggerEvent("makercamp_dr:fertiliser_drone.grow");
      }
    }
    if (typeId === "makercamp_dr:summoner_drone") {
      const mobs = drone.dimension.getEntities({
        location: drone.location,
        maxDistance: 20,
        families: ["monster"]
      });
      if (mobs.length > 0 && system13.currentTick % 100 === 0) {
        drone.triggerEvent("makercamp_dr:summoner_drone.shoot");
      }
    }
  }
}, 10);

// ===== 强化版：低电预警系统 =====
system13.runInterval(() => {
  for (const dim of ["overworld", "nether", "the_end"]) {
    try {
      const drones = world13.getDimension(dim).getEntities({
        families: ["makercamp_dr:drone"]
      });
      for (const drone of drones) {
        if (!drone.isValid) continue;
        const battery = drone.getProperty("makercamp_dr:battery") ?? 100;
        const state = drone.getProperty("makercamp_dr:state");
        if (state === "standby") continue;
        if (battery <= 20 && battery > 10) {
          if (system13.currentTick % 60 === 0) {
            const owner = getOwner(drone);
            if (owner?.isValid) {
              owner.onScreenDisplay.setTitle({
                rawtext: [{ "text": "§6⚠ 无人机电量低: " + Math.floor(battery) + "%" }]
              }, { stayDuration: 40, fadeInDuration: 5, fadeOutDuration: 10 });
            }
          }
        }
        if (battery <= 10) {
          if (system13.currentTick % 30 === 0) {
            const owner = getOwner(drone);
            if (owner?.isValid) {
              owner.onScreenDisplay.setTitle({
                rawtext: [{ "text": "§c⚠⚠ 无人机即将待机: " + Math.floor(battery) + "%" }]
              }, { stayDuration: 30, fadeInDuration: 2, fadeOutDuration: 5 });
            }
          }
        }
      }
    } catch(e) {}
  }
}, 10);

// data/system_template_esbuild/subscripts/_controller_menu.ts
import { system as system14, EntityComponentTypes as EntityComponentTypes14, ItemStack as ItemStack2 } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
var DRONE_INTERFACES = {
  "makercamp_dr:ore_finder_drone": {
    interface: DRONE_INTERFACE_ORE_FINDER_DRONE
  },
  "makercamp_dr:item_collector_drone": {
    interface: DRONE_INTERFACE_ITEM_COLLECTOR_DRONE
  }
};
function MAIN_MENU(player) {
  if (!player.isValid) return;
  const passive_drones = player.dimension.getEntities({
    location: player.location,
    families: ["makercamp_dr:drone"],
    maxDistance: 32,
    closest: 16,
    propertyOptions: [
      {
        propertyId: "makercamp_dr:state",
        value: "passive"
      }
    ]
  }).filter((e) => e.getDynamicProperty("makercamp_dr:owner_id") === player.id);
  const standby_drones = player.dimension.getEntities({
    location: player.location,
    families: ["makercamp_dr:drone"],
    maxDistance: 32,
    closest: 16,
    propertyOptions: [
      {
        propertyId: "makercamp_dr:state",
        exclude: true,
        value: "passive"
      }
    ]
  }).filter((e) => e.getDynamicProperty("makercamp_dr:owner_id") === player.id);
  const form = new ActionFormData();
  form.title("无人机列表");
  form.body({ "rawtext": [
    { "text": `\xA7f            被动无人机: \xA7a${clamp(passive_drones.length, 0, PASSIVE_DRONES_LIMIT)}/5` }
  ] });
  form.divider();
  if (passive_drones.length <= 0) {
    form.label("暂无被动无人机.");
  }
  for (const drone of passive_drones) {
    const battery = drone.getProperty("makercamp_dr:battery") ?? 100;
    let name = {};
    name = { "translate": `${drone.localizationKey}` };
    if (drone.nameTag && drone.nameTag !== DRONES[drone.typeId].defaultName) {
      let nameTag = drone.nameTag.slice(0, 20);
      if (drone.nameTag.length > 20) nameTag += "...";
      name = { "text": nameTag };
    }
    const text = {
      "rawtext": [
        { "text": `\xA7q\xA7l[ \xA7r\xA7j` },
        name,
        { "text": `\xA7q\xA7l ]\xA7r\n\xA7s电池: ${battery}%%` }
      ]
    };
    form.button(text, `textures/makercamp/dr/items/${drone.typeId.replace("makercamp_dr:", "")}`);
  }
  form.divider();
  for (const drone of standby_drones) {
    const battery = drone.getProperty("makercamp_dr:battery") ?? 100;
    let name = {};
    name = { "translate": `${drone.localizationKey}` };
    if (drone.nameTag && drone.nameTag !== DRONES[drone.typeId].defaultName) {
      let nameTag = drone.nameTag.slice(0, 20);
      if (drone.nameTag.length > 20) nameTag += "...";
      name = { "text": nameTag };
    }
    const text = {
      "rawtext": [
        { "text": `\xA7r` },
        name,
        { "text": `\xA7r\n\xA7s电池: ${battery}%%` }
      ]
    };
    form.button(text, `textures/makercamp/dr/items/${drone.typeId.replace("makercamp_dr:", "")}`);
  }
  form.show(player).then((r) => {
    if (r.canceled) return;
    let i = 0;
    for (let drone of passive_drones) {
      if (r.selection == i) DRONE_INTERFACE(player, drone);
      i++;
    }
    for (let drone of standby_drones) {
      if (r.selection == i) DRONE_INTERFACE(player, drone);
      i++;
    }
  });
}
function DRONE_INTERFACE(player, drone) {
  if (!player.isValid || !drone.isValid) return;
  if (drone.typeId in DRONE_INTERFACES) {
    DRONE_INTERFACES[drone.typeId].interface(player, drone);
    return;
  }
  const form = new ActionFormData();
  const state = drone.getProperty("makercamp_dr:state");
  let name = {};
  name = { "translate": `${drone.localizationKey}` };
  if (drone.nameTag && drone.nameTag !== DRONES[drone.typeId].defaultName) {
    let nameTag = drone.nameTag;
    name = { "text": nameTag };
  }
  form.title(name);
  const battery = drone.getProperty("makercamp_dr:battery") ?? 100;
  const battery_text = batteryColored(battery);
  const battery_bar = batteryProgressBar(battery);
  form.body({ "rawtext": [
    { "text": `\xA77  电池: \xA78[ ${battery_bar} \xA78]\xA7r \xA7q ${battery_text}%%` }
  ] });
  form.divider();
  form.button("主动模式");
  const passive_drones_string = player.getDynamicProperty("makercamp_dr:player.passive_drones") ?? "[]";
  const passive_drones = JSON.parse(passive_drones_string);
  if (state === "passive") {
    form.button("\xA7q\xA7l[ \xA7r\xA7j被动模式\xA7q\xA7l ]");
  } else {
    if (passive_drones.length >= PASSIVE_DRONES_LIMIT) {
      form.button("\xA74被动模式\n\xA7r已达上限");
    } else {
      form.button("\xA7r被动模式");
    }
  }
  if (state === "standby") {
    form.button("\xA7q\xA7l[ \xA7r\xA7j待机模式\xA7q\xA7l ]");
  } else {
    form.button("\xA7r待机模式");
  }
  form.divider();
  form.label({ translate: `${drone.typeId}.description` });
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection === 0) {
      if (battery > 0) {
        new ControlledDrone3(player, drone);
      } else {
        system14.runTimeout(() => {
          if (!player.isValid || !drone.isValid) return;
          DRONE_INTERFACE(player, drone);
        }, 1);
      }
      return;
    }
    if (r.selection === 1) {
      verifyPassiveDrone(player);
      if (passive_drones.length < PASSIVE_DRONES_LIMIT && battery > 0) {
        drone.triggerEvent("passive");
        passive_drones.push(drone.id);
        player.setDynamicProperty("makercamp_dr:player.passive_drones", JSON.stringify(passive_drones));
      }
      system14.runTimeout(() => {
        if (!player.isValid || !drone.isValid) return;
        DRONE_INTERFACE(player, drone);
      }, 1);
      return;
    }
    if (r.selection === 2) {
      drone.triggerEvent("standby");
      verifyPassiveDrone(player);
      system14.runTimeout(() => {
        if (!player.isValid || !drone.isValid) return;
        DRONE_INTERFACE(player, drone);
      }, 1);
      return;
    }
    MAIN_MENU(player);
  });
}
var ORE_FINDER = {
  "coal": {
    "name": "Coal Ore",
    "texture": "textures/blocks/coal_ore"
  },
  "iron": {
    "name": "Iron Ore",
    "texture": "textures/blocks/iron_ore"
  },
  "gold": {
    "name": "Gold Ore",
    "texture": "textures/blocks/gold_ore"
  },
  "copper": {
    "name": "Copper Ore",
    "texture": "textures/blocks/copper_ore"
  },
  "redstone": {
    "name": "Redstone Ore",
    "texture": "textures/blocks/redstone_ore"
  },
  "lapis": {
    "name": "Lapis Lazuli Ore",
    "texture": "textures/blocks/lapis_ore"
  }
};
var oreKeys = Object.keys(ORE_FINDER);
function DRONE_INTERFACE_ORE_FINDER_DRONE(player, drone) {
  if (!player.isValid || !drone.isValid) return;
  const form = new ActionFormData();
  const state = drone.getProperty("makercamp_dr:state");
  let name = {};
  name = { "translate": `${drone.localizationKey}` };
  if (drone.nameTag && drone.nameTag !== DRONES[drone.typeId].defaultName) {
    let nameTag = drone.nameTag;
    name = { "text": nameTag };
  }
  form.title(name);
  const battery = drone.getProperty("makercamp_dr:battery") ?? 100;
  const battery_text = batteryColored(battery);
  const battery_bar = batteryProgressBar(battery);
  form.body({ "rawtext": [
    { "text": `\xA77  电池: \xA78[ ${battery_bar} \xA78]\xA7r \xA7q ${battery_text}%%` }
  ] });
  form.divider();
  form.button("主动模式");
  const passive_drones_string = player.getDynamicProperty("makercamp_dr:player.passive_drones") ?? "[]";
  const passive_drones = JSON.parse(passive_drones_string);
  if (state === "passive") {
    form.button("\xA7q\xA7l[ \xA7r\xA7j被动模式\xA7q\xA7l ]");
  } else {
    if (passive_drones.length >= PASSIVE_DRONES_LIMIT) {
      form.button("\xA74被动模式\n\xA7r已达上限");
    } else {
      form.button("\xA7r被动模式");
    }
  }
  if (state === "standby") {
    form.button("\xA7q\xA7l[ \xA7r\xA7jStandby Mode\xA7q\xA7l ]");
  } else {
    form.button("\xA7r待机模式");
  }
  form.divider();
  const ore_type = drone.getDynamicProperty("makercamp_dr.ore_finder_drone.ore") ?? "coal";
  const ore = ORE_FINDER[ore_type];
  form.button(`\xA7j已选择的矿石:\xA7r\n${ore.name}`, `${ore.texture}`);
  form.divider();
  form.label({ translate: `${drone.typeId}.description` });
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection === 0) {
      if (battery > 0) {
        new ControlledDrone3(player, drone);
      } else {
        system14.runTimeout(() => {
          if (!player.isValid || !drone.isValid) return;
          DRONE_INTERFACE(player, drone);
        }, 1);
      }
      return;
    }
    if (r.selection === 1) {
      verifyPassiveDrone(player);
      if (passive_drones.length < PASSIVE_DRONES_LIMIT && battery > 0) {
        drone.triggerEvent("passive");
        passive_drones.push(drone.id);
        player.setDynamicProperty("makercamp_dr:player.passive_drones", JSON.stringify(passive_drones));
      }
      system14.runTimeout(() => {
        if (!player.isValid || !drone.isValid) return;
        DRONE_INTERFACE(player, drone);
      }, 1);
      return;
    }
    if (r.selection === 2) {
      drone.triggerEvent("standby");
      verifyPassiveDrone(player);
      system14.runTimeout(() => {
        if (!player.isValid || !drone.isValid) return;
        DRONE_INTERFACE(player, drone);
      }, 1);
      return;
    }
    if (r.selection === 3) {
      if (!player.isValid || !drone.isValid) return;
      DRONE_INTERFACE_ORE_FINDER_DRONE_SELECT(player, drone);
      return;
    }
    MAIN_MENU(player);
  });
}
function DRONE_INTERFACE_ORE_FINDER_DRONE_SELECT(player, drone) {
  if (!player.isValid || !drone.isValid) return;
  const form = new ActionFormData();
  let name = {};
  name = { "translate": `${drone.localizationKey}` };
  if (drone.nameTag && drone.nameTag !== DRONES[drone.typeId].defaultName) {
    let nameTag = drone.nameTag;
    name = { "text": nameTag };
  }
  form.title(name);
  form.body({ "rawtext": [
    { "translate": "makercamp_dr:ore_finder_drone.select_ore" }
  ] });
  form.divider();
  const selected_ore = drone.getDynamicProperty("makercamp_dr.ore_finder_drone.ore") ?? "coal";
  for (const [key, ore] of Object.entries(ORE_FINDER)) {
    const isSelected = key === selected_ore;
    if (isSelected) {
      form.button(`\xA7q\xA7l[ \xA7r\xA7j${ore.name}\xA7q\xA7l ]`, ore.texture);
    } else {
      form.button(ore.name, ore.texture);
    }
  }
  form.divider();
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection !== void 0) {
      const selectedKey = oreKeys[r.selection];
      drone.setDynamicProperty("makercamp_dr.ore_finder_drone.ore", selectedKey);
      if (!player.isValid || !drone.isValid) return;
      DRONE_INTERFACE(player, drone);
      return;
    }
    MAIN_MENU(player);
  });
}
function DRONE_INTERFACE_ITEM_COLLECTOR_DRONE(player, drone) {
  if (!player.isValid || !drone.isValid) return;
  const form = new ActionFormData();
  const state = drone.getProperty("makercamp_dr:state");
  let name = {};
  name = { "translate": `${drone.localizationKey}` };
  if (drone.nameTag && drone.nameTag !== DRONES[drone.typeId].defaultName) {
    let nameTag = drone.nameTag;
    name = { "text": nameTag };
  }
  form.title(name);
  const battery = drone.getProperty("makercamp_dr:battery") ?? 100;
  const battery_text = batteryColored(battery);
  const battery_bar = batteryProgressBar(battery);
  form.body({ "rawtext": [
    { "text": `\xA77  电池: \xA78[ ${battery_bar} \xA78]\xA7r \xA7q ${battery_text}%%` }
  ] });
  form.divider();
  form.button("主动模式");
  const passive_drones_string = player.getDynamicProperty("makercamp_dr:player.passive_drones") ?? "[]";
  const passive_drones = JSON.parse(passive_drones_string);
  if (state === "passive") {
    form.button("\xA7q\xA7l[ \xA7r\xA7j被动模式\xA7q\xA7l ]");
  } else {
    if (passive_drones.length >= PASSIVE_DRONES_LIMIT) {
      form.button("\xA74被动模式\n\xA7r已达上限");
    } else {
      form.button("\xA7r被动模式");
    }
  }
  if (state === "standby") {
    form.button("\xA7q\xA7l[ \xA7r\xA7j待机模式\xA7q\xA7l ]");
  } else {
    form.button("\xA7r待机模式");
  }
  form.divider();
  const item_type = drone.getDynamicProperty("makercamp_dr:item_collector_drone.item_id") ?? void 0;
  let item = void 0;
  if (item_type) {
    try {
      item = new ItemStack2(item_type);
    } catch {}
  }
  if (item) {
    form.button({ "rawtext": [
      { "text": "\xA7j已选择物品:\xA7r\n" },
      { "translate": `${item.localizationKey}` }
    ] });
  } else {
    form.button({ "rawtext": [
      { "text": "\xA7j已选择物品:\xA7r\n" },
      { "text": "无" }
    ] });
  }
  form.divider();
  form.label({ translate: `${drone.typeId}.description` });
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection === 0) {
      if (battery > 0) {
        new ControlledDrone3(player, drone);
      } else {
        system14.runTimeout(() => {
          if (!player.isValid || !drone.isValid) return;
          DRONE_INTERFACE(player, drone);
        }, 1);
      }
      return;
    }
    if (r.selection === 1) {
      verifyPassiveDrone(player);
      if (passive_drones.length < PASSIVE_DRONES_LIMIT && battery > 0) {
        drone.triggerEvent("passive");
        passive_drones.push(drone.id);
        player.setDynamicProperty("makercamp_dr:player.passive_drones", JSON.stringify(passive_drones));
      }
      system14.runTimeout(() => {
        if (!player.isValid || !drone.isValid) return;
        DRONE_INTERFACE(player, drone);
      }, 1);
      return;
    }
    if (r.selection === 2) {
      drone.triggerEvent("standby");
      verifyPassiveDrone(player);
      system14.runTimeout(() => {
        if (!player.isValid || !drone.isValid) return;
        DRONE_INTERFACE(player, drone);
      }, 1);
      return;
    }
    if (r.selection === 3) {
      if (!player.isValid || !drone.isValid) return;
      DRONE_INTERFACE_ITEM_COLLECTOR_DRONE_SELECT(player, drone);
      return;
    }
    MAIN_MENU(player);
  });
}
function DRONE_INTERFACE_ITEM_COLLECTOR_DRONE_SELECT(player, drone) {
  if (!player.isValid || !drone.isValid) return;
  const form = new ActionFormData();
  let name = {};
  name = { "translate": `${drone.localizationKey}` };
  if (drone.nameTag && drone.nameTag !== DRONES[drone.typeId].defaultName) {
    let nameTag = drone.nameTag;
    name = { "text": nameTag };
  }
  form.title(name);
  form.body({ "rawtext": [
    { "translate": "makercamp_dr:item_collector_drone.select_item" }
  ] });
  form.divider();
  const tracked_item = drone.getDynamicProperty("makercamp_dr:item_collector_drone.item_id") ?? void 0;
  const inventory = player.getComponent(EntityComponentTypes14.Inventory);
  const container = inventory?.container;
  const itemTypeIds = [];
  if (container) {
    const uniqueItems = /* @__PURE__ */ new Map();
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);
      if (item && !uniqueItems.has(item.typeId)) {
        uniqueItems.set(item.typeId, item);
      }
    }
    const sortedEntries = Array.from(uniqueItems.entries()).sort((a, b) => {
      return a[0].localeCompare(b[0]);
    });
    for (const [typeId, item] of sortedEntries) {
      itemTypeIds.push(typeId);
      const isSelected = typeId === tracked_item;
      if (isSelected) {
        form.button({ "rawtext": [
          { "text": `\xA7q\xA7l[ \xA7r\xA7j` },
          { "translate": `${item.localizationKey}` },
          { "text": `\xA7q\xA7l ]\xA7r` }
        ] });
      } else {
        form.button({ "rawtext": [
          { "translate": `${item.localizationKey}` }
        ] });
      }
    }
  }
  form.divider();
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection !== void 0) {
      const selectedTypeId = itemTypeIds[r.selection];
      drone.setDynamicProperty("makercamp_dr:item_collector_drone.item_id", selectedTypeId);
      if (!player.isValid || !drone.isValid) return;
      DRONE_INTERFACE(player, drone);
      return;
    }
    MAIN_MENU(player);
  });
}

// data/system_template_esbuild/subscripts/_controller.ts
world15.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const player = event.player;
  if (DRONE_REGISTRY.has(player.id)) {
    event.cancel = true;
  }
});
world15.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  if (DRONE_REGISTRY.has(player.id)) {
    event.cancel = true;
  }
});
world15.beforeEvents.playerBreakBlock.subscribe((event) => {
  const player = event.player;
  if (DRONE_REGISTRY.has(player.id)) {
    event.cancel = true;
  }
});
world15.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const item = event.itemStack;
  if (item.typeId === "makercamp_dr:drone_controller") {
    verifyPassiveDrone(player);
    if (!DRONE_REGISTRY.has(player.id)) {
      MAIN_MENU(player);
    } else {
      const controller = DRONE_REGISTRY.get(player.id);
      if (controller) controller.isUsingItem = true;
    }
  }
});
world15.afterEvents.itemReleaseUse.subscribe((event) => {
  const player = event.source;
  const item = event.itemStack;
  if (player instanceof Player9 && item?.typeId === "makercamp_dr:drone_controller") {
    if (DRONE_REGISTRY.has(player.id)) {
      const controller = DRONE_REGISTRY.get(player.id);
      if (controller) controller.isUsingItem = false;
    }
  }
});
world15.afterEvents.entityLoad.subscribe((event) => {
  const entity = event.entity;
  if (DRONES[entity.typeId]) {
    const state = entity.getProperty("makercamp_dr:state");
    const owner_id = entity.getDynamicProperty("makercamp_dr:owner_id");
    if (state === "active") {
      if (!DRONE_REGISTRY.has(owner_id)) {
        entity.triggerEvent("standby");
      } else {
        const controller = DRONE_REGISTRY.get(owner_id);
        if (controller?.entity !== entity) {
          entity.triggerEvent("standby");
        }
      }
    }
    const owner = world15.getEntity(owner_id);
    if (owner?.isValid) {
      const passive_drones_string = owner.getDynamicProperty("makercamp_dr:player.passive_drones") ?? "[]";
      const passive_drones = JSON.parse(passive_drones_string);
      const droneIndex = passive_drones.findIndex((id) => id === entity.id);
      if (droneIndex === -1) {
        if (passive_drones.length >= PASSIVE_DRONES_LIMIT) {
          entity.triggerEvent("standby");
        } else {
          passive_drones.push(entity.id);
          owner.setDynamicProperty("makercamp_dr:player.passive_drones", JSON.stringify(passive_drones));
        }
      } else if (droneIndex >= PASSIVE_DRONES_LIMIT) {
        entity.triggerEvent("standby");
      }
    }
  }
});
var DRONE_REGISTRY = /* @__PURE__ */ new Map();
system15.runInterval(() => {
  for (const entry of DRONE_REGISTRY) {
    entry[1].tick();
  }
});
function verifyPassiveDrone(player) {
  cleanupUnregisteredDrones(player);
  const passive_drones_string = player.getDynamicProperty("makercamp_dr:player.passive_drones") ?? "[]";
  const passive_drones = JSON.parse(passive_drones_string);
  const validDrones = passive_drones.filter((id) => {
    const drone = world15.getEntity(id);
    if (!drone?.isValid) return false;
    const state = drone.getProperty("makercamp_dr:state");
    return state === "passive";
  });
  if (validDrones.length > PASSIVE_DRONES_LIMIT) {
    for (let i = PASSIVE_DRONES_LIMIT; i < validDrones.length; i++) {
      const drone = world15.getEntity(validDrones[i]);
      if (drone?.isValid) {
        drone.triggerEvent("standby");
      }
    }
  }
  player.setDynamicProperty("makercamp_dr:player.passive_drones", JSON.stringify(validDrones.slice(0, PASSIVE_DRONES_LIMIT)));
}
function cleanupUnregisteredDrones(player) {
  const passive_drones_string = player.getDynamicProperty("makercamp_dr:player.passive_drones") ?? "[]";
  const passive_drones = JSON.parse(passive_drones_string);
  const allDrones = player.dimension.getEntities({
    families: ["makercamp_dr:drone"]
  });
  for (const drone of allDrones) {
    if (!drone.isValid) continue;
    const state = drone.getProperty("makercamp_dr:state");
    if (state !== "passive") continue;
    const owner_id = drone.getDynamicProperty("makercamp_dr:owner_id");
    if (owner_id !== player.id) continue;
    if (!passive_drones.includes(drone.id)) {
      drone.triggerEvent("standby");
    }
  }
}
function onReload2(player) {
  verifyPassiveDrone(player);
  const inputPermission = player.inputPermissions;
  inputPermission.setPermissionCategory(InputPermissionCategory2.MoveBackward, true);
  inputPermission.setPermissionCategory(InputPermissionCategory2.MoveForward, true);
  inputPermission.setPermissionCategory(InputPermissionCategory2.MoveLeft, true);
  inputPermission.setPermissionCategory(InputPermissionCategory2.MoveRight, true);
  inputPermission.setPermissionCategory(InputPermissionCategory2.Jump, true);
  inputPermission.setPermissionCategory(InputPermissionCategory2.Sneak, true);
  player.camera.clear();
  player.removeTag("makercamp_dr_controlling_player");
}
system15.runTimeout(() => {
  const players = world15.getAllPlayers();
  for (const player of players) {
    if (player.hasTag("makercamp_dr_controlling_player")) onReload2(player);
  }
});
var ControlledDrone3 = class {
  constructor(player, entity) {
    __publicField(this, "player");
    __publicField(this, "entity");
    __publicField(this, "id");
    __publicField(this, "lastPosition");
    __publicField(this, "horizontalVelocityX", 0);
    __publicField(this, "horizontalVelocityZ", 0);
    __publicField(this, "verticalVelocity", 0);
    __publicField(this, "lockedMovement", 0);
    __publicField(this, "actionbarNote");
    __publicField(this, "actionbarNoteTime", 0);
    __publicField(this, "isUsingItem", false);
    __publicField(this, "abilityController");
    __publicField(this, "ability_bar", "       \xA7aACTIVE!        ");
    __publicField(this, "abilityStartDelay", 0);
    __publicField(this, "abilityMaxStartDelay", 0);
    __publicField(this, "abilityStopDelay", 0);
    __publicField(this, "abilityMaxStopDelay", 0);
    __publicField(this, "abilityMineBlockProgress", /* @__PURE__ */ new Map());
    __publicField(this, "abilityPower", 0);
    __publicField(this, "abilityMaxPower", 0);
    __publicField(this, "abilityPowerRegenDelay", 0);
    __publicField(this, "abilityPowerRegenStart", 0);
    __publicField(this, "abilityAttachedEntity");
    __publicField(this, "inputHintTime", 0);
    __publicField(this, "inputHintTimeMax", 6 * TicksPerSecond15);
    __publicField(this, "finishedInputHint", false);
    __publicField(this, "selectedSlot");
    __publicField(this, "initialRotation");
    __publicField(this, "horizontalSpeed");
    __publicField(this, "verticalSpeed");
    __publicField(this, "waterSpeedMultiplier");
    __publicField(this, "airSpeedMultiplier");
    __publicField(this, "verticalAcceleration");
    __publicField(this, "verticalDeceleration");
    __publicField(this, "horizontalAcceleration");
    __publicField(this, "horizontalDeceleration");
    __publicField(this, "distance", 0);
    __publicField(this, "distanceCooldown", 0);
    __publicField(this, "maxDistance");
    __publicField(this, "currentSpeed", 0);
    __publicField(this, "shouldEnd", false);
    __publicField(this, "initDelay", 0);
    __publicField(this, "initFinished", false);
    this.player = player;
    this.entity = entity;
    this.lastPosition = this.entity.location;
    this.player.camera.fade({
      fadeColor: { red: 0, green: 0, blue: 0 },
      fadeTime: {
        fadeInTime: 0.3,
        holdTime: 0.2,
        fadeOutTime: 0.5
      }
    });
    this.initDelay = 0.4 * TicksPerSecond15;
    this.id = player.id;
    this.selectedSlot = player.selectedSlotIndex;
    this.initialRotation = player.getRotation();
    const SETTINGS = DRONES[this.entity.typeId];
    this.horizontalSpeed = SETTINGS.horizontalSpeed ?? 0.9;
    this.verticalSpeed = SETTINGS.verticalSpeed ?? 0.9;
    this.abilityController = SETTINGS.abilityController ?? void 0;
    this.verticalAcceleration = SETTINGS.verticalAcceleration ?? 0.1;
    this.verticalDeceleration = SETTINGS.verticalDeceleration ?? 0.2;
    this.horizontalAcceleration = SETTINGS.horizontalAcceleration ?? 0.1;
    this.horizontalDeceleration = SETTINGS.horizontalDeceleration ?? 0.2;
    this.waterSpeedMultiplier = SETTINGS.waterSpeedMultiplier ?? 0.5;
    this.airSpeedMultiplier = SETTINGS.airSpeedMultiplier ?? 1;
    this.maxDistance = SETTINGS.maxDistance ?? 128;
    DRONE_REGISTRY.set(this.player.id, this);
    this.entity.triggerEvent("active");
    this.player.addTag("makercamp_dr_controlling_player");
    const inputPermission = this.player.inputPermissions;
    inputPermission.setPermissionCategory(InputPermissionCategory2.MoveBackward, false);
    inputPermission.setPermissionCategory(InputPermissionCategory2.MoveForward, false);
    inputPermission.setPermissionCategory(InputPermissionCategory2.MoveLeft, false);
    inputPermission.setPermissionCategory(InputPermissionCategory2.MoveRight, false);
    inputPermission.setPermissionCategory(InputPermissionCategory2.Jump, false);
    inputPermission.setPermissionCategory(InputPermissionCategory2.Sneak, true);
  }
  init() {
    this.player.setPropertyOverrideForEntity(this.entity, "makercamp_dr:controlled_by_player", true);
    this.player.tryTeleport(this.player.location, {
      rotation: this.entity.getRotation()
    });
    if (this.entity.isValid && this.entity.typeId === "makercamp_dr:night_vision_drone") {
      this.player.playSound("makercamp_dr.drone.night_vision", { location: this.entity.location });
    }
  }
  tick() {
    if (!this.player.isValid || !this.entity.isValid) {
      this.end();
      return;
    }
    if (system15.currentTick % 10 === 0) {
      const item = this.player.getComponent(EntityComponentTypes15.Equippable)?.getEquipment(EquipmentSlot2.Mainhand);
      if (!item || item?.typeId !== "makercamp_dr:drone_controller") {
        this.shouldEnd = true;
      }
    }
    if (this.selectedSlot !== this.player.selectedSlotIndex || this.shouldEnd) {
      this.end();
      return;
    }
    this.distance = getDistance(this.player.location, this.entity.location);
    if (!this.initFinished) {
      this.initDelay -= 1;
      if (this.initDelay <= 0) {
        this.init();
        this.initFinished = true;
      } else {
        return;
      }
    }
    if (this.abilityController) {
      this.abilityController(this);
    }
    this.setRotation();
    this.setCamera();
    this.updateMovement();
    this.actionbar();
  }
  setRotation() {
    this.entity.setRotation(this.player.getRotation());
    this.player.playAnimation("animation.makercamp_dr.player.controlling_drone", {
      blendOutTime: 1,
      nextState: "none",
      stopExpression: `v.initial_x = ${this.initialRotation.x}; v.initial_y = ${this.initialRotation.y};`
    });
  }
  // ★ 修改后的 actionbar() - 整合护盾和编队信息
  actionbar() {
    const location = this.entity.location;
    const battery = this.entity.getProperty("makercamp_dr:battery") ?? 100;
    const battery_bar = batteryProgressBar(battery);
    let distance = getDistance(this.player.location, this.entity.location);
    distance = clamp(distance, 0, 999);
    let distance_spacing = "       ";
    if (distance >= 10) {
      distance_spacing = "     ";
    }
    if (distance >= 100) {
      distance_spacing = "    ";
    }
    const distancePercent = distance / this.maxDistance * 100;
    let distance_color = "\xA7f";
    if (distancePercent >= 75) {
      distance_color = "\xA76";
    }
    if (distancePercent >= 85) {
      distance_color = "\xA7c";
    }
    if (distancePercent >= 95) {
      distance_color = "\xA74";
    }

    // ★ 获取护盾信息
    let shieldText = "";
    if (typeof DRONE_SHIELDS !== "undefined") {
      const shieldData = DRONE_SHIELDS.get(this.entity.id);
      if (shieldData && shieldData.shield > 0) {
        const shieldPercent = Math.floor((shieldData.shield / shieldData.maxShield) * 100);
        const color = shieldPercent > 60 ? "§a" : shieldPercent > 30 ? "§e" : "§c";
        const filled = Math.ceil(shieldPercent / 10);
        const empty = 10 - filled;
        shieldText = `§7护盾: §8[ ${color}${"█".repeat(filled)}§8${"█".repeat(empty)} §8] §f${shieldPercent}%  `;
      }
    }

    // ★ 获取编队信息
    let formationText = "";
    if (typeof getFormation !== "undefined") {
      const formation = getFormation(this.entity);
      if (formation) {
        const stats = formation.stats;
        const boost = formation.boosts;
        let boostShort = "";
        if (boost.damage > 1) boostShort += ` §cDMG${boost.damage.toFixed(2)}`;
        if (boost.attackSpeed > 1) boostShort += ` §bSPD${boost.attackSpeed.toFixed(2)}`;
        if (boost.shieldRegen > 1) boostShort += ` §dSHLD${boost.shieldRegen.toFixed(2)}`;
        if (boost.energyRegen > 1) boostShort += ` §eNRG${boost.energyRegen.toFixed(2)}`;
        const shortName = formation.shortName || formation.name;
        formationText = `${shortName} ${formation.color}×${stats.total}${boostShort}  `;
      }
    }

    // ★ 构建三行 ActionBar
    let actionbarText = "";
    // 第一行：电池 + 能力
    actionbarText += `§7电池: §8[ ${battery_bar} §8]`;
    actionbarText += "       ";
    actionbarText += `§7能力: §8[ ${this.ability_bar} §8]`;
    actionbarText += "\n";
    // 第二行：速度 + 距离 + 位置
    actionbarText += `§7速度: §f${this.currentSpeed.toFixed(2)}`;
    actionbarText += "       ";
    actionbarText += `§7距离: ${distance_color}${distance.toFixed(2)}`;
    actionbarText += distance_spacing;
    actionbarText += `§7位置: §8[ §f${location.x.toFixed(0)}§7, §f${location.y.toFixed(0)}§7, §f${location.z.toFixed(0)} §8]`;
    // ★ 第三行：护盾 + 编队信息
    const extraInfo = shieldText + formationText;
    if (extraInfo) {
      actionbarText += "\n" + extraInfo;
    }

    this.player.onScreenDisplay.setActionBar({ "text": actionbarText });
  }
  end() {
    const player = this.player;
    if (player.isValid) {
      const inputPermission = player.inputPermissions;
      inputPermission.setPermissionCategory(InputPermissionCategory2.MoveBackward, true);
      inputPermission.setPermissionCategory(InputPermissionCategory2.MoveForward, true);
      inputPermission.setPermissionCategory(InputPermissionCategory2.MoveLeft, true);
      inputPermission.setPermissionCategory(InputPermissionCategory2.MoveRight, true);
      inputPermission.setPermissionCategory(InputPermissionCategory2.Jump, true);
      inputPermission.setPermissionCategory(InputPermissionCategory2.Sneak, true);
      player.camera.clear();
      player.camera.fade({
        fadeColor: { red: 0, green: 0, blue: 0 },
        fadeTime: {
          fadeInTime: 0,
          holdTime: 0.2,
          fadeOutTime: 0.5
        }
      });
      player.onScreenDisplay.setActionBar({ "text": "\xA7r" });
      player.tryTeleport(player.location, { rotation: this.initialRotation });
      if (this.entity.isValid) {
        player.setPropertyOverrideForEntity(this.entity, "makercamp_dr:controlled_by_player", false);
        player.removePropertyOverrideForEntity(this.entity, "makercamp_dr:controlled_by_player");
      }
    }
    const entity = this.entity;
    if (entity.isValid) {
      if (entity.getProperty("makercamp_dr:is_shooting") ?? void 0) entity.setProperty("makercamp_dr:is_shooting", false);
      if (player.isValid) {
        if (getDistance(player.location, entity.location) > 24) {
          entity.tryTeleport(player.location);
        }
      }
      system15.runTimeout(() => {
        if (entity.isValid) {
          if (player.isValid) {
            verifyPassiveDrone(player);
            const passive_drones_string = player.getDynamicProperty("makercamp_dr:player.passive_drones") ?? "[]";
            const passive_drones = JSON.parse(passive_drones_string);
            const validDrones = passive_drones.filter((id) => {
              const drone = world15.getEntity(id);
              return drone?.isValid;
            });
            if (validDrones.length >= PASSIVE_DRONES_LIMIT) {
              entity.triggerEvent("standby");
            } else {
              entity.triggerEvent("passive");
              if (!validDrones.includes(entity.id)) {
                validDrones.push(entity.id);
                player.setDynamicProperty("makercamp_dr:player.passive_drones", JSON.stringify(validDrones));
              }
            }
          } else {
            entity.triggerEvent("standby");
          }
        }
      }, 1);
    }
    DRONE_REGISTRY.delete(this.id);
  }
  setCamera() {
    const rotation = this.player.getRotation();
    const position = this.entity.location;
    position.y += 0.1;
    this.player.camera.setCamera("minecraft:free", {
      location: position,
      rotation: {
        x: rotation.x,
        y: rotation.y
      },
      easeOptions: {
        easeTime: 0.25,
        easeType: EasingType2.Linear
      }
    });
  }
  updateMovement() {
    const speedMultiplier = this.entity.isInWater ? this.waterSpeedMultiplier : this.airSpeedMultiplier;
    let effectiveVerticalSpeed = this.verticalSpeed * speedMultiplier;
    let effectiveHorizontalSpeed = this.horizontalSpeed * speedMultiplier;
    if (this.lockedMovement > system15.currentTick) {
      effectiveHorizontalSpeed = 0;
      effectiveVerticalSpeed = 0;
    }
    const input = this.player.inputInfo;
    const jump = input.getButtonState(InputButton2.Jump);
    const sneak = input.getButtonState(InputButton2.Sneak);
    let targetVerticalVelocity = 0;
    let verticalInputs = 0;
    if (jump === ButtonState2.Pressed || this.player.isJumping) {
      verticalInputs += 1;
      targetVerticalVelocity = effectiveVerticalSpeed;
    }
    if (sneak === ButtonState2.Pressed || this.player.isSneaking) {
      verticalInputs += 1;
      targetVerticalVelocity = -effectiveVerticalSpeed;
    }
    if (verticalInputs === 2) targetVerticalVelocity = 0;
    const acceleration = targetVerticalVelocity > this.verticalVelocity ? this.verticalAcceleration : this.verticalDeceleration;
    this.verticalVelocity = this.lerp(
      this.verticalVelocity,
      targetVerticalVelocity,
      acceleration
    );
    const movement = input.getMovementVector();
    const yaw = this.entity.getRotation().y * (Math.PI / 180);
    let targetHorizontalVelocityX = 0;
    let targetHorizontalVelocityZ = 0;
    const moveMagnitude = Math.sqrt(movement.x * movement.x + movement.y * movement.y);
    if (moveMagnitude > 0) {
      const normalizedX = movement.x / moveMagnitude;
      const normalizedY = movement.y / moveMagnitude;
      const forwardX = -Math.sin(yaw);
      const forwardZ = Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = Math.sin(yaw);
      targetHorizontalVelocityX = (normalizedX * rightX + normalizedY * forwardX) * effectiveHorizontalSpeed;
      targetHorizontalVelocityZ = (normalizedX * rightZ + normalizedY * forwardZ) * effectiveHorizontalSpeed;
    }
    if (moveMagnitude > 0) {
      this.horizontalVelocityX = this.lerp(
        this.horizontalVelocityX,
        targetHorizontalVelocityX,
        this.horizontalAcceleration
      );
      this.horizontalVelocityZ = this.lerp(
        this.horizontalVelocityZ,
        targetHorizontalVelocityZ,
        this.horizontalAcceleration
      );
      const speed = this.length2D(this.horizontalVelocityX, this.horizontalVelocityZ);
      if (speed > effectiveHorizontalSpeed) {
        const scale = effectiveHorizontalSpeed / speed;
        this.horizontalVelocityX *= scale;
        this.horizontalVelocityZ *= scale;
      }
    } else {
      this.horizontalVelocityX *= 1 - this.horizontalDeceleration;
      this.horizontalVelocityZ *= 1 - this.horizontalDeceleration;
      if (this.length2D(this.horizontalVelocityX, this.horizontalVelocityZ) < 0.01) {
        this.horizontalVelocityX = 0;
        this.horizontalVelocityZ = 0;
      }
    }
    const pos = this.entity.location;
    const nextPosition = {
      x: pos.x + this.horizontalVelocityX,
      y: pos.y + this.verticalVelocity,
      z: pos.z + this.horizontalVelocityZ
    };
    const knockbackStrength = Math.min(this.currentSpeed ?? 0.6, 0.6) * 2;
    if (this.distance < this.maxDistance || system15.currentTick < this.distanceCooldown) {
      this.entity.tryTeleport(nextPosition, {
        checkForBlocks: true,
        dimension: this.entity.dimension
      });
    } else {
      this.distanceCooldown = system15.currentTick + 5;
      const directionX = this.player.location.x - this.entity.location.x;
      const directionY = this.player.location.y - this.entity.location.y;
      const directionZ = this.player.location.z - this.entity.location.z;
      const dirLength = Math.sqrt(directionX * directionX + directionY * directionY + directionZ * directionZ);
      if (dirLength > 0) {
        const normalizedDirX = directionX / dirLength;
        const normalizedDirY = directionY / dirLength;
        const normalizedDirZ = directionZ / dirLength;
        this.horizontalVelocityX = normalizedDirX * knockbackStrength;
        this.horizontalVelocityZ = normalizedDirZ * knockbackStrength;
        this.verticalVelocity = normalizedDirY * knockbackStrength;
        this.entity.tryTeleport({
          x: this.entity.location.x + normalizedDirX * knockbackStrength,
          y: this.entity.location.y + normalizedDirY * knockbackStrength,
          z: this.entity.location.z + normalizedDirZ * knockbackStrength
        }, {
          checkForBlocks: true,
          dimension: this.entity.dimension
        });
      }
    }
    if (!this.lastPosition) this.lastPosition = { ...this.entity.location };
    const dx = this.entity.location.x - this.lastPosition.x;
    const dy = this.entity.location.y - this.lastPosition.y;
    const dz = this.entity.location.z - this.lastPosition.z;
    this.currentSpeed = this.length3D(dx, dy, dz);
    this.lastPosition = { ...this.entity.location };
  }
  length2D(x, z) {
    return Math.sqrt(x * x + z * z);
  }
  length3D(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z);
  }
  lerp(current, target, t) {
    return current + (target - current) * t;
  }
};
world15.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;
  if (entity.typeId === "minecraft:item") {
    const item = entity.getComponent(EntityComponentTypes15.Item)?.itemStack;
    if (!item) return;
    if (item.typeId === "makercamp_dr:drone_controller") {
      const players = entity.dimension.getEntities({
        type: "minecraft:player",
        location: entity.location,
        maxDistance: 3
      });
      if (players.length <= 0) return;
      const player = players.find(
        (p) => p.getRotation().x === entity.getRotation().x && p.getRotation().y === entity.getRotation().y
      );
      if (!player) return;
      if (DRONE_REGISTRY.has(player.id)) {
        const controller = DRONE_REGISTRY.get(player.id);
        if (controller) controller.shouldEnd = true;
        const clone = item.clone();
        player.dimension.spawnItem(clone, player.location);
        entity.remove();
      }
    }
  }
});

// data/system_template_esbuild/subscripts/_drone_spawn.ts
import { world as world16, system as system16, EntityComponentTypes as EntityComponentTypes16, ItemStack as ItemStack4 } from "@minecraft/server";
var USED_SPAWN_EGG = /* @__PURE__ */ new Map();
var SPAWNED_TAG = "makercamp_dr:spawned";
world16.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const player = event.player;
  const item = event.itemStack;
  if (!player || !item) return;
  const id = item.typeId.replace("_spawn_egg", "");
  if (id in DRONES) {
    const lore = item.getLore();
    const text = lore[0];
    if (text) {
      const match = text.match(/(\d+)%/);
      if (match) {
        const battery = parseInt(match[1]);
        USED_SPAWN_EGG.set(player.id, { tick: system16.currentTick, battery });
      }
    } else {
      USED_SPAWN_EGG.set(player.id, { tick: system16.currentTick, battery: 100 });
    }
  }
});
world16.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;
  if (!(entity.typeId in DRONES)) return;
  if (entity.hasTag(SPAWNED_TAG)) return;
  const players = entity.dimension.getPlayers({
    location: entity.location,
    maxDistance: 12
  });
  for (const player of players) {
    const tick = USED_SPAWN_EGG.get(player.id)?.tick;
    if (tick === system16.currentTick) {
      const location = entity.location;
      const drone = entity.dimension.spawnEntity(entity.typeId, { x: location.x, y: entity.dimension.heightRange.max, z: location.z });
      drone.setRotation(entity.getRotation());
      drone.addTag(SPAWNED_TAG);
      const tameable = drone.getComponent(EntityComponentTypes16.Tameable);
      tameable?.tame(player);
      const defaultName = DRONES[entity.typeId].defaultName ?? void 0;
      if (defaultName) {
        drone.nameTag = defaultName;
      }
      drone.teleport(location, { rotation: entity.getRotation() });
      drone.setDynamicProperty("makercamp_dr:owner_id", player.id);
      const battery = USED_SPAWN_EGG.get(player.id)?.battery;
      if (battery) drone.setProperty("makercamp_dr:battery", battery);
      entity.remove();
      return;
    }
  }
  entity.dimension.spawnItem(new ItemStack4(entity.typeId + "_spawn_egg"), entity.location);
  entity.remove();
});

// data/system_template_esbuild/subscripts/_drone_death.ts
import { system as system17 } from "@minecraft/server";
system17.afterEvents.scriptEventReceive.subscribe((event) => {
  const id = event.id;
  const entity = event.sourceEntity;
  if (entity && id === "makercamp_dr:drone.death") {
    if (!entity.nameTag || DRONES[entity.typeId].defaultName) entity.nameTag = format_name(entity.typeId);
    entity.triggerEvent("death");
  }
});
function format_name(typeId) {
  let name = typeId.replace("makercamp_dr:", "").replace(/_/g, " ");
  return titleCase(name);
}
function titleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

// data/system_template_esbuild/subscripts/_drone_effects.ts
import { system as system18, TicksPerSecond as TicksPerSecond16 } from "@minecraft/server";
var EFFECTS = {
  "makercamp_dr:spy_drone": [
    {
      id: "minecraft:jump_boost",
      duration: 16 * TicksPerSecond16
    }
  ],
  "makercamp_dr:race_drone": [
    {
      id: "minecraft:speed",
      duration: 16 * TicksPerSecond16
    }
  ],
  "makercamp_dr:night_vision_drone": [
    {
      id: "minecraft:night_vision",
      duration: 16 * TicksPerSecond16
    }
  ],
  "makercamp_dr:mob_transporter_drone": [
    {
      id: "minecraft:speed",
      duration: 16 * TicksPerSecond16
    }
  ],
  "makercamp_dr:ore_finder_drone": [
    {
      id: "minecraft:haste",
      duration: 16 * TicksPerSecond16
    }
  ],
  "makercamp_dr:mining_drone": [
    {
      id: "minecraft:haste",
      duration: 16 * TicksPerSecond16
    }
  ],
  "makercamp_dr:water_drone": [
    {
      id: "minecraft:water_breathing",
      duration: 16 * TicksPerSecond16
    }
  ]
};
system18.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (!entity?.isValid || id !== "makercamp_dr:drone.effect") return;
  if (!(entity.typeId in EFFECTS)) return;
  const effects = EFFECTS[entity.typeId];
  const player = getOwner(entity);
  if (!player?.isValid) return;
  if (getDistance(player.location, entity.location) > 16) return;
  for (const effect of effects) {
    player.addEffect(effect.id, effect.duration, { amplifier: effect.amplifier ?? 0, showParticles: effect.showParticles ?? false });
  }
});

// data/system_template_esbuild/subscripts/_drone_sounds.ts
import { world as world18, system as system19, TicksPerSecond as TicksPerSecond17 } from "@minecraft/server";
system19.runInterval(() => {
  PASSIVE_FLY();
  ACTIVE_FLY();
}, 0.7 * TicksPerSecond17);
var DRONE_LIST = /* @__PURE__ */ new Map();
function PASSIVE_FLY() {
  for (const drone of DRONE_LIST) {
    const entity = drone[1];
    if (!entity.isValid) {
      DRONE_LIST.delete(drone[0]);
      continue;
    }
    if (entity.getProperty("makercamp_dr:state") !== "passive") continue;
    const players = entity.dimension.getPlayers({ location: entity.location, maxDistance: 16 });
    for (const player of players) {
      const VOLUME = player.getDynamicProperty("makercamp_dr:settings.drone_fly_volume.passive") ?? 1;
      player.playSound("makercamp_dr.drone.passive.fly", { location: entity.location, volume: VOLUME });
    }
  }
}
function ACTIVE_FLY() {
  for (const drone of DRONE_LIST) {
    const entity = drone[1];
    if (!entity.isValid) {
      DRONE_LIST.delete(drone[0]);
      continue;
    }
    if (entity.getProperty("makercamp_dr:state") !== "active") continue;
    const owner = getOwner(entity);
    if (!owner) continue;
    const controller = DRONE_REGISTRY.get(owner.id);
    if (controller?.entity !== entity) {
      continue;
    }
    const VOLUME = owner.getDynamicProperty("makercamp_dr:settings.drone_fly_volume.active") ?? 1;
    owner.playSound("makercamp_dr.drone.active.fly", { volume: VOLUME, location: entity.location });
  }
}
world18.afterEvents.entityLoad.subscribe((event) => {
  const entity = event.entity;
  if (DRONES[entity.typeId] && !DRONE_LIST.has(entity.id)) {
    DRONE_LIST.set(entity.id, entity);
  }
});
system19.runTimeout(() => { onReload3(); });
function onReload3() {
  ["overworld", "nether", "the_end"].forEach((dimensionId) => {
    for (const drone of world18.getDimension(dimensionId).getEntities({ families: ["makercamp_dr:drone"] })) {
      if (drone.isValid && DRONES[drone.typeId] && !DRONE_LIST.has(drone.id)) {
        DRONE_LIST.set(drone.id, drone);
      }
    }
  });
}
system19.runInterval(() => {
  const players = world18.getAllPlayers();
  for (const player of players) {
    const drones = player.dimension.getEntities({ families: ["makercamp_dr:drone"], maxDistance: 16 });
    for (const drone of drones) {
      if (drone.isValid && DRONES[drone.typeId] && !DRONE_LIST.has(drone.id)) {
        DRONE_LIST.set(drone.id, drone);
      }
    }
  }
}, 10 * TicksPerSecond17);
world18.afterEvents.entityRemove.subscribe((event) => {
  const id = event.removedEntityId;
  for (const [key, drone] of DRONE_LIST) {
    if (!drone.isValid || drone.id === id) {
      DRONE_LIST.delete(key);
    }
  }
});

// data/system_template_esbuild/subscripts/_guide.ts
import { world as world19, Player as Player13 } from "@minecraft/server";
import { ActionFormData as ActionFormData2, ModalFormData } from "@minecraft/server-ui";
world19.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const item = event.itemStack;
  if (player instanceof Player13 && item.typeId === "makercamp_dr:guidebook") {
    GUIDE_MENU(player);
  }
});
function GUIDE_MENU(player) {
  if (!player.isValid) return;
  player.playSound("item.book.page_turn", { pitch: 1, volume: 1 });
  const form = new ActionFormData2();
  form.title("无人机 Add-On");
  form.body({ "rawtext": [
    { text: "\xA76                  欢迎!\n\n" },
    { text: "\xA7r\xA7f这个附加包添加了 \xA7b无人机\xA7f 拥有主动和被动能力." }
  ] });
  form.divider();
  form.button({ "text": "无人机控制器" }, `textures/makercamp/dr/items/drone_controller`);
  form.button({ "text": "电池" }, `textures/makercamp/dr/items/battery`);
  form.button({ "text": "无人机芯片" }, `textures/makercamp/dr/items/drone_chip_3`);
  form.divider();
  form.button({ "text": "社交媒体" }, "textures/ui/icon_multiplayer");
  form.button({ "text": "设置" }, "textures/ui/settings_glyph_color_2x");
  form.divider();
  const DRONE_LIST2 = Object.entries(DRONES).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of DRONE_LIST2) {
    form.button({ "translate": `entity.${key}.name` }, `textures/makercamp/dr/items/${key.replace("makercamp_dr:", "")}`);
  }
  form.divider();
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection == 0) ITEM_MENU(player, "makercamp_dr:drone_controller");
    if (r.selection == 1) ITEM_MENU(player, "makercamp_dr:battery");
    if (r.selection == 2) DRONE_CHIPS_MENU(player);
    if (r.selection == 3) SOCIALS_MENU(player);
    if (r.selection == 4) SETTINGS_MENU(player);
    let i = 5;
    for (const [key, value] of DRONE_LIST2) {
      if (r.selection == i) DRONE_MENU(player, key);
      i++;
    }
  });
}
function SETTINGS_MENU(player) {
  if (!player.isValid) return;
  player.playSound("item.book.page_turn", { pitch: 1, volume: 1 });
  const form = new ModalFormData().title("设置");
  let current = player.getDynamicProperty("makercamp_dr:settings.drone_fly_volume.passive") ?? 1;
  form.slider("无人机被动模式飞行音量", 0, 100, { "defaultValue": current * 100, "valueStep": 5 });
  current = player.getDynamicProperty("makercamp_dr:settings.drone_fly_volume.active") ?? 1;
  form.slider("无人机主动模式飞行音量", 0, 100, { "defaultValue": current * 100, "valueStep": 5 });
  form.submitButton("保存");
  form.show(player).then((formData) => {
    if (formData.canceled) return;
    if (formData.formValues === void 0) {
      GUIDE_MENU(player);
      return;
    }
    const values = formData.formValues;
    player.setDynamicProperty("makercamp_dr:settings.drone_fly_volume.passive", values[0] / 100);
    player.setDynamicProperty("makercamp_dr:settings.drone_fly_volume.active", values[1] / 100);
    GUIDE_MENU(player);
  });
}
function ITEM_MENU(player, item) {
  if (!player.isValid) return;
  player.playSound("item.book.page_turn", { pitch: 1, volume: 1 });
  const form = new ActionFormData2();
  const name = { "translate": `item.${item}` };
  form.title(name);
  form.body({ "rawtext": [
    { "translate": `${item}.description` }
  ] });
  form.divider();
  form.label("\xA76\xA7l合成配方\xA7r");
  form.label({ "translate": `${item}.recipe` });
  form.divider();
  form.button("返回");
  form.show(player).then((r) => {
    if (r.canceled) return;
    GUIDE_MENU(player);
  });
}
function DRONE_CHIPS_MENU(player) {
  if (!player.isValid) return;
  player.playSound("item.book.page_turn", { pitch: 1, volume: 1 });
  const form = new ActionFormData2();
  const name = { "text": "Drone Chips" };
  form.title(name);
  form.body({ "rawtext": [
    { "translate": `makercamp_dr:drone_chips.description` }
  ] });
  form.divider();
  form.label("\xA76\xA7l无人机芯片 T1 合成配方\xA7r");
  form.label({ "translate": `makercamp_dr:drone_chip_1.recipe` });
  form.divider();
  form.label("\xA76\xA7l无人机芯片 T2 合成配方\xA7r");
  form.label({ "translate": `makercamp_dr:drone_chip_2.recipe` });
  form.divider();
  form.label("\xA76\xA7l无人机芯片 T3 合成配方\xA7r");
  form.label({ "translate": `makercamp_dr:drone_chip_3.recipe` });
  form.divider();
  form.button("返回");
  form.show(player).then((r) => {
    if (r.canceled) return;
    GUIDE_MENU(player);
  });
}
function DRONE_MENU(player, drone) {
  if (!player.isValid) return;
  player.playSound("item.book.page_turn", { pitch: 1, volume: 1 });
  const form = new ActionFormData2();
  const name = { "translate": `entity.${drone}.name` };
  form.title(name);
  form.body({ "rawtext": [
    { "translate": `${drone}.description` }
  ] });
  form.divider();
  form.label("\xA76\xA7l合成配方\xA7r");
  form.label({ "translate": `${drone}.recipe` });
  form.divider();
  form.button("返回");
  form.show(player).then((r) => {
    if (r.canceled) return;
    GUIDE_MENU(player);
  });
}
function SOCIALS_MENU(player) {
  if (!player.isValid) return;
  player.playSound("item.book.page_turn", { pitch: 1, volume: 1 });
  const form = new ActionFormData2().title({ text: "Socials" }).body({ rawtext: [
    { text: "\xA76         Check out our socials:\xA7f\n\n" },
    { text: "\xA7b- Website:\xA7f \nhttps://maker\xA7fcamp.it\n\n" },
    { text: "\xA7b- Discord:\xA7f \nhttps://maker\xA7fcamp.it/discord\n\n" },
    { text: "\xA7b- TikTok:\xA7f \nhttps://www.tiktok.com/@maker\xA7fcampit\n\n" },
    { text: "\xA7b- X:\xA7f \nhttps://x.com/Maker\xA7fCampIt\n\n" },
    { text: "" }
  ] }).divider().button("返回");
  form.show(player).then((r) => {
    if (r.canceled) return;
    GUIDE_MENU(player);
  });
}

// data/system_template_esbuild/subscripts/_give_guide.ts
import { world as world20 } from "@minecraft/server";
var TAG = "makercamp_dr:guidebook";
world20.afterEvents.playerSpawn.subscribe((event) => {
  givePlayerEq(event.player);
});
function givePlayerEq(player) {
  player.runCommand(`execute as @s[tag=!${TAG}] at @s run loot spawn ~ ~ ~ loot "makercamp/dr/guide.loot"`);
  player.addTag(TAG);
}

// data/system_template_esbuild/subscripts/inventory_drone.ts
import { system as system21, world as world21 } from "@minecraft/server";
world21.afterEvents.playerInteractWithEntity.subscribe((event) => {
  const entity = event.target;
  if (entity.typeId === "makercamp_dr:inventory_drone") {
    system21.runTimeout(() => {
      if (entity.isValid && entity.hasTag("OPEN")) entity.setProperty("makercamp_dr:inventory_open", true);
    }, 1);
  }
});

// data/system_template_esbuild/subscripts/item_collector_drone.ts
import { system as system22, EntityComponentTypes as EntityComponentTypes20, ItemStack as ItemStack6 } from "@minecraft/server";
var RADIUS = 12;
var TARGETED_ITEMS = /* @__PURE__ */ new Map();
system22.afterEvents.scriptEventReceive.subscribe((event) => {
  const entity = event.sourceEntity;
  const id = event.id;
  if (entity?.typeId === "makercamp_dr:item_collector_drone" && id === "makercamp_dr:item_collector_drone.shoot") {
    checkForItems(entity);
  }
});
function checkForItems(entity) {
  const target_id = entity.getDynamicProperty("makercamp_dr:item_collector_drone.item_id") ?? void 0;
  if (!target_id) return;
  const targetItem = new ItemStack6(target_id);
  const container = entity.getComponent(EntityComponentTypes20.Inventory)?.container;
  if (!container) return;
  if (!canAddItem(container, targetItem)) {
    if (TARGETED_ITEMS.has(entity)) TARGETED_ITEMS.delete(entity);
    return;
  }
  const items = entity.dimension.getEntities({
    location: entity.location,
    maxDistance: 1.5,
    type: "minecraft:item"
  });
  let success = 0;
  for (const item of items) {
    const itemStack = item.getComponent(EntityComponentTypes20.Item)?.itemStack;
    if (itemStack?.typeId === target_id) {
      entity.setProperty("makercamp_dr:is_shooting", true);
      const inventory = entity.getComponent(EntityComponentTypes20.Inventory);
      if (inventory?.container) {
        const remainingItem = inventory.container.addItem(itemStack);
        if (!remainingItem || remainingItem.amount < itemStack.amount) {
          const location = item.location;
          success += 1;
          item.remove();
          if (remainingItem && remainingItem.amount > 0) {
            entity.dimension.spawnItem(remainingItem, location);
          }
        }
      }
      system22.runTimeout(() => {
        if (entity.isValid) entity.setProperty("makercamp_dr:is_shooting", false);
      }, 1);
    }
  }
  if (success > 0) {
    entity.dimension.playSound("random.pop", entity.location, { pitch: 0.9, volume: 0.5 });
  }
  const target_items = entity.dimension.getEntities({
    location: entity.location,
    maxDistance: RADIUS,
    type: "minecraft:item"
  }).filter((item) => !TARGETED_ITEMS.get(entity)?.includes(item));
  for (const item of target_items) {
    const itemStack = item.getComponent(EntityComponentTypes20.Item)?.itemStack;
    if (itemStack?.typeId === target_id) {
      const currentList = TARGETED_ITEMS.get(entity) ?? [];
      currentList.push(item);
      TARGETED_ITEMS.set(entity, currentList);
    }
  }
}
function canAddItem(container, itemStack) {
  if (container.emptySlotsCount > 0) {
    return true;
  }
  for (let i = 0; i < container.size; i++) {
    const slot = container.getItem(i);
    if (slot && slot.typeId === itemStack.typeId) {
      if (slot.amount + itemStack.amount <= slot.maxAmount) {
        return true;
      }
    }
  }
  return false;
}
system22.runInterval(() => {
  for (const [entity, items] of TARGETED_ITEMS) {
    if (!entity.isValid) {
      TARGETED_ITEMS.delete(entity);
      continue;
    }
    const validItems = items.filter((item) => {
      if (!item.isValid) {
        return false;
      }
      const location = entity.location;
      const dx = location.x - item.location.x;
      const dy = location.y - item.location.y;
      const dz = location.z - item.location.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance > 1.4) {
        const force = Math.min(0.1, distance * 0.05);
        item.applyImpulse({
          x: dx / distance * force,
          y: dy / distance * force,
          z: dz / distance * force
        });
      } else {
        location.y -= 1;
        item.tryTeleport(location, {
          checkForBlocks: true
        });
      }
      return true;
    });
    TARGETED_ITEMS.set(entity, validItems);
    if (validItems.length === 0) {
      TARGETED_ITEMS.delete(entity);
    }
  }
}, 1);