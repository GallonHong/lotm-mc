# -*- coding: utf-8 -*-
p = 'addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneClass.js'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('player.onScreenDisplay.setActionBar("");', 'try { player.onScreenDisplay.clearTitle(); } catch {}')

old_bar = """     player.onScreenDisplay.setActionBar(
      `§b【FPV火控视角】 §e电量: §a${fuelPercent}% §6│ §e距离: §f${distText}m/96m §6│ §e高度: §f${altText} §6│ §a右键开火 §6│ §c潜行返航`
     );"""

new_bar = """     try {
      player.onScreenDisplay.setTitle("", {
       subtitle: `§b【FPV火控视角】 §e电量: §a${fuelPercent}% §6│ §e距离: §f${distText}m/96m §6│ §e高度: §f${altText} §6│ §a右键开火 §6│ §c潜行返航`,
       fadeInDuration: 0,
       stayDuration: 10,
       fadeOutDuration: 0
      });
     } catch {}"""

assert old_bar in c, 'old_bar not found in DroneClass.js'
c = c.replace(old_bar, new_bar)

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated DroneClass.js to use Subtitle instead of Actionbar!')
