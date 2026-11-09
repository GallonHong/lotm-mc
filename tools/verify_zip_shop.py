# -*- coding: utf-8 -*-
import zipfile, sys

sys.stdout.reconfigure(encoding='utf-8')

with zipfile.ZipFile('明日之后.mcworld', 'r') as zf:
    names = [n for n in zf.namelist() if 'shop.js' in n]
    print("Found in zip:", names)
    for n in names:
        data = zf.read(n).decode('utf-8')
        if 'openRecycleConfirmUI' in data and 'getAllSellableItems' in data:
            print(f"VERIFIED: {n} has openRecycleConfirmUI and getAllSellableItems!")
        else:
            print(f"ERROR: {n} does NOT have expected functions!")
