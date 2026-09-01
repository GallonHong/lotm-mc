import { world, system, ItemStack, EntityDamageCause } from "@minecraft/server";

export class BossEngine {
  static #bossStates = new Map(); // entityId -> BossState
  static #empStrikes = [];        // active delayed EMP strikes

  /**
   * 20 TPS Boss 状态机与多阶段战斗逻辑
   */
  static onTick() {
    const currentTick = system.currentTick;
    const allPlayers = world.getAllPlayers();
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

      const healthComp = boss.getComponent("minecraft:health");
      if (!healthComp) continue;

      const currentHp = healthComp.currentValue;
      const maxHp = healthComp.effectiveMax || 12000;
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

      // 阶段转换判定
      if (hpRatio <= 0.30 && state.phase < 3) {
        state.phase = 3;
        this.#broadcastBossMessage("§4⚡【机械泰坦】进入阶段三：【终焉超频自毁狂暴态】！移速暴增，全核心过载！");
        boss.dimension.playSound("mob.wither.spawn", boss.location, { volume: 2.0, pitch: 0.8 });
      } else if (hpRatio <= 0.70 && state.phase < 2) {
        state.phase = 2;
        this.#broadcastBossMessage("§e⚡【机械泰坦】进入阶段二：【等离子重构态】！开启纳米护盾并部署自爆无人机！");
        this.#triggerPhase2ShieldAndDrones(boss);
      }

      // 广播血条 HUD
      this.#renderBossHud(boss, currentHp, maxHp, hpRatio, state.phase, allPlayers);

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
        this.#fireGatlingBarrage(boss, allPlayers);
      }

      // 技能 2: 地动山摇践踏 (每 11 秒)
      if (currentTick - state.lastStompTick >= 220) {
        state.lastStompTick = currentTick;
        this.#performSeismicStomp(boss, allPlayers);
      }

      // 技能 3: 轨道 EMP 离子雷暴 (阶段2和阶段3每 14 秒)
      if (state.phase >= 2 && currentTick - state.lastEmpTick >= 280) {
        state.lastEmpTick = currentTick;
        this.#callOrbitalEmpStrike(boss, allPlayers, currentTick);
      }
    }
  }

  /**
   * 广播屏幕上方全景 Boss 状态条
   */
  static #renderBossHud(boss, currentHp, maxHp, hpRatio, phase, allPlayers) {
    const bossLoc = boss.location;
    const barFill = Math.max(0, Math.min(20, Math.round(hpRatio * 20)));
    const barColor = hpRatio > 0.7 ? "§a" : (hpRatio > 0.3 ? "§e" : "§c");
    const bar = barColor + "█".repeat(barFill) + "§8" + "░".repeat(20 - barFill);

    const phaseNames = ["", "§e[阶段I: 重装压制]", "§6[阶段II: 等离子重构]", "§4[阶段III: 终焉超频]"];
    const title = `§c☠【机械泰坦歼灭者】 ${phaseNames[phase]} §f[${bar}§f] §f${currentHp}§7/§e${maxHp} HP`;

    for (const p of allPlayers) {
      if (!p || !p.isValid()) continue;
      const pLoc = p.location;
      const dist = Math.hypot(pLoc.x - bossLoc.x, pLoc.y - bossLoc.y, pLoc.z - bossLoc.z);
      if (dist <= 50) {
        try {
          p.onScreenDisplay?.setActionBar?.(title);
        } catch {}
      }
    }
  }

  /**
   * 技能 1: 30 连发机枪重火网弹幕扫射
   */
  static #fireGatlingBarrage(boss, allPlayers) {
    const dim = boss.dimension;
    const bLoc = boss.location;
    const muzzle = { x: bLoc.x, y: bLoc.y + 2.0, z: bLoc.z };

    // 寻找 32 格内最近玩家
    let target = null;
    let minDist = 36;
    for (const p of allPlayers) {
      if (!p || !p.isValid()) continue;
      const d = Math.hypot(p.location.x - bLoc.x, p.location.y - bLoc.y, p.location.z - bLoc.z);
      if (d < minDist) {
        minDist = d;
        target = p;
      }
    }

    if (!target) return;

    dim.playSound("random.explode", bLoc, { volume: 1.2, pitch: 1.6 });

    // 连续发射 15 发高速重机枪子弹 (每 2 tick 射一发)
    for (let i = 0; i < 15; i++) {
      system.runTimeout(() => {
        if (!boss || !boss.isValid() || !target || !target.isValid()) return;

        const curMuzzle = { x: boss.location.x, y: boss.location.y + 2.0, z: boss.location.z };
        const tLoc = target.location;
        const targetHead = { x: tLoc.x, y: tLoc.y + 1.2, z: tLoc.z };

        const dx = targetHead.x - curMuzzle.x + (Math.random() - 0.5) * 1.2;
        const dy = targetHead.y - curMuzzle.y + (Math.random() - 0.5) * 0.8;
        const dz = targetHead.z - curMuzzle.z + (Math.random() - 0.5) * 1.2;
        const dist = Math.hypot(dx, dy, dz) || 1.0;

        const normDir = { x: dx / dist, y: dy / dist, z: dz / dist };

        // 绘制弹幕射线
        const steps = Math.min(Math.floor(dist / 0.8), 35);
        for (let s = 1; s <= steps; s++) {
          const frac = s / steps;
          dim.spawnParticle("minecraft:basic_flame_particle", {
            x: curMuzzle.x + dx * frac,
            y: curMuzzle.y + dy * frac,
            z: curMuzzle.z + dz * frac
          });
        }

        dim.playSound("random.explode", curMuzzle, { volume: 0.6, pitch: 1.9 });

        // 伤害检测
        const finalImpact = { x: curMuzzle.x + dx, y: curMuzzle.y + dy, z: curMuzzle.z + dz };
        const hits = dim.getEntities({ location: finalImpact, maxDistance: 1.8 });
        for (const h of hits) {
          if (h && h.isValid() && h.typeId === "minecraft:player") {
            h.applyDamage(10, { cause: EntityDamageCause.entityAttack, damagingEntity: boss });
          }
        }
      }, i * 2);
    }
  }

  /**
   * 技能 2: 地动山摇近战践踏 (击飞 + 24 HP 震荡波)
   */
  static #performSeismicStomp(boss, allPlayers) {
    const dim = boss.dimension;
    const bLoc = boss.location;
    const stompCenter = { x: bLoc.x, y: bLoc.y + 0.2, z: bLoc.z };

    try {
      dim.playSound("random.anvil_land", bLoc, { volume: 1.5, pitch: 0.5 });
      dim.playSound("random.explode", bLoc, { volume: 1.2, pitch: 0.8 });
      dim.spawnParticle("minecraft:sonic_explosion", stompCenter);
      dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", stompCenter);

      for (const p of allPlayers) {
        if (!p || !p.isValid()) continue;
        const pLoc = p.location;
        const d = Math.hypot(pLoc.x - bLoc.x, pLoc.y - bLoc.y, pLoc.z - bLoc.z);
        if (d <= 7.0) {
          // 向上震飞 1.1 + 水平击退
          const dx = pLoc.x - bLoc.x || 1.0;
          const dz = pLoc.z - bLoc.z || 1.0;
          const hDist = Math.hypot(dx, dz);

          p.applyImpulse({
            x: (dx / hDist) * 0.6,
            y: 0.95,
            z: (dz / hDist) * 0.6
          });

          p.applyDamage(24, { cause: EntityDamageCause.entityAttack, damagingEntity: boss });
          p.onScreenDisplay?.setActionBar?.("§c💥 受到【机械泰坦】地动山摇震飞践踏 (-24 HP)！");
        }
      }
    } catch {}
  }

  /**
   * 技能 3: 轨道 EMP 离子雷暴打击
   */
  static #callOrbitalEmpStrike(boss, allPlayers, currentTick) {
    const dim = boss.dimension;
    const targets = allPlayers.filter((p) => p && p.isValid());
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

        // 预警光柱特效
        if (currentTick < emp.detonateTick) {
          for (let y = 0; y < 12; y += 2) {
            dim.spawnParticle("minecraft:endrod", { x: emp.pos.x, y: emp.pos.y + y, z: emp.pos.z });
          }
          remaining.push(emp);
        } else {
          // 引爆雷暴
          dim.playSound("ambient.weather.thunder0", emp.pos, { volume: 1.5, pitch: 1.0 });
          dim.playSound("mob.warden.sonic_boom", emp.pos, { volume: 1.5, pitch: 1.2 });
          dim.spawnParticle("minecraft:sonic_explosion", emp.pos);
          dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", emp.pos);

          const nearby = dim.getEntities({ location: emp.pos, maxDistance: 4.5 });
          for (const ent of nearby) {
            if (ent && ent.isValid() && ent.typeId === "minecraft:player") {
              ent.applyDamage(35, { cause: EntityDamageCause.override });
              ent.setOnFire(4, true);
              ent.onScreenDisplay?.setActionBar?.("§c⚡ 受到【轨道 EMP 离子雷暴】直击 (-35 HP 真实伤害)！");
            }
          }
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
      boss.addEffect("absorption", 2400, { amplifier: 30, showParticles: false }); // 1200+ 护盾
      boss.addEffect("resistance", 1200, { amplifier: 1, showParticles: false });

      // 2. 召唤 3 只机械自爆近卫
      for (let i = 0; i < 3; i++) {
        const offset = {
          x: bLoc.x + (i - 1) * 3,
          y: bLoc.y + 1,
          z: bLoc.z + 2
        };
        dim.spawnEntity("apex_boss:drone", offset);
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
          if (ent && ent.isValid() && ent.typeId === "minecraft:player") {
            ent.applyDamage(60, { cause: EntityDamageCause.override });
            const dx = ent.location.x - loc.x || 1.0;
            const dz = ent.location.z - loc.z || 1.0;
            const dist = Math.hypot(dx, dz);
            ent.applyImpulse({ x: (dx / dist) * 1.5, y: 1.2, z: (dz / dist) * 1.5 });
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
  }

  /**
   * 处理自爆近卫无人机自毁
   */
  static handleDroneTick(drone) {
    if (!drone || !drone.isValid()) return;
    const dim = drone.dimension;
    const dLoc = drone.location;

    const nearbyPlayers = dim.getEntities({
      location: dLoc,
      maxDistance: 2.0
    });

    for (const p of nearbyPlayers) {
      if (p && p.isValid() && p.typeId === "minecraft:player") {
        dim.playSound("random.explode", dLoc, { volume: 1.0, pitch: 1.2 });
        dim.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", dLoc);
        p.applyDamage(30, { cause: EntityDamageCause.override });
        drone.kill();
        break;
      }
    }
  }

  static #broadcastBossMessage(msg) {
    try {
      world.sendMessage(msg);
    } catch {}
  }
}
