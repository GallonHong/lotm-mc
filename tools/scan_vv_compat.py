"""Scan add-on resource packs for Vibrant Visuals compatibility flags.

Checks: manifest capabilities, min_engine_version, raytraced capability (forces RTX mode and
disables VV), lighting/atmospherics/color grading files, fog format versions, PBR texture sets.
"""
import glob
import json
import os
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def summarize_pack(label, manifest, files_fn):
    header = manifest.get("header", {})
    caps = manifest.get("capabilities") or []
    lines = [f"- {label} | {header.get('name')} | v{header.get('version')} | min_engine {header.get('min_engine_version')} | capabilities {caps}"]
    if "raytraced" in caps:
        lines.append("    [!] declares raytraced -> world will use RTX mode, Vibrant Visuals gets replaced/disabled")
    if "pbr" in caps and (header.get("min_engine_version") or [0]) < [1, 21, 120]:
        lines.append("    [!] pbr capability but min_engine_version < 1.21.120 (docs requirement)")
    try:
        fog_files = [p for p in files_fn() if p.startswith("fogs/") and p.endswith(".json")]
    except Exception:
        fog_files = []
    fog_versions = set()
    for path in fog_files:
        try:
            fog_versions.add(json.loads(files_fn()[path] if isinstance(files_fn(), dict) else b"{}").get("format_version"))
        except Exception:
            pass
    if fog_files:
        lines.append(f"    fogs: {len(fog_files)} file(s)")
    return lines


print("=== addons/development resource packs ===")
for manifest_path in sorted(glob.glob(os.path.join(REPO, "addons", "development", "**", "manifest.json"), recursive=True)):
    try:
        manifest = json.load(open(manifest_path, encoding="utf-8-sig"))
    except Exception:
        continue
    if not any(module.get("type") == "resources" for module in manifest.get("modules") or []):
        continue
    pack_dir = os.path.dirname(manifest_path)
    rel = os.path.relpath(pack_dir, os.path.join(REPO, "addons", "development"))
    header = manifest.get("header", {})
    caps = manifest.get("capabilities") or []
    extra = []
    for folder in ("lighting", "atmospherics", "color_grading", "fogs", "particles", "water"):
        if os.path.isdir(os.path.join(pack_dir, folder)):
            extra.append(folder)
    fog_versions = set()
    for fog_file in glob.glob(os.path.join(pack_dir, "fogs", "*.json")):
        try:
            fog_versions.add(json.load(open(fog_file, encoding="utf-8-sig")).get("format_version"))
        except Exception:
            fog_versions.add("BAD")
    print(f"- {rel}")
    print(f"    name={header.get('name')} version={header.get('version')} min_engine={header.get('min_engine_version')} capabilities={caps}")
    if "raytraced" in caps:
        print("    [!] raytraced capability: forces RTX mode / disables Vibrant Visuals")
    if "pbr" in caps and (header.get("min_engine_version") or [0]) < [1, 21, 120]:
        print("    [!] pbr capability but min_engine_version < [1,21,120]")
    if extra:
        print(f"    visual folders: {extra}")
    if fog_versions:
        print(f"    fog format_version(s): {sorted(str(v) for v in fog_versions)}")

print("\n=== world embedded resource packs (明日之后.mcworld) ===")
world = os.path.join(REPO, "明日之后.mcworld")
if os.path.isfile(world):
    with zipfile.ZipFile(world) as archive:
        for name in sorted(n for n in archive.namelist() if n.startswith("resource_packs/") and n.endswith("manifest.json")):
            try:
                manifest = json.loads(archive.read(name))
            except Exception:
                continue
            header = manifest.get("header", {})
            caps = manifest.get("capabilities") or []
            sub = name.replace("resource_packs/", "").replace("/manifest.json", "")
            print(f"- {sub} | {header.get('name')} | v{header.get('version')} | min_engine {header.get('min_engine_version')} | capabilities {caps}")
else:
    print("world zip not found")
