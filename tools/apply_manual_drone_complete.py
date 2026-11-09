# -*- coding: utf-8 -*-
import os

def patch_drone_class():
    path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneClass.js"
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # 1. Imports
    for i, line in enumerate(lines):
        if 'from "@minecraft/server"' in line and "EntityComponentTypes" in line:
            lines[i] = 'import { world, system, EntityComponentTypes, EquipmentSlot, ItemStack } from "@minecraft/server";\n'
            break

    # 2. toggleManualMode replacement
    start_toggle = -1
    end_toggle = -1
    for i, line in enumerate(lines):
        if "static toggleManualMode" in line:
            start_toggle = i - 3 if i >= 3 and "/**" in lines[i-3] else i
            brace_count = 0
            for j in range(i, i + 40):
                brace_count += lines[j].count("{") - lines[j].count("}")
                if brace_count == 0:
                    end_toggle = j + 1
                    break
            break

    assert start_toggle != -1 and end_toggle != -1, f"Toggle indices not found: {start_toggle}, {end_toggle}"

    new_manual_methods = [
        " static isPlayerInManualControl(player) {\n",
        "  if (!player) return false;\n",
        "  const drone = this.getActiveDrone(player.id);\n",
        "  return Boolean(drone && drone.manualMode);\n",
        " }\n",
        "\n",
        " static toggleManualMode(player) {\n",
        "  if (this.isPlayerInManualControl(player)) {\n",
        "   this.exitManualControl(player);\n",
        "  } else {\n",
        "   this.enterManualControl(player);\n",
        "  }\n",
        " }\n",
        "\n",
        " /**\n",
        "  * 立即进入无人机第一人称视角 (FPV 视角与全向物理飞控)\n",
        "  */\n",
        " static enterManualControl(player) {\n",
        "  const drone = this.getActiveDrone(player.id);\n",
        "  if (!drone || !drone.entity || !drone.entity.isValid()) {\n",
        '   player.sendMessage("§c[战术机库] 当前无出战伴飞的无人机！");\n',
        "   return;\n",
        "  }\n",
        "\n",
        "  if (drone.fuel <= 0) {\n",
        '   player.sendMessage("§c[战术机载网络] 无人机电量已耗尽，无法进入遥控视角！");\n',
        "   return;\n",
        "  }\n",
        "\n",
        "  if (drone.manualMode) {\n",
        "   this.exitManualControl(player);\n",
        "   return;\n",
        "  }\n",
        "\n",
        "  drone.manualMode = true;\n",
        "  drone.controllingPlayer = player;\n",
        "  drone.controlSlotIndex = player.selectedSlotIndex;\n",
        "  drone.sneakHoldTicks = 0;\n",
        "\n",
        "  // 1. 保存当前主手物品并装备空手火控瞄准触发器\n",
        "  try {\n",
        '   const eq = player.getComponent("minecraft:equippable");\n',
        "   drone.savedMainhandItem = eq?.getEquipment(EquipmentSlot.Mainhand) || null;\n",
        '   const fireControlItem = new ItemStack("ab_dr:drone_fire_control", 1);\n',
        "   eq?.setEquipment(EquipmentSlot.Mainhand, fireControlItem);\n",
        "  } catch (err) {\n",
        "   console.warn(`[DroneClass] Equip fire control error: ${err}`);\n",
        "  }\n",
        "\n",
        "  // 2. 锁定玩家躯体位移 (避免遥控时人身误走跌落)\n",
        "  try {\n",
        "   const inputPerm = player.inputPermissions;\n",
        "   if (inputPerm) {\n",
        "    [1, 2, 3, 4, 5].forEach(cat => inputPerm.setPermissionCategory(cat, false));\n",
        "    inputPerm.setPermissionCategory(6, true);\n",
        "   }\n",
        "  } catch {}\n",
        "\n",
        "  // 3. 切换第一人称自由相机到无人机机头\n",
        "  const droneLoc = drone.entity.location;\n",
        "  const rot = player.getRotation();\n",
        "  const eyePos = { x: droneLoc.x, y: droneLoc.y + 0.15, z: droneLoc.z };\n",
        "\n",
        "  try {\n",
        "   player.camera.fade({\n",
        "    fadeColor: { red: 0, green: 0, blue: 0 },\n",
        "    fadeTime: { fadeInTime: 0.15, holdTime: 0.1, fadeOutTime: 0.25 }\n",
        "   });\n",
        "  } catch {}\n",
        "\n",
        "  try {\n",
        '   player.camera.setCamera("minecraft:free", {\n',
        "    location: eyePos,\n",
        "    rotation: { x: rot.x, y: rot.y },\n",
        '    easeOptions: { easeTime: 0.1, easeType: "Linear" }\n',
        "   });\n",
        "  } catch {\n",
        "   try {\n",
        "    player.runCommandAsync(`camera @s set minecraft:free ease 0.1 linear pos ${eyePos.x.toFixed(2)} ${eyePos.y.toFixed(2)} ${eyePos.z.toFixed(2)} rot ${rot.x.toFixed(2)} ${rot.y.toFixed(2)}`);\n",
        "   } catch {}\n",
        "  }\n",
        "\n",
        "  // 4. 设置无人机实体属性\n",
        "  try {\n",
        '   drone.entity.setProperty("makercamp_dr:controlled_by_player", true);\n',
        '   drone.entity.setProperty("makercamp_dr:state", "active");\n',
        "  } catch {}\n",
        "\n",
        "  // 5. 提示音效与指引\n",
        '  player.runCommandAsync("playsound beacon.activate @s ~~~ 0.8 1.4");\n',
        '  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");\n',
        '  player.sendMessage(`§a[战术接管] 已接入 ${drone.config.name} §a第一人称火控视角！`);\n',
        '  player.sendMessage("§e【飞行操控】WASD 移动飞行 │ 空格(Jump) 爬升 │ 潜行(Shift) 下降");\n',
        '  player.sendMessage("§e【武器射击】空手右键瞄准开火");\n',
        '  player.sendMessage("§6【安全返航】按住潜行(落地长按)或切换快捷栏物品即可退出视角");\n',
        '  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");\n',
        " }\n",
        "\n",
        " /**\n",
        "  * 退出手动视角并恢复正常人身伴飞模式\n",
        "  */\n",
        " static exitManualControl(player) {\n",
        "  const drone = this.getActiveDrone(player.id);\n",
        "  if (!drone) return;\n",
        "\n",
        "  drone.manualMode = false;\n",
        "  drone.sneakHoldTicks = 0;\n",
        "\n",
        "  // 1. 清理相机回到原人身视角\n",
        "  try {\n",
        "   player.camera.clear();\n",
        "  } catch {\n",
        "   try {\n",
        '    player.runCommandAsync("camera @s clear");\n',
        "   } catch {}\n",
        "  }\n",
        "\n",
        "  try {\n",
        "   player.camera.fade({\n",
        "    fadeColor: { red: 0, green: 0, blue: 0 },\n",
        "    fadeTime: { fadeInTime: 0.1, holdTime: 0.1, fadeOutTime: 0.25 }\n",
        "   });\n",
        "  } catch {}\n",
        "\n",
        "  // 2. 恢复玩家移动控制权限\n",
        "  try {\n",
        "   const inputPerm = player.inputPermissions;\n",
        "   if (inputPerm) {\n",
        "    [1, 2, 3, 4, 5, 6].forEach(cat => inputPerm.setPermissionCategory(cat, true));\n",
        "   }\n",
        "  } catch {}\n",
        "\n",
        "  // 3. 回收火控物品，还原主手原有物品\n",
        "  try {\n",
        '   const eq = player.getComponent("minecraft:equippable");\n',
        "   if (eq) {\n",
        "    const cur = eq.getEquipment(EquipmentSlot.Mainhand);\n",
        '    if (cur && cur.typeId === "ab_dr:drone_fire_control") {\n',
        "     eq.setEquipment(EquipmentSlot.Mainhand, drone.savedMainhandItem || null);\n",
        "    }\n",
        "   }\n",
        "  } catch (err) {\n",
        "   console.warn(`[DroneClass] Restore mainhand item error: ${err}`);\n",
        "  }\n",
        "  drone.savedMainhandItem = null;\n",
        "\n",
        "  // 4. 重置无人机实体状态\n",
        "  try {\n",
        "   if (drone.entity && drone.entity.isValid()) {\n",
        '    drone.entity.setProperty("makercamp_dr:controlled_by_player", false);\n',
        '    drone.entity.setProperty("makercamp_dr:state", "passive");\n',
        "   }\n",
        "  } catch {}\n",
        "\n",
        "  // 5. 反馈\n",
        '  player.onScreenDisplay.setActionBar("");\n',
        '  player.runCommandAsync("playsound random.pop @s ~~~ 0.8 1.0");\n',
        '  player.sendMessage("§b[战术网络] 已退出手动火控视角，无人机恢复自主协同伴飞。");\n',
        " }\n"
    ]

    lines[start_toggle:end_toggle] = new_manual_methods
    print(f"Replaced toggleManualMode at {start_toggle}-{end_toggle}")

    # 3. Update fireManualBullet range and origin
    start_fire = -1
    end_fire = -1
    for i, line in enumerate(lines):
        if "static fireManualBullet" in line:
            start_fire = i
            for j in range(i, i + 35):
                if "if (hit && hit.length > 0)" in lines[j]:
                    end_fire = j
                    break
            break

    if start_fire != -1 and end_fire != -1:
        # replace between rot and hit
        start_rot = -1
        for k in range(start_fire, end_fire):
            if "const viewDir" in lines[k]:
                start_rot = k
                break
        if start_rot != -1:
            new_fire_setup = [
                "  const viewDir = player.getViewDirection();\n",
                "  const rot = player.getRotation();\n",
                "\n",
                "  try {\n",
                "   drone.entity.setRotation(rot);\n",
                "  } catch {}\n",
                "\n",
                "  const dronePos = drone.entity.location;\n",
                "  const muzzleLoc = {\n",
                "   x: dronePos.x,\n",
                "   y: dronePos.y + 0.15,\n",
                "   z: dronePos.z\n",
                "  };\n",
                "\n",
                "  let endLoc = {\n",
                "   x: muzzleLoc.x + viewDir.x * 48,\n",
                "   y: muzzleLoc.y + viewDir.y * 48,\n",
                "   z: muzzleLoc.z + viewDir.z * 48\n",
                "  };\n",
                "\n",
                "  // 计算射程内命中的实体 (从无人机机头射线检测 48米)\n",
                "  try {\n",
                "   const hit = player.dimension.getEntitiesFromRay(muzzleLoc, viewDir, {\n",
                "    maxDistance: 48,\n",
                "    excludeEntities: [player.id, drone.entity.id]\n",
                "   });\n"
            ]
            lines[start_rot:end_fire] = new_fire_setup
            print(f"Updated fireManualBullet raycast from line {start_rot}")

    # 4. Update updateAllDrones loop
    start_loop = -1
    end_loop = -1
    for i, line in enumerate(lines):
        if "潜行自动退出" in line:
            start_loop = i
        if start_loop != -1 and "2. 维度检测" in line:
            end_loop = i
            break

    assert start_loop != -1 and end_loop != -1, f"Loop indices not found: {start_loop}, {end_loop}"

    new_loop_branch = [
        "    // A. 手动操控 FPV 视角与全向物理飞行分支\n",
        "    if (drone.manualMode) {\n",
        "     // 1. 检查栏位切换 (切栏位立即退出视角)\n",
        "     if (player.selectedSlotIndex !== drone.controlSlotIndex) {\n",
        "      this.exitManualControl(player);\n",
        "      continue;\n",
        "     }\n",
        "\n",
        "     // 2. 落地长按潜行退出视角\n",
        "     if (player.isSneaking && entity.isOnGround) {\n",
        "      drone.sneakHoldTicks = (drone.sneakHoldTicks || 0) + 1;\n",
        "      if (drone.sneakHoldTicks >= 10) {\n",
        "       this.exitManualControl(player);\n",
        "       continue;\n",
        "      }\n",
        "     } else {\n",
        "      drone.sneakHoldTicks = 0;\n",
        "     }\n",
        "\n",
        "     // 3. 电量持续微量消耗 (每 300 tick 消耗 1%)\n",
        "     if (currentTick % 300 === 0) {\n",
        "      drone.fuel = Math.max(0, drone.fuel - 1);\n",
        "      if (drone.fuel <= 0) {\n",
        '       player.sendMessage("§c[战术机载网络] 无人机电量已耗尽，已强制退出火控视角！");\n',
        "       this.exitManualControl(player);\n",
        "       continue;\n",
        "      }\n",
        "     }\n",
        "\n",
        "     // 4. 读取玩家输入向量与俯仰航向\n",
        "     const rot = player.getRotation();\n",
        "     const droneLoc = entity.location;\n",
        "\n",
        "     try {\n",
        "      entity.setRotation({ x: rot.x, y: rot.y });\n",
        "     } catch {}\n",
        "\n",
        "     const input = player.inputInfo;\n",
        "     let moveX = 0, moveY = 0;\n",
        "     let jumpPressed = false;\n",
        "     let sneakPressed = false;\n",
        "     try {\n",
        "      if (input) {\n",
        "       const mv = input.getMovementVector();\n",
        "       if (mv) { moveX = mv.x; moveY = mv.y; }\n",
        '       jumpPressed = input.getButtonState("Jump") === "Pressed" || player.isJumping;\n',
        '       sneakPressed = input.getButtonState("Sneak") === "Pressed" || player.isSneaking;\n',
        "      } else {\n",
        "       jumpPressed = player.isJumping;\n",
        "       sneakPressed = player.isSneaking;\n",
        "      }\n",
        "     } catch {\n",
        "      jumpPressed = player.isJumping;\n",
        "      sneakPressed = player.isSneaking;\n",
        "     }\n",
        "\n",
        "     const yawRad = (rot.y * Math.PI) / 180;\n",
        "     const forwardX = -Math.sin(yawRad);\n",
        "     const forwardZ = Math.cos(yawRad);\n",
        "     const rightX = Math.cos(yawRad);\n",
        "     const rightZ = Math.sin(yawRad);\n",
        "\n",
        "     const flightSpeed = 0.65;\n",
        "     let vx = (moveX * rightX + moveY * forwardX) * flightSpeed;\n",
        "     let vz = (moveX * rightZ + moveY * forwardZ) * flightSpeed;\n",
        "     let vy = 0;\n",
        "     if (jumpPressed) vy += 0.40;\n",
        "     if (sneakPressed && !entity.isOnGround) vy -= 0.40;\n",
        "\n",
        "     const nextPos = {\n",
        "      x: droneLoc.x + vx,\n",
        "      y: droneLoc.y + vy,\n",
        "      z: droneLoc.z + vz\n",
        "     };\n",
        "\n",
        "     const dist = Math.hypot(nextPos.x - player.location.x, nextPos.y - player.location.y, nextPos.z - player.location.z);\n",
        "     const maxDist = 96;\n",
        "\n",
        "     if (dist <= maxDist) {\n",
        "      try {\n",
        "       entity.teleport(nextPos, { checkForBlocks: true, dimension: entity.dimension });\n",
        "      } catch {}\n",
        "     } else {\n",
        "      if (currentTick % 20 === 0) {\n",
        '       player.sendMessage("§c[战术遥控] 已达最大遥测半径 (96米)！");\n',
        "      }\n",
        "     }\n",
        "\n",
        "     const isMoving = Math.abs(vx) > 0.04 || Math.abs(vz) > 0.04 || Math.abs(vy) > 0.04;\n",
        "     try {\n",
        '      entity.setProperty("makercamp_dr:state", isMoving ? "active" : "passive");\n',
        "     } catch {}\n",
        "\n",
        "     // 电机轰鸣音效\n",
        "     const soundInterval = isMoving ? 14 : 28;\n",
        "     if (currentTick - (drone.lastFlightSoundTick || 0) >= soundInterval) {\n",
        "      drone.lastFlightSoundTick = currentTick;\n",
        "      try {\n",
        "       if (isMoving) {\n",
        '        entity.runCommandAsync("playsound makercamp_dr.drone.active.fly @a ~~~ 0.35 1.1");\n',
        "       } else {\n",
        '        entity.runCommandAsync("playsound makercamp_dr.drone.passive.fly @a ~~~ 0.20 0.95");\n',
        "       }\n",
        "      } catch {}\n",
        "     }\n",
        "\n",
        "     // 5. 驱动相机紧贴无人机机头 (第一人称 FPV 视角)\n",
        "     const eyePos = {\n",
        "      x: entity.location.x,\n",
        "      y: entity.location.y + 0.15,\n",
        "      z: entity.location.z\n",
        "     };\n",
        "     try {\n",
        '      player.camera.setCamera("minecraft:free", {\n',
        "       location: eyePos,\n",
        "       rotation: { x: rot.x, y: rot.y },\n",
        '       easeOptions: { easeTime: 0.1, easeType: "Linear" }\n',
        "      });\n",
        "     } catch {\n",
        "      try {\n",
        "       player.runCommandAsync(`camera @s set minecraft:free ease 0.1 linear pos ${eyePos.x.toFixed(2)} ${eyePos.y.toFixed(2)} ${eyePos.z.toFixed(2)} rot ${rot.x.toFixed(2)} ${rot.y.toFixed(2)}`);\n",
        "      } catch {}\n",
        "     }\n",
        "\n",
        "     // 6. 屏幕飞行状态反馈 (全彩高亮零灰色)\n",
        "     const fuelPercent = Math.max(0, Math.floor(drone.fuel));\n",
        "     const distText = dist.toFixed(1);\n",
        "     const altText = entity.location.y.toFixed(1);\n",
        "     player.onScreenDisplay.setActionBar(\n",
        "      `§b【FPV火控视角】 §e电量: §a${fuelPercent}% §6│ §e距离: §f${distText}m/96m §6│ §e高度: §f${altText} §6│ §a右键开火 §6│ §c潜行返航`\n",
        "     );\n",
        "\n",
        "     continue;\n",
        "    }\n",
        "\n",
        "    // B. 自主伴飞模式分支\n"
    ]

    lines[start_loop:end_loop] = new_loop_branch
    print(f"Replaced manual loop branch at {start_loop}-{end_loop}")

    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("DroneClass.js patched successfully!")

def patch_main_js():
    path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/main.js"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update itemUse
    content = content.replace("ab_dr:drone_controller", "ab_dr:drone_fire_control")
    old_ctrl_branch = """  if (itemId === "ab_dr:drone_fire_control") {
   const active = DroneClass.getActiveDrone(player.id);
   if (active && active.manualMode) {
    DroneClass.fireManualBullet(player);
   } else {
    DroneMenu.openMainMenu(player);
   }
   return;
  }"""
    new_ctrl_branch = """  if (itemId === "ab_dr:drone_fire_control") {
   DroneClass.fireManualBullet(player);
   return;
  }"""
    if old_ctrl_branch in content:
        content = content.replace(old_ctrl_branch, new_ctrl_branch, 1)

    # 2. Add player hurt interruption
    if "DroneClass.isPlayerInManualControl" not in content:
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
    print("main.js patched successfully!")

if __name__ == "__main__":
    patch_drone_class()
    patch_main_js()
