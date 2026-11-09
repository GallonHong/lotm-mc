# -*- coding: utf-8 -*-
import os, sys, glob

sys.stdout.reconfigure(encoding='utf-8')

worlds_dir = os.path.expandvars(r'%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\minecraftWorlds')
if os.path.exists(worlds_dir):
    for w in os.listdir(worlds_dir):
        wp = os.path.join(worlds_dir, w)
        levelname = os.path.join(wp, 'levelname.txt')
        name = ""
        if os.path.exists(levelname):
            with open(levelname, 'r', encoding='utf-8', errors='ignore') as f:
                name = f.read().strip()
        print(f"World: {w} -> {name}")
