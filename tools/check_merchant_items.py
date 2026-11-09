# -*- coding: utf-8 -*-
with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/data/merchantConfig.js', 'r', encoding='utf-8') as f:
    txt = f.read()

import re
items = re.findall(r'id:\s*"([^"]+)"[^}]+sellPrice:\s*(\d+)', txt)
print(f'Total sellable items configured: {len(items)}')
for it in items[:25]:
    print(it)
