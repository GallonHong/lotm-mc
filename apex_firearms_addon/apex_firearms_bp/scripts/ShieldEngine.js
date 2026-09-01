import { world, system, EntityDamageCause } from "@minecraft/server";

export class ShieldEngine {
  static #shieldBashCooldowns = new Map(); // playerId -> nextReadyTick

  /**
   * 检查玩家/实体是否装备了盾牌 (支持副手槽、主手槽、原生 Equippable 及背包快捷栏)
   */
  static getEquippedShield(entity) {
    if (!entity || !entity.isValid()) return null;

    // 1. 检查 Equippable 组件 (Offhand & Mainhand)
    try {
      const equippable = entity.getComponent("minecraft:equippable");
      if (equippable) {
        const slotsToCheck = ["Offhand", "offhand", "slot.weapon.offhand", "Mainhand", "mainhand", "slot.weapon.mainhand"];
        for (const slot of slotsToCheck) {
          try {
            const item = equippable.getEquipment(slot);
            if (item) {
              const tid = item.typeId.toLowerCase();
              if (tid === "apex:riot_shield" || tid.includes("shield")) {
                return { item, slot, isApexRiot: tid === "apex:riot_shield", typeId: item.typeId };
              }
            }
          } catch {}
        }
      }
    } catch {}

    // 2. 检查玩家主手当前选中槽位 (Inventory Container)
    try {
      const inv = entity.getComponent("minecraft:inventory");
      if (inv && inv.container && typeof entity.selectedSlotIndex === "number") {
        const item = inv.container.getItem(entity.selectedSlotIndex);
        if (item) {
          const tid = item.typeId.toLowerCase();
          if (tid === "apex:riot_shield" || tid.includes("shield")) {
            return { item, slot: "Mainhand", isApexRiot: tid === "apex:riot_shield", typeId: item.typeId };
          }
        }
      }
    } catch {}

    return null;
  }

  /**
   * 判定盾牌格挡与反甲反震结算 (支持原版盾牌与 Apex 战术反甲盾)
   */
  static checkBulletShieldBlock(attacker, target, incomingDamage, gunConfig) {
    if (!target || !target.isValid()) return { blocked: false, damage: incomingDamage };

    // 1. 检查是否持盾
    const shieldInfo = this.getEquippedShield(target);
    if (!shieldInfo) {
      return { blocked: false, damage: incomingDamage };
    }

    // 2. 判定格挡姿态：
    // 如果持有【重装战术反甲盾】，只要面向敌方即具备战术防弹偏折；
    // 如果持有【原版盾牌】，支持潜行(Shift)、使用物品(右键)或正面迎弹；
    const isPlayer = target.typeId === "minecraft:player";
    const isSneaking = target.isSneaking ?? false;
    const isUsingItem = target.isItemUsing ?? false;

    // 非玩家实体(如靶人/生物)只要装备盾牌即可生效；玩家只要持反甲盾或在举盾/潜行即可生效
    const isBlockingStance = !isPlayer || shieldInfo.isApexRiot || isSneaking || isUsingItem;
    if (!isBlockingStance) {
      return { blocked: false, damage: incomingDamage };
    }

    // 3. 判定格挡水平朝向角度 (2D 归一化水平向量)
    if (attacker && attacker.isValid()) {
      const aLoc = attacker.location;
      const tLoc = target.location;

      const dx = aLoc.x - tLoc.x;
      const dz = aLoc.z - tLoc.z;
      const hDist = Math.hypot(dx, dz);

      if (hDist > 0.05) {
        const toAttackerX = dx / hDist;
        const toAttackerZ = dz / hDist;

        const tView = target.getViewDirection();
        const tvLen = Math.hypot(tView.x, tView.z);

        if (tvLen > 0.01) {
          const normTx = tView.x / tvLen;
          const normTz = tView.z / tvLen;
          const dot = toAttackerX * normTx + toAttackerZ * normTz;

          // 只要不是纯后背受击 (面向前方 160° 扇形范围 dot > -0.2) 均判定为正面防弹格挡成功！
          if (dot < -0.2) {
            return { blocked: false, damage: incomingDamage };
          }
        }
      }
    }

    // 4. 格挡成功视听特效与耐久消耗
    const dim = target.dimension;
    const tLoc = target.location;
    const blockSparkPos = { x: tLoc.x, y: tLoc.y + 1.2, z: tLoc.z };

    try {
      dim.playSound("item.shield.block", tLoc, { volume: 1.5, pitch: 1.0 });
      dim.playSound("apex.gun.hit_metal", tLoc, { volume: 1.3, pitch: 1.1 });
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

    // 5. 特殊武器穿透与反甲结算
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
          attacker.applyKnockback(-aView.x, -aView.z, 0.7, 0.2);
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

      if (attacker && attacker.isValid()) {
        attacker.onScreenDisplay?.setActionBar?.(`§e🛡️ 敌方【重装防暴盾】完全格挡并反震了您的子弹!`);
      }

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
        if (attacker && attacker.isValid()) {
          attacker.onScreenDisplay?.setActionBar?.(`§6🎯 .50 穿甲弹穿透敌方盾牌造成 -${piercedDmg} HP!`);
        }
        return { blocked: true, damage: piercedDmg, isApexRiot: false };
      }

      // 其他常规武器 100% 完全格挡
      try {
        target.onScreenDisplay?.setActionBar?.(`§a🛡️ 原版盾牌成功格挡实弹伤害！`);
      } catch {}
      if (attacker && attacker.isValid()) {
        attacker.onScreenDisplay?.setActionBar?.(`§e🛡️ 敌方盾牌完全格挡了您的子弹!`);
      }
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
