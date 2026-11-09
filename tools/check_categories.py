# -*- coding: utf-8 -*-
with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/data/merchantConfig.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'id:' in line and 'name:' in line and ('{' in line or lines[i-1].strip() == '{'):
        print(f'{i+1}: {line.strip()[:80]}')
