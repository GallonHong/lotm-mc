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
    print("=== Applying Updates: Test Guns v3.13.3 & Boss Model Fix v0.1.0 ===")

    # 1. 枪械_护甲盾牌耐久修复_3.13.3.mcaddon -> test_guns_2d_addon
    f_guns = os.path.join(DOWNLOADS_DIR, '枪械_护甲盾牌耐久修复_3.13.3.mcaddon')
    print(f"\n[1/2] Processing {os.path.basename(f_guns)} ...")
    guns_dest = os.path.join(BASE_DEV, 'test_guns_2d_addon')
    guns_bp = os.path.join(guns_dest, 'test_guns_bp')
    guns_rp = os.path.join(guns_dest, 'test_guns_rp')
    with zipfile.ZipFile(f_guns, 'r') as z:
        bp_data = z.read('Test_Guns_2D_BP.mcpack')
        rp_data = z.read('Test_Guns_2D_RP.mcpack')
    extract_pack_bytes(bp_data, guns_bp)
    extract_pack_bytes(rp_data, guns_rp)
    with open(os.path.join(guns_dest, 'Test_Guns_2D_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(guns_dest, 'Test_Guns_2D_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f_guns, os.path.join(guns_dest, 'Test_Guns_2D_Addon.mcaddon'))
    shutil.copy2(f_guns, os.path.join(guns_dest, 'Test_Guns_2D_Addon_v3.13.3.mcaddon'))
    shutil.copy2(f_guns, os.path.join(guns_dest, os.path.basename(f_guns)))
    shutil.copy2(f_guns, os.path.join(RELEASES_DIR, os.path.basename(f_guns)))
    print("  [OK] test_guns_2d_addon updated to v3.13.3")

    # 2. Boss_全模型独立修复_0.1.0.mcaddon -> apocalypse_boss_addon
    f_boss = os.path.join(DOWNLOADS_DIR, 'Boss_全模型独立修复_0.1.0.mcaddon')
    print(f"\n[2/2] Processing {os.path.basename(f_boss)} ...")
    boss_dest = os.path.join(BASE_DEV, 'apocalypse_boss_addon')
    boss_bp = os.path.join(boss_dest, 'apocalypse_boss_bp')
    boss_rp = os.path.join(boss_dest, 'apocalypse_boss_rp')
    with zipfile.ZipFile(f_boss, 'r') as z:
        bp_data = z.read('Boss_无攻击显示测试_0.1.0.mcpack')
        rp_data = z.read('Boss_全模型资源修复_0.1.0.mcpack')
    extract_pack_bytes(bp_data, boss_bp)
    extract_pack_bytes(rp_data, boss_rp)
    with open(os.path.join(boss_dest, 'Boss_无攻击显示测试_0.1.0.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(boss_dest, 'Boss_全模型资源修复_0.1.0.mcpack'), 'wb') as f:
        f.write(rp_data)
    with open(os.path.join(boss_dest, 'Apocalypse_Boss_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(boss_dest, 'Apocalypse_Boss_RP.mcpack'), 'wb') as f:
        f.write(rp_data)
    shutil.copy2(f_boss, os.path.join(boss_dest, 'Apocalypse_Boss_Addon.mcaddon'))
    shutil.copy2(f_boss, os.path.join(boss_dest, 'Apocalypse_Boss_Addon_v0.1.0.mcaddon'))
    shutil.copy2(f_boss, os.path.join(boss_dest, os.path.basename(f_boss)))
    shutil.copy2(f_boss, os.path.join(RELEASES_DIR, os.path.basename(f_boss)))
    print("  [OK] apocalypse_boss_addon updated to v0.1.0")

    print("\n=== All updates applied successfully! ===")

if __name__ == '__main__':
    main()
