# -*- coding: utf-8 -*-
import os, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8')

dir_path = "addons/development/sapi_server_addon/sapi_server_bp/scripts"
for root, dirs, files in os.walk(dir_path):
    for f in files:
        if f.endswith(".js"):
            p = os.path.join(root, f)
            res = subprocess.run(["node", "-c", p], capture_output=True, text=True)
            if res.returncode != 0:
                print(f"ERROR in {p}:\n{res.stderr}")
            else:
                print(f"OK: {p}")
