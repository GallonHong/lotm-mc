#!/usr/bin/env python3
"""Replace only the Apocalypse Boss BP/RP inside an existing .mcworld.

Unlike tools/repack_world.py this does NOT rebuild the world from a template:
every other archive entry (db, level.dat, other add-on packs) is copied
byte-for-byte, only these entries are replaced:

  behavior_packs/apocalypse_boss_bp/**
  resource_packs/apocalypse_boss_rp/**
  world_behavior_packs.json      (boss pack version bumped in place)
  world_resource_packs.json      (boss pack version bumped in place)

Usage:
  python tools/update_boss_pack_in_world.py [world.mcworld]

A `<world>.bak` backup is written first. The new archive is written to
`<world>.tmp` and only then swapped in, so a failure leaves the world intact.
"""
import json
import os
import shutil
import sys
import time
import zipfile

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORLD = os.path.join(REPO_DIR, "明日之后.mcworld")
if len(sys.argv) > 1:
    WORLD = os.path.abspath(sys.argv[1])

BASE_DIR = os.path.join(REPO_DIR, "addons", "development", "apocalypse_boss_addon")
PACKS = [
    ("behavior_packs/apocalypse_boss_bp", os.path.join(BASE_DIR, "apocalypse_boss_bp")),
    ("resource_packs/apocalypse_boss_rp", os.path.join(BASE_DIR, "apocalypse_boss_rp")),
]
SKIP_FILE_SUFFIXES = (".mcpack", ".mcaddon", ".py")
SKIP_DIR_NAMES = {".git", "node_modules", "__pycache__", ".gemini"}
LISTS = ("world_behavior_packs.json", "world_resource_packs.json")


def pack_info(pack_path):
    with open(os.path.join(pack_path, "manifest.json"), "r", encoding="utf-8-sig") as handle:
        header = json.load(handle)["header"]
    return {"pack_id": header["uuid"], "version": list(header["version"])}


def updated_pack_list(raw, info):
    packs = json.loads(raw)
    for entry in packs:
        if entry.get("pack_id") == info["pack_id"]:
            entry["version"] = info["version"]
            return packs, False
    packs.append({"pack_id": info["pack_id"], "version": info["version"]})
    return packs, True


def main():
    if not os.path.exists(WORLD):
        sys.exit(f"[!] world not found: {WORLD}")
    infos = {prefix: pack_info(path) for prefix, path in PACKS}
    prefixes = tuple(prefix + "/" for prefix, _ in PACKS)
    started = time.time()

    backup = WORLD + ".bak"
    shutil.copy2(WORLD, backup)
    print(f"[*] world    : {WORLD}")
    print(f"[*] backup   : {backup}")
    for prefix, info in infos.items():
        print(f"[*] replacing: {prefix} -> v{'.'.join(map(str, info['version']))}")

    temp_out = WORLD + ".tmp"
    if os.path.exists(temp_out):
        os.remove(temp_out)

    with zipfile.ZipFile(WORLD, "r") as src, zipfile.ZipFile(temp_out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as dst:
        copied = 0
        replaced_removed = 0
        for item in src.infolist():
            name = item.filename
            if item.is_dir():
                continue
            if name.startswith(prefixes) or name in LISTS:
                replaced_removed += 1
                continue
            with src.open(item, "r") as reader, dst.open(name, "w") as writer:
                shutil.copyfileobj(reader, writer, 1024 * 1024)
            copied += 1
        print(f"[*] preserved {copied} archive entries, dropped {replaced_removed} stale pack entries/files")

        for list_name, pack_prefix, key in (
            ("world_behavior_packs.json", "behavior_packs/apocalypse_boss_bp", "BP"),
            ("world_resource_packs.json", "resource_packs/apocalypse_boss_rp", "RP"),
        ):
            raw = src.read(list_name) if list_name in src.namelist() else b"[]"
            packs, appended = updated_pack_list(raw, infos[pack_prefix])
            dst.writestr(list_name, json.dumps(packs, indent=2).encode("utf-8"))
            print(f"[*] {list_name}: boss {key} entry {'appended' if appended else 'version bumped'}")

        embedded = 0
        for prefix, pack_path in PACKS:
            for root, dirs, files in os.walk(pack_path):
                dirs[:] = [name for name in dirs if name not in SKIP_DIR_NAMES]
                for file_name in files:
                    if file_name.endswith(SKIP_FILE_SUFFIXES):
                        continue
                    full = os.path.join(root, file_name)
                    rel = os.path.relpath(full, pack_path).replace(os.sep, "/")
                    dst.write(full, f"{prefix}/{rel}")
                    embedded += 1
        print(f"[*] embedded {embedded} fresh pack files")

    with zipfile.ZipFile(temp_out, "r") as check:
        bad = check.testzip()
        if bad is not None:
            os.remove(temp_out)
            sys.exit(f"[!] corrupt entry after repack: {bad}")
        total = len(check.infolist())
    os.replace(temp_out, WORLD)
    elapsed = time.time() - started
    size_mb = os.path.getsize(WORLD) / (1024 * 1024)
    print(f"\n[SUCCESS] {WORLD}")
    print(f"          {total} entries, {size_mb:.2f} MB, {elapsed:.1f}s")
    print(f"          backup kept at {backup}")


if __name__ == "__main__":
    main()
