# -*- coding: utf-8 -*-
import os, json, sys

sys.stdout.reconfigure(encoding='utf-8')

manifest_paths = [
    "addons/development/sapi_server_addon/sapi_server_bp/manifest.json",
    "addons/development/daily_world_events_addon/daily_events_bp/manifest.json",
    "addons/development/apocalypse_mobs_addon/apocalypse_mobs_bp/manifest.json",
    "addons/development/test_guns_2d_addon/test_guns_bp/manifest.json",
    "addons/development/natural_disasters_standalone_addon/standalone_disasters_bp/manifest.json",
    "addons/development/apocalypse_extraction_addon/extraction_bp/manifest.json",
    "addons/development/apocalypse_boss_addon/apocalypse_boss_bp/manifest.json",
    "addons/development/apocalypse_story_addon/story_bp/manifest.json",
    "addons/development/lotm_pathways_addon/lotm_pathways_bp/manifest.json",
    "addons/development/lotm_pathways_addon/lotm_pathways_rp/manifest.json",
]

for p in manifest_paths:
    if not os.path.exists(p):
        print("Skipping non-existent:", p)
        continue
    with open(p, "r", encoding="utf-8-sig") as f:
        data = json.load(f)

    changed = False
    for dep in data.get("dependencies", []):
        if dep.get("module_name") == "@minecraft/server":
            if dep.get("version") in ["1.19.0", "2.9.0"]:
                print(f"Updating @minecraft/server in {p} from {dep['version']} to 1.15.0")
                dep["version"] = "1.15.0"
                changed = True
        elif dep.get("module_name") == "@minecraft/server-ui":
            if dep.get("version") in ["2.0.0"]:
                print(f"Updating @minecraft/server-ui in {p} from {dep['version']} to 1.3.0")
                dep["version"] = "1.3.0"
                changed = True

    if changed:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Saved: {p}")
