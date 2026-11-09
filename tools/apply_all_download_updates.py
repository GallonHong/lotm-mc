# -*- coding: utf-8 -*-
import zipfile
import io
import os
import shutil
import sys
import subprocess

sys.stdout.reconfigure(encoding='utf-8')

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DEV = os.path.join(REPO_DIR, 'addons', 'development')
DOWNLOADS_DIR = r'C:\Users\10973\Downloads'

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
    print("=== Starting Full Update & Overwrite of Addons & Workspace ===")

    # 1. 01_服务器与比赛核心_2.13.1.mcaddon -> sapi_server_addon
    f01 = os.path.join(DOWNLOADS_DIR, '01_服务器与比赛核心_2.13.1.mcaddon')
    print(f"\n[1/10] Processing {os.path.basename(f01)} ...")
    sapi_dest = os.path.join(BASE_DEV, 'sapi_server_addon')
    sapi_bp = os.path.join(sapi_dest, 'sapi_server_bp')
    sapi_rp = os.path.join(sapi_dest, 'sapi_server_rp')
    with zipfile.ZipFile(f01, 'r') as z:
        bp_data = z.read('sapi_server_bp.mcpack')
        rp_data = z.read('sapi_server_rp.mcpack')
    extract_pack_bytes(bp_data, sapi_bp)
    extract_pack_bytes(rp_data, sapi_rp)
    with open(os.path.join(sapi_dest, 'SAPI_Server_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(sapi_dest, 'SAPI_Server_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f01, os.path.join(sapi_dest, 'SAPI_Server_Addon.mcaddon'))
    shutil.copy2(f01, os.path.join(sapi_dest, 'SAPI_Server_Addon_v2.13.1.mcaddon'))
    shutil.copy2(f01, os.path.join(sapi_dest, os.path.basename(f01)))
    print("  [OK] sapi_server_addon updated to v2.13.1")

    # 2. 02_无人机与生活系统_1.4.4.mcaddon -> apocalypse_life_addon
    f02 = os.path.join(DOWNLOADS_DIR, '02_无人机与生活系统_1.4.4.mcaddon')
    print(f"\n[2/10] Processing {os.path.basename(f02)} ...")
    life_dest = os.path.join(BASE_DEV, 'apocalypse_life_addon')
    life_bp = os.path.join(life_dest, 'apocalypse_life_bp')
    life_rp = os.path.join(life_dest, 'apocalypse_life_rp')
    with zipfile.ZipFile(f02, 'r') as z:
        bp_data = z.read('apocalypse_life_bp.mcpack')
        rp_data = z.read('apocalypse_life_rp.mcpack')
    extract_pack_bytes(bp_data, life_bp)
    extract_pack_bytes(rp_data, life_rp)
    with open(os.path.join(life_dest, 'Apocalypse_Life_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(life_dest, 'Apocalypse_Life_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f02, os.path.join(life_dest, 'Apocalypse_Life_Addon.mcaddon'))
    shutil.copy2(f02, os.path.join(life_dest, 'Apocalypse_Life_Addon_v1.4.4.mcaddon'))
    shutil.copy2(f02, os.path.join(life_dest, os.path.basename(f02)))
    print("  [OK] apocalypse_life_addon updated to v1.4.4")

    # 3. 03_枪械系统_3.12.7.mcaddon -> test_guns_2d_addon
    f03 = os.path.join(DOWNLOADS_DIR, '03_枪械系统_3.12.7.mcaddon')
    print(f"\n[3/10] Processing {os.path.basename(f03)} ...")
    guns_dest = os.path.join(BASE_DEV, 'test_guns_2d_addon')
    guns_bp = os.path.join(guns_dest, 'test_guns_bp')
    guns_rp = os.path.join(guns_dest, 'test_guns_rp')
    with zipfile.ZipFile(f03, 'r') as z:
        bp_data = z.read('test_guns_bp.mcpack')
        rp_data = z.read('test_guns_rp.mcpack')
    extract_pack_bytes(bp_data, guns_bp)
    extract_pack_bytes(rp_data, guns_rp)
    with open(os.path.join(guns_dest, 'Test_Guns_2D_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(guns_dest, 'Test_Guns_2D_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f03, os.path.join(guns_dest, 'Test_Guns_2D_Addon.mcaddon'))
    shutil.copy2(f03, os.path.join(guns_dest, 'Test_Guns_2D_Addon_v3.12.7.mcaddon'))
    shutil.copy2(f03, os.path.join(guns_dest, os.path.basename(f03)))
    print("  [OK] test_guns_2d_addon updated to v3.12.7")

    # 4. 04_城市摸金兼容_0.10.9.mcaddon -> apocalypse_extraction_addon
    f04 = os.path.join(DOWNLOADS_DIR, '04_城市摸金兼容_0.10.9.mcaddon')
    print(f"\n[4/10] Processing {os.path.basename(f04)} ...")
    ext_dest = os.path.join(BASE_DEV, 'apocalypse_extraction_addon')
    ext_bp = os.path.join(ext_dest, 'extraction_bp')
    ext_rp = os.path.join(ext_dest, 'extraction_rp')
    with zipfile.ZipFile(f04, 'r') as z:
        bp_data = z.read('extraction_bp.mcpack')
        rp_data = z.read('extraction_rp.mcpack')
    extract_pack_bytes(bp_data, ext_bp)
    extract_pack_bytes(rp_data, ext_rp)
    with open(os.path.join(ext_dest, 'Apocalypse_Extraction_City_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(ext_dest, 'Apocalypse_Extraction_City_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f04, os.path.join(ext_dest, 'Apocalypse_Extraction_City_Addon.mcaddon'))
    shutil.copy2(f04, os.path.join(ext_dest, 'Apocalypse_Extraction_City_Addon_v0.10.9.mcaddon'))
    shutil.copy2(f04, os.path.join(ext_dest, os.path.basename(f04)))
    print("  [OK] apocalypse_extraction_addon updated to v0.10.9")

    # 5. 05_日常与副本兼容_0.19.2.mcaddon -> daily_world_events_addon
    f05 = os.path.join(DOWNLOADS_DIR, '05_日常与副本兼容_0.19.2.mcaddon')
    print(f"\n[5/10] Processing {os.path.basename(f05)} ...")
    daily_dest = os.path.join(BASE_DEV, 'daily_world_events_addon')
    daily_bp = os.path.join(daily_dest, 'daily_events_bp')
    daily_rp = os.path.join(daily_dest, 'daily_events_rp')
    with zipfile.ZipFile(f05, 'r') as z:
        bp_data = z.read('daily_events_bp.mcpack')
        rp_data = z.read('daily_events_rp.mcpack')
    extract_pack_bytes(bp_data, daily_bp)
    extract_pack_bytes(rp_data, daily_rp)
    with open(os.path.join(daily_dest, 'Survival_Daily_Events_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(daily_dest, 'Survival_Daily_Events_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f05, os.path.join(daily_dest, 'Survival_Daily_Events_Addon.mcaddon'))
    shutil.copy2(f05, os.path.join(daily_dest, 'Survival_Daily_Events_Addon_v0.19.2.mcaddon'))
    shutil.copy2(f05, os.path.join(daily_dest, os.path.basename(f05)))
    print("  [OK] daily_world_events_addon updated to v0.19.2")

    # 6. 06_敌怪环境兼容_0.7.4.mcaddon -> apocalypse_mobs_addon
    f06 = os.path.join(DOWNLOADS_DIR, '06_敌怪环境兼容_0.7.4.mcaddon')
    print(f"\n[6/10] Processing {os.path.basename(f06)} ...")
    mobs_dest = os.path.join(BASE_DEV, 'apocalypse_mobs_addon')
    mobs_bp = os.path.join(mobs_dest, 'apocalypse_mobs_bp')
    mobs_rp = os.path.join(mobs_dest, 'apocalypse_mobs_rp')
    with zipfile.ZipFile(f06, 'r') as z:
        bp_data = z.read('apocalypse_mobs_bp.mcpack')
        rp_data = z.read('apocalypse_mobs_rp.mcpack')
    extract_pack_bytes(bp_data, mobs_bp)
    extract_pack_bytes(rp_data, mobs_rp)
    with open(os.path.join(mobs_dest, 'Apocalypse_Mobs_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(mobs_dest, 'Apocalypse_Mobs_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f06, os.path.join(mobs_dest, 'Apocalypse_Mobs_Addon.mcaddon'))
    shutil.copy2(f06, os.path.join(mobs_dest, 'Apocalypse_Mobs_Addon_v0.7.4.mcaddon'))
    shutil.copy2(f06, os.path.join(mobs_dest, os.path.basename(f06)))
    print("  [OK] apocalypse_mobs_addon updated to v0.7.4")

    # 7. 07_Boss兼容_1.3.1.mcaddon -> apocalypse_boss_addon
    f07 = os.path.join(DOWNLOADS_DIR, '07_Boss兼容_1.3.1.mcaddon')
    print(f"\n[7/10] Processing {os.path.basename(f07)} ...")
    boss_dest = os.path.join(BASE_DEV, 'apocalypse_boss_addon')
    boss_bp = os.path.join(boss_dest, 'apocalypse_boss_bp')
    boss_rp = os.path.join(boss_dest, 'apocalypse_boss_rp')
    with zipfile.ZipFile(f07, 'r') as z:
        bp_data = z.read('apocalypse_boss_bp.mcpack')
        rp_data = z.read('apocalypse_boss_rp.mcpack')
    extract_pack_bytes(bp_data, boss_bp)
    extract_pack_bytes(rp_data, boss_rp)
    with open(os.path.join(boss_dest, 'Apocalypse_Boss_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(boss_dest, 'Apocalypse_Boss_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f07, os.path.join(boss_dest, 'Apocalypse_Boss_Addon.mcaddon'))
    shutil.copy2(f07, os.path.join(boss_dest, 'Apocalypse_Boss_Addon_v1.3.1.mcaddon'))
    shutil.copy2(f07, os.path.join(boss_dest, os.path.basename(f07)))
    print("  [OK] apocalypse_boss_addon updated to v1.3.1")

    # 8. 08_灾害兼容_1.3.5.mcaddon -> natural_disasters_standalone_addon
    f08 = os.path.join(DOWNLOADS_DIR, '08_灾害兼容_1.3.5.mcaddon')
    print(f"\n[8/10] Processing {os.path.basename(f08)} ...")
    nd_dest = os.path.join(BASE_DEV, 'natural_disasters_standalone_addon')
    nd_bp = os.path.join(nd_dest, 'standalone_disasters_bp')
    nd_rp = os.path.join(nd_dest, 'standalone_disasters_rp')
    with zipfile.ZipFile(f08, 'r') as z:
        bp_data = z.read('standalone_disasters_bp.mcpack')
        rp_data = z.read('standalone_disasters_rp.mcpack')
    extract_pack_bytes(bp_data, nd_bp)
    extract_pack_bytes(rp_data, nd_rp)
    with open(os.path.join(nd_dest, 'Natural_Disasters_Standalone_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(nd_dest, 'Natural_Disasters_Standalone_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f08, os.path.join(nd_dest, 'Natural_Disasters_Standalone_Addon.mcaddon'))
    shutil.copy2(f08, os.path.join(nd_dest, 'Natural_Disasters_Standalone_Addon_v1.3.5.mcaddon'))
    shutil.copy2(f08, os.path.join(nd_dest, os.path.basename(f08)))
    print("  [OK] natural_disasters_standalone_addon updated to v1.3.5")

    # 9. 09_可选界面_1.2.2.mcpack -> apocalypse_ui_addon
    f09 = os.path.join(DOWNLOADS_DIR, '09_可选界面_1.2.2.mcpack')
    print(f"\n[9/10] Processing {os.path.basename(f09)} ...")
    ui_dest = os.path.join(BASE_DEV, 'apocalypse_ui_addon')
    ui_rp = os.path.join(ui_dest, 'apocalypse_ui_rp')
    extract_pack_file(f09, ui_rp)
    dist_dir = os.path.join(ui_dest, 'dist')
    os.makedirs(dist_dir, exist_ok=True)
    shutil.copy2(f09, os.path.join(dist_dir, 'Apocalypse_UI.mcpack'))
    shutil.copy2(f09, os.path.join(dist_dir, 'Apocalypse_UI_v1.2.2.mcpack'))
    shutil.copy2(f09, os.path.join(dist_dir, os.path.basename(f09)))
    print("  [OK] apocalypse_ui_addon updated to v1.2.2")

    # 10. 10_六分街场景_仅私用_0.1.0.mcpack -> liufenjie_scene_addon
    f10 = os.path.join(DOWNLOADS_DIR, '10_六分街场景_仅私用_0.1.0.mcpack')
    print(f"\n[10/10] Processing {os.path.basename(f10)} ...")
    lfj_dest = os.path.join(BASE_DEV, 'liufenjie_scene_addon')
    lfj_bp = os.path.join(lfj_dest, 'liufenjie_scene_bp')
    extract_pack_file(f10, lfj_bp)
    shutil.copy2(f10, os.path.join(lfj_dest, 'Liufenjie_Scene_PVP.mcpack'))
    shutil.copy2(f10, os.path.join(lfj_dest, 'Liufenjie_Scene_PVP_v0.1.0.mcpack'))
    shutil.copy2(f10, os.path.join(lfj_dest, os.path.basename(f10)))
    print("  [OK] liufenjie_scene_addon created & updated to v0.1.0")

    # Also keep master releases directory updated with the 10 packages
    releases_dir = os.path.join(REPO_DIR, 'releases')
    for f in [f01, f02, f03, f04, f05, f06, f07, f08, f09, f10]:
        shutil.copy2(f, os.path.join(releases_dir, os.path.basename(f)))
    print("\n[OK] Copied all 10 release packages to 'releases/'")

    print("\n=== All 10 add-on packages extracted and workspace overwritten successfully! ===")

if __name__ == '__main__':
    main()
