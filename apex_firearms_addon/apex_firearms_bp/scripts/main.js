import { world, system, ItemStack } from "@minecraft/server";
import { AK47_CONFIG, AmmoSystem } from "./AmmoSystem.js";
import { GunEngine } from "./GunEngine.js";
import { ReloadManager } from "./ReloadManager.js";
import { TestSuite } from "./TestSuite.js";

console.warn("[ApexFirearms] Tactical AK-47 Addon v1.0.5 initializing...");

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

// 1. ScriptEvent 核心触发监听 (由 Molang 探针精确驱动，绝无重复与残留)
const systemAfter = system.afterEvents;
if (systemAfter && systemAfter.scriptEventReceive) {
  systemAfter.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    try {
      if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;
      if (id === "apex:trigger_down") {
        GunEngine.handleTriggerStart(sourceEntity);
      } else if (id === "apex:trigger_up") {
        GunEngine.handleTriggerStop(sourceEntity);
      } else if (id === "apex:gunkit" || id === "apex:kit") {
        giveDevKit(sourceEntity);
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

// 2. 停火事件安全冗余
const handleStopFiring = (event) => {
  try {
    GunEngine.handleTriggerStop(event.source);
  } catch (e) {}
};

subscribeAfterEvent("itemStopUse", handleStopFiring);
subscribeAfterEvent("itemReleaseUse", handleStopFiring);
subscribeAfterEvent("itemStopUseOn", handleStopFiring);

// 3. 20 TPS 主引擎驱动
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

/**
 * 发放枪械补给包
 */
function giveDevKit(player) {
  try {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) {
      player.sendMessage("§c✖ 无法打开背包！");
      return;
    }

    try {
      const gun = new ItemStack(AK47_CONFIG.id, 1);
      AmmoSystem.setMagazineAmmo(gun, AK47_CONFIG.magSize);
      inv.container.addItem(gun);
    } catch (err) {
      player.runCommandAsync(`give @s ${AK47_CONFIG.id} 1`);
    }

    try {
      inv.container.addItem(new ItemStack(AK47_CONFIG.ammoId, 64));
      inv.container.addItem(new ItemStack(AK47_CONFIG.ammoId, 64));
      inv.container.addItem(new ItemStack(AK47_CONFIG.ammoId, 64));
      inv.container.addItem(new ItemStack(AK47_CONFIG.ammoId, 64));
    } catch {
      player.runCommandAsync(`give @s ${AK47_CONFIG.ammoId} 64`);
      player.runCommandAsync(`give @s ${AK47_CONFIG.ammoId} 64`);
    }

    try {
      player.playSound("apex.gun.draw", { location: player.location, volume: 1.0, pitch: 1.0 });
    } catch {}

    player.sendMessage("§a✔ 已成功领取【战术 AK-47】与 4 组 7.62mm 弹药！");
  } catch (err) {
    player.sendMessage(`§c✖ 发放补给失败: ${err}`);
  }
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
    if (!item || item.typeId !== AK47_CONFIG.id) {
      player.sendMessage("§c✖ 手持栏未持有 AK-47！");
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
  player.sendMessage("§l§e=== Apex Firearms: Tactical AK-47 指令指南 ===");
  player.sendMessage("§6!gunkit§7 - 快捷领取 AK-47 与 7.62mm 弹药");
  player.sendMessage("§6!r 或 !reload§7 - 快速换弹 (亦可潜行右键或打空后点击自动换弹)");
  player.sendMessage("§6!dummy§7 - 生成 5000 HP 测试靶人");
  player.sendMessage("§6!test§7 - 运行自动化射速、无敌帧与伤害测试套件");
  player.sendMessage("§7操作方式: 右键点按单发 / 长按连射，松开即停，潜行(Shift)+右键直接换弹");
}

// 6. 玩家进退场与死亡清理
subscribeAfterEvent("playerSpawn", ({ player, initialSpawn }) => {
  try {
    if (initialSpawn && player) {
      player.sendMessage("§l§6[Apex Firearms]§r §a单武器示范模组已就绪！输入 §e!gunkit§a 获取 AK-47，输入 §e!test§a 运行评测套件。§r");
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

console.warn("[ApexFirearms] Tactical AK-47 Addon loaded successfully without errors!");
