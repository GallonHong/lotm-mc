import os, zipfile, shutil

repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
addon_dir = os.path.join(repo_dir, 'addons', 'development', 'apocalypse_vehicles_addon')
bp_dir = os.path.join(addon_dir, 'apocalypse_vehicles_bp')
rp_dir = os.path.join(addon_dir, 'apocalypse_vehicles_rp')

bp_pack = os.path.join(addon_dir, 'Apocalypse_Vehicles_BP.mcpack')
rp_pack = os.path.join(addon_dir, 'Apocalypse_Vehicles_RP.mcpack')
addon = os.path.join(addon_dir, 'Apocalypse_Vehicles_Addon.mcaddon')

def zip_folder(folder_path, output_path):
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            if any(x in root for x in [".git", "node_modules", ".gemini", "__pycache__"]):
                continue
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, folder_path)
                zipf.write(full_path, rel_path)

print("Building Vehicles BP pack...")
zip_folder(bp_dir, bp_pack)

print("Building Vehicles RP pack...")
zip_folder(rp_dir, rp_pack)

print("Building Combined Vehicles .mcaddon...")
with zipfile.ZipFile(addon, 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipf.write(bp_pack, os.path.basename(bp_pack))
    zipf.write(rp_pack, os.path.basename(rp_pack))

print(f"Built Apocalypse Vehicles Addon successfully: {addon}")
