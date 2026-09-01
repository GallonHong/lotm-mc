import { updateActionBar } from './ui.js';
import { fireBullet } from './utils/shootUtils.js';

export class SkillManager {
  static skillCooldowns = new Map(); // playerId -> remainingCooldownTicks
  static activeOverdrive = new Map(); // playerId -> { remainingTicks, totalTicks, gun }

  static isOverdriveActive(player) {
    return this.activeOverdrive.has(player.id);
  }

  static getRemainingCooldown(player) {
    const cd = this.skillCooldowns.get(player.id) || 0;
    return Math.max(0, Math.ceil(cd / 20));
  }

  static tryActivateSkill(player, gun) {
    if (!gun || !gun.hasSkill) return false;

    // Check if already active
    if (this.isOverdriveActive(player)) {
      return false;
    }

    // Check cooldown
    const remainingTicks = this.skillCooldowns.get(player.id) || 0;
    if (remainingTicks > 0) {
      const sec = Math.ceil(remainingTicks / 20);
      updateActionBar(player, `§c⚠ 【${gun.skillName}】技能冷却中 (剩余 ${sec}s)!`);
      try {
        player.dimension.playSound('random.click', player.location, { volume: 0.6, pitch: 0.8 });
      } catch {}
      return false;
    }

    // Activate Overdrive
    const durationTicks = Math.floor((gun.skillDurationSec || 5.0) * 20); // 100 ticks (5s)
    const cooldownTicks = Math.floor((gun.skillCooldownSec || 30) * 20); // 600 ticks (30s)

    this.activeOverdrive.set(player.id, {
      remainingTicks: durationTicks,
      totalTicks: durationTicks,
      gun: gun
    });

    this.skillCooldowns.set(player.id, cooldownTicks);

    // Apply speed effect
    try {
      player.addEffect('speed', durationTicks, { amplifier: 1, showParticles: false });
    } catch {}

    // Play activation sound
    try {
      player.dimension.playSound('random.levelup', player.location, { volume: 1.0, pitch: 1.5 });
    } catch {}

    updateActionBar(player, '§4🔥【暴走狂潮 OVERDRIVE】5秒无限子弹极速扫射已开启!');
    return true;
  }

  static tick(player, currentGun) {
    // 1. Tick Cooldown
    const cd = this.skillCooldowns.get(player.id) || 0;
    if (cd > 0) {
      this.skillCooldowns.set(player.id, cd - 1);
    }

    // 2. Tick Overdrive
    const overdrive = this.activeOverdrive.get(player.id);
    if (!overdrive) return;

    // If player swapped away from Vector, cancel overdrive
    if (!currentGun || currentGun.id !== overdrive.gun.id) {
      this.activeOverdrive.delete(player.id);
      updateActionBar(player, '§7[暴走狂潮已取消 / Overdrive Cancelled]§r');
      return;
    }

    overdrive.remainingTicks--;
    const sec = (overdrive.remainingTicks / 20).toFixed(1);

    // Auto-fire every tick with UNLIMITED AMMO
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
      try {
        player.dimension.playSound('random.door_open', player.location, { volume: 0.6, pitch: 0.8 });
      } catch {}
    }
  }

  static clearPlayer(playerId) {
    this.skillCooldowns.delete(playerId);
    this.activeOverdrive.delete(playerId);
  }
}
