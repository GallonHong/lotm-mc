# -*- coding: utf-8 -*-
import os, sys, glob

sys.stdout.reconfigure(encoding='utf-8')

appdata = os.path.expandvars(r'%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang')
logs = glob.glob(os.path.join(appdata, 'minecraftpe', '*.log'))
logs += glob.glob(os.path.join(appdata, 'logs', '*.log'))
logs += glob.glob(os.path.join(appdata, 'ContentLog__*.txt'))

print("Found log files:")
for log in logs:
    print(" ", log, os.path.getsize(log), "bytes")
    try:
        with open(log, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            print(f"  Last 20 lines of {os.path.basename(log)}:")
            for l in lines[-20:]:
                print("   ", l.strip())
    except Exception as e:
        print("  Error:", e)
