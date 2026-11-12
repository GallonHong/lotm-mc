import { world } from "@minecraft/server";

// Keep original ItemStacks in native containers. Never rebuild cargo from JSON,
// and never delete a loaded cargo container while it still owns items.
const TYPE = "makercamp_dr:inventory_drone";
const key = ownerId => `ab_dr:cargo_owner:${ownerId}`;
function live(entity) {
 try { return !!entity && (typeof entity.isValid === "function" ? entity.isValid() : entity.isValid === true); }
 catch { return false; }
}
export class DroneCargoGuard {
 static isCargo(entity) { return entity?.typeId === TYPE; }
 static read(ownerId) {
  const raw = world.getDynamicProperty(key(ownerId));
  if (!raw) return null;
  const record = JSON.parse(raw);
  if (record?.version !== 1 || record.ownerId !== ownerId || typeof record.entityId !== "string" || record.droneId !== "camel") throw new Error("货运机存档无效，请管理员核对，禁止重复部署。");
  return record;
 }
 static save(ownerId, drone, parked = false) {
  if (!this.isCargo(drone?.entity)) return false;
  if (!live(drone.entity) || !drone.entity.hasTag(`ab_dr:owner_${ownerId}`)) throw new Error("货运机拥有者校验失败。");
  const previous = this.read(ownerId);
  if (previous && previous.entityId !== drone.entity.id) throw new Error("仍有另一架货运机存档，禁止覆盖。");
  const record = { version: 1, ownerId, entityId: drone.entity.id, droneId: "camel", dimension: drone.entity.dimension.id,
   location: { ...drone.entity.location }, durability: drone.durability, fuel: drone.fuel, parked };
  world.setDynamicProperty(key(ownerId), JSON.stringify(record));
  return record;
 }
 // Upgrade path for a pre-index cargo drone: only one loaded, exact-ID
 // owner/type match backed by the player's existing camel hangar is adoptable.
 static adoptLegacy(player, entry) {
  if (this.read(player.id)) return false;
  const dimensions = new Map([[player.dimension.id, player.dimension]]);
  for (const id of ["overworld", "nether", "the_end", "apoc_extract:city"]) {
   try { const dimension = world.getDimension(id); if (dimension) dimensions.set(dimension.id, dimension); } catch {}
  }
  const candidates = new Map();
  for (const dimension of dimensions.values()) {
   for (const entity of dimension.getEntities({ type: TYPE, tags: [`ab_dr:owner_${player.id}`] })) {
    if (!live(entity) || !this.isCargo(entity) || !entity.hasTag(`ab_dr:owner_${player.id}`)) continue;
    candidates.set(entity.id, entity);
   }
  }
  if (!candidates.size) return false;
  if (candidates.size !== 1) throw new Error("发现多架旧版货运机，已全部保留。请管理员核对拥有者和实体，不能自动复制或选一架覆盖。");
  const entity = [...candidates.values()][0], owners = entity.getTags().filter(tag => tag.startsWith("ab_dr:owner_"));
  if (!entry || entry.id !== "camel" || owners.length !== 1 || !entity.hasTag("ab_dr:type_camel")) throw new Error("旧货运机与机库/拥有者记录不一致，已保留原实体和货物，请管理员核对。");
  this.save(player.id, { entity, droneId: "camel", fuel: entry.fuel, durability: entry.durability }, true);
  return true;
 }
 static resolve(ownerId) {
  const record = this.read(ownerId);
  if (!record) return null;
  const entity = world.getEntity(record.entityId);
  if (!live(entity)) throw new Error(`原货运机暂未加载，禁止重复部署。原位置 ${record.dimension} ${Math.floor(record.location.x)},${Math.floor(record.location.y)},${Math.floor(record.location.z)}。`);
  if (!this.isCargo(entity) || !entity.hasTag(`ab_dr:owner_${ownerId}`)) throw new Error("原货运机身份不符，禁止自动恢复。");
  return { record, entity };
 }
 static clear(ownerId, entityId) {
  const record = this.read(ownerId);
  if (record && record.entityId !== entityId) throw new Error("货运机存档已变化，禁止清除。");
  if (record) world.setDynamicProperty(key(ownerId), undefined);
 }
 static canAccess(player, entity) {
  if (!this.isCargo(entity)) return true;
  try {
   if (player.hasTag("pvp:participant") || player.hasTag("pvp:admission")) return false;
   const record = this.read(player.id);
   return !!record && record.entityId === entity.id && record.ownerId === player.id && entity.hasTag(`ab_dr:owner_${player.id}`);
  } catch { return false; }
 }
 static unloadToOwner(player, entity) {
  if (!this.isCargo(entity)) return true;
  if (player.hasTag("pvp:participant") || player.hasTag("pvp:admission")) throw new Error("比赛准备期间不能转移真实货仓，请先退出比赛。");
  const cargo = entity.getComponent("minecraft:inventory")?.container;
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!cargo || !inventory) throw new Error("货仓或背包暂不可读，已保留原机和物品。");
  const occupied = [], empty = [];
  for (let i = 0; i < cargo.size; i++) if (cargo.getItem(i)) occupied.push(i);
  for (let i = 0; i < inventory.size; i++) if (!inventory.getItem(i)) empty.push(i);
  if (occupied.length > empty.length) throw new Error(`召回需 ${occupied.length} 个空背包格，当前仅 ${empty.length} 格。原机和货物已保留，请先整理。`);
  if (occupied.length && typeof cargo.moveItem !== "function") throw new Error("当前版本不支持原物品安全转移，原机已保留，请先手动清空货仓。");
  // moveItem is a native move, not copy+delete. An interruption preserves each
  // stack in exactly one container, including lore, enchantments and custom data.
  for (let i = 0; i < occupied.length; i++) {
   if (inventory.getItem(empty[i])) throw new Error("背包空位已变化，剩余货物留在原机。");
   cargo.moveItem(occupied[i], empty[i], inventory);
  }
  for (let i = 0; i < cargo.size; i++) if (cargo.getItem(i)) throw new Error("部分货物尚未转移，原机已保留。");
  return true;
 }
}
