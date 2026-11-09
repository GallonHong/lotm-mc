import { world, system, EntityComponentTypes, InputButton, ButtonState, EasingType } from "@minecraft/server";
import { DroneEffects } from "./DroneEffects.js";
import { ManualControlSession } from "./ManualControlSession.js";
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
   isRescuing: false,
   manualShotCount: 0,
   skillCooldowns: new Map(), // skillId -> readyTick
   autoReviveCooldownTick: 0,
   accumulatedDamage: 0
  });
 }

 static unregisterActiveDrone(playerId) {
  const drone = this.activeDrones.get(playerId);
  if (drone?.manualMode) this.exitManualControl(drone.player);
  this.activeDrones.delete(playerId);
 }

 static getActiveDrone(playerId) {
  return this.activeDrones.get(playerId);
 }

 static isPlayerInManualControl(player) {
  if (!player) return false;
  const drone = this.getActiveDrone(player.id);
  return Boolean(drone && drone.manualMode);
 }

 static toggleManualMode(player) {
  if (this.isPlayerInManualControl(player)) {
   this.exitManualControl(player);
  } else {
   this.enterManualControl(player);
  }
 }

 /**
  * 立即进入无人机第一人称视角 (FPV 视角与全向物理飞控)
  */
 static enterManualControl(player) {
  const drone = this.getActiveDrone(player.id);
  if (!drone || !drone.entity || !drone.entity.isValid()) {
   player.sendMessage("§c[战术机库] 当前无出战伴飞的无人机！");
   return;
  }

  if (drone.fuel <= 0) {
   player.sendMessage("§c[战术机载网络] 无人机电量已耗尽，无法进入遥控视角！");
   return;
  }

  if (drone.manualMode) {
   this.exitManualControl(player);
   return;
  }

  try {
   drone.controlSession = ManualControlSession.begin(player);
  } catch (error) {
   player.sendMessage(`§c[战术遥控] ${error.message}`);
   return;
  }
  drone.manualMode = true;
  drone.manualFiring = false;
  drone.controllingPlayer = player;
  drone.controlSlotIndex = drone.controlSession.slot;
  drone.sneakHoldTicks = 0;
  drone.lastManualFireTick = -Infinity;

  // 3. 切换第一人称自由相机到无人机机头
  const droneLoc = drone.entity.location;
  const rot = player.getRotation();
  const eyePos = { x: droneLoc.x, y: droneLoc.y + 0.15, z: droneLoc.z };

  try {
   player.camera.fade({
    fadeColor: { red: 0, green: 0, blue: 0 },
    fadeTime: { fadeInTime: 0.15, holdTime: 0.1, fadeOutTime: 0.25 }
   });
  } catch {}

  try {
   player.camera.setCamera("minecraft:free", {
    location: eyePos,
    rotation: { x: rot.x, y: rot.y },
    easeOptions: { easeTime: 0.1, easeType: EasingType.Linear }
   });
  } catch (error) {
   this.exitManualControl(player);
   player.sendMessage(`§c[战术遥控] 相机初始化失败：${error}`);
   return;
  }

  // 4. 设置无人机实体属性
  try {
   drone.entity.setProperty("makercamp_dr:controlled_by_player", true);
   drone.entity.setProperty("makercamp_dr:state", "active");
  } catch {}

  // 5. 提示音效与指引
  player.runCommandAsync("playsound beacon.activate @s ~~~ 0.8 1.4");
  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  player.sendMessage(`§a[战术接管] 已接入 ${drone.config.name} §a第一人称火控视角！`);
  player.sendMessage("§e【飞行操控】WASD 移动飞行 │ 空格(Jump) 爬升 │ 潜行(Shift) 下降");
  player.sendMessage("§e【武器射击】按住使用键/右键持续开火，松开停止");
  player.sendMessage("§6【安全返航】按住潜行(落地长按)或切换快捷栏物品即可退出视角");
  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
 }

 /**
  * 退出手动视角并恢复正常人身伴飞模式
  */
 static exitManualControl(player) {
  const drone = this.getActiveDrone(player.id);
  if (!drone) return;

  drone.manualMode = false;
  drone.sneakHoldTicks = 0;

  // 1. 清理相机回到原人身视角
  try {
   player.camera.clear();
  } catch {
   try {
    player.runCommandAsync("camera @s clear");
   } catch {}
  }

  try {
   player.camera.fade({
    fadeColor: { red: 0, green: 0, blue: 0 },
    fadeTime: { fadeInTime: 0.1, holdTime: 0.1, fadeOutTime: 0.25 }
   });
  } catch {}

  drone.manualFiring = false;
  ManualControlSession.recover(player);
  drone.controlSession = null;

  // 4. 重置无人机实体状态
  try {
   if (drone.entity && drone.entity.isValid()) {
    drone.entity.setProperty("makercamp_dr:controlled_by_player", false);
    drone.entity.setProperty("makercamp_dr:is_shooting", false);
    drone.entity.setProperty("makercamp_dr:state", "passive");
   }
  } catch {}

  // 5. 反馈
  try { player.onScreenDisplay.clearTitle(); } catch {}
  try {
   player.runCommandAsync("playsound random.pop @s ~~~ 0.8 1.0");
   player.sendMessage("§b[战术网络] 已退出手动火控视角，无人机恢复自主协同伴飞。");
  } catch {}
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
   }, 2);
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

   entity.runCommandAsync(`playsound ${soundId} @a[r=40] ~~~ ${volume * 0.7} ${pitch + ((system.currentTick % 5) - 2) * 0.012}`).catch(() => {});
  } catch {}
 }

 /**
  * 绘制子弹弹道轨迹与枪口火花
  */
 static drawDroneBulletTracer(dimension, startLoc, endLoc, drone) {
  DroneEffects.trace(dimension, startLoc, endLoc, drone);
 }

 /**
  * 手动远程瞄准射击
  */
 static fireManualBullet(player) {
  const drone = this.getActiveDrone(player.id);
  if (!drone?.manualMode || !drone.entity?.isValid() || !ManualControlSession.held(player, drone.controlSession)) return;

  if (drone.fuel <= 0) {
   player.sendMessage("§c[战术遥控] 无人机能量耗尽，无法射击！");
   return;
  }

  const currentTick = system.currentTick;
  if (currentTick - (drone.lastManualFireTick ?? -Infinity) < drone.config.fireIntervalTicks) return; // 各机型射速
  drone.lastManualFireTick = currentTick;

  const headLoc = { x: drone.entity.location.x, y: drone.entity.location.y + 0.15, z: drone.entity.location.z };
  const viewDir = player.getViewDirection();
  const rot = player.getRotation();

  try {
   drone.entity.setRotation(rot);
  } catch {}

  const muzzleLoc = DroneEffects.muzzle(drone.entity);

  let endLoc = {
   x: headLoc.x + viewDir.x * 32,
   y: headLoc.y + viewDir.y * 32,
   z: headLoc.z + viewDir.z * 32
  };

  // 计算射程内命中的实体 (射线检测 32米)
  try {
   const dimension = drone.entity.dimension;
   const blockHit = dimension.getBlockFromRay(headLoc, viewDir, { maxDistance: 32, includeLiquidBlocks: false, includePassableBlocks: false });
   const blockDistance = blockHit ? Math.hypot(
    blockHit.block.location.x + blockHit.faceLocation.x - headLoc.x,
    blockHit.block.location.y + blockHit.faceLocation.y - headLoc.y,
    blockHit.block.location.z + blockHit.faceLocation.z - headLoc.z
   ) : 32;
   endLoc = { x: headLoc.x + viewDir.x * blockDistance, y: headLoc.y + viewDir.y * blockDistance, z: headLoc.z + viewDir.z * blockDistance };
   const hit = dimension.getEntitiesFromRay(headLoc, viewDir, { maxDistance: 32 })
    .filter(result => result.entity.id !== player.id && result.entity.id !== drone.entity.id && result.distance < blockDistance)
    .sort((a, b) => a.distance - b.distance);

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

  const start = event => {
   const drone = this.getActiveDrone(event.source?.id);
   if (drone?.manualMode && ManualControlSession.matches(event.itemStack, drone.controlSession) && ManualControlSession.held(event.source, drone.controlSession)) {
    drone.manualFiring = true;
    this.fireManualBullet(event.source);
   }
  };
  const stop = event => {
   const drone = this.getActiveDrone(event.source?.id);
   if (drone) drone.manualFiring = false;
  };
  world.afterEvents.itemStartUse.subscribe(start);
  world.afterEvents.itemUse.subscribe(start);
  world.afterEvents.itemStopUse.subscribe(stop);
  world.afterEvents.itemReleaseUse.subscribe(stop);
  world.afterEvents.playerSpawn.subscribe(({ player }) => {
   const drone = this.getActiveDrone(player.id);
   if (drone?.manualMode) this.exitManualControl(player);
   ManualControlSession.recover(player);
  });
  world.afterEvents.playerLeave.subscribe(({ playerId }) => {
   const drone = this.getActiveDrone(playerId);
   try { if (drone?.entity?.isValid()) drone.entity.remove(); } catch {}
   this.unregisterActiveDrone(playerId);
  });
  system.run(() => {
   for (const player of world.getAllPlayers()) ManualControlSession.recover(player);
  });

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
  if (currentTick % 20 === 0) {
   for (const player of world.getAllPlayers()) {
    if (!this.isPlayerInManualControl(player)) ManualControlSession.recover(player);
   }
  }

  for (const [ownerId, drone] of this.activeDrones) {
   const player = drone.player;
   const entity = drone.entity;

   // 1. 基础有效性检测
   if (!player || !player.isValid() || !entity || !entity.isValid()) {
    if (player?.isValid()) DroneGarageManager.recallDrone(player, false);
    else {
     try { if (entity?.isValid()) entity.remove(); } catch {}
     this.unregisterActiveDrone(ownerId);
    }
    continue;
   }

    // A. 手动操控 FPV 视角与全向物理飞行分支
    if (drone.manualMode) {
     // 1. 检查栏位切换 (切栏位立即退出视角)
     if (drone.fuel <= 0 || !ManualControlSession.held(player, drone.controlSession) || player.dimension.id !== entity.dimension.id || DownedRescueManager.isPlayerDowned(player) || player.getComponent(EntityComponentTypes.Health)?.currentValue <= 0) {
      this.exitManualControl(player);
      continue;
     }

     // 2. 落地长按潜行退出视角
     if (player.isSneaking && entity.isOnGround) {
      drone.sneakHoldTicks = (drone.sneakHoldTicks || 0) + 1;
      if (drone.sneakHoldTicks >= 10) {
       this.exitManualControl(player);
       continue;
      }
     } else {
      drone.sneakHoldTicks = 0;
     }

     // 3. 电量持续微量消耗 (每 300 tick 消耗 1%)
     if (currentTick % 300 === 0) {
      drone.fuel = Math.max(0, drone.fuel - 1);
      if (drone.fuel <= 0) {
       player.sendMessage("§c[战术机载网络] 无人机电量已耗尽，已强制退出火控视角！");
       this.exitManualControl(player);
       continue;
      }
     }

     // 4. 读取玩家输入向量与俯仰航向
     const rot = player.getRotation();
     const droneLoc = entity.location;

     try {
      entity.setRotation({ x: rot.x, y: rot.y });
     } catch {}

     const input = player.inputInfo;
     let moveX = 0, moveY = 0;
     let jumpPressed = false;
     let sneakPressed = false;
     try {
      if (input) {
       const mv = input.getMovementVector();
       if (mv) { moveX = mv.x; moveY = mv.y; }
       jumpPressed = input.getButtonState(InputButton.Jump) === ButtonState.Pressed || player.isJumping;
       sneakPressed = input.getButtonState(InputButton.Sneak) === ButtonState.Pressed || player.isSneaking;
      } else {
       jumpPressed = player.isJumping;
       sneakPressed = player.isSneaking;
      }
     } catch {
      jumpPressed = player.isJumping;
      sneakPressed = player.isSneaking;
     }

     const yawRad = (rot.y * Math.PI) / 180;
     const forwardX = -Math.sin(yawRad);
     const forwardZ = Math.cos(yawRad);
     const rightX = Math.cos(yawRad);
     const rightZ = Math.sin(yawRad);

     const flightSpeed = 0.65;
     let vx = (moveX * rightX + moveY * forwardX) * flightSpeed;
     let vz = (moveX * rightZ + moveY * forwardZ) * flightSpeed;
     let vy = 0;
     if (jumpPressed) vy += 0.40;
     if (sneakPressed && !entity.isOnGround) vy -= 0.40;

     const nextPos = {
      x: droneLoc.x + vx,
      y: droneLoc.y + vy,
      z: droneLoc.z + vz
     };

     const dist = Math.hypot(nextPos.x - player.location.x, nextPos.y - player.location.y, nextPos.z - player.location.z);
     const maxDist = 96;

     if (dist <= maxDist) {
      try {
       entity.teleport(nextPos, { checkForBlocks: true, dimension: entity.dimension });
      } catch {}
     } else {
      if (currentTick % 20 === 0) {
       player.sendMessage("§c[战术遥控] 已达最大遥测半径 (96米)！");
      }
     }

     const isMoving = Math.abs(vx) > 0.04 || Math.abs(vz) > 0.04 || Math.abs(vy) > 0.04;
     try {
      entity.setProperty("makercamp_dr:state", isMoving ? "active" : "passive");
     } catch {}

     // 电机轰鸣音效
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

     // 5. 驱动相机紧贴无人机机头 (第一人称 FPV 视角)
     const eyePos = {
      x: entity.location.x,
      y: entity.location.y + 0.15,
      z: entity.location.z
     };
     try {
      player.camera.setCamera("minecraft:free", {
       location: eyePos,
       rotation: { x: rot.x, y: rot.y },
       easeOptions: { easeTime: 0.1, easeType: EasingType.Linear }
      });
     } catch {
      this.exitManualControl(player);
      continue;
     }

     if (drone.manualFiring) this.fireManualBullet(player);

     // 6. 屏幕飞行状态反馈 (全彩高亮零灰色)
     const fuelPercent = Math.max(0, Math.floor(drone.fuel));
     const distText = dist.toFixed(1);
     const altText = entity.location.y.toFixed(1);
     try {
      player.onScreenDisplay.setTitle("", {
       subtitle: `§b【FPV火控视角】 §e电量: §a${fuelPercent}% §6│ §e距离: §f${distText}m/96m §6│ §e高度: §f${altText} §6│ §a按住使用键开火 §6│ §c潜行返航`,
       fadeInDuration: 0,
       stayDuration: 10,
       fadeOutDuration: 0
      });
     } catch {}

     continue;
    }

    // B. 自主伴飞模式分支
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

   // 5. 倒地自动救援协议 (高级与典藏机型，5秒急救倒计时)
   if (drone.config.autoRevive) {
    if (DownedRescueManager.isPlayerDowned(player)) {
     if (currentTick >= drone.autoReviveCooldownTick && !drone.isRescuing) {
      drone.isRescuing = true;
      drone.durability = Math.max(0, drone.durability - 2);
      drone.autoReviveCooldownTick = currentTick + 60 * 20; // 60s CD
      DownedRescueManager.startDroneRescue(player, entity, drone.config);
     }

     if (drone.isRescuing) {
      // 无人机在抢救期间，平稳悬浮在倒地主人正上方 1.8 格，并面向主人俯瞰施救
      try {
       entity.teleport({
        x: pLoc.x,
        y: pLoc.y + 1.8,
        z: pLoc.z
       }, {
        rotation: { x: 35, y: player.getRotation().y }
       });
       entity.setProperty("makercamp_dr:state", "active");
      } catch {}

      // 抢救期间专注于急救除颤，不分心开火
      continue;
     }
    } else {
     drone.isRescuing = false;
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

  const muzzleLoc = DroneEffects.muzzle(entity);

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
      this.triggerDroneShootingAnimation(entity);
      const muzzleLoc = DroneEffects.muzzle(entity);
      const targetCenter = { x: t.location.x, y: t.location.y + 0.8, z: t.location.z };
      DroneEffects.skill(entity.dimension, muzzleLoc, targetCenter, drone, skill.id);
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
