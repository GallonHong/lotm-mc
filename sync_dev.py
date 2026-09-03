import os
import subprocess
import shutil

mojang_dir = os.path.expandvars(r'%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang')
dev_bp_dir = os.path.join(mojang_dir, 'development_behavior_packs')
dev_rp_dir = os.path.join(mojang_dir, 'development_resource_packs')

os.makedirs(dev_bp_dir, exist_ok=True)
os.makedirs(dev_rp_dir, exist_ok=True)

links = [
    (os.path.abspath('test_guns_2d_addon/test_guns_bp'), os.path.join(dev_bp_dir, 'Test_Guns_2D_BP')),
    (os.path.abspath('test_guns_2d_addon/test_guns_rp'), os.path.join(dev_rp_dir, 'Test_Guns_2D_RP')),
    (os.path.abspath('apex_boss_addon/apex_boss_bp'), os.path.join(dev_bp_dir, 'Apex_Boss_BP')),
    (os.path.abspath('apex_boss_addon/apex_boss_rp'), os.path.join(dev_rp_dir, 'Apex_Boss_RP')),
    (os.path.abspath('apocalypse_vehicles_addon/apocalypse_vehicles_bp'), os.path.join(dev_bp_dir, 'apocalypse_vehicles_bp')),
    (os.path.abspath('apocalypse_vehicles_addon/apocalypse_vehicles_rp'), os.path.join(dev_rp_dir, 'apocalypse_vehicles_rp')),
    (os.path.abspath('apocalypse_mobs_addon/apocalypse_mobs_bp'), os.path.join(dev_bp_dir, 'apocalypse_mobs_bp')),
    (os.path.abspath('apocalypse_mobs_addon/apocalypse_mobs_rp'), os.path.join(dev_rp_dir, 'apocalypse_mobs_rp')),
    (os.path.abspath('apocalypse_extraction_addon/extraction_bp'), os.path.join(dev_bp_dir, 'extraction_bp')),
    (os.path.abspath('apocalypse_extraction_addon/extraction_rp'), os.path.join(dev_rp_dir, 'extraction_rp')),
    (os.path.abspath('daily_world_events_addon/daily_events_bp'), os.path.join(dev_bp_dir, 'daily_events_bp')),
    (os.path.abspath('daily_world_events_addon/daily_events_rp'), os.path.join(dev_rp_dir, 'daily_events_rp')),
]

for src, dst in links:
    if os.path.exists(dst):
        try:
            os.rmdir(dst)
        except OSError:
            if os.path.islink(dst):
                os.unlink(dst)
            elif os.path.isdir(dst):
                shutil.rmtree(dst)
    cmd = f'cmd /c mklink /J "{dst}" "{src}"'
    subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(f"[OK Linked] {os.path.basename(dst)} -> {src}")

print("[SUCCESS] Live Dev Sync Activated!")
