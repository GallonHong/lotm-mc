import { GunRegistry } from "./GunRegistry.js";
import { ItemStack } from "@minecraft/server";

/**
 * 图纸管理器 (BlueprintManager)
 * 职责：
 * 1. 严格执行“一次性制造材料”规则 (1 张图纸 + 1 套材料 = 1 把枪，制造后图纸销毁)
 * 2. 普通武器图纸允许玩家研究合成
 * 3. 预留高级与限定图纸架构 (支持 globalSupply, serialEnabled)
 */
export class BlueprintManager {
  /**
   * 检查玩家背包是否满足图纸合成材料
   */
  static canSynthesize(player, blueprintDef) {
    if (!player || !blueprintDef || !blueprintDef.playerCraftable) return false;
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return false;

    for (const req of blueprintDef.synthesisRecipe) {
      let count = 0;
      for (let i = 0; i < inv.container.size; i++) {
        const item = inv.container.getItem(i);
        if (item && item.typeId === req.item) {
          count += item.amount;
        }
      }
      if (count < req.count) return false;
    }
    return true;
  }

  /**
   * 执行图纸测绘研究合成 (原子事务)
   */
  static synthesize(player, blueprintId) {
    const bpDef = GunRegistry.getBlueprint(blueprintId);
    if (!bpDef || !bpDef.playerCraftable) {
      return { success: false, reason: "该图纸不存在或不可玩家合成" };
    }

    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) {
      return { success: false, reason: "无法访问玩家背包" };
    }

    // 1. 预检材料与空位
    if (!this.canSynthesize(player, bpDef)) {
      return { success: false, reason: "合成图纸所需残页或数据材料不足" };
    }

    let emptySlot = -1;
    for (let i = 0; i < inv.container.size; i++) {
      if (!inv.container.getItem(i)) {
        emptySlot = i;
        break;
      }
    }
    if (emptySlot === -1) {
      return { success: false, reason: "背包空间已满，无法接收图纸" };
    }

    // 2. 原子扣除材料
    for (const req of bpDef.synthesisRecipe) {
      let need = req.count;
      for (let i = 0; i < inv.container.size; i++) {
        const item = inv.container.getItem(i);
        if (item && item.typeId === req.item) {
          if (item.amount <= need) {
            need -= item.amount;
            inv.container.setItem(i, undefined);
          } else {
            item.amount -= need;
            inv.container.setItem(i, item);
            need = 0;
          }
          if (need <= 0) break;
        }
      }
    }

    // 3. 发放 1 张图纸
    const bpItem = new ItemStack(bpDef.id, 1);
    inv.container.setItem(emptySlot, bpItem);

    try {
      player.playSound("random.orb", { location: player.location, volume: 1.0, pitch: 1.2 });
    } catch {}

    return { success: true, blueprint: bpDef };
  }
}
