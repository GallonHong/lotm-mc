# -*- coding: utf-8 -*-
import os, json, sys

sys.stdout.reconfigure(encoding='utf-8')

base = "addons/development"
for root, dirs, files in os.walk(base):
    if "manifest.json" in files:
        p = os.path.join(root, "manifest.json")
        try:
            with open(p, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
            header = data.get("header", {})
            deps = data.get("dependencies", [])
            server_deps = [d for d in deps if d.get("module_name") == "@minecraft/server"]
            ui_deps = [d for d in deps if d.get("module_name") == "@minecraft/server-ui"]
            if server_deps or ui_deps:
                print(f"{p}:")
                print(f"  header: {header.get('name')} v{header.get('version')}, min_engine: {header.get('min_engine_version')}")
                for s in server_deps:
                    print(f"  @minecraft/server: {s.get('version')}")
                for u in ui_deps:
                    print(f"  @minecraft/server-ui: {u.get('version')}")
        except Exception as e:
            print(f"Error reading {p}: {e}")
