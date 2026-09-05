import { world, ItemStack } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { REWARD_REGISTRY, DUNGEON_TIER_REWARDS, DUNGEON_EPIC_BLUEPRINTS } from "./rewards.js";

function parse(value, fallback) {
  try { return typeof value === "string" ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function getArray(entity, key) {
  const value = parse(entity.getDynamicProperty(key), []);
  return Array.isArray(value) ? value : [];
}

export class RewardManager {
  static hasClaimed(player, uniqueId) {
    return getArray(player, CONFIG.claimedRewardsKey).includes(uniqueId);
  }

  static reserve(player, uniqueId) {
    const claimed = getArray(player, CONFIG.claimedRewardsKey);
    if (claimed.includes(uniqueId)) return false;
    claimed.push(uniqueId);
    player.setDynamicProperty(CONFIG.claimedRewardsKey, JSON.stringify(claimed.slice(-300)));
    return true;
  }

  static addCoins(player, amount) {
    const value = Math.max(0, Math.floor(Number(amount) || 0));
    if (!value) return { sapi: true, amount: 0 };
    try {
      const objective = world.scoreboard.getObjective("money");
      if (objective && player.scoreboardIdentity) {
        objective.addScore(player.scoreboardIdentity, value);
        return { sapi: true, amount: value };
      }
    } catch {}
    const emeralds = Math.max(1, Math.floor(value / 100));
    this.giveOrQueue(player, { id: "minecraft:emerald", amount: emeralds, name: `金币折算物资（${value}）` });
    return { sapi: false, amount: value };
  }

  static makeStack(entry) {
    const stack = new ItemStack(entry.id, Math.max(1, Math.min(64, Math.floor(Number(entry.amount) || 1))));
    if (entry.name) stack.nameTag = String(entry.name).slice(0, 100);
    return stack;
  }

  static giveOrQueue(player, entry) {
    try {
      const container = player.getComponent("minecraft:inventory")?.container;
      if (!container) throw new Error("inventory unavailable");
      const leftover = container.addItem(this.makeStack(entry));
      if (!leftover) return true;
      this.queue(player, { id: leftover.typeId, amount: leftover.amount, name: leftover.nameTag || entry.name || "" });
      return false;
    } catch {
      this.queue(player, entry);
      return false;
    }
  }

  static queue(player, entry) {
    const pending = getArray(player, CONFIG.pendingRewardsKey);
    pending.push({ id: entry.id, amount: entry.amount, name: entry.name || "", queuedAt: Date.now() });
    player.setDynamicProperty(CONFIG.pendingRewardsKey, JSON.stringify(pending.slice(-100)));
  }

  static claimPending(player) {
    const pending = getArray(player, CONFIG.pendingRewardsKey);
    if (!pending.length) return 0;
    const remaining = [];
    let delivered = 0;
    for (const entry of pending) {
      try {
        const container = player.getComponent("minecraft:inventory")?.container;
        const leftover = container?.addItem(this.makeStack(entry));
        if (!container) remaining.push(entry);
        else if (leftover) remaining.push({ id: leftover.typeId, amount: leftover.amount, name: leftover.nameTag || entry.name || "", queuedAt: entry.queuedAt });
        else delivered++;
      } catch { remaining.push(entry); }
    }
    player.setDynamicProperty(CONFIG.pendingRewardsKey, JSON.stringify(remaining));
    return delivered;
  }

  static grant(player, rewardId, uniqueId, source = "unknown") {
    const reward = REWARD_REGISTRY[rewardId];
    if (!reward || !this.reserve(player, uniqueId)) return false;
    const coinResult = this.addCoins(player, reward.coins || 0);
    for (const item of reward.items || []) this.giveOrQueue(player, item);
    this.log(player, uniqueId, rewardId, source, coinResult);
    player.sendMessage(`§6[奖励] 已领取 ${reward.coins || 0} 金币与 ${reward.items?.length || 0} 类物资。`);
    return true;
  }

  static grantBundle(player, bundle, uniqueId, source = "dynamic") {
    if (!bundle || !this.reserve(player, uniqueId)) return false;
    const coins = Math.max(0, Math.floor(Number(bundle.coins) || 0));
    const items = Array.isArray(bundle.items) ? bundle.items : [];
    const coinResult = this.addCoins(player, coins);
    for (const item of items) this.giveOrQueue(player, item);
    this.log(player, uniqueId, bundle.id || "custom_bundle", source, coinResult);
    player.sendMessage(`§6[物资箱] 获得 ${coins} 金币与 ${items.length} 类物资。`);
    return true;
  }

  static grantDungeon(player, rewardId, uniqueId, tier = "normal", firstClear = false, multiplier = 1) {
    const reward = REWARD_REGISTRY[rewardId];
    const rule = DUNGEON_TIER_REWARDS[tier] || DUNGEON_TIER_REWARDS.normal;
    if (!reward || !this.reserve(player, uniqueId)) return false;
    const baseCoins = firstClear ? rule.firstCoins : rule.repeatCoins;
    const coins = Math.max(0, Math.floor(baseCoins * Math.max(0, Number(multiplier) || 0)));
    const rewardMultiplier = Math.max(0, Number(multiplier) || 0);
    const items = (reward.items || []).map(item => ({
      ...item,
      amount: Math.max(1, Math.floor(Math.max(1, Number(item.amount) || 1) * rewardMultiplier))
    }));
    if (Math.random() < Number(rule.epicBlueprintChance || 0) * rewardMultiplier) {
      items.push(DUNGEON_EPIC_BLUEPRINTS[Math.floor(Math.random() * DUNGEON_EPIC_BLUEPRINTS.length)]);
    }
    const coinResult = this.addCoins(player, coins);
    for (const item of items) this.giveOrQueue(player, item);
    this.log(player, uniqueId, `${rewardId}:${tier}`, "dungeon", coinResult);
    player.sendMessage(`§6[副本奖励] ${firstClear ? "首次" : "重复"}通关获得 ${coins} 金币与 ${items.length} 类物资（本日收益倍率 ${Math.round(multiplier * 100)}%）。`);
    return true;
  }

  static log(player, uniqueId, rewardId, source, coinResult) {
    try {
      const raw = world.getDynamicProperty(CONFIG.rewardLogKey);
      const log = parse(raw, []);
      log.push({ time: Date.now(), player: player.name, playerId: player.id, uniqueId, rewardId, source, sapiCoins: coinResult.sapi });
      world.setDynamicProperty(CONFIG.rewardLogKey, JSON.stringify(log.slice(-100)));
    } catch {}
  }

  static pendingCount(player) {
    return getArray(player, CONFIG.pendingRewardsKey).length;
  }
}
