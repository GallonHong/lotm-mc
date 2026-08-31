/**
 * 枪械耐久管理器 (GunDurabilityManager)
 * 职责：
 * 1. 独立追踪每把枪械的耐久度 (动态属性 + Lore 双重保障)
 * 2. 每次射击精准扣除耐久
 * 3. 耐久归零时判定武器损坏并阻止击发
 * 4. 耐久 < 20% 时提供预警
 */
export class GunDurabilityManager {
  static getDurability(itemStack, gunDef) {
    if (!itemStack || !gunDef) return 0;
    try {
      const propVal = itemStack.getDynamicProperty("gun:durability");
      if (typeof propVal === "number") {
        return Math.max(0, Math.min(gunDef.durabilityMax, propVal));
      }
    } catch {}

    // 若无动态属性，检查 Lore
    const lore = itemStack.getLore();
    for (const line of lore) {
      const match = line.match(/耐久度:\s*§[a-z0-9](\d+)\/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // 默认全新满耐久
    return gunDef.durabilityMax;
  }

  static setDurability(itemStack, gunDef, durability) {
    if (!itemStack || !gunDef) return;
    const clamped = Math.max(0, Math.min(gunDef.durabilityMax, durability));
    try {
      itemStack.setDynamicProperty("gun:durability", clamped);
    } catch {}

    // 同步刷新 Lore 文本
    this.updateLore(itemStack, gunDef, clamped);
  }

  static deductDurability(itemStack, gunDef, amount = 1) {
    const current = this.getDurability(itemStack, gunDef);
    const next = Math.max(0, current - amount);
    this.setDurability(itemStack, gunDef, next);
    return next;
  }

  static isBroken(itemStack, gunDef) {
    return this.getDurability(itemStack, gunDef) <= 0;
  }

  static isLowDurability(itemStack, gunDef) {
    const current = this.getDurability(itemStack, gunDef);
    return current > 0 && current / gunDef.durabilityMax <= 0.20;
  }

  static updateLore(itemStack, gunDef, currentDurability) {
    try {
      const currentAmmo = itemStack.getDynamicProperty("gun:ammo") ?? gunDef.magazineSize;
      const pct = Math.round((currentDurability / gunDef.durabilityMax) * 100);
      const color = currentDurability <= 0 ? "§4" : (pct <= 20 ? "§c" : "§a");

      const lore = [
        `§7枪械分类: §f${this.#getCategoryName(gunDef.category)}`,
        `§7弹匣容量: §b${currentAmmo} §7/ §f${gunDef.magazineSize}`,
        `§7耐久状态: ${color}${currentDurability}§7/§f${gunDef.durabilityMax} §8(${pct}%)`
      ];

      if (currentDurability <= 0) {
        lore.push("§4[已损坏 - 无法射击]");
      } else if (pct <= 20) {
        lore.push("§c[⚠ 耐久过低]");
      }

      itemStack.setLore(lore);
    } catch {}
  }

  static #getCategoryName(cat) {
    switch (cat) {
      case "pistol": return "半自动手枪";
      case "assault_rifle": return "突击步枪";
      case "smg": return "冲锋枪";
      case "shotgun": return "泵动霰弹枪";
      default: return "制式火器";
    }
  }
}
