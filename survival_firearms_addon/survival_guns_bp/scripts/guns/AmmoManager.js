import { GunDurabilityManager } from "./GunDurabilityManager.js";

/**
 * 弹药与弹匣管理器 (AmmoManager)
 * 职责：
 * 1. 维护枪械当前弹匣存弹量 (服务端权威)
 * 2. 检索并消耗玩家背包中的备弹
 * 3. 与耐久度管理器协同更新物品 Lore 与动态属性
 */
export class AmmoManager {
  static getMagazineAmmo(itemStack, gunDef) {
    if (!itemStack || !gunDef) return 0;
    try {
      const val = itemStack.getDynamicProperty("gun:ammo");
      if (typeof val === "number") {
        return Math.max(0, Math.min(gunDef.magazineSize, val));
      }
    } catch {}

    // 若无属性，解析 Lore
    const lore = itemStack.getLore();
    for (const line of lore) {
      const match = line.match(/弹匣容量:\s*§[a-z0-9](\d+)\s*\/\s*§[a-z0-9](\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // 默认满弹匣
    return gunDef.magazineSize;
  }

  static setMagazineAmmo(itemStack, gunDef, ammo) {
    if (!itemStack || !gunDef) return;
    const clamped = Math.max(0, Math.min(gunDef.magazineSize, ammo));
    try {
      itemStack.setDynamicProperty("gun:ammo", clamped);
    } catch {}

    const dura = GunDurabilityManager.getDurability(itemStack, gunDef);
    GunDurabilityManager.updateLore(itemStack, gunDef, dura);
  }

  static consumeMagazineAmmo(itemStack, gunDef, amount = 1) {
    const current = this.getMagazineAmmo(itemStack, gunDef);
    if (current < amount) return false;
    this.setMagazineAmmo(itemStack, gunDef, current - amount);
    return true;
  }

  /**
   * 统计玩家背包中的备弹总数
   */
  static countInventoryAmmo(player, ammoTypeId) {
    if (!player) return 0;
    let total = 0;
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return 0;

    for (let i = 0; i < inv.container.size; i++) {
      const item = inv.container.getItem(i);
      if (item && item.typeId === ammoTypeId) {
        total += item.amount;
      }
    }
    return total;
  }

  /**
   * 从玩家背包中扣除指定数量的备弹
   * @returns {number} 实际扣除的数量
   */
  static deductInventoryAmmo(player, ammoTypeId, neededAmount) {
    if (!player || neededAmount <= 0) return 0;
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return 0;

    let remaining = neededAmount;
    for (let i = 0; i < inv.container.size; i++) {
      const item = inv.container.getItem(i);
      if (item && item.typeId === ammoTypeId) {
        if (item.amount <= remaining) {
          remaining -= item.amount;
          inv.container.setItem(i, undefined);
        } else {
          item.amount -= remaining;
          inv.container.setItem(i, item);
          remaining = 0;
        }
        if (remaining <= 0) break;
      }
    }
    return neededAmount - remaining;
  }
}
