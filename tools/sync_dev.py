import os
import subprocess
import shutil

mojang_dir = os.path.expandvars(r'%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang')
dev_bp_dir = os.path.join(mojang_dir, 'development_behavior_packs')
dev_rp_dir = os.path.join(mojang_dir, 'development_resource_packs')

os.makedirs(dev_bp_dir, exist_ok=True)
os.makedirs(dev_rp_dir, exist_ok=True)

repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
development_dir = os.path.join(repo_dir, 'addons', 'development')
reference_dir = os.path.join(repo_dir, 'addons', 'reference')

def development(path):
    return os.path.join(development_dir, path)

def reference(path):
    return os.path.join(reference_dir, path)

links = [
    (development('test_guns_2d_addon/test_guns_bp'), os.path.join(dev_bp_dir, 'Test_Guns_2D_BP')),
    (development('test_guns_2d_addon/test_guns_rp'), os.path.join(dev_rp_dir, 'Test_Guns_2D_RP')),
    (reference('apex_boss_addon/apex_boss_bp'), os.path.join(dev_bp_dir, 'Apex_Boss_BP')),
    (reference('apex_boss_addon/apex_boss_rp'), os.path.join(dev_rp_dir, 'Apex_Boss_RP')),
    (development('apocalypse_life_addon/apocalypse_life_bp'), os.path.join(dev_bp_dir, 'apocalypse_life_bp')),
    (development('apocalypse_life_addon/apocalypse_life_rp'), os.path.join(dev_rp_dir, 'apocalypse_life_rp')),
    (development('apocalypse_mobs_addon/apocalypse_mobs_bp'), os.path.join(dev_bp_dir, 'apocalypse_mobs_bp')),
    (development('apocalypse_mobs_addon/apocalypse_mobs_rp'), os.path.join(dev_rp_dir, 'apocalypse_mobs_rp')),
    (development('apocalypse_extraction_addon/extraction_bp'), os.path.join(dev_bp_dir, 'extraction_bp')),
    (development('apocalypse_extraction_addon/extraction_rp'), os.path.join(dev_rp_dir, 'extraction_rp')),
    (development('daily_world_events_addon/daily_events_bp'), os.path.join(dev_bp_dir, 'daily_events_bp')),
    (development('daily_world_events_addon/daily_events_rp'), os.path.join(dev_rp_dir, 'daily_events_rp')),
    (development('apocalypse_ui_addon/apocalypse_ui_rp'), os.path.join(dev_rp_dir, 'apocalypse_ui_rp')),
    (development('sapi_server_addon/sapi_server_bp'), os.path.join(dev_bp_dir, 'sapi_server_bp')),
    (development('sapi_server_addon/sapi_server_rp'), os.path.join(dev_rp_dir, 'sapi_server_rp')),
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
