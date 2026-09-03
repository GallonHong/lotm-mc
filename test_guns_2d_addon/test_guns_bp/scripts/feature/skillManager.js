import { RecoilManager } from './recoilManager.js';
import { ShootManager } from './shoot.js';
import { updateActionBar } from './ui.js';
import { fireBullet } from './utils/shootUtils.js';
import { GrenadeEngine } from './grenadeEngine.js';
import { ArcEngine } from './arcEngine.js';
import { EntityDamageCause } from '@minecraft/server';

export class SkillManager {
  static skillCooldowns = new Map();
  static activeOverdrive = new Map();
  static activeSmartAim = new Map();

  static isOverdriveActive(player) {
    return this.activeOverdrive.has(player.id);
  }

  static isSmartAimActive(player, gun) {
    if (!player) return false;
    const item = this.activeSmartAim.get(player.id);
    if (!item) return false;
    if (gun && item.gun && gun.id !== item.gun.id) return false;
    return true;
  }

  static getRemainingCooldown(player) {
    const cd = this.skillCooldowns.get(player.id) || 0;
    return Math.max(0, Math.ceil(cd / 20));
  }

  static tryActivateSkill(player, gun) {
    if (!gun || !gun.hasSkill) return false;

    if (this.isOverdriveActive(player)) return false;

    const remainingTicks = this.skillCooldowns.get(player.id) || 0;
    if (remainingTicks > 0) {
      const sec = Math.ceil(remainingTicks / 20);
      updateActionBar(player, `§c⚠ 【${gun.skillName}】技能冷却中 (剩余 ${sec}s)!`);
      try {
        player.dimension.playSound('random.click', player.location, { volume: 0.6, pitch: 0.8 });
      } catch {}
      return false;
    }

    const cooldownTicks = Math.floor((gun.skillCooldownSec || 25) * 20);
    this.skillCooldowns.set(player.id, cooldownTicks);

    // Skill 1: MP7 Overdrive Fury (暴走狂潮 - Apex 极速过载音效与视觉)
    if (gun.id === 'test_gun:vector') {
      const durationTicks = Math.floor((gun.skillDurationSec || 5.0) * 20);
      this.activeOverdrive.set(player.id, {
        remainingTicks: durationTicks,
        totalTicks: durationTicks,
        gun: gun
      });
      try {
        const pLoc = player.location;
        player.addEffect('speed', durationTicks, { amplifier: 1, showParticles: false });
        // 播放专属 Apex 战术过载激活音效组合
        player.dimension.playSound('test_gun.vector_skill', pLoc, { volume: 2.0, pitch: 1.0 });
        player.dimension.playSound('beacon.power', pLoc, { volume: 1.5, pitch: 1.3 });
        player.dimension.playSound('respawn_anchor.charge', pLoc, { volume: 1.5, pitch: 1.2 });
        player.dimension.spawnParticle('minecraft:sonic_explosion', {
          x: pLoc.x,
          y: pLoc.y + 1,
          z: pLoc.z
        });
      } catch {}
      updateActionBar(player, '§4🔥【暴走狂潮 OVERDRIVE】5秒无限子弹激光极速扫射开启!');
      return true;
    }

    // Skill 2: MGL Saturation Barrage
    if (gun.id === 'test_gun:mgl') {
      try {
        player.dimension.playSound('mob.ghast.fireball', player.location, { volume: 1.5, pitch: 1.2 });
        player.dimension.playSound('random.explode', player.location, { volume: 1.0, pitch: 1.4 });
        GrenadeEngine.launchGrenade(player, gun);
        GrenadeEngine.launchGrenade(player, gun);
        GrenadeEngine.launchGrenade(player, gun);
      } catch {}
      updateActionBar(player, '§6💣【饱和轰炸 SATURATION】三连发集束破片爆轰发射!§r');
      return true;
    }

    // Skill 3: Tesla EMP Storm
    if (gun.id === 'test_gun:arc_emitter') {
      try {
        const dim = player.dimension;
        const loc = player.location;
        dim.playSound('mob.lightning.thunder', loc, { volume: 1.5, pitch: 1.5 });
        dim.spawnParticle('minecraft:sonic_explosion', { x: loc.x, y: loc.y + 1, z: loc.z });
        dim.spawnParticle('test_gun:arc_spark', { x: loc.x, y: loc.y + 1, z: loc.z });

        const nearby = dim.getEntities({ location: loc, maxDistance: 10 });
        for (const ent of nearby) {
          if (!ent || !ent.isValid() || ent.id === player.id) continue;
          if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb') continue;

          try {
            ent.addEffect('slowness', 60, { amplifier: 4, showParticles: true });
            ent.addEffect('weakness', 60, { amplifier: 2, showParticles: false });
            ent.setOnFire(3, true);
          } catch {}
        }
      } catch {}
      updateActionBar(player, '§b⚡【EMP过载风暴】360°全方位电磁瘫痪脉冲已释放!§r');
      return true;
    }

    // Skill 4: DBSS Inferno Dragon Breath & 100m Auto-Aim Lock
    if (gun.id === 'test_gun:dbss') {
      const durationTicks = Math.floor((gun.skillDurationSec || 30.0) * 20);
      this.activeSmartAim.set(player.id, {
        remainingTicks: durationTicks,
        totalTicks: durationTicks,
        gun: gun
      });

      try {
        const dim = player.dimension;
        const pLoc = player.location;
        const head = player.getHeadLocation();
        const view = player.getViewDirection();

        // 1. 原版音效：烈焰呼啸、烈火点燃、信标充能
        dim.playSound('mob.ghast.fireball', pLoc, { volume: 1.8, pitch: 0.9 });
        dim.playSound('fire.ignite', pLoc, { volume: 1.5, pitch: 1.1 });
        dim.playSound('beacon.power', pLoc, { volume: 1.2, pitch: 1.3 });

        // 2. 原版火焰粒子喷射（向前 10 格锥形烈焰流）
        for (let d = 1.0; d <= 10.0; d += 0.8) {
          const spread = (d / 10.0) * 1.6;
          const cx = head.x + view.x * d;
          const cy = head.y + view.y * d - 0.15;
          const cz = head.z + view.z * d;
          for (let p = 0; p < 4; p++) {
            const rx = (Math.random() - 0.5) * spread;
            const ry = (Math.random() - 0.5) * spread;
            const rz = (Math.random() - 0.5) * spread;
            dim.spawnParticle('minecraft:basic_flame_particle', { x: cx + rx, y: cy + ry, z: cz + rz });
          }
          dim.spawnParticle('minecraft:mobflame_single', { x: cx, y: cy, z: cz });
          if (d % 2 === 0) dim.spawnParticle('minecraft:lava_particle', { x: cx, y: cy, z: cz });
        }

        // 3. 前方锥形范围点燃敌人 5 秒并造成瞬发范围火焰灼烧真实伤害
        const frontal = dim.getEntities({ location: pLoc, maxDistance: 12 });
        for (const ent of frontal) {
          if (!ent || !ent.isValid() || ent.id === player.id) continue;
          if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb' || ent.typeId === 'sapi:secure_safe') continue;
          if (ent.typeId === 'minecraft:player') continue;
          const dx = ent.location.x - head.x;
          const dy = ent.location.y - head.y;
          const dz = ent.location.z - head.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > 12) continue;
          const dot = (dx * view.x + dy * view.y + dz * view.z) / (dist || 1);
          if (dot >= 0.35) {
            try { ent.setOnFire(5, true); } catch {}
            try { ent.applyDamage(35, { damagingEntity: player, cause: EntityDamageCause.fireTick }); } catch {}
            try { dim.spawnParticle('minecraft:lava_particle', ent.location); } catch {}
          }
        }

        // 4. 扫描周围 100 格内生物并标记 30s
        const scanned = dim.getEntities({ location: pLoc, maxDistance: 100 });
        let markCount = 0;
        for (const ent of scanned) {
          if (!ent || !ent.isValid() || ent.id === player.id) continue;
          if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb' || ent.typeId === 'sapi:secure_safe') continue;
          if (ent.typeId === 'minecraft:player') continue;
          markCount++;
          try { dim.spawnParticle('minecraft:mobflame_single', { x: ent.location.x, y: ent.location.y + 1.2, z: ent.location.z }); } catch {}
        }
        updateActionBar(player, `§6🔥【红莲龙息】烈焰喷射！已锁定周围 ${markCount} 个目标！30s 自瞄攻击激活！§r`);
      } catch (err) {
        console.warn('[DBSS Skill] error:', err);
      }
      return true;
    }

    return false;
  }

  static executeSmartAimShot(player, gun) {
    if (!player || !player.isValid()) return;
    const dim = player.dimension;
    const pLoc = player.location;
    const head = player.getHeadLocation();
    const view = player.getViewDirection();

    // 100 格内自瞄目标优选
    const nearby = dim.getEntities({ location: pLoc, maxDistance: 100 });
    let bestTarget = null;
    let bestScore = -Infinity;

    for (const ent of nearby) {
      if (!ent || !ent.isValid() || ent.id === player.id) continue;
      if (ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb' || ent.typeId === 'sapi:secure_safe') continue;
      if (ent.typeId === 'minecraft:player') continue;

      const dx = ent.location.x - head.x;
      const dy = ent.location.y - head.y;
      const dz = ent.location.z - head.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 0.2 || dist > 100) continue;

      const dot = (dx * view.x + dy * view.y + dz * view.z) / dist;
      const score = dot * 60 - dist * 0.4;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = ent;
      }
    }

    if (!bestTarget) {
      fireBullet(player, gun);
      return;
    }

    // 瞬间直结全额霰弹伤害（无实体弹道）
    const pelletCount = 8;
    const totalDamage = Number(gun.stats?.damage || 12.0) * pelletCount;
    try {
      bestTarget.applyDamage(totalDamage, { damagingEntity: player, cause: EntityDamageCause.entityAttack });
    } catch {}

    // 原版火焰与暴击粒子连线
    const tLoc = bestTarget.location;
    const steps = 18;
    for (let i = 1; i <= steps; i++) {
      const ratio = i / steps;
      const px = head.x + (tLoc.x - head.x) * ratio;
      const py = (head.y - 0.15) + ((tLoc.y + 1.0) - (head.y - 0.15)) * ratio;
      const pz = head.z + (tLoc.z - head.z) * ratio;
      try {
        dim.spawnParticle('minecraft:basic_flame_particle', { x: px, y: py, z: pz });
        if (i % 3 === 0) dim.spawnParticle('minecraft:crit', { x: px, y: py, z: pz });
      } catch {}
    }

    // 目标命中原版粒子与音效反馈
    try {
      dim.spawnParticle('minecraft:lava_particle', { x: tLoc.x, y: tLoc.y + 1.0, z: tLoc.z });
      dim.spawnParticle('minecraft:large_explosion', { x: tLoc.x, y: tLoc.y + 1.0, z: tLoc.z });
      dim.playSound('random.explode', tLoc, { volume: 1.2, pitch: 1.8 });
      dim.playSound('fire.ignite', tLoc, { volume: 1.0, pitch: 1.2 });
    } catch {}
  }

  static tick(player, currentGun) {
    const cd = this.skillCooldowns.get(player.id) || 0;
    if (cd > 0) {
      this.skillCooldowns.set(player.id, cd - 1);
    }

    const overdrive = this.activeOverdrive.get(player.id);
    if (overdrive) {
      if (!currentGun || currentGun.id !== overdrive.gun.id) {
        this.activeOverdrive.delete(player.id);
        updateActionBar(player, '§7[暴走狂潮已取消 / Overdrive Cancelled]§r');
      } else {
        overdrive.remainingTicks--;
        const sec = (overdrive.remainingTicks / 20).toFixed(1);

        fireBullet(player, overdrive.gun);

        if (overdrive.gun.shootSound) {
          try {
            player.dimension.playSound(overdrive.gun.shootSound, player.location, {
              volume: 1.0,
              pitch: 1.1 + (Math.random() - 0.5) * 0.2
            });
          } catch {}
        }

        updateActionBar(player, `§4🔥【暴走狂潮 OVERDRIVE】(剩余 ${sec}s) §e⚡ 无限子弹极速扫射!§r`);

        if (overdrive.remainingTicks <= 0) {
          this.activeOverdrive.delete(player.id);
          updateActionBar(player, '§7[暴走狂潮结束 - 枪管冷却中]§r');
        }
      }
    }

    const smartAim = this.activeSmartAim.get(player.id);
    if (smartAim) {
      if (!currentGun || currentGun.id !== smartAim.gun.id) {
        this.activeSmartAim.delete(player.id);
        updateActionBar(player, '§7[锁敌自瞄已取消 / Auto-Aim Cancelled]§r');
      } else {
        smartAim.remainingTicks--;
        const sec = Math.ceil(smartAim.remainingTicks / 20);
        if (smartAim.remainingTicks % 20 === 0) {
          updateActionBar(player, `§6🔥【红莲龙息·自瞄打击中】(剩余 ${sec}s) · 100格锁定中§r`);
        }
        if (smartAim.remainingTicks <= 0) {
          this.activeSmartAim.delete(player.id);
          updateActionBar(player, '§7[红莲锁敌自瞄结束 - 枪管冷却中]§r');
        }
      }
    }
  }

  static clearPlayer(playerId) {
    this.skillCooldowns.delete(playerId);
    this.activeOverdrive.delete(playerId);
    this.activeSmartAim.delete(playerId);
  }
}
