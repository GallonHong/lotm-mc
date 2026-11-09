# -*- coding: utf-8 -*-
import os
import re

def patch_downed_rescue_manager():
    path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/rescue/DownedRescueManager.js"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add graceTicks in constructor
    old_ctor_sub = "  this.droneRescuerName = \"\";\n  this.droneEntity = null;"
    new_ctor_sub = "  this.droneRescuerName = \"\";\n  this.droneEntity = null;\n  this.graceTicks = 20; // 倒地初始 1 秒保护期，防止同发枪弹瞬间暴毙"
    assert old_ctor_sub in content, "Could not find ctor sub in DownedRescueManager.js"
    content = content.replace(old_ctor_sub, new_ctor_sub, 1)

    # 2. Update applyDownedEffects()
    old_effects = """ applyDownedEffects() {
  try {
   this.player.addEffect("resistance", 40, { amplifier: 255, showParticles: false });
   this.player.addEffect("weakness", 40, { amplifier: 255, showParticles: false });
   this.player.addEffect("mining_fatigue", 40, { amplifier: 255, showParticles: false });
   this.player.addEffect("slowness", 40, { amplifier: 255, showParticles: false });
  } catch {}
 }"""
    new_effects = """ applyDownedEffects() {
  try {
   if (this.graceTicks > 0) {
    this.player.addEffect("resistance", 10, { amplifier: 255, showParticles: false });
   } else {
    this.player.removeEffect("resistance");
   }
   this.player.addEffect("weakness", 40, { amplifier: 255, showParticles: false });
   this.player.addEffect("mining_fatigue", 40, { amplifier: 255, showParticles: false });
   this.player.addEffect("slowness", 40, { amplifier: 255, showParticles: false });
  } catch {}
 }"""
    assert old_effects in content, "Could not find applyDownedEffects in DownedRescueManager.js"
    content = content.replace(old_effects, new_effects, 1)

    # 3. Update tick() for grace countdown
    old_tick_head = """  if (!this.player || !this.player.isValid()) {
   this.end();
   return;
  }

  // 维持倒地状态保护与微血量
  if (system.currentTick % 20 === 0) {
   this.applyDownedEffects();
  }"""
    new_tick_head = """  if (!this.player || !this.player.isValid()) {
   this.end();
   return;
  }

  // 倒地初始 1 秒保护倒计时
  if (this.graceTicks > 0) {
   this.graceTicks -= 1;
   if (this.graceTicks === 0) {
    try {
     this.player.removeEffect("resistance");
     this.player.sendMessage("§e[战地警报] 倒地保护期已结束，敌方可随时开枪对你补枪处决！");
    } catch {}
   }
  }

  // 维持倒地状态弱化与移动限制
  if (system.currentTick % 20 === 0) {
   this.applyDownedEffects();
  }"""
    assert old_tick_head in content, "Could not find tick_head in DownedRescueManager.js"
    content = content.replace(old_tick_head, new_tick_head, 1)

    # 4. Update renderActionBar()
    old_render = """ renderActionBar() {
  try {
   // 状态 0：无人机机载电除颤急救中 (锁定放弃，5秒倒计时)
   if (this.droneRescuing) {
    const ratio = Math.min(1, this.droneRescueTicks / 100);
    const bar = createBar(ratio, "§a■", "§e□", 16);
    const percent = Math.floor(ratio * 100);
    const remainSec = Math.max(0, Math.ceil((100 - this.droneRescueTicks) / 20));
    this.player.onScreenDisplay.setActionBar(`§a【无人机抢救中】 ${bar} §e${percent}% (${remainSec}s) §6│ §f${this.droneRescuerName} §6紧急除颤中！`);
    return;
   }

   // 状态 A：长按跳跃主动放弃
   if (this.surrenderTicks > 0) {
    const ratio = this.surrenderTicks / 40;
    const bar = createBar(ratio, "§c■", "§e□", 16);
    this.player.onScreenDisplay.setActionBar(`§c【主动放弃中...】 ${bar} §e长按跳跃放弃挣扎`);
    return;
   }

   // 状态 B：队友施救中
   if (this.reviver) {
    const ratio = Math.min(1, this.reviveTicks / 80);
    const bar = createBar(ratio, "§a■", "§e□", 16);
    const percent = Math.floor(ratio * 100);
    this.player.onScreenDisplay.setActionBar(`§a【队友施救中】 ${bar} §e${percent}% §6│ §f@${this.reviver.name} 正在全力心肺复苏！`);
    this.reviver.onScreenDisplay.setActionBar(`§a【正在全力施救】 ${bar} §e${percent}% §6│ 保持潜行抢救 §f@${this.player.name}`);
    return;
   }

   // 状态 C：倒地濒死流血等待呼救
   const remainSec = Math.max(0, Math.ceil((this.maxKnockedTicks - this.knockedTicks) / 20));
   const remainRatio = Math.max(0, (this.maxKnockedTicks - this.knockedTicks) / this.maxKnockedTicks);
   const bar = createBar(remainRatio, "§c■", "§e□", 16);
   this.player.onScreenDisplay.setActionBar(`§c【濒死倒地】 ${bar} §e${remainSec}§c秒 §6│ 队友按【潜行】施救 §6│ 长按【跳跃】放弃`);
   this.player.nameTag = `§c@${this.player.name}\\n${bar}`;
  } catch {}
 }"""

    new_render = """ renderActionBar() {
  try {
   const hpComp = this.player.getComponent(EntityComponentTypes.Health);
   const currentHp = Math.max(0, Math.ceil(hpComp?.currentValue || 0));
   const maxHp = Math.ceil(hpComp?.effectiveMax || 20);

   // 状态 0：无人机机载电除颤急救中 (锁定放弃，5秒倒计时)
   if (this.droneRescuing) {
    const ratio = Math.min(1, this.droneRescueTicks / 100);
    const bar = createBar(ratio, "§a■", "§e□", 16);
    const percent = Math.floor(ratio * 100);
    const remainSec = Math.max(0, Math.ceil((100 - this.droneRescueTicks) / 20));
    this.player.onScreenDisplay.setActionBar(`§a【无人机抢救中 HP: §e${currentHp}§a】 ${bar} §e${percent}% (${remainSec}s) §6│ §f${this.droneRescuerName} §6除颤中！`);
    return;
   }

   // 状态 A：长按跳跃主动放弃
   if (this.surrenderTicks > 0) {
    const ratio = this.surrenderTicks / 40;
    const bar = createBar(ratio, "§c■", "§e□", 16);
    this.player.onScreenDisplay.setActionBar(`§c【主动放弃中... HP: §e${currentHp}§c】 ${bar} §e长按跳跃放弃挣扎`);
    return;
   }

   // 状态 B：队友施救中
   if (this.reviver) {
    const ratio = Math.min(1, this.reviveTicks / 80);
    const bar = createBar(ratio, "§a■", "§e□", 16);
    const percent = Math.floor(ratio * 100);
    this.player.onScreenDisplay.setActionBar(`§a【队友施救中 HP: §e${currentHp}§a】 ${bar} §e${percent}% §6│ §f@${this.reviver.name} 正在全力心肺复苏！`);
    this.reviver.onScreenDisplay.setActionBar(`§a【正在全力施救】 ${bar} §e${percent}% §6│ 保持潜行抢救 §f@${this.player.name}`);
    return;
   }

   // 状态 C：倒地濒死流血等待呼救 (实时显示生命值与处决警告)
   const remainSec = Math.max(0, Math.ceil((this.maxKnockedTicks - this.knockedTicks) / 20));
   const remainRatio = Math.max(0, (this.maxKnockedTicks - this.knockedTicks) / this.maxKnockedTicks);
   const bar = createBar(remainRatio, "§c■", "§e□", 16);
   this.player.onScreenDisplay.setActionBar(`§c【濒死倒地 HP: §e${currentHp}§c/§e${maxHp}§c】 ${bar} §e${remainSec}§c秒 §6│ 【潜行】施救 §6│ 【跳跃】放弃`);
   this.player.nameTag = `§c@${this.player.name} §e[HP:${currentHp}/${maxHp}]\\n${bar}`;
  } catch {}
 }"""
    assert old_render in content, "Could not find renderActionBar in DownedRescueManager.js"
    content = content.replace(old_render, new_render, 1)

    # 5. Update kill() to accept killer and isExecution
    old_kill = """ kill() {
  this.end();
  if (!this.player || !this.player.isValid()) return;

  // 打上真实死亡标记，防止被 entityDie 循环捕获为新的倒地
  this.player.addTag("apoc:true_death");

  // 若世界规则没有开启死亡保留背包，则原生直接在地面掉落物品 (绝对不生成 rm:loot_chest 实体箱子！)
  let keepInv = true;
  try {
   keepInv = Boolean(world.gameRules.keepInventory);
  } catch {}

  if (!keepInv) {
   try {
    const inv = this.player.getComponent("minecraft:inventory")?.container;
    const eq = this.player.getComponent("minecraft:equippable");
    if (inv) {
     for (let i = 0; i < inv.size; i++) {
      const it = inv.getItem(i);
      if (it) {
       this.dimension.spawnItem(it, this.player.location);
       inv.setItem(i, null);
      }
     }
    }
    if (eq) {
     for (const slot of eqTypes) {
      const it = eq.getEquipment(slot);
      if (it) {
       this.dimension.spawnItem(it, this.player.location);
       eq.setEquipment(slot, null);
      }
     }
    }
   } catch (err) {
    console.warn(`[DownedRescueManager] Drop items error: ${err}`);
   }
  }

  // 广播阵亡提示
  try {
   for (const p of world.getAllPlayers()) {
    p.sendMessage(`§c幸存者 @${this.player.name} 伤势过重，不幸阵亡了...`);
   }
   this.player.kill();
  } catch {}
 }"""

    new_kill = """ kill(killer = null, isExecution = false) {
  if (this.ended) return;
  this.end();
  if (!this.player || !this.player.isValid()) return;

  // 打上真实死亡标记，防止被 entityDie 循环捕获为新的倒地
  this.player.addTag("apoc:true_death");

  // 若世界规则没有开启死亡保留背包，则原生直接在地面掉落物品 (绝对不生成 rm:loot_chest 实体箱子！)
  let keepInv = true;
  try {
   keepInv = Boolean(world.gameRules.keepInventory);
  } catch {}

  if (!keepInv) {
   try {
    const inv = this.player.getComponent("minecraft:inventory")?.container;
    const eq = this.player.getComponent("minecraft:equippable");
    if (inv) {
     for (let i = 0; i < inv.size; i++) {
      const it = inv.getItem(i);
      if (it) {
       this.dimension.spawnItem(it, this.player.location);
       inv.setItem(i, null);
      }
     }
    }
    if (eq) {
     for (const slot of eqTypes) {
      const it = eq.getEquipment(slot);
      if (it) {
       this.dimension.spawnItem(it, this.player.location);
       eq.setEquipment(slot, null);
      }
     }
    }
   } catch (err) {
    console.warn(`[DownedRescueManager] Drop items error: ${err}`);
   }
  }

  // 处决与阵亡广播提示
  try {
   if (killer || isExecution) {
    const killerName = killer?.name || killer?.typeId?.replace("minecraft:", "") || "敌对目标";
    for (const p of world.getAllPlayers()) {
     p.sendMessage("§c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
     p.sendMessage(`§c【战地处决】幸存者 §f@${this.player.name} §c倒地后被 §e@${killerName} §c补枪处决！`);
     p.sendMessage("§c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
    try { this.dimension.spawnParticle("minecraft:huge_explosion_emitter", this.player.location); } catch {}
    try { this.player.runCommandAsync("playsound random.explode @a ~~~ 0.8 1.4"); } catch {}
    if (killer && killer.isValid() && killer.typeId === "minecraft:player") {
     try { killer.sendMessage(`§a[战地处决] 你成功击杀处决了倒地幸存者 §f@${this.player.name}§a！`); } catch {}
     try { killer.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.5"); } catch {}
    }
   } else {
    for (const p of world.getAllPlayers()) {
     p.sendMessage(`§c幸存者 @${this.player.name} 伤势过重，不幸阵亡了...`);
    }
   }
  } catch {}

  // 触发副本死亡与物资结算
  try {
   this.player.runCommandAsync("scriptevent daily:dungeon_true_death");
   this.player.runCommandAsync("scriptevent extract:force_drop_backpack");
  } catch {}

  // 杀死实体 (若尚未死亡)
  try {
   const hp = this.player.getComponent(EntityComponentTypes.Health);
   if (hp && hp.currentValue > 0) {
    this.player.kill();
   }
  } catch {}
 }"""
    assert old_kill in content, "Could not find kill in DownedRescueManager.js"
    content = content.replace(old_kill, new_kill, 1)

    # 6. Update entityDie and add entityHurt in DownedRescueManager.init()
    old_init_section = """  // 2. 玩家死亡拦截：进入倒地濒死呼救状态
  if (world.afterEvents?.entityDie) {
   world.afterEvents.entityDie.subscribe((event) => {
    const deadEntity = event.deadEntity;
    if (!deadEntity || deadEntity.typeId !== "minecraft:player") return;

    const player = world.getAllPlayers().find(p => p.id === deadEntity.id);
    if (!player) return;

    // 若已被标记为真实死亡 (如流血耗尽或主动放弃)，则正常完成死亡流程
    if (player.hasTag("apoc:true_death")) {
     player.removeTag("apoc:true_death");
     return;
    }

    // 若已经处于倒地状态，不重复触发
    if (this.activeInstances.has(player.id)) return;"""

    new_init_section = """  // 2.1 倒地受创监听：允许被枪械击中、扣血并支持补枪处决
  if (world.afterEvents?.entityHurt) {
   world.afterEvents.entityHurt.subscribe((event) => {
    const hurtEntity = event.hurtEntity;
    if (!hurtEntity || hurtEntity.typeId !== "minecraft:player") return;

    const inst = this.activeInstances.get(hurtEntity.id);
    if (!inst || inst.ended) return;

    // 倒地前 1 秒处于保护期，免疫立刻处决
    if (inst.graceTicks > 0) return;

    const damager = event.damageSource?.damagingEntity;
    // 排除自伤与施救者队友误触
    if (damager && (damager.id === hurtEntity.id || (inst.reviver && damager.id === inst.reviver.id))) return;

    // 击中音效与特效反馈
    try {
     hurtEntity.dimension.spawnParticle("minecraft:critical_hit_emitter", hurtEntity.location);
     hurtEntity.runCommandAsync("playsound game.player.hurt @a ~~~ 1.0 0.8");
    } catch {}

    const hpComp = hurtEntity.getComponent(EntityComponentTypes.Health);
    const currentHp = hpComp?.currentValue || 0;

    // 若生命已空或受到致死伤害，立即执行击杀处决
    if (currentHp <= 0 || (event.damage && event.damage >= currentHp)) {
     hurtEntity.addTag("apoc:true_death");
     inst.kill(damager, true);
    }
   });
  }

  // 2.2 玩家死亡拦截：进入倒地濒死呼救状态 / 补枪处决判定
  if (world.afterEvents?.entityDie) {
   world.afterEvents.entityDie.subscribe((event) => {
    const deadEntity = event.deadEntity;
    if (!deadEntity || deadEntity.typeId !== "minecraft:player") return;

    const player = world.getAllPlayers().find(p => p.id === deadEntity.id);
    if (!player) return;

    // 若已被标记为真实死亡 (如流血耗尽、处决或主动放弃)，则正常完成死亡流程
    if (player.hasTag("apoc:true_death")) {
     system.runTimeout(() => {
      try { if (player.isValid()) player.removeTag("apoc:true_death"); } catch {}
     }, 40);
     return;
    }

    // 若已经处于倒地状态，再次死亡说明是被枪械击杀/补枪处决！
    if (this.activeInstances.has(player.id)) {
     const inst = this.activeInstances.get(player.id);
     const killer = event.damageSource?.damagingEntity;
     player.addTag("apoc:true_death");
     inst.kill(killer, true);
     system.runTimeout(() => {
      try { if (player.isValid()) player.removeTag("apoc:true_death"); } catch {}
     }, 40);
     return;
    }"""
    assert old_init_section in content, "Could not find init section in DownedRescueManager.js"
    content = content.replace(old_init_section, new_init_section, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("DownedRescueManager.js successfully patched!")

def patch_daily_events_main():
    path = "addons/development/daily_world_events_addon/daily_events_bp/scripts/main.js"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add daily:dungeon_true_death
    old_target = """  else if (id === "daily:drone_revive" || id === "dungeon:cancel_death") {
    DungeonManager.decrementPlayerDeath(player);
   }"""
    new_target = """  else if (id === "daily:drone_revive" || id === "dungeon:cancel_death") {
    DungeonManager.decrementPlayerDeath(player);
   }
   else if (id === "daily:dungeon_true_death") {
    WorldEventManager.onPlayerDeath(player);
    DungeonManager.onPlayerDeath(player);
   }"""
    if old_target in content:
        content = content.replace(old_target, new_target, 1)

    # 2. Eliminate all gray text (§7, §8) in daily_events main.js
    content = content.replace("§7用法/scriptevent", "§e用法/scriptevent")
    content = content.replace("§7当前没有事件。", "§e当前没有事件。")
    content = content.replace("§7附近 200 格没有事件节点。", "§e附近 200 格没有事件节点。")
    content = content.replace("§7附近没有事件。", "§e附近没有事件。")
    content = content.replace("§7没有可领取的任务奖励。", "§e没有可领取的任务奖励。")
    content = content.replace("§7暂无可补发物资，或背包空间仍不足。", "§e暂无可补发物资，或背包空间仍不足。")
    content = content.replace("§8 | 队列", "§6 | 队列")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("daily_events_bp/scripts/main.js successfully patched!")

def patch_extraction_main():
    path = "addons/development/apocalypse_extraction_addon/extraction_bp/scripts/main.js"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add extract:force_drop_backpack
    old_exit = """  else if (event.id === "extract:exit") system.run(() => startExtraction(player));"""
    new_exit = """  else if (event.id === "extract:exit") system.run(() => startExtraction(player));
  else if (event.id === "extract:force_drop_backpack") system.run(() => {
   try {
    const cached = backpackSnapshots.get(player.id);
    dropBackpack(player, cached?.location, extractionDimension());
   } catch {}
  });"""
    if old_exit in content and "extract:force_drop_backpack" not in content:
        content = content.replace(old_exit, new_exit, 1)

    # 2. Eliminate all gray text (§7, §8) in extraction main.js
    content = content.replace("§8(注：", "§e(注：")
    content = content.replace("§8(", "§e(")
    content = content.replace("§8 - ", "§e - ")
    content = content.replace("§7该点没有确认存在的传说箱。", "§e该点没有确认存在的传说箱。")
    content = content.replace(".button(\"§8关闭\",", ".button(\"§c关闭\",")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("extraction_bp/scripts/main.js successfully patched!")

if __name__ == "__main__":
    patch_downed_rescue_manager()
    patch_daily_events_main()
    patch_extraction_main()
