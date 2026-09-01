import { world, system, EntityDamageCause } from "@minecraft/server";

export class ShieldEngine {
  static #shieldBashCooldowns = new Map(); // playerId -> nextReadyTick

  /**
   * 检查玩家/实体是否装备了盾牌 (原版盾牌 或 重装反甲防暴盾)
   */
  static getEquippedShield(entity) {
    if (!entity || !entity.isValid()) return null;
    try {
      const equippable = entity.getComponent("minecraft:equippable");
      if (!equippable) return null;

      const offhand = equippable.getEquipment("Offhand") || equippable.getEquipment("offhand");
      if (offhand && (offhand.typeId === "minecraft:shield" || offhand.typeId === "apex:riot_shield")) {
        return { item: offhand, slot: "Offhand", isApexRiot: offhand.typeId === "apex:riot_shield" };
      }

      const mainhand = equippable.getEquipment("Mainhand") || equippable.getEquipment("mainhand");
      if (mainhand && (mainhand.typeId === "minecraft:shield" || mainhand.typeId === "apex:riot_shield")) {
        return { item: mainhand, slot: "Mainhand", isApexRiot: mainhand.typeId === "apex:riot_shield" };
      }
    } catch {}
    return null;
  }

  /**
   * 判定盾牌格挡与反甲反震结算 (支持原版盾牌与 Apex 战术反甲盾)
   */
  static checkBulletShieldBlock(attacker, target, incomingDamage, gunConfig) {
    if (!target || !target.isValid()) return { blocked: false, damage: incomingDamage };

    // 1. 检查是否持盾且处于潜行/举盾格挡状态
    const shieldInfo = this.getEquippedShield(target);
    if (!shieldInfo || !target.isSneaking) {
      return { blocked: false, damage: incomingDamage };
    }

    // 2. 判定格挡朝向角度 (目标是否正对来袭子弹 120° 扇形范围)
    if (attacker && attacker.isValid()) {
      const aLoc = attacker.location;
      const tLoc = target.location;

      const dx = aLoc.x - tLoc.x;
      const dz = aLoc.z - tLoc.z;
      const hDist = Math.hypot(dx, dz) || 1.0;
      const toAttackerX = dx / hDist;
      const toAttackerZ = dz / hDist;

      const tView = target.getViewDirection();
      const dot = toAttackerX * tView.x + toAttackerZ * tView.z;

      // 如果背对或偏角过大 (> 60° 偏角)，则无法格挡
      if (dot < 0.25) {
        return { blocked: false, damage: incomingDamage };
      }
    }

    // 3. 格挡成功视听特效与耐久消耗
    const dim = target.dimension;
    const tLoc = target.location;
    const blockSparkPos = { x: tLoc.x, y: tLoc.y + 1.2, z: tLoc.z };

    try {
      dim.playSound("item.shield.block", tLoc, { volume: 1.4, pitch: 1.0 });
      dim.playSound("apex.gun.hit_metal", tLoc, { volume: 1.2, pitch: 1.1 });
      dim.spawnParticle("minecraft:lava_particle", blockSparkPos);
      dim.spawnParticle("apex:arc_spark", blockSparkPos);
    } catch {}

    // 消耗盾牌耐久度
    try {
      const durComp = shieldInfo.item.getComponent("minecraft:durability");
      if (durComp) {
        durComp.damage = Math.min(durComp.maxDurability, durComp.damage + 1);
        const equippable = target.getComponent("minecraft:equippable");
        equippable?.setEquipment(shieldInfo.slot, shieldInfo.item);
      }
    } catch {}

    // 4. 特殊武器穿透与反甲结算
    if (shieldInfo.isApexRiot) {
      // ⭐ 【重装战术动能反甲盾】：100% 格挡所有实弹与近战，并反弹 50% 真实伤害与冲击波！
      let reflectedDmg = Math.max(2, Math.round(incomingDamage * 0.5));
      if (attacker && attacker.isValid() && attacker.id !== target.id) {
        try {
          attacker.applyDamage(reflectedDmg, {
            cause: EntityDamageCause.override,
            damagingEntity: target
          });

          // 施加反震击退与火花
          const aView = attacker.getViewDirection();
          attacker.applyKnockback(-aView.x, -aView.z, 0.6, 0.15);
          attacker.dimension.spawnParticle("minecraft:sonic_explosion", attacker.location);
          attacker.playSound("random.anvil_land", attacker.location, { volume: 1.2, pitch: 0.8 });

          attacker.onScreenDisplay?.setActionBar?.(
            `§c💥 受到【重装战术防暴盾】荆棘反甲反震 (-${reflectedDmg} HP)!`
          );
        } catch {}
      }

      try {
        target.onScreenDisplay?.setActionBar?.(
          `§a🛡️【战术反甲盾】完全格挡实弹！已反震攻击者 (-${reflectedDmg} HP)!`
        );
      } catch {}

      return { blocked: true, damage: 0, isApexRiot: true };
    } else {
      // ⭐ 【原版盾牌】：
      // 对巴雷特 M82 .50 穿甲重狙：穿透 40% 残余伤害
      if (gunConfig?.id === "apex:m82") {
        const piercedDmg = Math.round(incomingDamage * 0.4);
        try {
          target.onScreenDisplay?.setActionBar?.(
            `§6🛡️ 原版盾牌抵挡了 .50 狙击穿甲弹 (-60% 减伤，残余 -${piercedDmg} HP)`
          );
        } catch {}
        return { blocked: true, damage: piercedDmg, isApexRiot: false };
      }

      // 其他常规武器 100% 完全格挡
      try {
        target.onScreenDisplay?.setActionBar?.(`§a🛡️ 原版盾牌成功格挡实弹伤害！`);
      } catch {}
      return { blocked: true, damage: 0, isApexRiot: false };
    }
  }

  /**
   * 战术防暴盾主动技能：过载动能冲击波 (Kinetic Shockwave Bash - 25 HP + 5格大击退)
   */
  static handleShieldBash(player) {
    if (!player || !player.isValid()) return false;
    const shieldInfo = this.getEquippedShield(player);
    if (!shieldInfo || !shieldInfo.isApexRiot) return false;

    const currentTick = system.currentTick;
    const nextTick = this.#shieldBashCooldowns.get(player.id) || 0;
    if (currentTick < nextTick) {
      const remainingSec = Math.max(0, (nextTick - currentTick) / 20).toFixed(1);
      player.onScreenDisplay?.setActionBar?.(`§c⏳ 动能冲击波冷却中: ${remainingSec}s`);
      return false;
    }

    this.#shieldBashCooldowns.set(player.id, currentTick + 160); // 8 秒 CD

    const dim = player.dimension;
    const pLoc = player.location;
    const viewDir = player.getViewDirection();
    const bashCenter = {
      x: pLoc.x + viewDir.x * 2.0,
      y: pLoc.y + 1.0,
      z: pLoc.z + viewDir.z * 2.0
    };

    try {
      dim.playSound("random.explode", bashCenter, { volume: 1.4, pitch: 0.8 });
      dim.playSound("mob.warden.sonic_boom", bashCenter, { volume: 1.5, pitch: 1.2 });
      dim.spawnParticle("minecraft:sonic_explosion", bashCenter);
      dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", bashCenter);

      const nearby = dim.getEntities({ location: bashCenter, maxDistance: 5.5 });
      let hitCount = 0;

      for (const ent of nearby) {
        if (!ent || !ent.isValid() || ent.id === player.id) continue;
        if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

        try {
          ent.applyDamage(25, { cause: EntityDamageCause.override, damagingEntity: player });
          ent.applyKnockback(viewDir.x, viewDir.z, 1.4, 0.35);
          hitCount++;
        } catch {}
      }

      player.onScreenDisplay?.setActionBar?.(
        `§6🛡️【动能冲击波】释放成功！击飞震退 §f${hitCount} §6个目标 (-25 HP)!`
      );
    } catch {}

    return true;
  }
}
