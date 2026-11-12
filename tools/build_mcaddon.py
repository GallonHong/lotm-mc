#!/usr/bin/env python3
"""Build a .mcaddon from any number of pack directories (each packed as .mcpack inside).

Usage:
  python tools/build_mcaddon.py <output.mcaddon> <pack_dir> [<pack_dir> ...]
"""
import argparse
import json
import os
import sys
import zipfile


def main():
    parser = argparse.ArgumentParser(description="Build a .mcaddon from pack directories")
    parser.add_argument("output")
    parser.add_argument("packs", nargs="+")
    args = parser.parse_args()

    output = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(output), exist_ok=True)
    if os.path.exists(output):
        os.remove(output)

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for pack_dir in args.packs:
            pack_dir = os.path.abspath(pack_dir)
            manifest_path = os.path.join(pack_dir, "manifest.json")
            if not os.path.isfile(manifest_path):
                sys.exit(f"[!] {pack_dir} is not a pack directory")
            with open(manifest_path, "r", encoding="utf-8-sig") as handle:
                manifest = json.load(handle)
            header = manifest.get("header", {})
            pack_type = "BP" if any(m.get("type") in ("data", "script") for m in manifest.get("modules", [])) else "RP"
            pack_name = f"{pack_dir.rstrip(os.sep).split(os.sep)[-1]}.mcpack"
            written = 0
            for current, dirs, files in os.walk(pack_dir):
                dirs.sort()
                for name in sorted(files):
                    full = os.path.join(current, name)
                    rel = os.path.relpath(full, pack_dir).replace(os.sep, "/")
                    archive.write(full, f"{pack_type}/{rel}" if False else f"{pack_name}/{rel}")
                    written += 1
            print(f"[ok] {pack_name} ({header.get('name')} v{'.'.join(map(str, header.get('version', [])))}, {written} files)")

    with zipfile.ZipFile(output) as archive:
        broken = archive.testzip()
    if broken is not None:
        sys.exit(f"[!] built archive failed CRC check: {broken}")
    print(f"[ok] {os.path.basename(output)} size={os.path.getsize(output) / 1024 / 1024:.2f}MB")


if __name__ == "__main__":
    main()
