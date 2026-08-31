import { ItemStack } from "@minecraft/server";

export const AK47_CONFIG = {
  id: "apex:ak47",
  ammoId: "apex:ammo_762",
  magSize: 30,
  baseDamage: 22,
  headshotMultiplier: 2.0,
  armorPiercing: 0.35,
  rpm: 600, // 10 rounds/sec, 2.0 ticks per shot in 20 TPS
  maxRange: 100,
  spreadStand: 0.018,
  spreadSneak: 0.006,
  spreadMove: 0.035
};

export class AmmoSystem {
  /**
   * 获取当前手持武器的弹匣内弹药数量 (从 Lore 解析或默认满弹)
   */
  static getMagazineAmmo(item) {
    if (!item || item.typeId !== AK47_CONFIG.id) return 0;
    const lore = item.getLore();
    if (lore && lore.length > 0) {
      for (const line of lore) {
        const match = line.match(/Ammo:\s*(\d+)\s*\/\s*(\d+)/i);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }
    // 默认新物品满弹匣
    return AK47_CONFIG.magSize;
  }

  /**
   * 更新武器弹药 Lore 并写回物品
   */
  static setMagazineAmmo(item, ammoCount) {
    if (!item || item.typeId !== AK47_CONFIG.id) return;
    const count = Math.max(0, Math.min(AK47_CONFIG.magSize, ammoCount));
    const barFill = Math.round((count / AK47_CONFIG.magSize) * 15);
    const bar = "§a" + "|".repeat(barFill) + "§7" + "|".repeat(15 - barFill);
    
    item.setLore([
      `§7口径: §f7.62×39mm`,
      `§7弹匣: [${bar}§7] §e${count}§7/§f${AK47_CONFIG.magSize}`,
      `§8Ammo:${count}/${AK47_CONFIG.magSize}`
    ]);
  }

  /**
   * 统计背包中 7.62mm 备弹总数
   */
  static countReserveAmmo(player) {
    if (!player) return 0;
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return 0;

    let total = 0;
    for (let i = 0; i < inv.container.size; i++) {
      const item = inv.container.getItem(i);
      if (item && item.typeId === AK47_CONFIG.ammoId) {
        total += item.amount;
      }
    }
    return total;
  }

  /**
   * 执行原子换弹事务 (扣除所需备弹，装填满弹匣)
   */
  static performReload(player) {
    if (!player) return { success: false, reason: "无效玩家" };
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return { success: false, reason: "背包不可用" };

    const selectedSlot = player.selectedSlotIndex;
    const mainHandItem = inv.container.getItem(selectedSlot);
    if (!mainHandItem || mainHandItem.typeId !== AK47_CONFIG.id) {
      return { success: false, reason: "主手未持有 AK-47" };
    }

    const currentAmmo = this.getMagazineAmmo(mainHandItem);
    if (currentAmmo >= AK47_CONFIG.magSize) {
      return { success: false, reason: "弹匣已满，无需换弹" };
    }

    const needed = AK47_CONFIG.magSize - currentAmmo;
    const totalReserve = this.countReserveAmmo(player);
    if (totalReserve <= 0) {
      return { success: false, reason: "背包无 7.62mm 备弹" };
    }

    const reloadAmount = Math.min(needed, totalReserve);

    // 扣除备弹
    let remainingToDeduct = reloadAmount;
    for (let i = 0; i < inv.container.size; i++) {
      if (remainingToDeduct <= 0) break;
      const item = inv.container.getItem(i);
      if (item && item.typeId === AK47_CONFIG.ammoId) {
        if (item.amount <= remainingToDeduct) {
          remainingToDeduct -= item.amount;
          inv.container.setItem(i, undefined);
        } else {
          item.amount -= remainingToDeduct;
          inv.container.setItem(i, item);
          remainingToDeduct = 0;
        }
      }
    }

    // 更新手持枪械弹药
    const newAmmo = currentAmmo + reloadAmount;
    this.setMagazineAmmo(mainHandItem, newAmmo);
    inv.container.setItem(selectedSlot, mainHandItem);

    return {
      success: true,
      reloaded: reloadAmount,
      currentAmmo: newAmmo,
      reserveLeft: totalReserve - reloadAmount
    };
  }
}
