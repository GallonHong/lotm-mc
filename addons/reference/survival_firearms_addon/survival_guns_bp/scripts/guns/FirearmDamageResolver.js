/**
 * 枪械伤害结算器 (FirearmDamageResolver)
 * 核心设计：
 * 1. 彻底绕过 Minecraft 原版 applyDamage 受伤无敌帧 (Invulnerability Cooldown)
 * 2. 保证 600 RPM (AKM)、900 RPM (MP5) 能够高频无损连击
 * 3. 距离衰减计算 (Distance Falloff)
 * 4. PvE / PvP 伤害分级与爆头 (Headshot) 加成
 * 5. 实体致命击杀与击杀归属追踪 (Kill Attribution)
 */
export class FirearmDamageResolver {
  // 累计伤害记录 (可供测试套件与 DPS 统计)
  static #damageLogs = [];

  /**
   * 执行枪械伤害结算
   * @param {import("@minecraft/server").Player} attacker 射击者
   * @param {import("@minecraft/server").Entity} target 受击实体
   * @param {object} gunDef 枪械配置
   * @param {object} hitResult 命中信息 (包含 distance, hitZone, hitLocation 等)
   * @returns {object} 伤害结果 { actualDamage, nextHealth, isDead }
   */
  static applyDamage(attacker, target, gunDef, hitResult) {
    if (!target || !target.isValid()) {
      return { actualDamage: 0, nextHealth: 0, isDead: false };
    }

    const isPvP = target.typeId === "minecraft:player";
    const baseDamage = isPvP ? (gunDef.damagePvp ?? (gunDef.damage * 0.65)) : gunDef.damage;

    // 1. 距离衰减计算 (超出射程 50% 后线性衰减至 40%)
    let distanceFactor = 1.0;
    const distance = hitResult.distance ?? 0;
    const maxRange = gunDef.range ?? 30;
    const halfRange = maxRange * 0.5;

    if (distance > halfRange) {
      const overRatio = Math.min(1.0, (distance - halfRange) / (maxRange - halfRange));
      distanceFactor = 1.0 - overRatio * 0.6; // 最远衰减至 40% 伤害
    }

    // 2. 部位加成 (头部 1.5x 爆头伤害)
    let zoneMultiplier = 1.0;
    const isHeadshot = hitResult.hitZone === "head";
    if (isHeadshot) {
      zoneMultiplier = 1.5;
    }

    // 3. 护甲减伤。读取失败时按 0 护甲处理，避免阻断射击主流程。
    let totalArmor = 0;
    try {
      const equippable = target.getComponent("minecraft:equippable");
      totalArmor = Number(equippable?.totalArmor) || 0;
    } catch {}
    const armorFactor = 1.0 - Math.min(0.8, Math.max(0, totalArmor) * 0.04);

    // 4. 计算最终伤害
    const calculatedDamage = Math.max(1, Math.round(baseDamage * distanceFactor * zoneMultiplier * armorFactor));

    // 5. 读取与直接修改目标生命组件 (绕过无敌帧)
    const healthComp = target.getComponent("minecraft:health");
    if (!healthComp) {
      return { actualDamage: 0, nextHealth: 0, isDead: false };
    }

    const currentHealth = healthComp.currentValue;
    const nextHealth = Math.max(0, currentHealth - calculatedDamage);

    // 6. 执行生命值扣除与死亡结算
    if (nextHealth > 0) {
      // 目标存活：直接设置生命值，0 延迟无敌帧
      healthComp.setCurrentValue(nextHealth);
    } else {
      // 目标致命：通过 applyDamage 或 kill 触发原版掉落与击杀事件
      try {
        target.applyDamage(10000, {
          damagingEntity: attacker,
          cause: "entityAttack"
        });
      } catch {}
      // 某些构建会让致命 applyDamage 也命中原版无敌帧；再次检查并强制归零。
      try {
        if (target.isValid() && healthComp.currentValue > 0) healthComp.setCurrentValue(0);
      } catch {
        try { target.kill(); } catch {}
      }
    }

    // 7. 记录日志供测试校验
    const record = {
      attackerId: attacker ? attacker.id : "system",
      targetId: target.id,
      targetType: target.typeId,
      damage: calculatedDamage,
      previousHealth: currentHealth,
      nextHealth: nextHealth,
      isDead: nextHealth <= 0,
      isHeadshot,
      armor: totalArmor,
      timestamp: Date.now()
    };
    this.#damageLogs.push(record);
    if (this.#damageLogs.length > 500) {
      this.#damageLogs.shift();
    }

    return {
      actualDamage: calculatedDamage,
      nextHealth: nextHealth,
      isDead: nextHealth <= 0
    };
  }

  static getRecentLogs(count = 20) {
    return this.#damageLogs.slice(-count);
  }

  static clearLogs() {
    this.#damageLogs = [];
  }
}
