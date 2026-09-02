import { world, system, ItemStack } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { SpawnDirector } from "./spawnDirector.js";
import { CombatAI } from "./combatAI.js";
import { LootManager } from "./loot.js";
import { WorldEventDirector } from "./events.js";
import { AdminMenu, isAdmin } from "./admin.js";

console.warn("[Apocalypse] Mobs & SpawnDirector v0.1.0 initializing...");

function subscribe(signal, label, handler) {
  if (!signal || typeof signal.subscribe !== "function") {
    console.warn(`[Apocalypse] ${label} event unavailable; skipped.`);
    return false;
  }
  try { signal.subscribe(handler); return true; }
  catch (error) { console.warn(`[Apocalypse] ${label} subscribe failed: ${error}`); return false; }
}

function drop(dead) {
  const chance = Math.random();
  try {
    if (dead.typeId === "apoc:raider_rifleman") {
      dead.dimension.spawnItem(new ItemStack("minecraft:gunpowder", 2 + Math.floor(Math.random() * 4)), dead.location);
      if (chance < 0.2) {
        try { dead.dimension.spawnItem(new ItemStack("test_gun:ammo_rifle", 8 + Math.floor(Math.random() * 9)), dead.location); }
        catch { dead.dimension.spawnItem(new ItemStack("minecraft:iron_ingot", 2), dead.location); }
      }
    } else if (dead.hasTag("apoc_hostile")) {
      if (chance < 0.35) dead.dimension.spawnItem(new ItemStack("minecraft:rotten_flesh", 1 + Math.floor(Math.random() * 3)), dead.location);
      if (chance < 0.08) dead.dimension.spawnItem(new ItemStack("minecraft:iron_nugget", 1 + Math.floor(Math.random() * 3)), dead.location);
    }
  } catch {}
}

SpawnDirector.registerVanillaSuppression();

const lootAfterSubscribed = subscribe(world.afterEvents?.playerInteractWithBlock, "after playerInteractWithBlock", event => {
  try { LootManager.interact(event.player, event.block); } catch (error) { console.warn(`[Apocalypse][Loot] interaction error: ${error}`); }
});
if (!lootAfterSubscribed) {
  subscribe(world.beforeEvents?.playerInteractWithBlock, "before playerInteractWithBlock", event => {
    const player = event.player;
    const block = event.block;
    system.run(() => {
      try { LootManager.interact(player, block); } catch (error) { console.warn(`[Apocalypse][Loot] interaction error: ${error}`); }
    });
  });
}

subscribe(world.afterEvents?.projectileHitEntity, "projectileHitEntity", event => {
  try {
    if (event.projectile?.typeId !== "apoc:toxic_spit") return;
    const target = event.getEntityHit()?.entity;
    if (target) target.addEffect("slowness", 60, { amplifier: 1, showParticles: true });
  } catch {}
});

subscribe(world.afterEvents?.entityDie, "entityDie", event => drop(event.deadEntity));

subscribe(system.afterEvents?.scriptEventReceive, "scriptEventReceive", event => {
  const player = event.sourceEntity;
  if (!player || player.typeId !== "minecraft:player" || !isAdmin(player)) return;
  const id = String(event.id || "").toLowerCase();
  const message = String(event.message || "").trim().toLowerCase();
  if (id === "apoc:menu") AdminMenu.open(player);
  else if (id === "apoc:event") {
    player.sendMessage(WorldEventDirector.trigger(player, true) ? "§a动态伏击已触发。" : "§c触发失败，请离开安全区或等待当前事件完成。");
  } else if (id === "apoc:spawn") {
    const key = ["basic", "runner", "spitter", "mutant", "heavy", "raider"].includes(message) ? message : "basic";
    player.sendMessage(SpawnDirector.spawnNearPlayer(player, key, ["apoc_admin_spawn"], 5, 8) ? `§a已生成 ${key}。` : "§c生成失败。");
  }
});

subscribe(world.beforeEvents?.chatSend, "chatSend", event => {
  if (String(event.message || "").trim().toLowerCase() !== "!apoc") return;
  event.cancel = true;
  const player = event.sender;
  system.run(() => AdminMenu.open(player));
});

system.runInterval(() => {
  try { CombatAI.tick(); } catch (error) { console.warn(`[Apocalypse][AI] tick error: ${error}`); }
}, CONFIG.aiInterval);

system.runInterval(() => {
  try { SpawnDirector.tick(); } catch (error) { console.warn(`[Apocalypse][Spawn] tick error: ${error}`); }
}, CONFIG.spawnInterval);

system.runInterval(() => {
  try { SpawnDirector.guardSafeZones(); } catch (error) { console.warn(`[Apocalypse][Guard] tick error: ${error}`); }
}, CONFIG.guardInterval);

system.runInterval(() => {
  try { SpawnDirector.cleanupFarEntities(); } catch {}
  try { WorldEventDirector.tick(); } catch (error) { console.warn(`[Apocalypse][Event] tick error: ${error}`); }
}, 40);

system.runInterval(() => {
  try { WorldEventDirector.maybeTrigger(); } catch (error) { console.warn(`[Apocalypse][Event] trigger check error: ${error}`); }
}, CONFIG.eventCheckInterval);

system.runInterval(() => {
  try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}
}, 200);

console.warn("[Apocalypse] SpawnDirector, ZoneRegistry, ranged AI, LootNode and world events initialized.");
