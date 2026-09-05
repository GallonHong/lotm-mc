export class RecoilManager {
  static sprayHeat = new Map();

  static applyRecoil(player, gun) {
    if (!player || !player.isValid() || !gun) return;

    try {
      const pId = player.id;
      const currentTick = Math.floor(Date.now() / 50);
      const spray = this.sprayHeat.get(pId) || { count: 0, lastTick: 0 };

      if (currentTick - spray.lastTick <= 12) {
        spray.count = Math.min(15, spray.count + 1);
      } else {
        spray.count = 1;
      }
      spray.lastTick = currentTick;
      this.sprayHeat.set(pId, spray);

      const rawRecoil = Number(gun.recoil) || 0.20;
      const sprayFactor = 1.0 + Math.min(1.2, spray.count * 0.12);

      let stabilityFactor = 1.0;
      if (player.isSneaking) {
        stabilityFactor = 0.55;
      } else if (player.isSprinting) {
        stabilityFactor = 1.40;
      } else if (player.isFalling || player.isClimbing) {
        stabilityFactor = 1.60;
      }

      // 1. 屏幕震颤 (Camera Shake)
      let baseShake = 0.14;
      if (gun.type === 'sniper' || gun.isRocketLauncher || gun.isGrenadeLauncher) {
        baseShake = 0.38;
      } else if (gun.type === 'shotgun') {
        baseShake = 0.30;
      } else if (gun.type === 'rifle') {
        baseShake = 0.20;
      } else if (gun.type === 'pistol') {
        baseShake = 0.16;
      } else {
        baseShake = 0.12;
      }

      const shakeIntensity = Math.max(0.06, Math.min(0.50, baseShake * sprayFactor * stabilityFactor));
      const shakeDuration = (rawRecoil >= 0.5) ? '0.18' : '0.12';
      try {
        player.runCommandAsync(`camerashake add @s ${shakeIntensity.toFixed(3)} ${shakeDuration} rotational`);
      } catch {}

      // 2. 视角上跳与横向乱飘
      try {
        const rot = player.getRotation();
        if (rot && typeof rot.x === 'number' && typeof rot.y === 'number') {
          const pitchKick = (rawRecoil * 5.5 * sprayFactor) * stabilityFactor;
          let newPitch = Math.max(-89.9, Math.min(89.9, rot.x - pitchKick));

          const yawDrift = (Math.random() - 0.49) * (rawRecoil * 5.8 * sprayFactor) * stabilityFactor;
          let newYaw = rot.y + yawDrift;
          if (newYaw > 180) newYaw -= 360;
          if (newYaw < -180) newYaw += 360;

          player.setRotation({ x: newPitch, y: newYaw });
        }
      } catch {}

      // 3. 物理击退冲量
      if (rawRecoil >= 0.40) {
        try {
          const view = player.getViewDirection();
          const kickPower = Math.min(0.25, rawRecoil * 0.18 * stabilityFactor);
          player.applyKnockback(-view.x * kickPower, -view.z * kickPower, kickPower, 0.0);
        } catch {}
      }
    } catch (err) {
      console.warn('RecoilManager error:', err);
    }
  }

  static getSprayOffset(playerId, rawRecoil) {
    try {
      const spray = this.sprayHeat.get(playerId);
      const count = spray ? spray.count : 0;
      const intensity = (Number(rawRecoil) || 0.20) * (0.015 + Math.min(0.06, count * 0.006));
      return {
        x: (Math.random() - 0.5) * intensity,
        y: (Math.random() - 0.2) * intensity,
        z: (Math.random() - 0.5) * intensity
      };
    } catch {
      return { x: 0, y: 0, z: 0 };
    }
  }
}
