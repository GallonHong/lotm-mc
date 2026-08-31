import { M1911Definition } from "./definitions/m1911.js";
import { AKMDefinition } from "./definitions/akm.js";
import { MP5Definition } from "./definitions/mp5.js";
import { M870Definition } from "./definitions/m870.js";
import { AmmoRegistry } from "./AmmoRegistry.js";
import { getGunAnimationProfile } from "./GunAnimationProfiles.js";

/**
 * 枪械注册中心 (GunRegistry)
 * 统一管理所有枪械属性、弹药规格、图纸定义与制造配方
 */
export class GunRegistry {
  static #guns = new Map();
  static #blueprints = new Map();

  static init() {
    this.#guns.clear();
    this.#blueprints.clear();
    AmmoRegistry.init();

    // 1. 注册 4 把核心 MVP 枪械
    this.registerGun(M1911Definition);
    this.registerGun(AKMDefinition);
    this.registerGun(MP5Definition);
    this.registerGun(M870Definition);

    // 2. 注册图纸与制造配方 (严格一次性图纸规则)
    this.registerBlueprint({
      id: "survival:blueprint_m1911",
      weaponId: "survival:m1911",
      name: "M1911 手枪图纸",
      playerCraftable: true,
      consumedOnCraft: true,
      rarity: "basic",
      // 图纸合成材料
      synthesisRecipe: [
        { item: "survival:basic_firearm_page", count: 8, name: "基础枪械残页" },
        { item: "survival:mechanical_data", count: 4, name: "机械研究数据卡" },
        { item: "minecraft:paper", count: 2, name: "纸" }
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
        { item: "survival:smg_page", count: 16, name: "冲锋枪残页" },
        { item: "survival:mechanical_data", count: 10, name: "机械研究数据卡" },
        { item: "minecraft:paper", count: 3, name: "纸" }
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
        { item: "survival:shotgun_page", count: 16, name: "霰弹枪残页" },
        { item: "survival:mechanical_data", count: 10, name: "机械研究数据卡" },
        { item: "minecraft:paper", count: 3, name: "纸" }
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
        { item: "survival:rifle_page", count: 24, name: "步枪残页" },
        { item: "survival:mechanical_data", count: 18, name: "机械研究数据卡" },
        { item: "survival:gun_structure_sample", count: 1, name: "枪械结构样本" },
        { item: "minecraft:paper", count: 4, name: "纸" }
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
    if (!def || !def.id || !def.ammoType) throw new Error("Invalid gun definition");
    if (def.rpm <= 0 || def.rpm > 1200) throw new Error(`RPM out of MVP range: ${def.id}`);
    if (!AmmoRegistry.has(def.ammoType)) throw new Error(`Unknown ammo type: ${def.ammoType}`);
    if (!getGunAnimationProfile(def.animationProfile)) throw new Error(`Unknown animation profile: ${def.animationProfile}`);
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
    AmmoRegistry.register(id, def);
  }

  static isAmmo(id) {
    return AmmoRegistry.has(id);
  }

  static getAmmo(id) {
    return AmmoRegistry.get(id);
  }

  static registerBlueprint(bpDef) {
    const normalized = {
      globalSupply: undefined,
      serialEnabled: false,
      ...bpDef,
      consumedOnCraft: true
    };
    this.#blueprints.set(normalized.id, Object.freeze(normalized));
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
