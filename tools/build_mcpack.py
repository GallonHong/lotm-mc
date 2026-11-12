#!/usr/bin/env python3
"""Pack a resource/behavior pack directory into a .mcpack/.mcaddon zip.

The pack directory must contain manifest.json at its root (a single pack).
Usage:
  python tools/build_mcpack.py <pack_dir> <output.mcpack>
"""
import argparse
import json
import os
import sys
import zipfile


def main():
    parser = argparse.ArgumentParser(description="Build a .mcpack/.mcaddon from a pack directory")
    parser.add_argument("source", help="pack directory containing manifest.json")
    parser.add_argument("output", help="output .mcpack/.mcaddon path")
    args = parser.parse_args()

    source = os.path.abspath(args.source)
    output = os.path.abspath(args.output)
    manifest_path = os.path.join(source, "manifest.json")
    if not os.path.isfile(manifest_path):
        sys.exit(f"[!] {source} is not a pack directory (no manifest.json)")

    with open(manifest_path, "r", encoding="utf-8-sig") as handle:
        manifest = json.load(handle)
    header = manifest.get("header", {})
    version = ".".join(map(str, header.get("version", [])))

    os.makedirs(os.path.dirname(output), exist_ok=True)
    if os.path.exists(output):
        os.remove(output)

    count = 0
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for current, dirs, files in os.walk(source):
            dirs.sort()
            for name in sorted(files):
                full = os.path.join(current, name)
                rel = os.path.relpath(full, source).replace(os.sep, "/")
                archive.write(full, rel)
                count += 1

    with zipfile.ZipFile(output, "r") as archive:
        broken = archive.testzip()
    if broken is not None:
        sys.exit(f"[!] built archive failed CRC check: {broken}")

    print(f"[ok] {os.path.basename(output)}  pack={header.get('name', '?')} v{version}  "
          f"entries={count}  size={os.path.getsize(output) / 1024:.1f}KB")


if __name__ == "__main__":
    main()
