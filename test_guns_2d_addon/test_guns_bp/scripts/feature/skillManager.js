import { RecoilManager } from './recoilManager.js';
import { ShootManager } from './shoot.js';
import { updateActionBar } from './ui.js';
import { fireBullet } from './utils/shootUtils.js';
import { GrenadeEngine } from './grenadeEngine.js';
import { ArcEngine } from './arcEngine.js';

export class SkillManager {
  static skillCooldowns = new Map();
  static activeOverdrive = new Map();

  static isOverdriveActive(player) {
    return this.activeOverdrive.has(player.id);
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

    return false;
  }

  static tick(player, currentGun) {
    const cd = this.skillCooldowns.get(player.id) || 0;
    if (cd > 0) {
      this.skillCooldowns.set(player.id, cd - 1);
    }

    const overdrive = this.activeOverdrive.get(player.id);
    if (!overdrive) return;

    if (!currentGun || currentGun.id !== overdrive.gun.id) {
      this.activeOverdrive.delete(player.id);
      updateActionBar(player, '§7[暴走狂潮已取消 / Overdrive Cancelled]§r');
      return;
    }

    overdrive.remainingTicks--;
    const sec = (overdrive.remainingTicks / 20).toFixed(1);

    fireBullet(player, overdrive.gun);
    ShootManager.deductDurability(player, overdrive.gun);
    RecoilManager.applyRecoil(player, overdrive.gun);

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

  static clearPlayer(playerId) {
    this.skillCooldowns.delete(playerId);
    this.activeOverdrive.delete(playerId);
  }
}
