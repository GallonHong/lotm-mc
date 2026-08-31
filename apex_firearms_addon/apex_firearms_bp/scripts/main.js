import { world, system, ItemStack } from "@minecraft/server";
import { GUN_CONFIGS, AK47_CONFIG, M82_CONFIG, VECTOR_CONFIG, MGL_CONFIG, AmmoSystem } from "./AmmoSystem.js";
import { GunEngine } from "./GunEngine.js";
import { ReloadManager } from "./ReloadManager.js";
import { TestSuite } from "./TestSuite.js";

console.warn("[ApexFirearms] Tactical Arsenal (AK-47, M82, Vector & M32 MGL) Addon v1.4.0 initializing...");

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

// 1. 枪械使用事件 (支持 AK-47、M82、Vector、M32 MGL)
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

// 2. 20 TPS 主引擎轮询
system.runInterval(() => {
  try {
    GunEngine.onTick();
  } catch (e) {
    console.error(`[ApexFirearms] Error in GunEngine.onTick: ${e}`);
  }
}, 1);

// 3. 指令统一执行器
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

// 4. 双重聊天事件监听
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

// 5. ScriptEvent 原版指令支持 (/scriptevent apex:...)
const systemAfter = system.afterEvents;
if (systemAfter && systemAfter.scriptEventReceive) {
  systemAfter.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    try {
      if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;
      if (id === "apex:gunkit" || id === "apex:kit") {
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

/**
 * 发放四大神枪与弹药补给包
 */
function giveDevKit(player) {
  try {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) {
      player.sendMessage("§c✖ 无法打开背包！");
      return;
    }

    // 1. 发放 AK-47
    try {
      const ak = new ItemStack(AK47_CONFIG.id, 1);
      AmmoSystem.setMagazineAmmo(ak, AK47_CONFIG.magSize);
      inv.container.addItem(ak);
    } catch {
      player.runCommandAsync(`give @s ${AK47_CONFIG.id} 1`);
    }

    // 2. 发放 M82A1
    try {
      const m82 = new ItemStack(M82_CONFIG.id, 1);
      AmmoSystem.setMagazineAmmo(m82, M82_CONFIG.magSize);
      inv.container.addItem(m82);
    } catch {
      player.runCommandAsync(`give @s ${M82_CONFIG.id} 1`);
    }

    // 3. 发放 Vector .45
    try {
      const vec = new ItemStack(VECTOR_CONFIG.id, 1);
      AmmoSystem.setMagazineAmmo(vec, VECTOR_CONFIG.magSize);
      inv.container.addItem(vec);
    } catch {
      player.runCommandAsync(`give @s ${VECTOR_CONFIG.id} 1`);
    }

    // 4. 发放 M32 MGL 六连发榴弹炮
    try {
      const mgl = new ItemStack(MGL_CONFIG.id, 1);
      AmmoSystem.setMagazineAmmo(mgl, MGL_CONFIG.magSize);
      inv.container.addItem(mgl);
    } catch {
      player.runCommandAsync(`give @s ${MGL_CONFIG.id} 1`);
    }

    // 5. 发放弹药
    try {
      inv.container.addItem(new ItemStack(AK47_CONFIG.ammoId, 64));
      inv.container.addItem(new ItemStack(M82_CONFIG.ammoId, 32));
      inv.container.addItem(new ItemStack(VECTOR_CONFIG.ammoId, 64));
      inv.container.addItem(new ItemStack(MGL_CONFIG.ammoId, 24));
    } catch {
      player.runCommandAsync(`give @s ${AK47_CONFIG.ammoId} 64`);
      player.runCommandAsync(`give @s ${M82_CONFIG.ammoId} 32`);
      player.runCommandAsync(`give @s ${VECTOR_CONFIG.ammoId} 64`);
      player.runCommandAsync(`give @s ${MGL_CONFIG.ammoId} 24`);
    }

    try {
      player.playSound("apex.gun.draw", { location: player.location, volume: 1.0, pitch: 1.0 });
    } catch {}

    player.sendMessage("§a✔ 已成功领取【AK-47】、【M82A1】、【Vector】、【M32自动榴弹炮】及全套弹药！");
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
  player.sendMessage("§l§e=== Apex Firearms: 终极四系军火库指南 ===");
  player.sendMessage("§6!gunkit§7 - 领取 AK-47、M82A1、Vector、M32 榴弹炮与全套弹药");
  player.sendMessage("§6!r 或 !reload§7 - 快速换弹 (亦可打空后自动换弹)");
  player.sendMessage("§6!dummy§7 - 生成 5000 HP 测试靶人");
  player.sendMessage("§6M32 自动榴弹炮§7 - 6发 40mm 破片高爆弹，2.5 威力爆炸，安全防拆家（绝不破坏地形）！");
}

// 6. 玩家进退场与死亡清理
subscribeAfterEvent("playerSpawn", ({ player, initialSpawn }) => {
  try {
    if (initialSpawn && player) {
      player.sendMessage("§l§6[Apex Firearms]§r §a四系军火库已就绪！输入 §e!gunkit§a 获取全部 4 把专属枪械。§r");
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
