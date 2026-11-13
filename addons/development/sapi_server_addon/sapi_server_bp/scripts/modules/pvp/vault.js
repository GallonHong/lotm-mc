import { world, EquipmentSlot, ItemStack } from '@minecraft/server';
import { PVP_CONFIG, marker } from './rules.js';
import { PVP_GUN_IDS } from './guns.generated.js';
const EQUIPMENT = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand];
const INDEX_KEY = 'pvp:vault_index_v1';
const TX_KEY = 'pvp:transaction_v1';
export function readTransaction(player) {
 const raw = player.getDynamicProperty(TX_KEY);
 return raw ? JSON.parse(String(raw)) : null;
}
export function writeTransaction(player, transaction) {
 player.setDynamicProperty(TX_KEY, JSON.stringify(transaction));
}
export function vaultLocation(slot, side = 0) {
 return { x: PVP_CONFIG.vault.x + (slot % 8) * 4 + side * 2, y: PVP_CONFIG.vault.y, z: PVP_CONFIG.vault.z + Math.floor(slot / 8) * 3 };
}
export function vaultContainers(slot) {
 return [0,1].map(side => {
  const block = world.getDimension(PVP_CONFIG.dimension).getBlock(vaultLocation(slot, side));
  if (block?.typeId !== 'minecraft:chest') throw new Error('装备托管箱缺失或未加载；禁止覆盖，需管理员恢复。');
  const container = block.getComponent('minecraft:inventory')?.container;
  if (!container || container.size !== 27) throw new Error('装备托管箱状态不正确。');
  return container;
 });
}
function index() { return JSON.parse(String(world.getDynamicProperty(INDEX_KEY) || '{}')); }
export function reserveVault(player) {
 const all = index();
 if (all[player.id] !== undefined) return all[player.id];
 const used = new Set(Object.values(all));
 const slot = Array.from({length:PVP_CONFIG.vault.slots},(_,i)=>i).find(i=>!used.has(i));
 if (slot === undefined) throw new Error('托管区已满，需先完成离线玩家的装备恢复。');
 all[player.id] = slot; world.setDynamicProperty(INDEX_KEY, JSON.stringify(all));
 return slot;
}
export function releaseVault(player, tx) {
 // Only after RESTORED is durable; this never runs during an ambiguous recovery.
 if (tx.phase !== 'RESTORED' && tx.phase !== 'CANCELLED') throw new Error('托管事务未完成。');
 const allocated = index();
 if (allocated[player.id] !== tx.slot) return;
 for (const c of vaultContainers(tx.slot)) for (let i=0;i<c.size;i++) c.setItem(i);
 const all = index(); delete all[player.id]; world.setDynamicProperty(INDEX_KEY, JSON.stringify(all));
}
function inventory(player) {
 const c = player.getComponent('minecraft:inventory')?.container;
 if (!c || c.size !== 36) throw new Error('非标准玩家背包，拒绝托管以避免丢失。');
 return c;
}
function assertOwner(player, tx) {
 if(index()[player.id] !== tx.slot)throw new Error('托管槽位归属不匹配，已停止恢复。');
}
function assertSnapshot(boxes, tx) {
 if(!Array.isArray(tx.snapshot)||tx.snapshot.length!==41)throw new Error('缺少完整托管校验清单，禁止用空箱覆盖装备。');
 for(let i=0;i<41;i++) {
  const item=getSaved(boxes,i), expected=tx.snapshot[i];
  if(expected ? !item||item.typeId!==expected.typeId||item.amount!==expected.amount : !!item)throw new Error(`托管物品校验失败（槽 ${i}），已停止恢复。`);
 }
}
function getSaved(containers, n) { return containers[Math.floor(n / 27)].getItem(n % 27); }
function setSaved(containers, n, item) { containers[Math.floor(n / 27)].setItem(n % 27, item); }
export function storeOriginals(player, tx) {
 const inv = inventory(player), eq = player.getComponent('minecraft:equippable'), boxes = vaultContainers(tx.slot);
 if (!eq) throw new Error('无法读取护甲槽。');
 assertOwner(player,tx);
 for (const c of boxes) for (let i=0;i<c.size;i++) if(c.getItem(i)) throw new Error('托管箱非空，已阻止覆盖。');
 // Canonical ItemStack copies include native item metadata. No JSON serialization of inventory.
 // A PREPARING crash leaves player originals untouched; STORED is written before any clearing.
 const originals=[...Array.from({length:36},(_,i)=>inv.getItem(i)),...EQUIPMENT.map(slot=>eq.getEquipment(slot))];
 tx.snapshot=originals.map(item=>item?{typeId:item.typeId,amount:item.amount}:null);
 originals.forEach((item,i)=>setSaved(boxes,i,item));
 assertSnapshot(boxes,tx);
 tx.phase = 'STORED'; writeTransaction(player,tx);
}
export function clearPlayer(player) {
 const inv=inventory(player); for(let i=0;i<inv.size;i++) inv.setItem(i);
 const eq=player.getComponent('minecraft:equippable'); for(const slot of EQUIPMENT) eq.setEquipment(slot);
}
function matchCopy(item, matchId) {
 if (!item) return undefined;
 const copy=item.clone(); copy.setLore([...(copy.getLore() || []).slice(0,19),marker(matchId)]); return copy;
}
function isGun(item) { return !!item && PVP_GUN_IDS.has(item.typeId); }
function isShield(item) { return !!item && item.typeId === 'minecraft:shield'; }
export const PVP_FALLBACK_GUN = 'test_gun:ak47';
export function issueMatchEquipment(player, tx) {
 // Admission-only grant. A repeated callback or a respawn must never refill a
 // weapon already dropped/shared. Interrupted ISSUING goes through restoration.
 const persisted = readTransaction(player);
 if (!persisted || persisted.matchId !== tx.matchId) throw new Error('比赛发装事务不匹配。');
 if (persisted.phase === 'ACTIVE') return false;
 if (persisted.phase !== 'STORED' || tx.phase !== 'STORED') throw new Error('比赛发装已开始或不在安全阶段，请先恢复装备。');
 const boxes=vaultContainers(tx.slot), inv=inventory(player), eq=player.getComponent('minecraft:equippable');
 assertOwner(player,tx);assertSnapshot(boxes,tx);
 // Search all 36 accessible inventory slots, not only the selected hand. An
 // offhand gun is also usable; move its temporary copy into a normal match slot.
 const ownedGuns=[];
 const ownedShields=[];
 for(let i=0;i<36;i++) { const item=getSaved(boxes,i); if(isGun(item)) ownedGuns.push({slot:i,item}); else if(isShield(item)) ownedShields.push({slot:i,item}); }
 const off=getSaved(boxes,40);
 const needsFallback=ownedGuns.length===0&&!isGun(off);
 tx.phase='ISSUING';tx.fallbackGunIssued=needsFallback;writeTransaction(player,tx);
 clearPlayer(player);
 for(const {slot,item} of ownedGuns) inv.setItem(slot,matchCopy(item,tx.matchId));
 // Shields are allowed in PvP: keep inventory shields (hotbar/backpack) and put each
 // back in its original slot, or the first free slot if that slot is occupied.
 for(const {slot,item} of ownedShields) {
  const copy=matchCopy(item,tx.matchId);
  if(!inv.getItem(slot)) inv.setItem(slot,copy);
  else { for(let i=0;i<36;i++) if(!inv.getItem(i)) { inv.setItem(i,copy); break; } }
 }
 for(let i=0;i<4;i++) eq.setEquipment(EQUIPMENT[i],matchCopy(getSaved(boxes,36+i),tx.matchId));
 if(off?.typeId==='minecraft:shield') eq.setEquipment(EquipmentSlot.Offhand,matchCopy(off,tx.matchId));
 let selected=tx.selectedSlot;
 if(isGun(off)) {
  for(let i=0;i<36;i++) if(!inv.getItem(i)) { inv.setItem(i,matchCopy(off,tx.matchId)); if(!ownedGuns.length)selected=i; break; }
 }
 if(needsFallback) {
  selected=Number.isInteger(tx.selectedSlot)&&tx.selectedSlot>=0&&tx.selectedSlot<36?tx.selectedSlot:0;
  const fallback=matchCopy(new ItemStack(PVP_FALLBACK_GUN,1),tx.matchId);
  fallback.setLore([...fallback.getLore(),'§7比赛保底武器 · 可转交 · 赛后回收']);
  inv.setItem(selected,fallback);
 }
 player.selectedSlotIndex=selected;
 tx.phase='ACTIVE';writeTransaction(player,tx);
 return true;
}
export function restoreOriginals(player, tx) {
 const inv=inventory(player),eq=player.getComponent('minecraft:equippable'),boxes=vaultContainers(tx.slot);
 assertOwner(player,tx);assertSnapshot(boxes,tx);
 // Deterministic overwrite from retained canonical originals. Repeating after a crash never adds copies.
 // Do not clear canonical boxes until both packages acknowledge cleanup and RESTORED is persisted.
 for(let i=0;i<36;i++) inv.setItem(i,getSaved(boxes,i));
 EQUIPMENT.forEach((slot,i)=>eq.setEquipment(slot,getSaved(boxes,36+i)));
 player.selectedSlotIndex=tx.selectedSlot;
}
