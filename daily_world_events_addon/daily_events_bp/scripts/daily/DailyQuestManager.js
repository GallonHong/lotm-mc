import { CONFIG, ACTIVITY_MILESTONES, COLLECT_GROUPS, MOB_TARGETS } from "../config.js";
import { DAILY_QUEST_REGISTRY, QUEST_POOLS } from "./dailyQuests.js";
import { RewardManager } from "../rewards/RewardManager.js";
import { IntegrationBridge } from "../integration/IntegrationBridge.js";

function parse(raw, fallback) {
  try { return typeof raw === "string" ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function pick(values) { return values[Math.floor(Math.random() * values.length)]; }

export class DailyQuestManager {
  static getDayKey() {
    const shifted = new Date(Date.now() + CONFIG.timezoneOffsetHours * 3600000);
    return shifted.toISOString().slice(0, 10);
  }

  static getHistory(player) {
    return parse(player.getDynamicProperty(CONFIG.playerHistoryKey), { totalKills: 0, eliteKills: 0, daysCompleted: 0, questsCompleted: 0 });
  }

  static saveHistory(player, history) {
    player.setDynamicProperty(CONFIG.playerHistoryKey, JSON.stringify(history));
  }

  static makeQuest(key, dayKey) {
    const definition = DAILY_QUEST_REGISTRY[key];
    return {
      id: `${dayKey}:${key}`,
      registryId: key,
      type: definition.type,
      title: definition.title,
      targetId: definition.targetId,
      required: definition.required,
      progress: 0,
      completed: false,
      claimed: false,
      activity: definition.activity,
      activityAwarded: false,
      rewardId: definition.rewardId
    };
  }

  static generate(player) {
    const dayKey = this.getDayKey();
    const history = this.getHistory(player);
    const killPool = player.hasTag("daily_t4_unlocked") || history.totalKills >= 50 ? QUEST_POOLS.killHigh :
      history.totalKills >= 20 ? QUEST_POOLS.killMid : QUEST_POOLS.killNew;
    const keys = [pick(QUEST_POOLS.collect), pick(killPool), "world_event", pick(QUEST_POOLS.random)];
    return {
      dayKey,
      quests: keys.map(key => this.makeQuest(key, dayKey)),
      activity: 0,
      activityClaims: [],
      finalRewardClaimed: false,
      salesSeen: IntegrationBridge.getSalesTotal(player.name),
      generatedAt: Date.now()
    };
  }

  static ensureState(player, force = false) {
    let state = parse(player.getDynamicProperty(CONFIG.playerStateKey), null);
    const dayKey = this.getDayKey();
    if (force || !state || state.dayKey !== dayKey || !Array.isArray(state.quests) || state.quests.length !== CONFIG.taskCount) {
      if (!force && state?.dayKey && state.dayKey !== dayKey && state?.quests?.every?.(quest => quest.completed)) {
        const history = this.getHistory(player);
        history.daysCompleted = Number(history.daysCompleted || 0) + 1;
        this.saveHistory(player, history);
      }
      state = this.generate(player);
      this.saveState(player, state);
      player.sendMessage(`§6[生存联盟] 已生成 ${dayKey} 的 4 项日常委托。`);
    }
    if (state.quests.some(quest => quest.type === "repair")) {
      const replacements = QUEST_POOLS.random.filter(key => DAILY_QUEST_REGISTRY[key]?.type !== "repair");
      state.quests = state.quests.map(quest => quest.type === "repair" ? this.makeQuest(pick(replacements), dayKey) : quest);
      this.saveState(player, state);
      player.sendMessage("§e[生存联盟] 维修委托已取消，并自动替换为新的随机委托。");
    }
    return state;
  }

  static saveState(player, state) {
    player.setDynamicProperty(CONFIG.playerStateKey, JSON.stringify(state));
  }

  static matchesTarget(quest, value) {
    if (quest.type === "collect") return (COLLECT_GROUPS[quest.targetId] || []).includes(value);
    if (quest.type === "kill") return (MOB_TARGETS[quest.targetId] || []).includes(value);
    return quest.targetId === "any" || quest.targetId === value;
  }

  static advance(player, matcher, amount = 1, label = "") {
    const state = this.ensureState(player);
    let changed = false;
    for (const quest of state.quests) {
      if (quest.completed || !matcher(quest)) continue;
      const before = quest.progress;
      quest.progress = Math.min(quest.required, quest.progress + Math.max(0, Number(amount) || 0));
      if (quest.progress === before) continue;
      changed = true;
      if (quest.progress >= quest.required) {
        quest.completed = true;
        if (!quest.activityAwarded) {
          quest.activityAwarded = true;
          state.activity = Math.min(100, Number(state.activity || 0) + Number(quest.activity || 0));
          const history = this.getHistory(player);
          history.questsCompleted = Number(history.questsCompleted || 0) + 1;
          this.saveHistory(player, history);
        }
        player.sendMessage(`§a✓ 每日委托完成：${quest.title} §7（活跃度 +${quest.activity}）`);
        try { player.playSound("random.orb", { volume: 0.7, pitch: 1.3 }); } catch {}
      }
      try { player.onScreenDisplay.setActionBar(`§6[每日委托] §f${label || quest.title} §e${quest.progress}/${quest.required}`); } catch {}
    }
    if (changed) this.saveState(player, state);
    return changed;
  }

  static onBlockCollected(player, typeId) {
    this.advance(player, quest => quest.type === "collect" && this.matchesTarget(quest, typeId), 1);
  }

  static onKillCredit(player, typeId) {
    const history = this.getHistory(player);
    history.totalKills = Number(history.totalKills || 0) + 1;
    if ((MOB_TARGETS.elite || []).includes(typeId)) history.eliteKills = Number(history.eliteKills || 0) + 1;
    this.saveHistory(player, history);
    this.advance(player, quest => quest.type === "kill" && this.matchesTarget(quest, typeId), 1);
  }

  static onWorldEventSuccess(player, templateId) {
    this.advance(player, quest => quest.type === "world_event" && (quest.targetId === "any" || quest.targetId === templateId), 1, "完成动态事件");
  }

  static onCraft(player, itemId, amount = 1) {
    this.advance(player, quest => quest.type === "craft" && quest.targetId === itemId, amount);
  }

  static pollSales(player) {
    const state = this.ensureState(player);
    const total = IntegrationBridge.getSalesTotal(player.name);
    const delta = Math.max(0, total - Number(state.salesSeen || 0));
    if (!delta) return;
    state.salesSeen = total;
    this.saveState(player, state);
    this.advance(player, quest => quest.type === "sell", delta, "出售资源");
  }

  static claimCompleted(player) {
    const state = this.ensureState(player);
    let claimed = 0;
    for (const quest of state.quests) {
      if (!quest.completed || quest.claimed) continue;
      const uniqueId = `daily:${state.dayKey}:quest:${quest.id}`;
      if (RewardManager.grant(player, quest.rewardId, uniqueId, `daily:${quest.registryId}`)) {
        quest.claimed = true;
        claimed++;
      } else if (RewardManager.hasClaimed(player, uniqueId)) quest.claimed = true;
    }
    this.saveState(player, state);
    return claimed;
  }

  static claimActivity(player, value) {
    const state = this.ensureState(player);
    if (!Array.isArray(state.activityClaims)) state.activityClaims = [];
    const milestone = ACTIVITY_MILESTONES.find(entry => entry.value === value);
    if (!milestone || state.activity < value || state.activityClaims.includes(value)) return false;
    const uniqueId = `daily:${state.dayKey}:activity:${value}`;
    if (!RewardManager.grant(player, milestone.rewardId, uniqueId, "daily_activity")) return false;
    state.activityClaims.push(value);
    if (value === 100) state.finalRewardClaimed = true;
    this.saveState(player, state);
    return true;
  }

  static removeItem(player, typeId, amount) {
    try {
      const container = player.getComponent("minecraft:inventory")?.container;
      let available = 0;
      for (let slot = 0; container && slot < container.size; slot++) {
        const item = container.getItem(slot);
        if (item?.typeId === typeId) available += item.amount;
      }
      if (available < amount) return false;
      let remaining = amount;
      for (let slot = 0; container && slot < container.size && remaining > 0; slot++) {
        const item = container.getItem(slot);
        if (!item || item.typeId !== typeId) continue;
        const take = Math.min(remaining, item.amount);
        remaining -= take;
        if (take === item.amount) container.setItem(slot, undefined);
        else { item.amount -= take; container.setItem(slot, item); }
      }
      return remaining === 0;
    } catch { return false; }
  }

  static submitCraftPlaceholder(player) {
    const state = this.ensureState(player);
    const quest = state.quests.find(entry => entry.type === "craft" && !entry.completed);
    if (!quest) return { ok: false, message: "今日没有待完成的制造任务。" };
    const needed = Math.max(1, quest.required - quest.progress);
    if (!this.removeItem(player, quest.targetId, needed)) return { ok: false, message: `需要提交 ${quest.targetId} ×${needed}。` };
    this.onCraft(player, quest.targetId, needed);
    return { ok: true, message: "已提交制造成果；支持制造事件的版本会自动记录，无需提交。" };
  }

  static summary(player) {
    const state = this.ensureState(player);
    const complete = state.quests.filter(quest => quest.completed).length;
    return { state, complete, pending: RewardManager.pendingCount(player) };
  }
}
