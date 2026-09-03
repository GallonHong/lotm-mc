import { world, system } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { RewardManager } from "./RewardManager.js";
import { DailyQuestManager } from "../daily/DailyQuestManager.js";
import { LOOT_CRATE_BLOCKS, LOOT_CRATE_POOLS } from "./lootCratePools.js";

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function randomInt(min, max) {
  const low = Math.floor(Number(min) || 0);
  const high = Math.max(low, Math.floor(Number(max) || low));
  return low + Math.floor(Math.random() * (high - low + 1));
}

function chooseWeighted(entries) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= Math.max(0, Number(entry.weight) || 0);
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}

function rollCoins(coins) {
  if (Array.isArray(coins) && coins.length === 2 && coins.every(value => Number.isFinite(Number(value)))) {
    return randomInt(coins[0], coins[1]);
  }
  const range = chooseWeighted(Array.isArray(coins) ? coins : []);
  return range ? randomInt(range.min, range.max) : 0;
}

export class LootCrateManager {
  static states = new Map();
  static interactionTicks = new Map();

  static coordinateKey(block) {
    const location = block.location;
    return `${block.dimension.id}:${Math.floor(location.x)}:${Math.floor(location.y)}:${Math.floor(location.z)}`;
  }

  static propertyKey(coordinateKey) {
    return `${CONFIG.lootCrateStatePrefix}${hash(coordinateKey)}`;
  }

  static initialize() {
    try {
      for (const key of world.getDynamicPropertyIds()) {
        if (!key.startsWith(CONFIG.lootCrateStatePrefix)) continue;
        try {
          const state = JSON.parse(world.getDynamicProperty(key));
          if (state?.coordinateKey && Number.isFinite(Number(state.readyAt))) this.states.set(state.coordinateKey, { ...state, propertyKey: key });
        } catch {}
      }
    } catch {}
  }

  static bundle(tier) {
    const pool = LOOT_CRATE_POOLS[tier];
    const items = [];
    const rolls = Array.isArray(pool.rolls) ? randomInt(pool.rolls[0], pool.rolls[1]) : Math.max(0, Number(pool.rolls) || 0);
    for (let roll = 0; roll < rolls; roll++) {
      const entry = chooseWeighted(pool.entries);
      if (!entry) continue;
      const amount = randomInt(entry.min, entry.max);
      const existing = items.find(item => item.id === entry.id && String(item.name || "") === String(entry.name || ""));
      if (existing) existing.amount = Math.min(64, existing.amount + amount);
      else items.push({ id: entry.id, amount, ...(entry.name ? { name: entry.name } : {}) });
    }
    if (Number(pool.bonusKeyChance || 0) > 0 && Math.random() < Number(pool.bonusKeyChance)) {
      items.push({ id: "daily:mythic_supply_key", amount: 1, name: "§d神话补给密钥" });
    }
    return { id: `loot_crate_${tier}`, coins: rollCoins(pool.coins), items };
  }

  static setOpened(block, opened) {
    try {
      block.setPermutation(block.permutation.withState("daily:opened", !!opened));
      return true;
    } catch { return false; }
  }

  static consumeRequiredKey(player, requiredKey) {
    if (!requiredKey?.id) return true;
    try {
      const container = player.getComponent("minecraft:inventory")?.container;
      const slot = Math.max(0, Math.min(container.size - 1, Number(player.selectedSlotIndex) || 0));
      const held = container?.getItem(slot);
      const requiredName = String(requiredKey.name || "").replace(/§./g, "");
      const heldName = String(held?.nameTag || "").replace(/§./g, "");
      const legacyKey = held?.typeId === "minecraft:echo_shard" && heldName === "神话补给卡（MVP）";
      if (!held || (!legacyKey && held.typeId !== requiredKey.id) || (!legacyKey && requiredName && heldName && heldName !== requiredName)) {
        player.sendMessage(`§d神话物资箱需要手持并消耗 1 个 §f${requiredKey.name || requiredKey.id}§d。密钥只能通过抽奖或 Epic 以上物资箱获得。`);
        return false;
      }
      if (held.amount > 1) {
        held.amount -= 1;
        container.setItem(slot, held);
      } else container.setItem(slot, undefined);
      return true;
    } catch {
      player.sendMessage("§c无法验证补给卡，请清出一个快捷栏位置后重试。");
      return false;
    }
  }

  static interact(event) {
    const block = event.block;
    const player = event.player;
    const tier = LOOT_CRATE_BLOCKS[block?.typeId];
    if (!tier || !player) return false;
    const coordinateKey = this.coordinateKey(block);
    // isFirstEvent 在移动端长按和部分 26.x 客户端上可能跨方块保持 false，
    // 导致打开一个箱子后，同类型的其他箱子也被忽略。改为按“玩家+坐标”
    // 做短时去重：同一箱子的重复触发被拦截，不同地点始终独立。
    const interactionKey = `${player.id}:${coordinateKey}`;
    const lastTick = Number(this.interactionTicks.get(interactionKey) ?? -1000);
    if (system.currentTick - lastTick < 6) return true;
    this.interactionTicks.set(interactionKey, system.currentTick);
    if (this.interactionTicks.size > 512) {
      for (const [key, tick] of this.interactionTicks) {
        if (system.currentTick - Number(tick) > 200) this.interactionTicks.delete(key);
      }
    }
    const state = this.states.get(coordinateKey);
    const now = Date.now();
    if (state && state.readyAt > now) {
      const seconds = Math.ceil((state.readyAt - now) / 1000);
      player.sendMessage(`§8物资箱已被搜刮，约 ${Math.ceil(seconds / 60)} 分钟后刷新。`);
      return true;
    }
    const pool = LOOT_CRATE_POOLS[tier];
    if (!this.consumeRequiredKey(player, pool.requiredKey)) return true;
    const readyAt = now + pool.resetMinutes * 60000;
    const propertyKey = this.propertyKey(coordinateKey);
    const next = { coordinateKey, propertyKey, dimension: block.dimension.id, location: { ...block.location }, tier, readyAt };
    if (!this.setOpened(block, true)) return true;
    this.states.set(coordinateKey, next);
    try { world.setDynamicProperty(propertyKey, JSON.stringify(next)); } catch {}
    RewardManager.grantBundle(player, this.bundle(tier), `crate:${coordinateKey}:${readyAt}`, `loot_crate:${tier}`);
    DailyQuestManager.onLootCrateOpened(player, tier);
    return true;
  }

  static tick() {
    const now = Date.now();
    for (const [coordinateKey, state] of this.states) {
      if (state.readyAt > now) continue;
      let dimension;
      try { dimension = world.getDimension(state.dimension); } catch { continue; }
      if (dimension.getPlayers({ location: state.location, maxDistance: CONFIG.lootCratePlayerSafeRadius }).length) continue;
      try {
        const block = dimension.getBlock(state.location);
        if (!block || LOOT_CRATE_BLOCKS[block.typeId] !== state.tier) {
          this.states.delete(coordinateKey);
          world.setDynamicProperty(state.propertyKey, undefined);
          continue;
        }
        if (!this.setOpened(block, false)) continue;
        this.states.delete(coordinateKey);
        world.setDynamicProperty(state.propertyKey, undefined);
      } catch {}
    }
  }
}
