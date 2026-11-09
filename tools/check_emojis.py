# -*- coding: utf-8 -*-
import sys, re

sys.stdout.reconfigure(encoding='utf-8')

emoji_pattern = re.compile(r'[\U00010000-\U0010ffff]')

files = [
    'addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/shop.js',
    'addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/server_menu.js',
    'addons/development/sapi_server_addon/sapi_server_bp/scripts/config.js'
]

has_emoji = False
for fpath in files:
    with open(fpath, encoding='utf-8') as f:
        for line_no, line in enumerate(f, 1):
            matches = emoji_pattern.findall(line)
            if matches:
                print(f"Found emoji in {fpath}:{line_no}: {matches}")
                has_emoji = True

if not has_emoji:
    print("ALL FILES HAVE ZERO EMOJIS!")
