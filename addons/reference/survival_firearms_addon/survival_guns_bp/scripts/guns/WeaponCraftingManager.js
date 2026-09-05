import { GunRegistry } from "./GunRegistry.js";
import { GunDurabilityManager } from "./GunDurabilityManager.js";
import { AmmoManager } from "./AmmoManager.js";
import { ItemStack, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

/**
 * 生存枪械辅助菜单。正式制造全部由原版工作台配方完成，本类不再扣料
 * 或直接制造枪械，只保留配方说明与开发测试工具。
 */
export class WeaponCraftingManager {
  static onRunTestSuite = null;

  static openWorkbenchUI(player) {
    const form = new ActionFormData()
      .title("§l§e【生存枪械指南】")
      .body("§7所有图纸、零件、弹药和枪械都在原版工作台合成。\n§f九张纸 = 1 个装订纸束；需要大量铁的配方使用铁块。")
      .button("§l§b📖 查看配方原则§r\n§8打开简要说明", "textures/items/blueprint_paper")
      .button("§l§a🧪 靶场与测试工具§r\n§8仅供开发验证", "textures/items/gun_barrel");

    form.show(player).then((res) => system.run(() => {
      if (res.canceled) return;
      if (res.selection === 0) this.showRecipeGuide(player);
      if (res.selection === 1) this.openTestingMenu(player);
    })).catch(() => {});
  }

  static showRecipeGuide(player) {
    player.sendMessage("§l§e[枪械配方]§r §f先在原版工作台用 9 张纸压制装订纸束，再合成对应图纸。");
    player.sendMessage("§7枪管：铁块 + 铜锭；机械零件：铁块 + 红石 + 拉杆；聚合物：煤炭块 + 黏液球。");
    player.sendMessage("§7将图纸、枪管、机械零件、铁块及枪托材料放入工作台即可制造枪械；完整形状可在配方书查看。");
  }

  static openTestingMenu(player) {
    const form = new ActionFormData()
      .title("§l§a【靶场与测试工具】")
      .body("§7以下功能仅用于验证 Addon：")
      .button("§l§e🎯 生成 DPS 靶人 (5000 HP)")
      .button("§l§4🧟 生成变异感染者 (500 HP)")
      .button("§l§b⚡ 运行自动化测试套件")
      .button("§l§d🎁 领取全套测试物资");

    form.show(player).then((res) => system.run(() => {
      if (res.canceled) return;
      if (res.selection === 0) {
        try {
          const loc = player.location;
          player.dimension.spawnEntity("survival:damage_dummy", { x: loc.x + 2, y: loc.y, z: loc.z });
          player.sendMessage("§a✔ 已生成 5000 HP 测试靶人。");
        } catch (error) { player.sendMessage(`§c生成失败: ${error}`); }
      } else if (res.selection === 1) {
        try {
          const loc = player.location;
          player.dimension.spawnEntity("survival:test_infected", { x: loc.x + 3, y: loc.y, z: loc.z });
          player.sendMessage("§a✔ 已生成 500 HP 变异感染者。");
        } catch (error) { player.sendMessage(`§c生成失败: ${error}`); }
      } else if (res.selection === 2 && typeof this.onRunTestSuite === "function") {
        this.onRunTestSuite(player);
      } else if (res.selection === 3) {
        this.giveDevKit(player);
      }
    })).catch(() => {});
  }

  static giveDevKit(player) {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv?.container) return;

    for (const gun of GunRegistry.getAllGuns()) {
      const item = new ItemStack(gun.id, 1);
      GunDurabilityManager.setDurability(item, gun, gun.durabilityMax);
      AmmoManager.setMagazineAmmo(item, gun, gun.magazineSize);
      inv.container.addItem(item);
    }

    for (const ammoId of ["survival:ammo_45", "survival:ammo_762", "survival:ammo_9mm", "survival:ammo_12g"]) {
      inv.container.addItem(new ItemStack(ammoId, 64));
    }
    for (const blueprintId of ["survival:blueprint_m1911", "survival:blueprint_akm", "survival:blueprint_mp5", "survival:blueprint_m870"]) {
      inv.container.addItem(new ItemStack(blueprintId, 2));
    }
    for (const materialId of ["survival:paper_bundle", "survival:mechanical_parts", "survival:polymer", "survival:gun_barrel"]) {
      inv.container.addItem(new ItemStack(materialId, 16));
    }
    player.sendMessage("§a✔ 已发放原创四枪测试物资。正式游戏请使用原版工作台配方。");
  }
}
