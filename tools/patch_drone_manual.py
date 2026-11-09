# -*- coding: utf-8 -*-
import os
import re

def patch_item_texture():
    path = "addons/development/apocalypse_life_addon/apocalypse_life_rp/textures/item_texture.json"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace('"ab_dr:drone_controller"', '"ab_dr:drone_fire_control"')
    content = content.replace('"textures/drones/items/drone_controller"', '"textures/drones/entity/crosshair"')

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("item_texture.json patched!")

def patch_merchant_and_menus():
    # 1. merchantConfig.js
    m_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/data/merchantConfig.js"
    with open(m_path, "r", encoding="utf-8") as f:
        m_content = f.read()

    m_content = m_content.replace('icon: "textures/drones/items/drone_controller"', 'icon: "textures/drones/items/laser_drone"')
    m_content = re.sub(r'\s*\{\s*id:\s*"ab_dr:drone_controller"[^}]+},\n?', '\n', m_content)

    with open(m_path, "w", encoding="utf-8") as f:
        f.write(m_content)
    print("merchantConfig.js patched!")

    # 2. lottery.js
    l_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/lottery.js"
    with open(l_path, "r", encoding="utf-8") as f:
        l_content = f.read()

    l_content = l_content.replace('"textures/drones/items/drone_controller"', '"textures/drones/items/laser_drone"')

    with open(l_path, "w", encoding="utf-8") as f:
        f.write(l_content)
    print("lottery.js patched!")

    # 3. server_menu.js
    s_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/server_menu.js"
    with open(s_path, "r", encoding="utf-8") as f:
        s_content = f.read()

    s_content = s_content.replace('"textures/drones/items/drone_controller"', '"textures/drones/items/crossbow_drone"')

    with open(s_path, "w", encoding="utf-8") as f:
        f.write(s_content)
    print("server_menu.js patched!")

def patch_drone_menu():
    path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneMenu.js"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    old_section = """    // 手动模式切换
    const manualLabel = activeDrone && activeDrone.manualMode
     ? "§l§e退出手动模式\\n§r§f切回自主协同伴飞与自瞄"
     : "§l§b切换手动操控\\n§r§f手持遥控器右键瞄准开火";
    form.button(manualLabel, "textures/drones/items/drone_controller");
    actions.push(() => {
     DroneClass.toggleManualMode(player);
     this.openDroneManageMenu(player, droneId);
    });"""

    new_section = """    // 手动模式切换 (点击后立即进入无人机主视角)
    const manualLabel = activeDrone && activeDrone.manualMode
     ? "§l§e退出手动模式\\n§r§f切回自主协同伴飞与自瞄"
     : "§l§b接管手动操控 (进入FPV视角)\\n§r§f立即进入无人机第一人称视角与火控";
    form.button(manualLabel, "textures/ui/camera_glyph");
    actions.push(() => {
     // 重点：绝不重新打开菜单！立刻直接进入无人机第一人称视角！
     DroneClass.enterManualControl(player);
    });"""

    assert old_section in content, "Could not find manual section in DroneMenu.js"
    content = content.replace(old_section, new_section, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("DroneMenu.js patched!")

def patch_drone_class():
    path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneClass.js"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update imports
    old_import = 'import { world, system, EntityComponentTypes } from "@minecraft/server";'
    new_import = 'import { world, system, EntityComponentTypes, EquipmentSlot, ItemStack } from "@minecraft/server";'
    assert old_import in content, "Could not find imports in DroneClass.js"
    content = content.replace(old_import, new_import, 1)

    # 2. Update toggleManualMode to provide enterManualControl, exitManualControl, isPlayerInManualControl
    old_manual_section = """ /**
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
 }"""

    new_manual_section = """ static isPlayerInManualControl(player) {
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

  drone.manualMode = true;
  drone.controllingPlayer = player;
  drone.controlSlotIndex = player.selectedSlotIndex;
  drone.sneakHoldTicks = 0;

  // 1. 保存当前主手物品并装备空手火控瞄准触发器
  try {
   const eq = player.getComponent("minecraft:equippable");
   drone.savedMainhandItem = eq?.getEquipment(EquipmentSlot.Mainhand) || null;
   const fireControlItem = new ItemStack("ab_dr:drone_fire_control", 1);
   eq?.setEquipment(EquipmentSlot.Mainhand, fireControlItem);
  } catch (err) {
   console.warn(`[DroneClass] Equip fire control error: ${err}`);
  }

  // 2. 锁定玩家躯体位移 (避免遥控时人身误走跌落)
  try {
   const inputPerm = player.inputPermissions;
   if (inputPerm) {
    [1, 2, 3, 4, 5].forEach(cat => inputPerm.setPermissionCategory(cat, false));
    inputPerm.setPermissionCategory(6, true);
   }
  } catch {}

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
    easeOptions: { easeTime: 0.1, easeType: "Linear" }
   });
  } catch {
   try {
    player.runCommandAsync(`camera @s set minecraft:free ease 0.1 linear pos ${eyePos.x.toFixed(2)} ${eyePos.y.toFixed(2)} ${eyePos.z.toFixed(2)} rot ${rot.x.toFixed(2)} ${rot.y.toFixed(2)}`);
   } catch {}
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
  player.sendMessage("§e【武器射击】空手右键瞄准开火");
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

  // 2. 恢复玩家移动控制权限
  try {
   const inputPerm = player.inputPermissions;
   if (inputPerm) {
    [1, 2, 3, 4, 5, 6].forEach(cat => inputPerm.setPermissionCategory(cat, true));
   }
  } catch {}

  // 3. 回收火控物品，还原主手原有物品
  try {
   const eq = player.getComponent("minecraft:equippable");
   if (eq) {
    const cur = eq.getEquipment(EquipmentSlot.Mainhand);
    if (cur && cur.typeId === "ab_dr:drone_fire_control") {
     eq.setEquipment(EquipmentSlot.Mainhand, drone.savedMainhandItem || null);
    }
   }
  } catch (err) {
   console.warn(`[DroneClass] Restore mainhand item error: ${err}`);
  }
  drone.savedMainhandItem = null;

  // 4. 重置无人机实体状态
  try {
   if (drone.entity && drone.entity.isValid()) {
    drone.entity.setProperty("makercamp_dr:controlled_by_player", false);
    drone.entity.setProperty("makercamp_dr:state", "passive");
   }
  } catch {}

  // 5. 反馈
  player.onScreenDisplay.setActionBar("");
  player.runCommandAsync("playsound random.pop @s ~~~ 0.8 1.0");
  player.sendMessage("§b[战术网络] 已退出手动火控视角，无人机恢复自主协同伴飞。");
 }"""

    assert old_manual_section in content, "Could not find old_manual_section in DroneClass.js"
    content = content.replace(old_manual_section, new_manual_section, 1)

    # 3. Update fireManualBullet range and origin
    old_fire = """  const headLoc = player.getHeadLocation();
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
   });"""

    new_fire = """  const viewDir = player.getViewDirection();
  const rot = player.getRotation();

  try {
   drone.entity.setRotation(rot);
  } catch {}

  const dronePos = drone.entity.location;
  const muzzleLoc = {
   x: dronePos.x,
   y: dronePos.y + 0.15,
   z: dronePos.z
  };

  let endLoc = {
   x: muzzleLoc.x + viewDir.x * 48,
   y: muzzleLoc.y + viewDir.y * 48,
   z: muzzleLoc.z + viewDir.z * 48
  };

  // 计算射程内命中的实体 (从无人机机头射线检测 48米)
  try {
   const hit = player.dimension.getEntitiesFromRay(muzzleLoc, viewDir, {
    maxDistance: 48,
    excludeEntities: [player.id, drone.entity.id]
   });"""

    assert old_fire in content, "Could not find old_fire in DroneClass.js"
    content = content.replace(old_fire, new_fire, 1)

    # 4. Update updateAllDrones loop to handle manual FPV flight
    old_update_drone = """    // 潜行自动退出手动操控模式
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
    }"""

    new_update_drone = """    // A. 手动操控 FPV 视角与全向物理飞行分支
    if (drone.manualMode) {
     // 1. 检查栏位切换 (切栏位立即退出视角)
     if (player.selectedSlotIndex !== drone.controlSlotIndex) {
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
       jumpPressed = input.getButtonState("Jump") === "Pressed" || player.isJumping;
       sneakPressed = input.getButtonState("Sneak") === "Pressed" || player.isSneaking;
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
       easeOptions: { easeTime: 0.1, easeType: "Linear" }
      });
     } catch {
      try {
       player.runCommandAsync(`camera @s set minecraft:free ease 0.1 linear pos ${eyePos.x.toFixed(2)} ${eyePos.y.toFixed(2)} ${eyePos.z.toFixed(2)} rot ${rot.x.toFixed(2)} ${rot.y.toFixed(2)}`);
      } catch {}
     }

     // 6. 屏幕飞行状态反馈 (全彩高亮零灰色)
     const fuelPercent = Math.max(0, Math.floor(drone.fuel));
     const distText = dist.toFixed(1);
     const altText = entity.location.y.toFixed(1);
     player.onScreenDisplay.setActionBar(
      `§b【FPV火控视角】 §e电量: §a${fuelPercent}% §6│ §e距离: §f${distText}m/96m §6│ §e高度: §f${altText} §6│ §a右键开火 §6│ §c潜行返航`
     );

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

    // 7. 自瞄与火控射击
    this.handleAutoCombat(drone, player, entity, currentTick);"""

    assert old_update_drone in content, "Could not find old_update_drone in DroneClass.js"
    content = content.replace(old_update_drone, new_update_drone, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("DroneClass.js patched!")

def patch_main_js():
    path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/main.js"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update itemUse for drone controller -> fire control
    old_item_use = """ subscribeAfterEvent("itemUse", (event) => {
  const { source: player, itemStack: item } = event;
  if (!player || player.typeId !== "minecraft:player" || !item) return;
  const itemId = item.typeId;
  if (itemId === "ab_dr:drone_controller") {
   const active = DroneClass.getActiveDrone(player.id);
   if (active && active.manualMode) {
    DroneClass.fireManualBullet(player);
   } else {
    DroneMenu.openMainMenu(player);
   }
   return;
  }"""

    new_item_use = """ subscribeAfterEvent("itemUse", (event) => {
  const { source: player, itemStack: item } = event;
  if (!player || player.typeId !== "minecraft:player" || !item) return;
  const itemId = item.typeId;
  if (itemId === "ab_dr:drone_fire_control") {
   DroneClass.fireManualBullet(player);
   return;
  }"""

    assert old_item_use in content, "Could not find old_item_use in main.js"
    content = content.replace(old_item_use, new_item_use, 1)

    # 2. Add player hurt interruption and empty hand interaction
    old_hurt_sec = """// 6. 原版伤害管线监听 (TNT爆炸、枪械脚本applyDamage、点火灼烧)
subscribeAfterEvent("entityHurt", (event) => {
 const entity = event.hurtEntity;
 if (!entity || !entity.isValid() || !allVehicleTypeIds.includes(entity.typeId)) return;"""

    new_hurt_sec = """// 6. 原版伤害管线监听 (TNT爆炸、枪械脚本applyDamage、点火灼烧)
subscribeAfterEvent("entityHurt", (event) => {
 const entity = event.hurtEntity;
 if (!entity || !entity.isValid()) return;

 // 若处于手动操控无人机状态下自身受到伤害，紧急切回人体视角
 if (entity.typeId === "minecraft:player" && DroneClass.isPlayerInManualControl(entity)) {
  DroneClass.exitManualControl(entity);
  try { entity.sendMessage("§c[战术预警] 你的身体正在遭受攻击，已紧急切回人体视角！"); } catch {}
 }

 if (!allVehicleTypeIds.includes(entity.typeId)) return;"""

    assert old_hurt_sec in content, "Could not find old_hurt_sec in main.js"
    content = content.replace(old_hurt_sec, new_hurt_sec, 1)

    # 3. Add empty-hand right-click listeners
    interact_block = """
// 8.1 空手右键互动开火支持 (手动视角下与伴飞模式下无缝触发)
if (world.beforeEvents?.playerInteractWithBlock) {
 world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const player = event.player;
  const item = event.itemStack;
  if (DroneClass.isPlayerInManualControl(player)) {
   event.cancel = true;
   system.run(() => DroneClass.fireManualBullet(player));
   return;
  }
  if (!item) {
   const active = DroneClass.getActiveDrone(player.id);
   if (active && active.entity && active.entity.isValid()) {
    if (player.isSneaking) {
     event.cancel = true;
     system.run(() => DroneClass.enterManualControl(player));
    } else {
     event.cancel = true;
     system.run(() => DroneClass.fireManualBullet(player));
    }
   }
  }
 });
}
if (world.beforeEvents?.playerInteractWithEntity) {
 world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const item = event.itemStack;
  if (DroneClass.isPlayerInManualControl(player)) {
   event.cancel = true;
   system.run(() => DroneClass.fireManualBullet(player));
   return;
  }
  if (!item) {
   const active = DroneClass.getActiveDrone(player.id);
   if (active && active.entity && active.entity.isValid()) {
    if (player.isSneaking) {
     event.cancel = true;
     system.run(() => DroneClass.enterManualControl(player));
    } else {
     event.cancel = true;
     system.run(() => DroneClass.fireManualBullet(player));
    }
   }
  }
 });
}
"""
    if "playerInteractWithBlock" not in content:
        content += interact_block

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("main.js patched!")

if __name__ == "__main__":
    patch_item_texture()
    patch_merchant_and_menus()
    patch_drone_menu()
    patch_drone_class()
    patch_main_js()
