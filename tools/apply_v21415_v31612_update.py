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

def main():
    print("=== Applying Updates: SAPI Server v2.14.15 & Test Guns v3.16.12 ===")

    # 1. SAPI_2.14.15.mcaddon -> sapi_server_addon
    f_sapi = os.path.join(DOWNLOADS_DIR, 'SAPI_2.14.15.mcaddon')
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
    shutil.copy2(f_sapi, os.path.join(sapi_dest, 'SAPI_Server_Addon_v2.14.15.mcaddon'))
    shutil.copy2(f_sapi, os.path.join(sapi_dest, os.path.basename(f_sapi)))
    shutil.copy2(f_sapi, os.path.join(RELEASES_DIR, os.path.basename(f_sapi)))
    print("  [OK] sapi_server_addon updated to v2.14.15")

    # 2. LOTM_Guns_3.16.12.mcaddon -> test_guns_2d_addon
    f_tg = os.path.join(DOWNLOADS_DIR, 'LOTM_Guns_3.16.12.mcaddon')
    print(f"\n[2/2] Processing {os.path.basename(f_tg)} ...")
    tg_dest = os.path.join(BASE_DEV, 'test_guns_2d_addon')
    tg_bp = os.path.join(tg_dest, 'test_guns_bp')
    tg_rp = os.path.join(tg_dest, 'test_guns_rp')

    with zipfile.ZipFile(f_tg, 'r') as z:
        bp_name = next(n for n in z.namelist() if 'BP' in n)
        rp_name = next(n for n in z.namelist() if 'RP' in n)
        bp_data = z.read(bp_name)
        rp_data = z.read(rp_name)

    extract_pack_bytes(bp_data, tg_bp)
    extract_pack_bytes(rp_data, tg_rp)

    with open(os.path.join(tg_dest, 'Test_Guns_2D_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(tg_dest, 'Test_Guns_2D_RP.mcpack'), 'wb') as f:
        f.write(rp_data)

    shutil.copy2(f_tg, os.path.join(tg_dest, 'Test_Guns_2D_Addon.mcaddon'))
    shutil.copy2(f_tg, os.path.join(tg_dest, 'Test_Guns_2D_Addon_v3.16.12.mcaddon'))
    shutil.copy2(f_tg, os.path.join(tg_dest, os.path.basename(f_tg)))
    shutil.copy2(f_tg, os.path.join(RELEASES_DIR, os.path.basename(f_tg)))
    print("  [OK] test_guns_2d_addon updated to v3.16.12")

    print("\n=== All updates applied successfully! ===")

if __name__ == '__main__':
    main()
