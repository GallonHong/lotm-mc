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
    f_pack = os.path.join(DOWNLOADS_DIR, '六分街_轻量场景_仅私用_0.1.1.mcpack')
    print(f"Processing {os.path.basename(f_pack)} ...")
    lfj_dest = os.path.join(BASE_DEV, 'liufenjie_scene_addon')
    lfj_bp = os.path.join(lfj_dest, 'liufenjie_scene_bp')
    extract_pack_file(f_pack, lfj_bp)
    
    shutil.copy2(f_pack, os.path.join(lfj_dest, 'Liufenjie_Scene_PVP.mcpack'))
    shutil.copy2(f_pack, os.path.join(lfj_dest, 'Liufenjie_Scene_PVP_v0.1.1.mcpack'))
    shutil.copy2(f_pack, os.path.join(lfj_dest, os.path.basename(f_pack)))
    shutil.copy2(f_pack, os.path.join(RELEASES_DIR, os.path.basename(f_pack)))
    print("  [OK] liufenjie_scene_addon updated to v0.1.1")

if __name__ == '__main__':
    main()
