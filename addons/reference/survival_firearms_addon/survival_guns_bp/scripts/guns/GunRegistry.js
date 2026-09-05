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
        { item: "minecraft:redstone", count: 1, name: "红石粉" },
        { item: "minecraft:ink_sac", count: 2, name: "墨囊" },
        { item: "survival:paper_bundle", count: 1, name: "装订纸束" },
        { item: "minecraft:copper_ingot", count: 1, name: "铜锭" }
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
        { item: "minecraft:redstone", count: 3, name: "红石粉" },
        { item: "minecraft:copper_ingot", count: 2, name: "铜锭" },
        { item: "survival:paper_bundle", count: 1, name: "装订纸束" },
        { item: "minecraft:string", count: 1, name: "线" }
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
        { item: "minecraft:string", count: 1, name: "线" },
        { item: "minecraft:copper_ingot", count: 2, name: "铜锭" },
        { item: "survival:paper_bundle", count: 1, name: "装订纸束" },
        { item: "minecraft:redstone", count: 1, name: "红石粉" }
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
        { item: "minecraft:compass", count: 1, name: "指南针" },
        { item: "minecraft:redstone", count: 2, name: "红石粉" },
        { item: "survival:paper_bundle", count: 1, name: "装订纸束" },
        { item: "minecraft:iron_block", count: 1, name: "铁块" }
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
