import { world, system } from "@minecraft/server";
import { GunRegistry } from "./guns/GunRegistry.js";
import { GunController } from "./guns/GunController.js";
import { ReloadManager } from "./guns/ReloadManager.js";
import { WeaponCraftingManager } from "./guns/WeaponCraftingManager.js";
import { GunTestSuite } from "./tests/GunTestSuite.js";

console.warn("[SurvivalFirearms] Addon initializing v1.3.7 MVP...");

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

// 3. 物品使用事件。AKM/MP5 支持长按，并由松开事件、再次点击和硬超时共同停止。
const hasItemStartUse = subscribeAfterEvent("itemStartUse", (event) => {
  try {
    GunController.handleItemStartUse(event);
  } catch (err) {
    console.error(`[SurvivalFirearms] Error in itemStartUse: ${err}`);
  }
});

// itemUse is a compatibility fallback only. Handling both signals for guns can
// re-press the trigger after release and leave automatic weapons firing.
// The portable workbench still needs the ordinary itemUse signal.
subscribeAfterEvent("itemUse", (event) => {
  try {
    const itemTypeId = event.itemStack ? event.itemStack.typeId : "";
    if (itemTypeId === "survival:gun_workbench") {
      GunController.handleItemUse(event);
    } else if (!hasItemStartUse) {
      // Runtimes without itemStartUse cannot reliably report a held trigger.
      // Fire a short, bounded compatibility burst and always release it.
      GunController.handleItemUse(event);
      system.runTimeout(() => {
        try {
          GunController.handleItemStopUse(event);
        } catch {}
      }, 4);
    }
  } catch (err) {
    console.error(`[SurvivalFirearms] Error in itemUse: ${err}`);
  }
});

// 4. 松开右键 / 释放物品 -> 立即停止射击
const stopFiring = (event) => {
  try {
    GunController.handleItemStopUse(event);
  } catch (err) {
    console.error(`[SurvivalFirearms] Error while stopping fire: ${err}`);
  }
};

// itemStopUse is the matching release signal for itemStartUse. The other two
// signals cover charge-release and use-on-block variations across platforms.
subscribeAfterEvent("itemStopUse", stopFiring);
subscribeAfterEvent("itemReleaseUse", stopFiring);
subscribeAfterEvent("itemStopUseOn", stopFiring);

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
  scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;
    if (id === "survival:workbench" || id === "survival:menu") {
      WeaponCraftingManager.openWorkbenchUI(sourceEntity);
    } else if (id === "survival:gunkit") {
      WeaponCraftingManager.giveDevKit(sourceEntity);
    } else if (id === "survival:test" || id === "survival:guntest") {
      GunTestSuite.runAll(sourceEntity);
    } else if (id === "survival:reload") {
      GunController.requestReload(sourceEntity);
    }
  });
}

// 8. 玩家进退事件
subscribeAfterEvent("playerSpawn", ({ player, initialSpawn }) => {
  try {
    if (initialSpawn && player) {
      player.sendMessage("§l§e[Survival Firearms]§r §a四枪 MVP 已就绪！§fM1911/M870 单击射击，AKM/MP5 长按连射，!reload 换弹。§r");
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

console.warn("[SurvivalFirearms] Addon loaded successfully without errors!");
