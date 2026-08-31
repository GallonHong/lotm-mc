import { M1911Definition } from "./definitions/m1911.js";
import { AKMDefinition } from "./definitions/akm.js";
import { MP5Definition } from "./definitions/mp5.js";
import { M870Definition } from "./definitions/m870.js";

/**
 * 枪械注册中心 (GunRegistry)
 * 统一管理所有枪械属性、弹药规格、图纸定义与制造配方
 */
export class GunRegistry {
  static #guns = new Map();
  static #blueprints = new Map();
  static #ammoTypes = new Map();

  static init() {
    this.#guns.clear();
    this.#blueprints.clear();
    this.#ammoTypes.clear();

    // 1. 注册 4 把核心 MVP 枪械
    this.registerGun(M1911Definition);
    this.registerGun(AKMDefinition);
    this.registerGun(MP5Definition);
    this.registerGun(M870Definition);

    // 2. 注册弹药种类
    this.registerAmmo("survival:ammo_45", { name: ".45 ACP", maxStack: 64 });
    this.registerAmmo("survival:ammo_762", { name: "7.62x39mm", maxStack: 64 });
    this.registerAmmo("survival:ammo_9mm", { name: "9x19mm", maxStack: 64 });
    this.registerAmmo("survival:ammo_12g", { name: "12 Gauge", maxStack: 64 });

    // 3. 注册图纸与制造配方 (严格一次性图纸规则)
    this.registerBlueprint({
      id: "survival:blueprint_m1911",
      weaponId: "survival:m1911",
      name: "M1911 手枪图纸",
      playerCraftable: true,
      consumedOnCraft: true,
      rarity: "basic",
      // 图纸合成材料
      synthesisRecipe: [
        { item: "survival:firearm_scrap", count: 8, name: "枪械残页/零件废料" },
        { item: "survival:mechanical_data", count: 4, name: "机械研究数据卡" },
        { item: "survival:blueprint_paper", count: 2, name: "工程图纸专用纸" }
      ],
      // 枪械制造材料
      craftingRecipe: [
        { item: "survival:blueprint_m1911", count: 1, name: "M1911图纸(一次性)" },
        { item: "survival:steel_ingot", count: 8, name: "精炼军用钢材" },
        { item: "survival:mechanical_parts", count: 4, name: "精密机械零件" },
        { item: "survival:gun_barrel", count: 1, name: "精锻枪管" }
      ]
    });

    this.registerBlueprint({
      id: "survival:blueprint_mp5",
      weaponId: "survival:mp5",
      name: "MP5 冲锋枪图纸",
      playerCraftable: true,
      consumedOnCraft: true,
      rarity: "normal",
      synthesisRecipe: [
        { item: "survival:firearm_scrap", count: 16, name: "枪械残页/零件废料" },
        { item: "survival:mechanical_data", count: 10, name: "机械研究数据卡" },
        { item: "survival:blueprint_paper", count: 3, name: "工程图纸专用纸" }
      ],
      craftingRecipe: [
        { item: "survival:blueprint_mp5", count: 1, name: "MP5图纸(一次性)" },
        { item: "survival:steel_ingot", count: 14, name: "精炼军用钢材" },
        { item: "survival:mechanical_parts", count: 8, name: "精密机械零件" },
        { item: "survival:polymer", count: 4, name: "高强度工程聚合物" },
        { item: "survival:gun_barrel", count: 1, name: "精锻枪管" }
      ]
    });

    this.registerBlueprint({
      id: "survival:blueprint_m870",
      weaponId: "survival:m870",
      name: "M870 霰弹枪图纸",
      playerCraftable: true,
      consumedOnCraft: true,
      rarity: "normal",
      synthesisRecipe: [
        { item: "survival:firearm_scrap", count: 16, name: "枪械残页/零件废料" },
        { item: "survival:mechanical_data", count: 10, name: "机械研究数据卡" },
        { item: "survival:blueprint_paper", count: 3, name: "工程图纸专用纸" }
      ],
      craftingRecipe: [
        { item: "survival:blueprint_m870", count: 1, name: "M870图纸(一次性)" },
        { item: "survival:steel_ingot", count: 16, name: "精炼军用钢材" },
        { item: "survival:mechanical_parts", count: 7, name: "精密机械零件" },
        { item: "survival:polymer", count: 6, name: "高强度工程聚合物" },
        { item: "survival:gun_barrel", count: 1, name: "精锻枪管" }
      ]
    });

    this.registerBlueprint({
      id: "survival:blueprint_akm",
      weaponId: "survival:akm",
      name: "AKM 突击步枪图纸",
      playerCraftable: true,
      consumedOnCraft: true,
      rarity: "advanced",
      synthesisRecipe: [
        { item: "survival:firearm_scrap", count: 24, name: "枪械残页/零件废料" },
        { item: "survival:mechanical_data", count: 18, name: "机械研究数据卡" },
        { item: "survival:gun_barrel", count: 1, name: "精锻枪管" },
        { item: "survival:blueprint_paper", count: 4, name: "工程图纸专用纸" }
      ],
      craftingRecipe: [
        { item: "survival:blueprint_akm", count: 1, name: "AKM图纸(一次性)" },
        { item: "survival:steel_ingot", count: 18, name: "精炼军用钢材" },
        { item: "survival:mechanical_parts", count: 12, name: "精密机械零件" },
        { item: "survival:polymer", count: 5, name: "高强度工程聚合物" },
        { item: "survival:gun_barrel", count: 1, name: "精锻枪管" }
      ]
    });
  }

  static registerGun(def) {
    this.#guns.set(def.id, Object.freeze({ ...def }));
  }

  static getGun(id) {
    return this.#guns.get(id) || null;
  }

  static isGun(id) {
    return this.#guns.has(id);
  }

  static getAllGuns() {
    return Array.from(this.#guns.values());
  }

  static registerAmmo(id, def) {
    this.#ammoTypes.set(id, def);
  }

  static isAmmo(id) {
    return this.#ammoTypes.has(id);
  }

  static registerBlueprint(bpDef) {
    this.#blueprints.set(bpDef.id, Object.freeze({ ...bpDef }));
  }

  static getBlueprint(id) {
    return this.#blueprints.get(id) || null;
  }

  static getBlueprintByWeapon(weaponId) {
    for (const bp of this.#blueprints.values()) {
      if (bp.weaponId === weaponId) return bp;
    }
    return null;
  }

  static getAllBlueprints() {
    return Array.from(this.#blueprints.values());
  }
}

// 自动执行初始注册
GunRegistry.init();
