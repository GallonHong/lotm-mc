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
import { EntityLootCrateManager } from "./rewards/EntityLootCrateManager.js";
import { SpawnerReplacementManager } from "./rewards/SpawnerReplacementManager.js";
import { LegacyCrateBackfillManager } from "./rewards/LegacyCrateBackfillManager.js";
import { DailyNewsManager } from "./events/DailyNewsManager.js";
import { HopePostManager } from "./events/HopePostManager.js";

console.warn("[DailyEvents] Survival Daily, World Events & Multi-Dungeon v0.19.0 initializing...");

const contributors = new Map();
const recognizedMobs = new Set(Object.values(MOB_TARGETS).flat());
const recognizedBosses = new Set(["apoc:infected_tyrant", "apoc:infected_broodmother", "apoc_boss:fog_man", "apoc_boss:goatman", "apoc_boss:siren_head", "apoc_boss:mutant_drowned", "apoc_boss:mutant_zombie", "apoc_boss:mutant_skeleton", "apoc_boss:mutant_lobber", "apoc_boss:mutant_enderman", "apoc_boss:mutant_iron_golem"]);

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
          try {
            DungeonManager.onBlockInteract({ player, block });
            LootCrateManager.interact({ player, block });
          }
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

function sapiTeamTag(player) {
  try { return player.getTags().find(tag => tag.startsWith("sapi_team_")) || ""; }
  catch { return ""; }
}

function closeEnoughForTeamCredit(player, dead, deadDimId, deadLoc) {
  if (!valid(player)) return false;
  try {
    const pDim = player.dimension?.id;
    const targetDim = deadDimId || dead?.dimension?.id;
    if (!pDim || !targetDim || pDim !== targetDim) return false;
    const pLoc = player.location;
    const tLoc = deadLoc || dead?.location;
    if (!pLoc || !tLoc) return false;
    return Math.hypot(pLoc.x - tLoc.x, pLoc.y - tLoc.y, pLoc.z - tLoc.z) <= 40;
  } catch {
    return false;
  }
}

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
  let deadDimId = null;
  let deadLoc = null;
  try {
    deadDimId = dead.dimension?.id || null;
    deadLoc = dead.location ? { x: dead.location.x, y: dead.location.y, z: dead.location.z } : null;
  } catch {}
  if (dead.typeId === "minecraft:player") {
    WorldEventManager.onPlayerDeath(dead);
    DungeonManager.onPlayerDeath(dead);
  }
  const direct = attackerPlayer(event.damageSource);
  if (direct) recordContributor(dead, direct);
  const map = contributors.get(dead.id) || {};
  contributors.delete(dead.id);
  const credited = new Map();
  for (const [playerId, tick] of Object.entries(map)) {
    if (system.currentTick - Number(tick) > 300) continue;
    const player = findOnline(playerId);
    if (!closeEnoughForTeamCredit(player, dead, deadDimId, deadLoc)) continue;
    credited.set(player.id, player);
    const teamTag = sapiTeamTag(player);
    if (teamTag) {
      for (const teammate of world.getAllPlayers()) {
        if (sapiTeamTag(teammate) === teamTag && closeEnoughForTeamCredit(teammate, dead, deadDimId, deadLoc)) credited.set(teammate.id, teammate);
      }
    }
  }
  for (const player of credited.values()) {
    if (recognizedMobs.has(dead.typeId)) {
      DailyQuestManager.onKillCredit(player, dead.typeId);
      HopePostManager.record(player, "kills", 1);
    }
    if (recognizedBosses.has(dead.typeId)) {
      DailyQuestManager.onBossKill(player, dead.typeId);
      HopePostManager.record(player, "bosses", 1);
    }
    WorldEventManager.recordCombat(dead, player, 0, true);
    DungeonManager.recordCombat(dead, player, 0, true);
  }
}

function handleCrateCommand(player, rawAction = "give") {
  const parts = String(rawAction || "give").trim().toLowerCase().split(/\s+/);
  const action = parts[0];
  if (action === "backfill") {
    if (!isAdmin(player)) return player.sendMessage("§c仅管理员可控制旧区块补生成。");
    const mode = parts[1] || "status";
    if (mode === "on") {
      LegacyCrateBackfillManager.setEnabled(true);
      const queued = LegacyCrateBackfillManager.enqueueAroundPlayers();
      return player.sendMessage(`§a[旧地图补箱] 已开启，当前加入 ${queued} 个候选区块。请在需要补箱的旧区域移动探索，完成后务必输入 /scriptevent daily:crate backfill off。`);
    }
    if (mode === "off") {
      LegacyCrateBackfillManager.setEnabled(false);
      return player.sendMessage("§e[旧地图补箱] 已关闭；新区块继续使用原生 Feature 生成。");
    }
    const state = LegacyCrateBackfillManager.status();
    return player.sendMessage(`§6[旧地图补箱] ${state.enabled ? "§a运行中" : "§c已关闭"} §8| 队列 ${state.queued} | 已处理候选区块 ${state.processed}`);
  }
  if (action === "scan") {
    if (!isAdmin(player)) return player.sendMessage("§c仅管理员可强制重扫刷怪笼。");
    const queued = SpawnerReplacementManager.enqueueAroundPlayer(player, true);
    return player.sendMessage(`§a[废墟箱] 已强制把附近 ${queued} 个区块加入重扫队列；请在刷怪笼附近停留数秒。`);
  }
  if (action !== "give") return player.sendMessage("§7用法：/scriptevent daily:crate give、scan，或 backfill on/off/status");
  try {
    const inv = player.getComponent("minecraft:inventory")?.container;
    inv?.addItem(new ItemStack("daily:loot_crate_scavenger", 4));
    inv?.addItem(new ItemStack("daily:loot_crate_common", 4));
    inv?.addItem(new ItemStack("daily:loot_crate_rare", 4));
    inv?.addItem(new ItemStack("daily:loot_crate_epic", 4));
    inv?.addItem(new ItemStack("daily:loot_crate_legendary", 4));
    inv?.addItem(new ItemStack("daily:loot_crate_mythic", 2));
    inv?.addItem(new ItemStack("daily:mythic_supply_key", 2));
    return player.sendMessage("§a[物资箱] 已获得废墟箱、四种品质物资箱、2 个神话物资箱和 2 个神话补给密钥！除神话箱外均可空手打开。");
  } catch (error) {
    return player.sendMessage(`§c给予失败: ${error}`);
  }
}

function handleCommand(player, raw) {
  const text = String(raw || "").trim();
  const lower = text.toLowerCase();
  if (lower === "!daily") return DailyMenu.open(player);
  if (lower === "!news") return DailyMenu.openNews(player);
  if (lower === "!daily reset") {
    if (!isAdmin(player)) return player.sendMessage("§c仅管理员可重置日常。");
    DailyQuestManager.ensureState(player, true);
    return player.sendMessage("§a已重新生成自己的今日任务。");
  }
  if (lower === "!dungeon") return DungeonMenu.open(player);
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
    return player.sendMessage(WorldEventManager.start(node, templateId, player) ? `§a已启动 ${templateId}。` : "§c启动失败；区域规则不兼容、实体包缺失或已有事件。");
  }
  DailyAdminMenu.open(player);
}

try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}
IntegrationBridge.cleanupStaleDailySpawnRequests();
LegacyCrateBackfillManager.initialize();
WorldEventManager.initializeCleanup();
DungeonManager.initializeCleanup();
LootCrateManager.initialize();
EntityLootCrateManager.initialize();

subscribe(world.afterEvents?.entityLoad, "entityLoad", event => WorldEventManager.cleanupIfStale(event.entity));

subscribe(world.afterEvents?.playerSpawn, "playerSpawn", event => {
  system.runTimeout(() => {
    try {
      DailyQuestManager.ensureState(event.player);
      DungeonManager.handlePlayerSpawn(event.player);
      DailyNewsManager.notifyDailySummary(event.player);
      HopePostManager.ensureIssue();
      HopePostManager.onPlayerInitialSpawn(event.player, event.initialSpawn);
      const pending = RewardManager.pendingCount(event.player);
      if (pending) event.player.sendMessage(`§e[生存联盟] 你有 ${pending} 项待发物资，可在委托菜单重试领取。`);
    } catch {}
  }, 20);
});

subscribe(world.afterEvents?.playerBreakBlock, "playerBreakBlock", event => {
  try {
    const typeId = event.brokenBlockPermutation?.type?.id || event.brokenBlockPermutation?.typeId || event.block?.typeId;
    if (typeId) DailyQuestManager.onBlockCollected(event.player, typeId);
    if (typeId) HopePostManager.recordCollection(event.player, typeId);
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
if (!craftedSubscribed) console.warn("[DailyEvents] playerCraftedItem is unavailable; craft-group daily tasks cannot advance on this server build.");

const interactAfter = subscribe(world.afterEvents?.playerInteractWithEntity, "after playerInteractWithEntity", event => {
  if (EntityLootCrateManager.interact(event.player, event.target)) return;
  handleNpcInteraction(event.player, event.target);
});
if (!interactAfter) {
  subscribe(world.beforeEvents?.playerInteractWithEntity, "before playerInteractWithEntity", event => {
    const player = event.player;
    const target = event.target;
    system.run(() => {
      if (EntityLootCrateManager.interact(player, target)) return;
      handleNpcInteraction(player, target);
    });
  });
}

subscribe(world.afterEvents?.entityHitEntity, "entityHitEntity", event => {
  const player = event.damagingEntity;
  if (player?.typeId !== "minecraft:player") return;
  EntityLootCrateManager.interact(player, event.hitEntity);
});

subscribe(world.afterEvents?.playerInteractWithBlock, "playerInteractWithBlock", event => {
  try {
    DungeonManager.onBlockInteract(event);
    LootCrateManager.interact(event);
  } catch (error) { console.warn(`[DailyEvents] loot crate interaction failed: ${error}`); }
});

subscribe(system.afterEvents?.scriptEventReceive, "scriptEventReceive", event => {
  const { player, message } = scriptEventContext(event);
  const id = String(event.id || "").toLowerCase();
  if (id === "sapi:daily_probe") {
    if (!player || player.typeId !== "minecraft:player") return;
    const nonce = String(message || "").replace(/[^a-z0-9_\-]/gi, "").slice(0, 64);
    if (nonce) system.run(() => {
      try { player.runCommand(`scriptevent sapi:daily_pong ${nonce}`); } catch {}
    });
    return;
  }
  if (!player || player.typeId !== "minecraft:player") return;
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
  else if (id === "daily:news") system.runTimeout(() => DailyMenu.openNews(player), 2);
  else if (id === "daily:hope_post") system.runTimeout(() => HopePostManager.open(player, () => DailyMenu.open(player), isAdmin(player)), 2);
  else if (id === "daily:news_admin" && isAdmin(player)) system.runTimeout(() => DailyAdminMenu.startNewsEvent(player), 2);
  else if (id === "daily:merchant") MerchantMenu.openCategory(player, message || "all");
  else if (id === "daily:dungeon") system.runTimeout(() => DungeonMenu.open(player), 3);
  else if (id === "daily:dungeon_team") system.runTimeout(() => DungeonMenu.openTeam(player, message), 3);
  else if (id === "daily:dungeon_start") system.runTimeout(() => {
    const templateId = String(message || "newcomer_valley").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const started = DungeonManager.start(player, templateId);
    if (started?.instanceId) player.sendMessage("§a[副本] 剧情行动已创建，正在部署场景……");
    else player.sendMessage("§c[副本] 创建失败：副本不存在、你已在副本中，或当前没有空闲实例槽位。");
  }, 2);
  else if (id === "daily:crate") handleCrateCommand(player, message || "give");
  else if (id === "daily:admin" && isAdmin(player)) DailyAdminMenu.open(player);
  else if (id === "daily:reset" && isAdmin(player)) { DailyQuestManager.ensureState(player, true); player.sendMessage("§a日常已重置。"); }
  else if (id === "daily:event" && isAdmin(player)) handleCommand(player, `!event ${message || ""}`);
});

subscribe(world.beforeEvents?.chatSend, "chatSend", event => {
  const lower = String(event.message || "").trim().toLowerCase();
  if (!lower.startsWith("!daily") && !lower.startsWith("!news") && !lower.startsWith("!event") && !lower.startsWith("!dungeon")) return;
  event.cancel = true;
  const player = event.sender;
  const message = event.message;
  system.run(() => handleCommand(player, message));
});

system.runInterval(() => {
  try { WorldEventManager.tick(); } catch (error) { console.warn(`[DailyEvents] event tick failed: ${error}`); }
}, CONFIG.eventTickTicks);

system.runInterval(() => {
  try { DungeonManager.tick(); } catch (error) { console.warn(`[DailyEvents] dungeon tick failed: ${error}`); }
}, 10);

system.runInterval(() => {
  try { WorldEventManager.scanNodes(); } catch (error) { console.warn(`[DailyEvents] node scan failed: ${error}`); }
}, CONFIG.eventScanTicks);

system.runInterval(() => {
  try { LootCrateManager.tick(); } catch (error) { console.warn(`[DailyEvents] loot crate reset failed: ${error}`); }
}, CONFIG.lootCrateResetScanTicks);

system.runInterval(() => {
  try { EntityLootCrateManager.scanAndSpawn(); } catch (error) { console.warn(`[DailyEvents] entity loot crate scan failed: ${error}`); }
}, CONFIG.entityCrateSpawnScanTicks);

system.runInterval(() => {
  try {
    SpawnerReplacementManager.enqueueAroundPlayers();
    LegacyCrateBackfillManager.enqueueAroundPlayers();
  } catch (error) { console.warn(`[DailyEvents] surface scan queue failed: ${error}`); }
}, 100);

system.runInterval(() => {
  try {
    SpawnerReplacementManager.tick();
    LegacyCrateBackfillManager.tick();
  } catch (error) { console.warn(`[DailyEvents] surface migration tick failed: ${error}`); }
}, 1);

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try { DailyQuestManager.pollInventory(player); DailyQuestManager.pollSales(player); NpcDialogue.syncPlayer(player); } catch {}
  }
}, 100);

system.runInterval(() => {
  try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}
  for (const [entityId, map] of contributors) {
    if (Object.values(map).every(tick => system.currentTick - Number(tick) > 300)) contributors.delete(entityId);
  }
}, 100);

console.warn(`[DailyEvents] DailyQuestManager, DailyNewsManager, RewardManager, LootCrateManager, EntityLootCrateManager, DungeonManager and ${Object.keys(EVENT_TEMPLATES).length} event templates initialized.`);
