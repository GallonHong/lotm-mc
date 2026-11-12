#!/usr/bin/env python3
"""Build a world-only ZIP that Aternos accepts as a direct world upload.

Aternos' Worlds -> Upload only accepts a single world folder (level.dat + db/ etc.);
packs have to be installed separately via the Packs page. This tool:

  - extracts the world data from a .mcworld (skips the embedded behavior_packs/ and
    resource_packs/ directories, which Aternos would not install from a world zip),
  - repoints world_resource_packs.json at ONE merged server resource pack so that,
    once that mcpack is installed on the Packs page, the server actually applies it,
  - keeps world_behavior_packs.json untouched (behavior packs still need installing),
  - writes <output>.zip with ``<world_name>/level.dat`` at the top level.

Usage:
  python tools/build_aternos_world_upload.py <world.mcworld> <merged.mcpack> <out.zip>
                                                 [--world-name 明日之后]
"""
import argparse
import json
import os
import struct
import sys
import tempfile
import zipfile


def read_world_entries(world):
    with zipfile.ZipFile(world) as archive:
        return {info.filename: archive.read(info) for info in archive.infolist() if not info.is_dir()}


def main():
    parser = argparse.ArgumentParser(description="Build an Aternos direct world upload zip")
    parser.add_argument("world")
    parser.add_argument("merged_mcpack")
    parser.add_argument("output")
    parser.add_argument("--world-name", default="明日之后")
    args = parser.parse_args()

    world = os.path.abspath(args.world)
    merged = os.path.abspath(args.merged_mcpack)
    output = os.path.abspath(args.output)
    if not os.path.isfile(world):
        sys.exit(f"[!] world not found: {world}")
    if not os.path.isfile(merged):
        sys.exit(f"[!] merged pack not found: {merged}")

    with zipfile.ZipFile(merged) as archive:
        manifest = json.loads(archive.read("manifest.json"))
    pack_id = manifest["header"]["uuid"]
    pack_version = manifest["header"]["version"]
    print(f"[merged] {manifest['header']['name']} {pack_version} uuid={pack_id}")

    entries = read_world_entries(world)
    world_files = {}
    for name, payload in entries.items():
        top = name.split("/")[0]
        if top in ("behavior_packs", "resource_packs"):
            continue
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
    else:
        print("[!] world_resource_packs.json not found, skipped")

    if "world_behavior_packs.json" in world_files:
        bp = json.loads(world_files["world_behavior_packs.json"])
        print(f"[packs] world_behavior_packs.json kept: {len(bp)} behavior pack(s)")

    fd, temp_path = tempfile.mkstemp(suffix=".zip", dir=os.path.dirname(output))
    os.close(fd)
    prefix = args.world_name.rstrip("/") + "/"
    with zipfile.ZipFile(temp_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as target:
        for name, payload in sorted(world_files.items()):
            target.writestr(prefix + name, payload)
    with zipfile.ZipFile(temp_path) as check:
        names = [info.filename for info in check.infolist() if not info.is_dir()]
        broken = check.testzip()
    if broken is not None:
        os.remove(temp_path)
        sys.exit(f"[!] CRC error: {broken}")
    if prefix + "level.dat" not in names:
        os.remove(temp_path)
        sys.exit("[!] level.dat not at expected path")
    os.replace(temp_path, output)
    print(f"[ok] {os.path.basename(output)}: {len(names)} entries, "
          f"{os.path.getsize(output) / 1024 / 1024:.2f}MB, world folder '{prefix}'")


if __name__ == "__main__":
    main()
