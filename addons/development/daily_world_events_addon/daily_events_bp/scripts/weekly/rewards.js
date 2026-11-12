import { world, ItemStack } from "@minecraft/server";
import { isPvpExcluded } from "../pvpIsolation.js";
import { WEEKLY_BOSSES, WEEKLY_CONFIG, WEEKLY_TIERS, WEEK_MS, weekKey } from "./config.js";

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const validKey = key => typeof key === "string" && /^n_[0-9a-f]{4,256}$/.test(key) && (key.length - 2) % 4 === 0;
const normalizedName = name => String(name || "").trim().toLowerCase();

function accountKey(name) {
 const canonical = normalizedName(name);
 if (!canonical || canonical.length > 64) throw new Error("Weekly rewards require a valid player name");
 let key = "n_";
 for (let index = 0; index < canonical.length; index++) key += canonical.charCodeAt(index).toString(16).padStart(4, "0");
 return key;
}

function hashUnit(text) {
 let hash = 2166136261;
 for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
 // Avalanche the domain-separated streams so the two blueprint checks are independent.
 hash ^= hash >>> 16;
 hash = Math.imul(hash, 0x7feb352d);
 hash ^= hash >>> 15;
 hash = Math.imul(hash, 0x846ca68b);
 hash ^= hash >>> 16;
 return (hash >>> 0) / 4294967296;
}

export function stableWeeklyRolls(salt, playerKey, bossId, week) {
 return [0, 1].map(index => hashUnit(`${salt}|${playerKey}|${bossId}|${week}|blueprint_${index}`));
}

function definitions(bossId, tier) {
 if (!own(WEEKLY_BOSSES, bossId) || !own(WEEKLY_TIERS, tier)) throw new Error("Unknown weekly boss or difficulty");
 return { boss: WEEKLY_BOSSES[bossId], rule: WEEKLY_TIERS[tier] };
}

/** Pure highest-tier entitlement calculation. Material rewards never enter blueprint rolls. */
export function previewReward(bossId, tier, previous = null, rolls = [1, 1]) {
 const { boss, rule } = definitions(bossId, tier);
 const oldRank = previous?.tier && own(WEEKLY_TIERS, previous.tier) ? WEEKLY_TIERS[previous.tier].rank : -1;
 if (oldRank >= rule.rank) {
  // Highest-tier guarantee backfill: a hell clear recorded before the guaranteed
  // first blueprint existed receives it on the next kill of the same week.
  const guaranteed = rule.blueprintChances[0] >= 1 ? boss.blueprints[0] : null;
  if (guaranteed && previous && !(previous.blueprints || []).includes(guaranteed.id)) {
   const targetItems = { ...(previous.items || {}), [guaranteed.id]: 1 };
   return { awarded: true, reason: "guarantee_backfill", gold: 0, items: [{ id: guaranteed.id, amount: 1 }], highestTier: previous.tier, targetGold: previous.gold, targetItems, blueprints: [...(previous.blueprints || []), guaranteed.id] };
  }
  return { awarded: false, reason: "already_cleared", gold: 0, items: [], highestTier: previous.tier };
 }
 if (!Array.isArray(rolls) || rolls.length !== 2 || rolls.some(value => !Number.isFinite(value) || value < 0 || value > 1)) throw new Error("Invalid weekly blueprint rolls");
 const targetItems = {};
 for (const material of boss.materials) targetItems[material.id] = material.amount * rule.multiplier;
 const blueprints = [...(previous?.blueprints || [])];
 boss.blueprints.forEach((blueprint, index) => {
  if (rolls[index] < rule.blueprintChances[index] && !blueprints.includes(blueprint.id)) blueprints.push(blueprint.id);
 });
 for (const id of blueprints) targetItems[id] = 1;
 const targetGold = boss.baseGold * rule.multiplier;
 const items = Object.entries(targetItems).map(([id, amount]) => ({ id, amount: amount - Number(previous?.items?.[id] || 0) })).filter(item => item.amount > 0);
 return { awarded: true, reason: oldRank < 0 ? "first_clear" : "tier_upgrade", gold: targetGold - Number(previous?.gold || 0), items, highestTier: tier, targetGold, targetItems, blueprints };
}

function pendingCount(record) {
 return Number(record.gold > record.deliveredGold) + Object.entries(record.items).filter(([id, amount]) => amount > Number(record.deliveredItems[id] || 0)).length;
}

/**
 * All ledger writes and economy/inventory mutations are synchronous on server 1.15.0.
 * Write-ahead intents prevent duplicate retries after a restart. Bedrock cannot atomically
 * commit inventory/scoreboard plus dynamic properties: a crash after an effect but before
 * its receipt leaves an `inflight` entry. Such entries are quarantined for admin review,
 * never blindly replayed. This trades automatic recovery for protection against dupes.
 * No command fallback, dropped item, random reroll, or truncated pending queue is used.
 */
export function createWeeklyRewards({ world: gameWorld, ItemStack: Stack, isPvpExcluded: excluded = () => false, now = () => Date.now(), random = () => Math.random() }) {
 const locks = new Set();

 function ledgerKey(identity) { return WEEKLY_CONFIG.ledgerPrefix + identity.key; }
 function readLedger(identity) {
  const raw = gameWorld.getDynamicProperty(ledgerKey(identity));
  if (raw === undefined) return { version: 1, owner: identity.key, name: identity.name, closedBefore: weekKey(now() - (WEEKLY_CONFIG.retainedWeeks - 1) * WEEK_MS), records: {} };
  if (typeof raw !== "string") throw new Error("Weekly reward ledger is corrupt; refusing to reset it");
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error("Weekly reward ledger is corrupt; refusing to reset it"); }
  if (data?.version !== 1 || data.owner !== identity.key || !data.records || typeof data.records !== "object" || Array.isArray(data.records)) throw new Error("Invalid weekly reward ledger; refusing to overwrite it");
  for (const [key, record] of Object.entries(data.records)) {
   if (!record || !own(WEEKLY_TIERS, record.tier) || !Array.isArray(record.rolls) || record.rolls.length !== 2 || record.rolls.some(value => !Number.isFinite(value) || value < 0 || value >= 1) || !Array.isArray(record.blueprints) || !record.items || !record.deliveredItems || !Number.isSafeInteger(record.gold) || !Number.isSafeInteger(record.deliveredGold) || record.gold < 0 || record.deliveredGold < 0 || record.deliveredGold > record.gold) throw new Error(`Invalid weekly reward record ${key}`);
   for (const [id, amount] of Object.entries(record.items)) if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(record.deliveredItems[id] || 0) || (record.deliveredItems[id] || 0) < 0 || (record.deliveredItems[id] || 0) > amount) throw new Error(`Invalid weekly item receipt ${key}`);
  }
  return data;
 }
 function writeLedger(identity, ledger) {
  const cutoff = weekKey(now() - (WEEKLY_CONFIG.retainedWeeks - 1) * WEEK_MS);
  ledger.closedBefore = [ledger.closedBefore || cutoff, cutoff].sort().pop();
  for (const [key, record] of Object.entries(ledger.records)) {
   if (key.slice(0, 10) < ledger.closedBefore && !record.inflight && pendingCount(record) === 0) delete ledger.records[key];
  }
  const serialized = JSON.stringify(ledger);
  if (serialized.length > WEEKLY_CONFIG.maxLedgerCharacters) throw new Error("Weekly reward ledger is full; pending rewards are preserved");
  gameWorld.setDynamicProperty(ledgerKey(identity), serialized);
 }
 function salt() {
  let value = gameWorld.getDynamicProperty(WEEKLY_CONFIG.saltKey);
  if (value === undefined) {
   value = `${now().toString(36)}_${Math.floor(random() * 4294967296).toString(36)}_${Math.floor(random() * 4294967296).toString(36)}`;
   gameWorld.setDynamicProperty(WEEKLY_CONFIG.saltKey, value);
  }
  if (typeof value !== "string" || !value) throw new Error("Weekly reward salt is corrupt; refusing to reroll");
  return value;
 }
 function validateWeek(week) {
  const timestamp = Date.parse(`${week}T04:00:00+08:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(week)) || !Number.isFinite(timestamp) || weekKey(timestamp) !== week) throw new Error("Invalid weekly reward week");
 }
 function transact(identity, ledger, record, operation, effect, settle) {
  record.inflight = { ...operation, startedAt: now() };
  writeLedger(identity, ledger); // Must succeed before the external effect begins.
  let result;
  try { result = effect(); }
  catch (error) {
   // An API exception is not proof the engine applied no effect. Keep the intent.
   record.inflight.error = String(error).slice(0, 160);
   try { writeLedger(identity, ledger); } catch {}
   throw error;
  }
  settle(result);
  record.inflight = null;
  writeLedger(identity, ledger); // Failure leaves the durable intent for review.
  return result;
 }

 return class WeeklyRewardService {
  static identity(playerOrIdentity) {
   if (!playerOrIdentity) throw new Error("Missing weekly reward player");
   const name = normalizedName(typeof playerOrIdentity === "string" ? playerOrIdentity : playerOrIdentity.name);
   let key = playerOrIdentity.key;
   if (typeof playerOrIdentity.getDynamicProperty === "function") {
    const stored = playerOrIdentity.getDynamicProperty(WEEKLY_CONFIG.identityKey);
    if (stored !== undefined && !validKey(stored)) throw new Error("Invalid stored weekly player identity");
    key = stored || accountKey(name);
    if (!stored) playerOrIdentity.setDynamicProperty(WEEKLY_CONFIG.identityKey, key);
   }
   if (key === undefined) key = accountKey(name);
   if (!validKey(key)) throw new Error("Invalid weekly player key");
   return { key, name, id: playerOrIdentity.id || "" };
  }
  static playerKey(playerOrIdentity) { return this.identity(playerOrIdentity).key; }

  static getProgress(playerOrIdentity, bossId, week = weekKey(now())) {
   if (!own(WEEKLY_BOSSES, bossId)) throw new Error("Unknown weekly boss");
   validateWeek(week);
   const identity = this.identity(playerOrIdentity);
   const record = readLedger(identity).records[`${week}/${bossId}`];
   return { week, bossId, highestTier: record?.tier || null, gold: record?.gold || 0, blueprints: [...(record?.blueprints || [])], pending: record ? pendingCount(record) : 0, needsReview: !!record?.inflight };
  }

  /** Call ONLY after a successful boss clear, with the frozen roster identity and raid week. */
  static complete(playerOrIdentity, bossId, tier, week = weekKey(now()), receiptId = "") {
   definitions(bossId, tier);
   validateWeek(week);
   const identity = this.identity(playerOrIdentity);
   if (locks.has(identity.key)) return { awarded: false, reason: "busy", gold: 0, items: [] };
   let result;
   locks.add(identity.key);
   try {
    const ledger = readLedger(identity);
    const cutoff = weekKey(now() - (WEEKLY_CONFIG.retainedWeeks - 1) * WEEK_MS);
    if (week > weekKey(now()) || week < (ledger.closedBefore > cutoff ? ledger.closedBefore : cutoff)) return { awarded: false, reason: "expired_week", gold: 0, items: [] };
    const key = `${week}/${bossId}`;
    const previous = ledger.records[key] || null;
    const rolls = previous?.rolls || stableWeeklyRolls(salt(), identity.key, bossId, week);
    result = previewReward(bossId, tier, previous, rolls);
    if (!result.awarded) return { ...result, pending: pendingCount(previous), needsReview: !!previous.inflight };
    ledger.name = identity.name;
    ledger.records[key] = {
     tier, rolls, blueprints: result.blueprints, gold: result.targetGold, items: result.targetItems,
     deliveredGold: previous?.deliveredGold || 0, deliveredItems: previous?.deliveredItems || {},
     inflight: previous?.inflight || null, receiptId: String(receiptId).slice(0, 120),
     createdAt: previous?.createdAt || now(), updatedAt: now()
    };
    writeLedger(identity, ledger);
    result = { awarded: true, reason: result.reason, gold: result.gold, items: result.items, highestTier: tier, pending: pendingCount(ledger.records[key]), needsReview: !!ledger.records[key].inflight };
   } finally { locks.delete(identity.key); }
   if (typeof playerOrIdentity.getComponent === "function") {
    this.claimPending(playerOrIdentity);
    const progress = this.getProgress(playerOrIdentity, bossId, week);
    result.pending = progress.pending;
    result.needsReview = progress.needsReview;
   }
   return result;
  }

  /** Reconnect/menu claim. Uses live inventory; offline, full-inventory and PvP rewards stay queued. */
  static claimPending(player) {
   if (!player || typeof player.getComponent !== "function" || excluded(player)) return { delivered: 0, pending: 0, deferred: true, needsReview: false };
   const identity = this.identity(player);
   if (locks.has(identity.key)) return { delivered: 0, pending: 0, deferred: true, needsReview: false };
   locks.add(identity.key);
   let delivered = 0;
   let error = "";
   try {
    const ledger = readLedger(identity);
    for (const key of Object.keys(ledger.records).sort()) {
     const record = ledger.records[key];
     if (record.inflight) continue;
     if (record.gold > record.deliveredGold) {
      let objective;
      let target;
      let current;
      try {
       objective = gameWorld.scoreboard.getObjective(WEEKLY_CONFIG.moneyObjective) || gameWorld.scoreboard.addObjective(WEEKLY_CONFIG.moneyObjective, "金币");
       target = player.scoreboardIdentity || player;
       current = objective.getScore(target) ?? 0;
      } catch { objective = null; }
      const amount = record.gold - record.deliveredGold;
      if (objective && Number.isSafeInteger(current) && current + amount <= 2147483647) {
       transact(identity, ledger, record, { kind: "gold", amount, balanceBefore: current }, () => objective.setScore(target, current + amount), () => { record.deliveredGold += amount; });
       delivered++;
      }
     }
     for (const [id, total] of Object.entries(record.items)) {
      let remaining = total - Number(record.deliveredItems[id] || 0);
      while (remaining > 0) {
       let container;
       let stack;
       try {
        container = player.getComponent("minecraft:inventory")?.container;
        if (!container) break;
        stack = new Stack(id, 1);
        stack.amount = Math.min(remaining, Math.max(1, Number(stack.maxAmount) || 64));
       } catch { break; }
       const amount = stack.amount;
       let inserted = 0;
       transact(identity, ledger, record, { kind: "item", id, amount }, () => container.addItem(stack), leftover => {
        const leftoverAmount = leftover ? Number(leftover.amount) : 0;
        if (!Number.isSafeInteger(leftoverAmount) || leftoverAmount < 0 || leftoverAmount > amount || (leftover && leftover.typeId !== id)) throw new Error("Unexpected inventory result; reward requires review");
        inserted = amount - leftoverAmount;
        record.deliveredItems[id] = Number(record.deliveredItems[id] || 0) + inserted;
       });
       if (inserted) delivered++;
       remaining -= inserted;
       if (inserted < amount) break;
      }
     }
    }
   } catch (failure) {
    error = String(failure);
    console.warn(`[WeeklyRewards] ${identity.name}: ${error}`);
   } finally { locks.delete(identity.key); }
   // Never write a stale in-memory ledger after an effect/receipt error. Read durable truth.
   const latest = readLedger(identity);
   return { delivered, pending: Object.values(latest.records).reduce((sum, record) => sum + pendingCount(record), 0), needsReview: Object.values(latest.records).some(record => !!record.inflight), ...(error ? { error } : {}) };
  }

  static pendingCount(playerOrIdentity) {
   const ledger = readLedger(this.identity(playerOrIdentity));
   return Object.values(ledger.records).reduce((sum, record) => sum + pendingCount(record), 0);
  }
 };
}

export class WeeklyRewards extends createWeeklyRewards({ world, ItemStack, isPvpExcluded }) {}
