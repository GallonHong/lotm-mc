import { world, system, EntityDamageCause } from "@minecraft/server";

export class ShieldEngine {
  static #shieldBashCooldowns = new Map(); // playerId -> nextReadyTick

  /**
   * 计算不同枪械实弹对盾牌造成的动能耐久损耗
   */
  static calculateShieldDurabilityLoss(gunConfig, isApexRiot = false) {
    let baseLoss = 10;
    const gunId = gunConfig?.id;

    if (gunId === "apex:vector") {
      baseLoss = 12; // Vector 极速子弹每发损耗 12 耐久 (暴走狂潮 28 发直接打爆 336 耐久原版盾)
    } else if (gunId === "apex:ak47") {
      baseLoss = 16; // AK-47 7.62mm 重弹每发损耗 16 耐久 (一梭子必碎)
    } else if (gunId === "apex:m82") {
      baseLoss = 120; // 巴雷特 .50 穿甲重狙单发损耗 120 耐久 (3枪轰碎原版盾)
    } else if (gunId === "apex:shotgun") {
      baseLoss = 8;  // 霰弹枪单枚弹丸损耗 8 耐久 (8 发全中损耗 64 耐久)
    } else if (gunId === "apex:mgl") {
      baseLoss = 150; // M32 40mm 高爆弹单发损耗 150 耐久 (2发炸碎原版盾)
    } else if (gunId === "apex:arc_emitter") {
      baseLoss = 18; // 特斯拉高压电弧损耗 18 耐久
    }

    // 重装战术反甲盾拥有 50% 动能磨损抗性
    if (isApexRiot) {
      baseLoss = Math.max(1, Math.round(baseLoss * 0.5));
    }

    return baseLoss;
  }

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
   * 判定盾牌格挡与反甲反震结算 (大幅提高枪械动能耐久消耗，支持盾牌击碎系统)
   */
  static checkBulletShieldBlock(attacker, target, incomingDamage, gunConfig) {
    if (!target || !target.isValid()) return { blocked: false, damage: incomingDamage };

    // 1. 检查是否持盾
    const shieldInfo = this.getEquippedShield(target);
    if (!shieldInfo) {
      return { blocked: false, damage: incomingDamage };
    }

    // 2. 判定格挡姿态
    const isPlayer = target.typeId === "minecraft:player";
    const isSneaking = target.isSneaking ?? false;
    const isUsingItem = target.isItemUsing ?? false;
    const isBlockingStance = !isPlayer || shieldInfo.isApexRiot || isSneaking || isUsingItem;
    if (!isBlockingStance) {
      return { blocked: false, damage: incomingDamage };
    }

    // 3. 判定格挡水平朝向角度 (2D 水平向量)
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

          // 正面 160° 扇形范围格挡
          if (dot < -0.2) {
            return { blocked: false, damage: incomingDamage };
          }
        }
      }
    }

    // 4. 格挡成功视听特效
    const dim = target.dimension;
    const tLoc = target.location;
    const blockSparkPos = { x: tLoc.x, y: tLoc.y + 1.2, z: tLoc.z };

    try {
      dim.playSound("item.shield.block", tLoc, { volume: 1.5, pitch: 1.0 });
      dim.playSound("apex.gun.hit_metal", tLoc, { volume: 1.3, pitch: 1.1 });
      dim.spawnParticle("minecraft:lava_particle", blockSparkPos);
      dim.spawnParticle("apex:arc_spark", blockSparkPos);
    } catch {}

    // 5. 动能耐久损耗与【盾牌破碎】检测
    let shieldBroken = false;
    try {
      const durComp = shieldInfo.item.getComponent("minecraft:durability");
      if (durComp) {
        const loss = this.calculateShieldDurabilityLoss(gunConfig, shieldInfo.isApexRiot);
        const newDmg = durComp.damage + loss;

        if (newDmg >= durComp.maxDurability) {
          // 💥 盾牌耐久耗尽，彻底被打爆碎裂！
          shieldBroken = true;
          const equippable = target.getComponent("minecraft:equippable");
          try {
            equippable?.setEquipment(shieldInfo.slot, undefined);
          } catch {}

          if (shieldInfo.slot === "Mainhand" && typeof target.selectedSlotIndex === "number") {
            try {
              const inv = target.getComponent("minecraft:inventory");
              inv?.container?.setItem(target.selectedSlotIndex, undefined);
            } catch {}
          }

          // 播放碎裂重型音效与破碎特效
          try {
            dim.playSound("random.break", tLoc, { volume: 1.8, pitch: 0.85 });
            dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", blockSparkPos);
            dim.spawnParticle("minecraft:crit", blockSparkPos);
          } catch {}

          target.onScreenDisplay?.setActionBar?.(`§c💥 您的盾牌已被敌方枪械火力彻底击碎摧毁！`);
          if (attacker && attacker.isValid()) {
            attacker.onScreenDisplay?.setActionBar?.(`§a💥 敌方的盾牌已被您的强力火力当场击碎！`);
            try {
              attacker.playSound("random.orb", attacker.location, { volume: 1.0, pitch: 1.2 });
            } catch {}
          }
        } else {
          durComp.damage = newDmg;
          const equippable = target.getComponent("minecraft:equippable");
          equippable?.setEquipment(shieldInfo.slot, shieldInfo.item);
        }
      }
    } catch (e) {
      console.warn(`[ApexFirearms] Shield durability deduction error: ${e}`);
    }

    // 盾牌破碎时，穿透 50% 伤害
    if (shieldBroken) {
      return {
        blocked: true,
        damage: Math.max(1, Math.round(incomingDamage * 0.5)),
        shieldBroken: true,
        isApexRiot: shieldInfo.isApexRiot
      };
    }

    // 6. 特殊武器穿透与反甲结算
    if (shieldInfo.isApexRiot) {
      // ⭐ 【重装战术动能反甲盾】：100% 格挡并反弹 50% 真实伤害与冲击波！
      let reflectedDmg = Math.max(2, Math.round(incomingDamage * 0.5));
      if (attacker && attacker.isValid() && attacker.id !== target.id) {
        try {
          attacker.applyDamage(reflectedDmg, {
            cause: EntityDamageCause.override,
            damagingEntity: target
          });

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

      // 常规武器完全格挡 (耐久已大幅扣减)
      try {
        target.onScreenDisplay?.setActionBar?.(`§a🛡️ 原版盾牌成功格挡实弹伤害！`);
      } catch {}
      if (attacker && attacker.isValid()) {
        attacker.onScreenDisplay?.setActionBar?.(`§e🛡️ 敌方盾牌格挡了您的子弹! (消耗敌方巨额盾牌耐久)`);
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
