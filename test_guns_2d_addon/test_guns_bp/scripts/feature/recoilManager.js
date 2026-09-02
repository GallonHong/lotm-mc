export class RecoilManager {
  /**
   * 应用枪械射击真实后坐力 (镜头震颤 CameraShake + 视角上跳 + 物理反冲)
   * @param {Player} player 
   * @param {Object} gun 
   */
  static applyRecoil(player, gun) {
    if (!player || !player.isValid() || !gun) return;

    try {
      const rawRecoil = Number(gun.recoil) || 0.20;

      // 姿态稳定性修正
      let stabilityFactor = 1.0;
      if (player.isSneaking) {
        stabilityFactor = 0.55; // 蹲伏/潜行减少 45% 后坐力
      } else if (player.isSprinting) {
        stabilityFactor = 1.35; // 奔跑时增加 35% 后坐力
      } else if (player.isFalling || player.isClimbing) {
        stabilityFactor = 1.50; // 空中大幅增加
      }

      // 1. 真实屏幕震颤后坐力 (Camera Shake - 基岩版最真实且 100% 视觉可见的后坐震荡)
      const shakeIntensity = Math.max(0.04, Math.min(0.40, rawRecoil * 0.35 * stabilityFactor));
      const shakeDuration = (rawRecoil >= 0.5) ? '0.18' : '0.10';
      try {
        player.runCommandAsync(`camerashake add @s ${shakeIntensity.toFixed(3)} ${shakeDuration} rotational`);
      } catch {}

      // 2. 镜头角度真实上跃与左右漂移 (View Rotation Kick)
      try {
        const rot = player.getRotation();
        if (rot && typeof rot.x === 'number' && typeof rot.y === 'number') {
          const pitchKick = rawRecoil * 3.8 * stabilityFactor;
          let newPitch = Math.max(-89.9, Math.min(89.9, rot.x - pitchKick));
          const yawDrift = (Math.random() - 0.48) * rawRecoil * 2.2 * stabilityFactor;
          let newYaw = rot.y + yawDrift;
          if (newYaw > 180) newYaw -= 360;
          if (newYaw < -180) newYaw += 360;

          player.setRotation({ x: newPitch, y: newYaw });
        }
      } catch {}

      // 3. 重型大威力武器物理反向推力 (Barrett M82 / M79 / 霰弹枪 / 沙鹰等大口径后坐微退)
      if (rawRecoil >= 0.40) {
        try {
          const view = player.getViewDirection();
          const kickPower = Math.min(0.22, rawRecoil * 0.18 * stabilityFactor);
          player.applyKnockback(-view.x * kickPower, -view.z * kickPower, kickPower, 0.0);
        } catch {}
      }
    } catch (err) {
      console.warn('RecoilManager error:', err);
    }
  }
}
