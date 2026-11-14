# -*- coding: utf-8 -*-
"""
Package the R6 addon:
    dist/R6_Siege_BP.mcpack
    dist/R6_Siege_RP.mcpack
    dist/R6_Siege_Addon.mcaddon

Bedrock requires forward slashes inside archives - zipfile writes POSIX paths
and we assert this before reporting success.
"""
import json
import os
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import r6data as D

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(ROOT, "r6_bp")
RP = os.path.join(ROOT, "r6_rp")
DIST = os.path.join(ROOT, "dist")

EXCLUDE_DIRS = {"__pycache__", ".DS_Store"}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db"}


def collect(pack_dir):
    files = []
    for dirpath, dirnames, filenames in os.walk(pack_dir):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if fn in EXCLUDE_FILES:
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, pack_dir).replace(os.sep, "/")
            files.append((full, rel))
    return files


def zip_pack(path, files, prefix=""):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for full, rel in files:
            arc = (prefix + rel) if prefix else rel
            if "\\" in arc:
                raise RuntimeError("backslash in archive path: " + arc)
            zf.write(full, arc)
    return path


def verify(path, expected_manifest):
    with zipfile.ZipFile(path) as zf:
        names = zf.namelist()
        for name in names:
            if "\\" in name:
                raise RuntimeError(f"{os.path.basename(path)}: backslash path {name}")
        manifests = [n for n in names if n.endswith("manifest.json")]
        if expected_manifest not in manifests:
            raise RuntimeError(f"{os.path.basename(path)}: missing {expected_manifest}")
    return len(names)


def size_mb(path):
    return os.path.getsize(path) / (1024 * 1024)


def main():
    version = ".".join(str(x) for x in D.PACK_VERSION)
    bp_files = collect(BP)
    rp_files = collect(RP)
    if not bp_files or not rp_files:
        raise SystemExit("empty pack directory")

    os.makedirs(DIST, exist_ok=True)
    bp_pack = zip_pack(os.path.join(DIST, "R6_Siege_BP.mcpack"), bp_files)
    rp_pack = zip_pack(os.path.join(DIST, "R6_Siege_RP.mcpack"), rp_files)

    addon = os.path.join(DIST, "R6_Siege_Addon.mcaddon")
    with zipfile.ZipFile(addon, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for full, rel in bp_files:
            zf.write(full, "r6_bp/" + rel)
        for full, rel in rp_files:
            zf.write(full, "r6_rp/" + rel)
    verify(addon, "r6_bp/manifest.json")
    verify(addon, "r6_rp/manifest.json")

    bp_count = verify(bp_pack, "manifest.json")
    rp_count = verify(rp_pack, "manifest.json")

    # sanity: manifests parse and reference each other
    with zipfile.ZipFile(addon) as zf:
        bp_manifest = json.loads(zf.read("r6_bp/manifest.json"))
        rp_manifest = json.loads(zf.read("r6_rp/manifest.json"))
    assert bp_manifest["header"]["version"] == D.PACK_VERSION
    assert rp_manifest["header"]["version"] == D.PACK_VERSION
    dep = [d for d in bp_manifest.get("dependencies", []) if d.get("uuid") == rp_manifest["header"]["uuid"]]
    assert dep, "BP does not depend on RP"

    print(f"R6 addon v{version} packaged:")
    print(f"  {os.path.basename(bp_pack):24s} {bp_count:4d} files  {size_mb(bp_pack):6.2f} MB")
    print(f"  {os.path.basename(rp_pack):24s} {rp_count:4d} files  {size_mb(rp_pack):6.2f} MB")
    print(f"  {os.path.basename(addon):24s} {bp_count + rp_count:4d} files  {size_mb(addon):6.2f} MB")
    print(f"  output: {DIST}")


if __name__ == "__main__":
    main()
