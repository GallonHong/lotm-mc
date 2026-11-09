# -*- coding: utf-8 -*-
import os, sys

sys.stdout.reconfigure(encoding='utf-8')

repo = "addons"
for root, dirs, files in os.walk(repo):
    for f in files:
        if f.endswith(".js"):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as file:
                for line_no, line in enumerate(file, 1):
                    if "addScore" in line or "getScore" in line or "setScore" in line:
                        print(f"{p}:{line_no}: {line.strip()[:100]}")
