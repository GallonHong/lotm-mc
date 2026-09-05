import { getGunAnimationProfile } from "./GunAnimationProfiles.js";

/**
 * 枪械动画与视效音频桥接器 (GunAnimationBridge)
 * 职责：
 * 1. 严格解耦枪械核心逻辑与二维物品贴图；音频作为独立资源保留
 * 2. 统一分发开火枪声、远景枪声、弹壳弹出、换弹、击中标记 (hitmarker) 音效
 * 3. 生成枪口焰、弹道轨迹粒子与击中血花/火星
 */
export class GunAnimationBridge {
  static playState(player, gunDef, state) {
    // v2.5 只使用 OldAssGunA 二维物品素材，不强制播放玩家动作。
    // 保留语义钩子，未来加入独立动作时无需改动核心射击逻辑。
    getGunAnimationProfile(gunDef?.animationProfile);
  }

  static playEquip(player, gunDef) {
    this.playState(player, gunDef, "equip");
    this.playDrawSound(player);
  }

  static playReload(player, gunDef) {
    this.playState(player, gunDef, "reload");
  }

  static playShootEffects(player, gunDef, muzzleLocation, targetLocation = null) {
    if (!player || !gunDef) return;

    const dim = player.dimension;
    const soundProfile = gunDef.soundProfile;
    this.playState(player, gunDef, "fire");

    // 1. 本地射击音效
    try {
      player.playSound(`gun.${soundProfile}`, {
        location: player.location,
        volume: 1.0,
        pitch: 0.95 + Math.random() * 0.1
      });
    } catch {}

    // 2. 远景传播枪声 (50格范围可闻)
    try {
      dim.runCommand(`playsound distant.${soundProfile} @a[r=50,rm=8] ${player.location.x} ${player.location.y} ${player.location.z} 1.5 1.0`);
    } catch {}

    // 3. 枪口火焰与烟雾微粒子
    try {
      if (muzzleLocation) {
        dim.spawnParticle("minecraft:basic_smoke_particle", {
          x: muzzleLocation.x,
          y: muzzleLocation.y,
          z: muzzleLocation.z
        });
      }
    } catch {}

    // 4. 弹道微粒子 (如果命中远处，生成轻量弹道线段)
    if (targetLocation && muzzleLocation) {
      try {
        const dx = targetLocation.x - muzzleLocation.x;
        const dy = targetLocation.y - muzzleLocation.y;
        const dz = targetLocation.z - muzzleLocation.z;
        const dist = Math.hypot(dx, dy, dz);
        
        // 采样 3~5 个点轻量生成弹道粒子，杜绝过多卡顿
        const stepCount = Math.min(5, Math.floor(dist / 4));
        for (let i = 1; i <= stepCount; i++) {
          const t = i / (stepCount + 1);
          dim.spawnParticle("minecraft:crit", {
            x: muzzleLocation.x + dx * t,
            y: muzzleLocation.y + dy * t,
            z: muzzleLocation.z + dz * t
          });
        }
      } catch {}
    }
  }

  static playDryFire(player) {
    try {
      player.playSound("gun.dry", {
        location: player.location,
        volume: 0.8,
        pitch: 1.0
      });
    } catch {}
  }

  static playDrawSound(player) {
    try {
      player.playSound("gun.draw", {
        location: player.location,
        volume: 0.7,
        pitch: 1.0
      });
    } catch {}
  }

  static playHitmarker(player, isHeadshot = false) {
    try {
      player.playSound("gun.hitmarker", {
        location: player.location,
        volume: 0.9,
        pitch: isHeadshot ? 1.4 : 1.1
      });
    } catch {}
  }

  static spawnImpactEffects(dimension, location, isEntity = true) {
    if (!dimension || !location) return;
    try {
      if (isEntity) {
        // 血花/受击粒子
        dimension.spawnParticle("minecraft:redstone_ore_dust_particle", location);
      } else {
        // 方块击中火星与尘土
        dimension.spawnParticle("minecraft:crit", location);
      }
    } catch {}
  }

  static playHitEffects(player, hitResult) {
    const isHeadshot = hitResult?.hitZone === "head";
    this.playHitmarker(player, isHeadshot);
    this.spawnImpactEffects(hitResult?.target?.dimension ?? player?.dimension, hitResult?.hitLocation, true);
  }
}
