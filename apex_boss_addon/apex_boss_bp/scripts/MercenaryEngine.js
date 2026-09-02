import { world, system, ItemStack, EntityDamageCause } from '@minecraft/server';

export class MercenaryEngine {
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
    // 1. 确保雇佣兵手持 3D 枪械
    try {
      const eq = merc.getComponent('minecraft:equippable');
      if (eq) {
        const held = eq.getEquipment('Mainhand');
        if (!held || held.typeId === 'minecraft:air') {
          eq.setEquipment('Mainhand', new ItemStack('test_gun:ak47', 1));
        }
      }
    } catch {}

    // 2. 搜索 40 格内的目标
    const players = dim.getPlayers({ location: merc.location, maxDistance: 40 });
    let target = null;
    let closestDist = 999;

    if (players && players.length > 0) {
      for (const p of players) {
        if (!p || !p.isValid() || p.getGameMode() === 'spectator') continue;
        const d = Math.hypot(p.location.x - merc.location.x, p.location.y - merc.location.y, p.location.z - merc.location.z);
        if (d < closestDist) {
          closestDist = d;
          target = p;
        }
      }
    }

    // 如果没有玩家，寻找附近的村民或中立生物
    if (!target) {
      const mobs = dim.getEntities({ location: merc.location, maxDistance: 25, families: ['villager'] });
      if (mobs && mobs.length > 0) target = mobs[0];
    }

    if (!target) return;

    const mLoc = merc.getHeadLocation ? merc.getHeadLocation() : { x: merc.location.x, y: merc.location.y + 1.6, z: merc.location.z };
    const tLoc = target.getHeadLocation ? target.getHeadLocation() : { x: target.location.x, y: target.location.y + 1.2, z: target.location.z };

    // 3. 雇佣兵转身面向目标
    try {
      if (typeof merc.lookAt === 'function') {
        merc.lookAt(tLoc);
      }
    } catch {}

    // 4. 每 12 刻 (0.6 秒) 连续扫射 2 发子弹
    if (system.currentTick % 12 === 0) {
      const dx = tLoc.x - mLoc.x;
      const dy = tLoc.y - mLoc.y;
      const dz = tLoc.z - mLoc.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 0.5) return;

      const dir = { x: dx / dist, y: dy / dist, z: dz / dist };

      // 枪口火焰与 AK-47 枪声
      try {
        dim.spawnParticle('minecraft:basic_flame_particle', { x: mLoc.x + dir.x * 0.8, y: mLoc.y + dir.y * 0.8, z: mLoc.z + dir.z * 0.8 });
        dim.playSound('test_gun.ak47_shoot', mLoc, { volume: 1.5, pitch: 0.95 });
      } catch {
        dim.playSound('random.explode', mLoc, { volume: 0.8, pitch: 1.8 });
      }

      // 生成真实的弹道与子弹实体
      const bulletSpawnPos = { x: mLoc.x + dir.x * 1.0, y: mLoc.y + dir.y * 1.0, z: mLoc.z + dir.z * 1.0 };
      try {
        const bullet = dim.spawnEntity('test_gun:bullet_rifle', bulletSpawnPos);
        const projComp = bullet.getComponent('minecraft:projectile');
        if (projComp) {
          projComp.shoot({ x: dir.x * 3.0, y: dir.y * 3.0, z: dir.z * 3.0 });
        }
      } catch {}

      // 高亮弹道超光粒子线
      const steps = Math.min(30, Math.floor(dist / 0.6));
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        try {
          dim.spawnParticle('minecraft:crit', { x: mLoc.x + dx * f, y: mLoc.y + dy * f, z: mLoc.z + dz * f });
        } catch {}
      }

      // 命中判定与伤害输出 (10~15 点真实枪械伤害)
      const hitChance = Math.max(0.45, 0.95 - (dist / 45.0));
      if (Math.random() < hitChance) {
        const damage = 10 + Math.floor(Math.random() * 6);
        try {
          target.applyDamage(damage, {
            cause: EntityDamageCause.projectile,
            damagingEntity: merc
          });
          dim.spawnParticle('minecraft:crit', tLoc);
          if (target.typeId === 'minecraft:player') {
            target.onScreenDisplay?.setActionBar?.('§c⚠ 遭受【叛军雇佣兵】AK-47 枪械火力压制! -' + damage + ' HP§r');
          }
        } catch {}
      }
    }
  }

  static handleMercenaryDeath(merc) {
    if (!merc) return;
    const dim = merc.dimension;
    const loc = merc.location;

    try {
      dim.spawnItem(new ItemStack('test_gun:ammo_rifle', 30), loc);
      dim.spawnItem(new ItemStack('test_gun:ammo_45acp', 20), loc);
      if (Math.random() < 0.35) {
        dim.spawnItem(new ItemStack('test_gun:ak47', 1), loc);
      }
      dim.spawnParticle('minecraft:huge_explosion_emitter', loc);
      dim.playSound('random.break', loc, { volume: 1.0, pitch: 0.8 });
    } catch {}
  }
}
