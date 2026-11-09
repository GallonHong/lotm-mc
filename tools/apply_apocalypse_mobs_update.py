# -*- coding: utf-8 -*-
import zipfile, io, os, shutil, re, sys

sys.stdout.reconfigure(encoding='utf-8')

mcaddon_path = r'c:\Users\10973\Downloads\Apocalypse_Mobs_Addon_v0.7.2.mcaddon'
dest_base = r'C:\Users\10973\Desktop\mcaddon\addons\development\apocalypse_mobs_addon'
bp_dest = os.path.join(dest_base, 'apocalypse_mobs_bp')
rp_dest = os.path.join(dest_base, 'apocalypse_mobs_rp')

with zipfile.ZipFile(mcaddon_path, 'r') as z:
    bp_data = z.read('Apocalypse_Mobs_BP.mcpack')
    rp_data = z.read('Apocalypse_Mobs_RP.mcpack')

print('Extracting BP...')
with zipfile.ZipFile(io.BytesIO(bp_data)) as bp_z:
    for item in bp_z.infolist():
        target = os.path.join(bp_dest, item.filename.replace('/', os.sep))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        if not item.is_dir():
            with open(target, 'wb') as f:
                f.write(bp_z.read(item.filename))

print('Extracting RP...')
with zipfile.ZipFile(io.BytesIO(rp_data)) as rp_z:
    for item in rp_z.infolist():
        target = os.path.join(rp_dest, item.filename.replace('/', os.sep))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        if not item.is_dir():
            with open(target, 'wb') as f:
                f.write(rp_z.read(item.filename))

# Clean loot.js so it never falls back to emeralds
loot_path = os.path.join(bp_dest, 'scripts', 'loot.js')
with open(loot_path, 'r', encoding='utf-8') as f:
    loot_c = f.read()

# Replace any emerald giving logic in loot.js
old_fallback = '''  give(player, "minecraft:emerald", Math.max(1, Math.floor(amount / 25)));
  player.sendMessage("§a[事件] 未检测到 SAPI 经济，已改发绿宝石物资。");
  return false;
 }'''

if old_fallback in loot_c:
    loot_c = loot_c.replace(old_fallback, '  return false;\n }')
    with open(loot_path, 'w', encoding='utf-8') as f:
        f.write(loot_c)
    print('Cleaned loot.js from emerald fallback successfully!')
else:
    print('Notice: emerald fallback was not found in loot.js, checking regex...')
    pattern = r'give\(player,\s*["\']minecraft:emerald["\'][\s\S]*?return false;\s*\}'
    loot_c, count = re.subn(pattern, 'return false;\n }', loot_c)
    if count > 0:
        with open(loot_path, 'w', encoding='utf-8') as f:
            f.write(loot_c)
        print(f'Cleaned {count} emerald fallback(s) via regex!')

# Copy the mcaddon file to destination
shutil.copy2(mcaddon_path, os.path.join(dest_base, 'Apocalypse_Mobs_Addon.mcaddon'))
print('Copied Apocalypse_Mobs_Addon.mcaddon to addon directory!')
