import { GunRegistry } from "./GunRegistry.js";
import { ItemStack } from "@minecraft/server";
import { InventoryTransaction } from "./InventoryTransaction.js";

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

    const emptySlot = InventoryTransaction.findEmptySlot(inv.container);
    if (emptySlot === -1) {
      return { success: false, reason: "背包空间已满，无法接收图纸" };
    }

    let bpItem;
    try {
      bpItem = new ItemStack(bpDef.id, 1);
    } catch {
      return { success: false, reason: "无法创建图纸物品，未扣除材料" };
    }
    if (!InventoryTransaction.commit(inv.container, bpDef.synthesisRecipe, bpItem, emptySlot)) {
      return { success: false, reason: "图纸合成事务失败，材料已回滚" };
    }

    try {
      player.playSound("random.orb", { location: player.location, volume: 1.0, pitch: 1.2 });
    } catch {}

    return { success: true, blueprint: bpDef };
  }
}
