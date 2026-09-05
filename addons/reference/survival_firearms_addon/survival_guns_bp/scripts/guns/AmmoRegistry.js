/**
 * MVP 弹药注册表。弹匣状态由 AmmoManager 写入枪械物品动态属性，
 * 这里仅维护合法弹药类型及其展示信息。
 */
export class AmmoRegistry {
  static #ammoTypes = new Map();

  static init() {
    this.#ammoTypes.clear();
    this.register("survival:ammo_45", { name: ".45 ACP", maxStack: 64 });
    this.register("survival:ammo_762", { name: "7.62x39mm", maxStack: 64 });
    this.register("survival:ammo_9mm", { name: "9x19mm", maxStack: 64 });
    this.register("survival:ammo_12g", { name: "12 Gauge", maxStack: 64 });
  }

  static register(id, definition) {
    if (!id || !definition) throw new Error("Invalid ammo definition");
    this.#ammoTypes.set(id, Object.freeze({ id, ...definition }));
  }

  static get(id) {
    return this.#ammoTypes.get(id) || null;
  }

  static has(id) {
    return this.#ammoTypes.has(id);
  }

  static getAll() {
    return Array.from(this.#ammoTypes.values());
  }
}

AmmoRegistry.init();
