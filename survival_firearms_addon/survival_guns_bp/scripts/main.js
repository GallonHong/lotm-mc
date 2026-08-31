import { world, system } from "@minecraft/server";
import { GunRegistry } from "./guns/GunRegistry.js";
import { GunController } from "./guns/GunController.js";
import { FireScheduler } from "./guns/FireScheduler.js";
import { ReloadManager } from "./guns/ReloadManager.js";
import { WeaponCraftingManager } from "./guns/WeaponCraftingManager.js";
import { GunTestSuite } from "./tests/GunTestSuite.js";

console.warn("[SurvivalFirearms] Addon initializing v1.0.0...");

// 1. 初始化枪械与图纸注册
GunRegistry.init();

// 2. 连接测试套件回调
WeaponCraftingManager.onRunTestSuite = (player) => {
  GunTestSuite.runAll(player);
};

// 3. 物品使用与长按开火事件
if (world.afterEvents?.itemStartUse?.subscribe) {
  world.afterEvents.itemStartUse.subscribe((event) => {
    try {
      GunController.handleItemStartUse(event);
    } catch (err) {
      console.error(`[SurvivalFirearms] Error in itemStartUse: ${err}`);
    }
  });
}

if (world.afterEvents?.itemUse?.subscribe) {
  world.afterEvents.itemUse.subscribe((event) => {
    try {
      GunController.handleItemUse(event);
    } catch (err) {
      console.error(`[SurvivalFirearms] Error in itemUse: ${err}`);
    }
  });
}

// 4. 松开右键 / 释放物品 -> 立即停止射击
if (world.afterEvents?.itemReleaseUse?.subscribe) {
  world.afterEvents.itemReleaseUse.subscribe((event) => {
    try {
      GunController.handleItemReleaseUse(event);
    } catch (err) {
      console.error(`[SurvivalFirearms] Error in itemReleaseUse: ${err}`);
    }
  });
}

if (world.afterEvents?.itemStopUseOn?.subscribe) {
  world.afterEvents.itemStopUseOn.subscribe((event) => {
    try {
      GunController.handleItemStopUse(event);
    } catch (err) {
      console.error(`[SurvivalFirearms] Error in itemStopUseOn: ${err}`);
    }
  });
}

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
  }
}

const beforeChat = world.beforeEvents?.chatSend;
const afterChat = world.afterEvents?.chatSend;
if (beforeChat?.subscribe) {
  beforeChat.subscribe(handleChat);
} else if (afterChat?.subscribe) {
  afterChat.subscribe(handleChat);
}

// 7. 脚本事件指令支持 (/scriptevent survival:...)
if (system.afterEvents?.scriptEventReceive?.subscribe) {
  system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;
    if (id === "survival:workbench" || id === "survival:menu") {
      WeaponCraftingManager.openWorkbenchUI(sourceEntity);
    } else if (id === "survival:gunkit") {
      WeaponCraftingManager.giveDevKit(sourceEntity);
    } else if (id === "survival:test" || id === "survival:guntest") {
      GunTestSuite.runAll(sourceEntity);
    }
  });
}

// 8. 玩家进退事件
if (world.afterEvents?.playerSpawn?.subscribe) {
  world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (initialSpawn && player) {
      player.sendMessage("§l§e[Survival Firearms]§r §a末日生存枪械已就绪！输入 §f!workbench §a或 §f!gunkit §a开始体验。");
    }
  });
}

if (world.afterEvents?.playerLeave?.subscribe) {
  world.afterEvents.playerLeave.subscribe((event) => {
    FireScheduler.reset(event.playerId);
    ReloadManager.cancelReload(event.playerId);
  });
}

console.warn("[SurvivalFirearms] Addon loaded successfully without errors!");
