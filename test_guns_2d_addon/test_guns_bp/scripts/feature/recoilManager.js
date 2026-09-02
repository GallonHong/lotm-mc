import { world } from '@minecraft/server';

export class RecoilManager {
  // 记录每个玩家的连发热度 (连射弹数) 与最后开火刻
  static sprayHeat = new Map(); // playerId -> { count: number, lastTick: number }

  /**
   * 应用枪械射击真实后坐力 (镜头剧烈震颤 + 视角准星乱飘/上跳 + 连发弹道压枪回馈)
   * @param {Player} player 
   * @param {Object} gun 
   */
  static applyRecoil(player, gun) {
    if (!player || !player.isValid() || !gun) return;

    try {
      const pId = player.id;
      const currentTick = systemTimeTick();
      const spray = this.sprayHeat.get(pId) || { count: 0, lastTick: 0 };

      // 如果两次开火间隔大于 12 刻 (0.6秒)，重置连发热度；否则累加连发数
      if (currentTick - spray.lastTick <= 12) {
        spray.count = Math.min(15, spray.count + 1);
      } else {
        spray.count = 1;
      }
      spray.lastTick = currentTick;
      this.sprayHeat.set(pId, spray);

      const rawRecoil = Number(gun.recoil) || 0.20;
      const sprayFactor = 1.0 + Math.min(1.2, spray.count * 0.12); // 连发时后坐力逐级递增

      // 姿态稳定性修正
      let stabilityFactor = 1.0;
      if (player.isSneaking) {
        stabilityFactor = 0.55; // 蹲下减少 45% 后坐力
      } else if (player.isSprinting) {
        stabilityFactor = 1.40; // 奔跑射击散布极大
      } else if (player.isFalling || player.isClimbing) {
        stabilityFactor = 1.60; // 跳打/空中大幅失准
      }

      // 1. 强化版屏幕剧烈震颤 (Camera Shake: 视觉冲击感拉满)
      let baseShake = 0.14;
      if (gun.type === 'sniper' || gun.isRocketLauncher || gun.isGrenadeLauncher) {
        baseShake = 0.38;
      } else if (gun.type === 'shotgun') {
        baseShake = 0.32;
      } else if (gun.type === 'rifle') {
        baseShake = 0.20;
      } else if (gun.type === 'pistol') {
        baseShake = 0.18;
      } else {
        baseShake = 0.12;
      }

      const shakeIntensity = Math.max(0.08, Math.min(0.50, baseShake * sprayFactor * stabilityFactor));
      const shakeDuration = (rawRecoil >= 0.5) ? '0.18' : '0.12';
      try {
        player.runCommandAsync(`camerashake add @s ${shakeIntensity.toFixed(3)} ${shakeDuration} rotational`);
      } catch {}

      // 2. 准星真实视角强制上跳与左右剧烈乱飘 (Crosshair Kick & Sway)
      try {
        const rot = player.getRotation();
        if (rot && typeof rot.x === 'number' && typeof rot.y === 'number') {
          // 垂直大幅上跳：AK47 / 步枪单发上抬 2.5°~4.5°，连发越跳越高！
          const pitchKick = (rawRecoil * 5.8 * sprayFactor) * stabilityFactor;
          let newPitch = Math.max(-89.9, Math.min(89.9, rot.x - pitchKick));

          // 水平左右横向随机乱飘 (Yaw Drift: 模拟真实枪口左右不规则扭动)
          const yawDrift = (Math.random() - 0.49) * (rawRecoil * 6.2 * sprayFactor) * stabilityFactor;
          let newYaw = rot.y + yawDrift;
          if (newYaw > 180) newYaw -= 360;
          if (newYaw < -180) newYaw += 360;

          player.setRotation({ x: newPitch, y: newYaw });
        }
      } catch {}

      // 3. 重型大口径后坐推力
      if (rawRecoil >= 0.40) {
        try {
          const view = player.getViewDirection();
          const kickPower = Math.min(0.25, rawRecoil * 0.20 * stabilityFactor);
          player.applyKnockback(-view.x * kickPower, -view.z * kickPower, kickPower, 0.0);
        } catch {}
      }
    } catch (err) {
      console.warn('RecoilManager error:', err);
    }
  }

  static getSprayOffset(playerId, rawRecoil) {
    const spray = this.sprayHeat.get(playerId);
    const count = spray ? spray.count : 0;
    const intensity = (Number(rawRecoil) || 0.20) * (0.015 + Math.min(0.06, count * 0.006));
    return {
      x: (Math.random() - 0.5) * intensity,
      y: (Math.random() - 0.2) * intensity, // 偏向上扬
      z: (Math.random() - 0.5) * intensity
    };
  }
}

function systemTimeTick() {
  return Math.floor(Date.now() / 50);
}
