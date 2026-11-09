# -*- coding: utf-8 -*-
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/shop.js', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '§7' in line or '§8' in line:
        print(f"{i+1}: {line.strip()}")
