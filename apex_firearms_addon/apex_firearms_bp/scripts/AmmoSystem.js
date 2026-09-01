import { ItemStack } from "@minecraft/server";

export const GUN_CONFIGS = {
  "apex:ak47": {
    id: "apex:ak47",
    ammoId: "apex:ammo_762",
    name: "AK-47",
    caliberName: "7.62×39mm",
    magSize: 30,
    baseDamage: 6,
    headshotMultiplier: 2.0,
    armorPiercing: 0.35,
    maxRange: 64,
    spreadStand: 0.018,
    spreadSneak: 0.006,
    reloadSeconds: 2.0,
    burstCount: 3,
    shotIntervalTicks: 11, // 0.55s 射击间隔
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
    shotIntervalTicks: 36, // 1.8s 重狙拉栓后摇
    isExplosive: true,
    heChance: 0.20,
    heRadius: 3.5,
    heSplashDamage: 30,
    heBreaksBlocks: false,
    heCausesFire: true
  },
  "apex:vector": {
    id: "apex:vector",
    ammoId: "apex:ammo_45acp",
    name: "Vector .45",
    caliberName: ".45 ACP",
    magSize: 50,
    baseDamage: 5,
    headshotMultiplier: 2.0,
    armorPiercing: 0.30,
    maxRange: 50,
    spreadStand: 0.022,
    spreadSneak: 0.008,
    reloadSeconds: 2.0,
    burstCount: 2,
    shotIntervalTicks: 7,  // 0.35s 点射间隔
    hasSkill: true,
    skillCooldownSec: 30,
    skillName: "暴走狂潮"
  },
  "apex:mgl": {
    id: "apex:mgl",
    ammoId: "apex:ammo_40mm",
    name: "M32 榴弹炮",
    caliberName: "40mm 破片榴弹",
    magSize: 6,
    baseDamage: 20,
    headshotMultiplier: 1.5,
    armorPiercing: 0.50,
    maxRange: 50,
    spreadStand: 0.015,
    spreadSneak: 0.005,
    reloadSeconds: 3.0,
    burstCount: 1,
    shotIntervalTicks: 24, // 1.2s 榴弹转轮复位间隔
    isExplosive: true,
    heChance: 1.0,
    heRadius: 5.5,
    heSplashDamage: 40,
    heBreaksBlocks: false,
    heCausesFire: false
  },
  "apex:arc_emitter": {
    id: "apex:arc_emitter",
    ammoId: "apex:ammo_battery",
    name: "特斯拉电弧枪",
    caliberName: "聚能微型电池",
    magSize: 20,
    baseDamage: 24,
    headshotMultiplier: 1.5,
    armorPiercing: 1.0,
    maxRange: 32,
    chainRadius: 7.0,
    maxChains: 5,
    decayRate: 0.25,
    reloadSeconds: 2.0,
    burstCount: 1,
    shotIntervalTicks: 16, // 0.8s 等离子电容充能间隔
    isArcEmitter: true
  },
  "apex:shotgun": {
    id: "apex:shotgun",
    ammoId: "apex:ammo_12gauge",
    name: "圣盾霰弹枪",
    caliberName: "12 Gauge 鹿弹",
    magSize: 8,
    pelletCount: 8,
    minPelletDamage: 2,
    maxPelletDamage: 22,
    headshotMultiplier: 1.5,
    armorPiercing: 0.30,
    maxRange: 28,
    spreadStand: 0.055,
    spreadSneak: 0.035,
    reloadSeconds: 2.5,
    burstCount: 1,
    shotIntervalTicks: 20, // 1.0s 泵动上膛间隔
    isShotgun: true
  }
};

export const AK47_CONFIG = GUN_CONFIGS["apex:ak47"];
export const M82_CONFIG = GUN_CONFIGS["apex:m82"];
export const VECTOR_CONFIG = GUN_CONFIGS["apex:vector"];
export const MGL_CONFIG = GUN_CONFIGS["apex:mgl"];
export const ARC_CONFIG = GUN_CONFIGS["apex:arc_emitter"];
export const SHOTGUN_CONFIG = GUN_CONFIGS["apex:shotgun"];

export class AmmoSystem {
  static getGunConfig(itemId) {
    return GUN_CONFIGS[itemId] || null;
  }

  static getMagazineAmmo(itemStack) {
    if (!itemStack) return 0;
    try {
      const lore = itemStack.getLore();
      for (const line of lore) {
        if (line.startsWith("§7弹药: §f")) {
          const match = line.match(/§7弹药: §f(\d+)\//);
          if (match && match[1]) {
            return parseInt(match[1], 10);
          }
        }
      }
    } catch (e) {}
    const config = this.getGunConfig(itemStack.typeId);
    return config ? config.magSize : 0;
  }

  static setMagazineAmmo(itemStack, count) {
    if (!itemStack) return;
    const config = this.getGunConfig(itemStack.typeId);
    if (!config) return;

    const clampedCount = Math.max(0, Math.min(count, config.magSize));
    let skillNote = "";
    if (config.hasSkill) {
      skillNote = `\n§d⚡ 潜行释放: 【${config.skillName}】(5s无限子弹)`;
    } else if (config.isArcEmitter) {
      skillNote = `\n§b⚡ 连锁闪电: 7m范围递减跳跃 (穿透真伤)`;
    } else if (config.isShotgun) {
      skillNote = `\n§e🛡️ 核心被动: 护盾共鸣 (单丸 2~22 HP)`;
    } else if (config.isExplosive && config.id === "apex:m82") {
      skillNote = `\n§c💥 核心被动: 20% 恶魂烈焰高爆弹`;
    } else if (config.isExplosive && config.id === "apex:mgl") {
      skillNote = `\n§6💥 核心机制: 40mm 抛物线高爆 (0地形破坏)`;
    }

    const newLore = [
      `§7口径: §e${config.caliberName}`,
      `§7弹药: §f${clampedCount}§7/§e${config.magSize}`,
      `§7换弹时间: §f${config.reloadSeconds}s | 射程: §f${config.maxRange}m${skillNote}`
    ];

    try {
      itemStack.setLore(newLore);
    } catch (e) {
      console.warn(`[ApexFirearms] Failed to set lore on gun item: ${e}`);
    }
  }

  static countReserveAmmo(player, ammoId) {
    if (!player || !player.isValid()) return 0;
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return 0;

    let total = 0;
    const size = inv.container.size;
    for (let i = 0; i < size; i++) {
      const item = inv.container.getItem(i);
      if (item && item.typeId === ammoId) {
        total += item.amount;
      }
    }
    return total;
  }

  static consumeReserveAmmo(player, ammoId, amountNeeded) {
    if (!player || !player.isValid() || amountNeeded <= 0) return 0;
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return 0;

    let consumed = 0;
    const size = inv.container.size;

    for (let i = 0; i < size && consumed < amountNeeded; i++) {
      const item = inv.container.getItem(i);
      if (item && item.typeId === ammoId) {
        const take = Math.min(item.amount, amountNeeded - consumed);
        consumed += take;
        if (item.amount - take <= 0) {
          inv.container.setItem(i, undefined);
        } else {
          item.amount -= take;
          inv.container.setItem(i, item);
        }
      }
    }
    return consumed;
  }
}
