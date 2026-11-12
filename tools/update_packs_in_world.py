#!/usr/bin/env python3
"""Replace selected embedded add-on packs inside 明日之后.mcworld.

Same contract as tools/update_boss_pack_in_world.py, but for any subset of the
packs that the world embeds. Everything outside the selected pack directories
(db, level.dat, other packs, pack lists) is preserved byte-for-byte; the
world_behavior_packs.json / world_resource_packs.json entries are only bumped
when a selected pack's manifest version changed.

Usage:
  python tools/update_packs_in_world.py --packs apocalypse_life,test_guns,sapi_server
  python tools/update_packs_in_world.py --packs apocalypse_boss --world other.mcworld

A `<world>.bak` backup is written first and the archive is swapped in atomically.
"""
import argparse
import json
import os
import shutil
import sys
import time
import zipfile

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_WORLD = os.path.join(REPO_DIR, "明日之后.mcworld")
BASE_DIR = os.path.join(REPO_DIR, "addons", "development")

# key -> (embedded folder name, source directory relative to addons/development)
PACKS = {
    "sapi_server": {
        "bp": ("sapi_server_bp", "sapi_server_addon/sapi_server_bp"),
        "rp": ("sapi_server_rp", "sapi_server_addon/sapi_server_rp"),
    },
    "test_guns": {
        "bp": ("test_guns_bp", "test_guns_2d_addon/test_guns_bp"),
        "rp": ("test_guns_rp", "test_guns_2d_addon/test_guns_rp"),
    },
    "natural_disasters": {
        "bp": ("natural_disasters_bp", "natural_disasters_standalone_addon/standalone_disasters_bp"),
        "rp": ("natural_disasters_rp", "natural_disasters_standalone_addon/standalone_disasters_rp"),
    },
    "apocalypse_life": {
        "bp": ("apocalypse_life_bp", "apocalypse_life_addon/apocalypse_life_bp"),
        "rp": ("apocalypse_life_rp", "apocalypse_life_addon/apocalypse_life_rp"),
    },
    "apocalypse_boss": {
        "bp": ("apocalypse_boss_bp", "apocalypse_boss_addon/apocalypse_boss_bp"),
        "rp": ("apocalypse_boss_rp", "apocalypse_boss_addon/apocalypse_boss_rp"),
    },
    "apocalypse_mobs": {
        "bp": ("apocalypse_mobs_bp", "apocalypse_mobs_addon/apocalypse_mobs_bp"),
        "rp": ("apocalypse_mobs_rp", "apocalypse_mobs_addon/apocalypse_mobs_rp"),
    },
    "extraction": {
        "bp": ("extraction_bp", "apocalypse_extraction_addon/extraction_bp"),
        "rp": ("extraction_rp", "apocalypse_extraction_addon/extraction_rp"),
    },
    "extraction_bootstrap": {
        "bp": ("extraction_dimension_bootstrap_bp", "apocalypse_extraction_addon/extraction_dimension_bootstrap_bp"),
    },
    "daily_events": {
        "bp": ("daily_events_bp", "daily_world_events_addon/daily_events_bp"),
        "rp": ("daily_events_rp", "daily_world_events_addon/daily_events_rp"),
    },
    "liufenjie_scene": {
        "bp": ("liufenjie_scene_bp", "liufenjie_scene_addon/liufenjie_scene_bp"),
    },
    "pose_compatibility": {
        "rp": ("apocalypse_test_guns_pose_compatibility", "apocalypse_test_guns_pose_compatibility"),
    },
    "apocalypse_ui": {
        "rp": ("apocalypse_ui_rp", "apocalypse_ui_addon/apocalypse_ui_rp"),
    },
}
SKIP_FILE_SUFFIXES = (".mcpack", ".mcaddon", ".py")
SKIP_DIR_NAMES = {".git", "node_modules", "__pycache__", ".gemini"}
LISTS = {"bp": "world_behavior_packs.json", "rp": "world_resource_packs.json"}


def pack_info(pack_path):
    with open(os.path.join(pack_path, "manifest.json"), "r", encoding="utf-8-sig") as handle:
        header = json.load(handle)["header"]
    return {"pack_id": header["uuid"], "version": list(header["version"])}


def pack_folder(kind):
    return "behavior_packs" if kind == "bp" else "resource_packs"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--packs", required=True, help=f"comma separated: {', '.join(PACKS)}")
    parser.add_argument("--world", default=DEFAULT_WORLD)
    args = parser.parse_args()

    world = os.path.abspath(args.world)
    selected = [name.strip() for name in args.packs.split(",") if name.strip()]
    unknown = [name for name in selected if name not in PACKS]
    if unknown:
        sys.exit(f"[!] unknown packs: {', '.join(unknown)}\n    known: {', '.join(PACKS)}")
    if not os.path.exists(world):
        sys.exit(f"[!] world not found: {world}")

    plan = []  # (kind, embed_name, src_dir, info)
    for name in selected:
        for kind in ("bp", "rp"):
            spec = PACKS[name].get(kind)
            if not spec:
                continue
            embed_name, relative = spec
            src_dir = os.path.join(BASE_DIR, relative)
            if not os.path.exists(os.path.join(src_dir, "manifest.json")):
                sys.exit(f"[!] missing source pack: {src_dir}")
            plan.append((kind, embed_name, src_dir, pack_info(src_dir)))

    started = time.time()
    backup = world + ".bak"
    shutil.copy2(world, backup)
    print(f"[*] world  : {world}")
    print(f"[*] backup : {backup}")
    for kind, embed_name, _, info in plan:
        print(f"[*] replace: {kind.upper()} {embed_name} -> v{'.'.join(map(str, info['version']))}")

    prefixes = tuple(f"{pack_folder(kind)}/{embed_name}/" for kind, embed_name, _, _ in plan)
    temp_out = world + ".tmp"
    if os.path.exists(temp_out):
        os.remove(temp_out)

    with zipfile.ZipFile(world, "r") as src, zipfile.ZipFile(temp_out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as dst:
        copied = dropped = 0
        for item in src.infolist():
            name = item.filename
            if item.is_dir():
                continue
            if name.startswith(prefixes) or name in LISTS.values():
                dropped += 1
                continue
            with src.open(item, "r") as reader, dst.open(name, "w") as writer:
                shutil.copyfileobj(reader, writer, 1024 * 1024)
            copied += 1
        print(f"[*] preserved {copied} archive entries, dropped {dropped} stale pack entries/files")

        by_kind = {"bp": [], "rp": []}
        for kind, embed_name, _, info in plan:
            by_kind[kind].append((embed_name, info))
        for kind, list_name in LISTS.items():
            if kind not in LISTS:
                continue
            existing = json.loads(src.read(list_name)) if list_name in src.namelist() else []
            for _, info in by_kind[kind]:
                for entry in existing:
                    if entry.get("pack_id") == info["pack_id"]:
                        entry["version"] = info["version"]
                        break
                else:
                    existing.append({"pack_id": info["pack_id"], "version": info["version"]})
            dst.writestr(list_name, json.dumps(existing, indent=2).encode("utf-8"))
            print(f"[*] {list_name}: {len(by_kind[kind])} selected pack(s) version-synced")

        embedded = 0
        for kind, embed_name, src_dir, _ in plan:
            folder = pack_folder(kind)
            for root, dirs, files in os.walk(src_dir):
                dirs[:] = [value for value in dirs if value not in SKIP_DIR_NAMES]
                for file_name in files:
                    if file_name.endswith(SKIP_FILE_SUFFIXES):
                        continue
                    full = os.path.join(root, file_name)
                    rel = os.path.relpath(full, src_dir).replace(os.sep, "/")
                    dst.write(full, f"{folder}/{embed_name}/{rel}")
                    embedded += 1
        print(f"[*] embedded {embedded} fresh pack files")

    with zipfile.ZipFile(temp_out, "r") as check:
        bad = check.testzip()
        if bad is not None:
            os.remove(temp_out)
            sys.exit(f"[!] corrupt entry after repack: {bad}")
        total = len(check.infolist())
    os.replace(temp_out, world)
    elapsed = time.time() - started
    size_mb = os.path.getsize(world) / (1024 * 1024)
    print(f"\n[SUCCESS] {world}")
    print(f"          {total} entries, {size_mb:.2f} MB, {elapsed:.1f}s")
    print(f"          backup kept at {backup}")


if __name__ == "__main__":
    main()
