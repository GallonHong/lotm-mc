import { world, system, ItemStack, EntityDamageCause } from "@minecraft/server";

export class BossEngine {
  static #bossStates = new Map(); // entityId -> BossState
  static #empStrikes = [];        // active delayed EMP strikes

  /**
   * 判定实体是否为合法的攻击目标 (绝不攻击创造/旁观玩家，支持坚守者/铁傀儡等生物)
   */
  static isValidCombatTarget(entity, boss) {
    if (!entity || !entity.isValid()) return false;
    if (boss && entity.id === boss.id) return false;
    if (entity.typeId === "apex_boss:juggernaut" || entity.typeId === "apex_boss:drone") return false;
    if (entity.typeId === "minecraft:item" || entity.typeId === "minecraft:xp_orb") return false;

    // 创造模式与旁观模式玩家 100% 绝对豁免，Boss 绝不索敌攻击！
    if (entity.typeId === "minecraft:player") {
      try {
        const gm = entity.getGameMode?.();
        if (gm === "creative" || gm === "spectator") {
          return false;
        }
      } catch {}

      try {
        const hpComp = entity.getComponent("minecraft:health");
        if (hpComp && hpComp.currentValue <= 0) return false;
      } catch {}
      return true;
    }

    // 敌对生物或反击生物 (如坚守者 Warden, 铁傀儡, 凋灵等)
    return true;
  }

  /**
   * 获取 Boss 当前最优先的战斗目标
   */
  static getPrimaryCombatTarget(boss) {
    if (!boss || !boss.isValid()) return null;

    // 1. 优先获取 Boss 原生行为锁定的目标 (如正在攻击 Boss 的坚守者/玩家)
    try {
      const nativeTarget = boss.target || boss.getTarget?.();
      if (nativeTarget && this.isValidCombatTarget(nativeTarget, boss)) {
        return nativeTarget;
      }
    } catch {}

    // 2. 搜索 36 格范围内的存活敌对目标
    try {
      const dim = boss.dimension;
      const bLoc = boss.location;
      const nearby = dim.getEntities({
        location: bLoc,
        maxDistance: 36
      });

      let bestTarget = null;
      let minDistance = 40;

      for (const ent of nearby) {
        if (!this.isValidCombatTarget(ent, boss)) continue;

        const d = Math.hypot(ent.location.x - bLoc.x, ent.location.y - bLoc.y, ent.location.z - bLoc.z);
        if (d < minDistance) {
          minDistance = d;
          bestTarget = ent;
        }
      }

      return bestTarget;
    } catch (e) {
      return null;
    }
  }

  /**
   * 20 TPS Boss 状态机与多阶段战斗逻辑
   */
  static onTick() {
    const currentTick = system.currentTick;
    const overworld = world.getDimension("overworld");

    // 1. 处理延迟轨道 EMP 离子雷暴打击
    this.#updateEmpStrikes(currentTick);

    // 2. 搜寻并更新所有机械泰坦 Boss
    const bosses = [];
    try {
      if (overworld) {
        bosses.push(...overworld.getEntities({ type: "apex_boss:juggernaut" }));
      }
    } catch {}

    for (const boss of bosses) {
      if (!boss || !boss.isValid()) continue;

      let currentHp = 12000;
      let maxHp = 12000;
      try {
        const healthComp = boss.getComponent("minecraft:health");
        if (!healthComp) continue;
        currentHp = healthComp.currentValue;
        maxHp = healthComp.effectiveMax || 12000;
      } catch {
        continue;
      }

      const hpRatio = currentHp / maxHp;

      let state = this.#bossStates.get(boss.id);
      if (!state) {
        state = {
          phase: 1,
          lastGatlingTick: currentTick,
          lastStompTick: currentTick,
          lastEmpTick: currentTick,
          hasSpawnedDrones: false,
          isDying: false
        };
        this.#bossStates.set(boss.id, state);
      }

      // 阶段转换判定并动态更新顶部 Boss Bar 标题
      try {
        if (hpRatio <= 0.30 && state.phase < 3) {
          state.phase = 3;
          boss.nameTag = "§l§4机械泰坦歼灭者 · 终焉超频自毁态§r";
          this.#broadcastBossMessage("§4⚡【机械泰坦】进入阶段三：【终焉超频自毁狂暴态】！移速暴增，全核心过载！");
          boss.dimension.playSound("mob.wither.spawn", boss.location, { volume: 2.0, pitch: 0.8 });
        } else if (hpRatio <= 0.70 && state.phase < 2) {
          state.phase = 2;
          boss.nameTag = "§l§6机械泰坦歼灭者 · 等离子重构态§r";
          this.#broadcastBossMessage("§e⚡【机械泰坦】进入阶段二：【等离子重构态】！开启纳米护盾并部署自爆无人机！");
          this.#triggerPhase2ShieldAndDrones(boss);
        }
      } catch {}

      // 狂暴阶段常驻等离子光环
      if (state.phase === 3) {
        try {
          boss.dimension.spawnParticle("minecraft:basic_flame_particle", {
            x: boss.location.x + (Math.random() - 0.5) * 1.5,
            y: boss.location.y + Math.random() * 2.5,
            z: boss.location.z + (Math.random() - 0.5) * 1.5
          });
          boss.dimension.spawnParticle("minecraft:endrod", boss.location);
        } catch {}
      }

      // 技能 1: 机炮扫射 (阶段1每 7s，阶段2/3每 5s)
      const gatlingInterval = state.phase === 1 ? 140 : 100;
      if (currentTick - state.lastGatlingTick >= gatlingInterval) {
        state.lastGatlingTick = currentTick;
        this.#fireGatlingBarrage(boss);
      }

      // 技能 2: 地动山摇践踏 (每 11 秒)
      if (currentTick - state.lastStompTick >= 220) {
        state.lastStompTick = currentTick;
        this.#performSeismicStomp(boss);
      }

      // 技能 3: 轨道 EMP 离子雷暴 (阶段2和阶段3每 14 秒)
      if (state.phase >= 2 && currentTick - state.lastEmpTick >= 280) {
        state.lastEmpTick = currentTick;
        this.#callOrbitalEmpStrike(boss, currentTick);
      }
    }
  }

  /**
   * 技能 1: 30 连发机枪重火网弹幕扫射 (带未加载区块保护)
   */
  static #fireGatlingBarrage(boss) {
    const target = this.getPrimaryCombatTarget(boss);
    if (!target || !target.isValid()) return;

    try {
      const dim = boss.dimension;
      const bLoc = boss.location;
      dim.playSound("random.explode", bLoc, { volume: 1.2, pitch: 1.6 });

      // 连续发射 15 发高速重机枪子弹 (每 2 tick 射一发)
      for (let i = 0; i < 15; i++) {
        system.runTimeout(() => {
          try {
            if (!boss || !boss.isValid() || !target || !target.isValid()) return;

            const curMuzzle = { x: boss.location.x, y: boss.location.y + 2.0, z: boss.location.z };
            const tLoc = target.location;
            const targetHead = { x: tLoc.x, y: tLoc.y + 1.2, z: tLoc.z };

            const dx = targetHead.x - curMuzzle.x + (Math.random() - 0.5) * 1.2;
            const dy = targetHead.y - curMuzzle.y + (Math.random() - 0.5) * 0.8;
            const dz = targetHead.z - curMuzzle.z + (Math.random() - 0.5) * 1.2;
            const dist = Math.hypot(dx, dy, dz) || 1.0;

            // 绘制弹幕射线 (未加载区块安全保护)
            const steps = Math.min(Math.floor(dist / 0.8), 35);
            for (let s = 1; s <= steps; s++) {
              const frac = s / steps;
              try {
                dim.spawnParticle("minecraft:basic_flame_particle", {
                  x: curMuzzle.x + dx * frac,
                  y: curMuzzle.y + dy * frac,
                  z: curMuzzle.z + dz * frac
                });
              } catch {}
            }

            try {
              dim.playSound("random.explode", curMuzzle, { volume: 0.6, pitch: 1.9 });
            } catch {}

            // 伤害检测
            const finalImpact = { x: curMuzzle.x + dx, y: curMuzzle.y + dy, z: curMuzzle.z + dz };
            try {
              const hits = dim.getEntities({ location: finalImpact, maxDistance: 2.0 });
              for (const h of hits) {
                if (this.isValidCombatTarget(h, boss)) {
                  h.applyDamage(10, { cause: EntityDamageCause.entityAttack, damagingEntity: boss });
                }
              }
            } catch {}
          } catch {}
        }, i * 2);
      }
    } catch {}
  }

  /**
   * 技能 2: 地动山摇近战践踏 (击飞 + 24 HP 震荡波)
   */
  static #performSeismicStomp(boss) {
    try {
      const dim = boss.dimension;
      const bLoc = boss.location;
      const stompCenter = { x: bLoc.x, y: bLoc.y + 0.2, z: bLoc.z };

      try {
        dim.playSound("random.anvil_land", bLoc, { volume: 1.5, pitch: 0.5 });
        dim.playSound("random.explode", bLoc, { volume: 1.2, pitch: 0.8 });
        dim.spawnParticle("minecraft:sonic_explosion", stompCenter);
        dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", stompCenter);
      } catch {}

      const nearby = dim.getEntities({ location: stompCenter, maxDistance: 7.0 });
      for (const ent of nearby) {
        if (!this.isValidCombatTarget(ent, boss)) continue;

        const pLoc = ent.location;
        const dx = pLoc.x - bLoc.x || 1.0;
        const dz = pLoc.z - bLoc.z || 1.0;
        const hDist = Math.hypot(dx, dz);

        try {
          ent.applyImpulse({
            x: (dx / hDist) * 0.6,
            y: 0.95,
            z: (dz / hDist) * 0.6
          });
        } catch {}

        try {
          ent.applyDamage(24, { cause: EntityDamageCause.entityAttack, damagingEntity: boss });
        } catch {}
      }
    } catch {}
  }

  /**
   * 技能 3: 轨道 EMP 离子雷暴打击
   */
  static #callOrbitalEmpStrike(boss, currentTick) {
    try {
      const dim = boss.dimension;
      const bLoc = boss.location;

      const nearby = dim.getEntities({ location: bLoc, maxDistance: 36 });
      const targets = nearby.filter((ent) => this.isValidCombatTarget(ent, boss));
      if (targets.length === 0) return;

      this.#broadcastBossMessage("§c⚡ 警告：检测到轨道 EMP 高压离子聚能！2秒后定点轰击！");

      for (const t of targets) {
        const tLoc = t.location;
        const targetPos = { x: tLoc.x, y: tLoc.y, z: tLoc.z };

        this.#empStrikes.push({
          dimId: dim.id,
          pos: targetPos,
          detonateTick: currentTick + 40 // 2.0 秒后引爆
        });
      }
    } catch {}
  }

  /**
   * 步进更新 EMP 延迟雷暴光柱
   */
  static #updateEmpStrikes(currentTick) {
    const remaining = [];
    for (const emp of this.#empStrikes) {
      try {
        const dim = world.getDimension(emp.dimId);
        if (!dim) continue;

        // 预警光柱特效 (带未加载区块保护)
        if (currentTick < emp.detonateTick) {
          for (let y = 0; y < 12; y += 2) {
            try {
              dim.spawnParticle("minecraft:endrod", { x: emp.pos.x, y: emp.pos.y + y, z: emp.pos.z });
            } catch {}
          }
          remaining.push(emp);
        } else {
          // 引爆雷暴
          try {
            dim.playSound("ambient.weather.thunder0", emp.pos, { volume: 1.5, pitch: 1.0 });
            dim.playSound("mob.warden.sonic_boom", emp.pos, { volume: 1.5, pitch: 1.2 });
            dim.spawnParticle("minecraft:sonic_explosion", emp.pos);
            dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", emp.pos);
          } catch {}

          try {
            const nearby = dim.getEntities({ location: emp.pos, maxDistance: 4.5 });
            for (const ent of nearby) {
              if (this.isValidCombatTarget(ent, null)) {
                ent.applyDamage(35, { cause: EntityDamageCause.override });
                ent.setOnFire(4, true);
              }
            }
          } catch {}
        }
      } catch {}
    }
    this.#empStrikes = remaining;
  }

  /**
   * 阶段二触发：纳米自愈护盾与无人机空投
   */
  static #triggerPhase2ShieldAndDrones(boss) {
    try {
      const dim = boss.dimension;
      const bLoc = boss.location;

      // 1. 赋予 1500 HP 吸收金心护盾
      try {
        boss.addEffect("absorption", 2400, { amplifier: 30, showParticles: false });
        boss.addEffect("resistance", 1200, { amplifier: 1, showParticles: false });
      } catch {}

      // 2. 召唤 3 只机械自爆近卫
      for (let i = 0; i < 3; i++) {
        const offset = {
          x: bLoc.x + (i - 1) * 3,
          y: bLoc.y + 1,
          z: bLoc.z + 2
        };
        try {
          dim.spawnEntity("apex_boss:drone", offset);
        } catch {}
      }
    } catch (e) {
      console.warn(`[ApexBoss] Error spawning drones: ${e}`);
    }
  }

  /**
   * 处理 Boss 阵亡事件：核能过载大自毁与 Apex 军火战利品掉落
   */
  static handleBossDeath(bossEntity) {
    if (!bossEntity || bossEntity.typeId !== "apex_boss:juggernaut") return;

    try {
      const dim = bossEntity.dimension;
      const loc = bossEntity.location;

      this.#broadcastBossMessage("§l§4💥【机械泰坦歼灭者】核心严重过载！3秒后引发全域核能大自爆！迅速撤离！");

      // 倒计时核能大自爆
      system.runTimeout(() => {
        try {
          dim.playSound("mob.wither.death", loc, { volume: 2.0, pitch: 0.6 });
          dim.playSound("random.explode", loc, { volume: 2.0, pitch: 0.5 });
          dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", loc);
          dim.spawnParticle("minecraft:sonic_explosion", loc);

          // 10 格自爆冲击波
          const nearby = dim.getEntities({ location: loc, maxDistance: 10.0 });
          for (const ent of nearby) {
            if (this.isValidCombatTarget(ent, bossEntity)) {
              try { ent.applyDamage(60, { cause: EntityDamageCause.override }); } catch {}
              const dx = ent.location.x - loc.x || 1.0;
              const dz = ent.location.z - loc.z || 1.0;
              const dist = Math.hypot(dx, dz);
              try {
                ent.applyImpulse({ x: (dx / dist) * 1.5, y: 1.2, z: (dz / dist) * 1.5 });
              } catch {}
            }
          }

          // 掉落顶级战利品与 Apex 军火弹药
          dim.spawnItem(new ItemStack("apex_boss:juggernaut_core", 2), loc);
          dim.spawnItem(new ItemStack("apex:ammo_50cal", 32), loc);
          dim.spawnItem(new ItemStack("apex:ammo_40mm", 24), loc);
          dim.spawnItem(new ItemStack("apex:ammo_battery", 48), loc);
          dim.spawnItem(new ItemStack("apex:ammo_12gauge", 32), loc);
          dim.spawnItem(new ItemStack("apex:ammo_762", 64), loc);
          dim.spawnItem(new ItemStack("minecraft:diamond", 16), loc);
          dim.spawnItem(new ItemStack("minecraft:netherite_ingot", 2), loc);

          this.#broadcastBossMessage("§l§a🏆【机械泰坦歼灭者】已成功击破！海量 Apex 顶级军火战利品已掉落！");
        } catch (err) {
          console.warn(`[ApexBoss] Meltdown error: ${err}`);
        }
      }, 60); // 3 秒后核爆
    } catch {}
  }

  /**
   * 处理自爆近卫无人机 3D 飞行追踪与自毁 (避开创造模式玩家，支持空中飞行)
   */
  static handleDroneTick(drone) {
    if (!drone || !drone.isValid()) return;

    try {
      const dim = drone.dimension;
      const dLoc = drone.location;

      // 1. 飞行尾迹推进火焰与浓烟特效
      try {
        dim.spawnParticle("minecraft:basic_flame_particle", { x: dLoc.x, y: dLoc.y + 0.2, z: dLoc.z });
        dim.spawnParticle("minecraft:smoke_particle", { x: dLoc.x, y: dLoc.y - 0.1, z: dLoc.z });
      } catch {}

      // 2. 搜索 32 格内最近合法战斗目标 (坚守者/正在交战的生物/生存玩家)
      let target = null;
      let minDist = 36;
      try {
        const nearby = dim.getEntities({ location: dLoc, maxDistance: 32 });
        for (const ent of nearby) {
          if (!this.isValidCombatTarget(ent, drone)) continue;
          const d = Math.hypot(ent.location.x - dLoc.x, ent.location.y - dLoc.y, ent.location.z - dLoc.z);
          if (d < minDist) {
            minDist = d;
            target = ent;
          }
        }
      } catch {}

      // 3. 飞行推进或悬浮自爆
      if (target && target.isValid()) {
        const tLoc = target.location;
        const targetCenter = { x: tLoc.x, y: tLoc.y + 1.1, z: tLoc.z };
        const dx = targetCenter.x - dLoc.x;
        const dy = targetCenter.y - dLoc.y;
        const dz = targetCenter.z - dLoc.z;
        const dist = Math.hypot(dx, dy, dz) || 1.0;

        if (dist <= 2.2) {
          // 自爆引爆
          try {
            dim.playSound("random.explode", dLoc, { volume: 1.5, pitch: 1.2 });
            dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", dLoc);
            dim.spawnParticle("minecraft:sonic_explosion", dLoc);
          } catch {}
          try { target.applyDamage(35, { cause: EntityDamageCause.override }); } catch {}
          try { drone.kill(); } catch {}
          return;
        }

        // 施加 3D 空中推进冲量 (向目标高速俯冲追踪)
        const flySpeed = 0.24;
        try {
          drone.applyImpulse({
            x: (dx / dist) * flySpeed,
            y: (dy / dist) * flySpeed + 0.035, // 克服下坠保持凌空悬浮飞行
            z: (dz / dist) * flySpeed
          });
        } catch {}
      } else {
        // 保持空中微浮动
        try {
          drone.applyImpulse({ x: 0, y: 0.04, z: 0 });
        } catch {}
      }
    } catch {}
  }

  static #broadcastBossMessage(msg) {
    try {
      world.sendMessage(msg);
    } catch {}
  }
}
