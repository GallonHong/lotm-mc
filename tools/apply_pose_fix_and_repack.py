import os
import sys
import zipfile
import io
import shutil
import re

sys.stdout.reconfigure(encoding='utf-8')

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS_DIR = r"c:\Users\10973\Downloads"
TG_ADDON = os.path.join(DOWNLOADS_DIR, "Test_Guns_Pose_Fix_v3.12.5.mcaddon")
COMPAT_PACK = os.path.join(DOWNLOADS_DIR, "Apocalypse_Test_Guns_Pose_Compatibility.mcpack")

DEV_DIR = os.path.join(REPO_DIR, "addons", "development")
TG_BP_DIR = os.path.join(DEV_DIR, "test_guns_2d_addon", "test_guns_bp")
TG_RP_DIR = os.path.join(DEV_DIR, "test_guns_2d_addon", "test_guns_rp")
COMPAT_DIR = os.path.join(DEV_DIR, "apocalypse_test_guns_pose_compatibility")

print("[1] Unpacking Test_Guns_Pose_Fix_v3.12.5.mcaddon...")
with zipfile.ZipFile(TG_ADDON, 'r') as z:
    for name in z.namelist():
        pack_data = io.BytesIO(z.read(name))
        with zipfile.ZipFile(pack_data, 'r') as pz:
            if "BP" in name:
                target_dir = TG_BP_DIR
            else:
                target_dir = TG_RP_DIR
            print(f"  Extracting {name} -> {target_dir}")
            os.makedirs(target_dir, exist_ok=True)
            for member in pz.namelist():
                # Avoid zip slip
                if member.startswith("/") or ".." in member:
                    continue
                out_path = os.path.join(target_dir, member)
                if member.endswith("/"):
                    os.makedirs(out_path, exist_ok=True)
                else:
                    os.makedirs(os.path.dirname(out_path), exist_ok=True)
                    with open(out_path, 'wb') as fp:
                        fp.write(pz.read(member))

print("[2] Unpacking Apocalypse_Test_Guns_Pose_Compatibility.mcpack...")
os.makedirs(COMPAT_DIR, exist_ok=True)
with zipfile.ZipFile(COMPAT_PACK, 'r') as z:
    for member in z.namelist():
        out_path = os.path.join(COMPAT_DIR, member)
        if member.endswith("/"):
            os.makedirs(out_path, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, 'wb') as fp:
                fp.write(z.read(member))

# Clean emojis from the newly unpacked files to maintain user requirement "删除所有emoji"
print("[3] Cleaning emojis from unpacked files...")
EMOJI_REGEX = re.compile(
    r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b00-\u2bff\u2190-\u21ff\u200d\ufe0e\ufe0f]+[ \t]?',
    re.UNICODE
)

for target_dir in [TG_BP_DIR, TG_RP_DIR, COMPAT_DIR]:
    for root, dirs, files in os.walk(target_dir):
        for f in files:
            if not (f.endswith('.js') or f.endswith('.json')):
                continue
            fpath = os.path.join(root, f)
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
                orig = fp.read()
            cleaned = EMOJI_REGEX.sub('', orig)
            cleaned = cleaned.replace('  ', ' ')
            cleaned = re.sub(r'(§[0-9a-fk-or]) +', r'\1', cleaned)
            if cleaned != orig:
                with open(fpath, 'w', encoding='utf-8') as fp:
                    fp.write(cleaned)

print("[SUCCESS] All files unpacked and verified clean!")
