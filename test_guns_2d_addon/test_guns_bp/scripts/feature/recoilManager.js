export class RecoilManager {
  /**
   * 应用枪械射击真实后坐力 (镜头视角上跳、水平扰动与姿态平衡)
   * @param {Player} player 
   * @param {Object} gun 
   */
  static applyRecoil(player, gun) {
    if (!player || !player.isValid() || !gun) return;

    try {
      const rot = player.getRotation();
      if (!rot || typeof rot.x !== 'number' || typeof rot.y !== 'number') return;

      const rawRecoil = gun.recoil || 0.20;

      // 姿态稳定性修正
      let stabilityFactor = 1.0;
      if (player.isSneaking) {
        stabilityFactor = 0.60; // 潜行/蹲伏大幅减少后坐力
      } else if (player.isSprinting) {
        stabilityFactor = 1.35; // 奔跑时射击后坐力增加
      } else if (player.isFalling || player.isClimbing) {
        stabilityFactor = 1.50; // 空中/跳跃不稳定
      }

      // 1. 垂直上跳后坐力 (Pitch Recoil: 负值代表视角向上扬)
      const pitchKick = rawRecoil * 4.2 * stabilityFactor;
      let newPitch = rot.x - pitchKick;
      newPitch = Math.max(-89.9, Math.min(89.9, newPitch));

      // 2. 水平随机抖动后坐力 (Yaw Shake: 左右微动散布)
      const yawDrift = (Math.random() - 0.48) * rawRecoil * 2.8 * stabilityFactor;
      let newYaw = rot.y + yawDrift;
      if (newYaw > 180) newYaw -= 360;
      if (newYaw < -180) newYaw += 360;

      // 3. 应用镜头视角后坐力
      player.setRotation({ x: newPitch, y: newYaw });

      // 4. 重型武器物理后座力冲量 (如巴雷特 M82、M79、霰弹枪、沙鹰等大口径武器后坐微退)
      if (rawRecoil >= 0.45) {
        try {
          const view = player.getViewDirection();
          const kickbackPower = Math.min(0.18, rawRecoil * 0.15);
          player.applyKnockback(-view.x * kickbackPower, -view.z * kickbackPower, kickbackPower, 0.0);
        } catch {}
      }
    } catch (err) {
      console.warn('RecoilManager applyRecoil error:', err);
    }
  }
}
