import os, zipfile, shutil

repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
addon_dir = os.path.join(repo_dir, 'addons', 'development', 'sapi_server_addon')
bp_dir = os.path.join(addon_dir, 'sapi_server_bp')
rp_dir = os.path.join(addon_dir, 'sapi_server_rp')

bp_pack = os.path.join(addon_dir, 'SAPI_Server_BP.mcpack')
rp_pack = os.path.join(addon_dir, 'SAPI_Server_RP.mcpack')
addon = os.path.join(addon_dir, 'SAPI_Server_Addon.mcaddon')

def zip_folder(folder_path, output_path):
    if os.path.exists(output_path):
        os.remove(output_path)
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            if any(x in root for x in [".git", "node_modules", ".gemini", "__pycache__"]):
                continue
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, folder_path).replace(os.sep, '/')
                zipf.write(full_path, rel_path)

print("Building SAPI Server BP pack...")
zip_folder(bp_dir, bp_pack)

print("Building SAPI Server RP pack...")
zip_folder(rp_dir, rp_pack)

print("Building combined SAPI Server .mcaddon...")
if os.path.exists(addon):
    os.remove(addon)
with zipfile.ZipFile(addon, 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipf.write(bp_pack, os.path.basename(bp_pack))
    zipf.write(rp_pack, os.path.basename(rp_pack))

print(f"Built SAPI Server Addon successfully: {addon}")
