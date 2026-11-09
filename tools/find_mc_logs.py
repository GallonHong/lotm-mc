# -*- coding: utf-8 -*-
import os, sys

sys.stdout.reconfigure(encoding='utf-8')

appdata = os.path.expandvars(r'%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState')
for root, dirs, files in os.walk(appdata):
    for f in files:
        if f.endswith('.txt') or f.endswith('.log'):
            p = os.path.join(root, f)
            print(p)
