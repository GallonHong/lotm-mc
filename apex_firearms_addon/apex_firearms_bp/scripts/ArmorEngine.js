import { world, system, EntityDamageCause } from "@minecraft/server";
import { DamageResolver } from "./DamageResolver.js";

export class ArmorEngine {
  static #nanoShieldCooldowns = new Map(); // playerId -> nextReadyTick
  static #empPulseCooldowns = new Map();   // playerId -> nextReadyTick

  /**
   * 20 TPS 常态动力战甲被动光环更新
   */
  static onTick() {
    const currentTick = system.currentTick;
    const allPlayers = world.getAllPlayers();

    for (const player of allPlayers) {
      if (!player || !player.isValid()) continue;

      const equippable = player.getComponent("minecraft:equippable");
      if (!equippable) continue;

      const head = equippable.getEquipment("Head");
      const chest = equippable.getEquipment("Chest");
      const legs = equippable.getEquipment("Legs");
      const feet = equippable.getEquipment("Feet");

      const hasHelmet = head?.typeId === "apex:exo_helmet";
      const hasChestplate = chest?.typeId === "apex:exo_chestplate";
      const hasLeggings = legs?.typeId === "apex:exo_leggings";
      const hasBoots = feet?.typeId === "apex:exo_boots";
      const hasFullSet = hasHelmet && hasChestplate && hasLeggings && hasBoots;

      // 1. 头盔被动【全息夜视仪】
      if (hasHelmet) {
        try {
          player.addEffect("night_vision", 300, { amplifier: 0, showParticles: false });
        } catch {}
      }

      // 2. 护腿被动【液压伺服动力加速】
      if (hasLeggings) {
        try {
          player.addEffect("speed", 40, { amplifier: 0, showParticles: false });
        } catch {}
      }

      // 3. 战靴被动【反冲跳跃助力】
      if (hasBoots) {
        try {
          player.addEffect("jump_boost", 40, { amplifier: 0, showParticles: false });
        } catch {}
      }

      // 4. 全套 4 件战甲终极技能【EMP 绝境应急自救脉冲】
      if (hasFullSet) {
        const healthComp = player.getComponent("minecraft:health");
        if (healthComp) {
          const currentHp = healthComp.currentValue;
          const maxHp = healthComp.effectiveMax;

          // 当血量低于 30% (约 6 HP)
          if (currentHp <= 6) {
            const nextEmpTick = this.#empPulseCooldowns.get(player.id) || 0;
            if (currentTick >= nextEmpTick) {
              this.#triggerEmergencyEmpPulse(player, currentTick);
            }
          }
        }
      }
    }
  }

  /**
   * 触发 EMP 绝境超载自救脉冲
   */
  static #triggerEmergencyEmpPulse(player, currentTick) {
    this.#empPulseCooldowns.set(player.id, currentTick + 1200); // 60s CD
    const dim = player.dimension;
    const loc = player.location;
    const center = { x: loc.x, y: loc.y + 0.8, z: loc.z };

    try {
      // 视听轰鸣
      player.playSound("mob.warden.sonic_boom", { location: loc, volume: 1.2, pitch: 1.4 });
      player.playSound("random.explode", { location: loc, volume: 1.0, pitch: 1.2 });
      dim.spawnParticle("minecraft:sonic_explosion", center);
      dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", center);

      // 赋予玩家超强应急金心与抗性
      player.addEffect("resistance", 120, { amplifier: 1, showParticles: false }); // 6s 抗性提升 II
      player.addEffect("absorption", 600, { amplifier: 1, showParticles: false }); // 8 点吸收金心

      player.onScreenDisplay?.setActionBar?.(
        "§b⚡【泰坦 EMP 应急脉冲已爆发】击飞周围敌对目标 + 获得 8 点应急超载金心!"
      );

      // 震飞并电击周围 6 格敌群
      const nearby = dim.getEntities({
        location: center,
        maxDistance: 6.5
      });

      for (const ent of nearby) {
        if (!ent || !ent.isValid() || ent.id === player.id) continue;
        if (ent.typeId === "minecraft:item" || ent.typeId === "minecraft:xp_orb") continue;

        const el = ent.location;
        const dx = el.x - loc.x;
        const dz = el.z - loc.z;
        const dist = Math.hypot(dx, dz) || 1.0;

        try {
          // 25 HP 真实电击伤害
          ent.applyDamage(25, {
            cause: EntityDamageCause.override,
            damagingEntity: player
          });
          ent.applyKnockback(dx / dist, dz / dist, 1.8, 0.45);
        } catch {}
      }
    } catch (e) {
      console.warn(`[ApexFirearms] triggerEmergencyEmpPulse error: ${e}`);
    }
  }

  /**
   * 处理受击被动 (胸甲生成金心吸收护盾 + 战靴免疫摔落伤害)
   */
  static handleEntityHurt(event) {
    try {
      const hurtEntity = event.hurtEntity;
      if (!hurtEntity || hurtEntity.typeId !== "minecraft:player" || !hurtEntity.isValid()) return;

      const equippable = hurtEntity.getComponent("minecraft:equippable");
      if (!equippable) return;

      const chest = equippable.getEquipment("Chest");
      const feet = equippable.getEquipment("Feet");
      const currentTick = system.currentTick;

      // 1. 战靴 100% 免疫摔落伤害
      if (feet?.typeId === "apex:exo_boots" && event.damageSource?.cause === EntityDamageCause.fall) {
        const healthComp = hurtEntity.getComponent("minecraft:health");
        if (healthComp) {
          const healedHp = Math.min(healthComp.effectiveMax, healthComp.currentValue + event.damage);
          healthComp.setCurrentValue(healedHp);
          try {
            hurtEntity.playSound("random.anvil_land", { volume: 0.6, pitch: 1.8 });
            hurtEntity.dimension.spawnParticle("minecraft:smoke_particle", hurtEntity.location);
          } catch {}
        }
      }

      // 2. 胸甲受击触发【纳米吸收圣盾】(4 点金心护盾，CD: 12s)
      if (chest?.typeId === "apex:exo_chestplate") {
        const nextNanoTick = this.#nanoShieldCooldowns.get(hurtEntity.id) || 0;
        if (currentTick >= nextNanoTick) {
          this.#nanoShieldCooldowns.set(hurtEntity.id, currentTick + 240); // 12s CD
          try {
            hurtEntity.addEffect("absorption", 240, { amplifier: 0, showParticles: false }); // 4 点吸收金心
            hurtEntity.playSound("random.orb", { volume: 0.9, pitch: 1.6 });
            hurtEntity.onScreenDisplay?.setActionBar?.("§b🛡️【泰坦纳米圣盾】已激活 (+4 吸收金心护盾)!");
          } catch {}
        }
      }
    } catch (e) {
      console.warn(`[ApexFirearms] handleEntityHurt error: ${e}`);
    }
  }
}
