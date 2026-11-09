# -*- coding: utf-8 -*-
import zipfile, io, os, shutil, sys

sys.stdout.reconfigure(encoding='utf-8')

base_dev = r'C:\Users\10973\Desktop\mcaddon\addons\development'

life_mcaddon = r'c:\Users\10973\Downloads\Apocalypse_Life_Addon_v1.4.3.mcaddon'
life_dest = os.path.join(base_dev, 'apocalypse_life_addon')
life_bp = os.path.join(life_dest, 'apocalypse_life_bp')
life_rp = os.path.join(life_dest, 'apocalypse_life_rp')

print('Extracting Apocalypse Life Addon v1.4.3...')
with zipfile.ZipFile(life_mcaddon, 'r') as z:
    bp_data = z.read('Apocalypse_Life_BP.mcpack')
    rp_data = z.read('Apocalypse_Life_RP.mcpack')

with zipfile.ZipFile(io.BytesIO(bp_data)) as bp_z:
    for item in bp_z.infolist():
        if item.is_dir() or item.filename.endswith('/'):
            continue
        target = os.path.join(life_bp, item.filename.replace('/', os.sep))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'wb') as f:
            f.write(bp_z.read(item.filename))

with zipfile.ZipFile(io.BytesIO(rp_data)) as rp_z:
    for item in rp_z.infolist():
        if item.is_dir() or item.filename.endswith('/'):
            continue
        target = os.path.join(life_rp, item.filename.replace('/', os.sep))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'wb') as f:
            f.write(rp_z.read(item.filename))

shutil.copy2(life_mcaddon, os.path.join(life_dest, 'Apocalypse_Life_Addon.mcaddon'))
print('Apocalypse Life Addon v1.4.3 applied successfully!')
