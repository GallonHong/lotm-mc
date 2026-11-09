# -*- coding: utf-8 -*-
import sys

sys.stdout.reconfigure(encoding='utf-8')

# 1. Patch apocalypse_life_bp/scripts/main.js
life_main_path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/main.js"
with open(life_main_path, "r", encoding="utf-8") as f:
    life_content = f.read()

# Replace the empty-hand right click listeners in apocalypse_life_bp
old_block_interact = '''// 8.1 空手右键互动开火支持 (手动视角下与伴飞模式下无缝触发)
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
}'''

new_block_interact = '''// 8.1 严谨的主手物品获取函数（解决基岩版右键方块时 event.itemStack 经常为 undefined 的引擎特性）
function getHeldMainhandItem(player) {
 try {
  const eq = player.getComponent("minecraft:equippable") || player.getComponent("equippable");
  return eq?.getEquipment(EquipmentSlot.Mainhand);
 } catch {
  return null;
 }
}

// 8.2 空手右键互动开火支持 (手动视角下与伴飞模式下无缝触发，绝不误触或吞没指南针菜单)
if (world.beforeEvents?.playerInteractWithBlock) {
 world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const player = event.player;
  const heldItem = getHeldMainhandItem(player) || event.itemStack;

  // 手持指南针时直接执行唤起，绝不被无人机拦截
  if (heldItem?.typeId === "minecraft:compass" || heldItem?.typeId === "sapi:menu_compass") {
   system.runTimeout(() => {
    try { player.runCommand("scriptevent sapi:open"); } catch {}
   }, 1);
   return;
  }

  if (DroneClass.isPlayerInManualControl(player)) {
   event.cancel = true;
   system.run(() => DroneClass.fireManualBullet(player));
   return;
  }

  // 严格核实主手空手（而不是 event.itemStack 误判）才触发无人机火控
  if (!heldItem) {
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
  const heldItem = getHeldMainhandItem(player) || event.itemStack;

  if (heldItem?.typeId === "minecraft:compass" || heldItem?.typeId === "sapi:menu_compass") {
   system.runTimeout(() => {
    try { player.runCommand("scriptevent sapi:open"); } catch {}
   }, 1);
   return;
  }

  if (DroneClass.isPlayerInManualControl(player)) {
   event.cancel = true;
   system.run(() => DroneClass.fireManualBullet(player));
   return;
  }

  if (!heldItem) {
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
}'''

if old_block_interact in life_content:
    life_content = life_content.replace(old_block_interact, new_block_interact)
    with open(life_main_path, "w", encoding="utf-8") as f:
        f.write(life_content)
    print("Patched apocalypse_life_bp main.js successfully!")
else:
    print("Warning: old_block_interact not found in apocalypse_life_bp main.js!")
