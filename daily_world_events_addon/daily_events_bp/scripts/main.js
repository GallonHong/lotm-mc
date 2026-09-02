import { world, system, ItemStack } from "@minecraft/server";
import { CONFIG, MOB_TARGETS } from "./config.js";
import { DailyQuestManager } from "./daily/DailyQuestManager.js";
import { RewardManager } from "./rewards/RewardManager.js";
import { WorldEventManager } from "./events/WorldEventManager.js";
import { EventNodeRegistry } from "./events/EventNodeRegistry.js";
import { EVENT_TEMPLATES } from "./events/templates/eventTemplates.js";
import { DailyMenu, DailyAdminMenu, isAdmin } from "./ui/DailyMenu.js";
import { MerchantMenu, NpcDialogue } from "./ui/NpcDialogue.js";
import { merchantByEntity } from "./merchants/merchantConfig.js";
import { IntegrationBridge } from "./integration/IntegrationBridge.js";
import { DungeonManager } from "./dungeons/DungeonManager.js";
import { DungeonMenu } from "./ui/DungeonMenu.js";
import { LootCrateManager } from "./rewards/LootCrateManager.js";

console.warn("[DailyEvents] Survival Daily, World Events & Loot Crates v0.8.0 initializing...");

const contributors = new Map();
const recognizedMobs = new Set(Object.values(MOB_TARGETS).flat());

function subscribe(signal, label, handler) {
  if (!signal || typeof signal.subscribe !== "function") {
    console.warn(`[DailyEvents] ${label} event unavailable; fallback enabled where possible.`);
    return false;
  }
  try { signal.subscribe(handler); return true; }
  catch (error) { console.warn(`[DailyEvents] ${label} subscribe failed: ${error}`); return false; }
}

// A plain custom block has no vanilla action, so some 26.x clients only emit
// playerInteractWithBlock while the player is holding another placeable block.
// Binding a block custom component makes empty-hand and normal-item interaction
// an explicit action. The world event below remains as a compatibility fallback.
const lootCrateComponentSignal = system.beforeEvents?.startup || world.beforeEvents?.worldInitialize;
subscribe(lootCrateComponentSignal, "loot crate component registration", event => {
  try {
    event.blockComponentRegistry.registerCustomComponent("daily:loot_crate_interact", {
      onPlayerInteract(componentEvent) {
        const player = componentEvent.player;
        const block = componentEvent.block;
        if (!player || !block) return;
        system.run(() => {
          try { LootCrateManager.interact({ player, block }); }
          catch (error) { console.warn(`[DailyEvents] custom loot crate interaction failed: ${error}`); }
        });
      }
    });
  } catch (error) {
    console.warn(`[DailyEvents] loot crate custom component registration failed: ${error}`);
  }
});

function valid(entity) {
  try { return !!entity && entity.isValid(); } catch { return false; }
}

function scriptEventContext(event) {
  let player = event.sourceEntity?.typeId === "minecraft:player" ? event.sourceEntity : null;
  if (!player && event.initiator?.typeId === "minecraft:player") player = event.initiator;
  let message = String(event.message || "");
  const match = /^__sapi_player__=([^&]*)&data=([\s\S]*)$/.exec(message);
  if (match) {
    let playerName = "";
    try { playerName = decodeURIComponent(match[1]); } catch { playerName = match[1]; }
    try { message = decodeURIComponent(match[2]); } catch { message = match[2]; }
    if (!player) player = world.getAllPlayers().find(value => value.name === playerName) || null;
  }
  if (!player) {
    const online = world.getAllPlayers();
    if (online.length === 1) player = online[0];
  }
  return { player, message };
}

function attackerPlayer(damageSource) {
  const damaging = damageSource?.damagingEntity;
  if (damaging?.typeId === "minecraft:player") return damaging;
  try {
    const owner = damaging?.getComponent("minecraft:projectile")?.owner;
    if (owner?.typeId === "minecraft:player") return owner;
  } catch {}
  return null;
}

function recordContributor(entity, player) {
  if (!entity || !player) return;
  const map = contributors.get(entity.id) || {};
  map[player.id] = system.currentTick;
  contributors.set(entity.id, map);
}

function findOnline(id) { return world.getAllPlayers().find(player => player.id === id) || null; }

function handleNpcInteraction(player, target) {
  if (!player || !target) return false;
  let commissioner = target.typeId === "daily:commissioner";
  try { commissioner ||= target.hasTag("daily_commissioner"); } catch {}
  if (commissioner) {
    NpcDialogue.open(player, target, "daily_commissioner_main", () => DailyMenu.open(player));
    return true;
  }
  const merchant = merchantByEntity(target);
  if (!merchant) return false;
  NpcDialogue.open(player, target, merchant.scene, () => MerchantMenu.open(player, merchant));
  return true;
}

function handleEntityDeath(event) {
  const dead = event.deadEntity;
  if (!dead) return;
  if (dead.typeId === "minecraft:player") {
    WorldEventManager.onPlayerDeath(dead);
    DungeonManager.onPlayerDeath(dead);
  }
  const direct = attackerPlayer(event.damageSource);
  if (direct) recordContributor(dead, direct);
  const map = contributors.get(dead.id) || {};
  contributors.delete(dead.id);
  for (const [playerId, tick] of Object.entries(map)) {
    if (system.currentTick - Number(tick) > 300) continue;
    const player = findOnline(playerId);
    if (!valid(player) || player.dimension.id !== dead.dimension.id) continue;
    try { if (Math.hypot(player.location.x - dead.location.x, player.location.y - dead.location.y, player.location.z - dead.location.z) > 30) continue; } catch { continue; }
    if (recognizedMobs.has(dead.typeId)) DailyQuestManager.onKillCredit(player, dead.typeId);
    WorldEventManager.recordCombat(dead, player, 0, true);
    DungeonManager.recordCombat(dead, player, 0, true);
  }
}

function handleCommand(player, raw) {
  const text = String(raw || "").trim();
  const lower = text.toLowerCase();
  if (lower === "!daily") return DailyMenu.open(player);
  if (lower === "!daily reset") {
    if (!isAdmin(player)) return player.sendMessage("§c仅管理员可重置日常。");
    DailyQuestManager.ensureState(player, true);
    return player.sendMessage("§a已重新生成自己的今日任务。");
  }
  if (lower === "!dungeon") return DungeonMenu.open(player);
  if (lower.startsWith("!crate") || lower.startsWith("!box")) {
    const parts = lower.split(/\s+/);
    if (parts[1] === "give" || parts.length === 1) {
      try {
        const inv = player.getComponent("minecraft:inventory")?.container;
        inv?.addItem(new ItemStack("daily:loot_crate_common", 4));
        inv?.addItem(new ItemStack("daily:loot_crate_rare", 4));
        inv?.addItem(new ItemStack("daily:loot_crate_epic", 4));
        inv?.addItem(new ItemStack("daily:loot_crate_legendary", 4));
        inv?.addItem(new ItemStack("daily:loot_crate_mythic", 2));
        const supplyCards = new ItemStack("minecraft:echo_shard", 2);
        supplyCards.nameTag = "§d神话补给卡（MVP）";
        inv?.addItem(supplyCards);
        return player.sendMessage("§a[物资箱] 已获得四种常规物资箱、2 个神话物资箱和 2 张神话补给卡！普通箱可空手打开，神话箱必须手持补给卡。");
      } catch (e) {
        return player.sendMessage(`§c给予失败: ${e}`);
      }
    }
  }
  if (!lower.startsWith("!event")) return;
  if (!isAdmin(player)) return player.sendMessage("§c事件调试命令仅管理员可用。");
  const parts = lower.split(/\s+/);
  if (parts[1] === "list") {
    const list = WorldEventManager.list();
    return player.sendMessage(list.length ? `§6[运行事件]\n${list.map(value => `${value.templateId} | ${value.zoneType || "law"} | ${value.state} | ${value.nodeId}`).join("\n")}` : "§7当前没有运行事件。");
  }
  if (parts[1] === "nodes") {
    const nodes = EventNodeRegistry.nearby(player, 200);
    return player.sendMessage(nodes.length ? `§6[附近事件节点]\n${nodes.map(node => `${node.name}: ${Math.floor(node.location.x)}, ${Math.floor(node.location.y)}, ${Math.floor(node.location.z)}`).join("\n")}` : "§7附近 200 格没有事件节点。");
  }
  if (parts[1] === "stop") return player.sendMessage(WorldEventManager.stopNear(player) ? "§a已停止附近事件。" : "§7附近没有运行事件。");
  if (parts[1] === "start") {
    const templateId = parts[2] || "infected_attack";
    if (!EVENT_TEMPLATES[templateId]) return player.sendMessage(`§c未知模板。可用：${Object.keys(EVENT_TEMPLATES).join(", ")}`);
    const node = { id: `debug_${Date.now().toString(36)}`, name: "调试节点", dimension: player.dimension.id, location: { ...player.location }, allowedEvents: [templateId], cooldownUntil: 0, cooldownMinutes: 1 };
    return player.sendMessage(WorldEventManager.start(node, templateId, player) ? `§a已启动 ${templateId}。` : "§c启动失败；安全区内不能启动事件。");
  }
  DailyAdminMenu.open(player);
}

try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}
IntegrationBridge.cleanupStaleDailySpawnRequests();
WorldEventManager.initializeCleanup();
DungeonManager.initializeCleanup();
LootCrateManager.initialize();

subscribe(world.afterEvents?.entityLoad, "entityLoad", event => WorldEventManager.cleanupIfStale(event.entity));

subscribe(world.afterEvents?.playerSpawn, "playerSpawn", event => {
  system.runTimeout(() => {
    try {
      DailyQuestManager.ensureState(event.player);
      DungeonManager.handlePlayerSpawn(event.player);
      const pending = RewardManager.pendingCount(event.player);
      if (pending) event.player.sendMessage(`§e[生存联盟] 你有 ${pending} 项待发物资，可在委托菜单重试领取。`);
    } catch {}
  }, 20);
});

subscribe(world.afterEvents?.playerBreakBlock, "playerBreakBlock", event => {
  try {
    const typeId = event.brokenBlockPermutation?.type?.id || event.brokenBlockPermutation?.typeId || event.block?.typeId;
    if (typeId) DailyQuestManager.onBlockCollected(event.player, typeId);
  } catch {}
});

subscribe(world.afterEvents?.entityHurt, "entityHurt", event => {
  const player = attackerPlayer(event.damageSource);
  if (!player || !event.hurtEntity) return;
  recordContributor(event.hurtEntity, player);
  WorldEventManager.recordCombat(event.hurtEntity, player, event.damage || 1, false);
  DungeonManager.recordCombat(event.hurtEntity, player, event.damage || 1, false);
});

subscribe(world.afterEvents?.entityDie, "entityDie", handleEntityDeath);

const craftedSubscribed = subscribe(world.afterEvents?.playerCraftedItem, "playerCraftedItem", event => {
  try {
    const item = event.itemStack || event.craftedItemStack;
    if (event.player && item) DailyQuestManager.onCraft(event.player, item.typeId, item.amount || 1);
  } catch {}
});
if (!craftedSubscribed) console.warn("[DailyEvents] Craft progress can be submitted from the Daily menu using the vanilla placeholder item.");

const interactAfter = subscribe(world.afterEvents?.playerInteractWithEntity, "after playerInteractWithEntity", event => {
  handleNpcInteraction(event.player, event.target);
});
if (!interactAfter) {
  subscribe(world.beforeEvents?.playerInteractWithEntity, "before playerInteractWithEntity", event => {
    const player = event.player;
    const target = event.target;
    system.run(() => handleNpcInteraction(player, target));
  });
}

subscribe(world.afterEvents?.playerInteractWithBlock, "playerInteractWithBlock", event => {
  try { LootCrateManager.interact(event); } catch (error) { console.warn(`[DailyEvents] loot crate interaction failed: ${error}`); }
});

subscribe(system.afterEvents?.scriptEventReceive, "scriptEventReceive", event => {
  const { player, message } = scriptEventContext(event);
  if (!player || player.typeId !== "minecraft:player") return;
  const id = String(event.id || "").toLowerCase();
  if (id === "daily:menu") DailyMenu.open(player);
  else if (id === "daily:quests") system.runTimeout(() => DailyMenu.openQuests(player), 2);
  else if (id === "daily:claim") system.runTimeout(() => {
    const count = DailyQuestManager.claimCompleted(player);
    player.sendMessage(count ? `§a已领取 ${count} 项任务奖励。` : "§7没有可领取的任务奖励。");
    NpcDialogue.syncPlayer(player);
  }, 2);
  else if (id === "daily:activity") system.runTimeout(() => DailyMenu.openActivity(player), 2);
  else if (id === "daily:craft") system.runTimeout(() => {
    const response = DailyQuestManager.submitCraftPlaceholder(player);
    player.sendMessage(`${response.ok ? "§a" : "§c"}${response.message}`);
    NpcDialogue.syncPlayer(player);
  }, 2);
  else if (id === "daily:pending") system.runTimeout(() => {
    const count = RewardManager.claimPending(player);
    player.sendMessage(count ? `§a已补发 ${count} 项物资。` : "§7暂无可补发物资，或背包空间仍不足。");
  }, 2);
  else if (id === "daily:help") system.runTimeout(() => DailyMenu.openHelp(player), 2);
  else if (id === "daily:merchant") MerchantMenu.openCategory(player, message || "all");
  else if (id === "daily:dungeon") system.runTimeout(() => DungeonMenu.open(player), 3);
  else if (id === "daily:crate" || id === "daily:box") handleCommand(player, "!crate give");
  else if (id === "daily:admin" && isAdmin(player)) DailyAdminMenu.open(player);
  else if (id === "daily:reset" && isAdmin(player)) { DailyQuestManager.ensureState(player, true); player.sendMessage("§a日常已重置。"); }
  else if (id === "daily:event" && isAdmin(player)) handleCommand(player, `!event ${message || ""}`);
});

subscribe(world.beforeEvents?.chatSend, "chatSend", event => {
  const lower = String(event.message || "").trim().toLowerCase();
  if (!lower.startsWith("!daily") && !lower.startsWith("!event") && !lower.startsWith("!dungeon") && !lower.startsWith("!crate") && !lower.startsWith("!box")) return;
  event.cancel = true;
  const player = event.sender;
  const message = event.message;
  system.run(() => handleCommand(player, message));
});

system.runInterval(() => {
  try { WorldEventManager.tick(); } catch (error) { console.warn(`[DailyEvents] event tick failed: ${error}`); }
  try { DungeonManager.tick(); } catch (error) { console.warn(`[DailyEvents] dungeon tick failed: ${error}`); }
}, CONFIG.eventTickTicks);

system.runInterval(() => {
  try { WorldEventManager.scanNodes(); } catch (error) { console.warn(`[DailyEvents] node scan failed: ${error}`); }
}, CONFIG.eventScanTicks);

system.runInterval(() => {
  try { LootCrateManager.tick(); } catch (error) { console.warn(`[DailyEvents] loot crate reset failed: ${error}`); }
}, CONFIG.lootCrateResetScanTicks);

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try { DailyQuestManager.pollSales(player); NpcDialogue.syncPlayer(player); } catch {}
  }
}, 100);

system.runInterval(() => {
  try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}
  for (const [entityId, map] of contributors) {
    if (Object.values(map).every(tick => system.currentTick - Number(tick) > 300)) contributors.delete(entityId);
  }
}, 100);

console.warn(`[DailyEvents] DailyQuestManager, RewardManager, LootCrateManager, DungeonManager and ${Object.keys(EVENT_TEMPLATES).length} event templates initialized.`);
