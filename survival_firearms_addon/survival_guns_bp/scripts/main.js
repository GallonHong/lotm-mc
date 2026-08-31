import { world, system } from "@minecraft/server";
import { GunRegistry } from "./guns/GunRegistry.js";
import { GunController } from "./guns/GunController.js";
import { ReloadManager } from "./guns/ReloadManager.js";
import { WeaponCraftingManager } from "./guns/WeaponCraftingManager.js";
import { GunTestSuite } from "./tests/GunTestSuite.js";

console.warn("[SurvivalFirearms] Addon initializing v2.0.0...");

/**
 * Subscribe only when this Bedrock runtime exposes a usable event signal.
 * Some engine builds promote the requested Script API module but omit
 * individual signals, so event registration must never dereference a missing
 * signal directly.
 */
function subscribeAfterEvent(eventName, handler) {
  try {
    const afterEvents = world.afterEvents;
    const signal = afterEvents ? afterEvents[eventName] : undefined;
    if (!signal || typeof signal.subscribe !== "function") {
      console.warn(`[SurvivalFirearms] Event unavailable: ${eventName}`);
      return false;
    }

    signal.subscribe(handler);
    return true;
  } catch (err) {
    console.warn(`[SurvivalFirearms] Could not subscribe to ${eventName}: ${err}`);
    return false;
  }
}

// 1. 初始化枪械与图纸注册
GunRegistry.init();

// 2. 连接测试套件回调
WeaponCraftingManager.onRunTestSuite = (player) => {
  GunTestSuite.runAll(player);
};

// 3. 普通 itemUse 只处理便携菜单。枪械射击由行为动画控制器实时读取
// q.main_hand_item_use_duration，并通过 survival:fire 发出独立单发请求。
subscribeAfterEvent("itemUse", (event) => {
  try {
    GunController.handleItemUse(event);
  } catch (err) {
    console.error(`[SurvivalFirearms] Error in itemUse: ${err}`);
  }
});

// 5. 20 TPS 主循环驱动
system.runInterval(() => {
  try {
    GunController.onTick();
  } catch (err) {
    console.error(`[SurvivalFirearms] Error in onTick: ${err}`);
  }
}, 1);

// 6. 聊天指令支持
function handleChat(event) {
  const rawMsg = event.message || "";
  const msg = rawMsg.trim().toLowerCase();
  const player = event.sender;
  if (!player) return;

  if (msg === "!guntest" || msg === "!guntest all") {
    if ("cancel" in event) event.cancel = true;
    system.run(() => GunTestSuite.runAll(player));
  } else if (msg === "!guntest rpm") {
    if ("cancel" in event) event.cancel = true;
    system.run(() => GunTestSuite.testRpmAccuracy((m) => player.sendMessage(m)));
  } else if (msg === "!guntest damage") {
    if ("cancel" in event) event.cancel = true;
    system.run(() => GunTestSuite.testDamageInvulnerabilityBypass(player, (m) => player.sendMessage(m)));
  } else if (msg === "!workbench" || msg === "!gun") {
    if ("cancel" in event) event.cancel = true;
    system.run(() => WeaponCraftingManager.openWorkbenchUI(player));
  } else if (msg === "!gunkit") {
    if ("cancel" in event) event.cancel = true;
    system.run(() => WeaponCraftingManager.giveDevKit(player));
  } else if (msg === "!reload" || msg === "!r") {
    if ("cancel" in event) event.cancel = true;
    system.run(() => GunController.requestReload(player));
  }
}

const beforeEvents = world.beforeEvents;
const beforeChat = beforeEvents ? beforeEvents.chatSend : undefined;
const afterEvents = world.afterEvents;
const afterChat = afterEvents ? afterEvents.chatSend : undefined;
if (beforeChat && typeof beforeChat.subscribe === "function") {
  beforeChat.subscribe(handleChat);
} else if (afterChat && typeof afterChat.subscribe === "function") {
  afterChat.subscribe(handleChat);
}

// 7. 脚本事件指令支持 (/scriptevent survival:...)
const systemAfterEvents = system.afterEvents;
const scriptEventReceive = systemAfterEvents ? systemAfterEvents.scriptEventReceive : undefined;
if (scriptEventReceive && typeof scriptEventReceive.subscribe === "function") {
  scriptEventReceive.subscribe(({ id, message, sourceEntity }) => {
    if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;
    if (id === "survival:workbench" || id === "survival:menu") {
      WeaponCraftingManager.openWorkbenchUI(sourceEntity);
    } else if (id === "survival:gunkit") {
      WeaponCraftingManager.giveDevKit(sourceEntity);
    } else if (id === "survival:test" || id === "survival:guntest") {
      GunTestSuite.runAll(sourceEntity);
    } else if (id === "survival:reload") {
      GunController.requestReload(sourceEntity);
    } else if (id === "survival:fire") {
      GunController.handleMolangFire(sourceEntity, message);
    }
  });
}

// 8. 玩家进退事件
subscribeAfterEvent("playerSpawn", ({ player, initialSpawn }) => {
  try {
    if (initialSpawn && player) {
      player.sendMessage("§l§e[Survival Firearms]§r §a原创四枪系统已就绪！§fM1911/M870 单击射击，AKM/MP5 长按连射；松开立即停止。§r");
    }
  } catch (err) {
    console.error(`[SurvivalFirearms] Error in playerSpawn: ${err}`);
  }
});

subscribeAfterEvent("playerLeave", (event) => {
  try {
    GunController.resetPlayer(event.playerId);
    ReloadManager.cancelReload(event.playerId);
  } catch (err) {
    console.error(`[SurvivalFirearms] Error in playerLeave: ${err}`);
  }
});

subscribeAfterEvent("entityDie", ({ deadEntity }) => {
  try {
    if (deadEntity?.typeId === "minecraft:player") {
      GunController.resetPlayer(deadEntity.id);
      ReloadManager.cancelReload(deadEntity.id, deadEntity);
    }
  } catch {}
});

console.warn("[SurvivalFirearms] Addon v2.0.0 loaded successfully without errors!");
