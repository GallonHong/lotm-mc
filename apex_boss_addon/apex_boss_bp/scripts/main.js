import { world, system, ItemStack } from "@minecraft/server";
import { BossEngine } from "./BossEngine.js";
import { MercenaryEngine } from "./MercenaryEngine.js";

console.warn("[ApexBoss] Mechanical Titan & Horde Addon initializing...");

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

// 1. 物品使用事件：呼叫泰坦 Boss & 一键引爆 20 尸潮
subscribeAfterEvent("itemUse", (event) => {
  try {
    const item = event.itemStack;
    const player = event.source;
    if (!player || !item) return;

    if (item.typeId === "apex_boss:beacon_core" || item.typeId === "apex_boss:boss_summoner") {
      summonBossWithAirDrop(player);
    } else if (item.typeId === "apex_boss:zombie_horde_egg") {
      triggerZombieHorde(player);
    }
  } catch (e) {
    console.error(`[ApexBoss] Error in itemUse: ${e}`);
  }
});

// 2. 死亡事件
subscribeAfterEvent("entityDie", (event) => {
  try {
    const deadEntity = event.deadEntity;
    if (!deadEntity) return;

    if (deadEntity.typeId === "apex_boss:juggernaut") {
      BossEngine.handleBossDeath(deadEntity);
    } else if (deadEntity.typeId === "apex_boss:hostile_mercenary") {
      MercenaryEngine.handleMercenaryDeath(deadEntity);
    }
  } catch (e) {
    console.error(`[ApexBoss] Error in entityDie: ${e}`);
  }
});

// 3. 主循环 (Boss & 雇佣兵 AI 战术驱动)
system.runInterval(() => {
  try {
    BossEngine.onTick();
    MercenaryEngine.onTick();

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

// 4. 一键引爆 20 狂暴尸潮函数
function triggerZombieHorde(player) {
  const dim = player.dimension;
  const pLoc = player.location;

  // 播放末日尸潮警报
  dim.playSound("mob.wither.spawn", pLoc, { volume: 1.8, pitch: 0.7 });
  dim.playSound("ambient.weather.thunder0", pLoc, { volume: 1.5, pitch: 0.6 });
  dim.playSound("mob.zombie.say", pLoc, { volume: 2.0, pitch: 0.5 });

  try {
    player.onScreenDisplay?.setTitle?.("§4☠ [ 尸潮已被引爆! ] ☠", {
      subtitle: "§c20 只 60 HP 狂暴感染者正向你极速包围袭来!§r",
      fadeInDuration: 5,
      stayDuration: 60,
      fadeOutDuration: 10
    });
  } catch {}

  const ZOMBIE_COUNT = 20;
  for (let i = 0; i < ZOMBIE_COUNT; i++) {
    const angle = (i / ZOMBIE_COUNT) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
    const dist = 8.0 + Math.random() * 6.0;

    const spawnPos = {
      x: pLoc.x + Math.cos(angle) * dist,
      y: pLoc.y,
      z: pLoc.z + Math.sin(angle) * dist
    };

    system.runTimeout(() => {
      try {
        dim.spawnEntity("apex_boss:deadzone_zombie", spawnPos);
        dim.spawnParticle("minecraft:huge_explosion_emitter", spawnPos);
        dim.spawnParticle("minecraft:basic_flame_particle", spawnPos);
      } catch {}
    }, i * 2); // 错开 2 ticks 极速蜂拥出场
  }
}

// 5. 空投召唤泰坦 Boss
function summonBossWithAirDrop(player) {
  const dim = player.dimension;
  const loc = player.location;
  const spawnPos = { x: loc.x + 5, y: loc.y, z: loc.z + 5 };

  dim.playSound("mob.enderdragon.growl", spawnPos, { volume: 1.5, pitch: 0.6 });
  dim.playSound("ambient.weather.thunder0", spawnPos, { volume: 1.2, pitch: 0.8 });
  world.sendMessage("§l§c⚠ 警报：检测到【泰坦空投呼叫引信】已激活！【机械泰坦歼灭者】正在空降坐标！");

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
  }, 40);
}

// 6. 指令快捷获取与召唤
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
  } else if (text === "!horde" || text === "!zombie") {
    triggerZombieHorde(player);
  } else if (text === "!mercenary" || text === "!npc") {
    try {
      const dim = player.dimension;
      const loc = player.location;
      dim.spawnEntity("apex_boss:hostile_mercenary", { x: loc.x + 4, y: loc.y, z: loc.z + 4 });
      player.sendMessage("§c✔ 已在身旁部署 1 名【叛军雇佣兵】！");
    } catch {}
  } else if (text === "!kit" || text === "!bosskit") {
    try {
      const inv = player.getComponent("minecraft:inventory");
      inv?.container?.addItem(new ItemStack("apex_boss:boss_summoner", 2));
      inv?.container?.addItem(new ItemStack("apex_boss:zombie_horde_egg", 8));
      player.sendMessage("§a✔ 已获得【泰坦引信】与 8 枚【尸潮引爆信标】！");
    } catch {}
  }
}

const beforeChat = world.beforeEvents ? world.beforeEvents.chatSend : undefined;
if (beforeChat && typeof beforeChat.subscribe === "function") {
  beforeChat.subscribe((event) => {
    try {
      const msg = event.message || "";
      if (msg.startsWith("!boss") || msg.startsWith("!horde") || msg.startsWith("!mercenary") || msg.startsWith("!kit")) {
        event.cancel = true;
        const player = event.sender;
        system.run(() => handleCommand(player, msg));
      }
    } catch {}
  });
}

console.warn("[ApexBoss] Mechanical Titan, 60 HP Zombies & Armed Mercenaries loaded successfully!");
