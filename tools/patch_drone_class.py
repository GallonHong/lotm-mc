import re

drone_class_code = '''import { world, system, EntityComponentTypes } from "@minecraft/server";
import { DRONE_REGISTRY } from "./DroneConstants.js";
import { DroneGarageManager } from "./DroneGarageManager.js";
import { DownedRescueManager } from "../rescue/DownedRescueManager.js";

/**
 * 战术无人机 20 TPS 物理伴飞、火控自瞄与技能中枢
 */
export class DroneClass {
 static activeDrones = new Map(); // playerId -> DroneRuntimeData
 static lastTick = 0;

 /**
  * 注册出战伴飞无人机
  */
 static registerActiveDrone(player, entity, droneId, hangarEntry) {
  const config = DRONE_REGISTRY[droneId];
  if (!config) return;

  const maxHp = config.baseHp + (hangarEntry.hpLvl || 0) * 15;
  const damageBonus = 1.0 + (hangarEntry.atkLvl || 0) * 0.12;
  const cdReduction = 1.0 - (hangarEntry.skillLvl || 0) * 0.08;

  try {
   const healthComp = entity.getComponent(EntityComponentTypes.Health);
   if (healthComp) {
    healthComp.resetToMaxValue();
   }
  } catch {}

  // 初始化实体客户端同步属性
  try {
   entity.setProperty("makercamp_dr:state", "passive");
   entity.setProperty("makercamp_dr:controlled_by_player", false);
   entity.setProperty("makercamp_dr:is_shooting", false);
  } catch {}

  this.activeDrones.set(player.id, {
   player,
   entity,
   droneId,
   config,
   durability: hangarEntry.durability,
   maxDurability: hangarEntry.maxDurability,
   fuel: hangarEntry.fuel,
   maxHp,
   damageBonus,
   cdReduction,
   manualMode: false,
   lastFireTick: 0,
   lastManualFireTick: 0,
   lastFlightSoundTick: 0,
   manualShotCount: 0,
   skillCooldowns: new Map(), // skillId -> readyTick
   autoReviveCooldownTick: 0,
   accumulatedDamage: 0
  });
 }

 static unregisterActiveDrone(playerId) {
  this.activeDrones.delete(playerId);
 }

 static getActiveDrone(playerId) {
  return this.activeDrones.get(playerId);
 }

 /**
  * 切换手动第一人称火控 / 自动伴飞模式
  */
 static toggleManualMode(player) {
  const drone = this.getActiveDrone(player.id);
  if (!drone || !drone.entity || !drone.entity.isValid()) {
   player.sendMessage("§c[战术机库] 当前无出战伴飞的无人机！");
   return;
  }

  drone.manualMode = !drone.manualMode;
  try {
   drone.entity.setProperty("makercamp_dr:controlled_by_player", Boolean(drone.manualMode));
  } catch {}

  if (drone.manualMode) {
   player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
   player.sendMessage("§a[战术遥控] 已切换至【手动遥控火控模式】！");
   player.sendMessage("§f手持【无人机遥控器】右键瞄准目标即可开火！");
   player.sendMessage("§e再次点击菜单按钮或按潜行(Sneak)即可退出手动模式。");
   player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
   player.runCommandAsync("playsound random.click @s ~~~ 0.8 1.5");
  } else {
   player.sendMessage("§b[战术机载网络] 已切回【自主伴飞协同模式】。");
   player.runCommandAsync("playsound random.pop @s ~~~ 0.8 1.0");
  }
 }

 /**
  * 触发无人机射击开火动画 (驱动 ac.shoot 动画状态机)
  */
 static triggerDroneShootingAnimation(entity) {
  try {
   entity.setProperty("makercamp_dr:is_shooting", true);
   system.runTimeout(() => {
    try {
     if (entity && entity.isValid()) {
      entity.setProperty("makercamp_dr:is_shooting", false);
     }
    } catch {}
   }, 6);
  } catch {}
 }

 /**
  * 播放无人机开火射击 3D 音效
  */
 static playDroneShootSound(entity, drone) {
  try {
   let soundId = "makercamp_dr.drone.shoot";
   let volume = 0.8;
   let pitch = 1.0;

   if (drone.droneId === "aurora" || drone.droneId === "specter") {
    soundId = "makercamp_dr.drone.laser_beam";
    volume = 0.85;
    pitch = 1.3;
   } else if (drone.droneId === "destroyer" || drone.config?.fireType === "incendiary") {
    soundId = "makercamp_dr.drone.heavy_shoot";
    volume = 0.85;
    pitch = 1.05;
   }

   entity.runCommandAsync(`playsound ${soundId} @a ~~~ ${volume} ${pitch}`);
  } catch {}
 }

 /**
  * 绘制子弹弹道轨迹与枪口火花
  */
 static drawDroneBulletTracer(dimension, startLoc, endLoc, drone) {
  if (!dimension || !startLoc || !endLoc) return;

  const sx = Number(startLoc.x);
  const sy = Number(startLoc.y);
  const sz = Number(startLoc.z);
  const ex = Number(endLoc.x);
  const ey = Number(endLoc.y);
  const ez = Number(endLoc.z);

  const dx = ex - sx;
  const dy = ey - sy;
  const dz = ez - sz;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.2) return;

  // 1. 枪口火花
  try {
   dimension.spawnParticle("test_gun:muzzle_flash_circle", { x: sx, y: sy, z: sz });
  } catch {}

  // 2. 弹道粒子选型与步长
  let particle = "test_gun:bullet_tracer";
  let stepSize = 0.65;

  if (drone.droneId === "aurora" || drone.droneId === "specter") {
   particle = "test_gun:arc_beam";
   stepSize = 0.50;
  } else if (drone.droneId === "destroyer" || drone.config?.fireType === "incendiary") {
   particle = "test_gun:pkm_burn";
   stepSize = 0.60;
  } else if (drone.droneId === "punisher") {
   particle = "test_gun:vector_tracer";
   stepSize = 0.55;
  }

  const steps = Math.min(Math.max(3, Math.floor(dist / stepSize)), 45);
  for (let i = 1; i <= steps; i++) {
   const frac = i / steps;
   const px = sx + dx * frac;
   const py = sy + dy * frac;
   const pz = sz + dz * frac;
   try {
    dimension.spawnParticle(particle, { x: px, y: py, z: pz });
   } catch {
    try {
     dimension.spawnParticle("minecraft:critical_hit_emitter", { x: px, y: py, z: pz });
    } catch {}
   }
  }

  // 3. 终点击中火花
  try {
   dimension.spawnParticle("test_gun:bullet_hit_spark", { x: ex, y: ey, z: ez });
  } catch {}
 }

 /**
  * 手动远程瞄准射击
  */
 static fireManualBullet(player) {
  const drone = this.getActiveDrone(player.id);
  if (!drone || !drone.entity || !drone.entity.isValid()) return;

  if (drone.fuel <= 0) {
   player.sendMessage("§c[战术遥控] 无人机能量耗尽，无法射击！");
   return;
  }

  const currentTick = system.currentTick;
  if (currentTick - (drone.lastManualFireTick || 0) < 6) return; // 0.3s 射击CD
  drone.lastManualFireTick = currentTick;

  const headLoc = player.getHeadLocation();
  const viewDir = player.getViewDirection();
  const rot = player.getRotation();

  try {
   drone.entity.setRotation(rot);
  } catch {}

  const muzzleLoc = {
   x: drone.entity.location.x,
   y: drone.entity.location.y + 0.2,
   z: drone.entity.location.z
  };

  let endLoc = {
   x: headLoc.x + viewDir.x * 32,
   y: headLoc.y + viewDir.y * 32,
   z: headLoc.z + viewDir.z * 32
  };

  // 计算射程内命中的实体 (射线检测 32米)
  try {
   const hit = player.dimension.getEntitiesFromRay(headLoc, viewDir, {
    maxDistance: 32,
    excludeEntities: [player.id, drone.entity.id]
   });

   if (hit && hit.length > 0) {
    const target = hit[0].entity;
    if (target && target.isValid()) {
     endLoc = {
      x: target.location.x,
      y: target.location.y + 0.8,
      z: target.location.z
     };
     const baseDamage = drone.config.baseDamage * drone.damageBonus * 1.2;
     target.applyDamage(baseDamage);
     if (drone.config.fireType === "incendiary") {
      target.setOnFire(3, false);
     }
    }
   }
  } catch {}

  // 触发武器开火动画、开火音效与弹道轨迹
  this.triggerDroneShootingAnimation(drone.entity);
  this.playDroneShootSound(drone.entity, drone);
  this.drawDroneBulletTracer(drone.entity.dimension, muzzleLoc, endLoc, drone);

  // 极小消耗耐久 (每射击10发扣1点耐久)
  drone.manualShotCount = (drone.manualShotCount || 0) + 1;
  if (drone.manualShotCount >= 10) {
   drone.durability = Math.max(0, drone.durability - 1);
   drone.manualShotCount = 0;
  }
 }

 /**
  * 初始化主循环与受伤监听
  */
 static init() {
  console.warn("[DroneClass] Drone Combat and Flight Engine initializing...");

  // 20 TPS 伴飞与火控主循环
  system.runInterval(() => {
   this.updateAllDrones();
  }, 1);

  // 无人机受伤监听：累计受创折算耐久，HP归零触发坠机殉爆
  if (world.afterEvents?.entityHurt) {
   world.afterEvents.entityHurt.subscribe((event) => {
    const hurtEntity = event.hurtEntity;
    if (!hurtEntity || !hurtEntity.isValid()) return;

    // 检查是否为玩家出战的无人机
    for (const [ownerId, drone] of this.activeDrones) {
     if (drone.entity && drone.entity.id === hurtEntity.id) {
      const dmg = Number(event.damage || 0);
      drone.accumulatedDamage += dmg;

      // 累计每受到 30 点伤害，扣除 1 点机身耐久
      if (drone.accumulatedDamage >= 30) {
       const pts = Math.floor(drone.accumulatedDamage / 30);
       drone.durability = Math.max(0, drone.durability - pts);
       drone.accumulatedDamage %= 30;
      }

      // 检查生命值是否归零
      const hpComp = hurtEntity.getComponent(EntityComponentTypes.Health);
      if (!hpComp || hpComp.currentValue <= 1) {
       // 剧烈殉爆效果
       try {
        hurtEntity.dimension.spawnParticle("minecraft:huge_explosion_emitter", hurtEntity.location);
        hurtEntity.runCommandAsync("playsound random.explode @a ~~~ 1.0 1.2");
        hurtEntity.remove();
       } catch {}

       DroneGarageManager.onDroneCrash(ownerId, drone.droneId);
      }
      break;
     }
    }
   });
  }
 }

 /**
  * 主循环推进
  */
 static updateAllDrones() {
  const currentTick = system.currentTick;

  for (const [ownerId, drone] of this.activeDrones) {
   const player = drone.player;
   const entity = drone.entity;

   // 1. 基础有效性检测
   if (!player || !player.isValid() || !entity || !entity.isValid()) {
    DroneGarageManager.recallDrone(player, false);
    continue;
   }

   // 潜行自动退出手动操控模式
   if (drone.manualMode && player.isSneaking) {
    drone.manualMode = false;
    try {
     entity.setProperty("makercamp_dr:controlled_by_player", false);
    } catch {}
    player.sendMessage("§b[战术机载网络] 已切回自主伴飞协同模式。");
   }

   // 2. 维度检测与超远距离传送
   if (entity.dimension.id !== player.dimension.id) {
    entity.teleport(player.location, { dimension: player.dimension });
    continue;
   }

   const pLoc = player.location;
   const eLoc = entity.location;
   const distSq = (pLoc.x - eLoc.x) ** 2 + (pLoc.y - eLoc.y) ** 2 + (pLoc.z - eLoc.z) ** 2;

   if (distSq > 36 * 36) {
    // 距离超过 36 格，瞬间跃迁召回身边
    entity.teleport({ x: pLoc.x, y: pLoc.y + 2.0, z: pLoc.z });
    continue;
   }

   // 3. 伴飞物理位移、状态同步与飞行声效
   this.handleFollowingFlight(drone, player, entity, pLoc, eLoc, currentTick);

   // 4. 电量燃油消耗计算 (每 600 tick 消耗 1%)
   if (currentTick % 600 === 0) {
    drone.fuel = Math.max(0, drone.fuel - 1);
    DroneGarageManager.notifyFuelDecile(player, drone.fuel);
   }

   // 5. 倒地自动救援协议 (高级与典藏机型)
   if (drone.config.autoRevive && currentTick >= drone.autoReviveCooldownTick) {
    if (DownedRescueManager.isPlayerDowned(player)) {
     drone.autoReviveCooldownTick = currentTick + 60 * 20; // 60s CD
     drone.durability = Math.max(0, drone.durability - 2);

     player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
     player.sendMessage(`§a[紧急生命协议] ${drone.config.name} §a检测到主人生命垂危！`);
     player.sendMessage("§a正在启动全功率机载电除颤与心肺复苏程序...");
     player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

     try {
      entity.dimension.spawnParticle("minecraft:totem_particle", pLoc);
      entity.runCommandAsync("playsound beacon.activate @a ~~~ 1.0 1.5");
     } catch {}

     system.runTimeout(() => {
      DownedRescueManager.revivePlayer(player, `${drone.config.name}`);
     }, 10);
     continue;
    }
   }

   // 6. 技能自动研判与触发
   this.handleSkillTriggers(drone, player, entity, currentTick);

   // 7. 自瞄与火控射击 (仅在非手动模式下自动射击)
   if (!drone.manualMode) {
    this.handleAutoCombat(drone, player, entity, currentTick);
   }
  }
 }

 /**
  * 伴飞平滑物理悬浮、动态姿态与电机音效
  */
 static handleFollowingFlight(drone, player, entity, pLoc, eLoc, currentTick) {
  let targetX, targetY, targetZ;

  if (drone.manualMode) {
   const viewDir = player.getViewDirection();
   targetX = pLoc.x + viewDir.x * 2.0;
   targetY = pLoc.y + 1.8 + viewDir.y * 0.5;
   targetZ = pLoc.z + viewDir.z * 2.0;
  } else {
   const rad = (player.getRotation().y * Math.PI) / 180;
   targetX = pLoc.x - Math.sin(rad) * 1.6;
   targetY = pLoc.y + 2.1;
   targetZ = pLoc.z + Math.cos(rad) * 1.6;
  }

  const vx = (targetX - eLoc.x) * 0.18;
  const vy = (targetY - eLoc.y) * 0.18;
  const vz = (targetZ - eLoc.z) * 0.18;

  const distMoved = Math.hypot(vx, vy, vz);
  const isMoving = distMoved > 0.04;

  // 动态同步实体动画状态 (active: 倾斜向前冲刺飞行; passive: 平稳悬停漂浮)
  const animState = isMoving ? "active" : "passive";
  try {
   entity.setProperty("makercamp_dr:state", animState);
   entity.setProperty("makercamp_dr:controlled_by_player", Boolean(drone.manualMode));
  } catch {}

  // 飞行/悬停电机轰鸣音效循环 (每 14 tick / 28 tick 播放一次 3D 引擎声)
  const soundInterval = isMoving ? 14 : 28;
  if (currentTick - (drone.lastFlightSoundTick || 0) >= soundInterval) {
   drone.lastFlightSoundTick = currentTick;
   try {
    if (isMoving) {
     entity.runCommandAsync("playsound makercamp_dr.drone.active.fly @a ~~~ 0.35 1.1");
    } else {
     entity.runCommandAsync("playsound makercamp_dr.drone.passive.fly @a ~~~ 0.20 0.95");
    }
   } catch {}
  }

  try {
   entity.teleport({
    x: eLoc.x + vx,
    y: eLoc.y + vy,
    z: eLoc.z + vz
   }, {
    rotation: player.getRotation()
   });
  } catch {}
 }

 /**
  * 自动伴飞交火射击
  */
 static handleAutoCombat(drone, player, entity, currentTick) {
  if (currentTick - drone.lastFireTick < drone.config.fireIntervalTicks) return;

  // 扫描周围 20 格内的敌对怪物
  const nearbyMonsters = entity.dimension.getEntities({
   location: entity.location,
   maxDistance: 20,
   families: ["monster"]
  });

  if (nearbyMonsters.length === 0) return;

  const target = nearbyMonsters[0];
  if (!target || !target.isValid()) return;

  drone.lastFireTick = currentTick;

  // 转向目标
  const rot = this.getRotationTowards(entity.location, target.location);
  try { entity.setRotation(rot); } catch {}

  const muzzleLoc = {
   x: entity.location.x,
   y: entity.location.y + 0.2,
   z: entity.location.z
  };

  const targetCenter = {
   x: target.location.x,
   y: target.location.y + 0.8,
   z: target.location.z
  };

  // 触发武器射击动画与 3D 音效
  this.triggerDroneShootingAnimation(entity);
  this.playDroneShootSound(entity, drone);

  // 计算 Test Guns 风格伤害与穿甲
  const baseDamage = drone.config.baseDamage * drone.damageBonus;
  const pellets = drone.config.pellets || 1;

  for (let i = 0; i < pellets; i++) {
   try {
    target.applyDamage(baseDamage);
   } catch {}

   // 多弹丸散布弹道 (霰弹机型微量偏移，单发直射)
   const spreadX = pellets > 1 ? (Math.random() - 0.5) * 0.4 : 0;
   const spreadY = pellets > 1 ? (Math.random() - 0.5) * 0.4 : 0;
   const spreadZ = pellets > 1 ? (Math.random() - 0.5) * 0.4 : 0;

   const pelletEnd = {
    x: targetCenter.x + spreadX,
    y: targetCenter.y + spreadY,
    z: targetCenter.z + spreadZ
   };

   this.drawDroneBulletTracer(entity.dimension, muzzleLoc, pelletEnd, drone);
  }

  // 燃烧弹点燃怪物
  if (drone.config.fireType === "incendiary") {
   try { target.setOnFire(3, false); } catch {}
  }
 }

 /**
  * 战术技能自动研判与触发
  */
 static handleSkillTriggers(drone, player, entity, currentTick) {
  for (const skill of drone.config.skills) {
   const readyTick = drone.skillCooldowns.get(skill.id) || 0;
   if (currentTick < readyTick) continue;

   let shouldTrigger = false;

   // 触发器 A：主人残血急救 (owner_low_hp)
   if (skill.trigger === "owner_low_hp") {
    const hpComp = player.getComponent(EntityComponentTypes.Health);
    if (hpComp && hpComp.currentValue / hpComp.effectiveMax <= (skill.threshold || 0.3)) {
     shouldTrigger = true;
     // 执行治疗
     const healAmount = skill.id === "high_aid" || skill.id === "abyssal_heal" ? 10 : 6;
     hpComp.setCurrentValue(Math.min(hpComp.effectiveMax, hpComp.currentValue + healAmount));
     player.addEffect("regeneration", 120, { amplifier: skill.id === "high_aid" ? 1 : 0, showParticles: false });
     player.sendMessage(`§a[机载急救] ${drone.config.name} §a紧急注射医疗针！生命瞬间回复 §e+${healAmount}§a。`);
     try { entity.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.4"); } catch {}
    }
   }

   // 触发器 B：战术交火增益 (combat_buff / combat_active)
   else if (skill.trigger === "combat_buff" || skill.trigger === "combat_active") {
    const mobs = entity.dimension.getEntities({ location: entity.location, maxDistance: 16, families: ["monster"] });
    if (mobs.length >= 2) {
     shouldTrigger = true;
     if (skill.id === "adrenaline_shot") {
      player.addEffect("speed", 160, { amplifier: 1, showParticles: false });
      player.addEffect("resistance", 160, { amplifier: 0, showParticles: false });
      player.sendMessage(`§6[战术超频] 肾上腺素注射完成！移速提升且伤害减免已就绪(8秒)。`);
     } else if (skill.id === "gale_buff") {
      player.addEffect("absorption", 160, { amplifier: 0, showParticles: false });
      player.addEffect("speed", 160, { amplifier: 0, showParticles: false });
      player.sendMessage(`§b[战术增幅] 战意注入完成！获得额外吸收护盾与战术机动(8秒)。`);
     } else if (skill.id === "abyssal_matrix") {
      player.addEffect("strength", 200, { amplifier: 1, showParticles: false });
      player.addEffect("absorption", 200, { amplifier: 0, showParticles: false });
      player.sendMessage(`§d[终极矩阵] 深渊超频矩阵全开！力量大幅提升，终极防御已激活(10秒)。`);
     }
    }
   }

   // 触发器 C：单体高爆/榴弹 (combat_target)
   else if (skill.trigger === "combat_target") {
    const mobs = entity.dimension.getEntities({ location: entity.location, maxDistance: 18, families: ["monster"] });
    if (mobs.length > 0) {
     shouldTrigger = true;
     const t = mobs[0];
     try {
      t.applyDamage(skill.burstDamage || 35);
      entity.dimension.spawnParticle("minecraft:large_explosion", t.location);
      entity.runCommandAsync("playsound random.explode @s ~~~ 0.8 1.4");
      this.triggerDroneShootingAnimation(entity);
      const muzzleLoc = { x: entity.location.x, y: entity.location.y + 0.2, z: entity.location.z };
      const targetCenter = { x: t.location.x, y: t.location.y + 0.8, z: t.location.z };
      this.drawDroneBulletTracer(entity.dimension, muzzleLoc, targetCenter, drone);
      player.sendMessage(`§c[火控打击] ${drone.config.name} §c释放【${skill.name}】对目标造成重创！`);
     } catch {}
    }
   }

   if (shouldTrigger) {
    // 扣除 1 点机身耐久
    drone.durability = Math.max(0, drone.durability - 1);
    // 技能 CD 折算
    const cd = Math.floor(skill.cooldownTicks * drone.cdReduction);
    drone.skillCooldowns.set(skill.id, currentTick + cd);
   }
  }
 }

 static getRotationTowards(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const yaw = Math.atan2(-dx, dz) * (180 / Math.PI);
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  const pitch = -Math.atan2(dy, horizontalDistance) * (180 / Math.PI);
  return { x: pitch, y: yaw };
 }
}
'''

with open(r'addons\\development\\apocalypse_life_addon\\apocalypse_life_bp\\scripts\\drones\\DroneClass.js', 'w', encoding='utf-8') as f:
    f.write(drone_class_code)
print('Wrote DroneClass.js successfully')
