import { world, EquipmentSlot } from '@minecraft/server';
import { isPvpParticipant, pvpMatch } from './utils/pvpRules.js';

export const FLAME_ITEM_KEY = 'tg_flamethrower_identity';
const RECEIPT_KEY = 'tg_flame_wear_receipt';
let settlementSerial = 0;
const ID = 'test_gun:flamethrower';
const scopeOf = player => isPvpParticipant(player) ? `match:${pvpMatch(player)}` : 'survival';
const keyOf = (token, scope) => `tg_flame_wear_${token}:${scope}`;
function read(token, scope) {
 const raw = world.getDynamicProperty(keyOf(token, scope));
 if (raw === undefined) return { version: 1, debt: 0 };
 const record = JSON.parse(raw);
 if (record?.version !== 1 || !Number.isSafeInteger(record.debt) || record.debt < 0) throw Error('Invalid flamethrower wear');
 return record;
}
function write(token, scope, record) {
 world.setDynamicProperty(keyOf(token, scope), record.debt || record.settlement ? JSON.stringify(record) : undefined);
}
function matches(item, token) {
 try { return item?.typeId === ID && item.getDynamicProperty(FLAME_ITEM_KEY) === token; } catch { return false; }
}
function locate(player, token) {
 const eq = player.getComponent('minecraft:equippable'), held = eq?.getEquipment(EquipmentSlot.Mainhand);
 if (matches(held, token)) return { item: held, get: () => eq.getEquipment(EquipmentSlot.Mainhand), set: item => eq.setEquipment(EquipmentSlot.Mainhand, item) };
 const inventory = player.getComponent('minecraft:inventory')?.container;
 for (let i = 0; i < (inventory?.size || 0); i++) {
  const item = inventory.getItem(i);
  if (matches(item, token)) return { item, get: () => inventory.getItem(i), set: value => inventory.setItem(i, value) };
 }
 return null;
}

/** One wear point per fuel pulse. Persist debt before firing, but do not replace
 * the held stack during a continuous spray. Item identity and match scope keep
 * swaps, drops, reconnects and PvP copies from losing/transferring this debt. */
export class FlamethrowerWear {
 static scope(player) { return scopeOf(player); }
 static canUse(player, item) {
  try {
   const markers = (item?.getLore?.() || []).filter(line => line.startsWith('PVP_MATCH:'));
   return isPvpParticipant(player) ? markers.length === 1 && markers[0] === `PVP_MATCH:${pvpMatch(player)}` : markers.length === 0;
  } catch { return false; }
 }
 static pending(player, token) {
  try { return read(token, scopeOf(player)).debt; } catch { return Infinity; }
 }
 static reserve(player, token) {
  try {
   const item = player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand);
   const dur = item?.getComponent('minecraft:durability');
   if (!matches(item, token) || !dur || !this.canUse(player, item)) return false;
   const scope = scopeOf(player), record = read(token, scope);
   if (record.settlement || dur.damage + record.debt >= dur.maxDurability) return false;
   record.debt++;
   write(token, scope, record);
   return true;
  } catch { return false; }
 }
 static cancelReservation(player, token) {
  try {
   const scope = scopeOf(player), record = read(token, scope);
   if (record.settlement) return;
   record.debt = Math.max(0, record.debt - 1); write(token, scope, record);
  } catch { /* Keep conservative wear after an uncertain persistence failure. */ }
 }
 static isBroken(player, token) {
  try {
   const item = locate(player, token)?.item, dur = item?.getComponent('minecraft:durability');
   return !dur || dur.damage + this.pending(player, token) >= dur.maxDurability;
  } catch { return true; }
 }
 static settle(player, token, expectedScope = scopeOf(player)) {
  try {
   if (!token || scopeOf(player) !== expectedScope) return false;
   const slot = locate(player, token);
   if (!slot || !this.canUse(player, slot.item)) return false;
   const dur = slot.item.getComponent('minecraft:durability'); if (!dur) return false;
   const record = read(token, expectedScope);
   if (record.settlement) {
    const tx = record.settlement;
    if (!Number.isSafeInteger(tx.amount) || tx.amount < 1 || !Number.isSafeInteger(tx.before) || tx.before < 0 || tx.after !== tx.before + tx.amount ||
     (tx.receipt !== undefined && (typeof tx.receipt !== 'string' || !tx.receipt.length || tx.receipt.length > 200))) return false;
    // The receipt is saved in the SAME ItemStack write as the wear. A native
    // anvil repair may lower damage after that write but before ledger cleanup.
    // A matching receipt still proves the debt was paid, so never charge twice.
    if ((tx.receipt && slot.item.getDynamicProperty(RECEIPT_KEY) === tx.receipt) || (!tx.receipt && dur.damage >= tx.after)) {
     record.debt = Math.max(0, record.debt - tx.amount); delete record.settlement; write(token, expectedScope, record);
    } else if (dur.damage !== tx.before) {
     if (!tx.receipt) return false; // Legacy ambiguous transaction: do not guess.
     // No receipt means this new transaction has not reached the stack. If it
     // was repaired meanwhile, charge outstanding wear against its new damage.
     tx.before = dur.damage; tx.after = dur.damage + tx.amount;
     write(token, expectedScope, record);
    }
   }
   if (!record.debt) return true;
   const tx = record.settlement || { amount: record.debt, before: dur.damage, after: dur.damage + record.debt,
    receipt: `${expectedScope}:${Date.now()}:${++settlementSerial}` };
   if (!record.settlement) { record.settlement = tx; write(token, expectedScope, record); }
   const broken = tx.after >= dur.maxDurability;
   if (!broken) { dur.damage = tx.after; if (tx.receipt) slot.item.setDynamicProperty(RECEIPT_KEY, tx.receipt); }
   if (slot.set(broken ? undefined : slot.item) === false) return false;
   const actual = slot.get();
   if (broken ? actual !== undefined : !matches(actual, token) || !(actual.getComponent('minecraft:durability')?.damage >= tx.after) ||
    (tx.receipt && actual.getDynamicProperty(RECEIPT_KEY) !== tx.receipt)) return false;
   record.debt = Math.max(0, record.debt - tx.amount); delete record.settlement; write(token, expectedScope, record);
   if (broken) try { player.dimension.playSound('random.break', player.location); } catch {}
   return true;
  } catch { return false; } // An uncertain equipment write is read before retry.
 }
}
