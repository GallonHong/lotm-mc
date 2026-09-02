import { world, system, ItemStack } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { SpawnDirector } from "./spawnDirector.js";
import { CombatAI } from "./combatAI.js";
import { LootManager } from "./loot.js";
import { WorldEventDirector } from "./events.js";
import { AdminMenu, isAdmin } from "./admin.js";

console.warn("[Apocalypse] Mobs & SpawnDirector v0.2.4 initializing...");

function subscribe(signal, label, handler) {
  if (!signal || typeof signal.subscribe !== "function") {
    console.warn(`[Apocalypse] ${label} event unavailable; skipped.`);
    return false;
  }
  try { signal.subscribe(handler); return true; }
  catch (error) { console.warn(`[Apocalypse] ${label} subscribe failed: ${error}`); return false; }
}

function drop(dead) {
  const chance = Math.random();
  try {
    if (dead.typeId === "apoc:raider_rifleman") {
      dead.dimension.spawnItem(new ItemStack("minecraft:gunpowder", 2 + Math.floor(Math.random() * 4)), dead.location);
      if (chance < 0.2) {
        try { dead.dimension.spawnItem(new ItemStack("test_gun:ammo_rifle", 8 + Math.floor(Math.random() * 9)), dead.location); }
        catch { dead.dimension.spawnItem(new ItemStack("minecraft:iron_ingot", 2), dead.location); }
      }
    } else if (dead.hasTag("apoc_hostile")) {
      if (chance < 0.35) dead.dimension.spawnItem(new ItemStack("minecraft:rotten_flesh", 1 + Math.floor(Math.random() * 3)), dead.location);
      if (chance < 0.08) dead.dimension.spawnItem(new ItemStack("minecraft:iron_nugget", 1 + Math.floor(Math.random() * 3)), dead.location);
    }
  } catch {}
}

SpawnDirector.registerVanillaSuppression();
try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}

const lootAfterSubscribed = subscribe(world.afterEvents?.playerInteractWithBlock, "after playerInteractWithBlock", event => {
  try { LootManager.interact(event.player, event.block); } catch (error) { console.warn(`[Apocalypse][Loot] interaction error: ${error}`); }
});
if (!lootAfterSubscribed) {
  subscribe(world.beforeEvents?.playerInteractWithBlock, "before playerInteractWithBlock", event => {
    const player = event.player;
    const block = event.block;
    system.run(() => {
      try { LootManager.interact(player, block); } catch (error) { console.warn(`[Apocalypse][Loot] interaction error: ${error}`); }
    });
  });
}

subscribe(world.afterEvents?.projectileHitEntity, "projectileHitEntity", event => {
  try {
    if (event.projectile?.typeId !== "apoc:toxic_spit") return;
    const target = event.getEntityHit()?.entity;
    if (target) target.addEffect("slowness", 60, { amplifier: 1, showParticles: true });
  } catch {}
});

subscribe(world.afterEvents?.entityDie, "entityDie", event => drop(event.deadEntity));

subscribe(system.afterEvents?.scriptEventReceive, "scriptEventReceive", event => {
  const player = event.sourceEntity;
  if (!player || player.typeId !== "minecraft:player" || !isAdmin(player)) return;
  const id = String(event.id || "").toLowerCase();
  const message = String(event.message || "").trim().toLowerCase();
  if (id === "apoc:menu") AdminMenu.open(player);
  else if (id === "apoc:event") {
    player.sendMessage(WorldEventDirector.trigger(player, true) ? "§a动态伏击已触发。" : "§c触发失败，请离开安全区或等待当前事件完成。");
  } else if (id === "apoc:spawn") {
    const key = ["basic", "runner", "spitter", "mutant", "heavy", "raider"].includes(message) ? message : "basic";
    player.sendMessage(SpawnDirector.spawnNearPlayer(player, key, ["apoc_admin_spawn"], 5, 8) ? `§a已生成 ${key}。` : "§c生成失败。");
  }
});

subscribe(world.beforeEvents?.chatSend, "chatSend", event => {
  if (String(event.message || "").trim().toLowerCase() !== "!apoc") return;
  event.cancel = true;
  const player = event.sender;
  system.run(() => AdminMenu.open(player));
});

system.runInterval(() => {
  try { CombatAI.tick(); } catch (error) { console.warn(`[Apocalypse][AI] tick error: ${error}`); }
  try { SpawnDirector.processExternalRequests(); } catch (error) { console.warn(`[Apocalypse][SpawnBus] tick error: ${error}`); }
}, CONFIG.aiInterval);

system.runInterval(() => {
  try { SpawnDirector.tick(); } catch (error) { console.warn(`[Apocalypse][Spawn] tick error: ${error}`); }
}, CONFIG.spawnInterval);

system.runInterval(() => {
  try { SpawnDirector.guardSafeZones(); } catch (error) { console.warn(`[Apocalypse][Guard] tick error: ${error}`); }
}, CONFIG.guardInterval);

system.runInterval(() => {
  try { SpawnDirector.cleanupFarEntities(); } catch {}
  try { WorldEventDirector.tick(); } catch (error) { console.warn(`[Apocalypse][Event] tick error: ${error}`); }
}, 40);

system.runInterval(() => {
  try { WorldEventDirector.maybeTrigger(); } catch (error) { console.warn(`[Apocalypse][Event] trigger check error: ${error}`); }
}, CONFIG.eventCheckInterval);

system.runInterval(() => {
  try { world.setDynamicProperty(CONFIG.heartbeatKey, Date.now()); } catch {}
}, 200);

console.warn("[Apocalypse] SpawnDirector, ZoneRegistry, ranged AI, LootNode and world events initialized.");

/**
 * Apocalypse Boss AI & Combat Skills Engine
 */
class BossSkillEngine {
  static bossCooldowns = new Map(); // entityId -> { lastSkillTick, phase }

  static tick() {
    const currentTick = system.currentTick;
    
    // 寻找大世界中的活跃 Boss
    for (const player of world.getAllPlayers()) {
      if (!player || !player.isValid()) continue;
      const dim = player.dimension;
      
      const bosses = dim.getEntities({
        families: ['apoc_boss'],
        location: player.location,
        maxDistance: 48
      });

      for (const boss of bosses) {
        if (!boss || !boss.isValid()) continue;
        
        const bId = boss.id;
        const bType = boss.typeId;
        const info = this.bossCooldowns.get(bId) || { lastSkillTick: 0, skillIndex: 0 };
        
        // 每 6 秒 (120 ticks) 判定释放一次战斗技能
        if (currentTick - info.lastSkillTick < 120) continue;
        
        // 获取附近目标
        const targets = dim.getEntities({
          location: boss.location,
          maxDistance: 24,
          families: ['player']
        });
        
        if (targets.length === 0) continue;
        const target = targets[0]; // 锁定最近玩家
        
        info.lastSkillTick = currentTick;
        this.bossCooldowns.set(bId, info);

        this.executeBossSkill(boss, bType, target, dim);
      }
    }
  }

  static executeBossSkill(boss, typeId, target, dim) {
    const bLoc = boss.location;
    const tLoc = target.location;
    const dx = tLoc.x - bLoc.x;
    const dz = tLoc.z - bLoc.z;
    const dist = Math.hypot(dx, dz);

    // 1. 变异暴食者 (Mutant Drowned) -> 水龙卷聚怪突刺 + 引雷重击
    if (typeId === 'apoc_boss:mutant_drowned') {
      try {
        // 咆哮蓄力
        dim.playSound('mob.drowned.say', bLoc, { volume: 2.0, pitch: 0.6 });
        dim.spawnParticle('minecraft:water_splash_particle', { x: bLoc.x, y: bLoc.y + 1, z: bLoc.z });

        // 技能1: 深渊水浪吸聚 (漩涡吸怪)
        for (const p of dim.getEntities({ location: bLoc, maxDistance: 16, families: ['player'] })) {
          const pLoc = p.location;
          const pullX = (bLoc.x - pLoc.x) * 0.15;
          const pullZ = (bLoc.z - pLoc.z) * 0.15;
          p.applyImpulse({ x: pullX, y: 0.2, z: pullZ });
          p.onScreenDisplay?.setActionBar?.('§b🌊 变异暴食者 发动了【深海怒涛】漩涡强行吸附!§r');
        }

        // 技能2: 延迟 1 秒后召唤水柱与三叉戟穿刺
        system.runTimeout(() => {
          if (!boss.isValid()) return;
          dim.playSound('item.trident.thunder', bLoc, { volume: 2.5, pitch: 0.9 });
          dim.spawnParticle('minecraft:critical_hit_emitter', { x: bLoc.x, y: bLoc.y + 1.5, z: bLoc.z });

          // 正面锥形水波冲击
          for (const p of dim.getEntities({ location: bLoc, maxDistance: 10, families: ['player'] })) {
            p.applyDamage(8, { cause: 'magic', damagingEntity: boss });
            p.applyKnockback((tLoc.x - bLoc.x) * 0.3, (tLoc.z - bLoc.z) * 0.3, 1.2, 0.4);
          }
        }, 20);
      } catch (e) {}
    }

    // 2. 泰坦巨尸 (Mutant Zombie) -> 大地裂地重震 (Earthquake Smash)
    else if (typeId === 'apoc_boss:mutant_zombie') {
      try {
        dim.playSound('mob.zombie.say', bLoc, { volume: 2.5, pitch: 0.5 });
        dim.playSound('random.anvil_land', bLoc, { volume: 2.0, pitch: 0.7 });
        dim.spawnParticle('minecraft:huge_explosion_emitter', bLoc);

        for (const p of dim.getEntities({ location: bLoc, maxDistance: 12, families: ['player'] })) {
          p.applyDamage(10, { cause: 'entityAttack', damagingEntity: boss });
          p.applyKnockback(0, 0, 0.2, 1.1); // 击飞至空中
          p.addEffect('slowness', 60, { amplifier: 2, showParticles: true });
          p.onScreenDisplay?.setActionBar?.('§c💥 泰坦巨尸 发动【裂地重震】! 行动力受损!§r');
        }
      } catch (e) {}
    }

    // 3. 枯骨巨煞 (Mutant Skeleton) -> 骨刺齐射 (Bone Rain)
    else if (typeId === 'apoc_boss:mutant_skeleton') {
      try {
        dim.playSound('mob.skeleton.say', bLoc, { volume: 2.0, pitch: 0.7 });
        dim.playSound('random.bow', bLoc, { volume: 1.8, pitch: 0.8 });

        // 散射骨刺弹幕
        for (let i = -2; i <= 2; i++) {
          const angle = Math.atan2(dz, dx) + (i * 0.2);
          const spdX = Math.cos(angle) * 1.5;
          const spdZ = Math.sin(angle) * 1.5;

          const arrow = dim.spawnEntity('minecraft:arrow', { x: bLoc.x, y: bLoc.y + 2.0, z: bLoc.z });
          const proj = arrow.getComponent('minecraft:projectile');
          if (proj) {
            proj.owner = boss;
            proj.shoot({ x: spdX, y: 0.1, z: spdZ });
          }
        }
        target.onScreenDisplay?.setActionBar?.('§7🏹 枯骨巨煞 发动了【穿甲骨箭齐射】!§r');
      } catch (e) {}
    }

    // 4. 恶疫憎恶 (Mutant Lobber) -> 剧毒酸液轰炸 (Acid Bomb)
    else if (typeId === 'apoc_boss:mutant_lobber') {
      try {
        dim.playSound('random.bow', bLoc, { volume: 1.5, pitch: 0.6 });
        dim.playSound('random.fizz', tLoc, { volume: 2.0, pitch: 0.8 });

        dim.spawnParticle('minecraft:dragon_breath_fire', tLoc);
        for (const p of dim.getEntities({ location: tLoc, maxDistance: 5, families: ['player'] })) {
          p.addEffect('poison', 100, { amplifier: 1, showParticles: true });
          p.addEffect('weakness', 100, { amplifier: 1, showParticles: true });
          p.applyDamage(6, { cause: 'magic', damagingEntity: boss });
          p.onScreenDisplay?.setActionBar?.('§2🤢 受到 恶疫憎恶 剧毒酸液腐蚀!§r');
        }
      } catch (e) {}
    }

    // 5. 虚空漫游者 (Mutant Enderman) -> 空间瞬移背刺 (Void Blink)
    else if (typeId === 'apoc_boss:mutant_enderman') {
      try {
        dim.playSound('mob.endermen.portal', bLoc, { volume: 2.0, pitch: 0.8 });
        dim.spawnParticle('minecraft:portal_reverse_particle', bLoc);

        // 瞬间折跃到目标身后
        const behindPos = {
          x: tLoc.x - (dx / Math.max(0.1, dist)) * 2.0,
          y: tLoc.y,
          z: tLoc.z - (dz / Math.max(0.1, dist)) * 2.0
        };
        boss.teleport(behindPos);

        dim.playSound('mob.endermen.hit', behindPos, { volume: 2.0, pitch: 1.0 });
        dim.spawnParticle('minecraft:camera_shoot_explosion', behindPos);

        target.applyDamage(12, { cause: 'entityAttack', damagingEntity: boss });
        target.applyKnockback(dx * 0.2, dz * 0.2, 0.8, 0.3);
        target.onScreenDisplay?.setActionBar?.('§5🔮 虚空漫游者 发动了【虚空折跃背刺】!§r');
      } catch (e) {}
    }

    // 6. 钢铁终结者 (Mutant Iron Golem) -> 地刺突击 (Spike Burst)
    else if (typeId === 'apoc_boss:mutant_iron_golem') {
      try {
        dim.playSound('mob.irongolem.hit', bLoc, { volume: 2.5, pitch: 0.6 });
        dim.playSound('random.anvil_land', bLoc, { volume: 2.5, pitch: 0.5 });
        dim.spawnParticle('minecraft:huge_explosion_emitter', bLoc);

        for (const p of dim.getEntities({ location: bLoc, maxDistance: 10, families: ['player'] })) {
          p.applyDamage(14, { cause: 'contact', damagingEntity: boss });
          p.applyKnockback(0, 0, 0, 1.3);
          p.onScreenDisplay?.setActionBar?.('§6🛡️ 钢铁终结者 发动【合金地刺突刺】重击震飞!§r');
        }
      } catch (e) {}
    }

    // 7. 警笛头 (Siren Head) -> 防空警报音爆冲击 + 精神震慑耳鸣 (已移除失明与黑暗)
    else if (typeId === 'apoc_boss:siren_head') {
      try {
        dim.playSound('sirenhead.siren', bLoc, { volume: 4.0, pitch: 1.0 });
        dim.playSound('sirenhead.screech', bLoc, { volume: 3.5, pitch: 0.9 });
        dim.spawnParticle('minecraft:sonic_explosion', { x: bLoc.x, y: bLoc.y + 7.5, z: bLoc.z });

        for (const p of dim.getEntities({ location: bLoc, maxDistance: 32, families: ['player'] })) {
          p.addEffect('slowness', 80, { amplifier: 1, showParticles: true });
          p.applyDamage(8, { cause: 'sonicBoom', damagingEntity: boss });
          try { p.runCommandAsync('camerashake add @s 0.25 0.40 rotational'); } catch {}
          p.onScreenDisplay?.setActionBar?.('§4🚨 警笛头 释放了【致命防空音爆】! 受到强力音波震慑!§r');
        }
      } catch (e) {}
    }

    // 8. 雾中人 (The Fog Man) -> 迷雾突袭 + 暗影破防撕咬 (原版环境迷雾环绕)
    else if (typeId === 'apoc_boss:fog_man') {
      try {
        dim.playSound('mob.endermen.stare', bLoc, { volume: 2.0, pitch: 0.5 });
        dim.playSound('mob.wither.shoot', bLoc, { volume: 1.5, pitch: 0.8 });
        
        // 生成大量浓厚迷雾烟尘粒子
        for (let i = 0; i < 4; i++) {
          const offX = (Math.random() - 0.5) * 6;
          const offZ = (Math.random() - 0.5) * 6;
          dim.spawnParticle('minecraft:campfire_smoke_particle', { x: bLoc.x + offX, y: bLoc.y + 1, z: bLoc.z + offZ });
        }

        // 给附近玩家施加原版环境迷雾效果与氛围提示
        for (const p of dim.getEntities({ location: bLoc, maxDistance: 32, families: ['player'] })) {
          try {
            p.runCommandAsync('fog @s push apoc_boss:fog "tmftf_fog"');
            // 8 秒后自动淡化移除迷雾
            system.runTimeout(() => {
              try { p.runCommandAsync('fog @s pop "tmftf_fog"'); } catch {}
            }, 160);
          } catch {}
        }

        // 暗影冲刺突袭至玩家身前
        const rushPos = {
          x: tLoc.x - (dx / Math.max(0.1, dist)) * 1.5,
          y: tLoc.y,
          z: tLoc.z - (dz / Math.max(0.1, dist)) * 1.5
        };
        boss.teleport(rushPos);

        target.applyDamage(6, { cause: 'entityAttack', damagingEntity: boss });
        target.addEffect('weakness', 100, { amplifier: 1, showParticles: true });
        target.onScreenDisplay?.setActionBar?.('§8🌫️ 浓雾降临! 雾中人 发动了【暗影破防突袭】!§r');
      } catch (e) {}
    }

    // 9. 山羊人 (The Goatman) -> 野性狂暴冲撞 + 恶魔践踏
    else if (typeId === 'apoc_boss:goatman') {
      try {
        dim.playSound('mob.ravager.roar', bLoc, { volume: 2.5, pitch: 1.2 });
        dim.spawnParticle('minecraft:large_explosion', bLoc);

        // 强力野性践踏与击飞
        for (const p of dim.getEntities({ location: bLoc, maxDistance: 8, families: ['player'] })) {
          p.applyDamage(7, { cause: 'entityAttack', damagingEntity: boss });
          p.applyKnockback(dx * 0.4, dz * 0.4, 1.4, 0.5);
          p.addEffect('slowness', 60, { amplifier: 1, showParticles: true });
          p.onScreenDisplay?.setActionBar?.('§c🐐 山羊人 发动了【野性狂暴冲撞】! 强行击飞震退!§r');
        }
      } catch (e) {}
    }
  }
}

// 每 10 刻运行一次 Boss AI 技能轮询
system.runInterval(() => {
  try {
    BossSkillEngine.tick();
  } catch (e) {}
}, 10);
