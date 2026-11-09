def patch_downed_execution():
    path = r'addons\development\apocalypse_life_addon\apocalypse_life_bp\scripts\rescue\DownedRescueManager.js'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Add graceTicks in constructor
    old_ctor = 'this.surrenderTicks = 0;'
    new_ctor = '''this.surrenderTicks = 0;
  this.graceTicks = 20; // 1秒初始倒地无敌硬直，防止同一发霰弹枪瞬间重叠补死'''
    assert old_ctor in c, 'old_ctor not found'
    c = c.replace(old_ctor, new_ctor, 1)

    # 2. Update applyDownedEffects to remove resistance 255
    old_fx = '''  applyDownedEffects() {
   try {
    this.player.addEffect("resistance", 40, { amplifier: 255, showParticles: false });
    this.player.addEffect("weakness", 40, { amplifier: 255, showParticles: false });
    this.player.addEffect("mining_fatigue", 40, { amplifier: 255, showParticles: false });
    this.player.addEffect("slowness", 40, { amplifier: 255, showParticles: false });
   } catch {}
  }'''

    new_fx = '''  applyDownedEffects() {
   try {
    // 移除无敌抗性提升：确保倒地状态下仍然可被敌方枪械射击扣血与补枪处决
    if (this.graceTicks <= 0) {
     this.player.removeEffect("resistance");
    } else {
     this.player.addEffect("resistance", 10, { amplifier: 255, showParticles: false });
    }
    this.player.addEffect("weakness", 40, { amplifier: 255, showParticles: false });
    this.player.addEffect("mining_fatigue", 40, { amplifier: 255, showParticles: false });
    this.player.addEffect("slowness", 40, { amplifier: 255, showParticles: false });
   } catch {}
  }'''
    assert old_fx in c, 'old_fx not found'
    c = c.replace(old_fx, new_fx, 1)

    # 3. In tick(), decrement graceTicks
    old_tick_top = '''  // 维持倒地状态保护与微血量
  if (system.currentTick % 20 === 0) {
   this.applyDownedEffects();
  }'''
    new_tick_top = '''  if (this.graceTicks > 0) {
   this.graceTicks -= 1;
  }

  // 维持倒地控制锁定状态与状态同步
  if (system.currentTick % 20 === 0) {
   this.applyDownedEffects();
  }'''
    assert old_tick_top in c, 'old_tick_top not found'
    c = c.replace(old_tick_top, new_tick_top, 1)

    # 4. In renderActionBar(), show downed HP
    old_render_c = '''   // 状态 C：倒地濒死流血等待呼救
   const remainSec = Math.max(0, Math.ceil((this.maxKnockedTicks - this.knockedTicks) / 20));
   const remainRatio = Math.max(0, (this.maxKnockedTicks - this.knockedTicks) / this.maxKnockedTicks);
   const bar = createBar(remainRatio, "§c■", "§e□", 16);
   this.player.onScreenDisplay.setActionBar(`§c【濒死倒地】 ${bar} §e${remainSec}§c秒 §6│ 队友按【潜行】施救 §6│ 长按【跳跃】放弃`);
   this.player.nameTag = `§c@${this.player.name}\\n${bar}`;'''

    new_render_c = '''   // 状态 C：倒地濒死流血等待呼救 (实时显示倒地生命值与补枪提示)
   const hpComp = this.player.getComponent(EntityComponentTypes.Health);
   const currentHp = Math.max(0, Math.ceil(hpComp?.currentValue || 0));
   const maxHp = Math.ceil(hpComp?.effectiveMax || 20);

   const remainSec = Math.max(0, Math.ceil((this.maxKnockedTicks - this.knockedTicks) / 20));
   const remainRatio = Math.max(0, (this.maxKnockedTicks - this.knockedTicks) / this.maxKnockedTicks);
   const bar = createBar(remainRatio, "§c■", "§e□", 16);
   this.player.onScreenDisplay.setActionBar(`§c【濒死倒地】 ${bar} §e${remainSec}§c秒 §6│ 濒死生命: §e${currentHp}/${maxHp} §6│ 敌方可补枪处决！`);
   this.player.nameTag = `§c@${this.player.name} §e[濒死: ${currentHp}/${maxHp}]\\n${bar}`;'''
    assert old_render_c in c, 'old_render_c not found'
    c = c.replace(old_render_c, new_render_c, 1)

    # 5. In kill(killer), accept killer parameter and broadcast
    old_kill = ''' kill() {
  this.end();
  if (!this.player || !this.player.isValid()) return;

  // 打上真实死亡标记，防止被 entityDie 循环捕获为新的倒地
  this.player.addTag("apoc:true_death");'''

    new_kill = ''' kill(killer = null) {
  this.end();
  if (!this.player || !this.player.isValid()) return;

  // 打上真实死亡标记，防止被 entityDie 循环捕获为新的倒地
  this.player.addTag("apoc:true_death");'''
    assert old_kill in c, 'old_kill not found'
    c = c.replace(old_kill, new_kill, 1)

    old_kill_broadcast = '''  // 广播阵亡提示
  try {
   for (const p of world.getAllPlayers()) {
    p.sendMessage(`§c幸存者 @${this.player.name} 伤势过重，不幸阵亡了...`);
   }
   this.player.kill();
  } catch {}'''

    new_kill_broadcast = '''  // 广播阵亡或敌方枪械处决提示
  try {
   const killerName = killer?.name || (killer?.typeId === "minecraft:player" ? killer.name : null);
   if (killerName) {
    for (const p of world.getAllPlayers()) {
     p.sendMessage(`§c[战地击毙] 幸存者 §f@${this.player.name} §c倒地后被 §e@${killerName} §c使用枪械补枪击杀处决！`);
    }
   } else {
    for (const p of world.getAllPlayers()) {
     p.sendMessage(`§c幸存者 @${this.player.name} 伤势过重，不幸阵亡了...`);
    }
   }
   this.player.kill();
  } catch {}'''
    assert old_kill_broadcast in c, 'old_kill_broadcast not found'
    c = c.replace(old_kill_broadcast, new_kill_broadcast, 1)

    # 6. In entityDie, if already downed, handle lethal shot
    old_die_downed = '''    // 若已经处于倒地状态，不重复触发
    if (this.activeInstances.has(player.id)) return;'''

    new_die_downed = '''    // 若已经处于倒地状态，再次死亡说明受到枪械补枪致死打击！
    if (this.activeInstances.has(player.id)) {
     const inst = this.activeInstances.get(player.id);
     const killer = event.damageSource?.damagingEntity;
     inst.kill(killer);
     return;
    }'''
    assert old_die_downed in c, 'old_die_downed not found'
    c = c.replace(old_die_downed, new_die_downed, 1)

    # 7. Add entityHurt listener in DownedRescueManager.init
    old_init_end = '''  // 3. 不死图腾 / 强心针自救监听'''
    new_init_end = '''  // 2.5 倒地濒死受创监听：支持敌方枪械射击扣血与补枪处决
  if (world.afterEvents?.entityHurt) {
   world.afterEvents.entityHurt.subscribe((event) => {
    const hurtEntity = event.hurtEntity;
    if (!hurtEntity || hurtEntity.typeId !== "minecraft:player") return;

    const inst = this.activeInstances.get(hurtEntity.id);
    if (!inst || inst.ended) return;

    // 1秒初始倒地保护期内不致死
    if (inst.graceTicks > 0) return;

    const damageSource = event.damageSource;
    const damager = damageSource?.damagingEntity;

    // 自身与施救中队友的误伤不造成处决
    if (damager && (damager.id === inst.player.id || damager.id === inst.reviver?.id)) {
     return;
    }

    const hp = hurtEntity.getComponent(EntityComponentTypes.Health);
    if (!hp || hp.currentValue <= 1) {
     inst.kill(damager);
    } else {
     try {
      hurtEntity.dimension.spawnParticle("minecraft:crit", hurtEntity.location);
     } catch {}
    }
   });
  }

  // 3. 不死图腾 / 强心针自救监听'''
    assert old_init_end in c, 'old_init_end not found'
    c = c.replace(old_init_end, new_init_end, 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Patched DownedRescueManager.js for gunshot execution successfully')

if __name__ == '__main__':
    patch_downed_execution()
