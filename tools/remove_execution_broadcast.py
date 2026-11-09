# -*- coding: utf-8 -*-
path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/rescue/DownedRescueManager.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove warning message in tick()
old_warn = """   if (this.graceTicks === 0) {
    try {
     this.player.removeEffect("resistance");
     this.player.sendMessage("§e[战地警报] 倒地保护期已结束，敌方可随时开枪对你补枪处决！");
    } catch {}
   }"""

new_warn = """   if (this.graceTicks === 0) {
    try {
     this.player.removeEffect("resistance");
    } catch {}
   }"""

assert old_warn in content, "Could not find old_warn in DownedRescueManager.js"
content = content.replace(old_warn, new_warn, 1)

# 2. Remove execution broadcast in kill()
old_kill_broadcast = """  // 处决与阵亡广播提示
  try {
   if (killer || isExecution) {
    const killerName = killer?.name || killer?.typeId?.replace("minecraft:", "") || "敌对目标";
    for (const p of world.getAllPlayers()) {
     p.sendMessage("§c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
     p.sendMessage(`§c【战地处决】幸存者 §f@${this.player.name} §c倒地后被 §e@${killerName} §c补枪处决！`);
     p.sendMessage("§c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
    try { this.dimension.spawnParticle("minecraft:huge_explosion_emitter", this.player.location); } catch {}
    try { this.player.runCommandAsync("playsound random.explode @a ~~~ 0.8 1.4"); } catch {}
    if (killer && killer.isValid() && killer.typeId === "minecraft:player") {
     try { killer.sendMessage(`§a[战地处决] 你成功击杀处决了倒地幸存者 §f@${this.player.name}§a！`); } catch {}
     try { killer.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.5"); } catch {}
    }
   } else {
    for (const p of world.getAllPlayers()) {
     p.sendMessage(`§c幸存者 @${this.player.name} 伤势过重，不幸阵亡了...`);
    }
   }
  } catch {}"""

new_kill_broadcast = """  // 广播阵亡提示
  try {
   for (const p of world.getAllPlayers()) {
    p.sendMessage(`§c幸存者 @${this.player.name} 伤势过重，不幸阵亡了...`);
   }
  } catch {}"""

assert old_kill_broadcast in content, "Could not find old_kill_broadcast in DownedRescueManager.js"
content = content.replace(old_kill_broadcast, new_kill_broadcast, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("DownedRescueManager.js successfully updated without execution broadcast!")
