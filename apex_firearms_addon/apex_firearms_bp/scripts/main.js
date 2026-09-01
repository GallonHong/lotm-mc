import { world, system, ItemStack } from "@minecraft/server";
import { GUN_CONFIGS, AK47_CONFIG, M82_CONFIG, VECTOR_CONFIG, MGL_CONFIG, ARC_CONFIG, SHOTGUN_CONFIG, AmmoSystem } from "./AmmoSystem.js";
import { GunEngine } from "./GunEngine.js";
import { ReloadManager } from "./ReloadManager.js";
import { ArmorEngine } from "./ArmorEngine.js";
import { TestSuite } from "./TestSuite.js";

console.warn("[ApexFirearms] Tactical Arsenal & Titan Exo-Armor Addon v2.0.0 initializing...");

/**
 * 安全事件订阅工具函数
 */
function subscribeAfterEvent(eventName, handler) {
  try {
    const afterEvents = world.afterEvents;
    const signal = afterEvents ? afterEvents[eventName] : undefined;
    if (!signal || typeof signal.subscribe !== "function") return false;
    signal.subscribe(handler);
    return true;
  } catch (err) {
    console.warn(`[ApexFirearms] Could not subscribe to ${eventName}: ${err}`);
    return false;
  }
}

// 1. 枪械使用事件 (支持全部 6 大专属武器)
subscribeAfterEvent("itemUse", (event) => {
  try {
    const item = event.itemStack;
    if (item && GUN_CONFIGS[item.typeId]) {
      GunEngine.handleGunUse(event.source, item);
    }
  } catch (e) {
    console.error(`[ApexFirearms] Error in itemUse: ${e}`);
  }
});

// 2. 实体受伤害事件 (外骨骼动力装甲受击护盾 & 战靴防摔落)
subscribeAfterEvent("entityHurt", (event) => {
  try {
    ArmorEngine.handleEntityHurt(event);
  } catch (e) {
    console.error(`[ApexFirearms] Error in entityHurt: ${e}`);
  }
});

// 3. 20 TPS 主引擎轮询 (枪械弹道、状态机、外骨骼装甲被动光环)
system.runInterval(() => {
  try {
    GunEngine.onTick();
  } catch (e) {
    console.error(`[ApexFirearms] Error in GunEngine.onTick: ${e}`);
  }
}, 1);

// 4. 指令统一执行器
let lastCommandTick = new Map();

function executeCommand(player, rawText) {
  if (!player || !player.isValid()) return false;
  const text = (rawText || "").trim().toLowerCase();
  
  const key = `${player.id}_${text}`;
  const now = system.currentTick;
  if (lastCommandTick.has(key) && (now - lastCommandTick.get(key) < 2)) {
    return true;
  }
  lastCommandTick.set(key, now);

  if (text === "!gunkit" || text === "!kit" || text === "!gun") {
    giveDevKit(player);
    return true;
  } else if (text === "!armor" || text === "!suit" || text === "!exo") {
    giveArmorKit(player);
    return true;
  } else if (text === "!r" || text === "!reload") {
    triggerReload(player);
    return true;
  } else if (text === "!test" || text === "!guntest") {
    TestSuite.runAll(player);
    return true;
  } else if (text === "!dummy") {
    spawnDummy(player);
    return true;
  } else if (text === "!help" || text === "!apex") {
    showHelp(player);
    return true;
  }
  return false;
}

// 5. 双重聊天事件监听
const beforeChat = world.beforeEvents ? world.beforeEvents.chatSend : undefined;
if (beforeChat && typeof beforeChat.subscribe === "function") {
  beforeChat.subscribe((event) => {
    try {
      const msg = event.message || "";
      if (msg.startsWith("!")) {
        event.cancel = true;
        const player = event.sender;
        system.run(() => executeCommand(player, msg));
      }
    } catch (e) {}
  });
}

const afterChat = world.afterEvents ? world.afterEvents.chatSend : undefined;
if (afterChat && typeof afterChat.subscribe === "function") {
  afterChat.subscribe((event) => {
    try {
      const msg = event.message || "";
      if (msg.startsWith("!")) {
        const player = event.sender;
        system.run(() => executeCommand(player, msg));
      }
    } catch (e) {}
  });
}

// 6. ScriptEvent 原版指令支持 (/scriptevent apex:...)
const systemAfter = system.afterEvents;
if (systemAfter && systemAfter.scriptEventReceive) {
  systemAfter.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    try {
      if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;
      if (id === "apex:gunkit" || id === "apex:kit") {
        giveDevKit(sourceEntity);
      } else if (id === "apex:armor" || id === "apex:suit") {
        giveArmorKit(sourceEntity);
      } else if (id === "apex:reload" || id === "apex:r") {
        triggerReload(sourceEntity);
      } else if (id === "apex:test" || id === "apex:guntest") {
        TestSuite.runAll(sourceEntity);
      } else if (id === "apex:dummy") {
        spawnDummy(sourceEntity);
      } else if (id === "apex:help") {
        showHelp(sourceEntity);
      }
    } catch (e) {
      console.error(`[ApexFirearms] Error in scriptEventReceive: ${e}`);
    }
  });
}

/**
 * 发放六大专属神枪、外骨骼动力战甲与全套弹药补给包
 */
function giveDevKit(player) {
  try {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) {
      player.sendMessage("§c✖ 无法打开背包！");
      return;
    }

    // 1. 发放 6 把神枪
    const guns = [AK47_CONFIG, M82_CONFIG, VECTOR_CONFIG, MGL_CONFIG, ARC_CONFIG, SHOTGUN_CONFIG];
    for (const g of guns) {
      try {
        const item = new ItemStack(g.id, 1);
        AmmoSystem.setMagazineAmmo(item, g.magSize);
        inv.container.addItem(item);
      } catch {
        player.runCommandAsync(`give @s ${g.id} 1`);
      }
    }

    // 2. 发放泰坦外骨骼全套动力战甲
    giveArmorKit(player);

    // 3. 发放弹药
    try {
      inv.container.addItem(new ItemStack(AK47_CONFIG.ammoId, 64));
      inv.container.addItem(new ItemStack(M82_CONFIG.ammoId, 32));
      inv.container.addItem(new ItemStack(VECTOR_CONFIG.ammoId, 64));
      inv.container.addItem(new ItemStack(MGL_CONFIG.ammoId, 24));
      inv.container.addItem(new ItemStack(ARC_CONFIG.ammoId, 48));
      inv.container.addItem(new ItemStack(SHOTGUN_CONFIG.ammoId, 32));
    } catch {
      player.runCommandAsync(`give @s ${AK47_CONFIG.ammoId} 64`);
      player.runCommandAsync(`give @s ${M82_CONFIG.ammoId} 32`);
      player.runCommandAsync(`give @s ${VECTOR_CONFIG.ammoId} 64`);
      player.runCommandAsync(`give @s ${MGL_CONFIG.ammoId} 24`);
      player.runCommandAsync(`give @s ${ARC_CONFIG.ammoId} 48`);
      player.runCommandAsync(`give @s ${SHOTGUN_CONFIG.ammoId} 32`);
    }

    try {
      player.playSound("apex.gun.draw", { location: player.location, volume: 1.0, pitch: 1.0 });
    } catch {}

    player.sendMessage("§a✔ 已成功领取【六大枪械】、【泰坦外骨骼战甲全套】及满配弹药！");
  } catch (err) {
    player.sendMessage(`§c✖ 发放补给失败: ${err}`);
  }
}

/**
 * 单独发放泰坦外骨骼战甲套
 */
function giveArmorKit(player) {
  try {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return;

    const armors = ["apex:exo_helmet", "apex:exo_chestplate", "apex:exo_leggings", "apex:exo_boots"];
    for (const a of armors) {
      try {
        inv.container.addItem(new ItemStack(a, 1));
      } catch {
        player.runCommandAsync(`give @s ${a} 1`);
      }
    }
  } catch (e) {}
}

/**
 * 触发换弹
 */
function triggerReload(player) {
  try {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return;
    const slot = player.selectedSlotIndex;
    const item = inv.container.getItem(slot);
    if (!item || !GUN_CONFIGS[item.typeId]) {
      player.sendMessage("§c✖ 主手未持有 Apex 枪械！");
      return;
    }
    ReloadManager.startReload(player, item, slot);
  } catch (e) {
    player.sendMessage(`§c✖ 换弹异常: ${e}`);
  }
}

/**
 * 生成 5000 HP 测试靶人
 */
function spawnDummy(player) {
  try {
    const dim = player.dimension;
    const loc = player.location;
    dim.spawnEntity("apex:test_dummy", { x: loc.x + 3, y: loc.y, z: loc.z });
    player.sendMessage("§a✔ 已在前方生成 5000 HP 评测靶人！");
  } catch (e) {
    player.sendMessage(`§c✖ 生成靶人失败: ${e}`);
  }
}

/**
 * 显示帮助指南
 */
function showHelp(player) {
  player.sendMessage("§l§e=== Apex Firearms: 六系终极军火库 & 泰坦战甲指南 ===");
  player.sendMessage("§6!gunkit§7 - 领取 6 把神枪、全套泰坦外骨骼动力装甲与全套弹药");
  player.sendMessage("§6!armor§7 - 单独领取泰坦外骨骼战甲四件套");
  player.sendMessage("§6!r 或 !reload§7 - 快速换弹 (亦可打空后自动换弹)");
  player.sendMessage("§6!dummy§7 - 生成 5000 HP 测试靶人");
  player.sendMessage("§b泰坦战甲技能§7 - 头盔(全息夜视+爆头+25%)、胸甲(受击金心圣盾+联动霰弹枪)、护腿(速度+潜行加速)、战靴(100%免摔伤)、4件套技能(血量<30%触发 EMP 范围轰击与金心绝境自救)！");
}

// 7. 玩家进退场与死亡清理
subscribeAfterEvent("playerSpawn", ({ player, initialSpawn }) => {
  try {
    if (initialSpawn && player) {
      player.sendMessage("§l§6[Apex Firearms]§r §a六系军火库与泰坦外骨骼战甲已就绪！输入 §e!gunkit§a 获取全套神装。§r");
    }
  } catch {}
});

subscribeAfterEvent("playerLeave", ({ playerId }) => {
  try {
    GunEngine.resetPlayer(playerId);
  } catch {}
});

subscribeAfterEvent("entityDie", ({ deadEntity }) => {
  try {
    if (deadEntity && deadEntity.typeId === "minecraft:player") {
      GunEngine.resetPlayer(deadEntity.id);
    }
  } catch {}
});

console.warn("[ApexFirearms] Tactical Arsenal loaded successfully without errors!");
