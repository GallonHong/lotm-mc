# -*- coding: utf-8 -*-
import os, json, sys

sys.stdout.reconfigure(encoding='utf-8')

for root, dirs, files in os.walk("addons"):
    for f in files:
        if f.endswith(".json") and "item" in root.lower():
            p = os.path.join(root, f)
            try:
                with open(p, "r", encoding="utf-8-sig") as file:
                    data = json.load(file)
                item_def = data.get("minecraft:item", {})
                desc = item_def.get("description", {})
                ident = desc.get("identifier", "")
                comps = item_def.get("components", {})
                if any(x in ident for x in ["menu", "compass", "nav", "guide", "terminal"]):
                    print(f"{p} -> ident: {ident}")
            except Exception as e:
                pass
