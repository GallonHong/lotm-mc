#!/usr/bin/env python3
"""Build an Aternos world upload ZIP.

Two layouts are supported:

1. world-only (default):
     <world_name>/level.dat, db/, world_*.json ...
   Aternos only accepts the world itself in that case; packs must be installed
   separately via the Packs page (the world JSON is repointed at the merged RP).

2. with packs (--include-packs):
     <world_name>/...
     behavior_packs/<10 behavior packs from the .mcworld>
     resource_packs/Apocalypse_Server_RP/<merged server resource pack>
   The world resource-pack list references exactly the merged RP included here,
   so UUIDs stay consistent if Aternos installs the bundled folders.

Usage:
  python tools/build_aternos_world_upload.py <world.mcworld> <merged.mcpack> <out.zip>
        [--world-name 明日之后] [--include-packs]
"""
import argparse
import json
import os
import sys
import tempfile
import zipfile

MERGED_RP_DIR = "Apocalypse_Server_RP"


def read_zip_entries(path):
    with zipfile.ZipFile(path) as archive:
        return {info.filename: archive.read(info) for info in archive.infolist() if not info.is_dir()}


def main():
    parser = argparse.ArgumentParser(description="Build an Aternos world upload zip")
    parser.add_argument("world")
    parser.add_argument("merged_mcpack")
    parser.add_argument("output")
    parser.add_argument("--world-name", default="明日之后")
    parser.add_argument("--include-packs", action="store_true")
    args = parser.parse_args()

    world = os.path.abspath(args.world)
    merged = os.path.abspath(args.merged_mcpack)
    output = os.path.abspath(args.output)
    for path, label in ((world, "world"), (merged, "merged pack")):
        if not os.path.isfile(path):
            sys.exit(f"[!] {label} not found: {path}")

    with zipfile.ZipFile(merged) as archive:
        merged_manifest = json.loads(archive.read("manifest.json"))
    pack_id = merged_manifest["header"]["uuid"]
    pack_version = merged_manifest["header"]["version"]
    print(f"[merged] {merged_manifest['header']['name']} {pack_version} uuid={pack_id}")

    entries = read_zip_entries(world)
    world_files = {}
    behavior_files = {}
    for name, payload in entries.items():
        top = name.split("/")[0]
        if top == "behavior_packs":
            if args.include_packs:
                behavior_files[name] = payload
            continue
        if top == "resource_packs":
            continue  # bundle the single merged RP instead
        world_files[name] = payload
    if "level.dat" not in world_files:
        sys.exit("[!] level.dat missing from world data")

    packs_path = "world_resource_packs.json"
    if packs_path in world_files:
        old = json.loads(world_files[packs_path])
        world_files[packs_path] = json.dumps(
            [{"pack_id": pack_id, "version": pack_version}], ensure_ascii=False, indent=2
        ).encode("utf-8")
        print(f"[packs] world_resource_packs.json: {len(old)} entries -> 1 merged pack")
    if "world_behavior_packs.json" in world_files:
        behavior = json.loads(world_files["world_behavior_packs.json"])
        print(f"[packs] world_behavior_packs.json: {len(behavior)} behavior pack(s)")

    merged_files = {}
    with zipfile.ZipFile(merged) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            merged_files[f"resource_packs/{MERGED_RP_DIR}/{info.filename}"] = archive.read(info)

    fd, temp_path = tempfile.mkstemp(suffix=".zip", dir=os.path.dirname(output))
    os.close(fd)
    prefix = args.world_name.rstrip("/") + "/"
    with zipfile.ZipFile(temp_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as target:
        for name, payload in sorted(world_files.items()):
            target.writestr(prefix + name, payload)
        # Keep packs at the archive root, never inside the world folder: Aternos'
        # world importer only understands a plain world folder here.
        for name, payload in sorted(behavior_files.items()):
            target.writestr(name, payload)
        for name, payload in sorted(merged_files.items()):
            target.writestr(name, payload)

    with zipfile.ZipFile(temp_path) as check:
        names = [info.filename for info in check.infolist() if not info.is_dir()]
        broken = check.testzip()
    if broken is not None:
        os.remove(temp_path)
        sys.exit(f"[!] CRC error: {broken}")
    required = [prefix + "level.dat"]
    if args.include_packs:
        required.append(f"resource_packs/{MERGED_RP_DIR}/manifest.json")
    for requirement in required:
        if requirement not in names:
            os.remove(temp_path)
            sys.exit(f"[!] missing required entry: {requirement}")
    os.replace(temp_path, output)

    bp_root = prefix + "behavior_packs/"
    bp_count = len({n[len(bp_root):].split("/")[0] for n in names if n.startswith(bp_root)})
    print(f"[ok] {os.path.basename(output)}: {len(names)} entries, "
          f"{os.path.getsize(output) / 1024 / 1024:.2f}MB")
    print(f"[ok] world folder '{prefix}' | behavior packs: {bp_count} | "
          f"merged RP files: {len(merged_files)}")


if __name__ == "__main__":
    main()
