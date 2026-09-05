import os, zipfile, shutil

repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
addon_dir = os.path.join(repo_dir, 'addons', 'development', 'apocalypse_mobs_addon')
bp_dir = os.path.join(addon_dir, 'apocalypse_mobs_bp')
rp_dir = os.path.join(addon_dir, 'apocalypse_mobs_rp')

bp_pack = os.path.join(addon_dir, 'Apocalypse_Mobs_BP.mcpack')
rp_pack = os.path.join(addon_dir, 'Apocalypse_Mobs_RP.mcpack')
addon = os.path.join(addon_dir, 'Apocalypse_Mobs_Addon.mcaddon')
v_addon = os.path.join(addon_dir, 'Apocalypse_Mobs_Addon_v0.6.0.mcaddon')

def zip_folder(folder_path, output_path):
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, folder_path)
                zipf.write(full_path, rel_path)

print("Building BP pack...")
zip_folder(bp_dir, bp_pack)

print("Building RP pack...")
zip_folder(rp_dir, rp_pack)

print("Building Combined .mcaddon...")
with zipfile.ZipFile(addon, 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipf.write(bp_pack, os.path.basename(bp_pack))
    zipf.write(rp_pack, os.path.basename(rp_pack))

shutil.copy2(addon, v_addon)
print("Built Apocalypse Mobs Addon successfully:")
print(f" - {addon}")
