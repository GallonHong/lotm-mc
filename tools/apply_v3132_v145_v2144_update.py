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
    print("=== Applying Updates: Test Guns v3.13.2, Drone & Life v1.4.5, SAPI Server v2.14.4 ===")

    # 1. 枪械系统_倒地联动_3.13.2.mcaddon -> test_guns_2d_addon
    f_guns = os.path.join(DOWNLOADS_DIR, '枪械系统_倒地联动_3.13.2.mcaddon')
    print(f"\n[1/3] Processing {os.path.basename(f_guns)} ...")
    guns_dest = os.path.join(BASE_DEV, 'test_guns_2d_addon')
    guns_bp = os.path.join(guns_dest, 'test_guns_bp')
    guns_rp = os.path.join(guns_dest, 'test_guns_rp')
    with zipfile.ZipFile(f_guns, 'r') as z:
        bp_data = z.read('test_guns_bp.mcpack')
        rp_data = z.read('test_guns_rp.mcpack')
    extract_pack_bytes(bp_data, guns_bp)
    extract_pack_bytes(rp_data, guns_rp)
    with open(os.path.join(guns_dest, 'Test_Guns_2D_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(guns_dest, 'Test_Guns_2D_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f_guns, os.path.join(guns_dest, 'Test_Guns_2D_Addon.mcaddon'))
    shutil.copy2(f_guns, os.path.join(guns_dest, 'Test_Guns_2D_Addon_v3.13.2.mcaddon'))
    shutil.copy2(f_guns, os.path.join(guns_dest, os.path.basename(f_guns)))
    shutil.copy2(f_guns, os.path.join(RELEASES_DIR, os.path.basename(f_guns)))
    print("  [OK] test_guns_2d_addon updated to v3.13.2")

    # 2. 无人机与生活系统_救援修复_1.4.5.mcaddon -> apocalypse_life_addon
    f_life = os.path.join(DOWNLOADS_DIR, '无人机与生活系统_救援修复_1.4.5.mcaddon')
    print(f"\n[2/3] Processing {os.path.basename(f_life)} ...")
    life_dest = os.path.join(BASE_DEV, 'apocalypse_life_addon')
    life_bp = os.path.join(life_dest, 'apocalypse_life_bp')
    life_rp = os.path.join(life_dest, 'apocalypse_life_rp')
    with zipfile.ZipFile(f_life, 'r') as z:
        bp_data = z.read('apocalypse_life_bp.mcpack')
        rp_data = z.read('apocalypse_life_rp.mcpack')
    extract_pack_bytes(bp_data, life_bp)
    extract_pack_bytes(rp_data, life_rp)
    with open(os.path.join(life_dest, 'Apocalypse_Life_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(life_dest, 'Apocalypse_Life_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f_life, os.path.join(life_dest, 'Apocalypse_Life_Addon.mcaddon'))
    shutil.copy2(f_life, os.path.join(life_dest, 'Apocalypse_Life_Addon_v1.4.5.mcaddon'))
    shutil.copy2(f_life, os.path.join(life_dest, os.path.basename(f_life)))
    shutil.copy2(f_life, os.path.join(RELEASES_DIR, os.path.basename(f_life)))
    print("  [OK] apocalypse_life_addon updated to v1.4.5")

    # 3. 废土争夺战_倒地救援_服务器核心_2.14.4.mcaddon -> sapi_server_addon
    f_sapi = os.path.join(DOWNLOADS_DIR, '废土争夺战_倒地救援_服务器核心_2.14.4.mcaddon')
    print(f"\n[3/3] Processing {os.path.basename(f_sapi)} ...")
    sapi_dest = os.path.join(BASE_DEV, 'sapi_server_addon')
    sapi_bp = os.path.join(sapi_dest, 'sapi_server_bp')
    sapi_rp = os.path.join(sapi_dest, 'sapi_server_rp')
    with zipfile.ZipFile(f_sapi, 'r') as z:
        bp_data = z.read('sapi_server_bp.mcpack')
        rp_data = z.read('sapi_server_rp.mcpack')
    extract_pack_bytes(bp_data, sapi_bp)
    extract_pack_bytes(rp_data, sapi_rp)
    with open(os.path.join(sapi_dest, 'SAPI_Server_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(sapi_dest, 'SAPI_Server_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f_sapi, os.path.join(sapi_dest, 'SAPI_Server_Addon.mcaddon'))
    shutil.copy2(f_sapi, os.path.join(sapi_dest, 'SAPI_Server_Addon_v2.14.4.mcaddon'))
    shutil.copy2(f_sapi, os.path.join(sapi_dest, os.path.basename(f_sapi)))
    shutil.copy2(f_sapi, os.path.join(RELEASES_DIR, os.path.basename(f_sapi)))
    print("  [OK] sapi_server_addon updated to v2.14.4")

    print("\n=== All 3 add-on packages applied successfully! ===")

if __name__ == '__main__':
    main()
