# -*- coding: utf-8 -*-
import zipfile, io, os, shutil, sys

sys.stdout.reconfigure(encoding='utf-8')

base_dev = r'C:\Users\10973\Desktop\mcaddon\addons\development'

def extract_pack(pack_bytes, dest_dir):
    with zipfile.ZipFile(io.BytesIO(pack_bytes)) as pz:
        for item in pz.infolist():
            if item.is_dir() or item.filename.endswith('/'):
                continue
            target = os.path.join(dest_dir, item.filename.replace('/', os.sep))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, 'wb') as f:
                f.write(pz.read(item.filename))

# 1. Survival Daily & World Events Addon v0.19.1
daily_mcaddon = r'c:\Users\10973\Downloads\Survival_Daily_Events_Addon_v0.19.1.mcaddon'
daily_dest = os.path.join(base_dev, 'daily_world_events_addon')
daily_bp = os.path.join(daily_dest, 'daily_events_bp')
daily_rp = os.path.join(daily_dest, 'daily_events_rp')

print('Extracting Survival Daily & World Events Addon v0.19.1...')
with zipfile.ZipFile(daily_mcaddon, 'r') as z:
    bp_data = z.read('Survival_Daily_Events_BP.mcpack')
    rp_data = z.read('Survival_Daily_Events_RP.mcpack')

extract_pack(bp_data, daily_bp)
extract_pack(rp_data, daily_rp)

with open(os.path.join(daily_dest, 'Survival_Daily_Events_BP.mcpack'), 'wb') as f:
    f.write(bp_data)
with open(os.path.join(daily_dest, 'Survival_Daily_Events_RP.mcpack'), 'wb') as f:
    f.write(rp_data)
shutil.copy2(daily_mcaddon, os.path.join(daily_dest, 'Survival_Daily_Events_Addon.mcaddon'))
shutil.copy2(daily_mcaddon, os.path.join(daily_dest, 'Survival_Daily_Events_Addon_v0.19.1.mcaddon'))
print('Survival Daily & World Events Addon v0.19.1 applied successfully!')

# 2. Apocalypse UI Addon v1.2.1
ui_mcaddon = r'c:\Users\10973\Downloads\Apocalypse_UI_Addon_v1.2.1.mcaddon'
ui_dest = os.path.join(base_dev, 'apocalypse_ui_addon')
ui_rp = os.path.join(ui_dest, 'apocalypse_ui_rp')

print('Extracting Apocalypse UI Addon v1.2.1...')
with zipfile.ZipFile(ui_mcaddon, 'r') as z:
    ui_pack_data = z.read('Apocalypse_UI.mcpack')

extract_pack(ui_pack_data, ui_rp)

dist_dir = os.path.join(ui_dest, 'dist')
os.makedirs(dist_dir, exist_ok=True)
with open(os.path.join(dist_dir, 'Apocalypse_UI.mcpack'), 'wb') as f:
    f.write(ui_pack_data)
with open(os.path.join(dist_dir, 'Apocalypse_UI_v1.2.1.mcpack'), 'wb') as f:
    f.write(ui_pack_data)
print('Apocalypse UI Addon v1.2.1 applied successfully!')

# 3. SAPI Server Addon v2.12.5
sapi_mcaddon = r'c:\Users\10973\Downloads\SAPI_Server_Addon_v2.12.5.mcaddon'
sapi_dest = os.path.join(base_dev, 'sapi_server_addon')
sapi_bp = os.path.join(sapi_dest, 'sapi_server_bp')
sapi_rp = os.path.join(sapi_dest, 'sapi_server_rp')

print('Extracting SAPI Server Addon v2.12.5...')
with zipfile.ZipFile(sapi_mcaddon, 'r') as z:
    sapi_bp_data = z.read('SAPI_Server_BP.mcpack')
    sapi_rp_data = z.read('SAPI_Server_RP.mcpack')

extract_pack(sapi_bp_data, sapi_bp)
extract_pack(sapi_rp_data, sapi_rp)

shutil.copy2(sapi_mcaddon, os.path.join(sapi_dest, 'SAPI_Server_Addon.mcaddon'))
print('SAPI Server Addon v2.12.5 applied successfully!')
