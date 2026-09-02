import { world, system, EntityDamageCause } from '@minecraft/server';

export class MercenaryEngine {
  static mercenaryWeapons = ['test_gun:ak47', 'test_gun:scarh', 'test_gun:shotgun', 'test_gun:m82'];

  static onTick() {
    const dim = world.getDimension('overworld');
    if (!dim) return;

    const mercenaries = dim.getEntities({ type: 'apex_boss:hostile_mercenary' });
    for (const merc of mercenaries) {
      if (!merc || !merc.isValid()) continue;
      this.handleMercenaryAI(merc, dim);
    }
  }

  static handleMercenaryAI(merc, dim) {
    // 寻找 35 格内最近的存活玩家
    const players = dim.getPlayers({ location: merc.location, maxDistance: 35 });
    if (!players || players.length === 0) return;

    let target = null;
    let closestDist = 999;
    for (const p of players) {
      if (!p || !p.isValid() || p.getGameMode() === 'creative' || p.getGameMode() === 'spectator') continue;
      const d = Math.hypot(p.location.x - merc.location.x, p.location.y - merc.location.y, p.location.z - merc.location.z);
      if (d < closestDist) {
        closestDist = d;
        target = p;
      }
    }

    if (!target) return;

    // 每 15 刻 (0.75秒) 瞄准并射击一次点射
    if (system.currentTick % 15 === 0) {
      const mLoc = merc.getHeadLocation ? merc.getHeadLocation() : merc.location;
      const tLoc = target.getHeadLocation ? target.getHeadLocation() : target.location;

      const dx = tLoc.x - mLoc.x;
      const dy = tLoc.y - mLoc.y;
      const dz = tLoc.z - mLoc.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 0.1) return;

      const dir = { x: dx / dist, y: dy / dist, z: dz / dist };

      // 枪口火焰与音效
      try {
        dim.spawnParticle('minecraft:basic_flame_particle', { x: mLoc.x + dir.x * 0.5, y: mLoc.y + dir.y * 0.5, z: mLoc.z + dir.z * 0.5 });
        dim.playSound('test_gun.ak47_shoot', mLoc, { volume: 1.2, pitch: 0.95 });
      } catch {
        dim.playSound('random.explode', mLoc, { volume: 0.8, pitch: 1.8 });
      }

      // 弹道粒子轨迹
      const steps = Math.min(25, Math.floor(dist / 0.5));
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        try {
          dim.spawnParticle('minecraft:crit', { x: mLoc.x + dx * f, y: mLoc.y + dy * f, z: mLoc.z + dz * f });
        } catch {}
      }

      // 命中判定与伤害输出 (8~14 点枪械穿透伤害)
      const hitChance = Math.max(0.4, 0.9 - (dist / 40.0));
      if (Math.random() < hitChance) {
        const damage = 10 + Math.floor(Math.random() * 5);
        try {
          target.applyDamage(damage, {
            cause: EntityDamageCause.projectile,
            damagingEntity: merc
          });
          dim.spawnParticle('minecraft:crit', tLoc);
          target.onScreenDisplay?.setActionBar?.('§c⚠ 遭受【叛军雇佣兵】步枪射击压制! -' + damage + ' HP§r');
        } catch {}
      }
    }
  }

  static handleMercenaryDeath(merc) {
    if (!merc) return;
    const dim = merc.dimension;
    const loc = merc.location;

    // 掉落 Test Guns 弹药补给箱与军火
    try {
      dim.spawnItem(new ItemStack('test_gun:ammo_rifle', 30), loc);
      dim.spawnItem(new ItemStack('test_gun:ammo_45acp', 20), loc);
      if (Math.random() < 0.25) {
        dim.spawnItem(new ItemStack('test_gun:ak47', 1), loc);
      }
      dim.spawnParticle('minecraft:huge_explosion_emitter', loc);
      dim.playSound('random.break', loc, { volume: 1.0, pitch: 0.8 });
    } catch {}
  }
}
