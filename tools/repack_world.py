import os
import sys
import zipfile
import json
import shutil
import time
import io
import struct
import nbtlib

def enable_deferred(raw_bytes):
    header = raw_bytes[:8]
    ver = struct.unpack("<I", header[:4])[0]
    nbt_bytes = raw_bytes[8:]
    f = io.BytesIO(nbt_bytes)
    nbt_file = nbtlib.File.parse(f, byteorder="little")
    if "experiments" not in nbt_file or nbt_file["experiments"] is None:
        nbt_file["experiments"] = nbtlib.Compound()
    nbt_file["experiments"]["deferred_technical_preview"] = nbtlib.Byte(1)
    nbt_file["experiments"]["experiments_ever_used"] = nbtlib.Byte(1)
    nbt_file["experiments"]["saved_with_toggled_experiments"] = nbtlib.Byte(1)
    nbt_file["experiments"]["gametest"] = nbtlib.Byte(1)
    nbt_file["experiments"]["upcoming_creator_features"] = nbtlib.Byte(1)
    nbt_file["experiments"]["experimental_creator_cameras"] = nbtlib.Byte(1)
    nbt_file["experiments"]["data_driven_biomes"] = nbtlib.Byte(1)
    nbt_file["commandsEnabled"] = nbtlib.Byte(1)
    nbt_file["cheatsEnabled"] = nbtlib.Byte(1)
    nbt_file["LevelName"] = nbtlib.String("明日之后 (LifeAfter)")
    out_f = io.BytesIO()
    nbt_file.write(out_f, byteorder="little")
    new_nbt_bytes = out_f.getvalue()
    return struct.pack("<II", ver, len(new_nbt_bytes)) + new_nbt_bytes

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESKTOP_DIR = os.path.join(os.path.expanduser("~"), "Desktop")
DEFAULT_DESKTOP_ZIP = os.path.join(DESKTOP_DIR, "《明日之后：幸存者》.zip")
WECHAT_SRC = r"c:\Users\10973\Documents\WeChat Files\wxid_p0qzgqeqkla022\FileStorage\File\2025-04\MRZH SURVIVE -------- V2 (1).mcworld"

if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
    SRC_MCWORLD = sys.argv[1]
elif os.path.exists(DEFAULT_DESKTOP_ZIP):
    SRC_MCWORLD = DEFAULT_DESKTOP_ZIP
else:
    SRC_MCWORLD = WECHAT_SRC

OUT_MCWORLD = os.path.join(REPO_DIR, "明日之后.mcworld")
BASE_DIR = os.path.join(REPO_DIR, "addons", "development")

BEHAVIOR_PACKS = [
    ("sapi_server_bp", os.path.join(BASE_DIR, "sapi_server_addon", "sapi_server_bp")),
    ("test_guns_bp", os.path.join(BASE_DIR, "test_guns_2d_addon", "test_guns_bp")),
    ("natural_disasters_bp", os.path.join(BASE_DIR, "natural_disasters_standalone_addon", "standalone_disasters_bp")),
    ("apocalypse_life_bp", os.path.join(BASE_DIR, "apocalypse_life_addon", "apocalypse_life_bp")),
    ("apocalypse_mobs_bp", os.path.join(BASE_DIR, "apocalypse_mobs_addon", "apocalypse_mobs_bp")),
    ("extraction_bp", os.path.join(BASE_DIR, "apocalypse_extraction_addon", "extraction_bp")),
    ("daily_events_bp", os.path.join(BASE_DIR, "daily_world_events_addon", "daily_events_bp")),
]

RESOURCE_PACKS = [
    ("apocalypse_ui_rp", os.path.join(BASE_DIR, "apocalypse_ui_addon", "apocalypse_ui_rp")),
    ("sapi_server_rp", os.path.join(BASE_DIR, "sapi_server_addon", "sapi_server_rp")),
    ("apocalypse_mobs_rp", os.path.join(BASE_DIR, "apocalypse_mobs_addon", "apocalypse_mobs_rp")),
    ("apocalypse_life_rp", os.path.join(BASE_DIR, "apocalypse_life_addon", "apocalypse_life_rp")),
    ("extraction_rp", os.path.join(BASE_DIR, "apocalypse_extraction_addon", "extraction_rp")),
    ("daily_events_rp", os.path.join(BASE_DIR, "daily_world_events_addon", "daily_events_rp")),
    ("natural_disasters_rp", os.path.join(BASE_DIR, "natural_disasters_standalone_addon", "standalone_disasters_rp")),
    ("test_guns_rp", os.path.join(BASE_DIR, "test_guns_2d_addon", "test_guns_rp")),
    ("dark_fantasy_visuals_rp", os.path.join(BASE_DIR, "dark_fantasy_visuals_rp")),
]

def get_pack_info(pack_path):
    manifest_path = os.path.join(pack_path, "manifest.json")
    if not os.path.exists(manifest_path):
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")
    with open(manifest_path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    header = data.get("header", {})
    raw_ver = header.get("version", [1, 0, 0])
    if isinstance(raw_ver, str):
        ver = [int(x) for x in raw_ver.split(".") if x.isdigit()]
    else:
        ver = list(raw_ver)
    return {
        "pack_id": header.get("uuid"),
        "version": ver
    }

def main():
    print(f"[*] Reading base world template from: {SRC_MCWORLD}")
    start_time = time.time()

    # Generate world_behavior_packs.json
    world_bp = []
    for name, path in BEHAVIOR_PACKS:
        info = get_pack_info(path)
        world_bp.append(info)
        print(f"  + Added BP: {name} (UUID: {info['pack_id']}, v{info['version']})")

    # Generate world_resource_packs.json
    world_rp = []
    for name, path in RESOURCE_PACKS:
        if not os.path.exists(path):
            continue
        info = get_pack_info(path)
        world_rp.append(info)
        print(f"  + Added RP: {name} (UUID: {info['pack_id']}, v{info['version']})")

    world_bp_content = json.dumps(world_bp, indent=2).encode("utf-8")
    world_rp_content = json.dumps(world_rp, indent=2).encode("utf-8")
    levelname_content = "明日之后 (LifeAfter)".encode("utf-8")

    temp_out = OUT_MCWORLD + ".tmp"
    if os.path.exists(temp_out):
        os.remove(temp_out)

    print(f"[*] Repackaging into: {OUT_MCWORLD} ...")
    with zipfile.ZipFile(SRC_MCWORLD, "r") as src_zip:
        # Detect prefix (e.g. "MRZH SURVIVE/") if present
        prefix = ""
        for name in src_zip.namelist():
            if name.endswith("level.dat") and not ("behavior_packs" in name or "resource_packs" in name):
                if "/" in name:
                    prefix = name[:name.rfind("level.dat")]
                break
        if prefix:
            print(f"[*] Detected world directory prefix in archive: '{prefix}'")

        with zipfile.ZipFile(temp_out, "w", zipfile.ZIP_DEFLATED) as dst_zip:
            # 1. Copy original world data (db, level.dat, icons, etc.) but exclude old behavior_packs and resource_packs
            for item in src_zip.infolist():
                raw_name = item.filename
                name = raw_name[len(prefix):] if prefix and raw_name.startswith(prefix) else raw_name
                if not name or name.endswith("/"):
                    continue
                # Skip old embedded packs and old world pack lists
                if name.startswith("behavior_packs/") or name.startswith("resource_packs/"):
                    continue
                if name in ("world_behavior_packs.json", "world_resource_packs.json", "levelname.txt"):
                    continue
                
                # Copy original file with deferred graphics & experiments enabled in level.dat
                data = src_zip.read(raw_name)
                if name in ("level.dat", "level.dat_old"):
                    try:
                        data = enable_deferred(data)
                        print(f"[*] Enabled 灵动视效 & 创作者实验在 {name}")
                    except Exception as e:
                        print(f"[!] Warning: failed to update {name}: {e}")
                dst_zip.writestr(name, data, compress_type=zipfile.ZIP_DEFLATED)

            # 2. Write new levelname and pack activation configs
            dst_zip.writestr("levelname.txt", levelname_content)
            dst_zip.writestr("world_behavior_packs.json", world_bp_content)
            dst_zip.writestr("world_resource_packs.json", world_rp_content)

            # 3. Embed all active Behavior Packs
            print("[*] Embedding Behavior Packs...")
            for bp_name, bp_path in BEHAVIOR_PACKS:
                for root, dirs, files in os.walk(bp_path):
                    # Skip git and cache dirs
                    if any(x in root for x in [".git", "node_modules", ".gemini", "__pycache__"]):
                        continue
                    for file in files:
                        full_p = os.path.join(root, file)
                        rel_p = os.path.relpath(full_p, bp_path)
                        zip_entry = f"behavior_packs/{bp_name}/{rel_p.replace(os.sep, '/')}"
                        dst_zip.write(full_p, zip_entry)

            # 4. Embed all active Resource Packs
            print("[*] Embedding Resource Packs...")
            for rp_name, rp_path in RESOURCE_PACKS:
                if not os.path.exists(rp_path):
                    continue
                for root, dirs, files in os.walk(rp_path):
                    if any(x in root for x in [".git", "node_modules", ".gemini", "__pycache__"]):
                        continue
                    for file in files:
                        full_p = os.path.join(root, file)
                        rel_p = os.path.relpath(full_p, rp_path)
                        zip_entry = f"resource_packs/{rp_name}/{rel_p.replace(os.sep, '/')}"
                        dst_zip.write(full_p, zip_entry)

    if os.path.exists(OUT_MCWORLD):
        os.remove(OUT_MCWORLD)
    os.rename(temp_out, OUT_MCWORLD)

    size_mb = os.path.getsize(OUT_MCWORLD) / (1024 * 1024)
    elapsed = time.time() - start_time
    print(f"\n[SUCCESS] Packaged {OUT_MCWORLD} successfully in {elapsed:.2f}s!")
    print(f"Total Size: {size_mb:.2f} MB")

    # Also copy to Desktop for convenient access
    desktop_targets = [
        os.path.join(DESKTOP_DIR, "《明日之后：幸存者》.mcworld"),
        os.path.join(DESKTOP_DIR, "明日之后.mcworld"),
    ]
    for target in desktop_targets:
        try:
            shutil.copy2(OUT_MCWORLD, target)
            print(f"[SUCCESS] Copied to Desktop: {target}")
        except Exception as e:
            print(f"[!] Warning: Could not copy to {target}: {e}")

if __name__ == "__main__":
    main()
