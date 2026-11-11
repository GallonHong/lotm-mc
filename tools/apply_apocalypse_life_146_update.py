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
    print("=== Applying Update: Apocalypse Life v1.4.6 ===")

    f_life = os.path.join(DOWNLOADS_DIR, 'Apocalypse_Life_倒地联动_1.4.6.mcaddon')
    print(f"\nProcessing {os.path.basename(f_life)} ...")
    life_dest = os.path.join(BASE_DEV, 'apocalypse_life_addon')
    life_bp = os.path.join(life_dest, 'apocalypse_life_bp')
    life_rp = os.path.join(life_dest, 'apocalypse_life_rp')

    with zipfile.ZipFile(f_life, 'r') as z:
        bp_name = next(n for n in z.namelist() if 'bp' in n.lower())
        rp_name = next(n for n in z.namelist() if 'rp' in n.lower())
        bp_data = z.read(bp_name)
        rp_data = z.read(rp_name)

    extract_pack_bytes(bp_data, life_bp)
    extract_pack_bytes(rp_data, life_rp)

    with open(os.path.join(life_dest, 'Apocalypse_Life_BP.mcpack'), 'wb') as f:
        f.write(bp_data)
    with open(os.path.join(life_dest, 'Apocalypse_Life_RP.mcpack'), 'wb') as f:
        f.write(rp_data)

    shutil.copy2(f_life, os.path.join(life_dest, 'Apocalypse_Life_Addon.mcaddon'))
    shutil.copy2(f_life, os.path.join(life_dest, 'Apocalypse_Life_Addon_v1.4.6.mcaddon'))
    shutil.copy2(f_life, os.path.join(life_dest, os.path.basename(f_life)))
    shutil.copy2(f_life, os.path.join(RELEASES_DIR, os.path.basename(f_life)))
    print("  [OK] apocalypse_life_addon updated to v1.4.6")

    print("\n=== Apocalypse Life v1.4.6 applied successfully! ===")

if __name__ == '__main__':
    main()
