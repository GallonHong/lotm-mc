# -*- coding: utf-8 -*-
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dev_dir = os.path.join(repo_dir, "addons", "development")

error_count = 0
checked_count = 0

for root, dirs, files in os.walk(dev_dir):
    for f in files:
        if f.endswith(".js"):
            checked_count += 1
            p = os.path.join(root, f)
            res = subprocess.run(["node", "-c", p], capture_output=True, text=True)
            if res.returncode != 0:
                print(f"ERROR in {p}:\n{res.stderr}")
                error_count += 1

print(f"\nChecked {checked_count} JS files. Errors: {error_count}")
if error_count > 0:
    sys.exit(1)
