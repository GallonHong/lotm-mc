import { world, system, ItemStack } from "@minecraft/server";
import { GUN_CONFIGS, AK47_CONFIG, M82_CONFIG, VECTOR_CONFIG, MGL_CONFIG, ARC_CONFIG, SHOTGUN_CONFIG, AmmoSystem } from "./AmmoSystem.js";
import { GunEngine } from "./GunEngine.js";
import { ReloadManager } from "./ReloadManager.js";
import { ArmorEngine } from "./ArmorEngine.js";
import { ShieldEngine } from "./ShieldEngine.js";
import { TestSuite } from "./TestSuite.js";

console.warn("[ApexFirearms] Tactical Arsenal, Titan Exo-Armor & Riot Shield Addon v2.2.0 initializing...");

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

// 1. 物品/武器使用事件 (支持 6 大专属武器 & 重装动能反甲盾主动冲击波)
subscribeAfterEvent("itemUse", (event) => {
  try {
    const item = event.itemStack;
    const player = event.source;
    if (!item || !player) return;

    if (GUN_CONFIGS[item.typeId]) {
      GunEngine.handleGunUse(player, item);
    } else if (item.typeId === "apex:riot_shield") {
      ShieldEngine.handleShieldBash(player);
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
  } else if (text === "!armor" || text === "!suit" || text === "!exo" || text === "!jetpack" || text === "!shield") {
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

// 5. 聊天指令监听器 (优先使用 beforeEvents 拦截指令不显示在公屏)
const beforeChat = world.beforeEvents ? world.beforeEvents.chatSend : undefined;
if (beforeChat && typeof beforeChat.subscribe === "function") {
  beforeChat.subscribe((event) => {
    try {
      const msg = event.message || "";
      if (msg.startsWith("!")) {
        const player = event.sender;
        const handled = executeCommand(player, msg);
        if (handled) {
          event.cancel = true;
        }
      }
    } catch (e) {
      console.error(`[ApexFirearms] Error in beforeChat: ${e}`);
    }
  });
}

const afterChat = world.afterEvents ? world.afterEvents.chatSend : undefined;
if (afterChat && typeof afterChat.subscribe === "function") {
  afterChat.subscribe((event) => {
    try {
      const msg = event.message || "";
      if (msg.startsWith("!")) {
        const player = event.sender;
        executeCommand(player, msg);
      }
    } catch (e) {
      console.error(`[ApexFirearms] Error in afterChat: ${e}`);
    }
  });
}

/**
 * 发放全套神装军火包
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

    // 2. 发放泰坦外骨骼全套动力战甲、喷气背包及战术反甲盾
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

    player.sendMessage("§a✔ 已成功领取【六大枪械】、【泰坦外骨骼装甲】、【战术反甲盾】及满配弹药！");
  } catch (err) {
    player.sendMessage(`§c✖ 发放补给失败: ${err}`);
  }
}

/**
 * 单独发放泰坦外骨骼战甲套、喷气背包与战术防暴盾
 */
function giveArmorKit(player) {
  try {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return;

    const armors = [
      "apex:exo_helmet",
      "apex:exo_chestplate",
      "apex:exo_leggings",
      "apex:exo_boots",
      "apex:jetpack",
      "apex:riot_shield"
    ];
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
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    const targetLoc = {
      x: headLoc.x + viewDir.x * 5,
      y: player.location.y,
      z: headLoc.z + viewDir.z * 5
    };

    const dummy = dim.spawnEntity("apex:test_dummy", targetLoc);
    dummy.nameTag = "§l§e[Apex 5000HP 测试靶人]§r";

    try {
      dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", targetLoc);
      player.playSound("random.anvil_land", { location: targetLoc, volume: 1.0, pitch: 1.2 });
    } catch {}

    player.sendMessage("§a✔ 成功在前方 5 格生成【Apex 5000HP 动态测试靶人】！");
  } catch (err) {
    player.sendMessage(`§c✖ 生成靶人失败: ${err}`);
  }
}

/**
 * 帮助信息面板
 */
function showHelp(player) {
  const helpText = [
    "§6=== Apex Firearms Arsenal 2.2 ===§r",
    "§e!gunkit§7 - 一键领取 6 把专属神枪、战甲套、反甲盾及弹药",
    "§e!armor§7  - 领取泰坦外骨骼动力装甲四件套、喷气背包与战术防暴盾",
    "§e!r§7      - 手动触发当前枪械换弹",
    "§e!dummy§7  - 召唤 5000 HP 动态防御测试靶人",
    "§e!test§7   - 运行枪械综合自动化数学与机制测试",
    "§7--------------------------------",
    "§d⚡ Vector .45 潜行右键可开启 5 秒无限子弹【暴走狂潮】",
    "§6🚀 喷气背包空中双击跳跃可激活向上 6~8 格飞升冲量",
    "§e🛡️ 战术反甲盾格挡实弹可 100% 偏折并反弹 50% 真实伤害！"
  ].join("\n");

  player.sendMessage(helpText);
}

console.warn("[ApexFirearms] Tactical Arsenal loaded successfully without errors!");
