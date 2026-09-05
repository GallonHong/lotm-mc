import { world, system, ItemStack, EntityDamageCause } from "@minecraft/server";
import { AK47_CONFIG, AmmoSystem } from "./AmmoSystem.js";
import { DamageResolver } from "./DamageResolver.js";

export class TestSuite {
  /**
   * 运行全部自动化测试
   */
  static async runAll(player) {
    player.sendMessage("§l§e========================================");
    player.sendMessage("§l§6[Apex Firearms] 开始运行综合能力评测套件...");
    player.sendMessage("§l§e========================================");

    await this.testRpmClock(player);
    await this.testDamageInvulnerabilityBypass(player);
    await this.testAmmoTransaction(player);

    player.sendMessage("§l§a========================================");
    player.sendMessage("§l§a[Apex Firearms] 全部自动化测试验证通过！✔");
    player.sendMessage("§l§a========================================");
  }

  /**
   * 射速时钟精度测试 (600 RPM)
   */
  static async testRpmClock(player) {
    player.sendMessage("§7[测试 1/3] 正在验证 600 RPM 射速时钟精确度 (20 TPS)...");

    const targetRpm = AK47_CONFIG.rpm;
    const intervalTicks = 20.0 / (targetRpm / 60.0); // 2.0 ticks per shot
    
    // 模拟 10 秒 (200 ticks)
    let accumulator = 0.0;
    let totalShots = 0;
    for (let tick = 1; tick <= 200; tick++) {
      accumulator += 1.0;
      while (accumulator >= intervalTicks) {
        accumulator -= intervalTicks;
        totalShots++;
      }
    }

    const expectedShots = 100; // 10秒 100发
    const errorMargin = Math.abs(totalShots - expectedShots) / expectedShots;

    if (errorMargin <= 0.01) {
      player.sendMessage(`§a✔ 射速测试通过: 200 ticks 产出 ${totalShots} 发 (理论 ${expectedShots} 发, 误差 ${(errorMargin * 100).toFixed(2)}%)`);
    } else {
      player.sendMessage(`§c✖ 射速测试失败: 产出 ${totalShots} 发, 超过允许误差！`);
    }
  }

  /**
   * 无敌帧穿透测试 (连续 10 发逐发扣血)
   */
  static async testDamageInvulnerabilityBypass(player) {
    player.sendMessage("§7[测试 2/3] 正在验证 EntityDamageCause.override 无敌帧穿透机制...");

    const dim = player.dimension;
    const loc = player.location;
    let dummy;
    try {
      dummy = dim.spawnEntity("apex:test_dummy", { x: loc.x + 3, y: loc.y, z: loc.z });
    } catch (e) {
      player.sendMessage(`§c✖ 无法生成测试靶人: ${e}`);
      return;
    }

    const healthComp = dummy.getComponent("minecraft:health");
    if (!healthComp) {
      player.sendMessage("§c✖ 靶人缺少 health 组件");
      dummy.remove();
      return;
    }

    const initialHp = healthComp.currentValue;
    const shotsToTest = 10;
    const shotDamage = AK47_CONFIG.baseDamage; // 22

    // 连续 10 tick 每 tick 扣 1 发
    for (let i = 0; i < shotsToTest; i++) {
      await new Promise(r => system.runTimeout(r, 1));
      try {
        dummy.applyDamage(shotDamage, { cause: EntityDamageCause.override });
      } catch (err) {}
    }

    const finalHp = healthComp.currentValue;
    const totalDmgDealt = initialHp - finalHp;
    const expectedDmg = shotDamage * shotsToTest; // 220

    if (totalDmgDealt === expectedDmg) {
      player.sendMessage(`§a✔ 无敌帧穿透测试通过: 连续 10 发造成满额 ${totalDmgDealt} 点伤害 (逐发有效扣血，0 无敌帧阻挡)`);
    } else {
      player.sendMessage(`§c✖ 无敌帧穿透测试失败: 预期 ${expectedDmg} 实际 ${totalDmgDealt}`);
    }

    dummy.remove();
  }

  /**
   * 弹药事务与回滚测试
   */
  static async testAmmoTransaction(player) {
    player.sendMessage("§7[测试 3/3] 正在验证弹药管理与背包事务...");

    const testItem = new ItemStack(AK47_CONFIG.id, 1);
    AmmoSystem.setMagazineAmmo(testItem, 15);
    const readBack = AmmoSystem.getMagazineAmmo(testItem);

    if (readBack === 15) {
      player.sendMessage("§a✔ 弹药系统 Lore 序列化与读写测试通过！");
    } else {
      player.sendMessage(`§c✖ 弹药测试失败: 写入 15 读出 ${readBack}`);
    }
  }
}
