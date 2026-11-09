import { MessageFormData } from "@minecraft/server-ui";
import { createJumpHold, readJumpPressed, updateJumpHold } from "./JumpHoldInput.js";
import { participant } from "../pvp/PvpLifePolicy.js";
import { world, system, EquipmentSlot, EntityComponentTypes } from "@minecraft/server";
import { TemperatureManager } from "../temperature/TemperatureManager.js";

const eqTypes = [EquipmentSlot.Feet, EquipmentSlot.Legs, EquipmentSlot.Chest, EquipmentSlot.Head, EquipmentSlot.Offhand];
const inputCategories = [1, 2, 3, 4, 5];

/**
 * 创建高对比度彩色进度条 (零灰色字，全彩高亮)
 */
function createBar(ratio, filled = "§a■", empty = "§6□", length = 18) {
 const filledCount = Math.min(length, Math.max(0, Math.round(ratio * length)));
 const emptyCount = length - filledCount;
 return `${filled.repeat(filledCount)}${empty.repeat(emptyCount)}`;
}

/**
 * 倒地濒死玩家实例
 */
export class DownedPlayerInstance {
 constructor(player, location, dimension) {
  this.player = player;
  this.id = player.id;
  this.location = { x: location.x, y: location.y, z: location.z };
  this.dimension = dimension;

  this.knockedTicks = 0;
  this.reviveTicks = 0;
  this.surrenderTicks = 0;
  this.jumpHold = createJumpHold();
  this.surrenderMenuOpen = false;
  this.reviver = null;
  this.ended = false;
  this.droneRescuing = false;
  this.droneRescueTicks = 0;
  this.droneRescuerName = "";
  this.droneEntity = null;
  this.graceTicks = 20; // 倒地初始 1 秒保护期，防止同发枪弹瞬间暴毙

  // 根据所处区域类型动态分配流血濒死时间 (安全区 90s, 法制区 60s, 荒原区 35s)
  const zoneType = TemperatureManager.resolvePlayerZoneType(player);
  if (zoneType === "safe") {
   this.maxKnockedTicks = 90 * 20; // 90 秒
  } else if (zoneType === "law") {
   this.maxKnockedTicks = 60 * 20; // 60 秒 (高容错)
  } else {
   this.maxKnockedTicks = 35 * 20; // 35 秒 (硬核紧张)
  }

  // 锁定控制与播放倒伏动画
  this.lockControls(true);
  this.playFallAnimation();

  // 给予初始保护
  this.applyDownedEffects();

  // 全服或就近广播呼救 (全彩零灰色)
  this.broadcastHelpMessage();
  this.player.sendMessage(DownedRescueManager.chatSurrenderAvailable
   ? "§e放弃救援：先松开跳跃，再长按3秒；也可聊天输入 !giveup 打开确认菜单。"
   : "§e放弃救援：先松开跳跃，再长按3秒。当前脚本环境不支持聊天确认入口。");

  // 启动独立驱动循环
  this.runId = system.runInterval(() => this.tick(), 1);
 }

 startDroneRescue(droneEntity, droneConfig) {
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

 lockControls(locked) {
  try {
   if (this.player.inputPermissions) {
    inputCategories.forEach(cat => {
     try {
      this.player.inputPermissions.setPermissionCategory(cat, !locked);
     } catch {}
    });
   }
  } catch {}
 }

 playFallAnimation() {
  system.runTimeout(() => {
   if (this.ended || !this.player.isValid()) return;
   try {
    this.player.playAnimation("animation.humanoid.fall", { stopExpression: "query.is_invisible" });
   } catch {}
  }, 4);
 }

 applyDownedEffects() {
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
 }

 broadcastHelpMessage() {
  try {
   const locStr = `[${Math.floor(this.location.x)}, ${Math.floor(this.location.y)}, ${Math.floor(this.location.z)}]`;
   for (const p of world.getAllPlayers()) {
    if (p.id === this.id) continue;
    p.sendMessage(`§c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    p.sendMessage(`§e【紧急求救】幸存者 §f@${this.player.name} §e身受重伤倒地濒死！`);
    p.sendMessage(`§6坐标: §f${locStr} §6│ 请邻近幸存者速往抢救！`);
    p.sendMessage(`§c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    p.runCommandAsync("playsound random.orb @s ~~~ 0.8 0.8");
   }
  } catch {}
 }

 tick() {
  if (this.ended) return;
  if (!this.player || !this.player.isValid()) {
   this.end();
   return;
  }

  // 倒地初始 1 秒保护倒计时
  if (this.graceTicks > 0) {
   this.graceTicks -= 1;
   if (this.graceTicks === 0) {
    try {
     this.player.removeEffect("resistance");
    } catch {}
   }
  }

  // 维持倒地状态弱化与移动限制
  if (system.currentTick % 20 === 0) {
   this.applyDownedEffects();
  }

  // 0. 无人机机载电除颤优先研判 (5秒急救倒计时，期间锁定放弃挣扎)
  if (this.droneRescuing) {
   if (!this.droneEntity || !this.droneEntity.isValid()) {
    this.droneRescuing = false;
    this.player.sendMessage("§c[紧急生命协议] 伴飞无人机受创或离线，机载急救中断！");
   } else {
    // 长按跳跃无法快速放弃！
    this.surrenderTicks = 0;
    updateJumpHold(this.jumpHold, readJumpPressed(this.player), false);
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

  // 1. 检测附近施救者 (2.8 格范围内按住潜行的健康玩家)
  const nearbyPlayers = this.dimension.getPlayers({
   location: this.player.location,
   maxDistance: 2.8,
   excludeNames: [this.player.name]
  }).filter(p => !DownedRescueManager.isPlayerDowned(p));

  // 提示附近玩家可以施救
  for (const p of nearbyPlayers) {
   if (!p.isSneaking) {
    p.onScreenDisplay.setActionBar(`§e按住【潜行】键紧急救助 §f@${this.player.name}`);
   }
  }

  const reviverCandidate = nearbyPlayers.find(p => p.isSneaking);
  this.reviver = reviverCandidate || null;

  // 2. 救援进度演算
  if (this.reviver) {
   updateJumpHold(this.jumpHold, readJumpPressed(this.player), false);
   this.surrenderTicks = 0;
   // 播放施救者心肺复苏按压动作
   try { this.reviver.playAnimation("animation.humanoid.reviver"); } catch {}

   // 检查施救者是否持有医疗物品 (急救包 / 绷带) 提速 200%
   let hasMedicalSupply = false;
   try {
    const eq = this.reviver.getComponent("minecraft:equippable");
    const main = eq?.getEquipment(EquipmentSlot.Mainhand);
    const off = eq?.getEquipment(EquipmentSlot.Offhand);
    if (main && (main.typeId.includes("first_aid") || main.typeId.includes("bandage") || main.typeId.includes("medikit"))) hasMedicalSupply = true;
    if (off && (off.typeId.includes("first_aid") || off.typeId.includes("bandage") || off.typeId.includes("medikit"))) hasMedicalSupply = true;
   } catch {}

   // 有医疗包每次 +2，否则 +1 (总共 80 tick = 4秒，医疗包仅需 2秒)
   this.reviveTicks += (hasMedicalSupply ? 2 : 1);

   // 施救音效
   if (system.currentTick % 20 === 0) {
    this.reviver.runCommandAsync("playsound random.pop @s ~~~ 0.7 1.4");
   }
  } else {
   // 没有施救者时，救援进度缓慢回退
   this.reviveTicks = Math.max(0, this.reviveTicks - 1);

   // Read raw logical input while Jump/movement are locked. isJumping reflects
   // physical motion and stays false under those locks. A pre-knock hold cannot
   // surrender; the player must release, then intentionally hold for 3 seconds.
   updateJumpHold(this.jumpHold, readJumpPressed(this.player));
   this.surrenderTicks = this.jumpHold.ticks;

   // 流血计时累加
   this.knockedTicks += 1;

   // 沉重濒死心跳感官音效 (每 30 ticks 一次)
   if (system.currentTick % 30 === 0) {
    try {
     this.player.runCommandAsync("playsound mob.warden.heartbeat @s ~~~ 0.7 0.9");
    } catch {}
   }
  }

  // 3. 屏幕 Actionbar 全彩动态反馈 (严格零灰色)
  this.renderActionBar();

  // 4. 判定完成/死亡分支
  if (this.reviveTicks >= 80) {
   this.revive(this.reviver?.name || "队友");
  } else if (this.jumpHold.triggered || this.knockedTicks >= this.maxKnockedTicks) {
   this.kill();
  }
 }

 async showSurrenderMenu() {
  if (this.ended || this.surrenderMenuOpen || this.droneRescuing || this.reviver) {
   if (!this.ended) this.player.sendMessage("§e正在接受救援时不能放弃，请等待救援结果。");
   return;
  }
  this.surrenderMenuOpen = true;
  try {
   const result = await new MessageFormData().title("放弃救援")
    .body("确认放弃本次救援并阵亡？此操作不能撤销。")
    .button1("继续等待救援").button2("确认放弃").show(this.player);
   if (result.canceled || result.selection !== 1 || this.ended || this.droneRescuing || this.reviver) return;
   if (DownedRescueManager.activeInstances.get(this.id) !== this || participant(this.player)) return;
   this.kill();
  } catch (error) {
   console.warn(`[DownedRescue] Surrender menu pending: ${error}`);
  } finally {
   this.surrenderMenuOpen = false;
  }
 }

 renderActionBar() {
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
    const ratio = this.surrenderTicks / 60;
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
   this.player.onScreenDisplay.setActionBar(`§c【濒死倒地 HP: §e${currentHp}§c/§e${maxHp}§c】 ${bar} §e${remainSec}§c秒 §6│ 【潜行】施救 §6│ 先松开再长按【跳跃】3秒放弃`);
   this.player.nameTag = `§c@${this.player.name} §e[HP:${currentHp}/${maxHp}]\n${bar}`;
  } catch {}
 }

 end() {
  if (this.ended) return;
  this.ended = true;
  if (this.runId !== undefined) {
   system.clearRun(this.runId);
  }

  DownedRescueManager.activeInstances.delete(this.id);

  if (this.player && this.player.isValid()) {
   this.player.nameTag = this.player.name;
   this.lockControls(false);

   // 通过微量隐身效果中断并重置 hold_on_last_frame 倒地卧倒姿态
   try {
    this.player.addEffect("invisibility", 3, { showParticles: false });
   } catch {}

   if (this.reviver && this.reviver.isValid()) {
    this.reviver.onScreenDisplay.setActionBar("");
   }
  }
 }

 revive(reviverName = "队友", isDrone = false) {
  this.end();
  if (!this.player || !this.player.isValid()) return;

  system.runTimeout(() => {
   if (!this.player.isValid() || participant(this.player)) return;
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
 }

 kill(killer = null, isExecution = false) {
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

  // 广播阵亡提示
  try {
   for (const p of world.getAllPlayers()) {
    p.sendMessage(`§c幸存者 @${this.player.name} 伤势过重，不幸阵亡了...`);
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
 }
}

/**
 * 倒地救援全局管理器
 */
export class DownedRescueManager {
 static activeInstances = new Map();
 static chatSurrenderAvailable = false;

 static init() {
  console.warn("[DownedRescueManager] Downed & Rescue System initializing...");

  // 1. 强制确保持续即时复活 (保证倒地瞬间不弹出原版死亡停顿界面)
  this.enforceGamerules();
  system.runInterval(() => this.enforceGamerules(), 200);

  // 2.1 倒地受创监听：允许被枪械击中、扣血并支持补枪处决
  if (world.afterEvents?.entityHurt) {
   world.afterEvents.entityHurt.subscribe((event) => {
    const hurtEntity = event.hurtEntity;
    if (!hurtEntity || hurtEntity.typeId !== "minecraft:player" || participant(hurtEntity)) return;

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
    if (!deadEntity || deadEntity.typeId !== "minecraft:player" || participant(deadEntity)) return;

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
    }

    const loc = { x: deadEntity.location.x, y: deadEntity.location.y, z: deadEntity.location.z };
    const dim = deadEntity.dimension;

    // 启动即刻拉回与倒地流程 (等待即时复活完成后将玩家瞬间传送回原处倒伏)
    let attempts = 0;
    const pullId = system.runInterval(() => {
     if (!player.isValid() || participant(player) || ++attempts > 40) {
      system.clearRun(pullId);
      return;
     }

     const healthComp = player.getComponent(EntityComponentTypes.Health);
     if (healthComp && healthComp.currentValue > 0) {
      // 复活完毕，瞬间拉回致死点
      player.teleport(loc, { dimension: dim });
      system.clearRun(pullId);

      // 创建倒地实例
      system.runTimeout(() => {
       if (player.isValid() && !participant(player) && !this.activeInstances.has(player.id)) {
        const instance = new DownedPlayerInstance(player, loc, dim);
        this.activeInstances.set(player.id, instance);
       }
      }, 1);
     }
    }, 1);
   });
  }

  // Chat remains available when a touch device hides the locked Jump button.
  this.chatSurrenderAvailable = !!world.beforeEvents?.chatSend?.subscribe;
  if (!this.chatSurrenderAvailable) console.warn("[DownedRescue] chatSend is unavailable; !giveup confirmation is not supported here.");
  world.beforeEvents?.chatSend?.subscribe(event => {
   if (!["!giveup", "!放弃"].includes(event.message.trim().toLowerCase())) return;
   const player = event.sender;
   if (participant(player)) return; // PvP owns its own menu/final-death decision.
   const instance = this.activeInstances.get(player.id);
   if (!instance) return;
   event.cancel = true;
   system.run(() => {
    if (player.isValid() && this.activeInstances.get(player.id) === instance) instance.showSurrenderMenu();
   });
  });

  // 3. 不死图腾 / 强心针自救监听
  if (world.beforeEvents?.itemUse) {
   world.beforeEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack: item } = event;
    if (!player || player.typeId !== "minecraft:player" || !item) return;

    if (this.isPlayerDowned(player)) {
     if (item.typeId === "minecraft:totem_of_undying") {
      system.run(() => {
       const inst = this.activeInstances.get(player.id);
       if (inst) {
        inst.revive("不死图腾 (自救)");
        const eq = player.getComponent("minecraft:equippable");
        if (eq) {
         if (item.amount > 1) {
          item.amount -= 1;
          eq.setEquipment(EquipmentSlot.Mainhand, item);
         } else {
          eq.setEquipment(EquipmentSlot.Mainhand, null);
         }
        }
       }
      });
     }
    }
   });
  }
 }

 static enforceGamerules() {
  try {
   world.gameRules.doImmediateRespawn = true;
   world.gameRules.keepInventory = true;
  } catch {}
 }

 static isPlayerDowned(player) {
  if (!player) return false;
  return this.activeInstances.has(player.id);
 }

 static startDroneRescue(player, droneEntity, droneConfig) {
  if (participant(player)) return false;
  const inst = this.activeInstances.get(player.id);
  if (inst) {
   inst.startDroneRescue(droneEntity, droneConfig);
   return true;
  }
  return false;
 }

 static revivePlayer(player, reviverName = "救助") {
  if (participant(player)) return;
  const inst = this.activeInstances.get(player.id);
  if (inst) {
   inst.revive(reviverName);
  }
 }
}
