import { GunRegistry } from "./GunRegistry.js";
import { GunDurabilityManager } from "./GunDurabilityManager.js";
import { AmmoManager } from "./AmmoManager.js";
import { BlueprintManager } from "./BlueprintManager.js";
import { ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

/**
 * 武器制造管理器 (WeaponCraftingManager)
 * 核心要求：
 * 1. 严格事务性校验：材料充足且背包有空位时才扣除，否则 0 损耗完全回滚
 * 2. 严格消耗 1 张对应图纸 + 制造材料 -> 产出 1 把满耐久全新武器
 * 3. 统一提供可视化 Form 菜单
 */
export class WeaponCraftingManager {
  static onRunTestSuite = null; // 由外部或 main 注入测试运行函数

  /**
   * 检查玩家是否满足武器制造材料 (包含 1 张图纸)
   */
  static checkCraftable(player, bpDef) {
    if (!player || !bpDef) return { canCraft: false, missing: [] };
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return { canCraft: false, missing: ["背包不可用"] };

    const missing = [];
    for (const req of bpDef.craftingRecipe) {
      let count = 0;
      for (let i = 0; i < inv.container.size; i++) {
        const item = inv.container.getItem(i);
        if (item && item.typeId === req.item) {
          count += item.amount;
        }
      }
      if (count < req.count) {
        missing.push(`${req.name} (${count}/${req.count})`);
      }
    }

    return {
      canCraft: missing.length === 0,
      missing
    };
  }

  /**
   * 执行武器制造 (事务性操作)
   */
  static craftWeapon(player, blueprintId) {
    const bpDef = GunRegistry.getBlueprint(blueprintId);
    if (!bpDef) {
      return { success: false, reason: "无效的图纸定义" };
    }

    const gunDef = GunRegistry.getGun(bpDef.weaponId);
    if (!gunDef) {
      return { success: false, reason: "未找到对应的武器配置" };
    }

    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) {
      return { success: false, reason: "无法访问玩家背包" };
    }

    // 1. 事务预检：材料是否全部充足
    const check = this.checkCraftable(player, bpDef);
    if (!check.canCraft) {
      return {
        success: false,
        reason: `材料不足：${check.missing.join(", ")}`
      };
    }

    // 2. 事务预检：背包是否有空位接收新枪
    let emptySlot = -1;
    for (let i = 0; i < inv.container.size; i++) {
      if (!inv.container.getItem(i)) {
        emptySlot = i;
        break;
      }
    }
    if (emptySlot === -1) {
      return { success: false, reason: "背包空间已满，请清理至少 1 个空位" };
    }

    // 3. 执行原子扣除 (扣除 1 张图纸 + 制造材料)
    for (const req of bpDef.craftingRecipe) {
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

    // 4. 创建满耐久、满弹匣的全新枪械
    const weaponItem = new ItemStack(gunDef.id, 1);
    GunDurabilityManager.setDurability(weaponItem, gunDef, gunDef.durabilityMax);
    AmmoManager.setMagazineAmmo(weaponItem, gunDef, gunDef.magazineSize);

    // 发放至空槽位
    inv.container.setItem(emptySlot, weaponItem);

    // 播放制造成功铁砧音效
    try {
      player.playSound("random.anvil_use", { location: player.location, volume: 1.0, pitch: 1.0 });
    } catch {}

    return {
      success: true,
      weapon: gunDef,
      blueprint: bpDef
    };
  }

  /**
   * 打开总工作台 UI 界面
   */
  static openWorkbenchUI(player) {
    const form = new ActionFormData()
      .title("§l§e【末日枪械工作台】")
      .body("§7请选择要执行的操作：\n§e规则：1张图纸 + 1套材料 = 1把枪 (制造后图纸消耗)")
      .button("§l§6🔫 武器制造终端§r\n§8消耗1张图纸与材料制造武器", "textures/items/akm")
      .button("§l§b📜 图纸测绘研究§r\n§8消耗残页与数据合成新图纸", "textures/items/blueprint_paper")
      .button("§l§a🧪 靶场与测试工具§r\n§8生成测试假人或运行自动测试", "textures/items/gun_barrel");

    form.show(player).then(res => {
      if (res.canceled) return;
      if (res.selection === 0) {
        this.openCraftingMenu(player);
      } else if (res.selection === 1) {
        this.openBlueprintSynthesisMenu(player);
      } else if (res.selection === 2) {
        this.openTestingMenu(player);
      }
    }).catch(() => {});
  }

  /**
   * 武器制造菜单
   */
  static openCraftingMenu(player) {
    const bps = GunRegistry.getAllBlueprints();
    const form = new ActionFormData()
      .title("§l§6【武器制造终端】")
      .body("§7选择要制造的武器 (需消耗对应 1 张图纸)：");

    for (const bp of bps) {
      const gunDef = GunRegistry.getGun(bp.weaponId);
      const check = this.checkCraftable(player, bp);
      const status = check.canCraft ? "§a[可制造]" : "§c[材料不足]";
      form.button(`${gunDef?.displayName || bp.name}\n${status}`, `textures/items/${gunDef?.name?.toLowerCase() || "akm"}`);
    }

    form.show(player).then(res => {
      if (res.canceled) {
        this.openWorkbenchUI(player);
        return;
      }
      const selectedBp = bps[res.selection];
      if (!selectedBp) return;

      const result = this.craftWeapon(player, selectedBp.id);
      if (result.success) {
        player.sendMessage(`§a✔ 成功消耗 1 张图纸与材料，制造了 ${result.weapon.displayName}！`);
      } else {
        player.sendMessage(`§c✖ 制造失败：${result.reason}`);
      }
    }).catch(() => {});
  }

  /**
   * 图纸测绘研究菜单
   */
  static openBlueprintSynthesisMenu(player) {
    const bps = GunRegistry.getAllBlueprints().filter(bp => bp.playerCraftable);
    const form = new ActionFormData()
      .title("§l§b【图纸测绘研究】")
      .body("§7测绘研究新的枪械图纸 (一次性材料)：");

    for (const bp of bps) {
      const canSyn = BlueprintManager.canSynthesize(player, bp);
      const status = canSyn ? "§a[可测绘]" : "§c[残页/数据不足]";
      form.button(`§l${bp.name}\n${status}`, `textures/items/${bp.id.replace("survival:", "")}`);
    }

    form.show(player).then(res => {
      if (res.canceled) {
        this.openWorkbenchUI(player);
        return;
      }
      const selectedBp = bps[res.selection];
      if (!selectedBp) return;

      const result = BlueprintManager.synthesize(player, selectedBp.id);
      if (result.success) {
        player.sendMessage(`§a✔ 成功测绘获得 1 张 ${result.blueprint.name}！`);
      } else {
        player.sendMessage(`§c✖ 测绘失败：${result.reason}`);
      }
    }).catch(() => {});
  }

  /**
   * 靶场测试菜单
   */
  static openTestingMenu(player) {
    const form = new ActionFormData()
      .title("§l§a【靶场与测试工具】")
      .body("§7选择要执行的测试操作：")
      .button("§l§e🎯 生成 DPS 靶人 (5000 HP)\n§8用于射速与伤害测试")
      .button("§l§4🧟 生成变异感染者 (500 HP)\n§8用于实战射击测试")
      .button("§l§b⚡ 运行自动化测试套件\n§8验证射速 ≤2% 误差与无敌帧穿透")
      .button("§l§d🎁 领取全套武器与弹药\n§8开发者快捷补给");

    form.show(player).then(res => {
      if (res.canceled) {
        this.openWorkbenchUI(player);
        return;
      }
      if (res.selection === 0) {
        try {
          const dim = player.dimension;
          const loc = player.location;
          dim.spawnEntity("survival:damage_dummy", { x: loc.x + 2, y: loc.y, z: loc.z });
          player.sendMessage("§a✔ 已在身旁生成 5000 HP 测试靶人！");
        } catch (e) {
          player.sendMessage(`§c生成失败: ${e}`);
        }
      } else if (res.selection === 1) {
        try {
          const dim = player.dimension;
          const loc = player.location;
          dim.spawnEntity("survival:test_infected", { x: loc.x + 3, y: loc.y, z: loc.z });
          player.sendMessage("§a✔ 已在身旁生成 500 HP 变异感染者！");
        } catch (e) {
          player.sendMessage(`§c生成失败: ${e}`);
        }
      } else if (res.selection === 2) {
        if (typeof this.onRunTestSuite === "function") {
          this.onRunTestSuite(player);
        }
      } else if (res.selection === 3) {
        this.giveDevKit(player);
      }
    }).catch(() => {});
  }

  static giveDevKit(player) {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return;

    for (const gun of GunRegistry.getAllGuns()) {
      const item = new ItemStack(gun.id, 1);
      GunDurabilityManager.setDurability(item, gun, gun.durabilityMax);
      AmmoManager.setMagazineAmmo(item, gun, gun.magazineSize);
      inv.container.addItem(item);
    }

    inv.container.addItem(new ItemStack("survival:ammo_45", 64));
    inv.container.addItem(new ItemStack("survival:ammo_762", 64));
    inv.container.addItem(new ItemStack("survival:ammo_9mm", 64));
    inv.container.addItem(new ItemStack("survival:ammo_12g", 64));

    inv.container.addItem(new ItemStack("survival:blueprint_m1911", 2));
    inv.container.addItem(new ItemStack("survival:blueprint_akm", 2));
    inv.container.addItem(new ItemStack("survival:steel_ingot", 64));
    inv.container.addItem(new ItemStack("survival:mechanical_parts", 64));
    inv.container.addItem(new ItemStack("survival:polymer", 64));
    inv.container.addItem(new ItemStack("survival:gun_barrel", 16));

    player.sendMessage("§a✔ 已发放全套枪械、弹药、图纸与制造材料！");
  }
}
