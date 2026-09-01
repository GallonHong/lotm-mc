import { world, system, ItemStack } from "@minecraft/server";
import { BossEngine } from "./BossEngine.js";

console.warn("[ApexBoss] Mechanical Titan Juggernaut Addon v1.0.0 initializing...");

function subscribeAfterEvent(eventName, handler) {
  try {
    const afterEvents = world.afterEvents;
    const signal = afterEvents ? afterEvents[eventName] : undefined;
    if (!signal || typeof signal.subscribe !== "function") return false;
    signal.subscribe(handler);
    return true;
  } catch (err) {
    console.warn(`[ApexBoss] Could not subscribe to ${eventName}: ${err}`);
    return false;
  }
}

// 1. 泰坦引信呼叫使用事件
subscribeAfterEvent("itemUse", (event) => {
  try {
    const item = event.itemStack;
    const player = event.source;
    if (item?.typeId === "apex_boss:beacon_core" && player) {
      summonBossWithAirDrop(player);
    }
  } catch (e) {
    console.error(`[ApexBoss] Error in itemUse: ${e}`);
  }
});

// 2. Boss 死亡事件 (触发核能大自爆与 Apex 军火掉落)
subscribeAfterEvent("entityDie", (event) => {
  try {
    const deadEntity = event.deadEntity;
    if (deadEntity?.typeId === "apex_boss:juggernaut") {
      BossEngine.handleBossDeath(deadEntity);
    }
  } catch (e) {
    console.error(`[ApexBoss] Error in entityDie: ${e}`);
  }
});

// 3. 20 TPS 主状态机轮询
system.runInterval(() => {
  try {
    BossEngine.onTick();

    // 更新自爆无人机
    const overworld = world.getDimension("overworld");
    if (overworld) {
      const drones = overworld.getEntities({ type: "apex_boss:drone" });
      for (const d of drones) {
        BossEngine.handleDroneTick(d);
      }
    }
  } catch (e) {
    console.error(`[ApexBoss] Error in onTick: ${e}`);
  }
}, 1);

// 4. 空投召唤动画
function summonBossWithAirDrop(player) {
  const dim = player.dimension;
  const loc = player.location;
  const spawnPos = { x: loc.x + 5, y: loc.y, z: loc.z + 5 };

  dim.playSound("mob.enderdragon.growl", spawnPos, { volume: 1.5, pitch: 0.6 });
  dim.playSound("ambient.weather.thunder0", spawnPos, { volume: 1.2, pitch: 0.8 });
  world.sendMessage("§l§c⚠ 警报：检测到【泰坦空投呼叫引信】已激活！【机械泰坦歼灭者】正在空降坐标！");

  // 预警光柱
  for (let y = 0; y < 20; y += 2) {
    dim.spawnParticle("minecraft:endrod", { x: spawnPos.x, y: spawnPos.y + y, z: spawnPos.z });
  }

  system.runTimeout(() => {
    try {
      dim.spawnEntity("apex_boss:juggernaut", spawnPos);
      dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", spawnPos);
      dim.spawnParticle("minecraft:sonic_explosion", spawnPos);
      dim.playSound("random.anvil_land", spawnPos, { volume: 1.8, pitch: 0.5 });
      dim.playSound("random.explode", spawnPos, { volume: 1.5, pitch: 0.7 });
    } catch (err) {
      world.sendMessage(`§c召唤失败: ${err}`);
    }
  }, 40); // 2 秒后空降
}

// 5. 聊天指令支持
let lastChatTick = new Map();
function handleCommand(player, rawText) {
  if (!player || !player.isValid()) return;
  const text = (rawText || "").trim().toLowerCase();

  const key = `${player.id}_${text}`;
  const now = system.currentTick;
  if (lastChatTick.has(key) && (now - lastChatTick.get(key) < 2)) return;
  lastChatTick.set(key, now);

  if (text === "!boss" || text === "!juggernaut") {
    summonBossWithAirDrop(player);
  } else if (text === "!beacon" || text === "!bosskit") {
    try {
      const inv = player.getComponent("minecraft:inventory");
      inv?.container?.addItem(new ItemStack("apex_boss:beacon_core", 4));
      player.sendMessage("§a✔ 已获得 4 枚【泰坦空投呼叫引信】！");
    } catch {}
  }
}

const beforeChat = world.beforeEvents ? world.beforeEvents.chatSend : undefined;
if (beforeChat && typeof beforeChat.subscribe === "function") {
  beforeChat.subscribe((event) => {
    try {
      const msg = event.message || "";
      if (msg.startsWith("!boss") || msg.startsWith("!beacon")) {
        event.cancel = true;
        const player = event.sender;
        system.run(() => handleCommand(player, msg));
      }
    } catch {}
  });
}

const afterChat = world.afterEvents ? world.afterEvents.chatSend : undefined;
if (afterChat && typeof afterChat.subscribe === "function") {
  afterChat.subscribe((event) => {
    try {
      const msg = event.message || "";
      if (msg.startsWith("!boss") || msg.startsWith("!beacon")) {
        const player = event.sender;
        system.run(() => handleCommand(player, msg));
      }
    } catch {}
  });
}

console.warn("[ApexBoss] Mechanical Titan Juggernaut Addon loaded successfully!");
