# -*- coding: utf-8 -*-
import sys

sys.stdout.reconfigure(encoding='utf-8')

path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/main.js"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if 'const itemId = item.typeId;' in line:
        new_lines.append('''  if (itemId === "minecraft:compass") {
   system.runTimeout(() => {
    try {
     player.runCommand("scriptevent sapi:open");
    } catch {}
   }, 1);
   return;
  }\n''')

with open(path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Updated apocalypse_life_bp main.js successfully!")
