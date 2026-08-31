import { ItemStack } from "@minecraft/server";

export const GUN_CONFIGS = {
  "apex:ak47": {
    id: "apex:ak47",
    ammoId: "apex:ammo_762",
    name: "AK-47",
    caliberName: "7.62×39mm",
    magSize: 30,
    baseDamage: 22,
    headshotMultiplier: 2.0,
    armorPiercing: 0.35,
    maxRange: 64,
    spreadStand: 0.018,
    spreadSneak: 0.006,
    reloadSeconds: 2.0,
    burstCount: 3,
    isExplosive: false
  },
  "apex:m82": {
    id: "apex:m82",
    ammoId: "apex:ammo_50cal",
    name: "M82A1",
    caliberName: ".50 BMG (12.7mm)",
    magSize: 5,
    baseDamage: 55,
    headshotMultiplier: 2.5,
    armorPiercing: 0.60,
    maxRange: 64,
    spreadStand: 0.006,
    spreadSneak: 0.001,
    reloadSeconds: 2.5,
    burstCount: 1,
    isExplosive: true,
    heChance: 0.20, // 20% 恶魂火球级高爆烈焰弹
    heRadius: 3.5,
    heSplashDamage: 30
  }
};

export const AK47_CONFIG = GUN_CONFIGS["apex:ak47"];
export const M82_CONFIG = GUN_CONFIGS["apex:m82"];

export class AmmoSystem {
  static getGunConfig(typeId) {
    return GUN_CONFIGS[typeId] || null;
  }

  /**
   * 获取当前手持武器的弹匣内弹药数量 (从 Lore 解析或默认满弹)
   */
  static getMagazineAmmo(item) {
    if (!item) return 0;
    const config = this.getGunConfig(item.typeId);
    if (!config) return 0;

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
    return config.magSize;
  }

  /**
   * 更新武器弹药 Lore 并写回物品
   */
  static setMagazineAmmo(item, ammoCount) {
    if (!item) return;
    const config = this.getGunConfig(item.typeId);
    if (!config) return;

    const count = Math.max(0, Math.min(config.magSize, ammoCount));
    const barFill = Math.round((count / config.magSize) * 10);
    const bar = "§a" + "|".repeat(barFill) + "§7" + "|".repeat(10 - barFill);
    
    item.setLore([
      `§7口径: §f${config.caliberName}`,
      `§7弹匣: [${bar}§7] §e${count}§7/§f${config.magSize}`,
      `§8Ammo:${count}/${config.magSize}`
    ]);
  }

  /**
   * 统计背包中指定弹药的备弹总数
   */
  static countReserveAmmo(player, ammoId) {
    if (!player || !ammoId) return 0;
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return 0;

    let total = 0;
    for (let i = 0; i < inv.container.size; i++) {
      const item = inv.container.getItem(i);
      if (item && item.typeId === ammoId) {
        total += item.amount;
      }
    }
    return total;
  }

  /**
   * 执行原子换弹事务
   */
  static performReload(player) {
    if (!player) return { success: false, reason: "无效玩家" };
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return { success: false, reason: "背包不可用" };

    const selectedSlot = player.selectedSlotIndex;
    const mainHandItem = inv.container.getItem(selectedSlot);
    if (!mainHandItem) return { success: false, reason: "主手未持有武器" };

    const config = this.getGunConfig(mainHandItem.typeId);
    if (!config) return { success: false, reason: "非 Apex 系列枪械" };

    const currentAmmo = this.getMagazineAmmo(mainHandItem);
    if (currentAmmo >= config.magSize) {
      return { success: false, reason: "弹匣已满，无需换弹" };
    }

    const needed = config.magSize - currentAmmo;
    const totalReserve = this.countReserveAmmo(player, config.ammoId);
    if (totalReserve <= 0) {
      return { success: false, reason: `背包无 ${config.caliberName} 备弹` };
    }

    const reloadAmount = Math.min(needed, totalReserve);

    // 扣除备弹
    let remainingToDeduct = reloadAmount;
    for (let i = 0; i < inv.container.size; i++) {
      if (remainingToDeduct <= 0) break;
      const item = inv.container.getItem(i);
      if (item && item.typeId === config.ammoId) {
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
      reserveLeft: totalReserve - reloadAmount,
      config
    };
  }
}
