import { EquipmentSlot } from '@minecraft/server';

const ARMOR_SLOTS = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];
const SHIELDS = new Set(['test_gun:riot_shield', 'test_gun:flash_shield']);

// Only equipment actually worn/held is touched. No inventory or PvP escrow access.
export class EquipmentWear {
 static isShield(item) { return SHIELDS.has(item?.typeId); }
 static shieldSlot(eq) {
  if (this.isShield(eq?.getEquipment(EquipmentSlot.Offhand))) return EquipmentSlot.Offhand;
  if (this.isShield(eq?.getEquipment(EquipmentSlot.Mainhand))) return EquipmentSlot.Mainhand;
  return undefined;
 }
 static identity(item) {
  try { return JSON.stringify([item.typeId, item.nameTag, item.getLore?.(), item.getComponent('minecraft:enchantable')?.getEnchantments?.().map(e => [e.type.id,e.level]).sort(), item.getDynamicPropertyIds?.().sort().map(k => [k,item.getDynamicProperty(k)])]); }
  catch { return item.typeId; }
 }
 static context(target) {
  try { return JSON.stringify((target.getTags?.() || []).filter(t => t === 'pvp:participant' || t === 'pvp:guns_finished' || t.startsWith('pvp:match:')).sort()); }
  catch { return ''; }
 }
 static snapshot(target, damage, shieldSlot, blockedDamage = 0, armor = true) {
  const result = [];
  result.context = this.context(target);
  try {
   if (['creative', 'spectator'].includes(String(target.getGameMode?.()).toLowerCase())) return result;
   const eq = target.getComponent('minecraft:equippable');
   if (!eq || !Number.isFinite(damage) || damage < 0 || (!(damage > 0) && !(shieldSlot && blockedDamage > 0))) return result;
   for (const slot of [...(armor ? ARMOR_SLOTS : []), ...(shieldSlot ? [shieldSlot] : [])]) {
    const item = eq.getEquipment(slot), dur = item?.getComponent('minecraft:durability');
    if (!dur || !Number.isFinite(dur.maxDurability) || dur.maxDurability <= 0) continue;
    const shield = slot === shieldSlot;
    if (shield ? !this.isShield(item) : !item.typeId.startsWith('test_gun:')) continue;
    const incoming = shield ? blockedDamage : damage;
    if (!(incoming > 0)) continue;
    const points = Math.max(1, Math.floor(incoming / 4));
    let level = 0;
    try { level = item.getComponent('minecraft:enchantable')?.getEnchantment('unbreaking')?.level || 0; } catch {}
    // Vanilla armor rule: at least 60% durability consumption. Shields use tool rule.
    const chance = shield ? 1 / (level + 1) : 0.6 + 0.4 / (level + 1);
    let wear = 0;
    for (let i = 0; i < points; i++) if (Math.random() < chance) wear++;
    result.push({ slot, identity: this.identity(item), before: dur.damage || 0, wear });
   }
  } catch {}
  return result;
 }
 static commit(target, snapshot) {
  try {
   if (snapshot.context !== this.context(target)) return;
   const eq = target.getComponent('minecraft:equippable');
   if (!eq) return;
   for (const entry of snapshot) {
    const item = eq.getEquipment(entry.slot), dur = item?.getComponent('minecraft:durability');
    if (!dur || this.identity(item) !== entry.identity) continue;
    // A native damage callback may already have worn it: top up, never double-charge.
    if (dur.damage < entry.before) continue; // repaired/replaced during callback
    const next = Math.max(dur.damage, entry.before + entry.wear);
    if (next === dur.damage) continue;
    if (next >= dur.maxDurability) {
     eq.setEquipment(entry.slot, undefined);
     try { target.dimension.playSound('random.break', target.location); } catch {}
    } else {
     dur.damage = next;
     eq.setEquipment(entry.slot, item);
    }
   }
  } catch (error) { console.warn('[Test Guns] Equipment durability write failed:', error); }
 }
 static block(target, shieldSlot, blockedDamage) {
  if (!shieldSlot || !(Number.isFinite(blockedDamage) && blockedDamage > 0)) return;
  this.commit(target, this.snapshot(target, 0, shieldSlot, blockedDamage, false));
 }
 static apply(target, damage, options, wearDamage = damage, shieldSlot, blockedDamage = 0) {
  if (!(Number.isFinite(damage) && damage > 0)) return false;
  const snapshot = this.snapshot(target, wearDamage, shieldSlot, blockedDamage);
  // No anonymous/native fallback: a rejected/throwing hit must not bypass protection.
  const applied = target.applyDamage(damage, options);
  if (applied === true) this.commit(target, snapshot);
  return applied;
 }
}
