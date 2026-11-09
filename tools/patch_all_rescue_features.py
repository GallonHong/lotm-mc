import os, re

def patch_downed_rescue_manager():
    p = r'addons\development\apocalypse_life_addon\apocalypse_life_bp\scripts\rescue\DownedRescueManager.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Add fields in constructor
    old_ctor = 'this.ended = false;'
    new_ctor = '''this.ended = false;
  this.droneRescuing = false;
  this.droneRescueTicks = 0;
  this.droneRescuerName = "";
  this.droneEntity = null;'''
    assert old_ctor in c, 'old_ctor not found'
    c = c.replace(old_ctor, new_ctor, 1)

    # 2. Add startDroneRescue in DownedPlayerInstance
    old_methods = 'lockControls(locked) {'
    new_methods = '''startDroneRescue(droneEntity, droneConfig) {
  if (this.ended) return;
  this.droneRescuing = true;
  this.droneRescueTicks = 0;
  this.droneRescuerName = droneConfig.name;
  this.droneEntity = droneEntity;
  this.surrenderTicks = 0;

  this.player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  this.player.sendMessage(`§a[紧急生命协议] ${droneConfig.name} §a检测到主人身受重伤倒地！`);
  this.player.sendMessage("§a机载战术除颤与心肺复苏程序启动中……（抢救时间: 5秒）");
  this.player.sendMessage("§e【安全锁定】机载急救期间无法放弃挣扎，请等待救援完成！");
  this.player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
 }

 lockControls(locked) {'''
    assert old_methods in c, 'old_methods not found'
    c = c.replace(old_methods, new_methods, 1)

    # 3. Update tick() to prioritize drone rescue and block surrender
    old_tick_head = '''  // 1. 检测附近施救者 (2.8 格范围内按住潜行的健康玩家)'''
    new_tick_head = '''  // 0. 无人机机载电除颤优先研判 (5秒急救倒计时，期间锁定放弃挣扎)
  if (this.droneRescuing) {
   if (!this.droneEntity || !this.droneEntity.isValid()) {
    this.droneRescuing = false;
    this.player.sendMessage("§c[紧急生命协议] 伴飞无人机受创或离线，机载急救中断！");
   } else {
    // 长按跳跃无法快速放弃！
    this.surrenderTicks = 0;
    this.droneRescueTicks += 1;

    // 施救脉冲粒子与心跳除颤音效
    if (this.droneRescueTicks % 20 === 0) {
     try {
      this.dimension.spawnParticle("minecraft:totem_particle", this.player.location);
      this.player.runCommandAsync("playsound beacon.activate @a ~~~ 0.7 1.4");
     } catch {}
    }

    // 5 秒 (100 ticks) 抢救完成
    if (this.droneRescueTicks >= 100) {
     this.revive(this.droneRescuerName, true);
     return;
    }

    this.renderActionBar();
    return;
   }
  }

  // 1. 检测附近施救者 (2.8 格范围内按住潜行的健康玩家)'''
    assert old_tick_head in c, 'old_tick_head not found'
    c = c.replace(old_tick_head, new_tick_head, 1)

    # 4. Update renderActionBar for drone rescuing state
    old_actionbar = '''  try {
   // 状态 A：长按跳跃主动放弃'''
    new_actionbar = '''  try {
   // 状态 0：无人机机载电除颤急救中 (锁定放弃，5秒倒计时)
   if (this.droneRescuing) {
    const ratio = Math.min(1, this.droneRescueTicks / 100);
    const bar = createBar(ratio, "§a■", "§e□", 16);
    const percent = Math.floor(ratio * 100);
    const remainSec = Math.max(0, Math.ceil((100 - this.droneRescueTicks) / 20));
    this.player.onScreenDisplay.setActionBar(`§a【无人机抢救中】 ${bar} §e${percent}% (${remainSec}s) §6│ §f${this.droneRescuerName} §6紧急除颤中！`);
    return;
   }

   // 状态 A：长按跳跃主动放弃'''
    assert old_actionbar in c, 'old_actionbar not found'
    c = c.replace(old_actionbar, new_actionbar, 1)

    # 5. Update revive(reviverName, isDrone)
    old_revive = ''' revive(reviverName = "队友") {
  this.end();
  if (!this.player || !this.player.isValid()) return;

  system.runTimeout(() => {
   if (!this.player.isValid()) return;
   try {
    // 恢复 6 点生命值 (3颗心)
    const healthComp = this.player.getComponent(EntityComponentTypes.Health);
    if (healthComp) healthComp.setCurrentValue(6);

    // 播放爬起动画
    this.player.playAnimation("animation.humanoid.revive");

    // 给予 5 秒防御与吸收金心保护，防止刚起即被瞬秒
    this.player.addEffect("resistance", 100, { amplifier: 1, showParticles: false });
    this.player.addEffect("absorption", 100, { amplifier: 0, showParticles: false });

    this.player.sendMessage(`§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.player.sendMessage(`§a【抢救成功】你已被幸存者 §e@${reviverName} §a成功救起，重返废土！`);
    this.player.sendMessage(`§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.player.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.2");
    this.player.onScreenDisplay.setActionBar(`§a【抢救成功】重返废土！`);
   } catch {}
  }, 2);
 }'''
    new_revive = ''' revive(reviverName = "队友", isDrone = false) {
  this.end();
  if (!this.player || !this.player.isValid()) return;

  system.runTimeout(() => {
   if (!this.player.isValid()) return;
   try {
    const healthComp = this.player.getComponent(EntityComponentTypes.Health);
    if (healthComp) {
     const recoverHp = isDrone ? Math.floor(healthComp.effectiveMax * 0.5) : 6;
     healthComp.setCurrentValue(recoverHp);
    }

    // 播放爬起动画
    this.player.playAnimation("animation.humanoid.revive");

    // 给予防御与吸收金心保护
    this.player.addEffect("resistance", 100, { amplifier: 1, showParticles: false });
    this.player.addEffect("absorption", 100, { amplifier: 0, showParticles: false });
    if (isDrone) {
     this.player.addEffect("regeneration", 160, { amplifier: 1, showParticles: false });
    }

    this.dimension.spawnParticle("minecraft:totem_particle", this.location);

    if (isDrone) {
     this.player.sendMessage(`§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
     this.player.sendMessage(`§a[紧急生命协议] ${reviverName} §a抢救成功！已为主人生效战场电除颤并注入高能强心剂！`);
     this.player.sendMessage(`§a生命已大幅恢复，且本次倒地不计入副本死亡次数！`);
     this.player.sendMessage(`§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
     this.player.runCommandAsync("playsound random.totem @a ~~~ 0.8 1.2");
     this.player.onScreenDisplay.setActionBar(`§a【抢救成功】无人机战术复苏重返战场！`);
     // 触发副本死亡次数取消事件
     this.player.runCommandAsync("scriptevent daily:drone_revive");
    } else {
     this.player.sendMessage(`§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
     this.player.sendMessage(`§a【抢救成功】你已被幸存者 §e@${reviverName} §a成功救起，重返废土！`);
     this.player.sendMessage(`§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
     this.player.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.2");
     this.player.onScreenDisplay.setActionBar(`§a【抢救成功】重返废土！`);
    }
   } catch {}
  }, 2);
 }'''
    assert old_revive in c, 'old_revive not found'
    c = c.replace(old_revive, new_revive, 1)

    # 6. Add static startDroneRescue method to DownedRescueManager class
    old_static = ''' static revivePlayer(player, reviverName = "救助") {'''
    new_static = ''' static startDroneRescue(player, droneEntity, droneConfig) {
  const inst = this.activeInstances.get(player.id);
  if (inst) {
   inst.startDroneRescue(droneEntity, droneConfig);
   return true;
  }
  return false;
 }

 static revivePlayer(player, reviverName = "救助") {'''
    assert old_static in c, 'old_static not found'
    c = c.replace(old_static, new_static, 1)

    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Updated DownedRescueManager.js successfully')

def patch_drone_class():
    p = r'addons\development\apocalypse_life_addon\apocalypse_life_bp\scripts\drones\DroneClass.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()

    # Add isRescuing in registerActiveDrone
    old_reg = 'lastFlightSoundTick: 0,'
    new_reg = '''lastFlightSoundTick: 0,
   isRescuing: false,'''
    assert old_reg in c, 'old_reg not found'
    c = c.replace(old_reg, new_reg, 1)

    # Update auto revive protocol in updateAllDrones
    old_revive = '''   // 5. 倒地自动救援协议 (高级与典藏机型)
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
   }'''

    new_revive = '''   // 5. 倒地自动救援协议 (高级与典藏机型，5秒急救倒计时)
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
   }'''
    assert old_revive in c, 'old_revive not found'
    c = c.replace(old_revive, new_revive, 1)

    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Updated DroneClass.js successfully')

def patch_dungeon_and_daily():
    # 1. DungeonManager.js
    dp = r'addons\development\daily_world_events_addon\daily_events_bp\scripts\dungeons\DungeonManager.js'
    with open(dp, 'r', encoding='utf-8') as f:
        dc = f.read()

    old_d_meth = ''' static onPlayerDeath(player) {'''
    new_d_meth = ''' static decrementPlayerDeath(player) {
  const state = readPlayerState(player);
  const instance = state?.instanceId ? this.active.get(state.instanceId) : null;
  if (!instance) return false;
  if (instance.deaths && instance.deaths[player.id] && instance.deaths[player.id] > 0) {
   instance.deaths[player.id] -= 1;
  }
  state.pendingRespawn = false;
  writePlayerState(player, state);
  const currentDeaths = instance.deaths[player.id] || 0;
  const template = dungeonTemplate(instance.templateId);
  const maxDeaths = template?.maxDeathsPerPlayer || 3;
  player.sendMessage(`§a[副本火控协议] 无人机电除颤救助成功！本次倒地不计入副本死亡次数（当前死亡: ${currentDeaths}/${maxDeaths}）。`);
  return true;
 }

 static onPlayerDeath(player) {'''
    assert old_d_meth in dc, 'old_d_meth not found'
    dc = dc.replace(old_d_meth, new_d_meth, 1)

    with open(dp, 'w', encoding='utf-8') as f:
        f.write(dc)
    print('Updated DungeonManager.js successfully')

    # 2. daily_events main.js
    mp = r'addons\development\daily_world_events_addon\daily_events_bp\scripts\main.js'
    with open(mp, 'r', encoding='utf-8') as f:
        mc = f.read()

    old_death_check = ''' if (dead.typeId === "minecraft:player") {
  WorldEventManager.onPlayerDeath(dead);
  DungeonManager.onPlayerDeath(dead);
 }'''
    new_death_check = ''' if (dead.typeId === "minecraft:player") {
  // 若玩家处于倒地待抢救状态，并非真实死亡，暂不计入副本死亡次数
  if (dead.hasTag && !dead.hasTag("apoc:true_death")) return;
  WorldEventManager.onPlayerDeath(dead);
  DungeonManager.onPlayerDeath(dead);
 }'''
    assert old_death_check in mc, 'old_death_check not found'
    mc = mc.replace(old_death_check, new_death_check, 1)

    old_spawn_check = '''   DailyQuestManager.ensureState(event.player);
   DungeonManager.handlePlayerSpawn(event.player);'''
    new_spawn_check = '''   DailyQuestManager.ensureState(event.player);
   if (!event.player.hasTag("apoc:true_death")) {
    // 倒地抢救拉回中不触发副本淘汰死回复活点
   } else {
    DungeonManager.handlePlayerSpawn(event.player);
   }'''
    assert old_spawn_check in mc, 'old_spawn_check not found'
    mc = mc.replace(old_spawn_check, new_spawn_check, 1)

    old_script_event = ''' else if (id === "daily:dungeon") system.runTimeout(() => DungeonMenu.open(player), 3);'''
    new_script_event = ''' else if (id === "daily:drone_revive" || id === "dungeon:cancel_death") {
   DungeonManager.decrementPlayerDeath(player);
  }
  else if (id === "daily:dungeon") system.runTimeout(() => DungeonMenu.open(player), 3);'''
    assert old_script_event in mc, 'old_script_event not found'
    mc = mc.replace(old_script_event, new_script_event, 1)

    with open(mp, 'w', encoding='utf-8') as f:
        f.write(mc)
    print('Updated daily_events main.js successfully')

def patch_extraction():
    ep = r'addons\development\apocalypse_extraction_addon\extraction_bp\scripts\main.js'
    with open(ep, 'r', encoding='utf-8') as f:
        ec = f.read()

    old_ext_die = '''subscribe(world.afterEvents?.entityDie, "entityDie", event => {
 const player = event.deadEntity;
 if (player?.typeId === "minecraft:player") {
  try {
   const cached = backpackSnapshots.get(player.id);
   dropBackpack(player, cached?.location, extractionDimension());
  } catch {}
 }
});'''

    new_ext_die = '''subscribe(world.afterEvents?.entityDie, "entityDie", event => {
 const player = event.deadEntity;
 if (player?.typeId === "minecraft:player") {
  if (player.hasTag && !player.hasTag("apoc:true_death")) {
   // 处于倒地呼救状态，等待无人机或队友抢救，不掉落背包
   return;
  }
  try {
   const cached = backpackSnapshots.get(player.id);
   dropBackpack(player, cached?.location, extractionDimension());
  } catch {}
 }
});'''
    assert old_ext_die in ec, 'old_ext_die not found'
    ec = ec.replace(old_ext_die, new_ext_die, 1)

    with open(ep, 'w', encoding='utf-8') as f:
        f.write(ec)
    print('Updated extraction main.js successfully')

if __name__ == '__main__':
    patch_downed_rescue_manager()
    patch_drone_class()
    patch_dungeon_and_daily()
    patch_extraction()
