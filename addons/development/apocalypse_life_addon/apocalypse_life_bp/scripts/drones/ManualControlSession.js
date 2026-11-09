import { participant } from "../pvp/PvpLifePolicy.js";
import { InputPermissionCategory as Permission, ItemStack } from "@minecraft/server";

// Only an EMPTY hotbar slot is ever written. Original ItemStacks never leave inventory.
export class ManualControlSession {
 static key = "ab_dr:manual_session:v1";
 static tokenKey = "ab_dr:control_token";
 static itemId = "ab_dr:drone_fire_control";
 static categories = [Permission.MoveForward, Permission.MoveBackward, Permission.MoveLeft, Permission.MoveRight, Permission.Jump];

 static read(player) {
  const raw = player.getDynamicProperty(this.key);
  return raw ? JSON.parse(raw) : null;
 }

 static begin(player) {
  if (this.read(player) && !this.recover(player)) throw new Error("上次遥控尚未恢复，请重试");
  if (!player.inputInfo || !player.inputPermissions?.setPermissionCategory) throw new Error("需要 Bedrock 1.21.80+ / Script API 1.18.0");
  if (!player.inputPermissions.isPermissionCategoryEnabled(Permission.Camera)) throw new Error("当前视角输入被其他系统禁用");
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) throw new Error("无法读取背包");
  let slot = -1;
  for (let i = 0; i < Math.min(9, inventory.size); i++) if (!inventory.getItem(i)) { slot = i; break; }
  if (slot < 0) throw new Error("请先腾出一个快捷栏空位，遥控不会替换任何原物品");
  const session = {
   token: `${player.id}:${Date.now()}:${Math.random()}`,
   slot, previousSlot: player.selectedSlotIndex,
   permissions: this.categories.map(category => [category, player.inputPermissions.isPermissionCategoryEnabled(category)])
  };
  // Persist BEFORE any mutation, so reload/disconnect can complete cleanup.
  player.setDynamicProperty(this.key, JSON.stringify(session));
  try {
   const controller = new ItemStack(this.itemId, 1);
   controller.setDynamicProperty(this.tokenKey, session.token);
   controller.lockMode = "slot";
   controller.keepOnDeath = true;
   inventory.setItem(slot, controller);
   player.selectedSlotIndex = slot;
   for (const category of this.categories) player.inputPermissions.setPermissionCategory(category, false);
   return session;
  } catch (error) {
   this.recover(player);
   throw error;
  }
 }

 static matches(item, session) {
  return item?.typeId === this.itemId && item.getDynamicProperty(this.tokenKey) === session?.token;
 }

 static held(player, session) {
  return player.selectedSlotIndex === session?.slot && this.matches(player.getComponent("minecraft:inventory")?.container?.getItem(session.slot), session);
 }

 static recover(player) {
  try {
   const session = this.read(player);
   if (!session) return true;
   player.camera.clear();
   // Restore FPV's directional/jump settings normally, while preserving the
   // core's independent Movement lock until revive, final respawn or cleanup.
   try {
    for (const [category, enabled] of session.permissions) player.inputPermissions.setPermissionCategory(category, enabled);
   } finally {
    if (participant(player) && (player.hasTag("pvp:downed") || player.hasTag("pvp:dead"))) {
     player.inputPermissions.movementEnabled = false;
    }
   }
   const inventory = player.getComponent("minecraft:inventory")?.container;
   if (!inventory) return false;
   for (let i = 0; i < inventory.size; i++) {
    if (this.matches(inventory.getItem(i), session)) inventory.setItem(i, undefined);
   }
   // A deliberate slot change must not be undone.
   if (player.selectedSlotIndex === session.slot) player.selectedSlotIndex = session.previousSlot;
   player.setDynamicProperty(this.key, undefined);
   return true;
  } catch (error) {
   console.warn(`[DroneControl] Recovery pending: ${error}`);
   return false;
  }
 }
}
