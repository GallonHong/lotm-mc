# -*- coding: utf-8 -*-
import io
import os
import shutil
import sys
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DEV = os.path.join(REPO_DIR, 'addons', 'development')
DOWNLOADS_DIR = r'C:\Users\10973\Downloads'
RELEASES_DIR = os.path.join(REPO_DIR, 'releases')

def clean_dir(d):
    if os.path.exists(d):
        shutil.rmtree(d)
    os.makedirs(d, exist_ok=True)

def extract_pack_bytes(pack_bytes, dest_dir):
    clean_dir(dest_dir)
    with zipfile.ZipFile(io.BytesIO(pack_bytes)) as zf:
        for item in zf.infolist():
            if item.is_dir() or item.filename.endswith('/'):
                continue
            target = os.path.join(dest_dir, item.filename.replace('/', os.sep))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, 'wb') as f:
                f.write(zf.read(item.filename))
    print(f"  -> Extracted to: {os.path.relpath(dest_dir, REPO_DIR)}")

def extract_pack_file(file_path, dest_dir):
    clean_dir(dest_dir)
    with zipfile.ZipFile(file_path, 'r') as zf:
        for item in zf.infolist():
            if item.is_dir() or item.filename.endswith('/'):
                continue
            target = os.path.join(dest_dir, item.filename.replace('/', os.sep))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, 'wb') as f:
                f.write(zf.read(item.filename))
    print(f"  -> Extracted to: {os.path.relpath(dest_dir, REPO_DIR)}")

def main():
    print("=== Applying Updates: SAPI Server v2.14.5 & Pose Compatibility v1.1.2 ===")

    # 1. 废土争夺战_倒地救援_服务器核心_2.14.5.mcaddon -> sapi_server_addon
    f_sapi = os.path.join(DOWNLOADS_DIR, '废土争夺战_倒地救援_服务器核心_2.14.5.mcaddon')
    print(f"\n[1/2] Processing {os.path.basename(f_sapi)} ...")
    sapi_dest = os.path.join(BASE_DEV, 'sapi_server_addon')
    sapi_bp = os.path.join(sapi_dest, 'sapi_server_bp')
    sapi_rp = os.path.join(sapi_dest, 'sapi_server_rp')

    with zipfile.ZipFile(f_sapi, 'r') as z:
        bp_name = next(n for n in z.namelist() if 'BP' in n)
        rp_name = next(n for n in z.namelist() if 'RP' in n)
        bp_data = z.read(bp_name)
        rp_data = z.read(rp_name)

    extract_pack_bytes(bp_data, sapi_bp)
    extract_pack_bytes(rp_data, sapi_rp)

    with open(os.path.join(sapi_dest, 'SAPI_Server_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(sapi_dest, 'SAPI_Server_RP.mcpack'), 'wb') as f:
        f.write(rp_data)

    shutil.copy2(f_sapi, os.path.join(sapi_dest, 'SAPI_Server_Addon.mcaddon'))
    shutil.copy2(f_sapi, os.path.join(sapi_dest, 'SAPI_Server_Addon_v2.14.5.mcaddon'))
    shutil.copy2(f_sapi, os.path.join(sapi_dest, os.path.basename(f_sapi)))
    shutil.copy2(f_sapi, os.path.join(RELEASES_DIR, os.path.basename(f_sapi)))
    print("  [OK] sapi_server_addon updated to v2.14.5")

    # 2. 末日生存_Guns姿态兼容_1.1.2.mcpack -> apocalypse_test_guns_pose_compatibility
    f_pose = os.path.join(DOWNLOADS_DIR, '末日生存_Guns姿态兼容_1.1.2.mcpack')
    print(f"\n[2/2] Processing {os.path.basename(f_pose)} ...")
    pose_dest = os.path.join(BASE_DEV, 'apocalypse_test_guns_pose_compatibility')

    extract_pack_file(f_pose, pose_dest)
    shutil.copy2(f_pose, os.path.join(pose_dest, 'Apocalypse_Test_Guns_Pose_Compatibility.mcpack'))
    shutil.copy2(f_pose, os.path.join(RELEASES_DIR, os.path.basename(f_pose)))
    print("  [OK] apocalypse_test_guns_pose_compatibility updated to v1.1.2")

    print("\n=== All updates applied successfully! ===")

if __name__ == '__main__':
    main()
